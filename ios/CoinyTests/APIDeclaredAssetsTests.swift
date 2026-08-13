import XCTest
@testable import Coiny

final class APIDeclaredAssetsTests: XCTestCase {
    // MARK: Server key mapping

    func testEveryClassRoundTripsThroughItsServerKey() {
        for cls in DeclaredAssetClass.allCases {
            XCTAssertEqual(DeclaredAssetClass(serverKey: cls.serverKey), cls)
        }
    }

    func testUnknownServerKeyIsNil() {
        XCTAssertNil(DeclaredAssetClass(serverKey: "yachts"))
    }

    // MARK: Sheet from server lines

    func testSheetFromServerLinesDropsUnknownClasses() {
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        let sheet = DeclarationSheet(serverLines: [
            DeclaredAssetLineDTO(
                assetClass: "checking",
                bucketedValueUsd: 5_000,
                confidence: "declared",
                declaredAt: date,
                refreshedAt: date
            ),
            DeclaredAssetLineDTO(
                assetClass: "space_station",
                bucketedValueUsd: 1,
                confidence: "declared",
                declaredAt: date,
                refreshedAt: date
            ),
        ])
        XCTAssertEqual(sheet.assets.map(\.assetClass), [.checking])
    }

    func testSheetFromServerLinesKeepsSkippedAmountsAsNil() {
        let date = Date(timeIntervalSince1970: 1_700_000_000)
        let sheet = DeclarationSheet(serverLines: [
            DeclaredAssetLineDTO(
                assetClass: "home",
                bucketedValueUsd: nil,
                confidence: "declared",
                declaredAt: date,
                refreshedAt: date
            ),
        ])
        XCTAssertEqual(sheet.assets.first?.bucketedValueUSD, nil)
        XCTAssertNil(sheet.estimatedNetWorthUSD)
    }

    // MARK: PUT body encoding

    private func encodedLine(_ line: DeclaredAssetPutLine) throws -> [String: Any] {
        let data = try JSONEncoder().encode(line)
        let object = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        return object ?? [:]
    }

    func testSkippedAmountEncodesAnExplicitNull() throws {
        // The server schema is strict and requires the key; a dropped key
        // would reject the whole sheet.
        let object = try encodedLine(
            DeclaredAssetPutLine(assetClass: "home", bucketedValueUsd: nil, declaredAt: "2026-08-13T00:00:00Z")
        )
        XCTAssertTrue(object.keys.contains("bucketedValueUsd"))
        XCTAssertTrue(object["bucketedValueUsd"] is NSNull)
    }

    func testValuedLineEncodesItsAmount() throws {
        let object = try encodedLine(
            DeclaredAssetPutLine(assetClass: "checking", bucketedValueUsd: 5_000, declaredAt: "2026-08-13T00:00:00Z")
        )
        XCTAssertEqual(object["bucketedValueUsd"] as? Double, 5_000)
        XCTAssertEqual(object["assetClass"] as? String, "checking")
    }

    func testPutLinesCarryIsoDatesTheServerAccepts() {
        let sheet = DeclarationSheet(assets: [
            DeclaredAsset(
                assetClass: .creditCards,
                bucketedValueUSD: 2_000,
                declaredAt: Date(timeIntervalSince1970: 1_700_000_000)
            ),
        ])
        let line = sheet.putLines.first
        XCTAssertEqual(line?.assetClass, "credit_cards")
        XCTAssertEqual(line?.declaredAt, "2023-11-14T22:13:20Z")
    }
}
