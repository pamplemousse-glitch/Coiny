import StoreKit
import SwiftUI

struct SettingsView: View {
    @Environment(PetStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @AppStorage("onboardingComplete") private var onboardingComplete: Bool = false
    @AppStorage("bankLinked") private var bankLinked: Bool = false
    @State private var showDeleteAlert = false
    @State private var deleteFailed = false
    @State private var isUnlinkingBank = false
    @State private var showManageSubscriptions = false
    @State private var showRefundSheet = false
    @State private var isRevokingSessions = false
    @State private var showRevokeResult = false
    @State private var revokeFailed = false
    @State private var revokedCount = 0
    @State private var repairVM = ConnectionRepairViewModel()
    @State private var presentedDocument: LegalDocument?
    /// The "Share usage data" toggle (docs/legal/consent-copy.md section 2).
    /// Defaults on because consent was given at sign-in; the same key is what
    /// `TelemetryConsent` reads before enqueuing anything.
    @AppStorage(TelemetryConsent.shareUsageDataKey) private var shareUsageData: Bool = true
    /// Persisted, not `@State`: a change that never reached the server has to
    /// outlive this sheet, or the next open would pull the stale server value
    /// back over the user's decision.
    @AppStorage("shareUsageDataPendingSync") private var usageDataSyncFailed: Bool = false

    var body: some View {
        NavigationStack {
            Form {
                bankSection

                if let goals = store.pet?.goals {
                    Section("Current goals") {
                        LabeledContent("Savings target") {
                            Text("$\(goals.savingsGoal)")
                                .monospacedDigit()
                                .foregroundStyle(CoinyTheme.ink2)
                        }
                        LabeledContent("Min paycheck") {
                            Text("$\(goals.paycheckMinAmount)")
                                .monospacedDigit()
                                .foregroundStyle(CoinyTheme.ink2)
                        }
                        LabeledContent("Large purchase") {
                            Text("$\(goals.largePurchaseThreshold)")
                                .monospacedDigit()
                                .foregroundStyle(CoinyTheme.ink2)
                        }
                    }
                    .listRowBackground(CoinyTheme.surface)

                    // Only when there is something in it. A Section renders its
                    // header whether or not the ForEach produces rows, so an
                    // empty budget map drew a "Weekly budgets" heading over
                    // nothing, which reads as a screen that failed to load.
                    if !goals.weeklyBudgetByCategory.isEmpty {
                        Section("Weekly budgets") {
                            ForEach(goals.weeklyBudgetByCategory.sorted(by: { $0.key < $1.key }),
                                    id: \.key) { category, amount in
                                LabeledContent(category.capitalized) {
                                    Text("$\(Int(amount))")
                                        .monospacedDigit()
                                        .foregroundStyle(CoinyTheme.ink2)
                                }
                            }
                        }
                        .listRowBackground(CoinyTheme.surface)
                    }
                }

                subscriptionSection

                privacySection

                legalSection

                Section("About") {
                    // The backend this build actually resolved, not a literal.
                    // It was hardcoded to the Fly host, so a simulator run
                    // against localhost reported that it was talking to
                    // staging. The one row whose entire job is to tell you
                    // which environment you are in has to be derived from the
                    // value the client uses, or it is worse than absent.
                    LabeledContent("Backend") {
                        Text(API.Endpoint.baseURL.host ?? API.Endpoint.baseURL.absoluteString)
                            .font(.caption.monospaced())
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                    LabeledContent("Version") {
                        Text(Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "0.1.0")
                            .font(.caption.monospaced())
                            .foregroundStyle(CoinyTheme.ink2)
                    }
                }
                .listRowBackground(CoinyTheme.surface)

                Section("Account") {
                    Button("Sign out", role: .destructive) {
                        // Explicit sign-out wipes cached display data (R-18.1).
                        // Session-expiry sign-out deliberately does not.
                        NetWorthCache.shared.clear()
                        NotificationCenter.default.post(name: .coinySignedOut, object: nil)
                    }
                    // The only path that ends a session on a device you no
                    // longer hold. Sign in here on the replacement phone, then
                    // run this; the stolen device is signed out and this one
                    // is not.
                    Button(isRevokingSessions ? "Signing out other devices…" : "Sign out other devices") {
                        Task { await revokeOtherSessions() }
                    }
                    .disabled(isRevokingSessions)
                    Button("Delete account", role: .destructive) {
                        showDeleteAlert = true
                    }
                }
                .listRowBackground(CoinyTheme.surface)
                .alert("Other devices signed out", isPresented: $showRevokeResult) {
                    Button("OK", role: .cancel) {}
                } message: {
                    Text(revokedCount == 1
                         ? "1 other session was ended. This device is still signed in."
                         : "\(revokedCount) other sessions were ended. This device is still signed in.")
                }
                .alert("Could not sign out other devices", isPresented: $revokeFailed) {
                    Button("OK", role: .cancel) {}
                } message: {
                    Text("Nothing was changed. Check your connection and try again.")
                }
                .alert("Delete Account?", isPresented: $showDeleteAlert) {
                    Button("Delete", role: .destructive) {
                        Task {
                            // Sign out only when the server confirms deletion. Swallowing the
                            // error and signing out anyway told the user "this permanently
                            // deletes your account and all data" while the data survived, which
                            // is both false and an App Review 5.1.1(v) defect.
                            do {
                                _ = try await API.shared.deleteAccount()
                                NetWorthCache.shared.clear()
                                NotificationCenter.default.post(name: .coinySignedOut, object: nil)
                            } catch {
                                deleteFailed = true
                            }
                        }
                    }
                    Button("Cancel", role: .cancel) {}
                } message: {
                    Text("This permanently deletes your Coiny account and all data. This cannot be undone.")
                }
                .alert("Could not delete account", isPresented: $deleteFailed) {
                    Button("OK", role: .cancel) {}
                } message: {
                    Text("Your account was not deleted and you are still signed in. Check your connection and try again.")
                }

                Section("Debug") {
                    Button("Reset onboarding", role: .destructive) {
                        onboardingComplete = false
                    }
                }
                .listRowBackground(CoinyTheme.surface)
            }
            // A Form paints its own grouped background, so the theme colour has
            // to replace it rather than sit behind it.
            .scrollContentBackground(.hidden)
            .background(CoinyTheme.screen)
            // The rows needed the same treatment and never got it: hiding the
            // scroll background left every row on the system grouped colour,
            // #FFFFFF in light and #2C2C2E in dark. On dark that is a cold
            // grey sitting on the warm #151711 screen at 1.30:1, which is why
            // Settings reads as a different app than the tab it opens from.
            // Deliberately NOT `.foregroundStyle(ink, ink2)` on the Form. That
            // fixes the values in one line and silently repaints every button
            // row in `ink` too: "Restore purchases", "Manage subscription" and
            // the destructive "Unlink bank" all rendered as plain body text,
            // losing both the accent that says a row is tappable and the red
            // that says a row is dangerous. Measured on the render, not
            // reasoned about. The values are tokenised individually below.
            .navigationTitle("Settings")
            // An explicit dismiss, not just swipe-to-dismiss. A sheet whose
            // only exit is a drag gesture is unreachable for a VoiceOver user
            // and hard for anyone with a motor impairment (§11), and it also
            // stops working the moment the sheet's content scrolls, which it
            // now does.
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .task {
                await StoreKitService.shared.refreshEntitlements()
                await repairVM.loadItems()
                await loadConsent()
            }
            .sheet(isPresented: Binding(
                get: { repairVM.isPresentingLink },
                set: { repairVM.isPresentingLink = $0 }
            )) {
                if let session = repairVM.session {
                    session.sheet()
                }
            }
        }
        // Attached to the NavigationStack rather than the Form: the Plaid Link
        // sheet above already owns the Form's slot.
        .sheet(item: $presentedDocument) { document in
            LegalDocumentView(document: document)
        }
    }
}

// MARK: - Colour choices the contrast suite asserts on

extension SettingsView {
    /// A `Form` row's label fades to the system tertiary label when the button
    /// is disabled, which is the same "faded into near-invisibility" defect
    /// #220 fixed on the paywall's subscribe button. The unavailable state
    /// needs a different token, not the same one at reduced opacity.
    ///
    /// Measured before the fix: 1.84:1 in light and 2.25:1 in dark. `signal`
    /// is the accent stated outright rather than inherited through
    /// `Color.accentColor`, which does not resolve to the asset outside the
    /// app bundle and measured as the system blue at 3.80:1 here.
    static func refundLabelColor(available: Bool) -> Color {
        available ? CoinyTheme.signal : CoinyTheme.ink2
    }
}

// MARK: - Consent (docs/legal/consent-copy.md section 2)

private extension SettingsView {
    var privacySection: some View {
        Section {
            Toggle("Share usage data", isOn: $shareUsageData)
                .accessibilityIdentifier("settings.shareUsageData")
                .onChange(of: shareUsageData) { _, isOn in
                    Task { await syncUsageData(isOn: isOn) }
                }
            if usageDataSyncFailed {
                Text(Self.usageDataSyncNotice)
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
            }
        } footer: {
            Text(Self.usageDataFooter)
        }
        .listRowBackground(CoinyTheme.surface)
    }

    /// Footer copy from `docs/legal/consent-copy.md:39-41`, verbatim.
    static var usageDataFooter: String {
        """
        Anonymous-style product events tied to your account, like 'app opened' \
        or 'goal completed'. Never amounts, never merchant names. Used only to \
        improve Coiny.
        """
    }

    static var usageDataSyncNotice: String {
        """
        Saved on this device, but we could not reach Coiny to apply it to your \
        account. It will sync next time you open Settings.
        """
    }

    /// The server keeps its own copy of this flag, because the client queue is
    /// only half of the telemetry: the backend emits signup, ladder, guardrail,
    /// item and push events with no client involved. A local toggle that never
    /// reached the server would silence the visible half and leave the rest
    /// running, which is the shape of the finding this closes.
    func syncUsageData(isOn: Bool) async {
        do {
            try await API.shared.setAnalyticsOptOut(!isOn)
            usageDataSyncFailed = false
        } catch {
            usageDataSyncFailed = true
        }
    }

    /// Reconciles with the account on open, so a reinstall does not silently
    /// re-enable collection the user turned off.
    func loadConsent() async {
        // A local change that never landed wins: it is the user's most recent
        // instruction, and pulling the server copy over it would quietly undo
        // the one thing this toggle exists to do.
        if usageDataSyncFailed {
            await syncUsageData(isOn: shareUsageData)
            return
        }
        guard let consent = try? await API.shared.getConsent() else { return }
        let serverValue = !consent.analyticsOptOut
        if serverValue != shareUsageData {
            shareUsageData = serverValue
        }
    }
}

// MARK: - Legal (Apple requires both links in the binary for subscriptions)

private extension SettingsView {
    var legalSection: some View {
        Section("Legal") {
            ForEach(LegalDocument.allCases) { document in
                Button(document.title) { presentedDocument = document }
                    .foregroundStyle(.primary)
                    .frame(minHeight: 44)
                    .accessibilityIdentifier("settings.legal.\(document.rawValue)")
            }
            LabeledContent("Contact") {
                Link("contact@athanorworks.com", destination: URL(string: "mailto:contact@athanorworks.com")!)
                    .font(.callout)
            }
        }
        .listRowBackground(CoinyTheme.surface)
    }

    @MainActor
    private func revokeOtherSessions() async {
        isRevokingSessions = true
        defer { isRevokingSessions = false }
        do {
            revokedCount = try await API.shared.revokeOtherSessions()
            showRevokeResult = true
        } catch {
            revokeFailed = true
        }
    }
}

// MARK: - Bank connection health (R-8.5 to R-8.7)

private extension SettingsView {
    var bankSection: some View {
        Section("Bank account") {
            if bankLinked {
                if repairVM.items.isEmpty {
                    LabeledContent("Status") {
                        Label("Linked", systemImage: "checkmark.circle.fill")
                    }
                } else {
                    ForEach(repairVM.items) { item in
                        bankItemRow(item)
                    }
                }
                if let repairError = repairVM.errorMessage {
                    Text(repairError)
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                }
                Button(isUnlinkingBank ? "Unlinking…" : "Unlink bank", role: .destructive) {
                    Task {
                        isUnlinkingBank = true
                        _ = try? await API.shared.unlinkBank()
                        bankLinked = false
                        onboardingComplete = false
                        isUnlinkingBank = false
                    }
                }
                .disabled(isUnlinkingBank)
            } else {
                LabeledContent("Status") {
                    Text("Not linked")
                        .foregroundStyle(CoinyTheme.ink2)
                }
            }
        }
        .listRowBackground(CoinyTheme.surface)
    }

    /// One row per Plaid item. Repair opens Link update mode: the existing
    /// access token and history survive, unlike "Reset onboarding".
    func bankItemRow(_ item: PlaidItemHealth) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                // Named per S-17 so a user with several banks knows which row
                // is which; generic only when the server has no institution.
                Text(item.institutionName ?? "Bank connection")
                    .font(.subheadline)
                Text(statusText(item))
                    .font(.caption)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            Spacer()
            if item.repairable {
                Button("Repair") {
                    Task { await repairVM.repair(item: item, source: .settings) }
                }
                .buttonStyle(.bordered)
                .disabled(repairVM.isRepairing)
            } else {
                Label("Healthy", systemImage: "checkmark.circle.fill")
                    .labelStyle(.iconOnly)
                    .accessibilityLabel("Healthy")
            }
        }
        .frame(minHeight: 44)
        .accessibilityElement(children: .combine)
    }

    func statusText(_ item: PlaidItemHealth) -> String {
        switch item.status {
        case .healthy: return "Connected"
        case .reauthRequired: return "Needs you to sign in again"
        case .expiring: return "Access expires soon. Renew now"
        case .revoked: return "Access revoked. Re-link to restore"
        case .error: return "Connection error"
        case .unknown: return "Needs attention"
        }
    }
}

// MARK: - Subscription (R-25.4: restore and refund are reachable from Settings)

private extension SettingsView {
    var subscriptionSection: some View {
        Section("Subscription") {
            LabeledContent("Plan") {
                Text(planName)
                    .foregroundStyle(CoinyTheme.ink2)
            }
            NavigationLink("View plans") {
                PaywallView()
            }
            Button("Restore purchases") {
                Task { await StoreKitService.shared.restorePurchases() }
            }
            Button("Manage subscription") {
                showManageSubscriptions = true
            }
            // Refunds route through Apple; this opens Apple's own sheet.
            //
            // When there is nothing to refund this is text, not a disabled
            // button. `.disabled()` multiplies the label's opacity no matter
            // what colour it is given, which is why the first attempt at this
            // fix still measured 2.90:1 in dark and 2.39:1 in light on the
            // rendered screen while the token pair it used computes 7.17:1. A
            // row that cannot be tapped is not a control, and saying so gives
            // VoiceOver something truer than a dimmed button as well.
            if isRefundAvailable {
                Button("Request a refund") { showRefundSheet = true }
                    .foregroundStyle(Self.refundLabelColor(available: true))
            } else {
                LabeledContent("Request a refund") {
                    Text("No purchases yet")
                        .font(.caption)
                        .foregroundStyle(Self.refundLabelColor(available: false))
                }
                .foregroundStyle(Self.refundLabelColor(available: false))
            }
        }
        .listRowBackground(CoinyTheme.surface)
        .manageSubscriptionsSheet(isPresented: $showManageSubscriptions)
        .refundRequestSheet(
            for: StoreKitService.shared.refundableTransactionID ?? 0,
            isPresented: $showRefundSheet
        )
    }

    var isRefundAvailable: Bool { StoreKitService.shared.refundableTransactionID != nil }

    var planName: String {
        guard let entitlements = StoreKitService.shared.entitlements else { return "Free" }
        return SubscriptionCatalog.Tier(rawValue: entitlements.tier)?.displayName ?? "Free"
    }
}

#Preview {
    SettingsView()
        .environment(PetStore())
}
