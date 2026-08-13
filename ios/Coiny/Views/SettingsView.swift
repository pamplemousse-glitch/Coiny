import SwiftUI

struct SettingsView: View {
    @Environment(PetStore.self) private var store
    @AppStorage("onboardingComplete") private var onboardingComplete: Bool = false
    @AppStorage("bankLinked") private var bankLinked: Bool = false
    @State private var showDeleteAlert = false
    @State private var deleteFailed = false
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
                            // Sign out only when the server confirms deletion. Swallowing the
                            // error and signing out anyway told the user "this permanently
                            // deletes your account and all data" while the data survived, which
                            // is both false and an App Review 5.1.1(v) defect.
                            do {
                                _ = try await API.shared.deleteAccount()
                                NotificationCenter.default.post(name: .coinySignedOut, object: nil)
                            } catch {
                                deleteFailed = true
                            }
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("This permanently deletes your Coiny account and all data. This cannot be undone.")
                }
                .alert("Could not delete account", isPresented: $deleteFailed) {
                    Button("OK", role: .cancel) {}
                } message: {
                    Text("Your account was not deleted and you are still signed in. Check your connection and try again.")
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
