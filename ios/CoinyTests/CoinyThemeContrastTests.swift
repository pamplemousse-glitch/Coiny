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

    private func resolve(_ color: Color, _ style: UIUserInterfaceStyle) -> Color.Resolved {
        // `UIColor(_: Color)` flattens a dynamic color against the traits in
        // force at the moment of the bridge, so resolving afterwards returns
        // the light value in both branches and every dark assertion silently
        // tests light. `Color.resolve(in:)` is the SwiftUI-native path and it
        // hands back linear-light components, which is exactly the space the
        // WCAG luminance sum wants.
        var environment = EnvironmentValues()
        environment.colorScheme = style == .dark ? .dark : .light
        return color.resolve(in: environment)
    }

    private func luminance(_ color: Color, _ style: UIUserInterfaceStyle) -> Double {
        let resolved = resolve(color, style)
        return 0.2126 * Double(resolved.linearRed)
            + 0.7152 * Double(resolved.linearGreen)
            + 0.0722 * Double(resolved.linearBlue)
    }

    /// Foreground luminance *after* compositing it over the background it is
    /// drawn on.
    ///
    /// This is not a refinement, it is the difference between measuring the
    /// screen and measuring an intention. A translucent colour shows the
    /// background through it, so treating it as opaque overstates its
    /// contrast: `Color.secondary.opacity(0.3)` scores well above AA measured
    /// flat and renders at 1.55:1 on the dark screen, which is what the
    /// paywall's tier border actually was. Opaque colours have alpha 1 and are
    /// unaffected, so every assertion written before this still means what it
    /// meant.
    private func luminance(_ foreground: Color, over background: Color, _ style: UIUserInterfaceStyle) -> Double {
        let fg = resolve(foreground, style)
        let bg = resolve(background, style)
        let alpha = Double(fg.opacity)
        func blend(_ f: Float, _ b: Float) -> Double {
            Double(f) * alpha + Double(b) * (1 - alpha)
        }
        return 0.2126 * blend(fg.linearRed, bg.linearRed)
            + 0.7152 * blend(fg.linearGreen, bg.linearGreen)
            + 0.0722 * blend(fg.linearBlue, bg.linearBlue)
    }

    private func ratio(_ foreground: Color, on background: Color, _ style: UIUserInterfaceStyle) -> Double {
        let a = luminance(foreground, over: background, style)
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
        assertRatio(CoinyTheme.ink3, on: bg, .light, equals: 4.86, "light ink3 on screen")
        assertRatio(CoinyTheme.rule, on: bg, .light, equals: 1.25, "light rule on screen")
        assertRatio(CoinyTheme.signal, on: bg, .light, equals: 4.95, "light signal on screen")
        assertRatio(CoinyTheme.positive, on: bg, .light, equals: 5.35, "light positive on screen")
        assertRatio(CoinyTheme.negative, on: bg, .light, equals: 5.94, "light negative on screen")
    }

    func testLightTokensMatchThePublishedRatiosOnSurface() {
        let bg = CoinyTheme.surface
        assertRatio(CoinyTheme.ink, on: bg, .light, equals: 16.27, "light ink on surface")
        assertRatio(CoinyTheme.ink2, on: bg, .light, equals: 7.46, "light ink2 on surface")
        assertRatio(CoinyTheme.ink3, on: bg, .light, equals: 5.33, "light ink3 on surface")
        assertRatio(CoinyTheme.signal, on: bg, .light, equals: 5.43, "light signal on surface")
        assertRatio(CoinyTheme.positive, on: bg, .light, equals: 5.86, "light positive on surface")
        assertRatio(CoinyTheme.negative, on: bg, .light, equals: 6.52, "light negative on surface")
    }

    func testDarkTokensMatchThePublishedRatiosOnScreen() {
        let bg = CoinyTheme.screen
        assertRatio(CoinyTheme.ink, on: bg, .dark, equals: 14.96, "dark ink on screen")
        assertRatio(CoinyTheme.ink2, on: bg, .dark, equals: 7.94, "dark ink2 on screen")
        assertRatio(CoinyTheme.ink3, on: bg, .dark, equals: 5.22, "dark ink3 on screen")
        assertRatio(CoinyTheme.rule, on: bg, .dark, equals: 1.38, "dark rule on screen")
        assertRatio(CoinyTheme.signal, on: bg, .dark, equals: 8.38, "dark signal on screen")
        assertRatio(CoinyTheme.positive, on: bg, .dark, equals: 8.59, "dark positive on screen")
        assertRatio(CoinyTheme.negative, on: bg, .dark, equals: 8.06, "dark negative on screen")
    }

    func testDarkTokensMatchThePublishedRatiosOnSurface() {
        let bg = CoinyTheme.surface
        assertRatio(CoinyTheme.ink, on: bg, .dark, equals: 13.51, "dark ink on surface")
        assertRatio(CoinyTheme.ink2, on: bg, .dark, equals: 7.17, "dark ink2 on surface")
        // Absent from the published table, which is how it went unnoticed at
        // 4.29:1 while the screen figure beside it read 4.75.
        assertRatio(CoinyTheme.ink3, on: bg, .dark, equals: 4.71, "dark ink3 on surface")
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

    /// `ink3` used to be exempted rather than fixed: 4.15:1 on `screen` in
    /// light, permitted by the design document "at caption size and above".
    /// WCAG's large-text exemption starts at 18pt, or 14pt bold, and `caption`
    /// is 12pt, so the exemption did not exist and every rung code, unit label
    /// and section heading in the app was below AA. It is now a real value, and
    /// this test is the thing that stops the exemption coming back.
    /// WCAG 2.2 1.4.11: a boundary that carries state, rather than decorating,
    /// needs 3:1. The tier card's border is the whole of what says "this is the
    /// plan you picked", and `Color.secondary.opacity(0.3)` measured 1.55:1 on
    /// the dark screen and 1.41:1 on the light one. Opacity over a semantic
    /// colour was the mechanism: it shifts differently per scheme and neither
    /// result was ever looked at.
    func testTierCardBordersClearTheNonTextFloorInBothSchemes() {
        for (name, selected) in [("selected", true), ("unselected", false)] {
            for style in [UIUserInterfaceStyle.light, .dark] {
                let border = PaywallView.tierBorderColor(selected: selected)
                let actual = ratio(border, on: CoinyTheme.screen, style)
                XCTAssertGreaterThanOrEqual(
                    actual, 3.0,
                    "\(style == .dark ? "dark" : "light") \(name) tier border is "
                    + "\(String(format: "%.2f", actual)):1 on screen, below the 3:1 floor for a control boundary"
                )
            }
        }
    }

    /// The unavailable refund row measured 2.25:1 in dark and 1.84:1 in light,
    /// because `.disabled()` fades a Form row's label to the system tertiary
    /// label. Unavailable still has to be readable: #220 settled this on the
    /// paywall's subscribe button and the same rule applies here.
    func testRefundRowIsReadableWhetherOrNotARefundIsAvailable() {
        for (name, available) in [("available", true), ("unavailable", false)] {
            for style in [UIUserInterfaceStyle.light, .dark] {
                let label = SettingsView.refundLabelColor(available: available)
                assertAtLeastAA(
                    label, on: CoinyTheme.surface, style,
                    "\(style == .dark ? "dark" : "light") \(name) refund label on surface"
                )
            }
        }
    }

    func testInk3ClearsAAOnEveryBackgroundItIsDrawnOn() {
        for (name, background) in [("screen", CoinyTheme.screen), ("surface", CoinyTheme.surface)] {
            assertAtLeastAA(CoinyTheme.ink3, on: background, .light, "light ink3 on \(name)")
            assertAtLeastAA(CoinyTheme.ink3, on: background, .dark, "dark ink3 on \(name)")
        }
    }
}
