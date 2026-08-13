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
    @State private var isSignedIn: Bool = CoinyApp.isUITesting || KeychainSessionStore().load() != nil
    @AppStorage("onboardingComplete") private var onboardingComplete: Bool = false
    /// Name from Apple Sign In on first login; carried into OnboardingView's name step.
    @State private var pendingDisplayName: String = ""

    var body: some Scene {
        WindowGroup {
            Group {
                if !isSignedIn {
                    SignInView { name in
                        pendingDisplayName = name
                        isSignedIn = true
                    }
                } else if !onboardingComplete && !CoinyApp.isUITesting {
                    OnboardingView(onboardingComplete: $onboardingComplete, appleDisplayName: pendingDisplayName)
                } else {
                    RootView()
                        .environment(petStore)
                        .task {
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

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
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

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound])
    }
}
