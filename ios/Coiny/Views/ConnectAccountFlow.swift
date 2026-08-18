import LinkKit
import SwiftUI

/// Self-contained Plaid Link launcher for Home's single "Connect an account"
/// action. Mirrors the onboarding flow's Link usage without touching
/// `OnboardingView.swift` (whose presenter is private to that file).
///
/// LinkKit 7 replaced the `Handler` API with session objects and gave the SDK
/// native SwiftUI presentation, so the `UIViewControllerRepresentable` that
/// used to live here is gone: `session.sheet()` is presented directly from a
/// `.sheet(isPresented:)`. That removed the window-walking code that reached
/// through `connectedScenes` to find something to present from, which was the
/// most fragile part of the old integration.
@Observable
@MainActor
final class ConnectAccountFlow {
    var isPresentingLink = false
    var isLoading = false
    private(set) var session: PlaidLinkSession?
    /// Called after a successful token exchange so the caller can refresh.
    var onLinked: (() -> Void)?

    func start() {
        guard !isLoading else { return }
        isLoading = true
        Task { @MainActor in
            defer { isLoading = false }
            do {
                let token = try await API.shared.createLinkToken()
                // LinkKit 7 takes every callback at initialisation; there is no
                // longer a mutable config to assign `onExit` onto afterwards.
                let cfg = LinkTokenConfiguration(
                    token: token,
                    onSuccess: { [weak self] success in
                        Task { @MainActor in
                            guard let self else { return }
                            self.isPresentingLink = false
                            do {
                                try await API.shared.exchangePublicToken(success.publicToken)
                                UserDefaults.standard.set(true, forKey: "bankLinked")
                                self.onLinked?()
                            } catch {
                                // Abandonment or failure is never terminal: the
                                // user stays on Home with the Disconnected
                                // creature and the persistent connect
                                // affordance (PRD 8.3).
                            }
                        }
                    },
                    onExit: { [weak self] _ in
                        Task { @MainActor in self?.isPresentingLink = false }
                    },
                    onEvent: nil,
                    onLoad: nil
                )
                // `createPlaidLinkSession` throws where `Plaid.create` returned
                // a Result. Same non-terminal rule on failure.
                session = try Plaid.createPlaidLinkSession(configuration: cfg)
                isPresentingLink = true
            } catch {
                // Same non-terminal rule: silently stay on the connect state.
            }
        }
    }
}
