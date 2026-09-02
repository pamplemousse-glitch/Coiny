import SwiftUI

/// The App Review demo-seed prompt (R-15.7, Apple 2.1, decision B9).
///
/// Reached only by tapping the Settings version row five times, which is an
/// affordance discoverable from the App Review notes and effectively
/// undiscoverable by accident. It is not hidden for security: the backend
/// requires a session and a shared code regardless, and the route 404s
/// entirely when no code is configured. It is hidden so that a real user never
/// stumbles into a button that replaces their balance sheet with fake data.
///
/// Lives in its own file rather than inside `SettingsView` because that file is
/// already 487 lines against SwiftLint's 700-line limit and, more pressingly,
/// its main struct body is near the 300-line body limit.
struct AppReviewSeedSheet: View {
    @Environment(\.dismiss) private var dismiss

    @State private var code = ""
    @State private var isSeeding = false
    @State private var errorMessage: String?
    @State private var didSucceed = false

    /// Called after a successful seed so the caller can refresh what is on
    /// screen. The reviewer should not have to work out that they need to pull
    /// to refresh before the app looks like anything.
    let onSeeded: () -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Text(
                        """
                        Enter the code from the App Review notes. This fills \
                        this account with demo data so the app can be reviewed \
                        without connecting a real bank.
                        """
                    )
                    .font(.footnote)
                    .foregroundStyle(CoinyTheme.ink2)
                }
                .listRowBackground(CoinyTheme.surface)

                Section {
                    SecureField("Review code", text: $code)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .accessibilityIdentifier("review.code")

                    if let errorMessage {
                        CoinyErrorLine(message: errorMessage)
                    }

                    if didSucceed {
                        Text("Demo data added.")
                            .font(.footnote)
                            .foregroundStyle(CoinyTheme.signal)
                    }
                }
                .listRowBackground(CoinyTheme.surface)

                Section {
                    Button {
                        Task { await seed() }
                    } label: {
                        if isSeeding {
                            // 6.1.13: a bare ProgressView announces "in
                            // progress" with no subject.
                            ProgressView().accessibilityLabel("Adding demo data")
                        } else {
                            Text("Add demo data")
                        }
                    }
                    .disabled(code.isEmpty || isSeeding)
                    .accessibilityIdentifier("review.submit")
                }
                .listRowBackground(CoinyTheme.surface)
            }
            .scrollContentBackground(.hidden)
            .background(CoinyTheme.screen)
            .navigationTitle("App Review")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }

    @MainActor
    private func seed() async {
        isSeeding = true
        errorMessage = nil
        defer { isSeeding = false }

        do {
            try await API.shared.seedReviewDemo(code: code)
            didSucceed = true
            onSeeded()
        } catch {
            // 3.6.3b: say what happened and what to do about it, rather than
            // surfacing a URLError description. The reviewer has one code and
            // one thing to check.
            errorMessage = "That code was not accepted. Check it against the App Review notes and try again."
        }
    }
}
