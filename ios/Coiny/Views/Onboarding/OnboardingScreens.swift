import SwiftUI

// Onboarding screens 1 to 3 (PRD section 5.2): the egg, the chip quiz, the
// sliders. Screens 4 to 8 live in `OnboardingConnectScreens.swift`; the flow
// container is `OnboardingView.swift`.

// MARK: - Shared style

/// The pet's voice. Departure Mono is the specified face (design-direction
/// section 4.1); the font file is not bundled yet, so the system monospaced
/// design stands in at the same 22pt reference size, Dynamic Type scaled.
struct PetSpeechText: View {
    let text: String
    @ScaledMetric(relativeTo: .title3) private var speechSize: CGFloat = 22

    var body: some View {
        Text(text)
            .font(.system(size: speechSize, weight: .medium, design: .monospaced))
            .foregroundStyle(CoinyTheme.ink)
            .multilineTextAlignment(.center)
            .fixedSize(horizontal: false, vertical: true)
    }
}

/// The one filled button style: signal fill, 10pt radius, 50pt tall
/// (design-direction section 4.4; 44pt minimum target met with margin).
struct OnboardingPrimaryButton: View {
    let title: String
    var isBusy = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Group {
                if isBusy {
                    ProgressView().tint(CoinyTheme.onSignal)
                } else {
                    Text(title)
                }
            }
            .frame(minHeight: 50)
        }
        .buttonStyle(.coinyFilled)
        .disabled(isBusy)
    }
}

/// S-5: "Not now" is plain text, always visible, never styled as a button.
/// Still a 44pt touch target underneath.
struct OnboardingNotNowLink: View {
    var title = "Not now"
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.body)
                .foregroundStyle(CoinyTheme.ink2)
                .frame(minWidth: 44, minHeight: 44)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Screen 1: the egg

struct OnboardingEggScreen: View {
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 32)
            OnboardingCreatureWindow(state: .egg)
            Spacer().frame(height: 32)
            VStack(spacing: 20) {
                PetSpeechText(text: "Something is in here.")
                PetSpeechText(text: "Coiny watches your money and reacts.")
            }
            .padding(.horizontal, 32)
            Spacer(minLength: 20)
            OnboardingPrimaryButton(title: "Continue", action: onContinue)
                .accessibilityIdentifier("onboarding.egg.continue")
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
        }
    }
}

// MARK: - Screen 2: what do you have

struct OnboardingDeclareScreen: View {
    @Bindable var viewModel: OnboardingViewModel
    let onContinue: () -> Void
    let onSkip: () -> Void

    private let columns = [GridItem(.adaptive(minimum: 150), spacing: 8)]

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 8) {
                Text("What do you have?")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(CoinyTheme.ink)
                Text("Tap everything that applies. No amounts yet.")
                    .font(.subheadline)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            .multilineTextAlignment(.center)
            .padding(.top, 32)
            .padding(.horizontal, 20)

            ScrollView {
                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(DeclaredAssetClass.allCases, id: \.self) { assetClass in
                        chip(for: assetClass)
                    }
                }
                .padding(20)
            }

            OnboardingPrimaryButton(title: "Continue", action: onContinue)
                .accessibilityIdentifier("onboarding.declare.continue")
                .padding(.horizontal, 20)
            OnboardingNotNowLink(action: onSkip)
                .accessibilityIdentifier("onboarding.declare.notnow")
                .padding(.bottom, 16)
        }
    }

    private func chip(for assetClass: DeclaredAssetClass) -> some View {
        let isSelected = viewModel.selectedClasses.contains(assetClass)
        return Button {
            if isSelected {
                viewModel.selectedClasses.remove(assetClass)
            } else {
                viewModel.selectedClasses.insert(assetClass)
            }
        } label: {
            Text(assetClass.label)
                .font(.body.weight(isSelected ? .semibold : .regular))
                .foregroundStyle(isSelected ? CoinyTheme.onSignal : CoinyTheme.ink)
                .frame(maxWidth: .infinity, minHeight: 44)
                .background(isSelected ? CoinyTheme.signalFill : CoinyTheme.surface)
                .clipShape(RoundedRectangle(cornerRadius: 4))
                .overlay(
                    RoundedRectangle(cornerRadius: 4)
                        .stroke(isSelected ? CoinyTheme.signalFill : CoinyTheme.rule, lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
        .accessibilityIdentifier("onboarding.chip.\(assetClass.rawValue)")
    }
}

// MARK: - Screen 3: roughly how much

struct OnboardingAmountsScreen: View {
    @Bindable var viewModel: OnboardingViewModel
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            VStack(spacing: 8) {
                Text("Roughly how much?")
                    .font(.title2.weight(.semibold))
                    .foregroundStyle(CoinyTheme.ink)
                Text("A rough slide is plenty. Skip anything you are not sure about.")
                    .font(.subheadline)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            .multilineTextAlignment(.center)
            .padding(.top, 32)
            .padding(.horizontal, 20)

            ScrollView {
                VStack(spacing: 4) {
                    ForEach(viewModel.sheet.assets, id: \.assetClass) { asset in
                        DeclaredAmountRow(
                            assetClass: asset.assetClass,
                            value: asset.bucketedValueUSD
                        ) { newValue in
                            viewModel.setDeclaredValue(newValue, for: asset.assetClass)
                        }
                    }
                }
                .padding(20)
            }

            OnboardingPrimaryButton(title: "Continue", action: onContinue)
                .accessibilityIdentifier("onboarding.amounts.continue")
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
        }
    }
}

/// One slider row. Starts "not set"; the value exists only once the slider has
/// been moved, so an untouched row stays honestly skipped rather than silently
/// declaring the midpoint.
private struct DeclaredAmountRow: View {
    let assetClass: DeclaredAssetClass
    let value: Double?
    let onValue: (Double?) -> Void

    @State private var position: Double = 0.5

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(alignment: .firstTextBaseline) {
                Text(assetClass.label)
                    .font(.body)
                    .foregroundStyle(CoinyTheme.ink)
                Spacer()
                Text(valueLabel)
                    .font(.body.weight(.medium).monospacedDigit())
                    .foregroundStyle(value == nil ? CoinyTheme.ink2 : CoinyTheme.ink)
            }
            HStack(spacing: 12) {
                Slider(value: $position, in: 0...1) { _ in
                    commit()
                }
                .onChange(of: position) { commit() }
                .tint(CoinyTheme.signal)
                .accessibilityLabel("\(assetClass.label) rough amount")
                .accessibilityValue(valueLabel)
                if value != nil {
                    Button("Skip") { onValue(nil) }
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                        .frame(minWidth: 44, minHeight: 44)
                        .buttonStyle(.plain)
                        .accessibilityLabel("Skip \(assetClass.label)")
                }
            }
        }
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            Rectangle().fill(CoinyTheme.rule).frame(height: 1)
        }
    }

    private var valueLabel: String {
        guard let value else { return "Skipped" }
        let amount = MoneyText.usd(value)
        return assetClass.isDebt ? "\(amount) owed" : amount
    }

    private func commit() {
        onValue(LogSlider.value(at: position, in: assetClass.sliderRangeUSD))
    }
}
