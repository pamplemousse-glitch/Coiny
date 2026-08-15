import XCTest
@testable import Coiny

final class SubscriptionCatalogTests: XCTestCase {
    func testProductOrderPresentsAnnualFirst() {
        XCTAssertEqual(SubscriptionCatalog.ProductID.all.first, SubscriptionCatalog.ProductID.individualAnnual)
    }

    func testTierMappingCoversEveryProduct() {
        for id in SubscriptionCatalog.ProductID.all {
            XCTAssertNotNil(SubscriptionCatalog.tier(for: id), "no tier for \(id)")
        }
    }

    func testUnknownProductMapsToNoTier() {
        XCTAssertNil(SubscriptionCatalog.tier(for: "app.coiny.lifetime.gold"))
    }

    func testProductIDRoundTripsThroughTierAndPeriod() {
        for id in SubscriptionCatalog.ProductID.all {
            let tier = SubscriptionCatalog.tier(for: id)!
            let annual = SubscriptionCatalog.isAnnual(id)
            XCTAssertEqual(SubscriptionCatalog.productID(tier: tier, annual: annual), id)
        }
    }

    func testDisclosureNamesPeriodRenewalPriceContentsAndCancelPath() {
        let text = SubscriptionCatalog.disclosure(tier: .individual, price: "$99.00", annual: true)
        XCTAssertTrue(text.contains("Coiny Individual"))
        XCTAssertTrue(text.contains("$99.00/year"))
        XCTAssertTrue(text.contains("Renews yearly until cancelled"))
        XCTAssertTrue(text.contains("Settings > Apple Account > Subscriptions"))
        XCTAssertTrue(text.contains("12 connections"))
        XCTAssertTrue(text.contains("full debt tooling"))
    }

    func testMonthlyDisclosureStatesMonthlyRenewal() {
        let text = SubscriptionCatalog.disclosure(tier: .household, price: "$16.99", annual: false)
        XCTAssertTrue(text.contains("$16.99/month"))
        XCTAssertTrue(text.contains("Renews monthly until cancelled"))
        XCTAssertTrue(text.contains("up to 5 members"))
    }

    func testCopyContainsNoEmojiOrEmDash() {
        var strings: [String] = []
        for tier in SubscriptionCatalog.Tier.allCases {
            strings.append(tier.displayName)
            strings.append(contentsOf: tier.features)
            strings.append(SubscriptionCatalog.disclosure(tier: tier, price: "$1.00", annual: true))
            strings.append(SubscriptionCatalog.disclosure(tier: tier, price: "$1.00", annual: false))
        }
        for string in strings {
            XCTAssertFalse(string.contains("\u{2014}"), "em dash in: \(string)")
            XCTAssertFalse(string.unicodeScalars.contains { $0.properties.isEmojiPresentation }, "emoji in: \(string)")
        }
    }
}
