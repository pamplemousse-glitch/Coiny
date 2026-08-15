import Foundation

/// The two documents the app is legally required to put in front of a user,
/// and the single seam where hosting them replaces bundling them.
///
/// Both files ship in the bundle and render in-app rather than opening Safari.
/// That is not a stopgap for the privacy notice: Reg P 1016.9(a) requires the
/// notice to be delivered so the consumer can reasonably be expected to receive
/// actual notice, and 1016.9(b)(1)(iii) treats acknowledgement as a necessary
/// step to obtaining the service as the way to do that online. Apple, in turn,
/// requires functional links to the Terms of Use and the privacy policy inside
/// the binary for an auto-renewable subscription.
///
/// The files are the ones in `docs/legal`, referenced from `ios/project.yml`
/// rather than copied, so the text a user reads is the text that was reviewed.
enum LegalDocument: String, CaseIterable, Identifiable {
    case privacyPolicy = "privacy-policy"
    case termsOfService = "terms-of-service"

    var id: String { rawValue }

    var title: String {
        switch self {
        case .privacyPolicy: return "Privacy Policy"
        case .termsOfService: return "Terms of Service"
        }
    }

    // MARK: - The hosted-URL seam

    /// THE ONE PLACE a hosted copy replaces the bundled one.
    ///
    /// There is no domain yet, so this is nil for both documents and the app
    /// renders the bundled Markdown. When `coiny.<domain>/privacy` and
    /// `/terms` exist, fill these in: `LegalDocumentView` opens the URL
    /// instead, the links in `SignInView` and `SettingsView` follow it for
    /// free, and nothing else in the app changes. Keep the bundled copies
    /// shipping either way; a policy a user cannot read offline is a policy
    /// that is unavailable exactly when their connection is.
    var hostedURL: URL? {
        switch self {
        case .privacyPolicy: return nil
        case .termsOfService: return nil
        }
    }

    // MARK: - Version

    /// The revision of both documents currently bundled, recorded server-side
    /// when the user acknowledges them at sign-in. Bump it in the same change
    /// that edits either file in `docs/legal`, so an acknowledgement always
    /// names text that existed.
    ///
    /// Both documents carry "Effective date: not yet published"; this is the
    /// date they were last written, and it becomes the effective date when the
    /// attorney review in runbook G1.3 lands.
    static let version = "2026-08-13"

    // MARK: - Loading

    /// Reads the bundled Markdown. Returns nil only if the resource is missing
    /// from the bundle, which is a build configuration error rather than a
    /// runtime condition; the view says so plainly rather than showing a blank
    /// page, because a blank privacy policy is worse than an honest error.
    func loadMarkdown(from bundle: Bundle = .main) -> String? {
        guard let url = bundle.url(forResource: rawValue, withExtension: "md") else { return nil }
        return try? String(contentsOf: url, encoding: .utf8)
    }
}
