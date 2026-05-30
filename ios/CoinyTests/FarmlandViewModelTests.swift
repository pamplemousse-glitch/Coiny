import XCTest
@testable import Coiny

@MainActor
final class FarmlandViewModelTests: XCTestCase {
    private final class FakeAPI: FarmlandViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var parcels: [FarmlandParcel] = []
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<FarmlandSyncResult, Error> = .success(FarmlandSyncResult(updated: 0))

        func setParcels(_ p: [FarmlandParcel]) { lock.lock(); parcels = p; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<FarmlandSyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getFarmland() async throws -> [FarmlandParcel] {
            lock.lock(); let p = parcels; lock.unlock(); return p
        }

        func addFarmland(stateCode: String, acres: Double, label: String?) async throws {
            lock.lock(); let e = addError; lock.unlock(); if let e { throw e }
        }

        func removeFarmland(id: Int) async throws {
            lock.lock(); let e = removeError; lock.unlock(); if let e { throw e }
        }

        func syncFarmland() async throws -> FarmlandSyncResult {
            lock.lock(); let r = syncResult; lock.unlock(); return try r.get()
        }
    }

    private func makeParcel(id: Int = 1, stateCode: String = "TX", acres: Double = 100) -> FarmlandParcel {
        FarmlandParcel(id: id, stateCode: stateCode, acres: acres, label: nil,
                       lastPricePerAcreUsd: nil, valueUsd: nil,
                       lastSyncedAt: nil, createdAt: "2026-01-01T00:00:00Z")
    }

    func testStartsEmpty() {
        let vm = FarmlandViewModel(api: FakeAPI())
        XCTAssertTrue(vm.parcels.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.lastUpdated)
    }

    func testLoadParcelsPopulates() async {
        let fake = FakeAPI()
        fake.setParcels([makeParcel(id: 1, stateCode: "IA")])
        let vm = FarmlandViewModel(api: fake)

        await vm.loadParcels()

        XCTAssertEqual(vm.parcels.count, 1)
        XCTAssertEqual(vm.parcels.first?.stateCode, "IA")
        XCTAssertFalse(vm.isLoading)
    }

    func testAddParcelWithEmptyStateCodeDoesNothing() async {
        let vm = FarmlandViewModel(api: FakeAPI())

        await vm.addParcel(stateCode: "", acres: 50, label: nil)

        XCTAssertTrue(vm.parcels.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testRemoveParcelRemovesLocally() async {
        let fake = FakeAPI()
        let parcel = makeParcel(id: 5, stateCode: "NE")
        fake.setParcels([parcel])
        let vm = FarmlandViewModel(api: fake)
        await vm.loadParcels()

        await vm.removeParcel(parcel)

        XCTAssertTrue(vm.parcels.isEmpty)
    }

    func testSyncUpdatesLastUpdated() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(FarmlandSyncResult(updated: 2)))
        let vm = FarmlandViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastUpdated, 2)
    }
}
