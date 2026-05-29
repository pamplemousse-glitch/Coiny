import XCTest
@testable import Coiny

@MainActor
final class ManualAssetsViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: ManualAssetsViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var assets: [ManualAsset] = []
        private var createError: Error?
        private var deleteError: Error?

        func setAssets(_ a: [ManualAsset]) { lock.lock(); assets = a; lock.unlock() }
        func setCreateError(_ e: Error?) { lock.lock(); createError = e; lock.unlock() }
        func setDeleteError(_ e: Error?) { lock.lock(); deleteError = e; lock.unlock() }

        func getManualAssets() async throws -> [ManualAsset] {
            lock.lock(); let a = assets; lock.unlock()
            return a
        }

        func createManualAsset(name: String, category: String, valueUsd: Double, notes: String?) async throws -> ManualAssetCreateResult {
            lock.lock(); let e = createError; lock.unlock()
            if let e { throw e }
            return ManualAssetCreateResult(ok: true, id: 1)
        }

        func deleteManualAsset(id: Int) async throws {
            lock.lock(); let e = deleteError; lock.unlock()
            if let e { throw e }
        }
    }

    private func makeAsset(id: Int = 1, name: String = "Test Watch", category: String = "watches", value: Double = 5000) -> ManualAsset {
        ManualAsset(id: id, name: name, category: category, selfReportedValueUsd: value, notes: nil, lastUpdatedAt: "2026-01-01T00:00:00Z", createdAt: "2026-01-01T00:00:00Z")
    }

    // MARK: - Initial state

    func testStartsEmpty() {
        let vm = ManualAssetsViewModel(api: FakeAPI())
        XCTAssertTrue(vm.assets.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load

    func testLoadAssetsPopulatesAssets() async {
        let fake = FakeAPI()
        fake.setAssets([makeAsset(id: 1, name: "Rolex")])
        let vm = ManualAssetsViewModel(api: fake)

        await vm.loadAssets()

        XCTAssertEqual(vm.assets.count, 1)
        XCTAssertEqual(vm.assets.first?.name, "Rolex")
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Add

    func testAddAssetWithEmptyNameDoesNothing() async {
        let vm = ManualAssetsViewModel(api: FakeAPI())

        await vm.addAsset(name: "", category: "watches", valueUsd: 1000, notes: nil)

        XCTAssertTrue(vm.assets.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddAssetSucceeds() async {
        let vm = ManualAssetsViewModel(api: FakeAPI())

        await vm.addAsset(name: "My Watch", category: "watches", valueUsd: 3500, notes: nil)

        XCTAssertNil(vm.errorMessage)
    }

    func testAddAssetOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "create failed" } }
        let fake = FakeAPI()
        fake.setCreateError(Boom())
        let vm = ManualAssetsViewModel(api: fake)

        await vm.addAsset(name: "Watch", category: "watches", valueUsd: 100, notes: nil)

        XCTAssertEqual(vm.errorMessage, "create failed")
    }

    // MARK: - Remove

    func testRemoveAssetOptimisticallyRemovesLocally() async {
        let fake = FakeAPI()
        fake.setAssets([makeAsset(id: 1)])
        let vm = ManualAssetsViewModel(api: fake)
        await vm.loadAssets()

        let asset = vm.assets[0]
        await vm.removeAsset(asset)

        XCTAssertTrue(vm.assets.isEmpty)
    }

    func testRemoveAssetOnErrorReloadsAssets() async {
        struct Boom: LocalizedError { var errorDescription: String? { "delete failed" } }
        let fake = FakeAPI()
        fake.setAssets([makeAsset(id: 1)])
        let vm = ManualAssetsViewModel(api: fake)
        await vm.loadAssets()
        XCTAssertEqual(vm.assets.count, 1)

        fake.setDeleteError(Boom())
        let asset = vm.assets[0]
        await vm.removeAsset(asset)

        XCTAssertEqual(vm.assets.count, 1)
        XCTAssertFalse(vm.isLoading)
    }
}
