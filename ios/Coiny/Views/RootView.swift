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
        // Resolves to Assets.xcassets/AccentColor, which is now CoinyTheme's
        // `signal` in both schemes: 5.74:1 on the light background and 8.6:1 on
        // the dark one. It used to fall back to system blue at 4.02:1, below AA
        // for the tab bar's own labels, because no asset catalog existed at all
        // (runbook G1.7).
        //
        // The reason this was deferred was real: the accent propagates down the
        // whole tab tree, and PaywallView's `.borderedProminent` button would
        // have painted itself amber and labelled it white, which is 2.15:1 in
        // dark mode. That button now sets `signalFill` and `onSignal`
        // explicitly instead of inheriting, which is what those tokens are for.
        //
        // One colour cannot be both light enough to read on a dark background
        // and dark enough for white text on top of it. The palette already
        // solves that by separating the tint token from the fill token; the
        // mistake would be to collapse them.
        // swiftlint:disable:next design_system_color
        .tint(.accentColor)
    }
}

#Preview {
    RootView()
        .environment(PetStore())
}
