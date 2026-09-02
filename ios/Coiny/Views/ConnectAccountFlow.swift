import LinkKit
import SwiftUI

/// The slice of the API Home's connect action needs, behind a protocol so the
/// flow can be driven in tests without the network (same pattern as
/// `OnboardingAPI` and `ConnectionRepairAPI`).
protocol ConnectAccountAPI: Sendable {
    func createLinkToken() async throws -> String
    @discardableResult
    func exchangePublicToken(_ publicToken: String) async throws -> EmptyResponse
}

extension API: ConnectAccountAPI {}

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
///
/// Abandonment and failure are both non-terminal (PRD 8.3, R-8.8): either way
/// the user stays on Home with the Disconnected creature and the persistent
/// connect affordance. They are not the same event, and this flow used to
/// treat them identically by swallowing every error in an empty catch (runbook
/// G2.15, audit row 5.4.3). A link that succeeded inside Plaid and then failed
/// at Coiny's token exchange left the user staring at an unchanged screen with
/// nothing to read and nothing to tap, and left the funnel with no `error`
/// event to count. Abandonment still says nothing; a failure says so and
/// offers the retry.
@Observable
@MainActor
final class ConnectAccountFlow {
    /// What Plaid's own UI reported. `exited` covers the user backing out and
    /// Link failing internally; only the flag tells them apart.
    enum LinkOutcome: Sendable, Equatable {
        case succeeded(publicToken: String)
        case exited(hadError: Bool, exitStatus: String?)
    }

    var isPresentingLink = false
    /// True only while the link token is being fetched. It is dropped before
    /// Link is presented so a session that never reports back cannot leave the
    /// connect button disabled forever.
    private(set) var isLoading = false
    /// Non-nil only for a real failure. User abandonment leaves this nil.
    private(set) var errorMessage: String?
    private(set) var session: PlaidLinkSession?
    /// Called after a successful token exchange so the caller can refresh.
    var onLinked: (() -> Void)?

    private let api: any ConnectAccountAPI
    private let telemetry: TelemetryClient
    /// Seam for tests: presenting real LinkKit UI is not unit-testable, so
    /// tests swap this for a stub that returns an outcome directly.
    var openLink: @MainActor (String) async -> LinkOutcome

    /// Resumed exactly once per presentation, by whichever of LinkKit's
    /// callbacks or the sheet's own dismissal arrives first.
    @ObservationIgnored
    private var pendingLink: CheckedContinuation<LinkOutcome, Never>?

    init(api: any ConnectAccountAPI = API.shared, telemetry: TelemetryClient = .shared) {
        self.api = api
        self.telemetry = telemetry
        openLink = { _ in .exited(hadError: true, exitStatus: "no_presenter") }
        openLink = { [weak self] token in
            guard let self else { return .exited(hadError: true, exitStatus: "no_presenter") }
            return await self.presentLinkKit(token: token)
        }
    }

    func start() {
        guard !isLoading else { return }
        Task { @MainActor in await run() }
    }

    /// The body of `start()`, separated so tests can await the whole flow
    /// rather than race a detached task.
    func run() async {
        guard !isLoading else { return }
        isLoading = true
        errorMessage = nil
        await telemetry.emit("link_opened", [
            "provider": .string("plaid"),
            "source": .string("home"),
        ])

        let token: String
        do {
            token = try await api.createLinkToken()
        } catch {
            isLoading = false
            await fail("Plaid could not start. Try again.", exitStatus: "link_token_failed")
            return
        }
        // Presentation, not preparation: the button is live again from here so
        // it can be tapped after a dismissal Link never told us about.
        isLoading = false

        await finish(await openLink(token))
    }

    private func finish(_ outcome: LinkOutcome) async {
        isPresentingLink = false
        switch outcome {
        case let .succeeded(publicToken):
            await exchange(publicToken: publicToken)
        case let .exited(hadError, exitStatus):
            guard hadError else {
                // Backing out is a decision, not a fault: no message, no retry
                // prompt, and the funnel counts it as abandonment.
                await emitResult(status: "abandoned", exitStatus: exitStatus)
                return
            }
            await fail("Plaid could not finish connecting. Try again.", exitStatus: exitStatus)
        }
    }

    private func exchange(publicToken: String) async {
        do {
            try await api.exchangePublicToken(publicToken)
            UserDefaults.standard.set(true, forKey: "bankLinked")
            await emitResult(status: "success", exitStatus: nil)
            onLinked?()
        } catch {
            // The bank side succeeded and Coiny's side did not, which is the
            // case the empty catch hid. The public token is single-use and
            // short-lived, so the honest instruction is to run Link again.
            await fail(
                "Your bank approved the connection but Coiny could not save it. Try again.",
                exitStatus: "exchange_failed"
            )
        }
    }

    private func fail(_ message: String, exitStatus: String?) async {
        errorMessage = message
        await emitResult(status: "error", exitStatus: exitStatus)
    }

    private func emitResult(status: String, exitStatus: String?) async {
        var props: [String: TelemetryValue] = [
            "provider": .string("plaid"),
            "status": .string(status),
        ]
        if let exitStatus {
            props["exit_status"] = .string(exitStatus)
        }
        await telemetry.emit("link_result", props)
    }

    // MARK: - LinkKit presentation

    /// Real LinkKit presentation. Every callback is supplied at initialisation
    /// and session creation throws where `Plaid.create` returned a Result.
    private func presentLinkKit(token: String) async -> LinkOutcome {
        await withCheckedContinuation { continuation in
            pendingLink = continuation
            let config = LinkTokenConfiguration(
                token: token,
                onSuccess: { [weak self] success in
                    let publicToken = success.publicToken
                    Task { @MainActor in
                        self?.resumeLink(.succeeded(publicToken: publicToken))
                    }
                },
                onExit: { [weak self] exit in
                    let hadError = exit.error != nil
                    let status = exit.metadata.status?.description
                    Task { @MainActor in
                        self?.resumeLink(.exited(hadError: hadError, exitStatus: status))
                    }
                },
                onEvent: nil,
                onLoad: nil
            )
            do {
                session = try Plaid.createPlaidLinkSession(configuration: config)
                isPresentingLink = true
            } catch {
                resumeLink(.exited(hadError: true, exitStatus: "sdk_create_failed"))
            }
        }
    }

    /// The Link sheet closed. On the normal path Link has already reported and
    /// this is a no-op; when the user swipes the sheet away it is the only
    /// signal there is, and it means abandonment.
    func linkSheetDismissed() {
        resumeLink(.exited(hadError: false, exitStatus: "sheet_dismissed"))
    }

    private func resumeLink(_ outcome: LinkOutcome) {
        guard let continuation = pendingLink else { return }
        pendingLink = nil
        continuation.resume(returning: outcome)
    }
}
