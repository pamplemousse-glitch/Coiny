import AuthenticationServices
import SwiftUI

struct SignInView: View {
    /// Called after a successful sign-in. Receives the display name if Apple
    /// provided one (first sign-in only); empty string on repeat logins.
    let onSignedIn: (String) -> Void

    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            // Decorative, and on borrowed time: this glyph and its gradient are
            // tells 1 and 2 (craft rows 3.1.1 and 3.1.2) and the sign-in
            // rebuild on fix/consent-and-legal-surface deletes both. Hidden
            // from accessibility now regardless, because the audit reported
            // "face.smiling.inverse" as a label, which is what VoiceOver would
            // have read aloud on the first screen of the app.
            Image(systemName: "face.smiling.inverse")
                .resizable()
                .scaledToFit()
                .frame(width: 120, height: 120)
                .foregroundStyle(.purple, .pink)
                .accessibilityHidden(true)

            VStack(spacing: 8) {
                Text("Coiny")
                    .font(.largeTitle.bold())
                // `.secondary` is the system grey, which the audit measured
                // below AA here. The string itself is craft row 3.1.9 and goes
                // away with the sign-in rebuild; the colour should not wait.
                Text("Your pocket-sized financial companion")
                    .font(.subheadline)
                    .foregroundStyle(CoinyTheme.ink2)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            VStack(spacing: 16) {
                if let errorMessage {
                    CoinyErrorLine(message: errorMessage)
                        .padding(.horizontal)
                }

                if isLoading {
                    ProgressView()
                        .frame(height: 50)
                } else {
                    SignInWithAppleButton(.signIn) { request in
                        request.requestedScopes = [.fullName, .email]
                    } onCompletion: { result in
                        Task { @MainActor in await handle(result) }
                    }
                    .signInWithAppleButtonStyle(.black)
                    .frame(height: 50)

                    #if DEBUG
                    Button("Debug: Skip Sign In") {
                        Task { @MainActor in
                            try? await API.shared.injectDebugSession()
                            onSignedIn("")
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.signal)
                    // 44pt even in DEBUG: the audit that found this at 14pt
                    // does not know the difference, and neither does a thumb.
                    // contentShape is what actually moves the hit region; the
                    // frame alone only moves the layout around the label.
                    .frame(minHeight: 44)
                    .contentShape(Rectangle())
                    .padding(.top, 4)
                    #endif
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 60)
        }
        .padding(.horizontal)
    }

    @MainActor
    private func handle(_ result: Result<ASAuthorization, Error>) async {
        switch result {
        case .success(let auth):
            guard
                let credential = auth.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let identityToken = String(data: tokenData, encoding: .utf8)
            else {
                errorMessage = "Sign in failed — missing credentials"
                return
            }

            isLoading = true
            errorMessage = nil
            defer { isLoading = false }

            // fullName is only populated on first sign-in; nil on repeat logins.
            let displayName: String? = {
                guard let name = credential.fullName else { return nil }
                let components = [name.givenName, name.familyName].compactMap { $0 }
                return components.isEmpty ? nil : components.joined(separator: " ")
            }()

            do {
                try await API.shared.signInWithApple(
                    identityToken: identityToken,
                    userId: credential.user,
                    email: credential.email,
                    displayName: displayName
                )
                onSignedIn(displayName ?? "")
            } catch {
                errorMessage = error.localizedDescription
            }

        case .failure(let error):
            let asError = error as? ASAuthorizationError
            if asError?.code != .canceled {
                errorMessage = error.localizedDescription
            }
        }
    }
}

#Preview {
    SignInView(onSignedIn: { _ in })
}
