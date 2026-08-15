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
///
/// THIS IS THE ONLY WINDOW. Onboarding used to carry a second one under the
/// name `OnboardingCreatureWindow`, with a 3pt bezel inset against this one's
/// 0.5 and a 0.45-by-0.55 creature fraction against this one's 14% pad, so the
/// frame changed shape between the screen where the egg hatched and the screen
/// after it. Onboarding now maps its states onto `(condition, stage)` and calls
/// this (see `OnboardingCreatureWindow.swift`).
struct CoinyWindow: View {
    let size: WindowSize
    let condition: CreatureCondition
    /// Creature stage 0 to 7; drives the placeholder form.
    let stage: Int
    /// The one-off crack across the egg, for the hatch moment only. Not a
    /// condition: the creature is not "hatching" the way it is sleeping, it is
    /// mid-transition for about a second.
    var hatching = false
    /// Spoken description. Home supplies its own from the pet state and leaves
    /// this nil; onboarding, which has no pet yet, passes one here.
    var accessibilityLabel: String?

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var breathe = false

    var body: some View {
        if let accessibilityLabel {
            frame.accessibilityLabel(accessibilityLabel)
        } else {
            frame
        }
    }

    private var frame: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 2)
                .fill(CoinyTheme.field)
            RoundedRectangle(cornerRadius: 2)
                .inset(by: 0.5)
                .stroke(CoinyTheme.rule, lineWidth: 1)
            CreatureArtView(condition: condition, stage: stage, size: size, hatching: hatching)
                .padding(size.points * 0.14)
                // The scale sits on the art, never on the frame, so the
                // Full-to-Panel matched-geometry morph on Home is unaffected.
                .scaleEffect(breathe ? 1.02 : 1)
        }
        .frame(width: size.points, height: size.points)
        .onAppear { startBreathing() }
        .onChange(of: condition) { startBreathing() }
        .accessibilityElement(children: .ignore)
    }

    /// Two percent, two seconds, easeInOut, and nothing under Reduce Motion
    /// (design-direction 4.5). A creature that never moves reads as an icon.
    private func startBreathing() {
        breathe = false
        guard !reduceMotion, isResting else { return }
        withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
            breathe = true
        }
    }

    /// The transient reactions hold still; a breath under a celebration reads
    /// as two animations fighting.
    private var isResting: Bool {
        switch condition {
        case .idle, .disconnected, .sleeping: return true
        case .celebrating, .concerned: return false
        }
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
