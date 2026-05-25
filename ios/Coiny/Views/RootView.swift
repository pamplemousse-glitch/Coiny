import SwiftUI

struct RootView: View {
    @State private var netWorthVM = NetWorthViewModel()

    var body: some View {
        TabView {
            PetView()
                .tabItem {
                    Label("Pet", systemImage: "face.smiling")
                }
                .accessibilityIdentifier("tab.pet")

            SpendingView()
                .tabItem {
                    Label("Activity", systemImage: "clock.arrow.circlepath")
                }
                .accessibilityIdentifier("tab.activity")

            NetWorthView()
                .environment(netWorthVM)
                .tabItem {
                    Label("Wealth", systemImage: "chart.pie.fill")
                }
                .accessibilityIdentifier("tab.wealth")
        }
        .tint(.accentColor)
    }
}

#Preview {
    RootView()
        .environment(PetStore())
}
