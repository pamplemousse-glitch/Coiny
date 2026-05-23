import AuthenticationServices
import SwiftUI

struct SignInView: View {
    let onSignedIn: () -> Void

    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        VStack(spacing: 32) {
            Spacer()

            Image(systemName: "face.smiling.inverse")
                .resizable()
                .scaledToFit()
                .frame(width: 120, height: 120)
                .foregroundStyle(.purple, .pink)

            VStack(spacing: 8) {
                Text("Coiny")
                    .font(.largeTitle.bold())
                Text("Your pocket-sized financial companion")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Spacer()

            VStack(spacing: 16) {
                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
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
                            onSignedIn()
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.orange)
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

            do {
                try await API.shared.signInWithApple(
                    identityToken: identityToken,
                    userId: credential.user,
                    email: credential.email
                )
                onSignedIn()
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
    SignInView(onSignedIn: {})
}
