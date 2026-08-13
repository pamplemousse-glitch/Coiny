import Foundation
import Observation
import StoreKit

/// StoreKit 2 front end for the subscription tiers (docs/prd.md section 25).
///
/// The backend is the authority on entitlement: every verified transaction's
/// JWS is forwarded to the server, which verifies Apple's signature chain
/// itself and stores the result. The tier shown anywhere in the UI comes from
/// `GET /api/entitlements`, never from local receipt state, which is also what
/// makes the subscription hold across all of the user's devices (3.1.2(a)).
@MainActor
@Observable
final class StoreKitService {
    static let shared = StoreKitService()

    /// Products in paywall order (annual first, per DR-24). Empty until
    /// `loadProducts()` succeeds; empty in production until the App Store
    /// Connect products exist.
    private(set) var products: [Product] = []
    /// Last server-resolved entitlement. Nil before the first successful read.
    private(set) var entitlements: EntitlementsResponse?
    private(set) var purchaseInFlight = false
    private(set) var lastErrorMessage: String?
    /// Most recent subscription transaction id, for Apple's refund sheet.
    private(set) var refundableTransactionID: UInt64?

    private var updatesTask: Task<Void, Never>?
    private let api: API

    init(api: API = .shared) {
        self.api = api
    }

    /// Idempotent; called once at app launch. Runs the `Transaction.updates`
    /// listener for the app's lifetime so a purchase that completes while the
    /// app is backgrounded (ask-to-buy approval, billing retry recovery,
    /// renewal on another device) is reported and finished, never dropped.
    func start() {
        guard updatesTask == nil else { return }
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                await self?.handle(update)
            }
        }
    }

    func loadProducts() async {
        do {
            let loaded = try await Product.products(for: SubscriptionCatalog.ProductID.all)
            products = SubscriptionCatalog.ProductID.all.compactMap { id in
                loaded.first { $0.id == id }
            }
        } catch {
            lastErrorMessage = "Could not load subscription options. Check your connection and try again."
        }
    }

    func refreshEntitlements() async {
        do {
            entitlements = try await api.getEntitlements()
            lastErrorMessage = nil
        } catch {
            // Keep the last known value; the server remains the authority.
        }
        await updateRefundableTransactionID()
    }

    /// Runs the purchase flow for a product. The appAccountToken minted by the
    /// server is attached so App Store Server Notifications can be matched to
    /// this user even if this app never gets to report the transaction.
    func purchase(_ product: Product) async {
        guard !purchaseInFlight else { return }
        purchaseInFlight = true
        defer { purchaseInFlight = false }
        do {
            var options: Set<Product.PurchaseOption> = []
            if let token = await fetchAppAccountToken(), let uuid = UUID(uuidString: token) {
                options.insert(.appAccountToken(uuid))
            }
            let result = try await product.purchase(options: options)
            switch result {
            case .success(let verification):
                await handle(verification)
            case .pending:
                // Ask to Buy or similar: Transaction.updates delivers the
                // outcome later, possibly while backgrounded.
                break
            case .userCancelled:
                break
            @unknown default:
                break
            }
        } catch {
            lastErrorMessage = "The purchase did not complete. You have not been charged twice; try again."
        }
    }

    /// Restore purchases (R-25.4): re-syncs with the App Store and re-reports
    /// every current entitlement so the server can rebind this device's
    /// subscription to the signed-in account.
    func restorePurchases() async {
        try? await AppStore.sync()
        for await update in Transaction.currentEntitlements {
            await handle(update, finishOnSuccess: false)
        }
        await refreshEntitlements()
    }

    // MARK: - Internals

    private func fetchAppAccountToken() async -> String? {
        if let token = entitlements?.appAccountToken { return token }
        await refreshEntitlements()
        return entitlements?.appAccountToken
    }

    /// Forwards Apple's signed JWS to the backend. The server performs its own
    /// chain verification, so the raw representation is sent even when local
    /// verification failed. The transaction is finished only after the server
    /// accepted it; otherwise Transaction.updates redelivers on next launch.
    private func handle(_ update: VerificationResult<Transaction>, finishOnSuccess: Bool = true) async {
        do {
            entitlements = try await api.reportAppStoreTransaction(jws: update.jwsRepresentation)
            if case .verified(let transaction) = update {
                refundableTransactionID = transaction.id
                if finishOnSuccess {
                    await transaction.finish()
                }
            }
        } catch {
            // Leave the transaction unfinished; StoreKit will redeliver it.
        }
    }

    private func updateRefundableTransactionID() async {
        for await update in Transaction.currentEntitlements {
            if case .verified(let transaction) = update, transaction.productType == .autoRenewable {
                refundableTransactionID = transaction.id
            }
        }
    }
}
