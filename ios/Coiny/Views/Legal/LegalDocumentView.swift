import SwiftUI

/// Renders one bundled legal document (design-direction section 4: flat rows on
/// an opaque fill, one hairline, no cards, no accent but the one).
///
/// If `LegalDocument.hostedURL` is ever filled in, this view hands off to
/// Safari instead and the rest of the app is unaffected.
struct LegalDocumentView: View {
    let document: LegalDocument

    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var blocks: [LegalBlock] = []
    @State private var loadFailed = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    if loadFailed {
                        // Never a blank page. A legal document that silently
                        // fails to render is indistinguishable from one that
                        // was never written.
                        Text("This document could not be opened on this build. Email contact@athanorworks.com and we will send it to you.")
                            .font(.body)
                            .foregroundStyle(CoinyTheme.ink)
                    }
                    ForEach(blocks) { block in
                        view(for: block)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 32)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(CoinyTheme.screen)
            .navigationTitle(document.title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .task { load() }
    }

    private func load() {
        // A hosted copy, once one exists, is authoritative: it is the version
        // the user can also reach from a browser and the one the App Store
        // listing points at.
        if let hosted = document.hostedURL {
            openURL(hosted)
            dismiss()
            return
        }
        guard let markdown = document.loadMarkdown() else {
            loadFailed = true
            return
        }
        blocks = LegalMarkdown.parse(markdown)
    }

    @ViewBuilder
    private func view(for block: LegalBlock) -> some View {
        switch block {
        case .title(let text):
            Text(text)
                .font(.title2.weight(.semibold))
                .foregroundStyle(CoinyTheme.ink)
        case .heading(let text):
            Text(text)
                .font(.headline)
                .foregroundStyle(CoinyTheme.ink)
                .padding(.top, 12)
        case .paragraph(let text):
            Text(LegalMarkdown.inline(text))
                .font(.body)
                .foregroundStyle(CoinyTheme.ink)
        case .bullet(let text):
            bullet(text)
        case .note(let text):
            note(text)
        case .tableRow(let lead, let fields):
            tableRow(lead: lead, fields: fields)
        }
    }

    private func bullet(_ text: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text("-")
                .font(.body)
                .foregroundStyle(CoinyTheme.ink3)
                .accessibilityHidden(true)
            Text(LegalMarkdown.inline(text))
                .font(.body)
                .foregroundStyle(CoinyTheme.ink)
        }
    }

    private func note(_ text: String) -> some View {
        Text(LegalMarkdown.inline(text))
            .font(.callout)
            .foregroundStyle(CoinyTheme.ink2)
            .padding(.leading, 12)
            .overlay(alignment: .leading) { hairline.frame(width: 1) }
    }

    private func tableRow(lead: String, fields: [(label: String, value: String)]) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(LegalMarkdown.inline(lead))
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(CoinyTheme.ink)
            ForEach(fields, id: \.label) { field in
                Text("\(field.label): \(field.value)")
                    .font(.callout)
                    .foregroundStyle(CoinyTheme.ink2)
            }
        }
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .overlay(alignment: .top) { hairline.frame(height: 1) }
        .accessibilityElement(children: .combine)
    }

    /// The one shadow the design system allows, which is not a shadow
    /// (design-direction 4.4).
    private var hairline: some View {
        Rectangle()
            .fill(CoinyTheme.rule)
            .accessibilityHidden(true)
    }
}

#Preview("Privacy Policy") {
    LegalDocumentView(document: .privacyPolicy)
}
