import XCTest
@testable import Coiny

/// G2.15 / audit row 5.4.3: the Home connect flow used to swallow a failed
/// public-token exchange in an empty catch, so a link that succeeded at Plaid
/// and failed at Coiny was indistinguishable from the user backing out. These
/// tests hold the two apart in both directions: a failure must be visible and
/// counted as `error`, and abandonment must stay silent.
@MainActor
final class ConnectAccountFlowTests: XCTestCase {
    // MARK: - Fakes

    private final class FakeAPI: ConnectAccountAPI, @unchecked Sendable {
        private let lock = NSLock()
        var linkTokenResult: Result<String, Error> = .success("link-token")
        var exchangeError: Error?
        private(set) var exchangedTokens: [String] = []

        func createLinkToken() async throws -> String {
            lock.lock(); defer { lock.unlock() }
            return try linkTokenResult.get()
        }

        @discardableResult
        func exchangePublicToken(_ publicToken: String) async throws -> EmptyResponse {
            lock.lock(); defer { lock.unlock() }
            if let exchangeError { throw exchangeError }
            exchangedTokens.append(publicToken)
            return EmptyResponse()
        }
    }

    private struct TestError: Error {}

    private func makeFlow(
        api: FakeAPI,
        telemetry: TelemetryClient,
        outcome: ConnectAccountFlow.LinkOutcome
    ) -> ConnectAccountFlow {
        let flow = ConnectAccountFlow(api: api, telemetry: telemetry)
        // No real LinkKit: the seam returns Plaid's verdict directly.
        flow.openLink = { _ in outcome }
        return flow
    }

    private func makeTelemetry(
        _ transport: RecordingTelemetryTransport
    ) -> TelemetryClient {
        TelemetryClient(transport: transport, isGranted: { true })
    }

    private func results(_ transport: RecordingTelemetryTransport) -> [TelemetryEvent] {
        transport.events.filter { $0.event == "link_result" }
    }

    // MARK: - Success

    func testSuccessfulExchangeClearsErrorAndNotifiesCaller() async {
        let api = FakeAPI()
        let transport = RecordingTelemetryTransport()
        let telemetry = makeTelemetry(transport)
        let flow = makeFlow(
            api: api,
            telemetry: telemetry,
            outcome: .succeeded(publicToken: "public-good")
        )
        var linkedCount = 0
        flow.onLinked = { linkedCount += 1 }

        await flow.run()
        await telemetry.flush()

        XCTAssertEqual(api.exchangedTokens, ["public-good"])
        XCTAssertNil(flow.errorMessage)
        XCTAssertEqual(linkedCount, 1)
        XCTAssertEqual(results(transport).first?.properties["status"], .string("success"))
    }

    func testStartEmitsLinkOpenedFromHome() async {
        let transport = RecordingTelemetryTransport()
        let telemetry = makeTelemetry(transport)
        let flow = makeFlow(
            api: FakeAPI(),
            telemetry: telemetry,
            outcome: .succeeded(publicToken: "public-good")
        )

        await flow.run()
        await telemetry.flush()

        let opened = transport.events.filter { $0.event == "link_opened" }
        XCTAssertEqual(opened.count, 1)
        // 'home' is a distinct funnel source from onboarding and repair; the
        // backend enum in analytics/events.ts must accept it.
        XCTAssertEqual(opened.first?.properties, [
            "provider": .string("plaid"),
            "source": .string("home"),
        ])
    }

    // MARK: - The bug: a failed exchange is not abandonment

    func testFailedExchangeSurfacesAMessage() async {
        let api = FakeAPI()
        api.exchangeError = TestError()
        let transport = RecordingTelemetryTransport()
        let telemetry = makeTelemetry(transport)
        let flow = makeFlow(
            api: api,
            telemetry: telemetry,
            outcome: .succeeded(publicToken: "public-good")
        )
        var linkedCount = 0
        flow.onLinked = { linkedCount += 1 }

        await flow.run()
        await telemetry.flush()

        XCTAssertNotNil(flow.errorMessage)
        XCTAssertEqual(linkedCount, 0)
        XCTAssertEqual(results(transport).first?.properties["status"], .string("error"))
        XCTAssertEqual(
            results(transport).first?.properties["exit_status"],
            .string("exchange_failed")
        )
    }

    func testAbandonmentStaysSilent() async {
        let transport = RecordingTelemetryTransport()
        let telemetry = makeTelemetry(transport)
        let flow = makeFlow(
            api: FakeAPI(),
            telemetry: telemetry,
            outcome: .exited(hadError: false, exitStatus: "requires_credentials")
        )

        await flow.run()
        await telemetry.flush()

        XCTAssertNil(flow.errorMessage, "Backing out of Link is a decision, not a fault")
        XCTAssertEqual(results(transport).first?.properties["status"], .string("abandoned"))
        XCTAssertEqual(
            results(transport).first?.properties["exit_status"],
            .string("requires_credentials")
        )
    }

    func testLinkErrorExitSurfacesAMessage() async {
        let transport = RecordingTelemetryTransport()
        let telemetry = makeTelemetry(transport)
        let flow = makeFlow(
            api: FakeAPI(),
            telemetry: telemetry,
            outcome: .exited(hadError: true, exitStatus: "institution_error")
        )

        await flow.run()
        await telemetry.flush()

        XCTAssertNotNil(flow.errorMessage)
        XCTAssertEqual(results(transport).first?.properties["status"], .string("error"))
    }

    func testLinkTokenFailureSurfacesAMessageAndNeverOpensLink() async {
        let api = FakeAPI()
        api.linkTokenResult = .failure(TestError())
        let transport = RecordingTelemetryTransport()
        let telemetry = makeTelemetry(transport)
        let flow = ConnectAccountFlow(api: api, telemetry: telemetry)
        var opened = false
        flow.openLink = { _ in
            opened = true
            return .exited(hadError: false, exitStatus: nil)
        }

        await flow.run()
        await telemetry.flush()

        XCTAssertFalse(opened)
        XCTAssertEqual(flow.errorMessage, "Plaid could not start. Try again.")
        XCTAssertEqual(
            results(transport).first?.properties["exit_status"],
            .string("link_token_failed")
        )
    }

    // MARK: - Retry

    func testRetryClearsThePreviousError() async {
        let api = FakeAPI()
        api.exchangeError = TestError()
        let transport = RecordingTelemetryTransport()
        let flow = makeFlow(
            api: api,
            telemetry: makeTelemetry(transport),
            outcome: .succeeded(publicToken: "public-good")
        )

        await flow.run()
        XCTAssertNotNil(flow.errorMessage)

        api.exchangeError = nil
        await flow.run()

        XCTAssertNil(flow.errorMessage)
        XCTAssertEqual(api.exchangedTokens, ["public-good"])
    }

    // MARK: - Presentation state

    func testLoadingIsReleasedBeforeLinkIsPresented() async {
        let transport = RecordingTelemetryTransport()
        let flow = ConnectAccountFlow(api: FakeAPI(), telemetry: makeTelemetry(transport))
        var loadingWhilePresenting: Bool?
        flow.openLink = { [weak flow] _ in
            // A Link session that never reports back must not leave the
            // connect button disabled forever.
            loadingWhilePresenting = flow?.isLoading
            return .exited(hadError: false, exitStatus: nil)
        }

        await flow.run()

        XCTAssertEqual(loadingWhilePresenting, false)
        XCTAssertFalse(flow.isLoading)
    }

    func testFinishDismissesTheLinkSheet() async {
        let transport = RecordingTelemetryTransport()
        let flow = ConnectAccountFlow(api: FakeAPI(), telemetry: makeTelemetry(transport))
        flow.openLink = { [weak flow] _ in
            flow?.isPresentingLink = true
            return .succeeded(publicToken: "public-good")
        }

        await flow.run()

        XCTAssertFalse(flow.isPresentingLink)
    }

    func testSheetDismissalWithoutACallbackIsANoOpOnceLinkReported() async {
        let transport = RecordingTelemetryTransport()
        let telemetry = makeTelemetry(transport)
        let flow = makeFlow(
            api: FakeAPI(),
            telemetry: telemetry,
            outcome: .succeeded(publicToken: "public-good")
        )

        await flow.run()
        // SwiftUI fires onDismiss after the flow already resolved; nothing
        // pending means nothing to resume and no second link_result.
        flow.linkSheetDismissed()
        await telemetry.flush()

        XCTAssertEqual(results(transport).count, 1)
    }
}
