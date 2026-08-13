import Foundation

/// Everything one goal row renders.
struct GoalDisplay: Equatable, Sendable {
    let name: String
    /// 0 to 1 when the current amount is known; nil renders no bar, never an
    /// empty one (an empty bar reads as zero, which would be a lie).
    let progress: Double?
    let percentText: String?
    /// "$1,240 of $4,000", nil when the current amount is unknown.
    let amountLine: String?
    /// "Ahead" / "On pace" / "Behind" / "Off pace" / "Done". Nil while the
    /// pace is unknowable: null NEVER renders as a band (R-7.8).
    let bandLabel: String?
    /// The pace sentence: a gap action (S-14), the too-early text, or the
    /// dateless contribution line.
    let statusLine: String?
}

/// Everything one guardrail row renders.
struct GuardrailDisplay: Equatable, Sendable {
    let label: String
    /// "week" or "month" (R-7.12: never a day).
    let periodNoun: String
    let outcomeText: String
    /// "3 weeks running", nil at zero: an absent streak is not a failure.
    let streakText: String?
    /// "2 repair tokens banked", nil for guardrails that cannot be measured.
    let repairText: String?
    /// True when the guardrail could not be judged; rows carry the reason in
    /// `outcomeText`, never a failure state.
    let isIndeterminate: Bool
}

/// Pure derivation of goal and guardrail rows. No SwiftUI imports:
/// unit-testable without a layout pass.
enum JourneyPresentation {
    // MARK: - Goals

    static func display(for goal: TargetGoal, now: Date = Date()) -> GoalDisplay {
        let pace = goal.pace
        let current = pace?.currentAmountUsd

        var progress: Double?
        var percentText: String?
        var amountLine: String?
        if let current, goal.targetAmountUsd > 0 {
            let fraction = min(max(current / goal.targetAmountUsd, 0), 1)
            progress = fraction
            percentText = HomePresentation.percentText(fraction)
            amountLine = "\(HomePresentation.currency(current)) of \(HomePresentation.currency(goal.targetAmountUsd))"
        }

        if goal.achievedAt != nil {
            return GoalDisplay(
                name: goal.name,
                progress: progress,
                percentText: percentText,
                amountLine: amountLine,
                bandLabel: "Done",
                statusLine: "Fully funded."
            )
        }

        // A null band means "too early to say", never zero and never "Off
        // pace" (R-7.8). Each null cause gets its own honest sentence. The
        // server sets a band only when it computed a real pace (or the goal is
        // fully funded), so a present band is trusted as-is.
        guard let pace, let band = pace.band else {
            return GoalDisplay(
                name: goal.name,
                progress: progress,
                percentText: percentText,
                amountLine: amountLine,
                bandLabel: nil,
                statusLine: unknownPaceLine(for: goal)
            )
        }

        return GoalDisplay(
            name: goal.name,
            progress: progress,
            percentText: percentText,
            amountLine: amountLine,
            bandLabel: bandLabel(band),
            statusLine: statusLine(for: band, goal: goal, now: now)
        )
    }

    static func bandLabel(_ band: PaceBand) -> String {
        switch band {
        case .ahead: return "Ahead"
        case .onPace: return "On pace"
        case .behind: return "Behind"
        case .offPace: return "Off pace"
        }
    }

    /// Why the pace is unknowable, in order of specificity (R-7.8's three
    /// deliberate null cases).
    private static func unknownPaceLine(for goal: TargetGoal) -> String {
        guard let pace = goal.pace else {
            return "Too early to say. The nightly check has not run yet."
        }
        if goal.targetDate == nil {
            if let rate = pace.actualRunRateUsd, rate > 0 {
                return "No date set. \(HomePresentation.currency(rate)) a month going in lately."
            }
            return "No date set. Contributions will show here as they arrive."
        }
        if pace.currentAmountUsd == nil {
            return "Too early to say. I cannot read this goal's balance yet."
        }
        if pace.actualRunRateUsd == nil {
            return "Too early to say. A few more weeks of activity and I can read the pace."
        }
        return "Too early to say."
    }

    /// The pace sentence for a known band. Off-pace copy never says "you are
    /// behind": it says the date moved, or what gets it back (S-14).
    private static func statusLine(for band: PaceBand, goal: TargetGoal, now: Date) -> String? {
        switch band {
        case .ahead, .onPace:
            return nil
        case .behind, .offPace:
            guard let action = goal.pace?.gapAction else { return nil }
            switch action {
            case let .addMonthly(amountUsd):
                return "+\(HomePresentation.currency(amountUsd))/month gets you back."
            case let .pushDate(weeks):
                if let moved = movedDateText(targetDate: goal.targetDate, weeks: weeks, now: now) {
                    return "At this rate the date moves to \(moved)."
                }
                return "At this rate the date moves about \(weeks) week\(weeks == 1 ? "" : "s")."
            }
        }
    }

    /// "March 14", with the year appended when it is not the current year.
    static func movedDateText(targetDate: String?, weeks: Int, now: Date = Date()) -> String? {
        guard let targetDate, let base = isoDay(targetDate) else { return nil }
        let moved = base.addingTimeInterval(TimeInterval(weeks) * 7 * 86_400)
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .current
        let style = Date.FormatStyle(calendar: calendar, timeZone: calendar.timeZone)
        if calendar.component(.year, from: moved) == calendar.component(.year, from: now) {
            return moved.formatted(style.month(.wide).day())
        }
        return moved.formatted(style.month(.wide).day().year())
    }

    private static func isoDay(_ day: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.date(from: day)
    }

    // MARK: - Guardrails

    static func display(for guardrail: GuardrailStatus) -> GuardrailDisplay {
        let noun = guardrail.period == "week" ? "week" : "month"

        // Two launch guardrails have no honest data source yet; the reason is
        // rendered, never a failure (R-7.11).
        if guardrail.unavailableReason != nil {
            return GuardrailDisplay(
                label: guardrail.label,
                periodNoun: noun,
                outcomeText: unavailableText(for: guardrail.key),
                streakText: nil,
                repairText: nil,
                isIndeterminate: true
            )
        }

        let outcomeText: String
        var isIndeterminate = false
        if let latest = guardrail.latest {
            switch latest.outcome {
            case "passed":
                outcomeText = "Held this \(noun)."
            case "missed" where latest.repairUsed:
                outcomeText = "Missed last \(noun). A repair token kept the streak."
            case "missed":
                outcomeText = "Missed last \(noun). The counter reset, nothing else."
            case "not_applicable":
                outcomeText = "Nothing to measure yet."
            default:
                // 'indeterminate', legacy 'pending', or anything unknown:
                // we could not judge, which is never rendered as a miss.
                outcomeText = "Too early to say for this \(noun)."
                isIndeterminate = true
            }
        } else {
            outcomeText = "First \(noun) still open."
            isIndeterminate = true
        }

        let streakText: String? =
            guardrail.streak > 0
            ? "\(guardrail.streak) \(noun)\(guardrail.streak == 1 ? "" : "s") running"
            : nil
        let repairText = "\(guardrail.repairTokens) repair token\(guardrail.repairTokens == 1 ? "" : "s") banked"

        return GuardrailDisplay(
            label: guardrail.label,
            periodNoun: noun,
            outcomeText: outcomeText,
            streakText: streakText,
            repairText: repairText,
            isIndeterminate: isIndeterminate
        )
    }

    /// User-facing copy for the two sourceless guardrails. The server's
    /// `unavailableReason` cites spec sections; these say the same thing in
    /// app voice. Unknown keys fall back to a generic honest line.
    private static func unavailableText(for key: String) -> String {
        switch key {
        case "utilization_before_close":
            return "Not measurable yet. Needs statement dates and card limits no connection provides."
        case "debt_principal_paid":
            return "Not measurable yet. Needs payments matched to each debt, which is not built."
        default:
            return "Not measurable yet."
        }
    }

    // MARK: - Rung skips

    /// Display copy for a stored skip-reason token. Unrecognised tokens (or
    /// legacy free-text reasons) render as-is.
    static func skipReasonText(_ raw: String?) -> String? {
        guard let raw else { return nil }
        switch RungSkipReason(rawValue: raw) {
        case .handledElsewhere: return "Handled outside Coiny."
        case .notRelevant: return "Not relevant to me."
        case .notNow: return "Coming back to this later."
        case nil: return raw
        }
    }

    /// Reason-picker menu labels (R-7.4).
    static func skipMenuLabel(_ reason: RungSkipReason) -> String {
        switch reason {
        case .handledElsewhere: return "I handle this elsewhere"
        case .notRelevant: return "Not relevant to me"
        case .notNow: return "Coming back later"
        }
    }
}
