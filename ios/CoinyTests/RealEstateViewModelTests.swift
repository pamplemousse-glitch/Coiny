import XCTest
@testable import Coiny

@MainActor
final class RealEstateViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: RealEstateViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var assetsResult: Result<[RealEstateAsset], Error> = .success([])
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<RealEstateSyncResult, Error> = .success(RealEstateSyncResult(synced: 0, errors: 0))

        func setAssetsResult(_ r: Result<[RealEstateAsset], Error>) { lock.lock(); assetsResult = r; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<RealEstateSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getRealEstate() async throws -> [RealEstateAsset] { lock.lock(); let r = assetsResult; lock.unlock(); return try r.get() }
        func addRealEstate(address: String, label: String?) async throws { lock.lock(); let e = addError; lock.unlock(); if let e { throw e } }
        func removeRealEstate(id: Int) async throws { lock.lock(); let e = removeError; lock.unlock(); if let e { throw e } }
        func syncRealEstate() async throws -> RealEstateSyncResult { lock.lock(); let r = syncResult; lock.unlock(); return try r.get() }
    }

    private static func makeAsset(id: Int = 1) -> RealEstateAsset {
        RealEstateAsset(id: id, address: "123 Main St", label: nil, lastValueUsd: nil, lastSyncedAt: nil, createdAt: "2026-01-01T00:00:00.000Z")
    }

    // MARK: - Initial state

    func testStartsEmpty() {
        let vm = RealEstateViewModel(api: FakeAPI())
        XCTAssertTrue(vm.assets.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load

    func testLoadPopulatesList() async {
        let fake = FakeAPI()
        fake.setAssetsResult(.success([Self.makeAsset()]))
        let vm = RealEstateViewModel(api: fake)

        await vm.loadAssets()

        XCTAssertEqual(vm.assets.count, 1)
        XCTAssertEqual(vm.assets.first?.address, "123 Main St")
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "load failed" } }
        let fake = FakeAPI()
        fake.setAssetsResult(.failure(Boom()))
        let vm = RealEstateViewModel(api: fake)

        await vm.loadAssets()

        XCTAssertTrue(vm.assets.isEmpty)
        XCTAssertEqual(vm.errorMessage, "load failed")
    }

    // MARK: - Add

    func testAddWithEmptyAddressDoesNothing() async {
        let fake = FakeAPI()
        let vm = RealEstateViewModel(api: fake)

        await vm.addAsset(address: "", label: nil)

        XCTAssertTrue(vm.assets.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddReloadsOnSuccess() async {
        let fake = FakeAPI()
        fake.setAssetsResult(.success([Self.makeAsset()]))
        let vm = RealEstateViewModel(api: fake)

        await vm.addAsset(address: "123 Main St", label: nil)

        XCTAssertEqual(vm.assets.count, 1)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "add failed" } }
        let fake = FakeAPI()
        fake.setAddError(Boom())
        let vm = RealEstateViewModel(api: fake)

        await vm.addAsset(address: "456 Oak Ave", label: nil)

        XCTAssertEqual(vm.errorMessage, "add failed")
    }

    // MARK: - Remove

    func testRemoveOptimisticallyUpdatesLocal() async {
        let fake = FakeAPI()
        let asset = Self.makeAsset()
        fake.setAssetsResult(.success([asset]))
        let vm = RealEstateViewModel(api: fake)
        await vm.loadAssets()

        await vm.removeAsset(asset)

        XCTAssertTrue(vm.assets.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testRemoveOnErrorRollsBack() async {
        struct Boom: LocalizedError { var errorDescription: String? { "remove failed" } }
        let fake = FakeAPI()
        let asset = Self.makeAsset()
        fake.setAssetsResult(.success([asset]))
        fake.setRemoveError(Boom())
        let vm = RealEstateViewModel(api: fake)
        await vm.loadAssets()

        await vm.removeAsset(asset)

        XCTAssertEqual(vm.assets.count, 1)
        XCTAssertEqual(vm.errorMessage, "remove failed")
    }

    // MARK: - Sync

    func testSyncSetsLastSynced() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(RealEstateSyncResult(synced: 1, errors: 0)))
        let vm = RealEstateViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastSynced, 1)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = RealEstateViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastSynced)
        XCTAssertEqual(vm.errorMessage, "sync error")
    }
}
