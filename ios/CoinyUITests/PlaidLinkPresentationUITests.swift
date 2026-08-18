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
final class PlaidLinkPresentationUITests: XCTestCase {

    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
        try XCTSkipUnless(backendIsUp(), "no local backend on 127.0.0.1:3000; start it before running this")

        app = XCUIApplication()
        // Deliberately NOT --ui-testing: that would stub the API and never
        // reach Plaid at all.
        app.launchArguments = ["--uitest-debug-session"]
        app.launch()
    }

    private func backendIsUp() -> Bool {
        let url = URL(string: "http://127.0.0.1:3000/health")!
        let sem = DispatchSemaphore(value: 0)
        var ok = false
        URLSession.shared.dataTask(with: url) { _, response, _ in
            ok = (response as? HTTPURLResponse)?.statusCode == 200
            sem.signal()
        }.resume()
        _ = sem.wait(timeout: .now() + 10)
        return ok
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
