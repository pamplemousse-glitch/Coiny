import XCTest

/// Proves the LinkKit 7 migration actually presents Plaid's UI.
///
/// This is the one thing CI structurally could not check. Every other UI test
/// launches with `--ui-testing`, which swaps the API for fixtures
/// (`UITestSupport.swift`), so no existing test has ever obtained a link token
/// or opened Plaid's screens. The migration replaced a
/// `UIViewControllerRepresentable` with the SDK's own `session.sheet()`, and a
/// broken presentation compiles perfectly and passes all 524 unit tests.
///
/// So this test launches WITHOUT the fixture flag, against a real backend on
/// 127.0.0.1:3000 (`API.swift` defaults there on simulator), mints a debug
/// session, taps the connect affordance, and asserts Plaid's own UI appeared.
///
/// REQUIRES a local backend on Plaid sandbox. Skips loudly rather than passing
/// if one is absent, because a green run against no server would assert
/// nothing, which is the failure mode the whole session has been guarding
/// against.
/// See `ActivityTabUITests` for why this is `@MainActor` and why the lifecycle
/// hook opts in with `MainActor.assumeIsolated` rather than inheriting it.
@MainActor
final class PlaidLinkPresentationUITests: XCTestCase {

    private var app: XCUIApplication!

    // `setUp() async throws` rather than `setUpWithError()`, for the same
    // reason as PaywallUITests: the async variant inherits the class's
    // `@MainActor` isolation. One setup hook, so nothing reorders.
    override func setUp() async throws {
        try await super.setUp()
        continueAfterFailure = false
        let isUp = await Self.backendIsUp()
        try XCTSkipUnless(isUp, "no local backend on 127.0.0.1:3000; start it before running this")

        app = XCUIApplication()
        // Deliberately NOT --ui-testing: that would stub the API and never
        // reach Plaid at all.
        app.launchArguments = ["--uitest-debug-session"]
        app.launch()
    }

    /// Async rather than a semaphore around a completion handler.
    ///
    /// The previous version mutated a captured `var ok` from inside the
    /// `URLSession` callback, which is a genuine data race the compiler now
    /// reports: the callback runs on a URLSession delegate queue while the
    /// caller blocks on a semaphore, so the write and the read are on different
    /// threads with nothing ordering them. `URLSession.data(for:)` removes the
    /// shared variable rather than guarding it.
    ///
    /// `static` so the call carries no `self`. As an instance method it would
    /// send a `@MainActor` instance into a nonisolated context, which is a
    /// data-race warning in its own right; the check needs nothing from the
    /// instance anyway.
    nonisolated private static func backendIsUp() async -> Bool {
        let url = URL(string: "http://127.0.0.1:3000/health")!
        var request = URLRequest(url: url)
        request.timeoutInterval = 10
        guard let (_, response) = try? await URLSession.shared.data(for: request) else { return false }
        return (response as? HTTPURLResponse)?.statusCode == 200
    }

    /// Plaid's Link UI is a web view hosted by the SDK. Rather than assert on
    /// its internal labels, which are Plaid's to change, this asserts that a
    /// sheet carrying a web view appeared, which is what the presentation
    /// migration is responsible for.
    func testConnectAffordancePresentsPlaidLink() throws {
        let connect = app.buttons["Connect an account"]
        XCTAssertTrue(
            connect.waitForExistence(timeout: 30),
            "connect affordance never appeared; the app may not have reached Home"
        )
        connect.tap()

        // The SDK loads over the network, so this window is generous.
        let webView = app.webViews.firstMatch
        XCTAssertTrue(
            webView.waitForExistence(timeout: 45),
            "Plaid Link never presented. This is what a broken LinkKit 7 migration looks like: "
            + "it compiles, every unit test passes, and the sheet stays empty."
        )
    }
}
