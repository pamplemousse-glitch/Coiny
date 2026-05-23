import SwiftUI

struct CryptoView: View {
    @State private var coinbaseVM = CoinbaseViewModel()
    @State private var zerionVM = ZerionViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    GroupBox {
                        CoinbaseView()
                    }
                    .padding(.horizontal)

                    GroupBox {
                        ZerionView()
                    }
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
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
