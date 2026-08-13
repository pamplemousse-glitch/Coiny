import Foundation

// The declared-asset model behind onboarding screens 2 to 4 (PRD section 5.2)
// and the "compute, do not ask" rule (section 5.4): the only questions asked
// are class membership (chips, no amounts) and an optional rough magnitude
// per class (log-scale slider, skippable, never a keyboard).
//
// Server persistence gap, stated honestly: R-5.3's `declared_assets` table
// and its API do not exist yet, so declarations persist on-device via
// `DeclaredAssetsStore` until the endpoint lands. The model already carries
// everything that table needs (class, bucketed value, declaredAt), so wiring
// it up later is a transport change, not a redesign.

// MARK: - Classes

/// The chip list from PRD section 5.2 screen 2, in display order.
enum DeclaredAssetClass: String, CaseIterable, Codable, Sendable {
    case checking
    case savings
    case creditCards
    case retirement
    case brokerage
    case crypto
    case car
    case home
    case studentLoans
    case business
    case collectibles
    case other

    var label: String {
        switch self {
        case .checking: return "Checking"
        case .savings: return "Savings"
        case .creditCards: return "Credit cards"
        case .retirement: return "401k or pension"
        case .brokerage: return "Brokerage"
        case .crypto: return "Crypto"
        case .car: return "Car"
        case .home: return "Home"
        case .studentLoans: return "Student loans"
        case .business: return "Business"
        case .collectibles: return "Collectibles"
        case .other: return "Other"
        }
    }

    /// True when the class reduces net worth.
    var isDebt: Bool {
        switch self {
        case .creditCards, .studentLoans: return true
        default: return false
        }
    }

    /// Log-slider bounds per class, chosen so the middle of each slider lands
    /// near a typical holding rather than wasting range.
    var sliderRangeUSD: ClosedRange<Double> {
        switch self {
        case .checking, .savings: return 100...250_000
        case .creditCards: return 100...100_000
        case .retirement, .brokerage: return 500...2_000_000
        case .crypto: return 100...1_000_000
        case .car: return 500...250_000
        case .home: return 20_000...5_000_000
        case .studentLoans: return 500...500_000
        case .business: return 1_000...5_000_000
        case .collectibles, .other: return 100...500_000
        }
    }

    /// Stable snake_case key for telemetry properties.
    var telemetryKey: String {
        switch self {
        case .creditCards: return "credit_cards"
        case .studentLoans: return "student_loans"
        default: return rawValue
        }
    }
}

// MARK: - Log slider

/// Pure math for the "Roughly how much?" sliders. Position is 0...1; value is
/// log-interpolated across the class range, then bucketed to two significant
/// digits so what we store is honest about its own precision (R-5.3 stores
/// bucketed values, confidence "declared").
enum LogSlider {
    static func value(at position: Double, in range: ClosedRange<Double>) -> Double {
        let clamped = min(max(position, 0), 1)
        let logLower = log10(range.lowerBound)
        let logUpper = log10(range.upperBound)
        let raw = pow(10, logLower + clamped * (logUpper - logLower))
        return bucket(raw)
    }

    static func position(of value: Double, in range: ClosedRange<Double>) -> Double {
        let clamped = min(max(value, range.lowerBound), range.upperBound)
        let logLower = log10(range.lowerBound)
        let logUpper = log10(range.upperBound)
        guard logUpper > logLower else { return 0 }
        return (log10(clamped) - logLower) / (logUpper - logLower)
    }

    /// Rounds to two significant digits: 137,400 becomes 140,000.
    static func bucket(_ value: Double) -> Double {
        guard value > 0 else { return 0 }
        let exponent = floor(log10(value))
        let scale = pow(10, exponent - 1)
        return (value / scale).rounded() * scale
    }
}

// MARK: - Declaration sheet

/// One declared line: a class the user says they have, with an optional rough
/// value. `bucketedValueUSD == nil` means "has it, skipped the amount".
struct DeclaredAsset: Codable, Equatable, Sendable {
    let assetClass: DeclaredAssetClass
    var bucketedValueUSD: Double?
    var declaredAt: Date
}

/// The full set of declarations gathered in onboarding.
struct DeclarationSheet: Codable, Equatable, Sendable {
    var assets: [DeclaredAsset] = []

    var isEmpty: Bool { assets.isEmpty }
    var classCount: Int { assets.count }

    /// Signed sum of everything with a value: assets add, debts subtract.
    /// Nil when no line carries a value, because a number we cannot compute is
    /// never rendered as zero (product principle 5).
    var estimatedNetWorthUSD: Double? {
        let valued = assets.compactMap { asset -> Double? in
            guard let value = asset.bucketedValueUSD else { return nil }
            return asset.assetClass.isDebt ? -value : value
        }
        guard !valued.isEmpty else { return nil }
        return valued.reduce(0, +)
    }

    /// Lines that carry a value, for the screen 4 breakdown.
    var valuedAssets: [DeclaredAsset] {
        assets.filter { $0.bucketedValueUSD != nil }
    }

    /// Telemetry properties for `onboarding_declared` per section 24: class
    /// list, count, and per-class bucketed value. Never the amounts themselves.
    var telemetryProperties: [String: TelemetryValue] {
        var bands: [String: String] = [:]
        for asset in assets {
            guard let value = asset.bucketedValueUSD else { continue }
            bands[asset.assetClass.telemetryKey] = TelemetryValue.usdBucketLabel(value)
        }
        var props: [String: TelemetryValue] = [
            "classes": .strings(assets.map { $0.assetClass.telemetryKey }),
            "class_count": .int(assets.count),
        ]
        // Nested under one key, not flattened into the envelope: the server
        // schema is a strict object and would reject value_<class> keys.
        if !bands.isEmpty {
            props["value_band_by_class"] = .bands(bands)
        }
        return props
    }
}

// MARK: - Persistence

/// On-device persistence for declarations until the `declared_assets` endpoint
/// exists (R-5.3 is unbuilt server-side). Values are rough, bucketed,
/// self-reported magnitudes, not account data, so UserDefaults is acceptable;
/// the session token itself stays in the Keychain as always.
struct DeclaredAssetsStore {
    private static let key = "declaredAssets.v1"
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    func load() -> DeclarationSheet? {
        guard let data = defaults.data(forKey: Self.key) else { return nil }
        return try? JSONDecoder().decode(DeclarationSheet.self, from: data)
    }

    func save(_ sheet: DeclarationSheet) {
        guard let data = try? JSONEncoder().encode(sheet) else { return }
        defaults.set(data, forKey: Self.key)
    }

    func clear() {
        defaults.removeObject(forKey: Self.key)
    }
}

// MARK: - Money formatting

/// The single formatting utility PRD section 12 requires: no hardcoded "$" in
/// new code paths, locale-aware output. Launch is USD-only.
enum MoneyText {
    /// Launch is US-only and USD-only; the locale is pinned so output is
    /// deterministic. Multi-currency work (6-month block) revisits this.
    private static let locale = Locale(identifier: "en_US")

    static func usd(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.locale = Self.locale
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: amount.rounded()))
            ?? "USD \(Int(amount.rounded()))"
    }

    /// Cent-precise variant for subscription rows.
    static func usdExact(_ amount: Double) -> String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "USD"
        formatter.locale = Self.locale
        formatter.minimumFractionDigits = 2
        formatter.maximumFractionDigits = 2
        return formatter.string(from: NSNumber(value: amount)) ?? "USD \(amount)"
    }
}
