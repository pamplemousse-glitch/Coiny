import XCTest

/// The one automated accessibility control (verification part 6, row 6.8.1).
///
/// `XCUIApplication.performAccessibilityAudit()` ships with Xcode, needs no
/// dependency, and catches the four classes of defect part 6 found by hand:
/// unlabelled elements, contrast below AA, hit regions under 44pt, and text
/// that clips at large Dynamic Type. Every UI test file calls it once, on the
/// screen that file already navigates to, so coverage grows with the tests
/// rather than needing its own maintenance.
///
/// Failures are real. If one is not, exclude it here with a written reason
/// rather than deleting the call, so the exclusion is reviewable.
extension XCTestCase {
    func auditAccessibility(
        _ app: XCUIApplication,
        types: XCUIAccessibilityAuditType = .all,
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws {
        let tabBar = app.tabBars.firstMatch
        let tabBarFrame = tabBar.exists ? tabBar.frame : .null

        try app.performAccessibilityAudit(for: types) { issue in
            // Elements the app does not draw cannot be fixed by the app.
            // `SignInWithAppleButton` is rendered by AuthenticationServices and
            // its contrast and label are Apple's; auditing it reports defects
            // that no change in this repo can clear.
            let element = issue.element
            if element?.elementType == .button, element?.identifier == "AuthenticationServices.AuthorizationAppleIDButton" {
                return true
            }
            // Scrolled content passing under the translucent tab bar is
            // measured against the bar, so a row halfway behind it reports a
            // contrast failure that describes the scroll position rather than
            // any colour the app chose. The same row measures correctly once it
            // is clear of the bar. Only contrast is excused: a hit region under
            // the tab bar is a real defect and still fails.
            if issue.auditType == .contrast, let frame = element?.frame, tabBarFrame.intersects(frame) {
                return true
            }
            // The element, not just the issue: "hit area is too small" with no
            // element named is a defect report nobody can act on.
            let described = element.map {
                "\($0.elementType) '\($0.label)' id '\($0.identifier)' \($0.frame) hittable=\($0.isHittable)"
            } ?? "no element"
            XCTFail("\(issue.compactDescription) — \(described)", file: file, line: line)
            // Reported above with a source location, so do not report twice.
            return true
        }
    }
}
