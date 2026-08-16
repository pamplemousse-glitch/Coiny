import XCTest
@testable import Coiny

@MainActor
final class ConnectionRepairViewModelTests: XCTestCase {
    // MARK: - Fake API

    private final class FakeAPI: ConnectionRepairAPI, @unchecked Sendable {
        private let lock = NSLock()
        var items: [PlaidItemHealth] = []
        var itemsError: Error?
        var updateTokenResult: Result<String, Error> = .success("link-update-token")
        var repairError: Error?
        private(set) var updateTokenItemIds: [String] = []
        private(set) var repairedItemIds: [String] = []

        func getPlaidItems() async throws -> [PlaidItemHealth] {
            lock.lock(); defer { lock.unlock() }
            if let itemsError { throw itemsError }
            return items
        }

        func createUpdateLinkToken(itemId: String) async throws -> String {
            lock.lock(); defer { lock.unlock() }
            updateTokenItemIds.append(itemId)
            return try updateTokenResult.get()
        }

        func markItemRepaired(itemId: String) async throws -> EmptyResponse {
            lock.lock(); defer { lock.unlock() }
            if let repairError { throw repairError }
            repairedItemIds.append(itemId)
            return EmptyResponse()
        }
    }

    private func makeVM(
        api: FakeAPI,
        telemetry: TelemetryClient = TelemetryClient(transport: LogTelemetryTransport(), isGranted: { true })
    ) -> ConnectionRepairViewModel {
        // A fresh telemetry client per test: no network, and the shared queue
        // is untouched.
        ConnectionRepairViewModel(api: api, telemetry: telemetry)
    }

    // MARK: - Item health

    func testLoadItemsPopulatesList() async {
        let api = FakeAPI()
        api.items = [NetWorthFixtures.item(id: "a", status: .healthy, repairable: false)]
        let vm = makeVM(api: api)

        await vm.loadItems()

        XCTAssertEqual(vm.items.map(\.itemId), ["a"])
        XCTAssertFalse(vm.needsRepair)
    }

    func testNeedsRepairWhenAnyItemRepairable() async {
        let api = FakeAPI()
        api.items = [
            NetWorthFixtures.item(id: "a", status: .healthy, repairable: false),
            NetWorthFixtures.item(id: "b", status: .reauthRequired, repairable: true),
        ]
        let vm = makeVM(api: api)

        await vm.loadItems()

        XCTAssertTrue(vm.needsRepair)
        XCTAssertEqual(vm.repairableItems.map(\.itemId), ["b"])
    }

    func testLoadItemsFailureLeavesListEmptyAndNoBanner() async {
        let api = FakeAPI()
        api.itemsError = URLError(.notConnectedToInternet)
        let vm = makeVM(api: api)

        await vm.loadItems()

        XCTAssertTrue(vm.items.isEmpty)
        XCTAssertFalse(vm.needsRepair)
    }

    // MARK: - The S-17 prompt

    func testRepairPromptTextNamesTheInstitution() async {
        let api = FakeAPI()
        api.items = [NetWorthFixtures.item(id: "b", institutionName: "Chase", status: .reauthRequired)]
        let vm = makeVM(api: api)

        await vm.loadItems()

        XCTAssertEqual(vm.repairPromptText, "Chase needs you to sign in again. Two taps.")
    }

    func testRepairPromptTextFallsBackWhenInstitutionUnknown() async {
        let api = FakeAPI()
        api.items = [NetWorthFixtures.item(id: "b", status: .reauthRequired)]
        let vm = makeVM(api: api)

        await vm.loadItems()

        XCTAssertEqual(vm.repairPromptText, "Your bank needs you to sign in again. Two taps.")
    }

    func testLoadItemsEmitsRepairPromptShownOncePerBrokenState() async {
        let api = FakeAPI()
        api.items = [NetWorthFixtures.item(id: "b", institutionName: "Chase", status: .reauthRequired)]
        let transport = RecordingTelemetryTransport()
        let telemetry = TelemetryClient(transport: transport, isGranted: { true })
        let vm = makeVM(api: api, telemetry: telemetry)

        await vm.loadItems()
        await vm.loadItems() // banner still up: same broken state, no re-emit
        await telemetry.flush()

        let shown = transport.events.filter { $0.event == "repair_prompt_shown" }
        XCTAssertEqual(shown.count, 1)
        XCTAssertEqual(shown.first?.properties, ["item_status": .string("reauth_required")])
        // The institution name must never ride on a telemetry event.
        XCTAssertFalse(shown.contains { $0.properties.values.contains(.string("Chase")) })
    }

    func testRepairPromptShownReEmitsAfterHealthyThenBrokenAgain() async {
        let api = FakeAPI()
        api.items = [NetWorthFixtures.item(id: "b", status: .reauthRequired)]
        let transport = RecordingTelemetryTransport()
        let telemetry = TelemetryClient(transport: transport, isGranted: { true })
        let vm = makeVM(api: api, telemetry: telemetry)

        await vm.loadItems()
        api.items = [NetWorthFixtures.item(id: "b", status: .healthy, repairable: false)]
        await vm.loadItems() // repaired: dedupe resets
        api.items = [NetWorthFixtures.item(id: "b", status: .expiring)]
        await vm.loadItems() // broken again: a genuinely new prompt
        await telemetry.flush()

        let shown = transport.events.filter { $0.event == "repair_prompt_shown" }
        XCTAssertEqual(shown.map(\.properties), [
            ["item_status": .string("reauth_required")],
            ["item_status": .string("expiring")],
        ])
    }

    // MARK: - Repair flow (R-8.6: genuine update mode)

    func testSuccessfulRepairMintsUpdateTokenAndConfirms() async {
        let api = FakeAPI()
        let broken = NetWorthFixtures.item(id: "item-9", status: .reauthRequired, repairable: true)
        api.items = [broken]
        let vm = makeVM(api: api)
        await vm.loadItems()

        var openedTokens: [String] = []
        vm.openLink = { token, completion in
            openedTokens.append(token)
            completion(true)
        }
        var repairedCallbackCount = 0
        vm.onRepaired = { repairedCallbackCount += 1 }

        await vm.repairFirstBrokenItem(source: .prompt)
        // finishLinkSession hops through a Task; give it a beat.
        await Task.yield()
        try? await Task.sleep(nanoseconds: 50_000_000)

        XCTAssertEqual(api.updateTokenItemIds, ["item-9"], "repair must use update mode for the broken item")
        XCTAssertEqual(openedTokens, ["link-update-token"])
        XCTAssertEqual(api.repairedItemIds, ["item-9"], "success must be reported to item-repaired")
        XCTAssertEqual(repairedCallbackCount, 1)
        XCTAssertNil(vm.errorMessage)
    }

    func testAbandonedLinkSessionDoesNotMarkRepaired() async {
        let api = FakeAPI()
        api.items = [NetWorthFixtures.item(id: "item-9")]
        let vm = makeVM(api: api)
        await vm.loadItems()
        vm.openLink = { _, completion in completion(false) }

        await vm.repairFirstBrokenItem(source: .prompt)
        await Task.yield()
        try? await Task.sleep(nanoseconds: 50_000_000)

        XCTAssertTrue(api.repairedItemIds.isEmpty, "an abandoned session must not flip the item healthy")
    }

    func testUpdateTokenFailureSurfacesError() async {
        struct Boom: Error {}
        let api = FakeAPI()
        api.items = [NetWorthFixtures.item(id: "item-9")]
        api.updateTokenResult = .failure(Boom())
        let vm = makeVM(api: api)
        await vm.loadItems()
        vm.openLink = { _, _ in XCTFail("Link must not open without a token") }

        await vm.repairFirstBrokenItem(source: .settings)

        XCTAssertNotNil(vm.errorMessage)
    }

    func testRepairConfirmFailureTellsTheTruth() async {
        struct Boom: Error {}
        let api = FakeAPI()
        api.items = [NetWorthFixtures.item(id: "item-9")]
        api.repairError = Boom()
        let vm = makeVM(api: api)
        await vm.loadItems()
        vm.openLink = { _, completion in completion(true) }

        await vm.repairFirstBrokenItem(source: .prompt)
        await Task.yield()
        try? await Task.sleep(nanoseconds: 50_000_000)

        XCTAssertNotNil(vm.errorMessage, "a failed confirmation must be visible")
    }

    func testNoRepairableItemsIsANoOp() async {
        let api = FakeAPI()
        api.items = [NetWorthFixtures.item(id: "a", status: .healthy, repairable: false)]
        let vm = makeVM(api: api)
        await vm.loadItems()
        vm.openLink = { _, _ in XCTFail("nothing to repair") }

        await vm.repairFirstBrokenItem(source: .prompt)

        XCTAssertTrue(api.updateTokenItemIds.isEmpty)
    }
}
