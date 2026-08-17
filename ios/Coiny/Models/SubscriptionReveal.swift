import Foundation

// Assembly logic for the subscription reveal, onboarding screen 6
// (PRD sections 5.5 and 5.6, register row DR-19).
//
// One source: Plaid's own recurring streams, seeded server-side at token
// exchange and available minutes after link.
//
// There used to be two. A local 120-day detector re-derived subscriptions from
// our own stored transactions and, per R-5.5, its numbers overrode Plaid's on
// a merchant conflict. That rule had it backwards: the local detector could
// only ever find a 25-35 day cadence, so it was blind to weekly and annual
// subscriptions by construction, and letting the weaker source win meant a
// yearly charge Plaid had correctly classified could be replaced by nothing at
// all. Deduping two sources of the same fact is also just how the two of them
// drift. The detector is gone; R-5.5's merge rule is moot with one source.
//
// Rows still sort by amount descending and the headline total is still
// annualised as sum(amount x 365 / cadenceDays).

// MARK: - Reveal rows

struct RevealItem: Equatable, Identifiable, Sendable {
    let merchantName: String
    let cadenceDays: Int
    let amountUSD: Double

    var id: String { merchantName.lowercased() }

    var annualisedUSD: Double {
        guard cadenceDays > 0 else { return 0 }
        return amountUSD * 365 / Double(cadenceDays)
    }

    /// Human cadence label for the row, derived from cadence days.
    var cadenceLabel: String {
        switch cadenceDays {
        case ..<10: return "weekly"
        case ..<20: return "every two weeks"
        case ..<45: return "monthly"
        case ..<200: return "quarterly"
        default: return "yearly"
        }
    }
}

// MARK: - Builder

enum RevealBuilder {
    /// Maps a Plaid recurring stream frequency to cadence days.
    /// Frequencies per Plaid's `/transactions/recurring/get` contract.
    static func cadenceDays(forPlaidFrequency frequency: String) -> Int? {
        switch frequency.uppercased() {
        case "WEEKLY": return 7
        case "BIWEEKLY": return 14
        case "SEMI_MONTHLY": return 15
        case "MONTHLY": return 30
        case "ANNUALLY": return 365
        default: return nil
        }
    }

    /// Builds the reveal rows. Only active outflow streams with a usable
    /// amount and cadence qualify: an inflow is the user's paycheck, and a
    /// tombstoned stream is a subscription they already cancelled.
    static func build(streams: [PlaidRecurringStream]) -> [RevealItem] {
        var byMerchant: [String: RevealItem] = [:]

        for stream in streams where stream.direction == "outflow" && stream.isActive {
            guard
                let name = stream.displayName,
                let cadence = cadenceDays(forPlaidFrequency: stream.frequency),
                let amount = stream.bestAmountUSD,
                amount > 0
            else { continue }
            let item = RevealItem(merchantName: name, cadenceDays: cadence, amountUSD: amount)
            // Two streams for the same merchant (for example two cadences):
            // keep the larger annualised one so the total is not double-counted.
            if let existing = byMerchant[item.id], existing.annualisedUSD >= item.annualisedUSD {
                continue
            }
            byMerchant[item.id] = item
        }

        return byMerchant.values.sorted { lhs, rhs in
            if lhs.amountUSD != rhs.amountUSD { return lhs.amountUSD > rhs.amountUSD }
            return lhs.merchantName < rhs.merchantName
        }
    }

    static func annualTotalUSD(_ items: [RevealItem]) -> Double {
        items.reduce(0) { $0 + $1.annualisedUSD }
    }

    /// The S-33 headline with computed numbers.
    static func headline(count: Int, annualTotalUSD: Double) -> String {
        let things = count == 1 ? "1 thing" : "\(count) things"
        let total = MoneyText.usd(annualTotalUSD)
        return "This account pays for \(things) on repeat. \(total) a year. Worth a look before we start?"
    }
}
