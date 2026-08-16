import AuthenticationServices
import SwiftUI

/// Screen 0 (PRD section 5.2). The only screen every user passes, which is why
/// two separate obligations land on it: it carries the consent line
/// `docs/legal/consent-copy.md:18-28` specifies, and the acknowledgement it
/// records is the Reg P 1016.9(b)(1)(iii) delivery of the privacy notice.
///
/// Rebuilt against design-direction section 4. What was here before was three
/// of the named tells from section 3.1 on the first screen a user and an App
/// Review reviewer ever see: a purple-to-pink `face.smiling.inverse` glyph
/// standing in for the creature (tells 1 and 2) under "Your pocket-sized
/// financial companion" (tell 9).
struct SignInView: View {
    /// Called after a successful sign-in. Receives the display name if Apple
    /// provided one (first sign-in only); empty string on repeat logins.
    let onSignedIn: (String) -> Void

    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var presentedDocument: LegalDocument?

    /// Line one of `docs/legal/consent-copy.md:20`, verbatim, with both terms
    /// as links. The `coiny://legal/...` scheme is intercepted below and opens
    /// the bundled document; nothing leaves the app.
    private static let consentLine: LocalizedStringKey = """
        By continuing you agree to the \
        [Terms of Service](coiny://legal/terms-of-service) and \
        [Privacy Policy](coiny://legal/privacy-policy).
        """

    /// Line two of `docs/legal/consent-copy.md:21-22`, verbatim.
    private static let usageDisclosure: LocalizedStringKey = """
        Coiny records how you use the app, never amounts or merchant names, \
        to fix what does not work. Turn this off any time in Settings.
        """

    var body: some View {
        VStack(spacing: 0) {
            Spacer(minLength: 32)

            // The creature, drawn by the one placeholder that exists. No
            // commissioned art yet (design-direction section 5); the egg is
            // what it looks like before there is anything to react to.
            CoinyWindow(size: .full, condition: .idle, stage: 0)
                .accessibilityHidden(true)

            Spacer().frame(height: 32)

            VStack(spacing: 8) {
                Text("Coiny")
                    .font(.largeTitle.weight(.semibold))
                    .foregroundStyle(CoinyTheme.ink)
                Text("Everything you own and everything you owe, in one number.")
                    .font(.body)
                    .foregroundStyle(CoinyTheme.ink2)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.horizontal, 32)

            Spacer(minLength: 20)

            VStack(spacing: 12) {
                if let errorMessage {
                    Text(errorMessage)
                        .font(.callout)
                        .foregroundStyle(CoinyTheme.ink)
                        .multilineTextAlignment(.center)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isStaticText)
                }

                signInControl

                consentBlock
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 32)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(CoinyTheme.screen)
        .sheet(item: $presentedDocument) { document in
            LegalDocumentView(document: document)
        }
    }

    @ViewBuilder
    private var signInControl: some View {
        if isLoading {
            // 6.1.13: a bare ProgressView announces "in progress" with no
            // subject. Say what is in progress.
            ProgressView()
                .frame(height: 50)
                .accessibilityLabel("Signing in")
        } else {
            SignInWithAppleButton(.signIn) { request in
                request.requestedScopes = [.fullName, .email]
            } onCompletion: { result in
                Task { @MainActor in await handle(result) }
            }
            .signInWithAppleButtonStyle(.black)
            .frame(height: 50)
            .accessibilityIdentifier("signin.apple")

            #if DEBUG
            Button("Debug: Skip Sign In") {
                Task { @MainActor in
                    try? await API.shared.injectDebugSession()
                    // The consent line is on screen above this button, so the
                    // disclosure was delivered on this path too.
                    TelemetryConsent.recordAcknowledgement()
                    onSignedIn("")
                }
            }
            .font(.footnote)
            .foregroundStyle(CoinyTheme.signal)
            .frame(minHeight: 44)
            #endif
        }
    }

    /// The consent line, verbatim from `docs/legal/consent-copy.md:20-22`, with
    /// both documents tappable. Signing in is the consent; there is no separate
    /// checkbox, which is the disclosure-plus-action shape that file settled on.
    private var consentBlock: some View {
        VStack(spacing: 8) {
            // One Text with inline links rather than a row of buttons: the
            // sentence has to wrap at the largest Dynamic Type size, and a
            // laid-out row of Text and Button fragments does not. It also gives
            // VoiceOver two real links inside a readable sentence.
            Text(Self.consentLine)
                .tint(CoinyTheme.signal)
            Text(Self.usageDisclosure)
        }
        .font(.footnote)
        .foregroundStyle(CoinyTheme.ink2)
        .multilineTextAlignment(.center)
        .fixedSize(horizontal: false, vertical: true)
        .padding(.horizontal, 4)
        // Both documents are in the bundle, so the links open the in-app
        // reader rather than leaving the app. When LegalDocument.hostedURL is
        // filled in, LegalDocumentView is what follows it.
        .environment(\.openURL, OpenURLAction { url in
            guard let document = Self.legalDocument(for: url) else { return .systemAction }
            presentedDocument = document
            return .handled
        })
    }

    private static func legalDocument(for url: URL) -> LegalDocument? {
        guard url.scheme == "coiny", url.host == "legal" else { return nil }
        return LegalDocument(rawValue: String(url.path.dropFirst()))
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
                errorMessage = "Sign in did not complete. Apple did not return the credentials Coiny needs. Try again."
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

            // Apple hands this over on every sign-in and it is the only way the
            // server can ever obtain a token that revokes the grant at deletion
            // time (TN3194). It is single-use, expires in five minutes, and is
            // spent immediately by the sign-in call. Optional on the wire: an
            // absent code costs a cleaner deletion later, never this sign-in.
            let authorizationCode = credential.authorizationCode
                .flatMap { String(data: $0, encoding: .utf8) }

            do {
                try await API.shared.signInWithApple(
                    identityToken: identityToken,
                    userId: credential.user,
                    email: credential.email,
                    displayName: displayName,
                    authorizationCode: authorizationCode
                )
            } catch {
                // 3.6.3b: the raw URLError text is not an instruction. Say what
                // happened and what to do about it.
                errorMessage = "Could not sign in. Check your connection and try again."
                return
            }

            do {
                // The acknowledgement is a necessary step to obtaining the
                // service, not a background nicety, so a failure to record it
                // is a failed sign-in. The session is discarded rather than
                // left behind as a half-signed-in state.
                try await API.shared.acknowledgeLegal(version: LegalDocument.version)
            } catch {
                await API.shared.signOut()
                errorMessage = "Could not finish signing in. Check your connection and try again."
                return
            }

            TelemetryConsent.recordAcknowledgement()
            onSignedIn(displayName ?? "")

        case .failure(let error):
            let asError = error as? ASAuthorizationError
            if asError?.code != .canceled {
                errorMessage = "Sign in with Apple did not complete. Try again."
            }
        }
    }
}

#Preview {
    SignInView(onSignedIn: { _ in })
}
