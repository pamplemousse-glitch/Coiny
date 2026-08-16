import Foundation

/// The blocks the legal documents are actually made of. Deliberately short:
/// this parses `docs/legal/*.md`, not Markdown in general, and it is easier to
/// keep those two files inside this list than to carry a parser.
enum LegalBlock: Equatable, Identifiable {
    case title(String)
    case heading(String)
    case paragraph(String)
    case bullet(String)
    case note(String)
    /// One table row, flattened into a lead cell and its remaining cells paired
    /// with their column headers. Tables do not fit a phone column, and a row
    /// read as "Neon. Database hosting. Holds: ..." is also what VoiceOver
    /// needs, so the flattening is the accessible rendering rather than a
    /// concession.
    case tableRow(lead: String, fields: [(label: String, value: String)])

    var id: String {
        switch self {
        case .title(let text): return "title:\(text)"
        case .heading(let text): return "heading:\(text)"
        case .paragraph(let text): return "p:\(text)"
        case .bullet(let text): return "li:\(text)"
        case .note(let text): return "note:\(text)"
        case .tableRow(let lead, let fields): return "row:\(lead):\(fields.count)"
        }
    }

    static func == (lhs: LegalBlock, rhs: LegalBlock) -> Bool { lhs.id == rhs.id }
}

enum LegalMarkdown {
    /// Splits a legal document into blocks. Paragraphs are joined across soft
    /// line breaks, because both source files are hard-wrapped at 80 columns
    /// and rendering those breaks literally would produce a ragged column on
    /// every phone.
    static func parse(_ markdown: String) -> [LegalBlock] {
        var blocks: [LegalBlock] = []
        var paragraph: [String] = []
        var quote: [String] = []
        var tableHeaders: [String] = []

        func flushParagraph() {
            guard !paragraph.isEmpty else { return }
            blocks.append(.paragraph(paragraph.joined(separator: " ")))
            paragraph.removeAll()
        }

        func flushQuote() {
            guard !quote.isEmpty else { return }
            blocks.append(.note(quote.joined(separator: " ")))
            quote.removeAll()
        }

        for rawLine in markdown.components(separatedBy: .newlines) {
            let line = rawLine.trimmingCharacters(in: .whitespaces)

            if line.isEmpty {
                flushParagraph()
                flushQuote()
                tableHeaders = []
                continue
            }

            if line.hasPrefix("|") {
                flushParagraph()
                flushQuote()
                appendTableLine(line, headers: &tableHeaders, into: &blocks)
                continue
            }
            tableHeaders = []

            if line.hasPrefix(">") {
                flushParagraph()
                quote.append(String(line.dropFirst()).trimmingCharacters(in: .whitespaces))
                continue
            }
            flushQuote()

            if line.hasPrefix("- ") {
                flushParagraph()
                blocks.append(.bullet(String(line.dropFirst(2))))
                continue
            }

            if let heading = headingText(line) {
                flushParagraph()
                blocks.append(line.hasPrefix("# ") ? .title(heading) : .heading(heading))
                continue
            }

            paragraph.append(line)
        }

        flushParagraph()
        flushQuote()
        return blocks
    }

    private static func headingText(_ line: String) -> String? {
        for marker in ["#### ", "### ", "## ", "# "] where line.hasPrefix(marker) {
            return String(line.dropFirst(marker.count))
        }
        return nil
    }

    private static func appendTableLine(_ line: String, headers: inout [String], into blocks: inout [LegalBlock]) {
        let cells = line
            .split(separator: "|", omittingEmptySubsequences: false)
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        // The `|---|---|` rule carries no content.
        if cells.allSatisfy({ $0.allSatisfy { $0 == "-" || $0 == ":" } }) { return }

        if headers.isEmpty {
            headers = cells
            return
        }

        guard let lead = cells.first else { return }
        let fields = cells.dropFirst().enumerated().map { index, value in
            (label: index + 1 < headers.count ? headers[index + 1] : "", value: value)
        }
        blocks.append(.tableRow(lead: lead, fields: Array(fields)))
    }

    /// Renders inline `**bold**` and links. Falls back to the raw text, which
    /// keeps every word of a legal document on screen even if it contains
    /// something the inline parser chokes on.
    static func inline(_ text: String) -> AttributedString {
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: text, options: options)) ?? AttributedString(text)
    }
}
