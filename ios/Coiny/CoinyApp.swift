import SwiftUI

@main
struct CoinyApp: App {
    @State private var petStore = PetStore()

    /// Persisted via UserDefaults — survives app relaunches.
    /// Set to true at the end of OnboardingView.
    @AppStorage("onboardingComplete") private var onboardingComplete: Bool = false

    var body: some Scene {
        WindowGroup {
            Group {
                if onboardingComplete {
                    RootView()
                        .environment(petStore)
                        .task {
                            await petStore.refresh()
                        }
                } else {
                    OnboardingView(onboardingComplete: $onboardingComplete)
                }
            }
            .animation(.easeInOut, value: onboardingComplete)
        }
    }
}
