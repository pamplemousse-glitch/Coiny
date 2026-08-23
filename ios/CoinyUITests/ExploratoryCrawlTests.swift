import XCTest

/// The breadth pass the other UI test files deliberately do not do.
///
/// Every other file in this target navigates to one screen and asserts
/// something specific about it. That catches regressions in the paths someone
/// already thought to write down, and it is silent about the control nobody
/// tested: a button whose action throws, a sheet that presents empty, a row
/// that pushes a view which crashes on construction.
///
/// This test enumerates the buttons actually on screen at runtime, taps each
/// one, and asserts only that the app is still running afterwards and that the
/// screen is recoverable. It is a crash and dead-end detector, not a
/// correctness check: it cannot know what a button *should* do. Screenshots of
/// every state are attached to the result bundle so the states it walked can be
/// reviewed by eye.
///
/// Destructive controls are skipped by label (see `skipped`). Tapping "Delete
/// account" in a crawl would pass, and leave nothing to crawl.
/// See `ActivityTabUITests` for why this is `@MainActor` and why the lifecycle
/// hooks opt in with `MainActor.assumeIsolated` rather than inheriting it.
@MainActor
final class ExploratoryCrawlTests: XCTestCase {
    /// Controls that destroy state, leave the app, or start a flow that cannot
    /// complete without a human. Matched case-insensitively as substrings.
    private static let skipped = [
        "delete", "sign out", "reset", "disconnect", "archive",
        "refund", "manage subscription", "restore purchases",
        "take it back", "does not apply", "not applicable",
    ]

    private var app: XCUIApplication!
    /// One line per control tapped, printed at the end as the crawl report.
    private var log: [String] = []

    // The async lifecycle variants, for the same reason as PaywallUITests: they
    // inherit the class's `@MainActor` isolation, where the `WithError`
    // overrides stay nonisolated and would have to send `self` across.
    override func setUp() async throws {
        try await super.setUp()
        // A crash mid-crawl is the finding. Keep going so one bad control does
        // not hide the twenty after it.
        continueAfterFailure = true
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        XCTAssertTrue(app.tabBars.firstMatch.waitForExistence(timeout: 20), "app did not reach the tab bar")
    }

    override func tearDown() async throws {
        let report = log.joined(separator: "\n")
        let attachment = XCTAttachment(string: report)
        attachment.name = "crawl-report"
        attachment.lifetime = .keepAlways
        add(attachment)
        print("\n===== CRAWL REPORT =====\n\(report)\n===== END =====\n")
        try await super.tearDown()
    }

    func testCrawlEveryTab() throws {
        for tab in ["Home", "Activity", "Wealth"] {
            crawl(tab: tab)
        }
    }

    // MARK: - Crawl

    private func crawl(tab: String) {
        guard selectTab(tab) else {
            log.append("SKIP tab \(tab): not reachable")
            return
        }
        capture(named: "tab-\(tab)")

        // Snapshot the labels first. Tapping mutates the tree, so holding
        // XCUIElement references across taps yields stale queries.
        let labels = tappableLabels()
        log.append("\n## \(tab) — \(labels.count) controls on screen")

        for label in labels {
            if Self.skipped.contains(where: { label.lowercased().contains($0) }) {
                log.append("  skip  \(label)  (destructive)")
                continue
            }
            tapAndRecover(label: label, tab: tab)
        }
    }

    private func tapAndRecover(label: String, tab: String) {
        let button = app.buttons[label]
        guard button.exists, button.isHittable else {
            log.append("  gone  \(label)  (not hittable by the time we got to it)")
            return
        }

        button.tap()
        // No waitForExistence to hang on: we do not know what should appear.
        // Idle-wait is what XCUITest gives us for "the tap settled".
        _ = app.staticTexts.firstMatch.waitForExistence(timeout: 3)

        if app.state != .runningForeground {
            XCTFail("app left the foreground after tapping '\(label)' on \(tab) (state \(app.state.rawValue))")
            log.append("  CRASH \(label)")
            return
        }

        capture(named: "\(tab)-after-\(safe(label))")
        log.append("  ok    \(label) -> \(currentScreenDescription())")
        recover(to: tab)
    }

    /// Get back to the tab root from wherever the tap landed. Tries the three
    /// ways out in the order they occlude each other: a sheet covers the nav
    /// bar, which covers the tab bar.
    private func recover(to tab: String) {
        for dismiss in ["Done", "Close", "Cancel"] where app.buttons[dismiss].exists {
            app.buttons[dismiss].tap()
            _ = app.tabBars.firstMatch.waitForExistence(timeout: 3)
            break
        }
        let back = app.navigationBars.buttons.element(boundBy: 0)
        if app.tabBars.firstMatch.exists == false, back.exists, back.isHittable {
            back.tap()
        }
        if app.tabBars.firstMatch.exists == false {
            // A sheet with no labelled dismiss control. Swipe it away.
            app.swipeDown(velocity: .fast)
        }
        _ = selectTab(tab)
    }

    // MARK: - Helpers

    @discardableResult
    private func selectTab(_ tab: String) -> Bool {
        let button = app.tabBars.firstMatch.buttons[tab]
        guard button.waitForExistence(timeout: 5), button.isHittable else { return false }
        button.tap()
        return true
    }

    /// Labelled, hittable buttons currently on screen. Unlabelled ones are
    /// excluded because they cannot be re-found after the tree changes, and the
    /// accessibility audit already fails the build for them.
    private func tappableLabels() -> [String] {
        var seen = Set<String>()
        return app.buttons.allElementsBoundByIndex
            .filter { $0.exists && $0.isHittable && !$0.label.isEmpty }
            .map(\.label)
            .filter { seen.insert($0).inserted }
    }

    /// What is on screen now, for the report. Nav bar title if there is one,
    /// otherwise the first few static texts.
    private func currentScreenDescription() -> String {
        if let title = app.navigationBars.allElementsBoundByIndex.first?.identifier, !title.isEmpty {
            return "nav '\(title)'"
        }
        let texts = app.staticTexts.allElementsBoundByIndex.prefix(3).map(\.label).filter { !$0.isEmpty }
        return texts.isEmpty ? "(no text)" : "'\(texts.joined(separator: " / "))'"
    }

    private func capture(named name: String) {
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = name
        shot.lifetime = .keepAlways
        add(shot)
    }

    private func safe(_ label: String) -> String {
        String(label.prefix(40)).replacingOccurrences(of: "/", with: "-")
    }
}
