import XCTest
@testable import Coiny

/// Proves the en-GB variants are actually reachable at runtime.
///
/// This is the half of localization that silently does not work. Adding a
/// String Catalog compiles whether or not `knownRegions` lists the language, and
/// a US simulator resolves `en` either way, so a broken en-GB setup looks
/// identical to a working one in review, in CI, and on the developer's machine.
/// The only thing that distinguishes them is asking for the locale explicitly.
final class LocalizationTests: XCTestCase {
    /// Resolve a key as a specific locale would.
    private func localized(_ key: String, _ identifier: String) -> String {
        let bundle = Bundle(for: type(of: self))
        guard let path = bundle.path(forResource: identifier, ofType: "lproj"),
              let localeBundle = Bundle(path: path)
        else {
            // The app target's catalog is compiled into the app bundle, not the
            // test bundle, so fall back to the host app's.
            let host = Bundle(for: PetStore.self)
            guard let hostPath = host.path(forResource: identifier, ofType: "lproj"),
                  let hostBundle = Bundle(path: hostPath)
            else { return "<no \(identifier).lproj>" }
            return hostBundle.localizedString(forKey: key, value: nil, table: nil)
        }
        return localeBundle.localizedString(forKey: key, value: nil, table: nil)
    }

    // MARK: - The region is actually registered

    func testBritishEnglishIsAKnownLocalization() {
        // If `knownRegions` in project.yml loses en-GB, the catalog's values
        // still compile and this is the only thing that notices.
        let host = Bundle(for: PetStore.self)
        XCTAssertTrue(
            host.localizations.contains("en-GB"),
            "en-GB is not a compiled localization; available: \(host.localizations)"
        )
    }

    // MARK: - The terms that genuinely differ

    func testCheckingReadsAsCurrentAccountInBritishEnglish() {
        XCTAssertEqual(localized("assetClass.checking", "en-GB"), "Current account")
    }

    func testRetirementReadsAsPensionInBritishEnglish() {
        // The default is the hand-written compromise "401k or pension", which is
        // the string that gave this whole gap away.
        XCTAssertEqual(localized("assetClass.retirement", "en-GB"), "Pension")
    }

    func testStudentLoansIsSingularInBritishEnglish() {
        XCTAssertEqual(localized("assetClass.studentLoans", "en-GB"), "Student loan")
    }

    func testRealEstateReadsAsPropertyInBritishEnglish() {
        XCTAssertEqual(localized("wealthClass.realEstate", "en-GB"), "Property")
    }

    func testSneakersReadAsTrainersInBritishEnglish() {
        XCTAssertEqual(localized("wealthClass.sneakers", "en-GB"), "Trainers")
    }

    // MARK: - US English is untouched

    func testAmericanEnglishKeepsItsOwnTerms() {
        // The point of the catalog is to ADD a market, not to move the default.
        XCTAssertEqual(DeclaredAssetClass.checking.label, "Checking")
        XCTAssertEqual(DeclaredAssetClass.retirement.label, "401k or pension")
    }

    // MARK: - Every key the code asks for exists

    func testEveryLocalizedKeyResolvesRatherThanEchoingItself() {
        // `localizedString(forKey:)` returns the KEY when it finds nothing, so a
        // typo in either the Swift call or the catalog is invisible except as
        // the raw key appearing on screen. Users would see "assetClass.checking".
        let keys = [
            "assetClass.checking", "assetClass.savings", "assetClass.creditCards",
            "assetClass.retirement", "assetClass.brokerage", "assetClass.crypto",
            "assetClass.car", "assetClass.home", "assetClass.studentLoans",
            "assetClass.business", "assetClass.collectibles", "assetClass.other",
            "wealthClass.realEstate", "wealthClass.sneakers",
            // The app-lock strings. Added with the lock itself, because a
            // security screen that renders "appLock.subtitle.available" as
            // literal text is worse than one with no subtitle at all.
            "appLock.subtitle.available", "appLock.subtitle.notConfigured",
            "appLock.subtitle.unavailable",
        ]
        for key in keys {
            let value = localized(key, "en")
            XCTAssertNotEqual(value, key, "\(key) did not resolve in en; it would render as the raw key")
        }
    }
}
