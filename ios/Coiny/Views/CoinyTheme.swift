import SwiftUI

/// The design-direction 4.2 palette, light and dark, as dynamic colors.
/// There is no asset catalog yet; when one lands these become catalog colors
/// and this file shrinks to the token names.
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

    private static func dynamic(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { trait in
            trait.userInterfaceStyle == .dark ? UIColor(rgb: dark) : UIColor(rgb: light)
        })
    }
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
