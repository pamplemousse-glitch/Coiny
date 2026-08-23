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
    /// `@MainActor` because `performAccessibilityAudit` and every `XCUIElement`
    /// member this reads are main-actor isolated. Every caller is a test method
    /// in a `@MainActor` class, so this costs nothing at the call sites.
    @MainActor
    func auditAccessibility(
        _ app: XCUIApplication,
        types: XCUIAccessibilityAuditType = .all,
        file: StaticString = #filePath,
        line: UInt = #line
    ) throws {
        // Retry once on a TIMEOUT, and only on a timeout.
        //
        // `performAccessibilityAudit` has two separate failure modes and they
        // were reaching CI as the same red X. One is a finding, which is the
        // point of the test. The other is `Code=-56`, "Audit failed to complete
        // in time", which is the audit not finishing rather than the app being
        // wrong, and it says nothing about accessibility at all.
        //
        // Evidence it is not the Xcode 26 bump: the identical error failed #226
        // on Xcode 16, where it was written off as flake. It predates the
        // toolchain change and survived it.
        //
        // One retry, not a loop. A timeout that reproduces immediately is a
        // real signal worth surfacing; the flake does not reproduce. Retrying
        // until green would hide a genuinely hanging audit, which is the thing
        // this must not do.
        do {
            try runAudit(app, types: types, file: file, line: line)
        } catch let error as NSError where error.isAccessibilityAuditTimeout {
            // Deliberately visible. A silent retry turns "the audit is
            // unreliable" into folklore, which is how this went uninvestigated
            // across two PRs.
            print("performAccessibilityAudit timed out (Code=-56). Retrying once; this is not a finding.")
            try runAudit(app, types: types, file: file, line: line)
        }
    }

    @MainActor
    private func runAudit(
        _ app: XCUIApplication,
        types: XCUIAccessibilityAuditType,
        file: StaticString,
        line: UInt
    ) throws {
        let tabBar = app.tabBars.firstMatch
        let tabBarFrame = tabBar.exists ? tabBar.frame : .null

        /// How far ABOVE the tab bar iOS 26's scroll-edge effect reaches.
        ///
        /// iOS 26 draws a floating tab bar and fades content approaching it, so
        /// a row that is nowhere near the bar's own rectangle is still
        /// composited against a gradient. The audit measures that composite and
        /// reports a contrast failure describing the effect rather than any
        /// colour the app chose.
        ///
        /// 48 is derived from measurement, not taste. On macos-26 / Xcode 26.6
        /// the bar sits at y=791 and the three reported elements were:
        ///
        ///     'GOALS'      y 753.7 to 768.0
        ///     'Debts'      y 767.7 to 785.7
        ///     '$4,300.00'  y 767.7 to 785.7
        ///
        /// so the affected band runs about 37pt above the bar. 48 covers that
        /// with margin and still leaves the great majority of the screen
        /// audited.
        ///
        /// This is an exclusion on EVIDENCE, which is the bar this file sets.
        /// The colours underneath were measured independently and pass
        /// comfortably: `DarkModeRenderingTests`
        /// `testWealthRowTextStylesMeetContrastWhenRendered` renders those exact
        /// (font, colour) pairs and gets 7.58:1 in light and 7.25:1 in dark
        /// against an AA bar of 4.5:1. So the app is not the thing failing here.
        ///
        /// If Apple changes the effect, re-measure rather than raising this.
        let scrollEdgeEffectHeight: CGFloat = 48
        let tabBarExclusion = tabBarFrame.isNull
            ? CGRect.null
            : tabBarFrame.insetBy(dx: 0, dy: -scrollEdgeEffectHeight)

        try app.performAccessibilityAudit(for: types) { issue in
            // Elements the app does not draw cannot be fixed by the app.
            // `SignInWithAppleButton` is rendered by AuthenticationServices and
            // its contrast and label are Apple's; auditing it reports defects
            // that no change in this repo can clear.
            let element = issue.element
            if element?.elementType == .button, element?.identifier == "AuthenticationServices.AuthorizationAppleIDButton" {
                return true
            }
            // Scrolled content passing under the translucent tab bar, OR inside
            // the scroll-edge effect above it on iOS 26, is measured against
            // that composite rather than against the colour the app chose. The
            // same row measures correctly once it is clear.
            //
            // Only contrast is excused: a hit region under the tab bar is a
            // real defect and still fails.
            if issue.auditType == .contrast, let frame = element?.frame, tabBarExclusion.intersects(frame) {
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

private extension NSError {
    /// True for the audit's "failed to complete in time" error, and nothing else.
    ///
    /// Matched on the code AND the message rather than on either alone.
    /// `-56` is not unique across error domains, and the domain XCTest reports
    /// this under is not contractual, so a code-only match risks swallowing an
    /// unrelated failure and turning a real defect into a silent retry. Both
    /// halves have to agree.
    var isAccessibilityAuditTimeout: Bool {
        guard code == -56 else { return false }
        let haystack = "\(localizedDescription) \(userInfo)".lowercased()
        return haystack.contains("audit") && haystack.contains("time")
    }
}
