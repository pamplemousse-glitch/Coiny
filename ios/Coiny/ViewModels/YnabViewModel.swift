import AuthenticationServices
import CryptoKit
import Foundation
import UIKit

protocol YnabViewModelAPI: Sendable {
    func ynabOAuthUrl(codeChallenge: String) async throws -> YnabOAuthUrlResponse
    func ynabOAuthCallback(code: String, codeVerifier: String) async throws
    func disconnectYnab() async throws
    func syncYnab() async throws -> YnabSyncResult
}

extension API: YnabViewModelAPI {}

@Observable @MainActor final class YnabViewModel {
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private(set) var lastTotal: Double?

    private let api: any YnabViewModelAPI
    private var pendingVerifier: String?
    private var authSession: ASWebAuthenticationSession?
    private let presentationProvider = AuthPresentationProvider()

    init(api: any YnabViewModelAPI = API.shared) {
        self.api = api
    }

    func startOAuth() async {
        isLoading = true
        errorMessage = nil
        do {
            let verifier = makeVerifier()
            let challenge = makeChallenge(verifier)
            pendingVerifier = verifier

            let response = try await api.ynabOAuthUrl(codeChallenge: challenge)
            guard let url = URL(string: response.url) else { throw URLError(.badURL) }

            let callback = try await withCheckedThrowingContinuation { (cont: CheckedContinuation<URL, Error>) in
                let session = ASWebAuthenticationSession(url: url, callbackURLScheme: "coiny") { cbURL, err in
                    if let err {
                        cont.resume(throwing: err)
                    } else if let cbURL {
                        cont.resume(returning: cbURL)
                    } else {
                        cont.resume(throwing: URLError(.cancelled))
                    }
                }
                session.presentationContextProvider = presentationProvider
                session.prefersEphemeralWebBrowserSession = false
                authSession = session
                session.start()
            }

            guard let components = URLComponents(url: callback, resolvingAgainstBaseURL: false),
                  let code = components.queryItems?.first(where: { $0.name == "code" })?.value,
                  let verifier = pendingVerifier else {
                throw URLError(.badServerResponse)
            }
            pendingVerifier = nil
            try await api.ynabOAuthCallback(code: code, codeVerifier: verifier)
        } catch {
            let asError = error as? ASWebAuthenticationSessionError
            if asError?.code != .canceledLogin {
                errorMessage = error.localizedDescription
            }
        }
        isLoading = false
    }

    func disconnect() async {
        isLoading = true
        errorMessage = nil
        do {
            try await api.disconnectYnab()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func sync() async {
        isLoading = true
        errorMessage = nil
        do {
            let result = try await api.syncYnab()
            lastTotal = result.total
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    private func makeVerifier() -> String {
        var bytes = [UInt8](repeating: 0, count: 32)
        _ = SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes)
        return Data(bytes).base64URLEncoded()
    }

    private func makeChallenge(_ verifier: String) -> String {
        Data(SHA256.hash(data: Data(verifier.utf8))).base64URLEncoded()
    }
}

private extension Data {
    func base64URLEncoded() -> String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}

private final class AuthPresentationProvider: NSObject, ASWebAuthenticationPresentationContextProviding {
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .first?.windows.first ?? UIWindow()
    }
}
