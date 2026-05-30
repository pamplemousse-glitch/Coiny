import XCTest
@testable import Coiny

@MainActor
final class EnergyViewModelTests: XCTestCase {
    private final class FakeAPI: EnergyViewModelAPI, @unchecked Sendable {
        private let lock = NSLock()
        private var positions: [EnergyPosition] = []
        private var addError: Error?
        private var removeError: Error?
        private var syncResult: Result<EnergySyncResult, Error> = .success(EnergySyncResult(updated: 0))

        func setPositions(_ p: [EnergyPosition]) { lock.lock(); positions = p; lock.unlock() }
        func setAddError(_ e: Error?) { lock.lock(); addError = e; lock.unlock() }
        func setRemoveError(_ e: Error?) { lock.lock(); removeError = e; lock.unlock() }
        func setSyncResult(_ r: Result<EnergySyncResult, Error>) { lock.lock(); syncResult = r; lock.unlock() }

        func getEnergy() async throws -> [EnergyPosition] {
            lock.lock(); let p = positions; lock.unlock(); return p
        }

        func addEnergy(commodity: String, quantity: Double, label: String?) async throws {
            lock.lock(); let e = addError; lock.unlock(); if let e { throw e }
        }

        func removeEnergy(id: Int) async throws {
            lock.lock(); let e = removeError; lock.unlock(); if let e { throw e }
        }

        func syncEnergy() async throws -> EnergySyncResult {
            lock.lock(); let r = syncResult; lock.unlock(); return try r.get()
        }
    }

    private func makePosition(id: Int = 1, commodity: String = "crude_oil") -> EnergyPosition {
        EnergyPosition(id: id, commodity: commodity, quantityUnit: "barrel", quantity: 10,
                       label: nil, lastSpotPriceUsd: nil, valueUsd: nil,
                       lastSyncedAt: nil, createdAt: "2026-01-01T00:00:00Z")
    }

    func testStartsEmpty() {
        let vm = EnergyViewModel(api: FakeAPI())
        XCTAssertTrue(vm.positions.isEmpty)
        XCTAssertFalse(vm.isLoading)
        XCTAssertNil(vm.errorMessage)
        XCTAssertNil(vm.lastUpdated)
    }

    func testLoadPositionsPopulates() async {
        let fake = FakeAPI()
        fake.setPositions([makePosition(id: 1, commodity: "natural_gas")])
        let vm = EnergyViewModel(api: fake)

        await vm.loadPositions()

        XCTAssertEqual(vm.positions.count, 1)
        XCTAssertEqual(vm.positions.first?.commodity, "natural_gas")
        XCTAssertFalse(vm.isLoading)
    }

    func testAddPositionWithZeroQuantityDoesNothing() async {
        let vm = EnergyViewModel(api: FakeAPI())

        await vm.addPosition(commodity: "crude_oil", quantity: 0, label: nil)

        XCTAssertTrue(vm.positions.isEmpty)
        XCTAssertNil(vm.errorMessage)
    }

    func testRemovePositionRemovesLocally() async {
        let fake = FakeAPI()
        let pos = makePosition(id: 7)
        fake.setPositions([pos])
        let vm = EnergyViewModel(api: fake)
        await vm.loadPositions()

        await vm.removePosition(pos)

        XCTAssertTrue(vm.positions.isEmpty)
    }

    func testSyncUpdatesLastUpdated() async {
        let fake = FakeAPI()
        fake.setSyncResult(.success(EnergySyncResult(updated: 4)))
        let vm = EnergyViewModel(api: fake)

        await vm.sync()

        XCTAssertEqual(vm.lastUpdated, 4)
    }
}
