import XCTest
@testable import Coiny

@MainActor
final class VehiclesViewModelTests: XCTestCase {
    // MARK: - Fake

    private final class FakeAPI: VehiclesViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var assetsResult: Result<[VehicleAsset], Error> = .success([])
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<VehiclesSyncResult, Error> = .success(VehiclesSyncResult(synced: 0, errors: 0))

        func setAssetsResult(_ r: Result<[VehicleAsset], Error>) { lock.lock(); assetsResult = r; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<VehiclesSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getVehicles() async throws -> [VehicleAsset] { lock.lock(); let r = assetsResult; lock.unlock(); return try r.get() }
        func addVehicle(vin: String, label: String?) async throws { lock.lock(); let e = addError; lock.unlock(); if let e { throw e } }
        func removeVehicle(id: Int) async throws { lock.lock(); let e = removeError; lock.unlock(); if let e { throw e } }
        func syncVehicles() async throws -> VehiclesSyncResult { lock.lock(); let r = syncResult; lock.unlock(); return try r.get() }
    }

    private static func makeAsset(id: Int = 1, vin: String = "1HGBH41JXMN109186") -> VehicleAsset {
        VehicleAsset(id: id, vin: vin, label: nil, lastValueUsd: nil, lastSyncedAt: nil, createdAt: "2026-01-01T00:00:00.000Z")
    }

    // MARK: - Initial state

    func testStartsEmpty() {
        let vm = VehiclesViewModel(api: FakeAPI())
        XCTAssertTrue(vm.assets.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Load

    func testLoadPopulatesList() async {
        let fake = FakeAPI()
        fake.setAssetsResult(.success([Self.makeAsset()]))
        let vm = VehiclesViewModel(api: fake)

        await vm.loadAssets()

        XCTAssertEqual(vm.assets.count, 1)
        XCTAssertEqual(vm.assets.first?.vin, "1HGBH41JXMN109186")
        XCTAssertNil(vm.errorMessage)
    }

    func testLoadOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "load failed" } }
        let fake = FakeAPI()
        fake.setAssetsResult(.failure(Boom()))
        let vm = VehiclesViewModel(api: fake)

        await vm.loadAssets()

        XCTAssertTrue(vm.assets.isEmpty)
        XCTAssertEqual(vm.errorMessage, "load failed")
    }

    // MARK: - Add

    func testAddWithEmptyVinDoesNothing() async {
        let fake = FakeAPI()
        let vm = VehiclesViewModel(api: fake)

        await vm.addAsset(vin: "", label: nil)

        XCTAssertTrue(vm.assets.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddReloadsOnSuccess() async {
        let fake = FakeAPI()
        fake.setAssetsResult(.success([Self.makeAsset()]))
        let vm = VehiclesViewModel(api: fake)

        await vm.addAsset(vin: "1HGBH41JXMN109186", label: nil)

        XCTAssertEqual(vm.assets.count, 1)
        XCTAssertNil(vm.errorMessage)
    }

    func testAddOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "add failed" } }
        let fake = FakeAPI()
        fake.setAddError(Boom())
        let vm = VehiclesViewModel(api: fake)

        await vm.addAsset(vin: "1HGBH41JXMN109186", label: nil)

        XCTAssertEqual(vm.errorMessage, "add failed")
    }

    // MARK: - Remove

    func testRemoveOptimisticallyUpdatesLocal() async {
        let fake = FakeAPI()
        let asset = Self.makeAsset()
        fake.setAssetsResult(.success([asset]))
        let vm = VehiclesViewModel(api: fake)
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
        let vm = VehiclesViewModel(api: fake)
        await vm.loadAssets()

        await vm.removeAsset(asset)

        XCTAssertEqual(vm.assets.count, 1)
        XCTAssertEqual(vm.errorMessage, "remove failed")
    }

    // MARK: - Sync

    func testSyncSetsLastSynced() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(VehiclesSyncResult(synced: 1, errors: 0)))
        let vm = VehiclesViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastSynced, 1)
        XCTAssertNil(vm.errorMessage)
    }

    func testSyncOnErrorSetsMessage() async {
        struct Boom: LocalizedError { var errorDescription: String? { "sync error" } }
        let fake = FakeAPI()
        fake.setSyncResult(.failure(Boom()))
        let vm = VehiclesViewModel(api: fake)

        await vm.sync()

        XCTAssertNil(vm.lastSynced)
        XCTAssertEqual(vm.errorMessage, "sync error")
    }
}
