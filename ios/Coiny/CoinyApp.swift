import SwiftUI
import UserNotifications

extension Notification.Name {
    static let coinyPushReceived = Notification.Name("CoinyPushReceived")
    static let coinySignedOut = Notification.Name("CoinySignedOut")
}

@main
struct CoinyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var petStore = CoinyApp.makePetStore()

    private static let isUITesting = CommandLine.arguments.contains("--ui-testing")

    /// Signs in against a REAL local backend, for the one test CI cannot run.
    ///
    /// Distinct from `--ui-testing`, which swaps the API for fixtures and
    /// therefore never reaches Plaid. This flag keeps the real API client and
    /// only skips Sign in with Apple, which does not work in the Simulator.
    /// `injectDebugSession` calls `/api/debug/session`, a route the server only
    /// registers when NODE_ENV is not production AND PLAID_ENV is sandbox
    /// (`server.ts` isDebugBuild), so it cannot exist in a shipping backend.
    ///
    /// DEBUG-only, so it is compiled out of every Release build entirely.
    private static let isDebugSessionRun = CommandLine.arguments.contains("--uitest-debug-session")

    /// UI tests bypass sign-in, so live API calls would 401; serve a fixture
    /// instead so the Home journey surface is deterministic under test.
    private static func makePetStore() -> PetStore {
        #if DEBUG
        if isUITesting { return PetStore(api: UITestPetAPI()) }
        #endif
        return PetStore()
    }

    // Auth state — seeded synchronously from Keychain on launch.
    // In UITest mode the Keychain is unavailable; bypass to land on RootView directly.
    @State private var isSignedIn: Bool =
        CoinyApp.isUITesting || CoinyApp.isDebugSessionRun || KeychainSessionStore().load() != nil
    @AppStorage("onboardingComplete") private var onboardingComplete: Bool = false
    @SwiftUI.Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            Group {
                if !isSignedIn {
                    SignInView {
                        isSignedIn = true
                    }
                } else if !onboardingComplete && !CoinyApp.isUITesting && !CoinyApp.isDebugSessionRun {
                    OnboardingView(onboardingComplete: $onboardingComplete)
                } else {
                    RootView()
                        .environment(petStore)
                        .task {
                            // The debug-session run signs in against the real
                            // local backend before anything renders, so the
                            // connect affordance is reachable.
                            #if DEBUG
                            if CoinyApp.isDebugSessionRun {
                                try? await API.shared.injectDebugSession()
                            }
                            #endif
                            // Detached: cache repair for the declaration sheet
                            // (fresh install pulls the server copy back) must
                            // never delay the pet or the permission prompt.
                            if !CoinyApp.isUITesting {
                                Task { await DeclaredAssetsSyncService().reconcile() }
                            }
                            await petStore.refresh()
                            await requestPushPermission()
                        }
                        .onReceive(NotificationCenter.default.publisher(for: .coinyPushReceived)) { _ in
                            Task { await petStore.refresh() }
                        }
                }
            }
            .animation(.easeInOut, value: isSignedIn)
            .animation(.easeInOut, value: onboardingComplete)
            // app_open (audit 4.3.6): once at launch, and again on a real
            // return from the background. Deliberately NOT on every .active:
            // Control Centre, the app switcher and a system permission alert
            // all take the app through .inactive and back, and counting those
            // would inflate the W4 denominator with opens that never happened.
            .task { await TelemetryAppOpen.emit() }
            .onChange(of: scenePhase) { previous, current in
                guard previous == .background, current == .active else { return }
                Task { await TelemetryAppOpen.emit() }
            }
            // The Transaction.updates listener runs for the whole app lifetime:
            // a purchase can complete while the app is backgrounded (ask-to-buy,
            // billing recovery, another device) and must never be dropped.
            .task {
                StoreKitService.shared.start()
                if isSignedIn && !CoinyApp.isUITesting {
                    await StoreKitService.shared.refreshEntitlements()
                }
            }
            // Sign-out clears local state and returns to sign-in screen.
            .onReceive(NotificationCenter.default.publisher(for: .coinySignedOut)) { _ in
                Task { await API.shared.signOut() }
                onboardingComplete = false
                isSignedIn = false
            }
        }
    }

    private func requestPushPermission() async {
        // A user who tapped "Not now" on the onboarding notifications screen
        // never saw the system prompt, so their status is still .notDetermined
        // and this would prompt them anyway, one screen later, against their
        // stated answer. Push permission is not recoverable once denied, so
        // honor the decline rather than spending the one prompt iOS grants.
        if UserDefaults.standard.bool(forKey: "pushPromptDeclinedInOnboarding") { return }
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .notDetermined else { return }
        _ = try? await center.requestAuthorization(options: [.alert, .sound, .badge])
        await MainActor.run {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }
}

/// `UIApplicationDelegate` is `@MainActor`-isolated and
/// `UNUserNotificationCenterDelegate` is not, so one class conforming to both
/// straddles two isolation domains. The explicit `@MainActor` here states the
/// isolation the `UIApplicationDelegate` half already implies, and the two
/// `UNUserNotificationCenterDelegate` callbacks below are marked `nonisolated`
/// to match the protocol they actually satisfy. Each hops to the main actor
/// itself for the work that needs it.
@MainActor
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    /// Held for the app's lifetime: MXMetricManager does not retain its
    /// subscribers, so a reporter that goes out of scope stops receiving
    /// payloads silently, with no error and no gap in any log.
    private let metricKitReporter = MetricKitReporter()

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        // G3.10. Subscribe at launch: MetricKit only delivers while at least one
        // subscriber is registered, and the payload covers the PREVIOUS day, so
        // a late subscription loses that day rather than deferring it.
        metricKitReporter.start()
        // Re-register if already authorized (token can rotate between launches).
        // Only makes sense if the user is signed in; the API call will fail silently otherwise.
        Task {
            let settings = await UNUserNotificationCenter.current().notificationSettings()
            if settings.authorizationStatus == .authorized {
                await MainActor.run { application.registerForRemoteNotifications() }
            }
        }
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let hex = deviceToken.map { String(format: "%02x", $0) }.joined()
        Task { try? await API.shared.registerDeviceToken(hex) }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        print("APNs registration failed: \(error.localizedDescription)")
    }

    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        NotificationCenter.default.post(name: .coinyPushReceived, object: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 8) {
            completionHandler(.newData)
        }
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }

    /// The user tapped a notification. This is the only signal that separates
    /// `source: "push"` from `source: "icon"` on the `app_open` that follows:
    /// `didReceiveRemoteNotification` above fires for silent background
    /// delivery too, so treating that as an open would count pushes the user
    /// never saw. The flag is consumed by the next emit.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        Task { @MainActor in
            TelemetryAppOpen.openedFromPush = true
        }
        completionHandler()
    }
}
