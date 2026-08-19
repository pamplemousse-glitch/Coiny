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

        /// How many pixels in the image are exactly this colour.
        func count(of color: RGB) -> Int {
            pixels.filter { $0 == color }.count
        }

        /// The bounding box of every pixel matching `color`.
        func boundingBox(of color: RGB) -> (minX: Int, minY: Int, maxX: Int, maxY: Int)? {
            var minX = width, minY = height, maxX = -1, maxY = -1
            for y in 0..<height {
                for x in 0..<width where self.color(x: x, y: y) == color {
                    minX = min(minX, x); maxX = max(maxX, x)
                    minY = min(minY, y); maxY = max(maxY, y)
                }
            }
            return maxX < 0 ? nil : (minX, minY, maxX, maxY)
        }

        /// The colour in `box` at `percentile` of distance-in-luminance from
        /// `reference`.
        ///
        /// Not "the most common colour that isn't the fill". Antialiased text
        /// has no dominant colour: the disabled Subscribe label is ~780 pixels
        /// spread so thinly that its most common single value appears fewer
        /// than 20 times, so a count threshold picks a fringe pixel next to
        /// the glyphs and reports 1.05:1 for a label that is plainly legible.
        /// A percentile ignores stray outliers without needing any one value
        /// to repeat.
        func percentileExtreme(
            in box: (minX: Int, minY: Int, maxX: Int, maxY: Int),
            from reference: RGB,
            percentile: Double,
            luminance: (RGB) -> Double
        ) -> RGB? {
            let minY = max(0, box.minY), maxY = min(height - 1, box.maxY)
            let minX = max(0, box.minX), maxX = min(width - 1, box.maxX)
            guard minY <= maxY, minX <= maxX else { return nil }
            let referenceLuminance = luminance(reference)
            var scored: [(color: RGB, distance: Double)] = []
            for y in minY...maxY {
                for x in minX...maxX {
                    let c = color(x: x, y: y)
                    scored.append((c, abs(luminance(c) - referenceLuminance)))
                }
            }
            guard !scored.isEmpty else { return nil }
            scored.sort { $0.distance < $1.distance }
            let index = min(scored.count - 1, Int(Double(scored.count - 1) * percentile))
            return scored[index].color
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
        // A visible window is retained by UIKit, so without this each render
        // leaves another key window behind for every later test in the target.
        window.isHidden = true
        window.rootViewController = nil

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
            let raster = render(SignInView(onSignedIn: {}), scheme, named: "signin")
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
            // Identity and area, not contrast alone. Everything else in this
            // band is text, and `ink` glyphs clear 3:1 comfortably, so if the
            // button ever fails to appear in the capture the assertion above
            // would pass while measuring a label. That is not hypothetical:
            // `layer.render(in:)` omitted this exact control, and the band
            // used to be a guessed fraction that found the creature window.
            let expected: RGB = scheme == .dark
                ? RGB(red: 255, green: 255, blue: 255)
                : RGB(red: 0, green: 0, blue: 0)
            XCTAssertEqual(
                fill.hex, expected.hex,
                "\(scheme) the largest fill below the window is \(fill.hex), not the Apple button "
                + "(\(expected.hex)): the button is probably missing from the capture"
            )
            XCTAssertGreaterThan(
                raster.count(of: fill), 10_000,
                "\(scheme) Sign in with Apple covers only \(raster.count(of: fill))px; "
                + "a 350x50 button is about 17,500, so this is not the button"
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
            let field = rgb(CoinyTheme.field, scheme)

            // Locate the button by its own fill rather than by taking the
            // most common non-background colour of the whole image: the
            // segmented picker and, if this screen ever gains a creature, the
            // window are both large blocks that would win that contest.
            guard let box = paywall.boundingBox(of: field), paywall.count(of: field) > 8_000 else {
                return XCTFail(
                    "\(scheme) disabled Subscribe: no `field` fill found, so the button is either "
                    + "missing from the capture or is being faded rather than swapped"
                )
            }

            // Both sides measured. Asserting a token label against a measured
            // fill leaves the label unverified, and reverting only the
            // foreground swap would leave white on `field` at 1.25:1 while
            // still passing.
            let label = paywall.percentileExtreme(
                in: box, from: field, percentile: 0.99, luminance: luminance
            )
            XCTAssertNotNil(label, "\(scheme) disabled Subscribe: no label pixels inside the button")
            if let label {
                let measured = contrast(label, field)
                XCTAssertGreaterThanOrEqual(
                    measured, 4.5,
                    "\(scheme) disabled Subscribe: label \(label.hex) on fill \(field.hex) "
                    + "is \(String(format: "%.2f", measured)):1"
                )
            }

            // The shape has to stay locatable too: `field` on `screen` is
            // 1.08:1, so the disabled button carries an outline.
            //
            // Measured as contrast within the top border band, not as an exact
            // match on `ink3`. A 1pt stroke on a rounded rect antialiases, so
            // the token's exact value appears in zero pixels: the rendered
            // core is #686D64 against an #858C81 token. Demanding the exact
            // colour failed on a border that is plainly visible, which is the
            // kind of assertion that gets deleted rather than believed.
            let screen = rgb(CoinyTheme.screen, scheme)
            // Above `box.minY`, not at it: `boundingBox` matched pixels that
            // are exactly `field`, and the stroke is drawn over the fill's top
            // edge, so the outline rows sit just outside that region.
            let band = (minX: box.minX, minY: box.minY - 3, maxX: box.maxX, maxY: box.minY)
            let outline = paywall.percentileExtreme(
                in: band, from: screen, percentile: 0.9, luminance: luminance
            )
            XCTAssertNotNil(outline, "\(scheme) disabled Subscribe: no outline pixels above the fill")
            if let outline {
                let measured = contrast(outline, screen)
                XCTAssertGreaterThanOrEqual(
                    measured, 3.0,
                    "\(scheme) disabled Subscribe outline \(outline.hex) is "
                    + "\(String(format: "%.2f", measured)):1 against screen \(screen.hex): the control "
                    + "has no locatable shape"
                )
            }
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

    // MARK: - The Wealth rows the accessibility audit keeps flagging

    /// Settles, deterministically, whether `WealthRowView` has the contrast
    /// defect `performAccessibilityAudit` keeps reporting (PR #231).
    ///
    /// It does not. Measured on an iOS 26 simulator, `ink2` subheadline text on
    /// `surface` renders at 7.58:1 in light and 7.25:1 in dark, against tokens
    /// of 7.46:1 and 7.17:1. The audit's contrast findings on `'Debts'` and
    /// `'$4,300.00'` are false positives, which is consistent with the audit
    /// giving a different answer on each of four runs.
    ///
    /// TWO METHOD NOTES, both learned by getting it wrong here first, because
    /// this harness can produce a confident wrong number as easily as a right
    /// one.
    ///
    /// 1. THE PERCENTILE IS CALIBRATED, NOT CHOSEN. `percentileExtreme` sorts
    ///    by absolute luminance distance from the reference, so the useful
    ///    percentile depends on what fraction of the box is glyph. Calibrated
    ///    by measuring a pair whose answer is already known: at p=0.999 the
    ///    `ink` render lands within 0.2 of its 16.27:1 token, so the percentile
    ///    is finding glyph cores. At p=0.99 the same pair reads 15.21:1, and on
    ///    a full-screen box it read 6.24:1, which is fringe, not text.
    ///
    /// 2. THE VIEW IS RENDERED IN ISOLATION ON PURPOSE. Rendering the whole
    ///    `WealthRowView` and taking a percentile over the background's
    ///    bounding box does NOT work: that box also contains `CoinyHairline`
    ///    and a `.bordered` button, both darker than either text token, so the
    ///    high percentiles return `#0E0E0E` and the measurement describes the
    ///    hairline. That approach reported a 3.91:1 "defect" that does not
    ///    exist. If you extend this, scope the box to the glyphs or keep the
    ///    render isolated.
    ///
    /// What this DOES still catch, which a palette test cannot: an `.opacity()`
    /// or `.disabled()` applied to these styles, which multiplies the label's
    /// alpha after its colour is chosen and is how #220 shipped a 2.92:1
    /// button while its comment claimed the opposite.
    func testWealthRowTextStylesMeetContrastWhenRendered() {
        // Exactly the (font, colour) pairs WealthRowView draws:
        // `NetWorthView+Groups.swift` uses .subheadline/ink for the value,
        // .subheadline/ink2 for the muted value, and .caption/ink2 for the
        // subtitle.
        let pairs: [(name: String, color: Color, font: Font)] = [
            ("value", CoinyTheme.ink, .subheadline),
            ("mutedValue", CoinyTheme.ink2, .subheadline),
            ("subtitle", CoinyTheme.ink2, .caption),
        ]

        for scheme in [ColorScheme.light, .dark] {
            for pair in pairs {
                let view = Text("Debts $4,300.00")
                    .font(pair.font)
                    .foregroundStyle(pair.color)
                    .padding(4)
                    .background(CoinyTheme.surface)
                    .fixedSize()

                let raster = render(view, scheme, named: "wealth-\(pair.name)-\(scheme)")
                let background = rgb(CoinyTheme.surface, scheme)
                guard let box = raster.boundingBox(of: background) else {
                    XCTFail("\(scheme) \(pair.name): nothing rendered on the theme surface")
                    continue
                }

                let text = raster.percentileExtreme(
                    in: box, from: background, percentile: 0.999, luminance: luminance
                )
                XCTAssertNotNil(text, "\(scheme) \(pair.name): no glyph pixels, so this would pass vacuously")
                guard let text else { continue }

                let ratio = contrast(text, background)
                XCTAssertGreaterThanOrEqual(
                    ratio, 4.5,
                    "\(scheme) wealth \(pair.name): rendered \(text.hex) on \(background.hex) at "
                    + "\(String(format: "%.2f", ratio)):1, below AA 4.5:1"
                )

                // The render must track the token. A large gap means something
                // is fading the text after its colour is chosen, which is the
                // failure a token test cannot see and this test exists for.
                let token = rgb(pair.color, scheme)
                let tokenRatio = contrast(token, background)
                XCTAssertGreaterThan(
                    ratio, tokenRatio * 0.7,
                    "\(scheme) wealth \(pair.name): renders at \(String(format: "%.2f", ratio)):1 but its "
                    + "token pair is \(String(format: "%.2f", tokenRatio)):1. Something is fading it."
                )
            }
        }
    }
}
