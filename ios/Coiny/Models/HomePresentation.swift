import Foundation

/// What the placeholder creature is doing. Derived, never stored (the server's
/// `stage` is the creature's form; this is its momentary behaviour).
enum CreatureCondition: Equatable, Sendable {
    /// No connected account yet. Present, patient, looking around. Never
    /// distressed: this is the state a new user sees most (PRD 8.3).
    case disconnected
    case idle
    /// Low energy is a nap, not a wound (design-direction 4.5).
    case sleeping
    /// Transient, driven by a fresh reaction; returns to idle.
    case celebrating
    case concerned
}

/// The single optional action on the collapsed Home (design-direction 6.1:
/// exactly one action button, or none).
enum HomeAction: Equatable, Sendable {
    case connectAccount
}

/// One row of the expanded journey.
struct JourneyRow: Identifiable, Equatable, Sendable {
    enum Detail: Equatable, Sendable {
        case done(reopened: Bool)
        case active(ActiveRungDisplay)
        case pending
        case skipped(reason: String?)
        case notApplicable
    }

    let id: Int
    let name: String
    let blurb: String
    let detail: Detail
}

/// Everything the active-rung block renders, collapsed or expanded.
struct ActiveRungDisplay: Equatable, Sendable {
    /// "RUNG 4"
    let code: String
    /// "BUFFER"
    let nameTag: String
    /// The rung's one-line meaning.
    let blurb: String
    /// 0 to 1, nil when indeterminate.
    let progress: Double?
    /// "62%", nil when indeterminate.
    let percentText: String?
    /// "$7,440 of $12,000", unit-aware per rung. Nil when there is nothing
    /// honest to show.
    let detailLine: String?
    /// "Too early to say." plus what would resolve it. Non-nil exactly when
    /// the rung is indeterminate; never rendered as zero, never as a failure.
    let indeterminateText: String?
}

/// Pure derivation of everything HomeView renders from a `PetState`.
/// No SwiftUI imports: unit-testable without a layout pass.
enum HomePresentation {
    // MARK: - Creature

    /// True when no spending account is connected: the ladder has never run,
    /// or rung 0 ("a spending account is connected") is still the active rung.
    static func isDisconnected(_ pet: PetState?) -> Bool {
        guard let pet else { return false }
        guard let ladder = pet.ladder else { return true }
        return ladder.currentRung == 0 && ladder.rungState(0)?.status != .completed
    }

    static func condition(for pet: PetState?) -> CreatureCondition {
        guard let pet else { return .idle }
        if isDisconnected(pet) { return .disconnected }
        if pet.mood < 20 { return .sleeping }
        return .idle
    }

    /// Creature stage 0 to 7 for the placeholder art.
    static func stage(for pet: PetState?) -> Int {
        pet?.stage ?? 0
    }

    // MARK: - Speech

    /// The one speech line under the Window. Nil is a real state: the pet is
    /// asleep (S-32), nothing happened (S-11), or the backend failed (the pet
    /// never announces backend errors, PRD 8.3).
    static func speechLine(for pet: PetState?, now: Date = Date()) -> String? {
        guard let pet else { return nil }
        if isDisconnected(pet) { return nil }
        if condition(for: pet) == .sleeping { return nil }
        guard
            let last = pet.reactionHistory.first,
            now.timeIntervalSince(last.at) < 24 * 60 * 60
        else { return nil }
        let line = last.reaction.reason.trimmingCharacters(in: .whitespacesAndNewlines)
        return line.isEmpty ? nil : line
    }

    // MARK: - Single action

    static func primaryAction(for pet: PetState?) -> HomeAction? {
        guard pet != nil else { return nil }
        return isDisconnected(pet) ? .connectAccount : nil
    }

    // MARK: - Active rung

    static func activeRungDisplay(for pet: PetState?) -> ActiveRungDisplay? {
        guard let pet else { return nil }
        guard let active = pet.ladder?.activeRung else {
            // Ladder has never run: show rung 0 from the catalog, no invented
            // numbers. This is the brand-new-user collapsed state.
            guard let info = RungCatalog.info(0) else { return nil }
            return ActiveRungDisplay(
                code: "RUNG 0",
                nameTag: info.name.uppercased(),
                blurb: info.blurb,
                progress: nil,
                percentText: nil,
                detailLine: nil,
                indeterminateText: nil
            )
        }
        return display(for: active)
    }

    static func display(for active: ActiveRung) -> ActiveRungDisplay {
        if active.indeterminate {
            let hint = RungCatalog.info(active.id)?.indeterminateHint
            let text = hint.map { "Too early to say. \($0)" } ?? "Too early to say."
            return ActiveRungDisplay(
                code: "RUNG \(active.id)",
                nameTag: active.name.uppercased(),
                blurb: active.blurb,
                progress: nil,
                percentText: nil,
                detailLine: nil,
                indeterminateText: text
            )
        }
        return ActiveRungDisplay(
            code: "RUNG \(active.id)",
            nameTag: active.name.uppercased(),
            blurb: active.blurb,
            progress: active.progress,
            percentText: percentText(active.progress),
            detailLine: detailLine(for: active),
            indeterminateText: nil
        )
    }

    // MARK: - Journey rows

    static func journeyRows(for pet: PetState?) -> [JourneyRow] {
        let ladder = pet?.ladder
        return RungCatalog.all.map { info in
            JourneyRow(id: info.id, name: info.name, blurb: info.blurb, detail: detail(info: info, ladder: ladder))
        }
    }

    private static func detail(info: RungInfo, ladder: LadderSnapshot?) -> JourneyRow.Detail {
        guard let ladder else {
            return info.id == 0 ? .active(fallbackDisplay(info)) : .pending
        }
        let status = ladder.rungState(info.id)?.status ?? .pending
        switch status {
        case .completed:
            return .done(reopened: ladder.isReopened(info.id))
        case .active:
            if let active = ladder.activeRung, active.id == info.id {
                return .active(display(for: active))
            }
            return .active(fallbackDisplay(info))
        case .skipped:
            return .skipped(reason: ladder.rungState(info.id)?.skippedReason)
        case .notApplicable:
            return .notApplicable
        case .pending:
            return .pending
        }
    }

    private static func fallbackDisplay(_ info: RungInfo) -> ActiveRungDisplay {
        ActiveRungDisplay(
            code: "RUNG \(info.id)",
            nameTag: info.name.uppercased(),
            blurb: info.blurb,
            progress: nil,
            percentText: nil,
            detailLine: nil,
            indeterminateText: nil
        )
    }

    // MARK: - Accessibility

    /// R-11.2: the Window's label states the creature's condition and the
    /// active rung in words. Numbers may be spoken; they are never drawn
    /// inside the Window (R-4.4).
    static func windowAccessibilityLabel(for pet: PetState?) -> String {
        let conditionPhrase: String
        switch condition(for: pet) {
        case .disconnected: conditionPhrase = "Coiny is waiting for its first account."
        case .sleeping: conditionPhrase = "Coiny is asleep."
        case .celebrating: conditionPhrase = "Coiny is celebrating."
        case .concerned: conditionPhrase = "Coiny noticed something."
        case .idle: conditionPhrase = "Coiny is doing fine."
        }

        guard let active = pet?.ladder?.activeRung else {
            return conditionPhrase
        }
        if active.indeterminate {
            return "\(conditionPhrase) Rung \(active.id), \(active.name), too early to say."
        }
        let percent = Int((active.progress * 100).rounded())
        return "\(conditionPhrase) Rung \(active.id), \(active.name), \(percent) percent complete."
    }

    // MARK: - Formatting

    static func percentText(_ progress: Double) -> String {
        "\(Int((progress.clamped01 * 100).rounded()))%"
    }

    /// Unit-aware "have of target" line. The server's `target` field changes
    /// meaning per rung (USD, a rate, or months); see `RUNGS` in ladder.ts.
    static func detailLine(for active: ActiveRung) -> String? {
        guard !active.indeterminate, let target = active.target else { return nil }
        let have = Swift.max(target - (active.gap ?? 0), 0)
        switch active.id {
        case 1, 4, 7:
            return "\(currency(have)) of \(currency(target))"
        case 3:
            let gap = active.gap ?? 0
            return gap > 0 ? "\(currency(gap)) left above 10% interest" : nil
        case 5:
            return "\(ratePercent(have)) of \(ratePercent(target)) of take-home"
        case 6:
            return "\(months(have)) of \(months(target)) months"
        default:
            return nil
        }
    }

    /// The single currency formatting utility for Home (PRD 12: no hardcoded
    /// currency symbols in new code paths).
    static func currency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value)) ?? ""
    }

    private static func ratePercent(_ rate: Double) -> String {
        "\(Int((rate * 100).rounded()))%"
    }

    private static func months(_ value: Double) -> String {
        value.truncatingRemainder(dividingBy: 1) == 0
            ? String(Int(value))
            : String(format: "%.1f", value)
    }
}

private extension Double {
    var clamped01: Double { Swift.min(Swift.max(self, 0), 1) }
}
