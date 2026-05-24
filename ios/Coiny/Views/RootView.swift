import SwiftUI

struct RootView: View {
    @State private var netWorthVM = NetWorthViewModel()

    var body: some View {
        TabView {
            PetView()
                .tabItem {
                    Label("Pet", systemImage: "face.smiling")
                }

            SpendingView()
                .tabItem {
                    Label("Activity", systemImage: "clock.arrow.circlepath")
                }

            NetWorthView()
                .environment(netWorthVM)
                .tabItem {
                    Label("Wealth", systemImage: "chart.pie.fill")
                }

            CryptoView()
                .tabItem {
                    Label("Crypto", systemImage: "bitcoinsign.circle")
                }

            SpinwheelView()
                .tabItem {
                    Label("Debt", systemImage: "banknote")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gear")
                }
        }
        .tint(.accentColor)
    }
}

#Preview {
    RootView()
        .environment(PetStore())
}
