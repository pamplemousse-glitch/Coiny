import SwiftUI
import XCTest
@testable import Coiny

/// Lightweight "view constructs and renders without crashing" smoke tests.
///
/// SwiftUI views can break in two silent ways: a value-initialization error
/// inside `body` (force-unwrap, divide-by-zero, missing environment object)
/// or a layout-time crash from a malformed modifier chain. Neither is
/// catchable by the unit-test bundle without an actual view layout pass.
///
/// Each test wraps a view in `UIHostingController`, forces a layout, and
/// asserts the view tree exists. The XCUITest smoke (`AppLaunchSmokeTests`)
/// catches the sign-in entry path; these tests cover every other top-level
/// view so a crash on Settings or Spending doesn't ship silently.
@MainActor
final class ViewSmokeTests: XCTestCase {
    // MARK: - Helpers

    /// Constructs a host VC, forces a sized layout, and asserts liveness.
    /// Uses an iPhone 16-like frame so views with `.frame(maxWidth: .infinity)`
    /// don't degenerate to zero.
    private func smoke<V: View>(_ view: V, file: StaticString = #filePath, line: UInt = #line) {
        let host = UIHostingController(rootView: view)
        host.view.frame = CGRect(x: 0, y: 0, width: 390, height: 844)
        host.view.layoutIfNeeded()
        // `UIHostingController.view` is a `_UIHostingView` — SwiftUI's internal
        // tree lives below the UIKit boundary, so we can't inspect it via
        // `.subviews`. The real value of this test is that the line above
        // completes: any `body` precondition crash, divide-by-zero, or
        // force-unwrap on a missing environment would have thrown by now.
        XCTAssertNotNil(host.view, file: file, line: line)
        XCTAssertNotEqual(host.view.bounds.size, .zero, "view did not lay out", file: file, line: line)
    }

    private func makeStore() -> PetStore {
        // Idle store — views handle the loading state natively.
        let api = APITests.never
        return PetStore(api: api)
    }

    // MARK: - Tests

    func testSignInViewRenders() {
        smoke(SignInView(onSignedIn: {}))
    }

    func testOnboardingViewRenders() {
        smoke(OnboardingView(onboardingComplete: .constant(false)))
    }

    func testPetViewRenders() {
        smoke(
            PetView()
                .environment(makeStore())
        )
    }

    func testSpendingViewRenders() {
        smoke(
            SpendingView()
                .environment(makeStore())
        )
    }

    func testSettingsViewRenders() {
        smoke(
            SettingsView()
                .environment(makeStore())
        )
    }

    func testNetWorthViewRenders() {
        smoke(
            NetWorthView()
                .environment(NetWorthViewModel())
        )
    }

    func testCryptoViewRenders() {
        smoke(CryptoView())
    }

    func testSpinwheelViewRenders() {
        smoke(SpinwheelView())
    }

    func testRootViewRenders() {
        // RootView is a TabView wrapping all 6 tabs — constructing it exercises
        // all children's init in one shot.
        smoke(
            RootView()
                .environment(makeStore())
        )
    }
}

// MARK: - Test-only PetStoreAPI that never resolves

/// A fake that hangs forever on `getPetState`. Lets PetStore-using views stay
/// in `.loading` for the duration of a smoke test (no flicker, no error path).
/// Lives on APITests as a namespace.
extension APITests {
    final class NeverAPI: PetStoreAPI, @unchecked Sendable {
        func getPetState() async throws -> PetState {
            // Hang the call forever — the test only needs one layout pass.
            try await Task.sleep(for: .seconds(3600))
            throw CancellationError()
        }
    }

    static let never: PetStoreAPI = NeverAPI()
}
