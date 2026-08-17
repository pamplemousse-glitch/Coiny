import SwiftUI

/// The design-direction 4.2 palette, light and dark, as dynamic colors.
/// There is no asset catalog yet; when one lands these become catalog colors
/// and this file shrinks to the token names.
///
/// This is the only palette in the app. Onboarding used to carry a second copy
/// under the name `OnboardingPalette`; it was folded in here, `inkSecondary`
/// becoming `ink2`, because two palettes is how the two of them drift.
enum CoinyTheme {
    /// App background. The LCD.
    static let screen = dynamic(light: 0xEDEFE7, dark: 0x151711)
    /// Raised rows, sheets, cards.
    static let surface = dynamic(light: 0xF8F9F4, dark: 0x1E211A)
    /// Inside the Window only.
    static let field = dynamic(light: 0xE4E7DA, dark: 0x1C1F16)
    /// Primary text, all balances.
    static let ink = dynamic(light: 0x191C17, dark: 0xE8EBE0)
    /// Secondary text.
    static let ink2 = dynamic(light: 0x4E534A, dark: 0xA8AEA0)
    /// Labels, units, the monospaced section headings.
    ///
    /// The light value was `#6E7468`, which is 4.15:1 on `screen`, and the
    /// design document permitted it anyway "at caption size and above". That
    /// permission was wrong: WCAG's large-text exemption starts at 18pt, or
    /// 14pt bold, and `caption` is 12pt, so every rung code and section heading
    /// in the app was below AA. `XCUIApplication.performAccessibilityAudit()`
    /// found it on Home, the journey and Activity within a minute of being
    /// switched on. Darkened until it clears 4.5:1 on `screen`, which is the
    /// background these labels are actually drawn on.
    /// The dark value moved for the same reason: `#7E857A` cleared AA on
    /// `screen` and was 4.29:1 on `surface`, a background the published table
    /// never listed it against.
    static let ink3 = dynamic(light: 0x64695E, dark: 0x858C81)
    /// 1px hairlines. Decorative, carries no information.
    static let rule = dynamic(light: 0xD3D8C9, dark: 0x2E3229)
    /// Interactive text, links, the one accent.
    static let signal = dynamic(light: 0x9C5310, dark: 0xE8A33D)
    /// Filled button background.
    static let signalFill = dynamic(light: 0xA85B14, dark: 0xE8A33D)
    /// The only label color permitted on `signalFill`.
    ///
    /// Neither of the two colors previously used in the codebase clears AA in
    /// both schemes: white is 5.03:1 light but 2.16:1 on the dark amber, and
    /// `screen` is 8.38:1 dark but 4.34:1 light. Flipping with the scheme gives
    /// 5.03:1 and 8.38:1, so this token is mode-aware for a reason and must not
    /// be collapsed to a constant.
    static let onSignal = dynamic(light: 0xFFFFFF, dark: 0x151711)
    /// The label color on a disabled filled button, whose fill is `field`.
    ///
    /// Named rather than spelled `ink2` at each site so the button style and
    /// anything drawn inside the button cannot drift apart. They already had:
    /// `OnboardingPrimaryButton` tinted its spinner `onSignal`, which is only
    /// ever shown while the button is disabled, so once the disabled fill
    /// became `field` the spinner measured 1.25:1 in light and 1.06:1 in dark
    /// and the button read as an empty rectangle for the whole time it was
    /// working. 6.29:1 on `field` in both schemes.
    static let onDisabledFill = ink2
    /// Positive delta only, never a level (design-direction 4.3 rules 1, 2, 4).
    static let positive = dynamic(light: 0x3D6B44, dark: 0x8FBF8A)
    /// Negative delta, and the low band of the three graded health metrics.
    /// Never debt (4.3 rule 5), and never an error: design-direction 4.3 spends
    /// this pair on deltas, and `CoinyErrorLine` carries a failure in words.
    static let negative = dynamic(light: 0x9A3B32, dark: 0xE39B92)

    private static func dynamic(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor(rgb: dark) : UIColor(rgb: light)
        })
    }
}

/// The one filled button. Replaces `.borderedProminent`, which renders in the
/// system tint and puts a white label on it in both schemes.
///
/// Radius 10 per design-direction 4.4, 44pt minimum target per R-11.5, and the
/// label always `onSignal` so the pair clears AA in light and dark alike.
///
/// **Disabled is a different pair of tokens, never the same pair faded.** This
/// style used to end in `.opacity(isEnabled ? … : 0.4)`, and #220 wrote the
/// same rule into `PaywallView` in words while the fade stayed in the code.
/// Measured on the rendered screen, the "fixed" subscribe button was 2.92:1 in
/// dark and 2.26:1 in light: `field` and `ink2` compute 6.29:1 and the 0.4
/// multiply undid it. The arithmetic was right and nobody looked at the pixels.
/// A `ButtonStyle` owns its disabled rendering completely, so swapping tokens
/// here is what makes the rule true rather than merely stated.
struct CoinyFilledButtonStyle: ButtonStyle {
    /// Fill the available width. Off for inline actions inside a row.
    var fillWidth = true

    func makeBody(configuration: Configuration) -> some View {
        FilledLabel(configuration: configuration, fillWidth: fillWidth)
    }

    private struct FilledLabel: View {
        let configuration: Configuration
        let fillWidth: Bool
        @Environment(\.isEnabled) private var isEnabled

        var body: some View {
            configuration.label
                .font(.body.weight(.semibold))
                .foregroundStyle(isEnabled ? CoinyTheme.onSignal : CoinyTheme.onDisabledFill)
                .padding(.horizontal, 20)
                .frame(maxWidth: fillWidth ? .infinity : nil, minHeight: 44)
                .background(
                    isEnabled ? CoinyTheme.signalFill : CoinyTheme.field,
                    in: RoundedRectangle(cornerRadius: 10)
                )
                // `field` on `screen` is 1.08:1, so a disabled button with no
                // outline is a rectangle you cannot see: swapping the fill
                // fixed the label and lost the shape. The outline keeps the
                // control locatable while still reading as unavailable.
                .overlay {
                    if !isEnabled {
                        // `onDisabledFill`, the same token as the label. A 1pt
                        // stroke antialiases to roughly 60% of its colour at
                        // 1x, so `ink3` measured 2.96:1 against the light
                        // screen on the render despite computing 4.86:1. The
                        // outline and the label are the same statement anyway.
                        RoundedRectangle(cornerRadius: 10)
                            .strokeBorder(CoinyTheme.onDisabledFill, lineWidth: 1)
                    }
                }
                // Pressed still fades, because that is a momentary state a
                // sighted user is looking straight at. Disabled does not: it
                // can persist for the whole time the screen is open.
                .opacity(isEnabled && configuration.isPressed ? 0.85 : 1)
        }
    }
}

extension ButtonStyle where Self == CoinyFilledButtonStyle {
    static var coinyFilled: CoinyFilledButtonStyle { CoinyFilledButtonStyle() }
    static var coinyFilledInline: CoinyFilledButtonStyle { CoinyFilledButtonStyle(fillWidth: false) }
}

private extension UIColor {
    convenience init(rgb: UInt32) {
        self.init(
            red: CGFloat((rgb >> 16) & 0xFF) / 255,
            green: CGFloat((rgb >> 8) & 0xFF) / 255,
            blue: CGFloat(rgb & 0xFF) / 255,
            alpha: 1
        )
    }
}
