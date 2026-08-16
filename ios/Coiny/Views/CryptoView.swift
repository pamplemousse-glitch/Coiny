import SwiftUI

struct CryptoView: View {
    @State private var coinbaseVM = CoinbaseViewModel()
    @State private var zerionVM = ZerionViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    CoinySection(title: "Coinbase") {
                        CoinbaseView()
                    }
                    CoinySection(title: "DeFi") {
                        ZerionView()
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 32)
            }
            .background(CoinyTheme.screen)
            .navigationTitle("Crypto")
        }
        .environment(coinbaseVM)
        .environment(zerionVM)
        .task {
            async let c: () = coinbaseVM.loadStatus()
            async let z: () = zerionVM.loadWallets()
            _ = await (c, z)
        }
    }
}

#Preview {
    CryptoView()
}
