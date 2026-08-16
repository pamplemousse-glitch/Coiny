import SwiftUI
import UIKit
import XCTest
@testable import Coiny

/// Makes `docs/design-direction.md` section 4.2 executable.
///
/// The palette's published contrast table was correct when it was written and
/// nothing stopped it drifting: no test in either bundle referenced a token, so
/// editing a hex changed the app and left the document asserting a number that
/// was no longer true. These tests recompute every ratio with the WCAG 2.x
/// relative-luminance formula and fail on the first digit that moves.
///
/// The second half matters more than the first. `assertBodyTextIsReadable`
/// checks the tokens against the backgrounds they are actually drawn on,
/// including the system backgrounds the untokenised screens still use, because
/// the defect this suite exists to prevent was never a wrong hex: it was a
/// correct hex that no view referenced.
final class CoinyThemeContrastTests: XCTestCase {

    // MARK: - WCAG 2.x

    private func luminance(_ color: Color, _ style: UIUserInterfaceStyle) -> Double {
        // `UIColor(_: Color)` flattens a dynamic color against the traits in
        // force at the moment of the bridge, so resolving afterwards returns
        // the light value in both branches and every dark assertion silently
        // tests light. `Color.resolve(in:)` is the SwiftUI-native path and it
        // hands back linear-light components, which is exactly the space the
        // WCAG luminance sum wants.
        var environment = EnvironmentValues()
        environment.colorScheme = style == .dark ? .dark : .light
        let resolved = color.resolve(in: environment)
        return 0.2126 * Double(resolved.linearRed)
            + 0.7152 * Double(resolved.linearGreen)
            + 0.0722 * Double(resolved.linearBlue)
    }

    private func ratio(_ foreground: Color, on background: Color, _ style: UIUserInterfaceStyle) -> Double {
        let a = luminance(foreground, style)
        let b = luminance(background, style)
        return (max(a, b) + 0.05) / (min(a, b) + 0.05)
    }

    private func assertRatio(
        _ foreground: Color,
        on background: Color,
        _ style: UIUserInterfaceStyle,
        equals expected: Double,
        _ label: String,
        line: UInt = #line
    ) {
        let actual = ratio(foreground, on: background, style)
        XCTAssertEqual(
            actual, expected, accuracy: 0.01,
            "\(label): design-direction 4.2 publishes \(expected), the code computes \(String(format: "%.2f", actual))",
            line: line
        )
    }

    private func assertAtLeastAA(
        _ foreground: Color,
        on background: Color,
        _ style: UIUserInterfaceStyle,
        _ label: String,
        line: UInt = #line
    ) {
        let actual = ratio(foreground, on: background, style)
        XCTAssertGreaterThanOrEqual(
            actual, 4.5,
            "\(label) is \(String(format: "%.2f", actual)):1, below the 4.5:1 WCAG 2.2 AA floor for body text",
            line: line
        )
    }

    // MARK: - The published table

    func testLightTokensMatchThePublishedRatiosOnScreen() {
        let bg = CoinyTheme.screen
        assertRatio(CoinyTheme.ink, on: bg, .light, equals: 14.84, "light ink on screen")
        assertRatio(CoinyTheme.ink2, on: bg, .light, equals: 6.80, "light ink2 on screen")
        assertRatio(CoinyTheme.ink3, on: bg, .light, equals: 4.15, "light ink3 on screen")
        assertRatio(CoinyTheme.rule, on: bg, .light, equals: 1.25, "light rule on screen")
        assertRatio(CoinyTheme.signal, on: bg, .light, equals: 4.95, "light signal on screen")
        assertRatio(CoinyTheme.positive, on: bg, .light, equals: 5.35, "light positive on screen")
        assertRatio(CoinyTheme.negative, on: bg, .light, equals: 5.94, "light negative on screen")
    }

    func testLightTokensMatchThePublishedRatiosOnSurface() {
        let bg = CoinyTheme.surface
        assertRatio(CoinyTheme.ink, on: bg, .light, equals: 16.27, "light ink on surface")
        assertRatio(CoinyTheme.ink2, on: bg, .light, equals: 7.46, "light ink2 on surface")
        assertRatio(CoinyTheme.ink3, on: bg, .light, equals: 4.55, "light ink3 on surface")
        assertRatio(CoinyTheme.signal, on: bg, .light, equals: 5.43, "light signal on surface")
        assertRatio(CoinyTheme.positive, on: bg, .light, equals: 5.86, "light positive on surface")
        assertRatio(CoinyTheme.negative, on: bg, .light, equals: 6.52, "light negative on surface")
    }

    func testDarkTokensMatchThePublishedRatiosOnScreen() {
        let bg = CoinyTheme.screen
        assertRatio(CoinyTheme.ink, on: bg, .dark, equals: 14.96, "dark ink on screen")
        assertRatio(CoinyTheme.ink2, on: bg, .dark, equals: 7.94, "dark ink2 on screen")
        assertRatio(CoinyTheme.ink3, on: bg, .dark, equals: 4.75, "dark ink3 on screen")
        assertRatio(CoinyTheme.rule, on: bg, .dark, equals: 1.38, "dark rule on screen")
        assertRatio(CoinyTheme.signal, on: bg, .dark, equals: 8.38, "dark signal on screen")
        assertRatio(CoinyTheme.positive, on: bg, .dark, equals: 8.59, "dark positive on screen")
        assertRatio(CoinyTheme.negative, on: bg, .dark, equals: 8.06, "dark negative on screen")
    }

    func testDarkTokensMatchThePublishedRatiosOnSurface() {
        let bg = CoinyTheme.surface
        assertRatio(CoinyTheme.ink, on: bg, .dark, equals: 13.51, "dark ink on surface")
        assertRatio(CoinyTheme.ink2, on: bg, .dark, equals: 7.17, "dark ink2 on surface")
        assertRatio(CoinyTheme.signal, on: bg, .dark, equals: 7.56, "dark signal on surface")
        assertRatio(CoinyTheme.positive, on: bg, .dark, equals: 7.76, "dark positive on surface")
        assertRatio(CoinyTheme.negative, on: bg, .dark, equals: 7.28, "dark negative on surface")
    }

    // MARK: - The pairs the app actually draws

    /// `onSignal` is mode-aware because neither constant works in both schemes:
    /// white is 2.16:1 on the dark amber and `screen` is 4.34:1 on the light
    /// one. Collapsing it back to a constant breaks exactly one of these.
    func testFilledButtonLabelClearsAAInBothSchemes() {
        assertRatio(CoinyTheme.onSignal, on: CoinyTheme.signalFill, .light, equals: 5.03, "light onSignal on signalFill")
        assertRatio(CoinyTheme.onSignal, on: CoinyTheme.signalFill, .dark, equals: 8.38, "dark onSignal on signalFill")
        assertAtLeastAA(CoinyTheme.onSignal, on: CoinyTheme.signalFill, .light, "light onSignal on signalFill")
        assertAtLeastAA(CoinyTheme.onSignal, on: CoinyTheme.signalFill, .dark, "dark onSignal on signalFill")
    }

    /// The tokens that carry body text have to clear AA on the palette's own
    /// backgrounds and on the system backgrounds, because most screens still
    /// render on `systemBackground` rather than on `screen`.
    func testBodyTextTokensClearAAOnEveryBackgroundTheyAreDrawnOn() {
        let backgrounds: [(String, Color)] = [
            ("screen", CoinyTheme.screen),
            ("surface", CoinyTheme.surface),
            ("systemBackground", Color(uiColor: .systemBackground)),
            ("systemGroupedBackground", Color(uiColor: .systemGroupedBackground)),
            ("secondarySystemGroupedBackground", Color(uiColor: .secondarySystemGroupedBackground)),
        ]
        let foregrounds: [(String, Color)] = [
            ("ink", CoinyTheme.ink),
            ("ink2", CoinyTheme.ink2),
            ("signal", CoinyTheme.signal),
            ("positive", CoinyTheme.positive),
            ("negative", CoinyTheme.negative),
        ]
        for (bgName, bg) in backgrounds {
            for (fgName, fg) in foregrounds {
                assertAtLeastAA(fg, on: bg, .light, "light \(fgName) on \(bgName)")
                assertAtLeastAA(fg, on: bg, .dark, "dark \(fgName) on \(bgName)")
            }
        }
    }

    /// `ink3` is the one token the design document itself constrains, so the
    /// constraint is recorded here rather than left as prose: it does not clear
    /// AA on `screen` in light, which is why the substitution pass used `ink2`
    /// for secondary and tertiary text and left `ink3` to the surfaces that
    /// already used it at caption size.
    func testInk3IsBelowAAInLightAndIsConstrainedForThatReason() {
        XCTAssertLessThan(ratio(CoinyTheme.ink3, on: CoinyTheme.screen, .light), 4.5)
        XCTAssertGreaterThanOrEqual(ratio(CoinyTheme.ink3, on: CoinyTheme.surface, .light), 4.5)
    }
}
