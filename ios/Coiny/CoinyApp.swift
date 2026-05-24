import SwiftUI
import UserNotifications

extension Notification.Name {
    static let coinyPushReceived = Notification.Name("CoinyPushReceived")
    static let coinySignedOut = Notification.Name("CoinySignedOut")
}

@main
struct CoinyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @State private var petStore = PetStore()

    // Auth state — seeded synchronously from Keychain on launch.
    @State private var isSignedIn: Bool = KeychainSessionStore().load() != nil
    @AppStorage("onboardingComplete") private var onboardingComplete: Bool = false
    /// Name from Apple Sign In on first login; carried into OnboardingView's name step.
    @State private var pendingDisplayName: String = ""

    var body: some Scene {
        WindowGroup {
            appRoot
                .animation(.easeInOut, value: isSignedIn)
                .animation(.easeInOut, value: onboardingComplete)
                // Sign-out clears local state and returns to sign-in screen.
                .onReceive(NotificationCenter.default.publisher(for: .coinySignedOut)) { _ in
                    Task { await API.shared.signOut() }
                    onboardingComplete = false
                    isSignedIn = false
                }
        }
    }

    @ViewBuilder
    private var appRoot: some View {
        #if DEBUG
        // XCUITest sets --ui-testing to skip sign-in/onboarding and land on
        // RootView directly. injectDebugSession() is best-effort: if the local
        // backend (127.0.0.1:3000) is unreachable, each tab shows its
        // empty/error state, which is still a valid render — the test asserts
        // structure, not data.
        if ProcessInfo.processInfo.arguments.contains("--ui-testing") {
            RootView()
                .environment(petStore)
                .task {
                    try? await API.shared.injectDebugSession()
                    await petStore.refresh()
                }
                .onReceive(NotificationCenter.default.publisher(for: .coinyPushReceived)) { _ in
                    Task { await petStore.refresh() }
                }
        } else {
            normalRoot
        }
        #else
        normalRoot
        #endif
    }

    @ViewBuilder
    private var normalRoot: some View {
        if !isSignedIn {
            SignInView { name in
                pendingDisplayName = name
                isSignedIn = true
            }
        } else if !onboardingComplete {
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

    private func requestPushPermission() async {
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
