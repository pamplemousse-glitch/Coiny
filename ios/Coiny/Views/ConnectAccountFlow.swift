import LinkKit
import SwiftUI

/// Self-contained Plaid Link launcher for Home's single "Connect an account"
/// action. Mirrors the onboarding flow's Link usage without touching
/// `OnboardingView.swift` (whose presenter is private to that file).
@Observable
@MainActor
final class ConnectAccountFlow {
    var isPresentingLink = false
    var isLoading = false
    private(set) var handler: Handler?
    /// Called after a successful token exchange so the caller can refresh.
    var onLinked: (() -> Void)?

    func start() {
        guard !isLoading else { return }
        isLoading = true
        Task { @MainActor in
            defer { isLoading = false }
            do {
                let token = try await API.shared.createLinkToken()
                var cfg = LinkTokenConfiguration(token: token) { [weak self] success in
                    Task { @MainActor in
                        guard let self else { return }
                        self.isPresentingLink = false
                        do {
                            try await API.shared.exchangePublicToken(success.publicToken)
                            UserDefaults.standard.set(true, forKey: "bankLinked")
                            self.onLinked?()
                        } catch {
                            // Abandonment or failure is never terminal: the user
                            // stays on Home with the Disconnected creature and
                            // the persistent connect affordance (PRD 8.3).
                        }
                    }
                }
                cfg.onExit = { [weak self] _ in
                    Task { @MainActor in self?.isPresentingLink = false }
                }
                switch Plaid.create(cfg) {
                case .success(let handler):
                    self.handler = handler
                    isPresentingLink = true
                case .failure:
                    break
                }
            } catch {
                // Same non-terminal rule: silently stay on the connect state.
            }
        }
    }
}

/// Thin UIViewControllerRepresentable that opens the Plaid Link flow, hosted
/// inside a `.sheet` so dismissal flows through the configuration callbacks.
struct PlaidLinkPresenter: UIViewControllerRepresentable {
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
                  let window = scene.keyWindow,
                  let root = window.rootViewController else { return }
            var presenter: UIViewController = root
            while let next = presenter.presentedViewController { presenter = next }
            presenter.present(linkVC, animated: true)
        })
    }

    final class Coordinator {
        var hasOpened = false
    }
}
