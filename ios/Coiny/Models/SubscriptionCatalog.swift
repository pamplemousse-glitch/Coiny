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

        /// What the tier includes. Also the "contents" part of the
        /// pre-purchase disclosure (S-30), which is why this list is the one
        /// piece of copy in the app that may only ever name things the server
        /// actually enforces: Apple 3.1.2(c) requires the purchase screen to
        /// describe what the user gets for the price, and selling four things
        /// and delivering one is the exposure.
        ///
        /// PRD section 25.1 sells more than this. The gap is deliberate and it
        /// is the copy that moved, not the plan. Each line comes back the day
        /// its gate lands in the backend:
        ///
        ///   "3 goals": `MAX_ACTIVE_GOALS` is 3 for every tier including free
        ///     (`backend/src/store/target-goals.ts`), so goals are not a paid
        ///     difference today. `TIER_LIMITS.activeGoals` exists and nothing
        ///     reads it.
        ///   "all guardrails": all seven guardrails are evaluated and returned
        ///     for every tier, free included (`GUARDRAILS` in
        ///     `backend/src/goals/guardrails.ts`, evaluated by
        ///     `evaluateGuardrailPeriods`, served unfiltered by
        ///     `guardrailViews`). `TIER_LIMITS.guardrails` caps free at 2 and
        ///     nothing reads it, so "all" is what everybody already has.
        ///   "2 years of history" / "unlimited history": there is no history
        ///     endpoint. `getNetWorthSeries` has no callers.
        ///   "full debt tooling": the debt layer is available on every tier.
        ///   "up to 5 members": `addHouseholdMember` enforces the cap of 5,
        ///     but no invite or consent flow is exposed over HTTP, so nobody
        ///     can be added to a household. Household therefore sells only the
        ///     connection limit today, which is a product question as much as
        ///     a copy one.
        ///
        /// "Bank connections", not "connections": `countLiveConnections`
        /// counts Plaid items only, so Coinbase, Kraken and YNAB do not
        /// consume the allowance and the word has to say so.
        var features: [String] {
            switch self {
            case .individual:
                return ["12 live bank connections"]
            case .household:
                return ["unlimited bank connections"]
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
