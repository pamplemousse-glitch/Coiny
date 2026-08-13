import Foundation

/// Pure presentation logic for the debt surface. Every user-facing sentence
/// this screen produces is built here so the copy rules are unit-testable:
/// state the number, the cost of the choice, and the next action. Never
/// "you owe", never urgency theatre (PRD 7.4, 10).
enum DebtPresentation {

    // MARK: - Assumed APR mirror

    /// Mirror of `ASSUMED_CREDIT_CARD_APR` / `ASSUMED_OTHER_APR` in
    /// `backend/src/debts/strategy.ts`. The API flags an assumption via
    /// `aprAssumed` but does not return the rate it assumed, and showing the
    /// number the math actually used is more honest than the bare word
    /// "assumed". Kept in lockstep by DebtPresentationTests.
    static func assumedAprPercent(for kind: DebtAccount.Kind) -> Double {
        kind == .creditCard ? 24.99 : 12
    }

    /// The rate the plan math runs on: the reported/override rate, else the
    /// stated assumption.
    static func effectiveAprPercent(for debt: DebtAccount) -> Double {
        debt.apr ?? assumedAprPercent(for: debt.type)
    }

    // MARK: - Formatting utilities

    /// Whole-dollar currency via the locale-aware formatter (PRD 12: no
    /// hardcoded currency symbols in new code paths).
    static func currency(_ value: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: value.rounded())) ?? ""
    }

    /// APR display: "24.99%", trimming a trailing ".0".
    static func percent(_ value: Double) -> String {
        let rounded = (value * 100).rounded() / 100
        if rounded.truncatingRemainder(dividingBy: 1) == 0 {
            return "\(Int(rounded))%"
        }
        return String(format: "%.2f%%", rounded)
    }

    /// "August 2029" from a server "yyyy-MM-dd" day string. Month-year is the
    /// honest precision for a multi-year projection; nil in, nil out.
    static func monthYear(from day: String?) -> String? {
        guard let day, let date = parseDay(day) else { return nil }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter.string(from: date)
    }

    static func parseDay(_ day: String) -> Date? {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter.date(from: day)
    }

    // MARK: - The debt card

    static func displayName(for debt: DebtAccount) -> String {
        if let nickname = debt.nickname, !nickname.isEmpty { return nickname }
        return debt.issuer
    }

    static func typeLabel(_ kind: DebtAccount.Kind) -> String {
        switch kind {
        case .creditCard: return "Credit card"
        case .studentLoan: return "Student loan"
        case .mortgage: return "Mortgage"
        case .autoLoan: return "Auto loan"
        case .personalLoan: return "Personal loan"
        case .loan: return "Loan"
        case .other: return "Debt"
        }
    }

    /// Status rendered as a word, never as a colour (R-11). Open is the
    /// unremarkable default and renders nothing.
    static func statusTag(_ status: DebtAccount.Status) -> String? {
        switch status {
        case .open: return nil
        case .delinquent: return "past due"
        case .closed: return "closed"
        }
    }

    /// The APR line. An assumed rate is visibly an assumption with the next
    /// action attached, never presented as fact.
    static func aprLine(for debt: DebtAccount) -> String {
        if debt.aprAssumed {
            let assumed = percent(assumedAprPercent(for: debt.type))
            return "No rate reported. Figures assume \(assumed) until you enter the real one."
        }
        if debt.aprOverride != nil {
            return "\(percent(effectiveAprPercent(for: debt))) APR, entered by you"
        }
        return "\(percent(effectiveAprPercent(for: debt))) APR"
    }

    /// R-7.16: the primary number on every debt card is the payment that
    /// clears it in 36 months, stated with the calendar month it lands on.
    static func clearsIn36Line(payment36: Double, now: Date = Date()) -> String {
        let target = Calendar(identifier: .gregorian).date(byAdding: .month, value: 36, to: now) ?? now
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return "\(currency(payment36)) a month clears this by \(formatter.string(from: target))"
    }

    /// The minimum, demoted and labelled per R-7.16 verbatim.
    static func minimumLine(minPayment: Double?) -> String? {
        guard let minPayment, minPayment > 0 else { return nil }
        return "minimum (the trap): \(currency(minPayment))"
    }

    // MARK: - never_pays_off

    /// The single most important sentence on the screen: the minimum does not
    /// cover the interest. Plain statement, then the payment that fixes it.
    /// Never a blank date, never an absurd year (R-7.15).
    static func neverPaysOffLine(minPayment: Double?, finding: DebtPlanFinding) -> String {
        let fix = "\(currency(finding.clearingPayment36)) a month clears it in 3 years."
        let interest = "Interest adds \(currency(finding.monthlyInterest)) a month."
        if let minPayment, minPayment > 0 {
            return "At \(currency(minPayment)) a month this never pays off. \(interest) \(fix)"
        }
        return "The minimum does not cover the interest, so this never pays off. \(interest) \(fix)"
    }

    // MARK: - The plan headline

    static func planHeadline(plan: DebtPlanResponse) -> String {
        if let date = monthYear(from: plan.debtFreeDate) {
            return "Debt-free \(date). \(currency(plan.totalInterest)) total interest."
        }
        return "No debt-free date at these payments."
    }

    /// The minimums-only comparison (R-7.15: delta in dollars and years).
    static func minimumsOnlyLine(plan: DebtPlanResponse) -> String? {
        let minimums = plan.comparison.minimumsOnly
        guard let planMonths = plan.months, let minMonths = minimums.months else {
            if minimums.months == nil, plan.months != nil {
                return "Minimums only never get there."
            }
            return nil
        }
        let saved = minimums.totalInterest - plan.totalInterest
        let monthsSooner = minMonths - planMonths
        guard saved > 0.5 || monthsSooner > 0 else { return nil }
        return "Minimums only: debt-free \(yearsPhrase(months: monthsSooner)) later"
            + " and \(currency(saved)) more interest."
    }

    static func yearsPhrase(months: Int) -> String {
        if months < 12 {
            return months == 1 ? "1 month" : "\(months) months"
        }
        let years = Double(months) / 12
        let rounded = (years * 10).rounded() / 10
        if rounded.truncatingRemainder(dividingBy: 1) == 0 {
            let whole = Int(rounded)
            return whole == 1 ? "1 year" : "\(whole) years"
        }
        return String(format: "%.1f years", rounded)
    }

    // MARK: - The cost of the choice (R-7.14)

    /// "Blend costs you $214 more than pure avalanche and $806 less than
    /// pure snowball." Always shown, both directions; a strategy picker that
    /// hides its cost is the thing 7.4 argues against.
    static func strategyCostSentence(chosen: DebtStrategy, comparison: DebtPlanResponse.Comparison) -> String {
        let chosenTotal = total(for: chosen, in: comparison)
        let others = DebtStrategy.allCases.filter { $0 != chosen }
        let clauses = others.map { other in
            costClause(delta: chosenTotal - total(for: other, in: comparison), other: strategyReference(other))
        }
        let subject = strategyName(chosen)
        let first = clauses[0]
        let second = clauses[1]
        let firstPart: String
        switch first {
        case let .more(amount, other): firstPart = "\(subject) costs you \(amount) more than \(other)"
        case let .less(amount, other): firstPart = "\(subject) costs \(amount) less than \(other)"
        case let .same(other): firstPart = "\(subject) matches \(other)"
        }
        let secondPart: String
        switch (first, second) {
        case let (.same, .more(amount, other)): secondPart = "costs you \(amount) more than \(other)"
        case let (.same, .less(amount, other)): secondPart = "costs \(amount) less than \(other)"
        case let (_, .more(amount, other)): secondPart = "\(amount) more than \(other)"
        case let (_, .less(amount, other)): secondPart = "\(amount) less than \(other)"
        case let (_, .same(other)): secondPart = "matches \(other)"
        }
        return "\(firstPart) and \(secondPart)."
    }

    static func strategyName(_ strategy: DebtStrategy) -> String {
        switch strategy {
        case .blend: return "Blend"
        case .avalanche: return "Avalanche"
        case .snowball: return "Snowball"
        }
    }

    /// One line under each picker option saying what the order is, so the
    /// choice is about the rule, not a brand name.
    static func strategyBlurb(_ strategy: DebtStrategy) -> String {
        switch strategy {
        case .blend: return "Highest rate first, quick wins promoted"
        case .avalanche: return "Highest rate first"
        case .snowball: return "Smallest balance first"
        }
    }

    private enum CostClause {
        case more(amount: String, other: String)
        case less(amount: String, other: String)
        case same(other: String)
    }

    private static func costClause(delta: Double, other: String) -> CostClause {
        if delta > 0.5 { return .more(amount: currency(delta), other: other) }
        if delta < -0.5 { return .less(amount: currency(-delta), other: other) }
        return .same(other: other)
    }

    private static func strategyReference(_ strategy: DebtStrategy) -> String {
        strategy == .blend ? "blend" : "pure \(strategy.rawValue)"
    }

    private static func total(for strategy: DebtStrategy, in comparison: DebtPlanResponse.Comparison) -> Double {
        switch strategy {
        case .blend: return comparison.blend.totalInterest
        case .avalanche: return comparison.avalanche.totalInterest
        case .snowball: return comparison.snowball.totalInterest
        }
    }

    // MARK: - Payoff order rows

    /// One realized-order row: "2. Chase Freedom, gone March 2027, $1,204
    /// interest." A debt with no payoff date under the plan reads plainly
    /// instead of showing a blank.
    static func orderLine(entry: DebtPlanPerDebt, name: String) -> String {
        guard let date = monthYear(from: entry.payoffDate) else {
            return "\(name): never at these payments"
        }
        var line = "\(name), gone \(date)"
        if entry.interestPaid > 0.5 {
            line += ", \(currency(entry.interestPaid)) interest"
        }
        if entry.aprAssumed {
            line += " (rate assumed)"
        }
        return line
    }

    // MARK: - Totals

    /// Sum of open balances: the number, stated. Grouped under "Owed" like
    /// the Wealth group of the same name, never "you owe".
    static func totalOwed(debts: [DebtAccount]) -> Double {
        debts.filter { $0.status != .closed }
            .reduce(0) { $0 + ($1.balance ?? 0) }
    }
}
