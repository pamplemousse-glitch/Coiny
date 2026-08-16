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
            // The composition bar legend (CompositionBarView) reports
            // "Dynamic Type font sizes are partially unsupported" and the
            // report is wrong. Measured directly at
            // UICTContentSizeCategoryAccessibilityXXXL, the three legend rows
            // grow from 13.3pt tall to 48pt and 96pt, reflow from a row into a
            // column, and wrap rather than truncate. They use .caption2, a
            // scaling text style, and their swatch is a @ScaledMetric tied to
            // it. Nothing about them is fixed.
            //
            // They are also decorative: the bar's parent declares
            // `accessibilityElement(children: .ignore)` and supplies a summary
            // label containing these exact strings, which is the single element
            // VoiceOver reads. Excluded on evidence, not on convenience; if the
            // legend is ever given a fixed font or frame, re-measure before
            // trusting this line.
            if issue.auditType == .dynamicType, element?.label.hasSuffix(" percent") == true {
                return true
            }
            // A DISABLED control has no contrast requirement. WCAG 2.2 SC 1.4.3
            // says so in as many words: "Text or images of text that are part
            // of an inactive user interface component ... have no contrast
            // requirement."
            //
            // The audit measures the dimmed rendering, so every disabled
            // control fails it. Verified as a property of disabling rather than
            // of any one style: the paywall's Subscribe button fails identically
            // under `.borderedProminent` and under an explicit
            // `signalFill`/`onSignal` pair, because SwiftUI's `.disabled()`
            // fades whatever is underneath.
            //
            // Narrow on purpose. It excuses only contrast, only on elements the
            // app has actually disabled; an unlabelled or unreachable disabled
            // control still fails.
            if issue.auditType == .contrast, element?.isEnabled == false {
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
