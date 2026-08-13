import XCTest
@testable import Coiny

// MARK: - Fake API

final class FakeDeclaredAssetsAPI: DeclaredAssetsSyncAPI, @unchecked Sendable {
    private let lock = NSLock()

    private var _getResult: Result<DeclaredSheetResponse, Error> =
        .success(DeclaredSheetResponse(assets: [], nudge: nil))
    private var _putSheets: [DeclarationSheet] = []

    var putSheets: [DeclarationSheet] {
        lock.lock(); defer { lock.unlock() }
        return _putSheets
    }

    func setServerLines(_ lines: [DeclaredAssetLineDTO]) {
        lock.lock(); defer { lock.unlock() }
        _getResult = .success(DeclaredSheetResponse(assets: lines, nudge: nil))
    }

    func setGetFailure() {
        lock.lock(); defer { lock.unlock() }
        _getResult = .failure(URLError(.notConnectedToInternet))
    }

    func getDeclaredAssets() async throws -> DeclaredSheetResponse {
        lock.lock(); defer { lock.unlock() }
        return try _getResult.get()
    }

    @discardableResult
    func putDeclaredAssets(_ sheet: DeclarationSheet) async throws -> DeclaredSheetResponse {
        lock.lock(); defer { lock.unlock() }
        _putSheets.append(sheet)
        return DeclaredSheetResponse(assets: [], nudge: nil)
    }
}

// MARK: - Helpers

private func serverLine(
    _ assetClass: String,
    value: Double?,
    at date: Date
) -> DeclaredAssetLineDTO {
    DeclaredAssetLineDTO(
        assetClass: assetClass,
        bucketedValueUsd: value,
        confidence: "declared",
        declaredAt: date,
        refreshedAt: date
    )
}

private func localSheet(_ assetClass: DeclaredAssetClass, value: Double?, at date: Date) -> DeclarationSheet {
    DeclarationSheet(assets: [DeclaredAsset(assetClass: assetClass, bucketedValueUSD: value, declaredAt: date)])
}

// MARK: - Reconciler (pure decision)

final class DeclaredAssetsReconcilerTests: XCTestCase {
    private let older = Date(timeIntervalSince1970: 1_700_000_000)
    private let newer = Date(timeIntervalSince1970: 1_700_100_000)

    func testNothingAnywhereDoesNothing() {
        XCTAssertEqual(DeclaredAssetsReconciler.action(local: nil, serverLines: []), .none)
    }

    func testEmptyLocalSheetCountsAsNothingLocal() {
        let action = DeclaredAssetsReconciler.action(
            local: DeclarationSheet(),
            serverLines: [serverLine("checking", value: 5_000, at: older)]
        )
        XCTAssertEqual(action, .adoptServer)
    }

    func testFreshInstallAdoptsTheServerSheet() {
        let action = DeclaredAssetsReconciler.action(
            local: nil,
            serverLines: [serverLine("home", value: 300_000, at: older)]
        )
        XCTAssertEqual(action, .adoptServer)
    }

    func testUnsyncedLocalSheetIsPushed() {
        let action = DeclaredAssetsReconciler.action(
            local: localSheet(.checking, value: 5_000, at: older),
            serverLines: []
        )
        XCTAssertEqual(action, .pushLocal)
    }

    func testNewerLocalEditWins() {
        let action = DeclaredAssetsReconciler.action(
            local: localSheet(.car, value: 15_000, at: newer),
            serverLines: [serverLine("car", value: 12_000, at: older)]
        )
        XCTAssertEqual(action, .pushLocal)
    }

    func testNewerServerSheetWins() {
        let action = DeclaredAssetsReconciler.action(
            local: localSheet(.car, value: 12_000, at: older),
            serverLines: [serverLine("car", value: 15_000, at: newer)]
        )
        XCTAssertEqual(action, .adoptServer)
    }

    func testEqualTimestampsAdoptWithoutAWastedWrite() {
        let action = DeclaredAssetsReconciler.action(
            local: localSheet(.car, value: 12_000, at: older),
            serverLines: [serverLine("car", value: 12_000, at: older)]
        )
        XCTAssertEqual(action, .adoptServer)
    }
}

// MARK: - Service

final class DeclaredAssetsSyncServiceTests: XCTestCase {
    private var api = FakeDeclaredAssetsAPI()
    private var store: DeclaredAssetsStore!

    override func setUp() {
        super.setUp()
        api = FakeDeclaredAssetsAPI()
        let defaults = UserDefaults(suiteName: "DeclaredAssetsSyncServiceTests")!
        defaults.removePersistentDomain(forName: "DeclaredAssetsSyncServiceTests")
        store = DeclaredAssetsStore(defaults: defaults)
    }

    func testReconcileRestoresTheServerSheetOnFreshInstall() async {
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        api.setServerLines([
            serverLine("checking", value: 5_000, at: date),
            serverLine("credit_cards", value: 2_000, at: date),
        ])

        await DeclaredAssetsSyncService(api: api, store: store).reconcile()

        let restored = store.load()
        XCTAssertEqual(restored?.assets.map(\.assetClass), [.checking, .creditCards])
        XCTAssertEqual(restored?.estimatedNetWorthUSD, 3_000)
    }

    func testReconcilePushesAnUnsyncedLocalSheet() async {
        let sheet = localSheet(.savings, value: 10_000, at: Date())
        store.save(sheet)

        await DeclaredAssetsSyncService(api: api, store: store).reconcile()

        XCTAssertEqual(api.putSheets, [sheet])
    }

    func testReconcileSwallowsANetworkFailureAndKeepsTheCache() async {
        let sheet = localSheet(.savings, value: 10_000, at: Date())
        store.save(sheet)
        api.setGetFailure()

        await DeclaredAssetsSyncService(api: api, store: store).reconcile()

        XCTAssertEqual(store.load(), sheet)
        XCTAssertTrue(api.putSheets.isEmpty)
    }
}
