import SwiftUI

struct RootView: View {
    var body: some View {
        TabView {
            PetView()
                .tabItem {
                    Label("Pet", systemImage: "face.smiling")
                }

            SpendingView()
                .tabItem {
                    Label("Spending", systemImage: "creditcard")
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
