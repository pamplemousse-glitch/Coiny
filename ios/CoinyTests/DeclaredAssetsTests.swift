import XCTest
@testable import Coiny

final class DeclaredAssetsTests: XCTestCase {
    // MARK: - LogSlider

    func testSliderEndpointsMapToRangeBounds() {
        let range: ClosedRange<Double> = 100...1_000_000
        XCTAssertEqual(LogSlider.value(at: 0, in: range), 100)
        XCTAssertEqual(LogSlider.value(at: 1, in: range), 1_000_000)
    }

    func testSliderMidpointIsGeometricMean() {
        // Log interpolation: halfway across 100...1,000,000 is 10,000.
        XCTAssertEqual(LogSlider.value(at: 0.5, in: 100...1_000_000), 10_000)
    }

    func testSliderPositionRoundTrips() {
        let range: ClosedRange<Double> = 500...2_000_000
        let position = LogSlider.position(of: 50_000, in: range)
        XCTAssertEqual(LogSlider.value(at: position, in: range), 50_000)
    }

    func testBucketRoundsToTwoSignificantDigits() {
        XCTAssertEqual(LogSlider.bucket(137_400), 140_000)
        XCTAssertEqual(LogSlider.bucket(2_349), 2_300)
        XCTAssertEqual(LogSlider.bucket(96), 96)
        XCTAssertEqual(LogSlider.bucket(0), 0)
    }

    // MARK: - DeclarationSheet

    private func asset(_ assetClass: DeclaredAssetClass, _ value: Double?) -> DeclaredAsset {
        DeclaredAsset(assetClass: assetClass, bucketedValueUSD: value, declaredAt: Date(timeIntervalSince1970: 0))
    }

    func testEstimatedNetWorthSubtractsDebts() {
        let sheet = DeclarationSheet(assets: [
            asset(.checking, 5_000),
            asset(.home, 300_000),
            asset(.studentLoans, 40_000),
        ])
        XCTAssertEqual(sheet.estimatedNetWorthUSD, 265_000)
    }

    func testEstimatedNetWorthIsNilWhenNothingValued() {
        // Null means "we do not know", never zero (product principle 5).
        let sheet = DeclarationSheet(assets: [asset(.crypto, nil)])
        XCTAssertNil(sheet.estimatedNetWorthUSD)
    }

    func testEstimatedNetWorthIgnoresSkippedLines() {
        let sheet = DeclarationSheet(assets: [
            asset(.checking, 1_000),
            asset(.brokerage, nil),
        ])
        XCTAssertEqual(sheet.estimatedNetWorthUSD, 1_000)
    }

    func testTelemetryPropertiesBucketValuesAndNeverCarryAmounts() {
        let sheet = DeclarationSheet(assets: [
            asset(.checking, 5_000),
            asset(.home, nil),
        ])
        let props = sheet.telemetryProperties
        XCTAssertEqual(props["class_count"], .int(2))
        XCTAssertEqual(props["classes"], .strings(["checking", "home"]))
        XCTAssertEqual(props["value_checking"], .string("1k-10k"))
        XCTAssertNil(props["value_home"], "a skipped line must not report a value")
    }

    func testStoreRoundTrips() {
        let defaults = UserDefaults(suiteName: "DeclaredAssetsTests")!
        defaults.removePersistentDomain(forName: "DeclaredAssetsTests")
        let store = DeclaredAssetsStore(defaults: defaults)
        let sheet = DeclarationSheet(assets: [asset(.car, 12_000)])
        store.save(sheet)
        XCTAssertEqual(store.load(), sheet)
        store.clear()
        XCTAssertNil(store.load())
    }

    // MARK: - MoneyText

    func testUsdFormattingHasNoFractionDigits() {
        XCTAssertEqual(MoneyText.usd(342_880.4), "$342,880")
    }
}
