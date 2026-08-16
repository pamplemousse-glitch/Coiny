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
    /// Labels, units. Light-mode use is constrained to caption-and-above.
    static let ink3 = dynamic(light: 0x6E7468, dark: 0x7E857A)
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
    /// Positive delta only, never a level (design-direction 4.3 rules 1, 2, 4).
    static let positive = dynamic(light: 0x3D6B44, dark: 0x8FBF8A)
    /// Negative delta, and the error text color. Never debt (4.3 rule 5).
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
                .foregroundStyle(CoinyTheme.onSignal)
                .padding(.horizontal, 20)
                .frame(maxWidth: fillWidth ? .infinity : nil, minHeight: 44)
                .background(CoinyTheme.signalFill, in: RoundedRectangle(cornerRadius: 10))
                .opacity(isEnabled ? (configuration.isPressed ? 0.85 : 1) : 0.4)
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
