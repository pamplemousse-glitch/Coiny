import SwiftUI

/// One merged debt: the numbers, the rate (with the way to replace an assumed
/// one), the statement close day (the one manual input that earns its
/// friction, R-7.17), and the merge/split affordances for when the automatic
/// matching got it wrong (R-7.13). A doubled balance is fixed here, not by
/// disconnecting a bank.
struct DebtDetailView: View {
    let store: DebtStore
    let debtId: String

    @Environment(\.dismiss) private var dismiss
    @State private var aprText = ""
    @State private var nicknameText = ""
    @State private var isShowingMergePicker = false
    @State private var isConfirmingSplit = false
    @State private var editFailed = false

    private var debt: DebtAccount? { store.debt(id: debtId) }

    var body: some View {
        ScrollView {
            if let debt {
                VStack(alignment: .leading, spacing: 0) {
                    DebtDetailHeader(debt: debt, finding: finding(for: debt))
                    rateSection(debt)
                    statementSection(debt)
                    nicknameSection(debt)
                    sourcesSection(debt)
                    if editFailed {
                        Text("That did not save. Try again.")
                            .font(.footnote)
                            .foregroundStyle(CoinyTheme.ink2)
                            .padding(.top, 16)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 32)
            }
        }
        .background(CoinyTheme.screen)
        .navigationTitle(debt.map(DebtPresentation.displayName(for:)) ?? "Debt")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            nicknameText = debt?.nickname ?? ""
        }
        .onChange(of: debt == nil) { _, isGone in
            // A split or merge can retire this record's id; the list is the
            // place to land, not a blank screen.
            if isGone { dismiss() }
        }
        .sheet(isPresented: $isShowingMergePicker) {
            DebtMergePicker(store: store, debtId: debtId)
        }
        .confirmationDialog(
            "Split this back into its source records?",
            isPresented: $isConfirmingSplit,
            titleVisibility: .visible
        ) {
            Button("These are two different accounts") {
                Task {
                    if await store.split(id: debtId) { dismiss() }
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Each source shows as its own debt again. Nothing is disconnected.")
        }
    }

    private func finding(for debt: DebtAccount) -> DebtPlanFinding? {
        store.plan?.findings.first { $0.isNeverPaysOff && $0.id == debt.debtId }
    }

    // MARK: - Rate

    private func rateSection(_ debt: DebtAccount) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionHeader("RATE")
            Text(DebtPresentation.aprLine(for: debt))
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink)
                .fixedSize(horizontal: false, vertical: true)

            if debt.aprAssumed {
                Text(
                    "The assumption is deliberately high so this debt's cost is never understated. "
                        + "The real rate is on your statement."
                )
                .font(.footnote)
                .foregroundStyle(CoinyTheme.ink2)
                .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 12) {
                TextField("APR, like 21.99", text: $aprText)
                    .keyboardType(.decimalPad)
                    .font(.system(.body, design: .monospaced))
                    .padding(10)
                    .background(CoinyTheme.surface, in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(CoinyTheme.rule, lineWidth: 1))
                    .frame(maxWidth: 180)
                    .accessibilityLabel("Annual percentage rate")
                    .accessibilityIdentifier("debts.detail.apr.field")
                Button("Save rate") {
                    Task { await saveApr() }
                }
                .font(.body.weight(.semibold))
                .foregroundStyle(CoinyTheme.signal)
                .frame(minHeight: 44)
                .disabled(parsedApr == nil)
                .accessibilityIdentifier("debts.detail.apr.save")
            }

            if debt.aprOverride != nil {
                Button("Clear my rate and use the reported one") {
                    Task {
                        editFailed = await !store.saveAprOverride(id: debtId, apr: nil)
                    }
                }
                .font(.footnote.weight(.semibold))
                .foregroundStyle(CoinyTheme.signal)
                .frame(minHeight: 44)
            }
        }
        .padding(.top, 28)
    }

    private var parsedApr: Double? {
        let cleaned = aprText.replacingOccurrences(of: ",", with: ".").trimmingCharacters(in: .whitespaces)
        guard let value = Double(cleaned), value >= 0, value <= 100 else { return nil }
        return value
    }

    private func saveApr() async {
        guard let value = parsedApr else { return }
        let saved = await store.saveAprOverride(id: debtId, apr: value)
        editFailed = !saved
        if saved { aprText = "" }
    }

    // MARK: - Statement close day (R-7.17)

    private func statementSection(_ debt: DebtAccount) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionHeader("STATEMENT")
            Text(
                "The close day is the one thing no provider reports. "
                    + "With it, Coiny can warn before a high balance hits your statement."
            )
            .font(.footnote)
            .foregroundStyle(CoinyTheme.ink2)
            .fixedSize(horizontal: false, vertical: true)
            HStack(spacing: 16) {
                Picker("Statement close day", selection: closeDayBinding(debt)) {
                    Text("Not set").tag(0)
                    ForEach(1...31, id: \.self) { day in
                        Text("Day \(day)").tag(day)
                    }
                }
                .pickerStyle(.menu)
                .tint(CoinyTheme.signal)
                .frame(minHeight: 44)
                .accessibilityIdentifier("debts.detail.closeDay")
                if let dueDay = debt.dueDay {
                    Text("Payment due day \(dueDay)")
                        .font(.footnote)
                        .foregroundStyle(CoinyTheme.ink3)
                }
            }
        }
        .padding(.top, 28)
    }

    private func closeDayBinding(_ debt: DebtAccount) -> Binding<Int> {
        Binding(
            get: { debt.statementCloseDay ?? 0 },
            set: { newValue in
                Task {
                    editFailed = await !store.saveStatementCloseDay(
                        id: debtId,
                        day: newValue == 0 ? nil : newValue
                    )
                }
            }
        )
    }

    // MARK: - Nickname

    private func nicknameSection(_ debt: DebtAccount) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionHeader("NAME")
            TextField(debt.issuer, text: $nicknameText)
                .font(.body)
                .padding(10)
                .background(CoinyTheme.surface, in: RoundedRectangle(cornerRadius: 8))
                .overlay(RoundedRectangle(cornerRadius: 8).stroke(CoinyTheme.rule, lineWidth: 1))
                .submitLabel(.done)
                .onSubmit {
                    Task {
                        editFailed = await !store.saveNickname(id: debtId, nickname: nicknameText)
                    }
                }
                .accessibilityLabel("Nickname for this debt")
                .accessibilityIdentifier("debts.detail.nickname")
        }
        .padding(.top, 28)
    }

    // MARK: - Sources, merge and split

    private func sourcesSection(_ debt: DebtAccount) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionHeader("SOURCES")
            Text(sourcesLine(debt))
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)

            if store.debts.count > 1 {
                Button("Seeing this twice? These are the same account") {
                    isShowingMergePicker = true
                }
                .font(.body.weight(.semibold))
                .foregroundStyle(CoinyTheme.signal)
                .frame(minHeight: 44, alignment: .leading)
                .accessibilityIdentifier("debts.detail.merge")
            }

            if debt.sourceIds.count >= 2 {
                Button("These are two different accounts") {
                    isConfirmingSplit = true
                }
                .font(.body.weight(.semibold))
                .foregroundStyle(CoinyTheme.signal)
                .frame(minHeight: 44, alignment: .leading)
                .accessibilityIdentifier("debts.detail.split")
            }
        }
        .padding(.top, 28)
    }

    private func sourcesLine(_ debt: DebtAccount) -> String {
        let names = debt.sources.map { source -> String in
            switch source {
            case "plaid": return "your bank feed"
            case "spinwheel": return "the credit bureau"
            default: return source
            }
        }
        switch names.count {
        case 0: return "No live source."
        case 1: return "Reported by \(names[0])."
        default: return "Reported by \(names.joined(separator: " and ")), combined into one record."
        }
    }

    private func sectionHeader(_ title: String) -> some View {
        Text(title)
            .font(.system(.caption, design: .monospaced).weight(.medium))
            .foregroundStyle(CoinyTheme.ink3)
            .accessibilityAddTraits(.isHeader)
    }
}

// MARK: - Header

/// The numbers, stated: balance, the R-7.16 primary payment, the demoted
/// minimum, and the utilization when a limit is known.
private struct DebtDetailHeader: View {
    let debt: DebtAccount
    let finding: DebtPlanFinding?

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                if let balance = debt.balance {
                    Text(DebtPresentation.currency(balance))
                        .font(.system(.largeTitle, design: .monospaced).weight(.semibold))
                        .foregroundStyle(CoinyTheme.ink)
                }
                if let tag = DebtPresentation.statusTag(debt.status) {
                    Text(tag)
                        .font(.system(.footnote, design: .monospaced))
                        .foregroundStyle(CoinyTheme.ink3)
                }
            }
            Text("\(DebtPresentation.typeLabel(debt.type)) · \(DebtPresentation.aprLine(for: debt))")
                .font(.footnote)
                .foregroundStyle(debt.aprAssumed ? CoinyTheme.signal : CoinyTheme.ink3)
                .fixedSize(horizontal: false, vertical: true)

            if let finding {
                Text(DebtPresentation.neverPaysOffLine(minPayment: debt.minPayment, finding: finding))
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(CoinyTheme.ink)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 4)
            } else if debt.payment36 > 0 {
                Text(DebtPresentation.clearsIn36Line(payment36: debt.payment36))
                    .font(.subheadline)
                    .foregroundStyle(CoinyTheme.ink2)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.top, 4)
            }
            if let minimum = DebtPresentation.minimumLine(minPayment: debt.minPayment) {
                Text(minimum)
                    .font(.footnote)
                    .foregroundStyle(CoinyTheme.ink3)
            }
        }
        .padding(.top, 20)
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Merge picker

/// "These are the same account": pick which other record this one doubles.
/// The verdict is stored server-side and survives every re-sync.
private struct DebtMergePicker: View {
    let store: DebtStore
    let debtId: String

    @Environment(\.dismiss) private var dismiss
    @State private var mergeFailed = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    Text("Pick the record that shows the same real-world account. The two combine into one debt, counted once.")
                        .font(.subheadline)
                        .foregroundStyle(CoinyTheme.ink2)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.vertical, 16)

                    ForEach(store.debts.filter { $0.debtId != debtId }) { other in
                        Button {
                            Task {
                                if await store.merge(id: debtId, with: other.debtId) {
                                    dismiss()
                                } else {
                                    mergeFailed = true
                                }
                            }
                        } label: {
                            mergeRow(other)
                        }
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("debts.merge.candidate.\(other.debtId)")
                    }

                    if mergeFailed {
                        Text("That did not save. Try again.")
                            .font(.footnote)
                            .foregroundStyle(CoinyTheme.ink2)
                            .padding(.top, 16)
                    }
                }
                .padding(.horizontal, 20)
            }
            .background(CoinyTheme.screen)
            .navigationTitle("Same account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func mergeRow(_ other: DebtAccount) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            VStack(alignment: .leading, spacing: 2) {
                Text(DebtPresentation.displayName(for: other))
                    .font(.body.weight(.medium))
                    .foregroundStyle(CoinyTheme.ink)
                Text(DebtPresentation.typeLabel(other.type))
                    .font(.footnote)
                    .foregroundStyle(CoinyTheme.ink3)
            }
            Spacer(minLength: 8)
            if let balance = other.balance {
                Text(DebtPresentation.currency(balance))
                    .font(.system(.body, design: .monospaced))
                    .foregroundStyle(CoinyTheme.ink)
            }
        }
        .padding(.vertical, 10)
        .frame(minHeight: 44)
        .contentShape(Rectangle())
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(CoinyTheme.rule)
                .frame(height: 1)
        }
        .accessibilityElement(children: .combine)
    }
}
