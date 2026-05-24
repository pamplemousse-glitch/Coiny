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

            CryptoView()
                .tabItem {
                    Label("Crypto", systemImage: "bitcoinsign.circle")
                }
                .accessibilityIdentifier("tab.crypto")

            SpinwheelView()
                .tabItem {
                    Label("Debt", systemImage: "banknote")
                }
                .accessibilityIdentifier("tab.debt")

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
                .accessibilityIdentifier("tab.settings")
        }
        .tint(.accentColor)
    }
}

#Preview {
    RootView()
        .environment(PetStore())
}
