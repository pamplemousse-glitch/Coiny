import SwiftUI

/// The three sizes the Window ever appears at (design-direction 1.1).
enum WindowSize {
    /// Home tab collapsed, onboarding, stage-change moment.
    case full
    /// Pinned above the expanded journey, widgets, Watch.
    case panel
    /// Activity feed gutter rows, tab bar.
    case stamp

    var points: CGFloat {
        switch self {
        case .full: return 192
        case .panel: return 64
        case .stamp: return 20
        }
    }
}

/// The Window: a hard-edged rectangular display with a 2px corner radius, a
/// 1px inset bezel, and a field color slightly warmer than the app background.
/// The creature lives inside it; nothing else in the app is ever drawn this
/// way, and nothing else ever appears inside it. No number, gauge, or progress
/// bar may ever render within this frame (R-4.4).
struct CoinyWindow: View {
    let size: WindowSize
    let condition: CreatureCondition
    /// Creature stage 0 to 7; drives the placeholder form.
    let stage: Int

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 2)
                .fill(CoinyTheme.field)
            RoundedRectangle(cornerRadius: 2)
                .inset(by: 0.5)
                .stroke(CoinyTheme.rule, lineWidth: 1)
            CreatureArtView(condition: condition, stage: stage, size: size)
                .padding(size.points * 0.14)
        }
        .frame(width: size.points, height: size.points)
        .accessibilityElement(children: .ignore)
    }
}

#Preview("Window sizes") {
    VStack(spacing: 24) {
        CoinyWindow(size: .full, condition: .idle, stage: 4)
        CoinyWindow(size: .full, condition: .disconnected, stage: 0)
        CoinyWindow(size: .full, condition: .sleeping, stage: 2)
        HStack(spacing: 24) {
            CoinyWindow(size: .panel, condition: .idle, stage: 4)
            CoinyWindow(size: .stamp, condition: .idle, stage: 4)
        }
    }
    .padding()
    .background(CoinyTheme.screen)
}
