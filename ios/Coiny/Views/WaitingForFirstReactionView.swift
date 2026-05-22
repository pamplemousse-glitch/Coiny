import SwiftUI

/// Shown in PetView when the reaction history is empty.
/// Educates the user on what will trigger Coiny's first reaction.
struct WaitingForFirstReactionView: View {
    @State private var pulse = false

    var body: some View {
        VStack(spacing: 24) {
            VStack(spacing: 8) {
                HStack(spacing: 10) {
                    Circle()
                        .fill(Color.green)
                        .frame(width: 10, height: 10)
                        .scaleEffect(pulse ? 1.4 : 1.0)
                        .animation(
                            .easeInOut(duration: 1.0).repeatForever(autoreverses: true),
                            value: pulse
                        )
                        .onAppear { pulse = true }

                    Text("Coiny is watching…")
                        .font(.title2.weight(.semibold))
                }

                Text("Your first reaction will fire when something happens with your bank account.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
            .padding(.horizontal)

            TabView {
                ForEach(coinyTips, id: \.title) { tip in
                    TipCard(
                        icon: tip.icon,
                        iconColor: tip.color,
                        title: tip.title,
                        body: tip.body
                    )
                    .padding(.horizontal)
                }
            }
            .tabViewStyle(.page)
            .indexViewStyle(.page(backgroundDisplayMode: .always))
            .frame(height: 220)
        }
        .padding(.vertical, 24)
    }
}

#Preview {
    WaitingForFirstReactionView()
        .padding()
}
