import XCTest
@testable import Coiny

final class NetWorthCacheTests: XCTestCase {
    private var directory: URL!
    private var cache: NetWorthCache!

    override func setUpWithError() throws {
        try super.setUpWithError()
        directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("networth-cache-tests-\(UUID().uuidString)", isDirectory: true)
        cache = NetWorthCache(directory: directory)
    }

    override func tearDownWithError() throws {
        try? FileManager.default.removeItem(at: directory)
        cache = nil
        directory = nil
        try super.tearDownWithError()
    }

    func testLoadReturnsNilWhenNothingSaved() {
        XCTAssertNil(cache.load())
    }

    func testSaveThenLoadRoundTrips() {
        let asOf = Date(timeIntervalSince1970: 1_700_000_000)
        let response = NetWorthFixtures.response(
            total: 1234.56,
            classes: ["bank": NetWorthFixtures.reading(value: 1000, asOf: asOf, status: .stale)],
            excluded: ExcludedSummary(count: 1, classes: ["defi"]),
            generatedAt: asOf
        )

        cache.save(response)
        let loaded = cache.load()

        XCTAssertEqual(loaded?.total, 1234.56)
        XCTAssertEqual(loaded?.classes["bank"]?.status, .stale)
        XCTAssertEqual(loaded?.classes["bank"]?.value, 1000)
        XCTAssertEqual(loaded?.excluded.classes, ["defi"])
        XCTAssertEqual(loaded?.generatedAt.timeIntervalSince1970 ?? 0, 1_700_000_000, accuracy: 1)
    }

    func testSaveOverwritesPreviousSnapshot() {
        cache.save(NetWorthFixtures.response(total: 1))
        cache.save(NetWorthFixtures.response(total: 2))

        XCTAssertEqual(cache.load()?.total, 2)
    }

    func testClearRemovesSnapshot() {
        cache.save(NetWorthFixtures.response(total: 1))

        cache.clear()

        XCTAssertNil(cache.load())
    }

    func testSnapshotFileIsExcludedFromBackup() throws {
        cache.save(NetWorthFixtures.response(total: 1))

        let fileURL = directory.appendingPathComponent("net-worth-snapshot.json")
        let values = try fileURL.resourceValues(forKeys: [.isExcludedFromBackupKey])
        XCTAssertEqual(values.isExcludedFromBackup, true, "display cache must not ride iCloud backups (R-18.1)")
    }
}
