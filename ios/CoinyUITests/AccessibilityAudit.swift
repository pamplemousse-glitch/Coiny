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
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws {
        try app.performAccessibilityAudit { issue in
            // Elements the app does not draw cannot be fixed by the app.
            // `SignInWithAppleButton` is rendered by AuthenticationServices and
            // its contrast and label are Apple's; auditing it reports defects
            // that no change in this repo can clear.
            let element = issue.element
            if element?.elementType == .button, element?.identifier == "AuthenticationServices.AuthorizationAppleIDButton" {
                return true
            }
            XCTFail("\(issue.auditType): \(issue.compactDescription)", file: file, line: line)
            // Reported above with a source location, so do not report twice.
            return true
        }
    }
}
