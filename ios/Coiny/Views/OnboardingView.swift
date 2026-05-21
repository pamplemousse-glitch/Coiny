import SwiftUI

/// Three-screen onboarding flow:
/// 1. Welcome — introduce Coiny
/// 2. Link Bank — explain the Plaid connection
/// 3. Meet Pet — celebrate completion + segue to RootView
struct OnboardingView: View {
    @Binding var onboardingComplete: Bool

    @State private var step: OnboardingStep = .welcome

    var body: some View {
        TabView(selection: $step) {
            WelcomePage(onNext: { step = .linkBank })
                .tag(OnboardingStep.welcome)

            LinkBankPage(
                onNext: { step = .meetPet },
                onSkip: { onboardingComplete = true }
            )
            .tag(OnboardingStep.linkBank)

            MeetPetPage(onFinish: { onboardingComplete = true })
                .tag(OnboardingStep.meetPet)
        }
        .tabViewStyle(.page(indexDisplayMode: .always))
        .indexViewStyle(.page(backgroundDisplayMode: .always))
        .background(Color(.systemGroupedBackground))
    }
}

private enum OnboardingStep: Hashable {
    case welcome
    case linkBank
    case meetPet
}

// MARK: - Pages

private struct WelcomePage: View {
    let onNext: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "face.smiling.inverse")
                .resizable()
                .scaledToFit()
                .frame(width: 140, height: 140)
                .foregroundStyle(.purple, .pink)

            VStack(spacing: 8) {
                Text("Meet Coiny")
                    .font(.largeTitle.bold())
                Text("Your pocket-sized financial companion")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            Button(action: onNext) {
                Text("Get started")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal)
            .padding(.bottom, 60)
        }
        .padding(.horizontal)
    }
}

private struct LinkBankPage: View {
    let onNext: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "building.columns.fill")
                .resizable()
                .scaledToFit()
                .frame(width: 120, height: 120)
                .foregroundStyle(.blue)

            VStack(spacing: 12) {
                Text("Link your bank")
                    .font(.largeTitle.bold())
                Text("Coiny reacts to your spending in real time. We use bank-grade encryption through Plaid — your credentials never touch our servers.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal)

            Spacer()

            VStack(spacing: 12) {
                // TODO: launch Plaid Link iOS SDK — wired in a follow-up PR.
                Button(action: onNext) {
                    Label("Link with Plaid", systemImage: "link")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)

                Button("Skip for now", action: onSkip)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)
            .padding(.bottom, 60)
        }
    }
}

private struct MeetPetPage: View {
    let onFinish: () -> Void

    @State private var bounce: Bool = false

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Image(systemName: "face.smiling.inverse")
                .resizable()
                .scaledToFit()
                .frame(width: 180, height: 180)
                .foregroundStyle(.purple, .pink)
                .scaleEffect(bounce ? 1.05 : 1.0)
                .animation(.easeInOut(duration: 1.2).repeatForever(), value: bounce)
                .onAppear { bounce = true }

            VStack(spacing: 8) {
                Text("Say hello to your Coiny")
                    .font(.largeTitle.bold())
                Text("Reactions will appear here when your bank starts sending updates.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal)

            Spacer()

            Button(action: onFinish) {
                Text("Let's go")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)
            .padding(.horizontal)
            .padding(.bottom, 60)
        }
    }
}

#Preview {
    @Previewable @State var done = false
    OnboardingView(onboardingComplete: $done)
}
