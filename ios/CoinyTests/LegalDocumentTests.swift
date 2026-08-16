import XCTest
@testable import Coiny

/// The legal surface has one failure mode that matters: the documents are not
/// in the binary, or they are and render as nothing. Both are silent, and both
/// mean the app ships without the notice Apple and Reg P require it to deliver.
final class LegalDocumentTests: XCTestCase {
    func testBothDocumentsAreInTheAppBundle() throws {
        for document in LegalDocument.allCases {
            let text = try XCTUnwrap(
                document.loadMarkdown(),
                "\(document.rawValue).md is missing from the app bundle"
            )
            XCTAssertFalse(text.isEmpty)
        }
    }

    func testPrivacyPolicyParsesIntoHeadingsAndProse() throws {
        let markdown = try XCTUnwrap(LegalDocument.privacyPolicy.loadMarkdown())
        let blocks = LegalMarkdown.parse(markdown)

        XCTAssertTrue(blocks.contains { if case .title = $0 { return true } else { return false } })
        XCTAssertTrue(blocks.contains { if case .heading = $0 { return true } else { return false } })
        XCTAssertTrue(blocks.contains { if case .paragraph = $0 { return true } else { return false } })
        // The service-provider tables are the part a naive line renderer turns
        // into pipe soup.
        XCTAssertTrue(blocks.contains { if case .tableRow = $0 { return true } else { return false } })
    }

    func testHardWrappedLinesJoinIntoOneParagraph() {
        let blocks = LegalMarkdown.parse("A sentence that was\nwrapped at eighty columns.\n\nNext.")
        XCTAssertEqual(blocks.first, .paragraph("A sentence that was wrapped at eighty columns."))
    }

    func testTableRowsPairEachCellWithItsColumnHeader() {
        let blocks = LegalMarkdown.parse(
            """
            | Provider | What they do |
            |---|---|
            | Neon | Database hosting |
            """
        )
        guard case .tableRow(let lead, let fields)? = blocks.first else {
            return XCTFail("expected one table row, got \(blocks)")
        }
        XCTAssertEqual(lead, "Neon")
        XCTAssertEqual(fields.map(\.label), ["What they do"])
        XCTAssertEqual(fields.map(\.value), ["Database hosting"])
    }

    func testBundledCopyIsUsedWhileNoHostedURLExists() {
        // The seam that replaces the bundled copy later. If a URL is filled in,
        // this test is the reminder that the in-app renderer stops being the
        // delivery mechanism and the hosted page starts.
        for document in LegalDocument.allCases {
            XCTAssertNil(document.hostedURL, "fill in hostedURL and update this expectation together")
        }
    }
}
