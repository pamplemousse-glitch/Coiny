import SwiftUI

/// A single education tip card shown in the onboarding carousel and the
/// waiting-for-first-reaction empty state.
struct TipCard: View {
    let icon: String
    let iconColor: Color
    let title: String
    let description: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .resizable()
                .scaledToFit()
                .frame(width: 56, height: 56)
                .foregroundStyle(iconColor)

            Text(title)
                .font(.headline)
                .multilineTextAlignment(.center)

            Text(description)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(20)
        .frame(maxWidth: .infinity)
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
    }
}

struct Tip {
    let icon: String
    let color: Color
    let title: String
    let description: String
}

/// The four education tips shown consistently across onboarding and the empty state.
let coinyTips: [Tip] = [
    Tip(
        icon: "dollarsign.circle.fill",
        color: .green,
        title: "Paychecks make Coiny celebrate",
        description: "Big deposits trigger a full celebration with lights and sound."
    ),
    Tip(
        icon: "cart.fill",
        color: .orange,
        title: "Overspending triggers concern",
        description: "Go over your weekly budget in groceries or dining and Coiny will notice."
    ),
    Tip(
        icon: "target",
        color: .blue,
        title: "Hit your savings goal",
        description: "Reach 25%, 50%, or 100% of your savings target for a milestone reaction."
    ),
    Tip(
        icon: "creditcard.fill",
        color: .red,
        title: "Large purchases get attention",
        description: "Transactions over your threshold make Coiny look twice."
    ),
]
