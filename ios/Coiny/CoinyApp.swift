import SwiftUI

@main
struct CoinyApp: App {
    @State private var petStore = PetStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(petStore)
                .task {
                    await petStore.refresh()
                }
        }
    }
}
