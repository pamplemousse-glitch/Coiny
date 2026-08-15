import SwiftUI

struct RootView: View {
    /// Tabs are explicitly selected rather than implicit, because Home needs to
    /// know when it stops being the visible tab. `onDisappear` does not fire
    /// reliably for a TabView child (SwiftUI keeps the content alive), so the
    /// R-4.1a rule that a tab switch returns Home to collapsed cannot be built
    /// on it.
    enum Tab: Hashable {
        case home, activity, wealth
    }

    @State private var netWorthVM = NetWorthViewModel()
    @State private var selectedTab: Tab = .home

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView(isVisible: selectedTab == .home)
                .tag(Tab.home)
                .tabItem {
                    Label("Home", systemImage: "house")
                }
                .accessibilityIdentifier("tab.home")

            SpendingView()
                .tag(Tab.activity)
                .tabItem {
                    Label("Activity", systemImage: "clock.arrow.circlepath")
                }
                .accessibilityIdentifier("tab.activity")

            NetWorthView()
                .environment(netWorthVM)
                .tag(Tab.wealth)
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
