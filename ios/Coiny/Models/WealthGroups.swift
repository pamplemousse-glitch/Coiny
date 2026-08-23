import Foundation

// The six fixed Wealth groups (PRD R-7.27) and the pure presentation logic
// that turns the per-class `{ value, asOf, status }` readings (R-8.4) into
// renderable sections. No SwiftUI here: everything is unit-testable.
//
// Grouping choices where the PRD names only the group titles:
// - Liquid: bank-shaped balances (Plaid, TrueLayer, YNAB).
// - Invested: brokerage holdings (Plaid investments, Alpaca).
// - Crypto: exchange and chain holdings (Coinbase, DeFi, chain wallets, Kraken).
// - Owned: physical and declared property, including collectibles (an old
//   price beats a hole in net worth, per the freshness table).
// - Speculative: leveraged or event-priced positions (Hyperliquid perps,
//   Polymarket, Kalshi, NFTs, energy spot positions). Kept apart from Owned
//   because "a Kalshi position lumped with a house misstates risk" (R-7.27).
// - Owed: debts.

enum WealthGroup: String, CaseIterable, Identifiable, Sendable {
    case liquid
    case invested
    case crypto
    case owned
    case speculative
    case owed

    var id: String { rawValue }

    var title: String {
        switch self {
        case .liquid: return "Liquid"
        case .invested: return "Invested"
        case .crypto: return "Crypto"
        case .owned: return "Owned"
        case .speculative: return "Speculative"
        case .owed: return "Owed"
        }
    }
}

/// Mirror of the backend's `NetWorthClassName` union. Order within a group is
/// the render order.
enum WealthClass: String, CaseIterable, Identifiable, Sendable {
    case bank, truelayer, ynab
    case investments, alpaca
    case crypto, defi, chainWallets, kraken
    case realEstate, vehicles, metals, sneakers, pokemonCards, tradingCards, coins, vinyl, farmland, manual, declared
    case hyperliquid, polymarket, kalshi, nft, energy
    case debts

    var id: String { rawValue }

    var group: WealthGroup {
        switch self {
        case .bank, .truelayer, .ynab:
            return .liquid
        case .investments, .alpaca:
            return .invested
        case .crypto, .defi, .chainWallets, .kraken:
            return .crypto
        case .realEstate, .vehicles, .metals, .sneakers, .pokemonCards,
             .tradingCards, .coins, .vinyl, .farmland, .manual, .declared:
            return .owned
        case .hyperliquid, .polymarket, .kalshi, .nft, .energy:
            return .speculative
        case .debts:
            return .owed
        }
    }

    var displayName: String {
        switch self {
        case .bank: return "Bank"
        case .truelayer: return "UK/EU bank"
        case .ynab: return "YNAB"
        case .investments: return "Investments"
        case .alpaca: return "Alpaca"
        case .crypto: return "Coinbase"
        case .defi: return "DeFi"
        case .chainWallets: return "On-chain wallets"
        case .kraken: return "Kraken"
        // Localized because the term genuinely differs by market. The brand
        // names in this switch deliberately are NOT: Coinbase is Coinbase in
        // every locale, and running a trademark through a translation file
        // invites someone to "translate" it.
        case .realEstate:
            return String(
                localized: "wealthClass.realEstate",
                defaultValue: "Real estate",
                comment: "Residential or commercial property. en-GB says 'Property'."
            )
        case .vehicles: return "Vehicles"
        case .metals: return "Precious metals"
        case .sneakers:
            return String(
                localized: "wealthClass.sneakers",
                defaultValue: "Sneakers",
                comment: "Collectible footwear. en-GB says 'Trainers'."
            )
        case .pokemonCards: return "Pokemon cards"
        case .tradingCards: return "Trading cards"
        case .coins: return "Graded coins"
        case .vinyl: return "Vinyl"
        case .farmland: return "Farmland"
        case .manual: return "Declared assets"
        // The onboarding sheet's signed net (S-4: "This is an estimate.").
        // Distinct from `manual`, which is itemised entries added later.
        case .declared: return "Estimates"
        case .hyperliquid: return "Hyperliquid"
        case .polymarket: return "Polymarket"
        case .kalshi: return "Kalshi"
        case .nft: return "NFTs"
        case .energy: return "Energy"
        case .debts: return "Debts"
        }
    }

    /// The provider name used in failure copy (S-18 "Can't reach Coinbase
    /// right now."). Bank-shaped classes read as "your bank".
    var providerName: String {
        switch self {
        case .bank: return "your bank"
        case .truelayer: return "TrueLayer"
        case .ynab: return "YNAB"
        case .investments: return "your broker"
        case .alpaca: return "Alpaca"
        case .crypto: return "Coinbase"
        case .defi: return "Zerion"
        case .chainWallets: return "the chain"
        case .kraken: return "Kraken"
        case .debts: return "the credit bureau"
        case .hyperliquid: return "Hyperliquid"
        case .polymarket: return "Polymarket"
        case .kalshi: return "Kalshi"
        default: return "the price service"
        }
    }
}

/// How one class row renders, per the R-8.4 status table and the
/// engineering-budgets section 2 display tiers. Status is always carried by
/// the label text, never by colour alone (PRD section 11).
enum WealthRowTreatment: Equatable, Sendable {
    /// Fresh: plain number.
    case plain
    /// Cached but usable: value plus age label, tap to refresh (S-16).
    case aged(label: String)
    /// Declared values: always labelled, never excluded (S-29).
    case selfReported(label: String)
    /// Past never-show age: muted last value, excluded from total (S-16).
    case mutedExcluded(label: String)
    /// Fetch failed, no usable cache: reads as a failure, never zero (S-18).
    case failure(message: String)
    /// User revoked: re-link affordance, excluded immediately.
    case disconnected
    /// Credentials lapsed: last value with age plus Reconnect (S-17).
    case reauthRequired(label: String)
    /// Provider pre-warned: value flows plus a renew note.
    case expiring
    /// Connected, first fetch not finished: no value yet, never a zero.
    case pending
}

struct WealthRow: Identifiable, Equatable, Sendable {
    let cls: WealthClass
    let reading: ClassReading
    var id: String { cls.rawValue }
}

struct WealthGroupSection: Identifiable, Equatable, Sendable {
    let group: WealthGroup
    let rows: [WealthRow]
    /// Sum of this group's `ok`/`stale` values only; excluded rows render but
    /// contribute nothing (a failure never reads as a zero). Debts stay
    /// positive here and are labelled "Owed" by the group.
    let includedTotal: Double
    var id: String { group.rawValue }
}

enum WealthPresenter {
    /// Statuses that carry a value the user can rely on, used only for row
    /// *treatment* (is this a number or a failure). It is NOT the rule for what
    /// counts toward a subtotal: `sections(from:)` takes that from the server's
    /// own `excluded` list, for the reason below.
    ///
    /// This function used to decide subtotals as well, and it disagreed with
    /// the server. `networth/classes.ts` counts `reauth_required` in `total`
    /// (a lapsed login does not make the last balance wrong, it makes it
    /// un-refreshable), and this list omitted it. The headline number is always
    /// the server's (R-14.2), so a user whose bank login lapsed saw group
    /// subtotals that did not add up to their net worth, with nothing in
    /// `excluded` to explain the difference. Two copies of one rule in two
    /// languages will drift again, so there is now only one copy: the server's.
    static func hasReliableValue(_ status: ClassStatus) -> Bool {
        status == .ok || status == .stale || status == .expiring || status == .reauthRequired
    }

    /// The six fixed groups from a response. A class whose status is
    /// `not_connected` is never rendered (it belongs in Add an account), and a
    /// group with no renderable rows is not rendered at all (R-7.27).
    ///
    /// Subtotals sum exactly the classes the server put in `total`: its
    /// `excluded.classes` is the complement of that set apart from
    /// `not_connected`, which is never rendered here anyway. So the group
    /// subtotals reconcile to the headline by construction, whatever either
    /// side later decides about a given status.
    static func sections(from response: NetWorthResponse) -> [WealthGroupSection] {
        let excluded = Set(response.excluded.classes)
        var byGroup: [WealthGroup: [WealthRow]] = [:]
        for cls in WealthClass.allCases {
            guard let reading = response.classes[cls.rawValue], reading.status != .notConnected else { continue }
            byGroup[cls.group, default: []].append(WealthRow(cls: cls, reading: reading))
        }
        return WealthGroup.allCases.compactMap { group in
            guard let rows = byGroup[group], !rows.isEmpty else { return nil }
            let total = rows.reduce(0.0) { sum, row in
                excluded.contains(row.cls.rawValue) ? sum : sum + (row.reading.value ?? 0)
            }
            return WealthGroupSection(group: group, rows: rows, includedTotal: total)
        }
    }

    /// Fractions for the stacked composition bar: asset groups only (Owed is
    /// a claim against the assets, not part of the composition), by share of
    /// included positive value. Empty when nothing is included.
    static func compositionSegments(from sections: [WealthGroupSection]) -> [(group: WealthGroup, fraction: Double)] {
        let assetSections = sections.filter { $0.group != .owed && $0.includedTotal > 0 }
        let total = assetSections.reduce(0.0) { $0 + $1.includedTotal }
        guard total > 0 else { return [] }
        return assetSections.map { ($0.group, $0.includedTotal / total) }
    }

    /// The connections worth interrupting someone about, actionable first.
    ///
    /// The split is the one every system in
    /// `docs/connection-resilience-survey.md` A1 draws, and the one Actual
    /// Budget encodes in `showAuth`: a lapsed credential gets a Reconnect
    /// button because only the user can fix it, while a rate limit or a vendor
    /// outage gets told plainly and no button, because prompting someone to
    /// reconnect over a transient failure is how a badge gets ignored.
    static func connectionsNeedingAttention(_ response: NetWorthResponse) -> [ConnectionHealthEntry] {
        (response.connectionHealth ?? []).sorted { lhs, rhs in
            if lhs.actionable != rhs.actionable { return lhs.actionable }
            return lhs.label < rhs.label
        }
    }

    /// Copy for one entry. Says what changed and what to do when the user can
    /// act; says "later" and offers nothing when they cannot.
    static func connectionMessage(_ entry: ConnectionHealthEntry) -> String {
        switch entry.status {
        case .reauthRequired:
            return "\(entry.label) needs you to sign in again."
        case .disconnected:
            return "\(entry.label) was disconnected."
        case .error:
            return "Can’t reach \(entry.label) right now."
        case .pending:
            return "\(entry.label) hasn’t finished its first sync."
        default:
            return "\(entry.label) needs attention."
        }
    }

    /// Display names for the "n accounts not included" footnote list (S-19).
    static func excludedDisplayNames(_ excluded: ExcludedSummary) -> [String] {
        excluded.classes.map { name in
            WealthClass(rawValue: name)?.displayName ?? name
        }
    }

    /// How a row renders. `now` is injected for tests.
    static func treatment(for row: WealthRow, now: Date = Date()) -> WealthRowTreatment {
        // Declared values are always labelled "Self-reported <date>" even when
        // fresh (R-8.2); the server reports them as `ok` and never excludes
        // them.
        if row.cls == .manual || row.cls == .declared, hasReliableValue(row.reading.status) {
            return .selfReported(label: selfReportedLabel(row.reading.asOf))
        }
        let asOfText = row.reading.asOf.map { asOfLabel($0, now: now) }
        switch row.reading.status {
        case .ok:
            return .plain
        case .stale:
            return .aged(label: asOfText ?? "age unknown")
        case .staleExcluded:
            return .mutedExcluded(label: "Stale. Refresh or reconnect.")
        case .error:
            return .failure(message: "Can't reach \(row.cls.providerName) right now.")
        case .disconnected:
            return .disconnected
        case .reauthRequired:
            return .reauthRequired(label: asOfText ?? "age unknown")
        case .expiring:
            return .expiring
        case .pending, .notConnected:
            // notConnected is filtered out by sections(from:); pending if
            // ever reached.
            return .pending
        }
    }

    /// "as of 14:00" today, "as of Tue 14:00" within a week, "as of Aug 3"
    /// beyond (S-16). Calendar and locale injectable for tests.
    static func asOfLabel(
        _ date: Date,
        now: Date = Date(),
        calendar: Calendar = .current,
        locale: Locale = .current
    ) -> String {
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        if calendar.isDate(date, inSameDayAs: now) {
            formatter.setLocalizedDateFormatFromTemplate("jmm")
        } else if let weekAgo = calendar.date(byAdding: .day, value: -6, to: now), date >= weekAgo {
            formatter.setLocalizedDateFormatFromTemplate("EEE jmm")
        } else {
            formatter.setLocalizedDateFormatFromTemplate("MMM d")
        }
        return "as of \(formatter.string(from: date))"
    }

    static func selfReportedLabel(
        _ date: Date?,
        calendar: Calendar = .current,
        locale: Locale = .current
    ) -> String {
        guard let date else { return "Self-reported" }
        let formatter = DateFormatter()
        formatter.locale = locale
        formatter.calendar = calendar
        formatter.timeZone = calendar.timeZone
        formatter.setLocalizedDateFormatFromTemplate("MMM d")
        return "Self-reported \(formatter.string(from: date))"
    }

    /// The always-visible staleness line at the bottom of Wealth (R-7.28).
    static func generatedLabel(
        _ date: Date,
        now: Date = Date(),
        calendar: Calendar = .current,
        locale: Locale = .current
    ) -> String {
        "Updated \(asOfLabel(date, now: now, calendar: calendar, locale: locale).replacingOccurrences(of: "as of ", with: ""))"
    }
}
