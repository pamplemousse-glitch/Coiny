import LinkKit
import SwiftUI

/// The PRD section 5.2 onboarding flow. Screen 0 (Sign in with Apple) is
/// `SignInView`; this container owns:
///
/// 1. The egg, 2. "What do you have?", 3. "Roughly how much?", 4. The number,
/// 5. One connection (Plaid Link), 6. Found money (auto-skipped when empty,
/// R-5.6), 7. The hatch, 8. Notifications.
///
/// Name entry is deleted per R-5.2; Sign in with Apple supplies identity.
/// All state decisions live in `OnboardingViewModel`; this file owns only
/// composition and the Plaid Link presentation.
struct OnboardingView: View {
    @Binding var onboardingComplete: Bool
    /// Retained for call-site compatibility with `CoinyApp`. Unused: the name
    /// entry screen no longer exists (R-5.2).
    var appleDisplayName: String = ""

    @State private var viewModel = OnboardingViewModel()
    @State private var showLink = false
    @State private var linkHandler: Handler?
    // SwiftUI qualified: LinkKit also exports an `Environment` type.
    @SwiftUI.Environment(\.accessibilityReduceMotion) private var reduceMotion
    @SwiftUI.Environment(\.scenePhase) private var scenePhase

    var body: some View {
        ZStack {
            OnboardingPalette.screen.ignoresSafeArea()
            content
                .transition(reduceMotion ? .opacity : .opacity.combined(with: .offset(y: 8)))
                .id(viewModel.step)
        }
        .animation(.easeOut(duration: 0.22), value: viewModel.step)
        .task { await viewModel.start() }
        .onChange(of: viewModel.completed) {
            if viewModel.completed { onboardingComplete = true }
        }
        .onChange(of: scenePhase) {
            if scenePhase == .background {
                Task { await viewModel.flushTelemetry() }
            }
        }
        .sheet(isPresented: $showLink) {
            if let handler = linkHandler {
                LinkPresenter(handler: handler)
                    .ignoresSafeArea()
            }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.step {
        case .egg:
            OnboardingEggScreen {
                Task { await viewModel.continueFromEgg() }
            }
        case .declare:
            OnboardingDeclareScreen(
                viewModel: viewModel,
                onContinue: { Task { await viewModel.continueFromDeclare() } },
                onSkip: {
                    viewModel.selectedClasses = []
                    Task { await viewModel.continueFromDeclare() }
                }
            )
        case .amounts:
            OnboardingAmountsScreen(viewModel: viewModel) {
                Task { await viewModel.continueFromAmounts() }
            }
        case .number:
            OnboardingNumberScreen(sheet: viewModel.sheet) {
                Task { await viewModel.continueFromNumber() }
            }
            .task { await viewModel.numberShown() }
        case .connect:
            if viewModel.isOffline {
                OnboardingOfflineScreen {
                    viewModel.retryAfterOffline()
                }
            } else {
                OnboardingConnectScreen(
                    isBusy: viewModel.isPreparingLink || viewModel.isExchangingToken,
                    errorMessage: viewModel.linkErrorMessage,
                    onConnect: { startLink() },
                    onSkip: { Task { await viewModel.skipConnection() } }
                )
            }
        case .reveal:
            OnboardingRevealScreen(
                items: viewModel.revealItems,
                annualTotalUSD: viewModel.revealAnnualTotalUSD
            ) {
                Task { await viewModel.continueFromReveal() }
            }
        case .hatch:
            OnboardingHatchScreen(
                isDisconnected: viewModel.isDisconnectedHatch,
                greeting: viewModel.hatchGreeting,
                instruction: viewModel.hatchInstruction,
                onConnect: { viewModel.connectFromHatch() },
                onContinue: { Task { await viewModel.continueFromHatch() } }
            )
        case .notifications:
            OnboardingNotificationsScreen(
                onResolved: { granted in
                    Task { await viewModel.notificationPermissionResolved(granted: granted) }
                },
                onSkip: { Task { await viewModel.skipNotifications() } }
            )
        }
    }

    // MARK: - Plaid Link

    private func startLink() {
        Task { @MainActor in
            guard let token = await viewModel.prepareLink() else { return }
            var config = LinkTokenConfiguration(token: token) { success in
                showLink = false
                Task { @MainActor in
                    await viewModel.linkSucceeded(publicToken: success.publicToken)
                }
            }
            config.onExit = { exit in
                showLink = false
                Task { @MainActor in
                    await viewModel.linkExited(
                        hadError: exit.error != nil,
                        exitStatus: exit.metadata.status?.description
                    )
                }
            }
            switch Plaid.create(config) {
            case .success(let handler):
                linkHandler = handler
                showLink = true
            case .failure:
                await viewModel.linkExited(hadError: true, exitStatus: "sdk_create_failed")
            }
        }
    }
}

// MARK: - Plaid Link presenter

/// Thin UIViewControllerRepresentable that opens the Plaid Link flow.
/// Placed inside a .sheet so dismissal is handled by setting showLink=false
/// in the LinkTokenConfiguration callbacks.
private struct LinkPresenter: UIViewControllerRepresentable {
    let handler: Handler

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIViewController(context: Context) -> UIViewController {
        UIViewController()
    }

    func updateUIViewController(_ vc: UIViewController, context: Context) {
        guard !context.coordinator.hasOpened else { return }
        context.coordinator.hasOpened = true
        handler.open(presentUsing: .custom { linkVC in
            guard let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let window = scene.keyWindow else { return }
            var presenter: UIViewController = window.rootViewController!
            while let next = presenter.presentedViewController { presenter = next }
            presenter.present(linkVC, animated: true)
        })
    }

    final class Coordinator {
        var hasOpened = false
    }
}

#Preview {
    @Previewable @State var done = false
    OnboardingView(onboardingComplete: $done)
}
