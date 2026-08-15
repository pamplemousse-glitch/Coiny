import SwiftUI

/// Create or edit one target goal (R-7.7). Presented as a sheet from the
/// journey's GOALS block. The three-active cap is enforced server-side; when
/// the server refuses a fourth goal this renders the archive prompt, not a
/// generic failure (R-7.9).
struct GoalEditorView: View {
    let store: JourneyStore
    @State var draft: GoalDraft
    var onDone: () -> Void

    @State private var isSaving = false
    @State private var outcome: JourneyStore.SaveOutcome?
    @State private var confirmArchive = false

    private var isEditing: Bool { draft.id != nil }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $draft.name)
                        .accessibilityIdentifier("goal.editor.name")
                    TextField("Emoji (optional)", text: $draft.emoji)
                        .onChange(of: draft.emoji) { _, newValue in
                            if newValue.count > 2 { draft.emoji = String(newValue.prefix(2)) }
                        }
                    Picker("Kind", selection: $draft.kind) {
                        Text("Save").tag(GoalKind.save)
                        Text("Pay off").tag(GoalKind.payoff)
                        Text("Purchase").tag(GoalKind.purchase)
                    }
                }

                Section {
                    TextField("Target amount in dollars", text: $draft.amountText)
                        .keyboardType(.decimalPad)
                        .accessibilityIdentifier("goal.editor.amount")
                    Toggle("Has a target date", isOn: $draft.hasTargetDate)
                    if draft.hasTargetDate {
                        DatePicker("Target date", selection: $draft.targetDate, displayedComponents: .date)
                        Toggle("Repeats every year", isOn: $draft.recurringAnnual)
                    }
                    Toggle("Count what is already saved", isOn: $draft.countsExistingBalance)
                } footer: {
                    // Honest cold-start framing: without a date the pace math
                    // deliberately stays silent (R-7.8).
                    Text(
                        draft.hasTargetDate
                            ? "The nightly check paces you to the date."
                            : "Without a date there is no pace, only contributions."
                    )
                }

                if let outcome, outcome != .saved {
                    Section {
                        Text(outcomeText(outcome))
                            .font(.subheadline)
                            .foregroundStyle(CoinyTheme.ink)
                            .accessibilityIdentifier("goal.editor.outcome")
                    }
                }

                if let id = draft.id {
                    Section {
                        Button("Archive this goal", role: .destructive) {
                            confirmArchive = true
                        }
                        .confirmationDialog(
                            "Archive this goal? Its history stays and its slot frees up.",
                            isPresented: $confirmArchive,
                            titleVisibility: .visible
                        ) {
                            Button("Archive", role: .destructive) {
                                Task { await archive(id: id) }
                            }
                        }
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit goal" : "New goal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", action: onDone)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isSaving ? "Saving…" : "Save") {
                        Task { await save() }
                    }
                    .disabled(!draft.isValid || isSaving)
                    .accessibilityIdentifier("goal.editor.save")
                }
            }
        }
    }

    private func outcomeText(_ outcome: JourneyStore.SaveOutcome) -> String {
        switch outcome {
        case .limitReached:
            return "You already have three active goals. Archive one to start another."
        case .failed:
            return "That did not save. Nothing changed. Try again."
        case .saved:
            return ""
        }
    }

    private func save() async {
        isSaving = true
        let result = await store.save(draft)
        isSaving = false
        outcome = result
        if result == .saved { onDone() }
    }

    private func archive(id: Int) async {
        isSaving = true
        let ok = await store.archive(id: id)
        isSaving = false
        if ok {
            onDone()
        } else {
            outcome = .failed
        }
    }
}
