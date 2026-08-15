import Foundation

/// Product identifiers and paywall copy for the subscription tiers
/// (docs/prd.md section 25.1, decisions DR-2 and DR-24).
///
/// Single Swift source of truth. Must stay in sync with
/// `backend/src/appstore/types.ts` and, once the App Store Connect products
/// exist, with the identifiers configured there. `ios/Coiny.storekit` carries
/// the same identifiers for local testing.
enum SubscriptionCatalog {
    enum ProductID {
        static let individualAnnual = "app.coiny.individual.annual"
        static let individualMonthly = "app.coiny.individual.monthly"
        static let householdAnnual = "app.coiny.household.annual"
        static let householdMonthly = "app.coiny.household.monthly"

        /// Annual presented first per DR-24: the paywall lists products in
        /// this order.
        static let all = [individualAnnual, individualMonthly, householdAnnual, householdMonthly]
    }

    enum Tier: String, CaseIterable {
        case individual
        case household

        var displayName: String {
            switch self {
            case .individual: return "Coiny Individual"
            case .household: return "Coiny Household"
            }
        }

        /// What the tier includes, per section 25.1. Also the "contents" part
        /// of the pre-purchase disclosure (S-30).
        var features: [String] {
            switch self {
            case .individual:
                return ["12 connections", "3 goals", "all guardrails", "full debt tooling", "2 years of history"]
            case .household:
                return ["up to 5 members", "unlimited connections", "portfolio guardrails", "unlimited history"]
            }
        }
    }

    static func tier(for productID: String) -> Tier? {
        switch productID {
        case ProductID.individualAnnual, ProductID.individualMonthly: return .individual
        case ProductID.householdAnnual, ProductID.householdMonthly: return .household
        default: return nil
        }
    }

    static func isAnnual(_ productID: String) -> Bool {
        productID == ProductID.individualAnnual || productID == ProductID.householdAnnual
    }

    static func productID(tier: Tier, annual: Bool) -> String {
        switch (tier, annual) {
        case (.individual, true): return ProductID.individualAnnual
        case (.individual, false): return ProductID.individualMonthly
        case (.household, true): return ProductID.householdAnnual
        case (.household, false): return ProductID.householdMonthly
        }
    }

    /// The Apple 3.1.2(c) disclosure shown before purchase: period, renewal,
    /// price, contents and the cancellation path, in the S-30 shape. `price`
    /// is the localized `Product.displayPrice`, never a hardcoded amount.
    static func disclosure(tier: Tier, price: String, annual: Bool) -> String {
        let period = annual ? "year" : "month"
        let renews = annual ? "yearly" : "monthly"
        let contents = tier.features.joined(separator: ", ")
        return "\(tier.displayName), \(price)/\(period). Renews \(renews) until cancelled"
            + " in Settings > Apple Account > Subscriptions. Includes \(contents)."
    }
}
