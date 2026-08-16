# Coiny pre-launch verification: Part 6, Accessibility

**This is Part 6 only.** The brief in `docs/prompts/prompt-prelaunch-verification.md`
specifies seven parts. This file contains Part 6, sections 6.0 to 6.8. Part 1
(Security) is at `01-security.md`; Parts 2, 3, 4, 5 and 7 are absent and nothing
here implies them. Part 3 audits visual craft in parallel; where a finding is
both an accessibility failure and a design-system violation this file rules on
the accessibility half and says so.

**Written 2026-08-15** against the working tree at commit `a1cc603`, branch
`docs/prelaunch-verification`. Every contrast number below was computed from the
hex values in the source, not estimated; the WCAG 2.x relative-luminance formula
was applied to the exact tokens in `ios/Coiny/Views/CoinyTheme.swift` and to
Apple's and Material's documented system colour values. UNVERIFIED rows name the
instrument and the event that settles them.

Severity uses the PRD scale: **BLOCKER**, **MAJOR**, **MINOR**, **LATER**.

Standard: **WCAG 2.2 Level AA**, as applied to native mobile per W3C's mobile
accessibility guidance, plus Apple's 44pt and Google's 48dp platform minimums.
Success criteria are cited by number so a row can be mapped to the standard.

---

## 6.0 Why this part exists, and what it covers

The Department of Justice states that "the ADA's requirements apply to all the
goods, services, privileges, or activities offered by public accommodations,
including those offered on the web"
(https://www.ada.gov/resources/web-guidance/, fetched 2026-08-15). The same page
states that the Department "does not have a regulation setting out detailed
standards" for private businesses, and names no small-business exemption. So the
legal position is: the obligation is real and unbounded by company size, the
technical standard is not fixed by regulation, and WCAG 2.2 AA is what
plaintiffs, defendants and settlements converge on. A solo founder does not get
a discount, and a fintech app that handles bank balances is not an unlikely
defendant.

The second half of the argument is cheaper to act on. An app that works under
VoiceOver and at AX5 text sizes reads as built by someone who cared. Coiny's
core signal is a creature's visual state, which makes "never colour alone" a
product requirement before it is a compliance one (`docs/prd.md` §11, opening
paragraph). The good news, established below, is that the surfaces rebuilt
against the design system are genuinely strong. The bad news is that the app
contains two populations of screens and only one of them was ever looked at.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 6.0.1 | Accessibility is a legal obligation for this product, not a nice-to-have | Read DOJ's own guidance rather than a summary | VERIFIED | https://www.ada.gov/resources/web-guidance/ states the ADA applies to services offered online and sets out no small-business exemption |
| 6.0.2 | No fixed federal technical standard binds a private app, so the bar must be chosen deliberately | Same source, plus the repo's own commitment | VERIFIED, WCAG 2.2 AA chosen | DOJ: "does not have a regulation setting out detailed standards"; `docs/prd.md:482` already commits to "AA (4.5:1 normal, 3:1 large/graphics)" |
| 6.0.3 | The scope of the audit is known | Enumerate the surfaces | VERIFIED | 46 SwiftUI view files under `ios/Coiny/Views` plus 5 Compose screens under `android/app/src/main/kotlin/app/coiny/ui`; no web surface exists |
| 6.0.4 | The design-system surfaces and the legacy surfaces are distinguishable, because their accessibility posture differs | Count which view files reference a palette token | VERIFIED | 14 of 46 view files reference `CoinyTheme.` or `OnboardingPalette.`; of the 32 that do not, one is `CoinyTheme.swift` itself, so 31 render entirely in stock SwiftUI styling. Every contrast FAILS row below falls in that 31 |
| 6.0.5 | The PRD's own accessibility status is honest | Read Appendix C against the code | VERIFIED, with one stale statement | `docs/prd.md:890` says "Partial, built per-view in every new surface" which matches; but `docs/prd.md:482` says "Nothing is implemented; the app has no asset catalog at all" when `CoinyTheme.swift:6-31` implements all nine light and dark tokens in Swift. The absence of an asset catalog is real (6.3.11); the absence of the palette is not |

---

## 6.1 VoiceOver: labelling and operability

WCAG 1.1.1 (non-text content), 1.3.1 (info and relationships), 4.1.2 (name,
role, value). The creature is the product, so it is the first row.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 6.1.1 | The Window states the creature's condition and the active rung in words (R-11.2) | Read the label generator and both call sites | VERIFIED | `ios/Coiny/Models/HomePresentation.swift:202-220` returns e.g. "Coiny is asleep. Rung 4, Buffer, 62 percent complete."; applied at `HomeView.swift:149` (collapsed) and `HomeView.swift:252` (expanded header) |
| 6.1.2 | The creature drawing does not double-announce beneath its own label | Check the art view and the frame for a hidden or ignore modifier | VERIFIED | `CreaturePlaceholderArt.swift:29` sets `.accessibilityHidden(true)`; `CreatureWindow.swift:43` sets `.accessibilityElement(children: .ignore)`; `HomeView.swift:148` repeats `.ignore` before applying the label |
| 6.1.3 | The creature is operable by VoiceOver, not merely readable | Confirm a trait and an action, not just a label | VERIFIED | `HomeView.swift:151` adds `.isButton`, `:150` a hint, `:152` an `.accessibilityAction` calling `setExpanded(true)` |
| 6.1.4 | The collapsed Home view exposes exactly one accessibility action that expands (R-4.1b's stated verification) | Enumerate accessibility actions on the collapsed surface | VERIFIED | One `.accessibilityAction` exists, on the Window (`HomeView.swift:152`); `ActiveRungBlock` is a combined element with no action (`HomeView.swift:164-166`), so the visual tap target is wider than the VoiceOver one by design |
| 6.1.5 | The onboarding creature is labelled per state | Read the state-to-string map | VERIFIED | `Onboarding/OnboardingCreatureWindow.swift:108-116` covers all five states; applied at `:90` after `.ignore` at `:89` |
| 6.1.6 | The pet's speech line is not announced as an empty element when there is nothing to say | Read the speech area | VERIFIED | `HomeView.swift:187` hides the element when `speechLine(for:)` is nil |
| 6.1.7 | Charts expose a summary value, not their geometry (R-11.2) | Read both chart views | VERIFIED | `NetWorthView+Groups.swift:62-63` ignores children and applies "Composition: Liquid 40 percent, ..." built at `:82-85`; `HomeView.swift:321` hides `RungProgressBar` entirely and the percent sits beside it as text at `:291-293` |
| 6.1.8 | Journey rows expose their skip options to VoiceOver, not only to long press | Check for an accessibility action set alongside the context menu | VERIFIED | `HomeJourneyView.swift:97-106` declares `.accessibilityActions` mirroring the `.contextMenu` at `:118-122`, so the rotor reaches every skip reason |
| 6.1.9 | Every interactive control has a meaningful accessible name | Enumerate icon-only controls and check each for a label | FAILS | `NetWorthView+WealthInlines.swift:347-352` is a `Button` whose entire label is `Image(systemName: "xmark.circle.fill")` with no `.accessibilityLabel`; VoiceOver falls back to the symbol name for a control that deletes a wallet. It is the only unlabelled icon control (`grep -rn "labelStyle(.iconOnly)"` returns one site, `SettingsView.swift:192`, which is labelled at `:193`). MINOR, destructive |
| 6.1.10 | Decorative imagery is hidden from VoiceOver | Grep every `Image(systemName:)` that is not inside a labelled control | FAILS | `SignInView.swift:16-21` renders a 120x120 decorative symbol with no `.accessibilityHidden(true)`, so the first element on the first screen a user meets announces "face smiling inverse". MINOR |
| 6.1.11 | Form fields announce their purpose rather than an example value | Read the `TextField` call sites in the integration sheets | FAILS | `NetWorthView+CollectibleInlines.swift:187` is `TextField("e.g. 65", text: $newGrade)` inside `Section("Grade (MS number, e.g. 65)")`; the field's accessible name is "e.g. 65". Same shape at `:186`, `:189`, `NetWorthView+TruelayerInlines.swift:226`, `ManualAssetsView.swift:103`. MINOR (WCAG 3.3.2) |
| 6.1.12 | Section headings are marked so the rotor can navigate by heading | Grep `.accessibilityAddTraits(.isHeader)` and map to screens | FAILS, partially | Seven header traits exist, all inside the journey and debt surfaces (`HomeJourneyView.swift:24`, `DebtView.swift:14` and `:143`, `DebtPlanSection.swift:27`, `DebtDetailView.swift:262`, `JourneyGoalsSection.swift:18`, `JourneyGuardrailsSection.swift:18`); Wealth, Activity, Settings and the paywall declare none. MINOR |
| 6.1.13 | Indeterminate progress does not trap or spam VoiceOver | Check every `ProgressView` for a label or a hidden modifier | FAILS, partially | `NetWorthView+Groups.swift:225-226` correctly hides it; `SignInView.swift:43-44` and `Onboarding/OnboardingScreens.swift:36` leave a bare `ProgressView` with no label, announced as "in progress" with no subject. MINOR |
| 6.1.14 | R-11.6, the manual VoiceOver pass of all three tabs, the expanded journey and onboarding, has been run | Run it | UNVERIFIED | Never run; `docs/build-status.md:186` and `docs/prd.md:890` both say so. Settles by: Settings > Accessibility > VoiceOver on a device, then walk Home collapsed, Home expanded, Activity, Wealth, Manage accounts, Settings, the paywall and all eight onboarding screens, swiping right through every element and confirming each announcement names the thing and its state. Blocked only by having no device build; it is the single highest-value hour in this part |

**On the 16 files with no accessibility modifiers.** The script that produced
this section counted 249 interactive elements across `ios/Coiny/Views` against
21 `.accessibilityLabel` calls, and 16 files have zero. That ratio is not itself
a finding: SwiftUI derives an accessible name from a `Button`'s text label
automatically, and almost all 249 are text buttons inside `Form` and `List`
containers, which also supply role and 44pt row metrics for free. The real
defects in those files are the four enumerated above (6.1.9, 6.1.10, 6.1.11,
6.1.13) plus the contrast findings in 6.3. Reporting "16 files have no
accessibility code" as a failure would have been the easy and wrong answer.

---

## 6.2 Dynamic Type

WCAG 1.4.4 (resize text) and 1.4.10 (reflow). PRD R-11.3 requires the full
range including the five accessibility sizes, verified by snapshot tests at
default and AX5 for Pet, Plan and Wealth.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 6.2.1 | No view caps or overrides the user's text size | Grep for the capping modifier | VERIFIED | `grep -rn "\.dynamicTypeSize(" ios/Coiny` returns nothing, so no screen clamps the range. This is the correct default and easy to lose in a later edit |
| 6.2.2 | Home's non-scrolling collapsed layout becomes scrollable at accessibility sizes rather than clipping | Read the branch | VERIFIED | `HomeView.swift:16` reads `\.dynamicTypeSize`; `:135-140` wraps `collapsedContent` in a `ScrollView` when `typeSize.isAccessibilitySize`. This is the one place in the app that does the right thing structurally |
| 6.2.3 | The speech area under the Window reserves space for four lines at the largest size (R-11.3) | Read the frame | VERIFIED, as a minimum not a cap | `HomeView.swift:186` uses `minHeight: 88` with `alignment: .top`, so the frame grows rather than clipping; the reserved 88pt stops the layout jumping at default size |
| 6.2.4 | The net worth figure scales with the user's text size | Read the font declaration | FAILS | `NetWorthView.swift:119` is `.font(.system(size: 48, weight: .bold, design: .rounded))`, a fixed point size that ignores Dynamic Type entirely. The single number the product exists to display is the one string in the app that does not respond to the accessibility setting. WCAG 1.4.4. MAJOR |
| 6.2.5 | The same figure in onboarding scales | Read the onboarding equivalent | VERIFIED | `Onboarding/OnboardingConnectScreens.swift:14` declares `@ScaledMetric(relativeTo: .largeTitle) private var displaySize: CGFloat = 44` and `:23` uses it. The two implementations of the same element disagree, which is what makes 6.2.4 a defect rather than a decision |
| 6.2.6 | The pet's voice scales | Read `PetSpeechText` | VERIFIED | `Onboarding/OnboardingScreens.swift:14` uses `@ScaledMetric(relativeTo: .title3) speechSize = 22` with `.fixedSize(horizontal: false, vertical: true)` at `:20` so it wraps rather than truncates |
| 6.2.7 | Fixed-size icon buttons do not clip their glyph at accessibility sizes | Read the frame against the glyph's font | FAILS | `DebtPlanSection.swift:166-169` renders `Image(systemName:)` at `.font(.body.weight(.semibold))`, which scales past 50pt at AX5, inside a hard `.frame(width: 44, height: 44)`. The glyph clips. Same shape is safe in onboarding, which uses `minWidth`/`minHeight` (`OnboardingScreens.swift:62`, `:234`). MINOR |
| 6.2.8 | Informational text is not truncated at large sizes | Grep `lineLimit` and classify each | FAILS | 18 sites, of which the load-bearing one is `HomeView.swift:242` `.lineLimit(2)` on the active rung's blurb in the pinned expanded header: at AX5 the rung's meaning truncates. The remaining 17 are `lineLimit(1)` on holding names in the integration lists (`NetWorthView+CollectibleInlines.swift:46`, `:151`, and siblings). MINOR (WCAG 1.4.4) |
| 6.2.9 | Shrink-to-fit is not used to defeat the user's setting | Read every `minimumScaleFactor` | VERIFIED, narrowly | One site, `Onboarding/OnboardingConnectScreens.swift:25`, `minimumScaleFactor(0.5)` with `lineLimit(1)` on the estimated total. It only engages when the string is width-constrained, so a large-text user still gets growth up to the screen edge; it is a defensible bound on a single-line currency figure and not a blanket cap |
| 6.2.10 | Snapshot tests exist at default and AX5 for the three main screens (R-11.3's stated verification, R-23.5) | Grep the test targets | FAILS | `grep -rn "dynamicTypeSize\|AX5\|snapshot" ios/CoinyTests ios/CoinyUITests` returns no snapshot harness and no size-varying test; the 52 files in `ios/CoinyTests` are model and view-model tests plus `ViewSmokeTests.swift`. `docs/prd.md:622` already flags this. MAJOR, and it is what would stop 6.2.4 recurring |
| 6.2.11 | Every screen survives AX5 on a device without clipping or overlap | Run it | UNVERIFIED | Settings > Accessibility > Display & Text Size > Larger Text, drag to the maximum, then walk Home collapsed and expanded, Wealth, Activity, Manage accounts, the debt detail sheet, the paywall and all eight onboarding screens. Settles when a device build exists; the two known failures to look for first are `NetWorthView.swift:119` and `DebtPlanSection.swift:169` |

---

## 6.3 Contrast

WCAG 1.4.3 (contrast minimum, 4.5:1 normal text and 3:1 for large text, where
large is 18pt or 14pt bold) and 1.4.11 (non-text contrast, 3:1). All ratios
below were computed from source hex values with the WCAG 2.x relative-luminance
formula.

### The design system's own numbers, recomputed

`docs/design-direction.md:303` claims the §4.2 tables are "computed WCAG 2.x
values". They are. Recomputing every cell from the hexes in
`CoinyTheme.swift:8-24` reproduces the published table exactly:

| Token | Light on `screen` | published | Light on `surface` | published | Dark on `screen` | published |
|---|---|---|---|---|---|---|
| `ink` | 14.84 | 14.84 | 16.27 | 16.27 | 14.96 | 14.96 |
| `ink2` | 6.80 | 6.80 | 7.46 | 7.46 | 7.94 | 7.94 |
| `ink3` | 4.15 | 4.15 | 4.55 | 4.55 | 4.75 | 4.75 |
| `signal` | 4.95 | 4.95 | 5.43 | 5.43 | 8.38 | 8.38 |
| `rule` | 1.25 | 1.25 | 1.37 | 1.37 | 1.38 | 1.38 |

That is a rare thing in this repository: a documented number that survives being
checked. The palette is sound. Everything that follows is about the code that
does not use it.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 6.3.1 | The published contrast table is arithmetically correct | Recompute every cell from the hexes | VERIFIED | Table above; all 30 light and dark values reproduce to two decimal places |
| 6.3.2 | The implemented tokens are the specified hexes | Diff `CoinyTheme.swift` against §4.2 | VERIFIED | `CoinyTheme.swift:8-24` matches `docs/design-direction.md:309-336` byte for byte for all nine implemented tokens, in both light and dark |
| 6.3.3 | `ink3`'s constrained use (caption size and above, weight 500, or on `surface`) is honoured | Read every `CoinyTheme.ink3` call site with its font | VERIFIED | All 24 sites are `.caption`, `.caption2` or `.footnote`; the ones on `screen` carry `.weight(.medium)` or monospaced medium (`HomeView.swift:276-277`, `DebtPlanSection.swift:22-24`, `HomeJourneyView.swift:79-81`), which is the permitted case at 4.15:1 |
| 6.3.4 | The primary filled button's label clears AA against its fill | Compute the pair actually used, not the pair documented | FAILS | `HomeView.swift:202-204` sets `.background(CoinyTheme.signalFill)` with `.foregroundStyle(CoinyTheme.screen)`: `#EDEFE7` on `#A85B14` is **4.34:1**, below 4.5 for a 17pt semibold label. §4.2 only ever claimed 5.03 for *white* on `signalFill`, and onboarding uses white (`OnboardingScreens.swift:44-45`, 5.03:1). One-token fix. MINOR |
| 6.3.5 | Secondary text on the non-tokenised screens clears AA | Compute Apple's `secondaryLabel` over `systemBackground` | FAILS | `secondaryLabel` light is `#3C3C43` at 60% alpha, which composites to `#8A8A8E` over white: **3.44:1**, below 4.5. There are 107 `.foregroundStyle(.secondary)` sites across 27 view files. Dark mode is fine (6.36:1); light mode is not. The compliant replacement already exists as `ink2` at 6.80:1. MAJOR by volume |
| 6.3.6 | Tertiary text clears AA | Same computation at 30% alpha | FAILS | `tertiaryLabel` composites to `#C4C4C7` over white: **1.74:1**. Three sites, including `PerformanceView.swift:48` on a holding's quantity. MINOR |
| 6.3.7 | Error text clears AA | Compute `systemRed` on `systemBackground` | FAILS | `#FF3B30` on white is **3.55:1**. Around 20 sites, all `.caption`/`.footnote` so the 3:1 large-text allowance does not apply: `SignInView.swift:38`, `PaywallView.swift:42`, `ZerionView.swift:28`, `NetWorthView+WealthInlines.swift:23` and siblings. MINOR each, systemic together |
| 6.3.8 | Section headings clear AA | Compute each system colour passed to `sectionHeader` | FAILS | `ManageAccountsView.swift:451-455` applies the passed colour to the heading *text* at `.headline` (17pt semibold, so the 4.5 bar). Of the 25 call sites, 23 fail: yellow `#FFCC00` **1.51**, orange **2.20**, green **2.22**, cyan **2.54**, teal **2.57**, brown **3.50**, red **3.55**, pink **3.65**, blue **4.02**, purple **4.13**. Only the two indigo headings (5.65) pass. MAJOR |
| 6.3.9 | The savings-rate figure clears the applicable bar | Compute all three bands | FAILS | `SpendingView.swift:170` colours `.title2.weight(.bold)` (22pt bold, so the 3:1 large-text bar applies): green **2.22** and orange **2.20** fail even that; red **3.55** passes. See also 6.6.5, where the same line fails 1.4.1. MAJOR |
| 6.3.10 | Profit and loss figures clear AA | Compute both branches | FAILS | `PerformanceView.swift:70` at `.caption` (12pt, 4.5 bar): green **2.22**, red **3.55**. `PerformanceView.swift:12` puts the section heading in green at **2.22**. MINOR |
| 6.3.11 | The app's accent colour is its own | Look for an asset catalog | FAILS | `find ios -name "*.xcassets"` returns only checkouts under `ios/.spm-cache`; the app target has none, so `.tint(.accentColor)` at `RootView.swift:40` and `Color.accentColor` at `PaywallView.swift:112` resolve to system blue `#007AFF`, **4.02:1** on white, below AA for the tab bar's own labels. The amber `signal` token exists and is unused here. MINOR for contrast, larger for identity (Part 3) |
| 6.3.12 | The composition bar's segment colours meet non-text contrast where they carry meaning | Decide whether the colours carry meaning at all | VERIFIED, adequately mitigated | `NetWorthView+Groups.swift:71-76` pairs every swatch with `"\(group.title) \(percentText)"` in text, so no reader has to distinguish two segments by hue to get the value; 1.4.11 is not engaged because the graphic is not the sole carrier. The legend text itself is `.caption2` `.secondary` and fails 6.3.5 |
| 6.3.13 | The non-tokenised view files are the whole contrast problem | Test the claim by listing them | VERIFIED | `comm` of the token-using files against all view files: every file named in 6.3.5 through 6.3.11 is in the non-token set; no `CoinyTheme.`-using file appears in any contrast FAILS row. The 31 files are the fix's whole scope: one mechanical substitution pass, not a redesign |
| 6.3.14 | Contrast holds under Increase Contrast, Smart Invert and dark mode on a real display | Run the audit | UNVERIFIED | Xcode > Open Developer Tool > Accessibility Inspector > Audit > Run, on each screen, in light and dark, with Increase Contrast on and off. It flags contrast, missing labels and small targets in one pass. Settles as soon as the app runs in a simulator, which it does today; the blocker is that nobody has run it |

---

## 6.4 Touch targets

Apple's HIG minimum is 44x44pt; Android's is 48dp; WCAG 2.5.8 (AA) is 24x24 CSS
px, which both platform minimums exceed. PRD R-11.5 adopts 44pt.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 6.4.1 | The row primitive is at least 44pt tall in the design-system surfaces | Grep every `minHeight: 44` and confirm each sits on a row, not a label | VERIFIED | 30 sites across `DebtView.swift`, `DebtDetailView.swift`, `DebtPlanSection.swift`, `HomeJourneyView.swift`, `JourneyGoalsSection.swift`, `JourneyGuardrailsSection.swift`, `NetWorthView+Groups.swift`, `PaywallView.swift`, `SettingsView.swift`, `NetWorthView.swift` and both onboarding files |
| 6.4.2 | Icon-only controls are at least 44x44 | Read each icon control's frame | VERIFIED | `DebtPlanSection.swift:169` `.frame(width: 44, height: 44)`; `OnboardingScreens.swift:62` and `:234` `.frame(minWidth: 44, minHeight: 44)`. (The fixed variant clips its glyph at AX5, see 6.2.7; the target itself is correct) |
| 6.4.3 | The creature, the app's primary affordance, is a generous target | Read the frame | VERIFIED | `CreatureWindow.swift:42` is 192pt at Full and 64pt at Panel; `HomeView.swift:173-175` extends the collapsed hit area over the whole surface with `.contentShape(Rectangle())` |
| 6.4.4 | Rows in `Form` and `List` on the integration screens meet 44pt | Confirm the container, not the code | VERIFIED by platform | The 16 files with no explicit metrics render inside `Form`/`List`, whose default row height is 44pt; SwiftUI supplies it and no file overrides `listRowInsets` or sets a smaller height (`grep` for a height under 44 on a row returns nothing) |
| 6.4.5 | No interactive control is smaller than 44pt | Find every control with no frame that is not in a list row | FAILS | `NetWorthView+WealthInlines.swift:347-352`: a bare `Image(systemName: "xmark.circle.fill")` in a `.buttonStyle(.plain)` Button inside an `HStack`, with no frame. At `.body` the symbol is roughly 22pt square, half the minimum, for a destructive action. Same control as 6.1.9; two defects, one line. MINOR |
| 6.4.6 | Adjacent targets are far enough apart to not be mis-hit | Measure on device | UNVERIFIED | Accessibility Inspector's audit reports "hit region is too small" and adjacency problems per element. Run it per screen at default and at AX5, where growing text pushes controls together. The two rows to check first are `NetWorthView+Groups.swift:198-206` (value plus action button in one row) and `DebtPlanSection.swift:136-143` (minus, value, plus at 12pt spacing) |
| 6.4.7 | Android meets 48dp | Read the Compose screens | UNVERIFIED, leaning pass | No `Modifier.size` below 48dp on a clickable exists in the five screens, and Material 3's `IconButton` and `NavigationBarItem` supply 48dp by default; but nothing calls `minimumInteractiveComponentSize()` explicitly, so this rests on component defaults rather than on intent. Settles with Accessibility Scanner on a device |

---

## 6.5 Motion, Reduce Motion, and auto-updating content

WCAG 2.3.3 (animation from interactions, AAA but the platform setting is the AA
answer in practice), 2.2.2 (pause, stop, hide), 1.4.12/1.4.13 adjacent.
`docs/design-direction.md:399` sets the Reduce Motion contract.

**The brief's premise is stale, and that is itself the finding.** There is no
continuous breathing animation on the Home pet screen. `CreaturePlaceholderArt.swift:19-30`
draws a static `Canvas` once per state; there is no idle loop, no 4-to-9-second
blink cycle, no frame swap, no timer. The §4.5 motion table describes an
animated creature that does not exist yet. So Reduce Motion on the Pet screen is
satisfied trivially and will need re-verifying the moment the commissioned
sprites land. The only continuous animation the app actually ships is in
onboarding, and it is gated correctly.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 6.5.1 | The Home creature's animation respects Reduce Motion | Read the drawing code for a timer or repeating animation | NOT APPLICABLE, it has none | `CreaturePlaceholderArt.swift:19-30` is a single `Canvas` draw with no `withAnimation`, no `repeatForever` and no timer; the §4.5 idle loop is unbuilt. Re-audit when sprites land |
| 6.5.2 | The onboarding creature's breathing loop stops under Reduce Motion | Read both the scale and the animation start | VERIFIED | `Onboarding/OnboardingCreatureWindow.swift:72` reads the environment value; `:93-96` returns a scale of exactly 1 when it is on; `:100-106` returns before starting the `repeatForever` animation at all, so no animation is left running invisibly |
| 6.5.3 | The Full-to-Panel morph becomes opacity-only under Reduce Motion | Read the anchored window | VERIFIED | `HomeView.swift:100-110` drops `matchedGeometryEffect` entirely when `reduceMotion`, leaving the `.transition(.opacity)` at `:41`/`:44`; `:92-95` keeps `easeOut` with no spring in either branch |
| 6.5.4 | Screen transitions become opacity-only | Read the flow container | VERIFIED | `OnboardingView.swift:24` reads the environment value; `:31` selects `.opacity` over `.opacity.combined(with: .offset(y: 8))` |
| 6.5.5 | The hatch sequence becomes an instant swap and the emotional information survives (§4.5's explicit requirement) | Read the task | VERIFIED | `Onboarding/OnboardingConnectScreens.swift:256-263` sets `hatchFinished = true` immediately under Reduce Motion rather than skipping the state change, so the hatched creature still appears |
| 6.5.6 | No spring, overshoot or bounce anywhere (§4.5) | Grep for the primitives | VERIFIED | `grep -rn "\.spring(\|bouncy\|interpolatingSpring\|dampingFraction" ios/Coiny` returns nothing. The tell §3 named at `.spring(response: 0.35, dampingFraction: 0.45)` is gone |
| 6.5.7 | Every `repeatForever` animation in the app is gated on Reduce Motion | Grep for the modifier and check each | FAILS, in dead code | `WaitingForFirstReactionView.swift:15-20` pulses a green dot forever with no gate and no `.accessibilityHidden(true)`. The view is unreachable: `grep -rn "WaitingForFirstReactionView(" ios/Coiny` returns nothing, and its own doc comment refers to `PetView`, which no longer exists. Delete it and `TipCard.swift`, which only it uses. MINOR |
| 6.5.8 | Reduce Transparency falls back to opaque surfaces (§4.7, R-11.5) | Grep for the environment value and for materials | FAILS | `grep -rn "reduceTransparency" ios/Coiny` returns nothing, while `.thinMaterial` is applied to content cards at `SpendingView.swift:156`, `:194` and `TipCard.swift:30`. Two of the three are live (the Activity tab's category and savings cards). MINOR for accessibility; it is also a HIG violation Part 3 owns |
| 6.5.9 | Auto-updating content can be paused, or does not disrupt the user (WCAG 2.2.2) | Read the refresh loop and reason about VoiceOver focus | FAILS | `HomeView.swift:66-71` runs `while !Task.isCancelled { sleep 30; await store.refresh() }` with no user control and no pause. Every 30 seconds the Window's label, the speech line and the rung block are rebuilt; VoiceOver focus lands back at the top and any partially-read announcement is interrupted. A screen reader user cannot finish reading Home. MAJOR, and the cheapest fix is to suspend the loop while `UIAccessibility.isVoiceOverRunning` |
| 6.5.10 | No control is operated by device motion (WCAG 2.5.4) | Grep for motion APIs | NOT APPLICABLE | `grep -rn "CMMotion\|accelerometer\|shake" ios/Coiny` returns nothing |
| 6.5.11 | Android's breathing animation respects the platform animation setting | Read the Compose animation | FAILS | `android/app/src/main/kotlin/app/coiny/ui/PetScreen.kt:106-113` starts a `rememberInfiniteTransition` with `infiniteRepeatable`, applied at `:144`, with no check on `Settings.Global.ANIMATOR_DURATION_SCALE`. MINOR while Android does not ship; it becomes MAJOR at parity |

---

## 6.6 Colour alone, and the money-colour rule

WCAG 1.4.1 (use of colour): colour must not be the only visual means of
conveying information, indicating an action, or distinguishing an element. This
is the section the brief singled out, so the verdict is stated first and the
rows support it.

**Verdict: the money-colour rule is not a WCAG 1.4.1 failure where it is
applied, and it is not what breaks 1.4.1 in this app.**

The rule (`docs/design-direction.md:344-358`) is: absolute values in `ink`, only
deltas coloured, every coloured delta carries an explicit sign, the pair is
desaturated moss and clay rather than stoplight, debt is never red, and three
graded health metrics keep a carve-out that must show its threshold inline. By
construction that is a *mitigated* colour rule: rule 3 is the second channel,
and the design document says so in the same breath ("This is a hard
accessibility requirement, not a nicety").

Checking what the code does rather than what the rule says:

- Rules 1, 2 and 5 hold on the rebuilt surfaces. Every absolute value renders in
  ink or `.primary` (`NetWorthView.swift:120-122`, `NetWorthView+Groups.swift:214-217`,
  `Onboarding/OnboardingConnectScreens.swift:24`), and the line §4.3 named as
  wrong, `NetWorthView.swift:157` colouring the total green, no longer exists.
  `DebtView.swift`, `DebtDetailView.swift` and `DebtPlanSection.swift` contain no
  red at all.
- Rule 3, the mitigation itself, is only half implemented. `PerformanceView.swift:68`
  formats with `.currency(code: "USD")`, which emits a leading minus for negative
  values in `en_US` and nothing for positive ones. So loss is distinguishable
  from gain without colour, by the minus. Gain is not distinguishable from zero
  or from a plain balance without colour, because no `+` is emitted anywhere in
  the app (`grep` for `signDisplay` returns nothing). That is a partial failure
  of the rule and a marginal 1.4.1 case, not a clean one.
- Rules 4 and 6 are broken, and rule 6's breakage is the genuine 1.4.1 failure.
  The `positive` and `negative` tokens do not exist in `CoinyTheme.swift` at all;
  the enum has nine members and neither is among them. System `.green` and
  `.red`, which §4.3 rule 4 explicitly bans, are used in about 40 places. And
  `SpendingView.swift:170` renders the savings rate as `"\(rate)%"` in one of
  three hues with no threshold, no sign, no word and no icon: whether 12% is good
  or bad is carried by hue and by nothing else. That is a clean 1.4.1 failure and
  it is the carve-out §4.3 rule 6 warned "should not grow" being applied without
  the inline threshold that made the carve-out defensible.

So the money-colour rule is adequately mitigated as designed, partially
implemented as coded, and the actual 1.4.1 failure is one line in a screen that
was never built against the rule at all.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 6.6.1 | Absolute values are never coloured (§4.3 rule 1) | Read every place a total is rendered | VERIFIED | `NetWorthView.swift:118-120` uses `.primary` with the rule quoted in a comment at `:116-117`; `NetWorthView+Groups.swift:134-137` the same for group totals; `Onboarding/OnboardingConnectScreens.swift:24` uses `OnboardingPalette.ink`. The named offender at old `NetWorthView.swift:157` is gone |
| 6.6.2 | Debt is never rendered in an alarm colour (§4.3 rule 5) | Grep the debt surfaces, then the rest | FAILS, outside the debt surface | `DebtView.swift`, `DebtDetailView.swift` and `DebtPlanSection.swift` contain no `.red` and render balances in `CoinyTheme.ink`/`ink3`; but `ManageAccountsView.swift:411` passes `color: .red` to a heading whose text reads "Debts", so the liabilities section title renders in system red. MINOR for accessibility, MAJOR against the "never shame" principle |
| 6.6.3 | The specified delta tokens exist in code | Read the token enum | FAILS | `CoinyTheme.swift:6-31` declares nine tokens: `screen`, `surface`, `field`, `ink`, `ink2`, `ink3`, `rule`, `signal`, `signalFill`. `positive` (`#3D6B44`) and `negative` (`#9A3B32`) from `docs/design-direction.md:318-319` are absent, so no code path can comply with rule 4 even if it wanted to. MINOR, and it is the prerequisite for fixing 6.6.4 and 6.6.5 |
| 6.6.4 | Every coloured delta carries an explicit sign (§4.3 rule 3) | Read the delta call site and the formatter | FAILS, partially | `PerformanceView.swift:68-70` colours by `value >= 0` and formats with `.currency(code: "USD")`: negatives get a minus from the locale, positives get nothing. `grep -rn "signDisplay" ios/Coiny` returns nothing. Loss survives colour removal; gain does not. MINOR (1.4.1 marginal, §4.3 rule 3 clear) |
| 6.6.5 | No judgement is carried by hue alone | Find every place a colour maps to a band or a state | FAILS | `SpendingView.swift:168-170`: `Text("\(rate)%")` coloured `rate >= 20 ? .green : rate >= 5 ? .orange : .red`. The band is the information, the number is not the band, and no threshold is shown (`:176` says "30-day average"). Rendered greyscale, all three bands are identical. WCAG 1.4.1. MAJOR, and the single worst accessibility finding in this part |
| 6.6.6 | The three-band carve-out shows its threshold inline (§4.3 rule 6) | Read the one place a carve-out is implemented | FAILS | Same line. §4.3 rule 6 permits graded health metrics to keep three-band colouring only if "each shows the threshold inline so the color is explained rather than asserted"; `SpendingView.swift:161-176` shows the rate, the spend and the income, and never the 20% or 5% boundary. MAJOR, same edit as 6.6.5 |
| 6.6.7 | Connection health is carried by words, not by a coloured dot | Read the status renderers | VERIFIED | `SettingsView.swift:179-181` renders `statusText(item)` ("Needs you to sign in again", "Access revoked. Re-link to restore") as text; `NetWorthView+Groups.swift:178-196` does the same per row, and the repairable case is a labelled Button rather than a colour change |
| 6.6.8 | Rung state is carried by words | Read the trailing slot | VERIFIED | `HomeJourneyView.swift:168-203` renders "done", "ACTIVE", "skipped", "not applicable" as text; active is additionally weighted (`:84-86` uses `.semibold` and `ink` versus `ink3`), so state survives both colour removal and greyscale. The ACTIVE pill is `screen` on `signal`, **4.95:1**, which clears AA |
| 6.6.9 | Selection state carries a channel other than colour | Read each selectable control | VERIFIED | `PaywallView.swift:112` varies border width 1 to 2 as well as colour and adds `.isSelected` at `:118`; `OnboardingScreens.swift:142-154` varies fill, text colour and font weight and adds `.isSelected`; `DebtPlanSection.swift:105` adds `.isSelected` |
| 6.6.10 | Every creature state is identifiable with colour removed (R-11.1) | Read the painter | VERIFIED, for the placeholder | `CreaturePlaceholderArt.swift:41` binds all drawing to a single `GraphicsContext.Shading.foreground`, so the whole creature is one colour and every state is a silhouette or an eye shape: closed lines for sleeping (`:109-114`), upward arcs for celebrating (`:115-125`), filled semicircles for concerned (`:126-131`), an averted gaze for disconnected (`:102`). This is the strongest accessibility property in the codebase and it is true by construction rather than by care. It must be re-tested against the commissioned sprites |
| 6.6.11 | The composition bar's information survives colour removal | Read the legend | VERIFIED | `NetWorthView+Groups.swift:71-76` prints "\(group.title) \(percent) percent" beside each swatch and `:82-85` builds the same string for VoiceOver, so no value requires matching a hue to a segment |
| 6.6.12 | The greyscale render test §4.3 rule 3 specifies has been run | Run it | UNVERIFIED | Settings > Accessibility > Display & Text Size > Color Filters > Grayscale on the simulator (or Accessibility Inspector's Color Filters), then screenshot Home, the expanded journey, Wealth, Activity and the paywall. The two screens to look at are Activity (6.6.5) and Manage accounts (6.6.2). Ten minutes, no device needed, never done |
| 6.6.13 | The app is usable with a red-green colour vision deficiency | Run it | UNVERIFIED | Same Color Filters panel, Deuteranopia and Protanopia settings. `docs/design-direction.md:352` states the motivation (roughly 1 in 12 men). Settles with the same ten minutes as 6.6.12 |
| 6.6.14 | Android's mood indicator does not rely on colour | Read the Compose code | VERIFIED | `PetScreen.kt:117-122` selects a distinct icon per band (`SentimentSatisfied`, `SentimentNeutral`, `SentimentDissatisfied`) alongside the tint at `:124-128`, and `:140` supplies `contentDescription = "Pet mood: ${pet.mood} out of 100"`. Shape and text both carry it. The tint itself is `#4CAF50` at **2.71:1** on the Material light surface, below the 3:1 non-text bar, but the information does not depend on it |

---

## 6.7 Android

The Kotlin client is roughly four screens behind and is not on the launch path.
These rows exist so parity work does not start from zero, and so the decision not
to ship it is a decision rather than an omission.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 6.7.1 | Every icon carries a `contentDescription` or is explicitly null for decoration | Grep the five screens | VERIFIED | Six `Icon(` call sites, all handled: `SpendingScreen.kt:64`, `WealthScreen.kt:51`, `PetScreen.kt:67` ("Refresh"), `RootScaffold.kt:43` (tab label), `PetScreen.kt:140` (mood plus value), `PetScreen.kt:188` (`null`, correctly, because the adjacent `StatRow` label carries it) |
| 6.7.2 | Text scales with the system font size | Grep for hardcoded `sp` values | VERIFIED | `grep -rn "\.sp\b" android/app/src/main/kotlin` returns nothing; every `Text` uses `MaterialTheme.typography`, which is `sp`-based and scales |
| 6.7.3 | Touch targets meet 48dp | Read the clickables | UNVERIFIED, leaning pass | See 6.4.7: nothing sets a size below 48dp, but the guarantee rests on Material 3 component defaults rather than on `minimumInteractiveComponentSize()`. Settles with Accessibility Scanner (Play Store) on a connected device, one sweep per screen |
| 6.7.4 | The infinite breathing animation stops when animations are disabled | Read the animation | FAILS | `PetScreen.kt:106-113`, see 6.5.11. MINOR today, MAJOR at Android parity |
| 6.7.5 | Colours meet AA | Read the theme | VERIFIED, by accident | `ui/CoinyTheme.kt:10-20` is the unmodified Material 3 baseline (`primary = 0xFF6750A4`, **6.28:1** on the light surface), so contrast passes because nobody chose the colours. It is not Coiny's palette; Part 3 owns that |
| 6.7.6 | A TalkBack pass has been run | Run it | UNVERIFIED | Enable TalkBack, walk the four screens, confirm the mood icon announces its value and the tab bar announces selection. Should happen at parity, not before |
| 6.7.7 | Android should not ship in its current state | Decide | NOT APPLICABLE to launch | It is four screens behind and has no accessibility verification; shipping it would create an ADA surface with none of the mitigation the iOS app has. Do not ship it. Trigger for revisiting: iOS at App Store parity plus a TalkBack pass (6.7.6) |

---

## 6.8 How this gets verified, and stays verified

One person cannot run a manual accessibility pass on every change. The
recommendation is therefore one automated gate plus one manual gate, and nothing
else.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 6.8.1 | An automated accessibility audit runs in CI on every screen | Add `performAccessibilityAudit()` to the existing UI tests | FAILS, not present | `grep -rn "performAccessibilityAudit" ios` returns nothing. `XCUIApplication.performAccessibilityAudit()` (Xcode 15+, no dependency) catches exactly the classes of defect this part found by hand: unlabelled elements (6.1.9, 6.1.10), contrast (all of 6.3), hit regions under 44pt (6.4.5) and clipped text at large sizes (6.2.4, 6.2.7). It is one line per test in the six files under `ios/CoinyUITests`. **This is the one control to add.** Cost: an afternoon, then zero attention until it fails. MAJOR |
| 6.8.2 | Snapshot tests exist at default and AX5 for the three tabs (R-11.3) | Add them | FAILS, not present | See 6.2.10. Second priority after 6.8.1, because 6.8.1 catches clipping at large sizes anyway and snapshots carry a maintenance cost (every intentional layout change updates a golden image) that one person will resent. MINOR |
| 6.8.3 | The manual VoiceOver pass gate (R-11.6) is scheduled and repeated when a screen's structure changes | Run it before the first TestFlight build | UNVERIFIED | See 6.1.14. It is the gate the PRD already set and it has never been met |
| 6.8.4 | The palette's published contrast numbers cannot silently drift from the code | Add a unit test over the token table | FAILS, not present | The recomputation in 6.3 was done by hand in a scratch script. A 30-line XCTest that computes the WCAG ratio for each `CoinyTheme` token pair and asserts the §4.2 value would make `docs/design-direction.md` §4.2 executable. LATER: worth it once the token substitution pass (6.3.13) lands, not before |
| 6.8.5 | No third-party accessibility overlay or widget is added | Decide and record the decision | NOT APPLICABLE, deliberately | Overlay products are a recurring subject of ADA litigation rather than a defence against it, they conflict with PRD §24's no-vendor-SDK decision and with the privacy manifest that rests on it, and there is no native-iOS overlay market anyway. **This is the one control to explicitly not add.** No trigger changes this |

**What to do first, in order.** 6.6.5 and 6.6.2 are two edits in
`SpendingView.swift` and `ManageAccountsView.swift` and remove the only clean
1.4.1 failure. 6.2.4 is one line in `NetWorthView.swift`. 6.5.9 is a
`UIAccessibility.isVoiceOverRunning` check around one `while` loop. Then 6.8.1,
which stops all four recurring. Then the mechanical token substitution across
the 31 non-tokenised files (6.3.13), which closes most of 6.3 at once. Then
6.1.14, the manual pass, before TestFlight. Total is well under a week and none
of it needs a designer.

---

## Bullet-to-row map

The brief for Part 6 lists six things to verify at minimum, plus the legal
framing. Confirming each produced at least one row:

| Brief bullet | Rows |
|---|---|
| Legal framing: ADA covers mobile apps, no small-business exemption | 6.0.1, 6.0.2 |
| VoiceOver labels on every interactive element, including the creature | 6.1.1 to 6.1.14 (creature specifically at 6.1.1, 6.1.2, 6.1.3, 6.1.4, 6.1.5) |
| Dynamic Type at the largest accessibility sizes without clipping | 6.2.1 to 6.2.11 |
| Contrast ratios against the design system's palette, computed | 6.3.1 to 6.3.14, plus the recomputed table above 6.3.1 |
| Touch target sizes (44pt iOS, 48dp Android) | 6.4.1 to 6.4.7, Android at 6.4.7 and 6.7.3 |
| Motion sensitivity / Reduce Motion given the continuous animation | 6.5.1 to 6.5.11 |
| Whether any information is conveyed by colour alone | 6.6.1 to 6.6.14 |
| The money-colour rule as a colour-alone risk by construction | Verdict prose above 6.6.1, plus rows 6.6.3, 6.6.4, 6.6.5, 6.6.6 |

Every subsection 6.0 through 6.8 has a table. Two things the brief did not name
but that the sweep surfaced, kept because omitting them would leave a hole: the
30-second auto-refresh loop that makes Home unreadable under VoiceOver (6.5.9),
and the absence of `positive`/`negative` from the implemented token set, which
makes §4.3 rule 4 unsatisfiable in code rather than merely unsatisfied (6.6.3).

## What this part did not cover

- Any verdict that needs the app running on a physical device with VoiceOver,
  TalkBack, Voice Control or a switch: 6.1.14, 6.2.11, 6.3.14, 6.4.6, 6.4.7,
  6.6.12, 6.6.13, 6.7.3, 6.7.6.
- Voice Control and Switch Control specifically. Both largely follow from the
  labels and targets audited above, and neither warrants its own pass before a
  first tester exists.
- Cognitive accessibility, reading level and the plainness of the copy. Part 3
  owns copy; the PRD's locked strings in §10 are already plain.
- Accessibility of the commissioned creature art, which does not exist. R-11.1's
  greyscale acceptance test binds each commission phase; 6.6.10 records that the
  placeholder passes by construction and that this guarantee does not transfer.
- The backend. Nothing in `backend/src` renders a user interface.
