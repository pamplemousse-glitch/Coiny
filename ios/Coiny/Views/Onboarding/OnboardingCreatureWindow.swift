import SwiftUI

// Onboarding's creature, expressed in the app's terms.
//
// This file used to hold a second Window and a second creature: a 3pt bezel
// inset against `CoinyWindow`'s 0.5, and a `HatchlingShape` (rounded rect, two
// circle eyes, flat mouth) that looked nothing like the `CreaturePainter` form
// on the very next screen. The user watched one creature hatch and met a
// different one. It is now a mapping and nothing else, so there is one Window
// (3.11.3) and one creature (3.11.4), and commissioned art still lands in one
// place, `CreaturePlaceholderArt.swift`.

// MARK: - States

/// The five moments onboarding shows the creature at. Onboarding has no pet
/// record yet, so it names moments; `CoinyWindow` takes the condition and stage
/// those moments correspond to.
enum OnboardingCreatureState: Equatable {
    /// Screen 1: the egg, lit.
    case egg
    /// Screen 5: the egg, dark, cannot see anything yet.
    case eggAsleep
    /// The hatch moment.
    case hatching
    /// Post-hatch creature.
    case hatched
    /// Hatched, but no account connected: present, patient, never distressed.
    case disconnected

    /// Stage 0 is the shell; anything hatched is stage 1, the same first stage
    /// Home will show until the ladder moves.
    var stage: Int {
        switch self {
        case .egg, .eggAsleep, .hatching: return 0
        case .hatched, .disconnected: return 1
        }
    }

    var condition: CreatureCondition {
        switch self {
        case .egg, .hatching, .hatched: return .idle
        case .eggAsleep: return .sleeping
        case .disconnected: return .disconnected
        }
    }

    var isHatching: Bool { self == .hatching }

    var accessibilityText: String {
        switch self {
        case .egg: return "Coiny's egg. Something is inside."
        case .eggAsleep: return "Coiny's egg, dark. It cannot see anything yet."
        case .hatching: return "The egg is hatching."
        case .hatched: return "Coiny, newly hatched."
        case .disconnected: return "Coiny, waiting patiently for an account connection."
        }
    }
}

// MARK: - Window

struct OnboardingCreatureWindow: View {
    let state: OnboardingCreatureState

    var body: some View {
        CoinyWindow(
            size: .full,
            condition: state.condition,
            stage: state.stage,
            hatching: state.isHatching,
            accessibilityLabel: state.accessibilityText
        )
    }
}

#Preview("States") {
    VStack(spacing: 16) {
        OnboardingCreatureWindow(state: .egg)
        OnboardingCreatureWindow(state: .hatching)
        OnboardingCreatureWindow(state: .hatched)
    }
    .padding()
    .background(CoinyTheme.screen)
}
