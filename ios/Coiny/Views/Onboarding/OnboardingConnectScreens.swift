import SwiftUI
import UserNotifications

// Onboarding screens 4 to 8 (PRD section 5.2): the number, the connection
// ask, the subscription reveal, the hatch, and the notification pre-frame,
// plus the offline screen the section 8.3 matrix requires.

// MARK: - Screen 4: the number

struct OnboardingNumberScreen: View {
    let sheet: DeclarationSheet
    let onContinue: () -> Void

    @ScaledMetric(relativeTo: .largeTitle) private var displaySize: CGFloat = 44

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 32)
            if let total = sheet.estimatedNetWorthUSD {
                // Absolute values render in ink regardless of sign
                // (design-direction section 4.3 rule 1).
                Text(MoneyText.usd(total))
                    .font(.system(size: displaySize, weight: .semibold).monospacedDigit())
                    .foregroundStyle(CoinyTheme.ink)
                    .minimumScaleFactor(0.5)
                    .lineLimit(1)
                    .padding(.horizontal, 20)
                    .accessibilityLabel("Estimated net worth \(MoneyText.usd(total))")
                    .accessibilityIdentifier("onboarding.number.total")
            }
            Text("This is an estimate. Let's make it real.")
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
                .padding(.top, 8)

            ScrollView {
                VStack(spacing: 4) {
                    ForEach(sheet.valuedAssets, id: \.assetClass) { asset in
                        line(for: asset)
                    }
                }
                .padding(20)
            }
            .frame(maxHeight: 320)

            Spacer(minLength: 12)
            OnboardingPrimaryButton(title: "Continue", action: onContinue)
                .accessibilityIdentifier("onboarding.number.continue")
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
        }
    }

    private func line(for asset: DeclaredAsset) -> some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(asset.assetClass.label)
                    .font(.body)
                    .foregroundStyle(CoinyTheme.ink)
                Text("Self-reported today")
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            Spacer()
            Text(lineValue(for: asset))
                .font(.body.weight(.medium).monospacedDigit())
                .foregroundStyle(CoinyTheme.ink)
        }
        .padding(.vertical, 8)
        .overlay(alignment: .bottom) {
            Rectangle().fill(CoinyTheme.rule).frame(height: 1)
        }
        .accessibilityElement(children: .combine)
    }

    private func lineValue(for asset: DeclaredAsset) -> String {
        guard let value = asset.bucketedValueUSD else { return "" }
        // Debt is never red (design-direction section 4.3 rule 5): ink with a
        // leading minus sign carries the meaning without the alarm.
        return asset.assetClass.isDebt ? "-\(MoneyText.usd(value))" : MoneyText.usd(value)
    }
}

// MARK: - Screen 5: one connection

struct OnboardingConnectScreen: View {
    let isBusy: Bool
    let errorMessage: String?
    let onConnect: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 32)
            OnboardingCreatureWindow(state: .eggAsleep)
            Spacer().frame(height: 32)
            PetSpeechText(text: "It cannot see anything yet. Connect an account and it wakes up.")
                .padding(.horizontal, 32)
            VStack(spacing: 8) {
                Text("Connect the account you actually spend from. It is the only one needed to start.")
                Text("Plaid holds the credentials. We never see them.")
            }
            .font(.subheadline)
            .foregroundStyle(CoinyTheme.ink2)
            .multilineTextAlignment(.center)
            .padding(.top, 20)
            .padding(.horizontal, 32)

            if let errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.signal)
                    .multilineTextAlignment(.center)
                    .padding(.top, 12)
                    .padding(.horizontal, 32)
            }

            Spacer(minLength: 20)
            OnboardingPrimaryButton(title: "Connect an account", isBusy: isBusy, action: onConnect)
                .accessibilityIdentifier("onboarding.connect.plaid")
                .padding(.horizontal, 20)
            OnboardingNotNowLink(action: onSkip)
                .accessibilityIdentifier("onboarding.connect.notnow")
                .padding(.bottom, 16)
        }
    }
}

// MARK: - Offline (section 8.3 onboarding row)

struct OnboardingOfflineScreen: View {
    let onRetry: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Spacer()
            Text("No connection")
                .font(.title2.weight(.semibold))
                .foregroundStyle(CoinyTheme.ink)
            Text("Connecting an account needs the network. Your sign-in is saved; nothing is lost.")
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
                .multilineTextAlignment(.center)
                .padding(.top, 8)
                .padding(.horizontal, 32)
            Spacer()
            OnboardingPrimaryButton(title: "Try again", action: onRetry)
                .accessibilityIdentifier("onboarding.offline.retry")
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
        }
    }
}

// MARK: - Screen 6: found money

struct OnboardingRevealScreen: View {
    let items: [RevealItem]
    let annualTotalUSD: Double
    let onContinue: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            PetSpeechText(text: RevealBuilder.headline(count: items.count, annualTotalUSD: annualTotalUSD))
                .padding(.top, 32)
                .padding(.horizontal, 28)

            ScrollView {
                VStack(spacing: 4) {
                    ForEach(items) { item in
                        row(for: item)
                    }
                }
                .padding(20)
            }

            OnboardingPrimaryButton(title: "Got it", action: onContinue)
                .accessibilityIdentifier("onboarding.reveal.continue")
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
        }
    }

    private func row(for item: RevealItem) -> some View {
        HStack(alignment: .firstTextBaseline) {
            VStack(alignment: .leading, spacing: 2) {
                Text(item.merchantName)
                    .font(.body)
                    .foregroundStyle(CoinyTheme.ink)
                Text(item.cadenceLabel)
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            Spacer()
            VStack(alignment: .trailing, spacing: 2) {
                Text(MoneyText.usdExact(item.amountUSD))
                    .font(.body.weight(.medium).monospacedDigit())
                    .foregroundStyle(CoinyTheme.ink)
                Text("\(MoneyText.usd(item.annualisedUSD)) a year")
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
            }
        }
        .padding(.vertical, 8)
        .frame(minHeight: 44)
        .overlay(alignment: .bottom) {
            Rectangle().fill(CoinyTheme.rule).frame(height: 1)
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Screen 7: the hatch

struct OnboardingHatchScreen: View {
    let isDisconnected: Bool
    let greeting: String
    let instruction: String
    let onConnect: () -> Void
    let onContinue: () -> Void

    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var hatchFinished = false

    private var creatureState: OnboardingCreatureState {
        if isDisconnected { return .disconnected }
        return hatchFinished ? .hatched : .hatching
    }

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 32)
            OnboardingCreatureWindow(state: creatureState)
            Spacer().frame(height: 32)
            VStack(spacing: 20) {
                PetSpeechText(text: greeting)
                PetSpeechText(text: instruction)
            }
            .padding(.horizontal, 28)
            Spacer(minLength: 20)
            if isDisconnected {
                // Never a dead end: the connect affordance persists (R-8.8).
                OnboardingPrimaryButton(title: "Connect an account", action: onConnect)
                    .accessibilityIdentifier("onboarding.hatch.connect")
                    .padding(.horizontal, 20)
                OnboardingNotNowLink(title: "Continue without connecting", action: onContinue)
                    .accessibilityIdentifier("onboarding.hatch.continue")
                    .padding(.bottom, 16)
            } else {
                OnboardingPrimaryButton(title: "Meet them", action: onContinue)
                    .accessibilityIdentifier("onboarding.hatch.continue")
                    .padding(.horizontal, 20)
                    .padding(.bottom, 32)
            }
        }
        .task {
            guard !isDisconnected, !hatchFinished else { return }
            if reduceMotion {
                // Reduce Motion: instant swap, the information survives.
                hatchFinished = true
            } else {
                try? await Task.sleep(for: .milliseconds(900))
                withAnimation(.easeOut(duration: 0.3)) { hatchFinished = true }
            }
        }
    }
}

// MARK: - Screen 8: notifications

struct OnboardingNotificationsScreen: View {
    let onResolved: (Bool) -> Void
    let onSkip: () -> Void

    @State private var isRequesting = false

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 32)
            PetSpeechText(text: "I will message you at most twice a week. Never at night. Never about the market.")
                .padding(.horizontal, 28)
            Spacer(minLength: 20)
            OnboardingPrimaryButton(title: "Turn on notifications", isBusy: isRequesting) {
                requestPermission()
            }
            .accessibilityIdentifier("onboarding.notifications.allow")
            .padding(.horizontal, 20)
            OnboardingNotNowLink(action: onSkip)
                .accessibilityIdentifier("onboarding.notifications.notnow")
                .padding(.bottom, 16)
        }
    }

    private func requestPermission() {
        isRequesting = true
        Task { @MainActor in
            defer { isRequesting = false }
            let center = UNUserNotificationCenter.current()
            let granted = (try? await center.requestAuthorization(options: [.alert, .sound, .badge])) ?? false
            if granted {
                UIApplication.shared.registerForRemoteNotifications()
            }
            onResolved(granted)
        }
    }
}
