import StoreKit
import SwiftUI

/// The subscription paywall (docs/prd.md section 25, R-25.2 to R-25.4).
///
/// Meets Apple 3.1.2(c): before any purchase the screen states the billing
/// period, that the subscription renews, the localized price, what the tier
/// includes, and how to cancel. Restore purchases is always visible. Prices
/// come from StoreKit product data, never hardcoded strings, so the local
/// .storekit configuration and the future App Store Connect products both
/// render truthfully.
struct PaywallView: View {
    @State private var selectedTier: SubscriptionCatalog.Tier = .individual
    @State private var annual = true
    @State private var presentedDocument: LegalDocument?

    private var service: StoreKitService { .shared }

    private var selectedProduct: Product? {
        let id = SubscriptionCatalog.productID(tier: selectedTier, annual: annual)
        return service.products.first { $0.id == id }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                header
                if let current = service.entitlements, current.isPaid {
                    currentPlanBanner(current)
                }
                tierPicker
                periodPicker
                featureList
                disclosure
                subscribeButton
                restoreButton
                legalLinks
                if service.products.isEmpty {
                    unavailableNotice
                }
                if let message = service.lastErrorMessage {
                    CoinyErrorLine(message: message)
                }
            }
            .padding()
        }
        // #218 gave every screen the shared background and this one was
        // missed, so the paywall rendered on `systemBackground`: pure #FFFFFF
        // in light and pure #000000 in dark, beside an app whose own screen is
        // #EDEFE7 / #151711. It is the only screen that asks for money, and it
        // looked like it belonged to a different app.
        .background(CoinyTheme.screen)
        .navigationTitle("Coiny Plans")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await service.loadProducts()
            await service.refreshEntitlements()
        }
        .sheet(item: $presentedDocument) { document in
            LegalDocumentView(document: document)
        }
    }
}

// MARK: - Colour choices the contrast suite asserts on

extension PaywallView {
    /// The border of a tier card is the only thing that distinguishes the
    /// selected plan from the unselected ones, which makes it a control
    /// boundary rather than decoration: WCAG 2.2 1.4.11 asks 3:1 of it.
    ///
    /// Was `Color.secondary.opacity(0.3)`, which rendered at 1.19:1 on the
    /// light screen. Opacity over a semantic colour was the mechanism: it
    /// composites against whatever is behind it and lands somewhere different
    /// in each scheme, and neither result had ever been measured. `ink3` is a
    /// real value in both schemes and `signal` is the accent stated outright
    /// rather than inherited, which is the same defect class as the
    /// AccentColor asset that compiled and was never read.
    static func tierBorderColor(selected: Bool) -> Color {
        selected ? CoinyTheme.signal : CoinyTheme.ink3
    }
}

// MARK: - Sections

private extension PaywallView {
    var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("More room to grow")
                .font(.title2.bold())
            // Describes the free tier by what the server actually enforces.
            // The goal, guardrail and history limits in TIER_LIMITS are not
            // gated anywhere, so naming them here would sell a difference that
            // does not exist. See SubscriptionCatalog.Tier.features.
            Text("The free tier keeps the pet, every ladder rung and 2 live bank connections."
                + " Paid tiers raise the connection limit.")
                .font(.subheadline)
                .foregroundStyle(CoinyTheme.ink2)
        }
    }

    func currentPlanBanner(_ current: EntitlementsResponse) -> some View {
        let name = SubscriptionCatalog.Tier(rawValue: current.tier)?.displayName ?? current.tier
        return Label("You are on \(name).", systemImage: "checkmark.seal")
            .font(.subheadline)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(12)
            .background(.quaternary, in: RoundedRectangle(cornerRadius: 10))
    }

    var tierPicker: some View {
        VStack(spacing: 12) {
            ForEach(SubscriptionCatalog.Tier.allCases, id: \.self) { tier in
                tierCard(tier)
            }
        }
    }

    func tierCard(_ tier: SubscriptionCatalog.Tier) -> some View {
        let selected = tier == selectedTier
        let product = service.products.first {
            $0.id == SubscriptionCatalog.productID(tier: tier, annual: annual)
        }
        return Button {
            selectedTier = tier
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(tier.displayName)
                        .font(.headline)
                    Text(tier.features.joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(CoinyTheme.ink2)
                        .multilineTextAlignment(.leading)
                }
                Spacer()
                Text(product.map { "\($0.displayPrice)/\(annual ? "yr" : "mo")" } ?? "")
                    .font(.subheadline.monospacedDigit())
            }
            .padding(12)
            .frame(minHeight: 44)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .strokeBorder(Self.tierBorderColor(selected: selected), lineWidth: selected ? 2 : 1)
            )
            .contentShape(RoundedRectangle(cornerRadius: 10))
        }
        .buttonStyle(.plain)
        .accessibilityLabel(accessibilityText(for: tier, product: product, selected: selected))
        .accessibilityAddTraits(selected ? [.isSelected] : [])
    }

    func accessibilityText(for tier: SubscriptionCatalog.Tier, product: Product?, selected: Bool) -> String {
        let price = product.map { "\($0.displayPrice) per \(annual ? "year" : "month")" } ?? "price unavailable"
        return "\(tier.displayName), \(price). Includes \(tier.features.joined(separator: ", "))."
    }

    var periodPicker: some View {
        Picker("Billing period", selection: $annual) {
            Text("Annual").tag(true)
            Text("Monthly").tag(false)
        }
        .pickerStyle(.segmented)
    }

    var featureList: some View {
        VStack(alignment: .leading, spacing: 8) {
            ForEach(selectedTier.features, id: \.self) { feature in
                Label(feature.prefix(1).capitalized + feature.dropFirst(), systemImage: "checkmark")
                    .font(.subheadline)
            }
        }
    }

    /// The 3.1.2(c) disclosure (S-30), rendered from live product data.
    var disclosure: some View {
        Group {
            if let product = selectedProduct {
                Text(SubscriptionCatalog.disclosure(tier: selectedTier, price: product.displayPrice, annual: annual))
            } else {
                Text("Subscription prices load from the App Store before purchase.")
            }
        }
        .font(.footnote)
        .foregroundStyle(CoinyTheme.ink2)
    }

    var subscribeButton: some View {
        Button {
            if let product = selectedProduct {
                Task { await service.purchase(product) }
            }
        } label: {
            Text(service.purchaseInFlight ? "Processing purchase" : "Subscribe")
        }
        // The token swap this screen needs now lives in the shared style, so
        // the rule holds everywhere the filled button is used instead of only
        // where someone remembered to hand-roll it.
        //
        // `.borderedProminent` is still wrong here for the original reason:
        // it paints itself in the accent and labels it white, which is white
        // on the dark-mode amber at 2.15:1, the exact failure `onSignal`
        // exists to prevent. Enabled measures 5.03:1 light and 8.38:1 dark;
        // disabled is `field` with `ink2`, at full opacity.
        .buttonStyle(.coinyFilled)
        .disabled(isSubscribeDisabled)
    }

    /// No product selected, or a purchase already in flight.
    private var isSubscribeDisabled: Bool {
        selectedProduct == nil || service.purchaseInFlight
    }

    var restoreButton: some View {
        Button("Restore purchases") {
            Task { await service.restorePurchases() }
        }
        .frame(maxWidth: .infinity, minHeight: 44)
    }

    /// Apple requires functional links to the Terms of Use and the privacy
    /// policy on the screen that sells an auto-renewable subscription, not only
    /// somewhere in the binary (App Review 3.1.2, and the Schedule 2 EULA
    /// requirement). They sit under the buttons, at full size in the accent,
    /// because a link a user has to hunt for is the FTC's "information hiding"
    /// dark pattern whether or not it is technically present.
    var legalLinks: some View {
        HStack(spacing: 20) {
            legalLink(.termsOfService, title: "Terms of Use")
            legalLink(.privacyPolicy, title: "Privacy Policy")
            Spacer(minLength: 0)
        }
        .accessibilityIdentifier("paywall.legal")
    }

    func legalLink(_ document: LegalDocument, title: String) -> some View {
        Button(title) { presentedDocument = document }
            .font(.footnote.weight(.medium))
            .foregroundStyle(CoinyTheme.signal)
            .frame(minHeight: 44)
            // frame(minHeight:) grows the LAYOUT but not the hit area: a
            // Button's tappable region is its label's bounds, so these measured
            // 15.7pt tall against the 44pt minimum despite the frame above.
            // Same defect, same fix as SignInView's debug control.
            //
            // It matters more here than almost anywhere: Apple requires
            // functional Terms and privacy links on the screen that sells an
            // auto-renewable subscription, and a link that is present but hard
            // to hit is the failure mode the requirement exists to prevent.
            .contentShape(Rectangle())
            .accessibilityHint("Opens \(title) in the app.")
    }

    var unavailableNotice: some View {
        Text("Subscriptions are not available right now. Nothing is wrong with your account; try again later.")
            .font(.footnote)
            .foregroundStyle(CoinyTheme.ink2)
    }
}

#Preview {
    NavigationStack {
        PaywallView()
    }
}
