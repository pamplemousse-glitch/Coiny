import Foundation

protocol DiscogsViewModelAPI: Sendable {
    func getDiscogsStatus() async throws -> DiscogsStatus
    func requestDiscogsToken() async throws -> DiscogsRequestToken
    func verifyDiscogsToken(oauthToken: String, oauthVerifier: String) async throws
    func syncDiscogs() async throws
    func disconnectDiscogs() async throws
}

extension API: DiscogsViewModelAPI {}

@Observable @MainActor final class DiscogsViewModel {
    private(set) var isConnected = false
    private(set) var username: String?
    private(set) var lastCollectionUsd: Double?
    private(set) var isLoading = false
    private(set) var pendingOauthToken: String?
    private(set) var authorizeUrl: String?
    private(set) var errorMessage: String?

    private let api: any DiscogsViewModelAPI

    init(api: any DiscogsViewModelAPI = API.shared) {
        self.api = api
    }

    func loadStatus() async {
        isLoading = true
        do {
            let status = try await api.getDiscogsStatus()
            isConnected = status.connected
            username = status.username
            lastCollectionUsd = status.lastCollectionUsd
        } catch {
            // silently stay disconnected — endpoint not yet available or not connected
            isConnected = false
        }
        isLoading = false
    }

    func requestToken() async {
        isLoading = true
        errorMessage = nil
        do {
            let result = try await api.requestDiscogsToken()
            pendingOauthToken = result.oauthToken
            authorizeUrl = result.authorizeUrl
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func verifyPin(_ pin: String) async {
        guard let token = pendingOauthToken, !pin.isEmpty else { return }
        isLoading = true
        errorMessage = nil
        do {
            try await api.verifyDiscogsToken(oauthToken: token, oauthVerifier: pin)
            pendingOauthToken = nil
            authorizeUrl = nil
            await loadStatus()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func sync() async {
        isLoading = true
        errorMessage = nil
        do {
            try await api.syncDiscogs()
            await loadStatus()
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }

    func disconnect() async {
        isLoading = true
        errorMessage = nil
        do {
            try await api.disconnectDiscogs()
            isConnected = false
            username = nil
            lastCollectionUsd = nil
        } catch {
            errorMessage = error.localizedDescription
        }
        isLoading = false
    }
}
