import XCTest

/// Tests for the Pet tab — verifies chrome and core UI elements exist.
/// Uses a single app instance per class (launched once) so individual tests
/// never orphan the class-level app.
final class PetTabUITests: XCTestCase {
    private static var app: XCUIApplication!

    override class func setUp() {
        super.setUp()
        app = XCUIApplication()
        app.launchArguments = ["--ui-testing"]
        app.launch()
        // Ensure we start on the Pet tab.
        Self.app.tabBars.firstMatch.buttons["Pet"].tap()
    }

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    func testPetTabShowsCoinyNavigationTitle() {
        XCTAssertTrue(Self.app.navigationBars["Coiny"].waitForExistence(timeout: 10))
    }

    func testPetTabSettingsButtonExists() {
        XCTAssertTrue(Self.app.navigationBars["Coiny"].waitForExistence(timeout: 10))
        XCTAssertTrue(Self.app.buttons["Settings"].exists)
    }

    func testPetTabShowsContentArea() {
        // After launch the pet either loads (showing mood SF symbol) or shows an
        // error / loading spinner. Any of these is acceptable — the test just
        // confirms we're on the right tab and something rendered.
        XCTAssertTrue(Self.app.navigationBars["Coiny"].waitForExistence(timeout: 10))
        let hasProgress = Self.app.activityIndicators.firstMatch.exists
        let hasPetImage = Self.app.images.firstMatch.exists
        let hasError = Self.app.staticTexts["Couldn't load pet"].exists
        XCTAssertTrue(hasProgress || hasPetImage || hasError, "Pet tab should render content")
    }

    func testSettingsSheetPresents() {
        XCTAssertTrue(Self.app.navigationBars["Coiny"].waitForExistence(timeout: 10))
        Self.app.buttons["Settings"].tap()
        XCTAssertTrue(Self.app.navigationBars["Settings"].waitForExistence(timeout: 5))
        // Dismiss sheet.
        if Self.app.buttons["Done"].exists {
            Self.app.buttons["Done"].tap()
        } else {
            Self.app.swipeDown()
        }
    }
}
