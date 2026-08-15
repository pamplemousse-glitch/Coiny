import Foundation

// Reconciles the on-device declaration cache with the server sheet (R-5.3).
//
// Conflict policy, stated once: the LATEST EDIT WINS. Both sides are the same
// user's own statements about their own stuff, so the newer statement
// supersedes the older; there is nothing to merge line-by-line because the
// sheet is written as a whole. Local recency is the newest declaredAt; server
// recency is the newest refreshedAt (stamped at the last accepted write).
//
// The sync is never on the critical path to showing a number: onboarding
// saves locally first and pushes in the background, and the app-start
// reconcile runs as a detached task.

// MARK: - API seam

protocol DeclaredAssetsSyncAPI: Sendable {
    func getDeclaredAssets() async throws -> DeclaredSheetResponse
    @discardableResult
    func putDeclaredAssets(_ sheet: DeclarationSheet) async throws -> DeclaredSheetResponse
}

extension API: DeclaredAssetsSyncAPI {}

// MARK: - Pure reconcile decision

enum DeclaredReconcileAction: Equatable {
    /// Server sheet is newer (or the device has nothing): write it to the
    /// local cache. The fresh-install restore path.
    case adoptServer
    /// Local sheet is newer (or the server has nothing): push it up.
    case pushLocal
    /// Neither side has anything, or ages are equal: do nothing.
    case none
}

enum DeclaredAssetsReconciler {
    static func action(local: DeclarationSheet?, serverLines: [DeclaredAssetLineDTO]) -> DeclaredReconcileAction {
        let localSheet = local.flatMap { $0.isEmpty ? nil : $0 }
        let serverNewest = serverLines.map { $0.refreshedAt }.max()

        switch (localSheet, serverNewest) {
        case (nil, nil):
            return .none
        case (nil, .some):
            return .adoptServer
        case (.some, nil):
            return .pushLocal
        case let (.some(localValue), .some(serverValue)):
            guard let localNewest = localValue.latestDeclaredAt else { return .adoptServer }
            // Equal timestamps mean the server already reflects this write;
            // adopting is idempotent, pushing is a wasted mutation.
            return localNewest > serverValue ? .pushLocal : .adoptServer
        }
    }
}

// MARK: - Service

/// App-start reconcile. Failures are swallowed: sync is repair machinery, and
/// a dead network must never surface as an error on a screen the user did not
/// touch. Nothing about the sheet's values is ever logged.
struct DeclaredAssetsSyncService {
    private let api: DeclaredAssetsSyncAPI
    private let store: DeclaredAssetsStore

    init(api: DeclaredAssetsSyncAPI = API.shared, store: DeclaredAssetsStore = DeclaredAssetsStore()) {
        self.api = api
        self.store = store
    }

    func reconcile() async {
        guard let response = try? await api.getDeclaredAssets() else { return }
        let local = store.load()
        switch DeclaredAssetsReconciler.action(local: local, serverLines: response.assets) {
        case .adoptServer:
            store.save(DeclarationSheet(serverLines: response.assets))
        case .pushLocal:
            if let local {
                _ = try? await api.putDeclaredAssets(local)
            }
        case .none:
            break
        }
    }
}
