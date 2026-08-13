import SwiftUI

/// THE placeholder creature, and the only file that draws it.
///
/// The commissioned character art (design-direction 5) does not exist yet.
/// Until it lands, the creature is this deliberate stand-in: a 1-bit geometric
/// form drawn in ink on the Window's field, readable in silhouette per state
/// (R-11.1), never an SF Symbol face, never a number.
///
/// Swapping in real art is a change to this file and nothing else: replace the
/// body of `CreatureArtView` with the sprite renderer, keeping the same
/// (condition, stage, size) inputs. No other file draws any part of the
/// creature.
struct CreatureArtView: View {
    let condition: CreatureCondition
    let stage: Int
    let size: WindowSize

    var body: some View {
        Canvas { context, canvasSize in
            let painter = CreaturePainter(
                condition: condition,
                stage: max(0, min(stage, 7)),
                bounds: CGRect(origin: .zero, size: canvasSize)
            )
            painter.draw(into: &context)
        }
        .foregroundStyle(CoinyTheme.ink)
        .accessibilityHidden(true)
    }
}

/// Pure geometry for the stand-in creature. All coordinates are fractions of
/// the canvas, so the same drawing reads at Full, Panel, and Stamp.
private struct CreaturePainter {
    let condition: CreatureCondition
    let stage: Int
    let bounds: CGRect

    func draw(into context: inout GraphicsContext) {
        let ink = GraphicsContext.Shading.foreground

        // Stage 0 is the egg: an oval with a single speck, no face.
        if stage == 0 && condition != .disconnected {
            let egg = CGRect(
                x: bounds.width * 0.28,
                y: bounds.height * 0.18,
                width: bounds.width * 0.44,
                height: bounds.height * 0.62
            )
            context.stroke(Path(ellipseIn: egg), with: ink, lineWidth: max(bounds.width * 0.03, 1))
            let speck = CGRect(
                x: bounds.midX - bounds.width * 0.03,
                y: bounds.height * 0.42,
                width: bounds.width * 0.06,
                height: bounds.width * 0.06
            )
            context.fill(Path(ellipseIn: speck), with: ink)
            return
        }

        // Body: a rounded form that grows with stage. Sleeping curls lower.
        let grown = CGFloat(stage) / 7
        let bodyWidth = bounds.width * (0.52 + 0.10 * grown)
        let bodyHeight = condition == .sleeping
            ? bounds.height * 0.38
            : bounds.height * (0.48 + 0.14 * grown)
        let bodyRect = CGRect(
            x: bounds.midX - bodyWidth / 2,
            y: bounds.height * 0.82 - bodyHeight,
            width: bodyWidth,
            height: bodyHeight
        )
        let body = Path(roundedRect: bodyRect, cornerRadius: bodyWidth * 0.30)
        context.stroke(body, with: ink, lineWidth: max(bounds.width * 0.03, 1))

        // Later stages earn two ear nubs; silhouette change, not decoration.
        if stage >= 5 && condition != .sleeping {
            let nubSize = bodyWidth * 0.12
            for xFraction: CGFloat in [0.30, 0.70] {
                let nub = CGRect(
                    x: bodyRect.minX + bodyRect.width * xFraction - nubSize / 2,
                    y: bodyRect.minY - nubSize * 0.7,
                    width: nubSize,
                    height: nubSize
                )
                context.fill(Path(ellipseIn: nub), with: ink)
            }
        }

        drawEyes(into: &context, bodyRect: bodyRect, ink: ink)
    }

    /// Eyes are the whole expression, chosen so each state is unmistakable
    /// with color removed and at Stamp size.
    private func drawEyes(into context: inout GraphicsContext, bodyRect: CGRect, ink: GraphicsContext.Shading) {
        let eyeSize = max(bodyRect.width * 0.11, 1.5)
        let eyeY = bodyRect.minY + bodyRect.height * 0.34
        let spacing = bodyRect.width * 0.22
        // Disconnected looks off to the side: patient, watching the room,
        // never distressed.
        let lookOffset = condition == .disconnected ? bodyRect.width * 0.10 : 0
        let leftCenter = CGPoint(x: bodyRect.midX - spacing / 2 + lookOffset, y: eyeY)
        let rightCenter = CGPoint(x: bodyRect.midX + spacing / 2 + lookOffset, y: eyeY)
        let lineWidth = max(bounds.width * 0.03, 1)

        for center in [leftCenter, rightCenter] {
            switch condition {
            case .sleeping:
                // Closed: a short horizontal line. Peaceful, never grey or small.
                var path = Path()
                path.move(to: CGPoint(x: center.x - eyeSize, y: center.y))
                path.addLine(to: CGPoint(x: center.x + eyeSize, y: center.y))
                context.stroke(path, with: ink, lineWidth: lineWidth)
            case .celebrating:
                // Upward arcs.
                var path = Path()
                path.addArc(
                    center: CGPoint(x: center.x, y: center.y + eyeSize * 0.5),
                    radius: eyeSize,
                    startAngle: .degrees(200),
                    endAngle: .degrees(340),
                    clockwise: false
                )
                context.stroke(path, with: ink, lineWidth: lineWidth)
            case .concerned:
                // Half-lidded: a filled lower semicircle.
                var path = Path()
                path.addArc(center: center, radius: eyeSize, startAngle: .zero, endAngle: .degrees(180), clockwise: false)
                path.closeSubpath()
                context.fill(path, with: ink)
            case .idle, .disconnected:
                context.fill(
                    Path(ellipseIn: CGRect(
                        x: center.x - eyeSize,
                        y: center.y - eyeSize,
                        width: eyeSize * 2,
                        height: eyeSize * 2
                    )),
                    with: ink
                )
            }
        }
    }
}

#Preview("Conditions") {
    VStack(spacing: 16) {
        HStack(spacing: 16) {
            ForEach([0, 2, 5, 7], id: \.self) { stage in
                CoinyWindow(size: .panel, condition: .idle, stage: stage)
            }
        }
        HStack(spacing: 16) {
            CoinyWindow(size: .panel, condition: .disconnected, stage: 1)
            CoinyWindow(size: .panel, condition: .sleeping, stage: 4)
            CoinyWindow(size: .panel, condition: .celebrating, stage: 4)
            CoinyWindow(size: .panel, condition: .concerned, stage: 4)
        }
    }
    .padding()
    .background(CoinyTheme.screen)
}
