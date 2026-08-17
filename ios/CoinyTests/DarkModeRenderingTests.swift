import SwiftUI
import UIKit
import XCTest
@testable import Coiny

/// Renders real views and measures the pixels they produce.
///
/// `CoinyThemeContrastTests` proves the palette's own numbers are right. It
/// cannot prove a view uses the palette, and that gap is where every defect in
/// this file lived: `PaywallView` drew on `systemBackground` in both schemes,
/// `SignInView` asked for the black Apple button on a near-black screen, and
/// `SettingsView` left its rows on the system grouped colour. All three passed
/// the whole test suite, SwiftLint, CI and two accessibility audits, because
/// nothing ever looked at the result.
///
/// Every assertion here is a measurement taken from a rendered image, in a
/// named scheme, against a token resolved for that same scheme.
@MainActor
final class DarkModeRenderingTests: XCTestCase {

    // MARK: - Rendering

    private static let size = CGSize(width: 390, height: 844)

    /// One pixel, as the 8-bit sRGB the screen shows.
    private struct RGB: Equatable, Hashable {
        let red: UInt8
        let green: UInt8
        let blue: UInt8

        var hex: String { String(format: "#%02X%02X%02X", red, green, blue) }
    }

    /// A rendered view as an 8-bit sRGB pixel buffer.
    private struct Raster {
        let width: Int
        let height: Int
        /// Row-major RGB triples.
        let pixels: [RGB]
        /// Kept so a run can attach what it measured.
        let image: UIImage?

        func color(x: Int, y: Int) -> RGB {
            pixels[y * width + x]
        }

        /// How much of the image is exactly this colour, 0...1.
        func fraction(of color: RGB) -> Double {
            let hits = pixels.filter { $0 == color }.count
            return Double(hits) / Double(pixels.count)
        }

        /// The most common colour that is not `background`, between two rows.
        ///
        /// Finds a control by its fill rather than by hardcoded coordinates, so
        /// the assertion survives the layout moving.
        func dominantColor(excluding background: RGB, fromY: Int, toY: Int) -> RGB {
            var counts: [RGB: Int] = [:]
            for y in max(0, fromY)..<min(height, toY) {
                for x in 0..<width {
                    let c = color(x: x, y: y)
                    guard c != background else { continue }
                    counts[c, default: 0] += 1
                }
            }
            return counts.max { $0.value < $1.value }?.key ?? background
        }

        /// The last row containing `color`, or nil. Used to find where the
        /// creature window ends so the search for the sign-in button starts
        /// below it rather than at a guessed fraction of the height, which
        /// picked up the window's own fill.
        func lastRow(containing color: RGB) -> Int? {
            for y in stride(from: height - 1, through: 0, by: -1) {
                for x in 0..<width where self.color(x: x, y: y) == color {
                    return y
                }
            }
            return nil
        }
    }

    /// Renders and also attaches the image to the test result.
    ///
    /// The whole reason these defects survived a green suite is that nobody
    /// ever looked at the screen. A number in a failure message is better than
    /// nothing, but the picture is what makes a wrong colour obvious, so every
    /// run leaves one per view per scheme in the result bundle.
    private func render(_ view: some View, _ scheme: ColorScheme, named name: String) -> Raster {
        let raster = render(view, scheme)
        if let image = raster.image {
            let attachment = XCTAttachment(image: image)
            attachment.name = "\(name)-\(scheme == .dark ? "dark" : "light")"
            attachment.lifetime = .keepAlways
            add(attachment)
        }
        return raster
    }

    private func render(_ view: some View, _ scheme: ColorScheme) -> Raster {
        let host = UIHostingController(rootView: view)
        let style: UIUserInterfaceStyle = scheme == .dark ? .dark : .light
        host.overrideUserInterfaceStyle = style

        // A real window in the hierarchy: without one, SwiftUI does not resolve
        // materials or system background colours and the render comes back
        // transparent, which would make every assertion below meaningless.
        let window = UIWindow(frame: CGRect(origin: .zero, size: Self.size))
        window.overrideUserInterfaceStyle = style
        window.rootViewController = host
        window.makeKeyAndVisible()
        host.view.frame = CGRect(origin: .zero, size: Self.size)
        host.view.setNeedsLayout()
        host.view.layoutIfNeeded()
        // One turn of the runloop so SwiftUI commits its first real layout.
        RunLoop.current.run(until: Date().addingTimeInterval(0.1))

        let width = Int(Self.size.width)
        let height = Int(Self.size.height)

        // `drawHierarchy`, not `layer.render(in:)`. The latter walks the layer
        // tree and silently omits UIKit controls that composite outside it,
        // which is exactly what `SignInWithAppleButton` is: the button simply
        // was not in the captured image, and a test that cannot see the
        // control it is measuring will report whatever is behind it.
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        format.opaque = true
        let image = UIGraphicsImageRenderer(size: Self.size, format: format).image { _ in
            host.view.drawHierarchy(in: host.view.bounds, afterScreenUpdates: true)
        }

        var buffer = [UInt8](repeating: 0, count: width * height * 4)
        buffer.withUnsafeMutableBytes { raw in
            let context = CGContext(
                data: raw.baseAddress,
                width: width,
                height: height,
                bitsPerComponent: 8,
                bytesPerRow: width * 4,
                space: CGColorSpace(name: CGColorSpace.sRGB)!,
                bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
            )!
            if let cgImage = image.cgImage {
                context.draw(cgImage, in: CGRect(origin: .zero, size: Self.size))
            }
        }

        var pixels: [RGB] = []
        pixels.reserveCapacity(width * height)
        for i in stride(from: 0, to: buffer.count, by: 4) {
            pixels.append(RGB(red: buffer[i], green: buffer[i + 1], blue: buffer[i + 2]))
        }
        return Raster(width: width, height: height, pixels: pixels, image: image)
    }

    // MARK: - Colour

    /// A token as the 8-bit sRGB the screen will actually show for that scheme.
    ///
    /// Resolved through `Color.resolve(in:)` for the reason
    /// `CoinyThemeContrastTests` documents: `UIColor(_: Color)` flattens a
    /// dynamic colour against whatever traits are in force at the bridge, so
    /// the dark branch would silently test the light value.
    private func rgb(_ color: Color, _ scheme: ColorScheme) -> RGB {
        var environment = EnvironmentValues()
        environment.colorScheme = scheme
        let resolved = color.resolve(in: environment)
        return RGB(
            red: UInt8((resolved.red * 255).rounded()),
            green: UInt8((resolved.green * 255).rounded()),
            blue: UInt8((resolved.blue * 255).rounded())
        )
    }

    private func luminance(_ c: RGB) -> Double {
        func channel(_ v: UInt8) -> Double {
            let f = Double(v) / 255
            return f <= 0.03928 ? f / 12.92 : pow((f + 0.055) / 1.055, 2.4)
        }
        return 0.2126 * channel(c.red) + 0.7152 * channel(c.green) + 0.0722 * channel(c.blue)
    }

    private func contrast(_ a: RGB, _ b: RGB) -> Double {
        let la = luminance(a), lb = luminance(b)
        return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)
    }

    private func makeStore() -> PetStore { PetStore(api: APITests.never) }

    // MARK: - The paywall draws on the theme, not on the system background

    /// Measured before the fix: `#FFFFFF` in light and `#000000` in dark, while
    /// every other screen in the app was on `screen`. On dark it put pure black
    /// beside the app's warm near-black, which is the one place a user is being
    /// asked for money.
    func testPaywallDrawsOnTheThemeBackgroundInBothSchemes() {
        for scheme in [ColorScheme.light, .dark] {
            let raster = render(PaywallView(), scheme, named: "paywall")
            let expected = rgb(CoinyTheme.screen, scheme)
            let corner = raster.color(x: 3, y: 3)
            XCTAssertEqual(
                corner.hex, expected.hex,
                "\(scheme) paywall background is \(corner.hex), expected screen \(expected.hex)"
            )
            XCTAssertGreaterThan(
                raster.fraction(of: expected), 0.2,
                "\(scheme) paywall: screen \(expected.hex) covers only "
                + "\(Int(raster.fraction(of: expected) * 100))% of the view"
            )
        }
    }

    // MARK: - The Sign in with Apple button has to be visible

    /// The black Apple button on the dark screen measured 1.16:1, so the only
    /// call to action on the first screen anyone sees was an invisible
    /// rectangle with floating white text. WCAG 2.2 1.4.11 asks 3:1 of any
    /// control that has to be perceived as a control.
    func testAppleButtonIsVisibleAgainstTheScreenInBothSchemes() {
        for scheme in [ColorScheme.light, .dark] {
            let raster = render(SignInView(onSignedIn: { _ in }), scheme, named: "signin")
            let screen = rgb(CoinyTheme.screen, scheme)
            // Start below the creature window rather than at a guessed
            // fraction of the height: the window is a large block of `field`
            // and a fixed band picked that up instead of the button.
            let windowBottom = raster.lastRow(containing: rgb(CoinyTheme.field, scheme))
            XCTAssertNotNil(windowBottom, "\(scheme) sign-in: creature window did not render")
            let fill = raster.dominantColor(
                excluding: screen,
                fromY: (windowBottom ?? 0) + 1,
                toY: raster.height
            )
            let measured = contrast(fill, screen)
            XCTAssertGreaterThanOrEqual(
                measured, 3.0,
                "\(scheme) Sign in with Apple fill \(fill.hex) is "
                + "\(String(format: "%.2f", measured)):1 against screen \(screen.hex), below the 3:1 floor"
            )
        }
    }

    // MARK: - Unavailable still has to be readable

    /// The one that proves why this file exists.
    ///
    /// `testRefundRowIsReadableWhetherOrNotARefundIsAvailable` asserts the
    /// token pair and passes at 7.17:1. The rendered screen was 2.90:1 dark
    /// and 2.39:1 light, because `.disabled()` multiplies the label's opacity
    /// after the colour is chosen. #220 made the same mistake on the paywall's
    /// subscribe button: it wrote "a DIFFERENT PAIR of tokens, not the same
    /// pair at reduced opacity" into a comment and left `.opacity(… : 0.4)` in
    /// the shared button style, so the fixed button measured 2.92:1.
    ///
    /// A token test cannot see an opacity applied by a modifier it does not
    /// know about. Only the pixels can.
    func testDisabledControlsAreReadableOnTheRenderedScreen() {
        for scheme in [ColorScheme.light, .dark] {
            // No StoreKit products load in the test host, so the paywall's
            // subscribe button renders in exactly the disabled state that was
            // shipping unreadable.
            let paywall = render(PaywallView(), scheme, named: "paywall-disabled")
            let fill = paywall.dominantColor(
                excluding: rgb(CoinyTheme.screen, scheme),
                fromY: 0, toY: paywall.height
            )
            let label = rgb(CoinyTheme.ink2, scheme)
            let measured = contrast(label, fill)
            XCTAssertGreaterThanOrEqual(
                measured, 4.5,
                "\(scheme) disabled Subscribe: label \(label.hex) on the rendered fill \(fill.hex) "
                + "is \(String(format: "%.2f", measured)):1"
            )
            // The disabled fill has to be the token at full strength. A faded
            // one lands somewhere between `field` and whatever is behind it.
            XCTAssertEqual(
                fill.hex, rgb(CoinyTheme.field, scheme).hex,
                "\(scheme) disabled Subscribe fill is \(fill.hex), expected field "
                + "\(rgb(CoinyTheme.field, scheme).hex): it is being faded rather than swapped"
            )
        }
    }

    // MARK: - Settings rows are the palette's surface, not the system's

    /// The rows measured `#FFFFFF` in light and `#2C2C2E` in dark, the system
    /// grouped-background pair. In dark that is a cold grey sitting on the
    /// warm `#151711` screen at 1.30:1, which reads as a different app.
    func testSettingsRowsUseTheThemeSurfaceInBothSchemes() {
        for scheme in [ColorScheme.light, .dark] {
            let raster = render(SettingsView().environment(makeStore()), scheme, named: "settings")
            let systemRow = rgb(Color(uiColor: .secondarySystemGroupedBackground), scheme)
            let surface = rgb(CoinyTheme.surface, scheme)

            XCTAssertLessThan(
                raster.fraction(of: systemRow), 0.01,
                "\(scheme) settings: the system row colour \(systemRow.hex) still covers "
                + "\(Int(raster.fraction(of: systemRow) * 100))% of the view"
            )
            XCTAssertGreaterThan(
                raster.fraction(of: surface), 0.1,
                "\(scheme) settings: theme surface \(surface.hex) covers only "
                + "\(Int(raster.fraction(of: surface) * 100))% of the view"
            )
        }
    }
}
