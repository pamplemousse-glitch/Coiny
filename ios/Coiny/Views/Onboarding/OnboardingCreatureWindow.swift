import SwiftUI

// THE PLACEHOLDER CREATURE, single point of replacement.
//
// Commissioned art does not exist yet (design-direction section 5 is the
// brief). Every creature render in onboarding goes through this one view, so
// swapping in real sprites later touches this file only. The Pet tab rebuild
// carries its own Window placeholder in `PetView.swift`; unifying the two
// into one shared component is a deliberate one-edit follow-up once both
// land.
//
// The frame follows design-direction section 1.1: a hard-edged Window,
// 2px corner radius, 1px inset bezel, field color warmer than the screen
// background, no number ever inside the frame. Placeholder drawing is crude
// shapes on purpose (R-7.21 bans stock SF Symbols standing in for the
// creature).

// MARK: - States

enum OnboardingCreatureState: Equatable {
    /// Screen 1: the egg, lit.
    case egg
    /// Screen 5: the egg, dark, cannot see anything yet.
    case eggAsleep
    /// The hatch moment.
    case hatching
    /// Post-hatch creature.
    case hatched
    /// Abandoned or failed connection: present, patient, never distressed.
    case disconnected
}

// MARK: - Window

struct OnboardingCreatureWindow: View {
    let state: OnboardingCreatureState
    /// Full size per design-direction section 1.1.
    var size: CGFloat = 192

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var breathe = false

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 2)
                .fill(CoinyTheme.field)
            RoundedRectangle(cornerRadius: 2)
                .inset(by: 3)
                .stroke(CoinyTheme.rule, lineWidth: 1)
            creature
                .frame(width: size * 0.45, height: size * 0.55)
                .scaleEffect(breathScale)
        }
        .frame(width: size, height: size)
        .onAppear { startBreathing() }
        .onChange(of: state) { startBreathing() }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(accessibilityText)
    }

    private var breathScale: CGFloat {
        guard !reduceMotion, breathingStates.contains(state) else { return 1 }
        return breathe ? 1.02 : 1.0
    }

    private var breathingStates: Set<OnboardingCreatureState> { [.egg, .hatched, .disconnected] }

    private func startBreathing() {
        breathe = false
        guard !reduceMotion, breathingStates.contains(state) else { return }
        withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
            breathe = true
        }
    }

    private var accessibilityText: String {
        switch state {
        case .egg: return "Coiny's egg. Something is inside."
        case .eggAsleep: return "Coiny's egg, dark. It cannot see anything yet."
        case .hatching: return "The egg is hatching."
        case .hatched: return "Coiny, newly hatched."
        case .disconnected: return "Coiny's egg, waiting patiently for an account connection."
        }
    }

    // MARK: Placeholder drawing

    @ViewBuilder
    private var creature: some View {
        switch state {
        case .egg:
            EggShape(cracked: false, dimmed: false)
        case .eggAsleep, .disconnected:
            EggShape(cracked: false, dimmed: true)
        case .hatching:
            EggShape(cracked: true, dimmed: false)
        case .hatched:
            HatchlingShape()
        }
    }
}

// MARK: - Placeholder shapes

private struct EggShape: View {
    let cracked: Bool
    let dimmed: Bool

    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let height = geo.size.height
            ZStack {
                Ellipse()
                    .fill(CoinyTheme.surface.opacity(dimmed ? 0.55 : 1))
                Ellipse()
                    .stroke(CoinyTheme.ink.opacity(dimmed ? 0.5 : 1), lineWidth: 2)
                if cracked {
                    CrackLine()
                        .stroke(CoinyTheme.ink, lineWidth: 2)
                        .frame(width: width * 0.7, height: height * 0.22)
                        .offset(y: -height * 0.1)
                }
                // Two speckles so the egg reads as drawn, not generated.
                Circle()
                    .fill(CoinyTheme.ink.opacity(dimmed ? 0.25 : 0.4))
                    .frame(width: 4, height: 4)
                    .offset(x: -width * 0.18, y: height * 0.12)
                Circle()
                    .fill(CoinyTheme.ink.opacity(dimmed ? 0.25 : 0.4))
                    .frame(width: 3, height: 3)
                    .offset(x: width * 0.15, y: height * 0.22)
            }
        }
    }
}

private struct CrackLine: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let stepWidth = rect.width / 6
        path.move(to: CGPoint(x: rect.minX, y: rect.midY))
        for index in 1...6 {
            let x = rect.minX + stepWidth * CGFloat(index)
            let y = index.isMultiple(of: 2) ? rect.minY : rect.maxY
            path.addLine(to: CGPoint(x: x, y: y))
        }
        return path
    }
}

private struct HatchlingShape: View {
    var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let height = geo.size.height
            ZStack {
                RoundedRectangle(cornerRadius: width * 0.3)
                    .fill(CoinyTheme.surface)
                    .frame(height: height * 0.75)
                    .offset(y: height * 0.12)
                RoundedRectangle(cornerRadius: width * 0.3)
                    .stroke(CoinyTheme.ink, lineWidth: 2)
                    .frame(height: height * 0.75)
                    .offset(y: height * 0.12)
                // Eyes.
                Circle()
                    .fill(CoinyTheme.ink)
                    .frame(width: 6, height: 6)
                    .offset(x: -width * 0.15, y: height * 0.02)
                Circle()
                    .fill(CoinyTheme.ink)
                    .frame(width: 6, height: 6)
                    .offset(x: width * 0.15, y: height * 0.02)
                // A flat, slightly odd mouth.
                Rectangle()
                    .fill(CoinyTheme.ink)
                    .frame(width: width * 0.22, height: 2)
                    .offset(y: height * 0.18)
                // Shell fragment still on its head.
                CrackLine()
                    .stroke(CoinyTheme.ink, lineWidth: 2)
                    .frame(width: width * 0.4, height: height * 0.1)
                    .offset(y: -height * 0.28)
            }
        }
    }
}

#Preview("States") {
    VStack(spacing: 16) {
        OnboardingCreatureWindow(state: .egg, size: 120)
        OnboardingCreatureWindow(state: .hatching, size: 120)
        OnboardingCreatureWindow(state: .hatched, size: 120)
    }
    .padding()
    .background(CoinyTheme.screen)
}
