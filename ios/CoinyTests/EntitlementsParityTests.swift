import XCTest

/// Guards the two entitlements files against drift.
///
/// `Coiny.entitlements` (Debug) and `CoinyRelease.entitlements` (Release) exist
/// as separate files because XcodeGen writes exactly one entitlements file per
/// target and cannot vary it by configuration, while `aps-environment` MUST
/// vary: TestFlight and App Store builds always use production APNs, and a
/// Release build carrying `development` registers a sandbox token that
/// api.push.apple.com rejects with 400 BadDeviceToken. Push then dies with no
/// error anywhere the user or the server can see.
///
/// The cost of two hand-maintained files is that a capability added to one can
/// go missing from the other, and the one it would go missing from is the one
/// that ships. That failure is invisible in every simulator run and every Debug
/// build on a device. These tests are the thing that makes it visible.
final class EntitlementsParityTests: XCTestCase {
    /// The one key that is allowed to differ, and the reason both files exist.
    private static let allowedDifference = "aps-environment"

    /// Read from the SOURCE TREE rather than the test bundle: entitlements are
    /// consumed at signing time and are not copied into a bundle, so there is
    /// nothing to load at runtime. `#filePath` is the only handle on them.
    private func loadEntitlements(_ name: String) throws -> [String: Any] {
        let root = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()  // CoinyTests
            .deletingLastPathComponent()  // ios
            .appendingPathComponent("Coiny")
            .appendingPathComponent(name)

        let data = try Data(contentsOf: root)
        guard let plist = try PropertyListSerialization.propertyList(from: data, format: nil) as? [String: Any] else {
            throw XCTSkip("\(name) is not a plist dictionary")
        }
        return plist
    }

    func testReleaseUsesProductionApsEnvironment() throws {
        let release = try loadEntitlements("CoinyRelease.entitlements")

        // The whole reason this file exists. If this ever reads "development",
        // push is dead on TestFlight and nothing else in the suite notices.
        XCTAssertEqual(release["aps-environment"] as? String, "production")
    }

    func testDebugUsesDevelopmentApsEnvironment() throws {
        let debug = try loadEntitlements("Coiny.entitlements")

        XCTAssertEqual(debug["aps-environment"] as? String, "development")
    }

    /// The drift guard. A capability added to one file and not the other is the
    /// failure mode of hand-maintaining two of them.
    func testBothFilesDeclareTheSameKeys() throws {
        let debug = try loadEntitlements("Coiny.entitlements")
        let release = try loadEntitlements("CoinyRelease.entitlements")

        XCTAssertEqual(
            Set(debug.keys),
            Set(release.keys),
            "Entitlements keys differ between Debug and Release. A capability present in one and absent from the other "
                + "will be missing from whichever configuration ships."
        )
    }

    /// Same keys is not enough: the VALUES have to match too, everywhere except
    /// the one key the split exists for.
    func testValuesMatchExceptApsEnvironment() throws {
        let debug = try loadEntitlements("Coiny.entitlements")
        let release = try loadEntitlements("CoinyRelease.entitlements")

        for key in Set(debug.keys).union(release.keys) where key != Self.allowedDifference {
            // Compared as NSObject, not via String(describing:). Plist values
            // bridge to NSArray and NSString, whose default descriptions are
            // pointer addresses, so two identical arrays render as different
            // strings and the test fails on every run for no reason. `isEqual`
            // is value equality for exactly these types.
            let lhs = debug[key] as? NSObject
            let rhs = release[key] as? NSObject
            XCTAssertEqual(lhs, rhs, "Entitlement '\(key)' differs between Debug and Release")
        }
    }

    /// The tests above read the two FILES, which is not sufficient on its own.
    ///
    /// Re-adding an `entitlements:` block to `project.yml` would make XcodeGen
    /// generate one file and write `CODE_SIGN_ENTITLEMENTS` into every
    /// configuration, silently collapsing Release back onto the development
    /// entitlement. Both files would still exist on disk and every test above
    /// would still pass, while push was dead on TestFlight again.
    ///
    /// So this asserts the wiring, not just the contents.
    func testProjectYmlWiresEntitlementsPerConfiguration() throws {
        let projectYml = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .deletingLastPathComponent()
            .appendingPathComponent("project.yml")
        let yaml = try String(contentsOf: projectYml, encoding: .utf8)

        XCTAssertTrue(
            yaml.contains("CODE_SIGN_ENTITLEMENTS: Coiny/CoinyRelease.entitlements"),
            "Release must point at CoinyRelease.entitlements, or it inherits the development aps-environment "
                + "and push dies silently on TestFlight."
        )
        XCTAssertTrue(
            yaml.contains("CODE_SIGN_ENTITLEMENTS: Coiny/Coiny.entitlements"),
            "Debug must point at Coiny.entitlements explicitly, since there is no generated default any more."
        )
        // The block XcodeGen would use to overwrite both of the above.
        XCTAssertFalse(
            yaml.contains("\n    entitlements:\n"),
            "project.yml has an `entitlements:` block again. XcodeGen writes CODE_SIGN_ENTITLEMENTS into EVERY "
                + "configuration from it, which silently overrides the per-config paths and collapses Release back "
                + "onto the development entitlement."
        )
    }

    /// Sign in with Apple is the app's ONLY login. If the entitlement is
    /// missing the button builds, installs, and fails at runtime with
    /// ASAuthorizationError 1000, which is a fully broken app that compiles.
    func testBothDeclareSignInWithApple() throws {
        for name in ["Coiny.entitlements", "CoinyRelease.entitlements"] {
            let plist = try loadEntitlements(name)
            let value = plist["com.apple.developer.applesignin"] as? [String]
            XCTAssertEqual(value, ["Default"], "\(name) is missing Sign in with Apple")
        }
    }
}
