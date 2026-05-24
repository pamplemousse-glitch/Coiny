import SwiftUI

struct SettingsView: View {
    @Environment(PetStore.self) private var store
    @AppStorage("onboardingComplete") private var onboardingComplete: Bool = false
    @AppStorage("bankLinked") private var bankLinked: Bool = false
    @State private var showDeleteAlert = false
    @State private var isUnlinkingBank = false

    var body: some View {
        NavigationStack {
            Form {
                Section("Bank account") {
                    if bankLinked {
                        LabeledContent("Status") {
                            Label("Linked", systemImage: "checkmark.circle.fill")
                                .foregroundStyle(.green)
                        }
                        Button(isUnlinkingBank ? "Unlinking…" : "Unlink bank", role: .destructive) {
                            Task {
                                isUnlinkingBank = true
                                _ = try? await API.shared.unlinkBank()
                                bankLinked = false
                                onboardingComplete = false
                                isUnlinkingBank = false
                            }
                        }
                        .disabled(isUnlinkingBank)
                    } else {
                        LabeledContent("Status") {
                            Text("Not linked")
                                .foregroundStyle(.secondary)
                        }
                    }
                }

                if let goals = store.pet?.goals {
                    Section("Current goals") {
                        LabeledContent("Savings target") {
                            Text("$\(goals.savingsGoal)")
                                .monospacedDigit()
                        }
                        LabeledContent("Min paycheck") {
                            Text("$\(goals.paycheckMinAmount)")
                                .monospacedDigit()
                        }
                        LabeledContent("Large purchase") {
                            Text("$\(goals.largePurchaseThreshold)")
                                .monospacedDigit()
                        }
                    }

                    Section("Weekly budgets") {
                        ForEach(goals.weeklyBudgetByCategory.sorted(by: { $0.key < $1.key }),
                                id: \.key) { category, amount in
                            LabeledContent(category.capitalized) {
                                Text("$\(Int(amount))")
                                    .monospacedDigit()
                            }
                        }
                    }
                }

                Section("About") {
                    LabeledContent("Backend") {
                        Text("coiny-backend.fly.dev")
                            .font(.caption.monospaced())
                    }
                    LabeledContent("Version") {
                        Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.1.0")
                            .font(.caption.monospaced())
                    }
                }

                Section("Account") {
                    Button("Sign out", role: .destructive) {
                        NotificationCenter.default.post(name: .coinySignedOut, object: nil)
                    }
                    Button("Delete account", role: .destructive) {
                        showDeleteAlert = true
                    }
                }
                .alert("Delete Account?", isPresented: $showDeleteAlert) {
                    Button("Delete", role: .destructive) {
                        Task {
                            _ = try? await API.shared.deleteAccount()
                            NotificationCenter.default.post(name: .coinySignedOut, object: nil)
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("This permanently deletes your Coiny account and all data. This cannot be undone.")
                }

                Section("Debug") {
                    Button("Reset onboarding", role: .destructive) {
                        onboardingComplete = false
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    SettingsView()
        .environment(PetStore())
}
