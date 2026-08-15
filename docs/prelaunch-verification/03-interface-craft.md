# Coiny pre-launch verification: Part 3, Interface craft and the anti-slop audit

Written 2026-08-15 against `docs/design-direction.md` §3 and §4, `docs/prd.md` §5.2,
§8, §10 and §11, and the working tree at `da72e8d` on branch
`docs/prelaunch-verification`. Part 1 (`01-security.md`) covers security; nothing
here repeats it. `docs/launch-gap-analysis.md` covers what is missing; this part
covers what is present and whether it was made or defaulted.

Status vocabulary and row shape are the document's, defined in the brief.
Severity is the PRD's scale: BLOCKER, MAJOR, MINOR, LATER.

**Scope note.** §3 was written against `OnboardingView.swift`, `PetView.swift`,
`NetWorthView.swift` and `SpendingView.swift`. Two of those four files no longer
exist in the form §3 describes. Row 3.1.x therefore reports one of three
outcomes per tell: **removed**, **still present at or near the named line**, or
**relocated** (deleted from the named file, reintroduced elsewhere). Relocated is
the most common outcome and it is the finding of this part.

## 3.0 How this was audited, and how to reproduce it

Scripted sweeps over `ios/Coiny/` and `android/app/src/main/kotlin/`, then the
files the hits landed in read in full. Every command below is re-runnable from
the repo root and its output is the evidence for the rows that cite it.

```
# chromatic system colours (excludes .secondary/.primary)
grep -rnE "(Color\.|foregroundStyle\(\.|\.fill\(\.|\.background\(\.|\.tint\(\.|stroke\(\.)(blue|green|red|purple|pink|orange|yellow|indigo|cyan|mint|teal|brown)\b" --include="*.swift" ios/Coiny
# design-token adoption
grep -rl 'CoinyTheme\.\|OnboardingPalette\.' --include='*.swift' ios/Coiny/Views | wc -l
# glass on content
grep -rnE "\.thinMaterial|ultraThinMaterial|regularMaterial|glassEffect" --include="*.swift" ios/Coiny
# motion
grep -rnE "\.spring|bouncy|interpolatingSpring|repeatForever|withAnimation" --include="*.swift" ios/Coiny
# copy tells
grep -rnP '[\x{2014}\x{2192}\x{2190}]' --include="*.swift" ios/Coiny
grep -rnE '"[^"]*!["[:space:]]' --include="*.swift" ios/Coiny | grep -v "!="
# spatial scale (allowed: 2 4 8 12 20 32 56; radii 2 4 10 pill)
grep -rohE "spacing: [0-9]+|cornerRadius: [0-9]+" --include="*.swift" ios/Coiny | sort | uniq -c
```

Row counts: 171 rows. 72 VERIFIED, 93 FAILS, 4 UNVERIFIED, 2 NOT APPLICABLE.
Counted with:

```
grep -E '^\| 3\.[0-9]+\.[0-9]+[a-z]? \|' docs/prelaunch-verification/03-interface-craft.md \
  | awk -F'|' '{c=$5; gsub(/^ +| +$/,"",c); split(c,a,","); k=a[1]; gsub(/^ +| +$/,"",k); n[k]++} \
    END{for(x in n) print n[x], x}' | sort -rn
```

The FAILS proportion is high because §3 was a list of thirteen known defects and
this part checks whether they were fixed; it is not a survey of an unexamined
surface. Only 4 rows are UNVERIFIED because interface craft is almost entirely
readable from source, which makes this the one part of the document that does
not need a device to reach a verdict. §3.14 states plainly what is good, and
there is a lot of it.

---

## 3.1 The §3.1 checklist, re-audited tell by tell

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.1.1 | Tell 1, the indigo-purple-pink gradient, is gone from the first screen a user sees | Grep for `.purple`, `.pink`, and any `Gradient` across `ios/Coiny` | FAILS | `SignInView.swift:20` is `.foregroundStyle(.purple, .pink)` on the 120pt hero. `OnboardingView.swift:62`/`:290` were deleted, so this is the same treatment relocated to the screen before onboarding. BLOCKER |
| 3.1.2 | Tell 2, the mascot as a system glyph, is gone | Grep `Image(systemName:` for face symbols; read every creature render path | FAILS, partially | `SignInView.swift:16` is `Image(systemName: "face.smiling.inverse")`, the exact symbol §3.1 row 2 named. Home replaced it correctly (`CreaturePlaceholderArt.swift:14-31`, a hand-drawn `Canvas`). Android still ships it (3.13.2). BLOCKER |
| 3.1.3 | Tell 3, the rainbow badge grid, is gone | Count coloured `sectionHeader` calls across all views | FAILS, relocated | `NetWorthView.swift` no longer has it; `ManageAccountsView.swift:156-411` has 19 `GroupBox` sections, each `sectionHeader(... icon: <SF Symbol>, color: <hue>)` across `.blue .green .orange .purple .yellow .indigo .brown .teal .pink .cyan .red`. Rendered at `:451-458`. MAJOR |
| 3.1.4 | Tell 4, glassmorphism on content, is gone | `grep -rn "thinMaterial\|glassEffect"` | FAILS, unchanged | `SpendingView.swift:156` and `:194` are still `.background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))` at the same line numbers §3.1 named. `TipCard.swift:30` adds a third at radius 16. MAJOR |
| 3.1.5 | Tell 5, SF Rounded on the hero number, is gone | Grep `design: .rounded` | FAILS, unchanged | `NetWorthView.swift:119` is `.font(.system(size: 48, weight: .bold, design: .rounded))`, the same declaration §3.1 named at `:156`, on the same number. MAJOR |
| 3.1.6 | Tell 6, stoplight money colours on absolute values, is gone | Grep `.green`/`.red`/`.orange` in a value-rendering context | FAILS, one site survives | `SpendingView.swift:170` colours the savings rate `.green`/`.orange`/`.red` by threshold. The net worth total was fixed (`NetWorthView.swift:118-120` renders `.primary` with the rule cited in comment). Savings rate is not on §4.3 rule 6's carve-out list. MAJOR |
| 3.1.7 | Tell 7, cards inside cards, is gone | Grep `GroupBox`; read the containing stack | FAILS, relocated | `NetWorthView+Groups.swift:112-126` is `GroupBox { VStack { Divider ... } }` inside `NetWorthView.swift:58` `ScrollView { VStack }`, the exact nesting §3.1 row 7 named. `ManageAccountsView` repeats it 19 times. MAJOR |
| 3.1.8 | Tell 8, typographic arrows in copy, is gone | `grep -rnP '[\x{2192}\x{2190}]'` | FAILS, relocated | `OnboardingView.swift:296` "Let's go →" was deleted and replaced correctly with "Meet them" (`OnboardingConnectScreens.swift:250`). But `NetWorthView+WealthInlines.swift:173` now reads "open Kalshi → Settings → API Keys → Add Key". MINOR |
| 3.1.9 | Tell 9, the weightless symmetric tagline, is gone | Grep the literal string | FAILS, relocated | "Your pocket-sized financial companion" is at `SignInView.swift:25`, verbatim the string §3.1 row 9 named at `OnboardingView.swift:68`. The prescribed replacement, "Coiny watches your money and reacts", exists at `OnboardingScreens.swift:80`, one screen later. MAJOR |
| 3.1.10 | Tell 10, emoji in user-facing strings, is absent | `grep -rnP '"[^"]*[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}][^"]*"'` over `ios/Coiny` | VERIFIED | Zero emoji in any Swift string literal. The one hit is the arrow at 3.1.8, not an emoji. Push titles are separately covered by PRD R-9.7 (backend, not this part) |
| 3.1.11 | Tell 11, uniform spacing everywhere, is gone | Count spacing and padding values against the §4.4 scale `2 4 8 12 20 32 56` | FAILS | 121 off-scale spatial values across 33 files (28 `spacing:`, 93 `.padding(n)`). `6` alone accounts for 70 of them. `NetWorthView.swift:59` is `VStack(spacing: 16)` for every child of the Wealth screen, which is the "one default gap repeated" pattern §3.1 row 11 described. MINOR |
| 3.1.12 | Tell 12, bounce and elastic easing, is gone | `grep -rnE "\.spring\|bouncy\|interpolatingSpring\|\.snappy"` | VERIFIED | Zero matches in `ios/Coiny`. Every animation in the tree is `easeOut` or `easeInOut`; `HomeView.swift:94` is `.easeOut(duration: 0.26)`, inside the 180-260ms budget. `PetView.swift:118` no longer exists |
| 3.1.13 | Tell 13, always-visible vitality bars, is gone | Read every creature render path for `ProgressView`; check the Window contract | VERIFIED, on iOS | `CreatureWindow.swift:21-25` states and enforces that no gauge renders inside the Window; `HomeView.swift` shows no Health or Mood bar. Android still has both (3.13.4) |

**The pattern, stated once.** Eleven of the thirteen tells were addressed by
rewriting the file §3 named. Six of them then reappeared in a file §3 did not
name: `SignInView`, `ManageAccountsView`, `NetWorthView+Groups`,
`NetWorthView+WealthInlines`, `TipCard`. Nothing in the repository prevents
this: there is no SwiftLint custom rule, no snapshot test, and no test anywhere
that references `CoinyTheme` (3.15.1). The checklist was applied as a one-time
edit rather than installed as a constraint, so it decayed the moment new files
were written by agents that had not read it.

**The single worst one.** `SignInView.swift:16-25` carries tells 1, 2 and 9
together, in eleven lines, on the screen a reviewer and every first-time user
sees before anything else, while the onboarding flow immediately after it does
all three correctly. It is not a subtle failure of taste; it is the pre-rewrite
hero copied intact into a file the rewrite did not touch.

---

## 3.2 The §3.2 "never introduce" list, re-audited

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.2.1 | Inter, Geist, Space Grotesk and Söhne are not bundled | `find ios -iname "*.otf" -o -iname "*.ttf"`; grep `Font.custom` | VERIFIED, vacuously | No font file of any kind is bundled and `Font.custom` appears zero times. The banned faces are absent because all three specified faces are absent too (3.4.1) |
| 3.2.2 | No centred hero with a badge and three rounded feature cards | Read every full-screen composition | FAILS | `WaitingForFirstReactionView.swift:9-47` is a centred headline over a paged carousel of four `TipCard`s, each an icon-in-a-rounded-material-tile (`TipCard.swift:12-31`). It is the pattern §3.2 names, in carousel form. Dead code (3.7.5), still compiled. MINOR |
| 3.2.3 | Balances are not set in a monospaced typeface | Grep `design: .monospaced` on value-rendering sites | FAILS | `DebtView.swift:126` renders the OWED total in `.system(.largeTitle, design: .monospaced)`; `DebtView.swift:200` and `DebtDetailView.swift:98`, `:279`, `:387` do the same for individual balances. §3.2 reserves mono for category codes and timestamps and calls this out by name. MINOR |
| 3.2.4 | No donut charts | Grep chart constructs; read the composition view | VERIFIED, with one exception in the tab bar | `CompositionBarView` (`NetWorthView+Groups.swift:41-101`) is a single 8pt stacked horizontal bar, as specified. But `RootView.swift:36` uses `chart.pie.fill` as the Wealth tab icon, so the app's only pie is the label for the screen that deliberately does not have one. MINOR |
| 3.2.5 | No confetti or full-screen particle effect | Grep for particle, confetti, emitter; read every celebrate path | VERIFIED | No particle system exists. `HomeView.swift:115-128` maps a celebrate reaction to `reactionOverride = .celebrating`, which changes the creature's eyes inside the Window (`CreaturePlaceholderArt.swift:115-125`) and nothing else |
| 3.2.6 | Light is the default, dark is the alternative | Read the palette resolution and any forced `colorScheme` | VERIFIED | `CoinyTheme.swift:26-30` resolves per `trait.userInterfaceStyle` with light as the `else` branch; no `.preferredColorScheme` override anywhere in the tree |
| 3.2.7 | No corner radius above 20px, and cards are 10 | Count `cornerRadius:` values | FAILS | Radii in use are `2`(4), `4`(7), `8`(9), `10`(6), `12`(2), `16`(1). Nothing exceeds 20, but `8` is the most common value in the app and is not on the `{2, 4, 10, pill}` scale; `12` (`SpendingView.swift:156,194`) and `16` (`TipCard.swift:30`) exceed the 10 ceiling for cards. MINOR |
| 3.2.8 | No unmodified thin-line icons in rounded-square tiles | Read every card primitive | FAILS | `TipCard.swift:13-17` is a 56pt SF Symbol tinted per-tip over a `.thinMaterial` rounded tile, four of them in `coinyTips` (`TipCard.swift:42-67`) at `.green`, `.orange`, `.blue`, `.red`. This is the exact construction §3.2's last bullet bans. MINOR |

---

## 3.3 The rule with legal teeth: never celebrate a transaction

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.3.1 | The celebrate animation is gated to rung completion and goal contribution | Read `playReaction` and the animation names it accepts | FAILS, MAJOR | `HomeView.swift:115-123` maps the animation strings `"celebrate"` and `"happy"` to the celebrating state with no check on the originating event type. The gate exists only in the backend's `PUSHABLE_ANIMATIONS` allowlist, which governs push, not the on-screen creature. Any reaction the server labels `celebrate` will celebrate, including a future one attached to a deposit |
| 3.3.2 | No user-facing string promises a celebration for a deposit | Grep the tip and reaction copy | FAILS, MAJOR | `TipCard.swift:44-48`: "Paychecks make Coiny celebrate" / "Big deposits trigger a full celebration with lights and sound." A paycheck is permitted by PRD S-7; "big deposits" is not, and this is the exact Robinhood-confetti shape §3.3 exists to prevent. The clause "with lights and sound" also describes hardware that does not exist and will not ship |
| 3.3.3 | The celebrate treatment is inside the Window, not full screen | Read the celebrate render path | VERIFIED | `CreaturePlaceholderArt.swift:115-125` changes the eye geometry only; the effect is bounded by `CoinyWindow`'s 192pt frame (`CreatureWindow.swift:42`). No screen-level treatment exists |
| 3.3.4 | The creature never reacts to a market move | Read the animation vocabulary reaching the client | VERIFIED, at the client | `HomeView.swift:117-122` handles only `celebrate`, `happy`, `sad`, `concerned` and returns early on anything else, so an unrecognised market animation is a no-op. The data-layer ban is the PRD's and is out of this part's scope |

3.3.2 is the finding to fix first among the copy items, because it is the one
place in the interface where a design tell and a regulatory exposure are the
same sentence. The file is unreachable today (3.7.5), which lowers the severity
from BLOCKER to MAJOR but does not make it safe: it is one `TipCard(...)` call
away from being on screen.

---

## 3.4 Is the design system applied, or only documented?

This is §4 checked token by token. The summary: the palette exists in code and
is used by ten of forty-six view files; the type system, the money-colour
tokens, the spatial scale and the iconography system do not exist in code at
all.

### 3.4.1 Typography (§4.1)

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.4.1a | Instrument Sans is bundled and used for UI and numerals | `find ios -iname "*.otf" -o -iname "*.ttf"`; grep `Font.custom` | FAILS, MAJOR | Zero font files in the repository, zero `Font.custom` call sites, no `UIAppFonts` key in `ios/project.yml`. Every glyph in the app is the system font. §4.1's three-role system is entirely undelivered |
| 3.4.1b | CoinyMono is built and used for category codes and timestamps | Grep for the codes and for a custom mono face | FAILS, MAJOR | No custom face, and no category code exists to set in it: `grep -E '"(BNK\|INV\|CRY\|MTL\|RE\|VEH)"'` over `ios/Coiny` returns nothing. §4.6's entire iconography replacement is unbuilt |
| 3.4.1c | Departure Mono is used for pet speech at exactly 22px | Read the speech text component | FAILS, MINOR, and honestly declared | `OnboardingScreens.swift:9-22` stands in `design: .monospaced` at a `@ScaledMetric` 22pt and the comment says why. `HomeView.swift:183` uses `.system(.body, design: .monospaced)` instead, so the two surfaces render the same voice at different sizes |
| 3.4.1d | The six-size scale is the only scale in use | Enumerate distinct `.font` roles | FAILS, MINOR | The app uses `largeTitle, title2, title3, headline, subheadline, body, footnote, caption, caption2` plus two absolute sizes, which is eleven steps, not six. §4.1 warns that a flat hierarchy from too-close sizes is itself the tell |
| 3.4.1e | The display size is Dynamic Type scalable | Check every fixed `size:` for `@ScaledMetric` or `relativeTo:` | FAILS, MAJOR | `NetWorthView.swift:119` is a hard `size: 48` with no scaling, so the largest number on the Wealth tab is the only text on it that does not grow at AX5. Onboarding does this correctly at `OnboardingConnectScreens.swift:14` and `OnboardingScreens.swift:14`. Breaks PRD R-11.3 |
| 3.4.1f | Tabular figures on every balance | Grep `monospacedDigit` against the money-rendering sites | VERIFIED, broadly | 44 `monospacedDigit()` call sites covering the Wealth rows, Manage Accounts, onboarding and the paywall. `NetWorthView.swift:119`, the hero total, is the notable omission |

### 3.4.2 Colour (§4.2) and the single-accent rule

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.4.2a | The §4.2 tokens exist in code | Read the token definition | VERIFIED, incompletely | `CoinyTheme.swift:8-24` defines nine of the eleven tokens with the exact §4.2 hex values in both schemes. `positive` and `negative` are absent |
| 3.4.2b | Every view draws from the token set | Count files referencing a palette enum | FAILS, MAJOR | Of 46 files under `ios/Coiny/Views`, 10 use `CoinyTheme`, 4 use `OnboardingPalette`, and 31 use neither and fall back to `.primary`/`.secondary`/system hues. `NetWorthView`, `PaywallView`, `SettingsView`, `SpendingView`, `ManageAccountsView` and every provider view are in the 31 |
| 3.4.2c | There is exactly one accent | Grep for every chromatic colour that is not a delta | FAILS, MAJOR | Amber is the accent in `CoinyTheme`, but `NetWorthView+Groups.swift:91-100` assigns six system hues to the six composition groups, `ManageAccountsView` assigns eleven more to section headers, and `TipCard.swift:42-67` four more. Counting distinct chromatic values on screen, the app has roughly a dozen accents |
| 3.4.2d | The composition bar uses opacity steps of ink, not hues | Read `CompositionBarView.color(for:)` against §6.3 rule 4 | FAILS, MAJOR | `NetWorthView+Groups.swift:91-100` returns `.blue .green .orange .brown .purple .gray`. §6.3 rule 4 specifies "six values of `ink` from 100% down to 25% opacity rather than six hues", and one of the six chosen is purple, the colour §3.1 row 1 exists to eliminate |
| 3.4.2e | There is an `AccentColor` asset so system tint is not blue | `find ios -name "*.xcassets"` in the app target | FAILS, MAJOR | The Coiny target has no asset catalog at all (`ios/project.yml` sources are `Coiny` with `**/*.md` excluded; no `.xcassets` exists outside `.spm-cache`). `RootView.swift:40` `.tint(.accentColor)`, `PaywallView.swift:112` `Color.accentColor`, and all 29 `.bordered`/`.borderedProminent` buttons therefore render in system blue |
| 3.4.2f | No hardcoded hex outside the token file | `grep -rnE "0x[0-9A-Fa-f]{6}"` excluding the two palette files | VERIFIED | Zero matches. Where colour is wrong it is wrong through a system name, never a smuggled hex, which makes it cheap to fix |
| 3.4.2g | Text on `signalFill` meets AA in both schemes | Read the fill and the text colour together in every filled button | FAILS, MAJOR | `OnboardingScreens.swift:44-45` puts `.white` on `signalFill`; in dark that fill is `#E8A33D`, giving roughly 2.2:1, well under the 4.5:1 §4.2 claims for every token. `OnboardingScreens.swift:144` repeats it on selected chips. `HomeView.swift:203-204` does it correctly with `CoinyTheme.screen` on the same fill |

### 3.4.3 The money colour rule (§4.3)

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.4.3a | Absolute values render in ink regardless of sign | Read every currency render site | VERIFIED, with one exception | `NetWorthView.swift:118-120` (`.primary`), `NetWorthView+Groups.swift:135-137`, `DebtView.swift:125-127` and `OnboardingConnectScreens.swift:22-24` all render totals uncoloured. The exception is the savings rate at `SpendingView.swift:170` (3.1.6) |
| 3.4.3b | Only deltas get colour | Find every delta render site | NOT APPLICABLE, and that is itself the finding | No delta is rendered anywhere in the app: no period change, no gain, no variance. `CoinyTheme` has no `positive` or `negative` token because nothing needs one. §6.3's mock puts "+$4,210 +1.24% 30 days" directly under the net worth figure; the rule is satisfied by the feature being absent |
| 3.4.3c | Every coloured delta carries an explicit sign | Same as 3.4.3b | NOT APPLICABLE | No coloured delta exists. Debt does carry a leading minus correctly at `OnboardingConnectScreens.swift:80` with the rule cited in comment |
| 3.4.3d | System `.green` and `.red` are absent from the codebase | Grep both | FAILS, MAJOR | `grep -ro 'foregroundStyle(\.red)' ios/Coiny \| wc -l` returns 33; `.green` appears 3 times. Most are error text (`ZerionView.swift:28`, the seven in `NetWorthView+WealthInlines.swift`, the four in `+TruelayerInlines.swift`), which §4.3 rule 4 bans outright: the specified error colour is `negative`, a token that does not exist |
| 3.4.3e | Debt is never red | Read every debt render site | FAILS, MAJOR | `DebtView` gets this exactly right, using ink throughout and never the word "you owe". `ManageAccountsView.swift:411` then renders the "Debts" section header in `.red` with a `creditcard.fill` glyph, which is the daily-shaming render §4.3 rule 5 is written to prevent |
| 3.4.3f | Graded metrics use `positive`/`signal`/`negative` and show the threshold inline | Read the three carve-out metrics | FAILS, MAJOR | Credit utilization is a bare `ProgressView(value:)` in system blue with no threshold (`ManageAccountsView.swift:435`); credit score is plain text with no band (`:420-421`); emergency runway is plain text (`:164-166`). Savings rate uses the banned stoplight instead (`SpendingView.swift:170`) and is not on the carve-out list at all |

### 3.4.4 Spacing, radius and structure (§4.4)

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.4.4a | Spatial values come from `2 4 8 12 20 32 56` | Enumerate every `spacing:` and numeric `.padding` | FAILS, MINOR | 121 off-scale values across 33 files. `6` is used 70 times and is not on the scale; `16`, `24`, `28` and `40` account for the rest |
| 3.4.4b | Tight inside a group, generous between groups | Compare intra-section and inter-section gaps on each main surface | VERIFIED, on Home and Debt; FAILS on Wealth | `DebtView.swift:141` and `HomeJourneyView` use `.padding(.top, 40)` before a section label against 4 to 8pt inside it, which is the intended rhythm. `NetWorthView.swift:59` uses a flat `spacing: 16` between every element on the screen, which is the failure §4.4 describes |
| 3.4.4c | Radii are 2 for the Window, 10 for rows and cards, 4 for chips, pill for the rung tag | Count and locate every radius | FAILS, MINOR | Window 2 is correct in both implementations; chips are 4 (`OnboardingScreens.swift:147`); the rung tag is a `Capsule()` (`HomeJourneyView.swift:187`). But `8` appears 9 times (for example `DebtPlanSection.swift:172`) and is on no line of the table |
| 3.4.4d | The repeated primitive is a 44pt row with a 1px hairline, not a box | Read the row implementations across surfaces | FAILS, MAJOR, and the split is the point | Home, the journey, Debt and onboarding all implement the specified row (`HomeJourneyView.swift:111-115`, `DebtView.swift:231-235`, `OnboardingConnectScreens.swift:70-72`: `.overlay(alignment: .bottom) { Rectangle().fill(rule).frame(height: 1) }`). Wealth and Manage Accounts use `GroupBox` and `Divider()` instead. Two structural vocabularies in one app |
| 3.4.4e | There is no elevation system and no shadow | Grep `.shadow(` | VERIFIED | Zero `.shadow` call sites in `ios/Coiny` |

### 3.4.5 Motion (§4.5)

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.4.5a | UI transitions are `easeOut` at 180 to 260ms with no overshoot | Read every `withAnimation` and `.animation` | VERIFIED | Seven animation sites total. `HomeView.swift:94` 260ms easeOut, `OnboardingView.swift:34` 220ms easeOut, `OnboardingConnectScreens.swift:263` 300ms easeOut on the hatch (a creature moment, outside the UI budget), `CoinyApp.swift:60-61` easeInOut on root transitions. No spring anywhere |
| 3.4.5b | The interface does not move except in response to a finger | Find every `repeatForever` | FAILS, MINOR | Two ambient loops. `OnboardingCreatureWindow.swift:103` breathes the egg, which is creature motion and within budget. `WaitingForFirstReactionView.swift:16-20` pulses a green dot forever, which is interface motion and is not. Dead code (3.7.5) |
| 3.4.5c | Numbers do not count up or roll | Grep for interpolated numeric animation | VERIFIED | No `Animatable` conformance, no `AnimatableData`, no counter. Values render at final magnitude on first paint |
| 3.4.5d | Charts draw instantly | Read `CompositionBarView` and `RungProgressBar` | VERIFIED | `NetWorthView+Groups.swift:41-101` and `HomeView.swift:308-323` are plain geometry with no animation modifier |
| 3.4.5e | Reduce Motion is honoured on every animated surface | Grep `accessibilityReduceMotion` against the animation sites | VERIFIED, on the built surfaces | Four call sites: `HomeView.swift:15,94,108`, `OnboardingView.swift:24,31`, `OnboardingConnectScreens.swift:222,258`, `OnboardingCreatureWindow.swift:72,94,102`. `HomeView.swift:108-112` drops the `matchedGeometryEffect` entirely under Reduce Motion, which is the correct treatment, not merely a shorter duration |
| 3.4.5f | Pull to refresh is the system default | Grep `.refreshable` for customisation | VERIFIED | `NetWorthView.swift:17`, `SpendingView.swift:25`, `SubscriptionsView.swift:45` all use the unmodified system control |

### 3.4.6 Iconography (§4.6) and Liquid Glass (§4.7)

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.4.6a | Category identity comes from three-letter type, not icons | Grep for the code set | FAILS, MAJOR | No category code exists anywhere. Instead there are 97 `systemImage:`/`Image(systemName:)` call sites, of which 19 are the per-category tinted headers at `ManageAccountsView.swift:156-411` |
| 3.4.6b | Real icons appear only in system navigation, one weight, one colour | Read every icon call site for a tint | FAILS, MAJOR | Navigation icons are correct (`HomeView.swift:50-51` `gear` in `CoinyTheme.ink`; `RootView.swift:21,28,36` untinted tab labels). Content icons are not: the 19 in `ManageAccountsView`, the 4 in `TipCard`, and the banner symbols in `NetWorthView.swift:89,93,99,105` |
| 3.4.6c | No AI-signature symbols | Grep `sparkles`, `wand.and`, `brain`, `lightbulb` | FAILS, MINOR | One hit: `ManageAccountsView.swift:312` uses `sparkles` for Precious Metals. `sparkles` is the single most recognisable "AI feature" glyph in the SF Symbols set |
| 3.4.6d | The Wealth tab icon is not a pie | Read the tab bar | FAILS, MINOR | `RootView.swift:36` `chart.pie.fill`. §4.6 reserves the Pet tab for the creature Stamp and §3.2 bans donuts; this puts one in the tab bar |
| 3.4.6e | Glass is confined to the navigation and control layer | Grep `.thinMaterial`, `.glassEffect`, `.quaternary` on content | FAILS, MAJOR | Three `.thinMaterial` content surfaces (3.1.4) plus two `.quaternary` fills at `PaywallView.swift:76` and `NetWorthView+Groups.swift:31`. No `.glassEffect` is called explicitly, so the violation is the same one §4.7 already identified, not a new adoption mistake |
| 3.4.6f | Reduce Transparency falls back to opaque surface | Grep `accessibilityReduceTransparency` | FAILS, MINOR | Zero call sites. The three `.thinMaterial` surfaces have no fallback path; SwiftUI's own material handling substitutes a system fill, which is not `surface` |
| 3.4.6g | `UIDesignRequiresCompatibility` is not set | Read `ios/project.yml` Info.plist properties | VERIFIED | Not present in the `info.properties` block (`ios/project.yml:47-76`) |
| 3.4.6h | The app icon works in light, dark, clear and tinted | Inspect the icon asset | UNVERIFIED, and it does not exist | There is no asset catalog and therefore no `AppIcon` (3.4.2e). Settles when an artist delivers §7.2 deliverable 3; blocks submission independently of this part |

---

## 3.5 The new surfaces §3 never anticipated

Five surfaces were built after §3 was written. This is the first look at any of
them with this lens. They are judged independently here; 3.11 judges them
against each other.

### 3.5.1 Onboarding

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.5.1a | Every §5.2 screen exists and no name-entry screen survives | Read the step enum and the container switch | VERIFIED | `OnboardingView.swift:54-112` switches over egg, declare, amounts, number, connect, reveal, hatch, notifications, plus the offline screen §8.3 requires. No `EnterNamePage`; `appleDisplayName` is retained but explicitly unused (`:16-18`) |
| 3.5.1b | The §10 strings are used verbatim, not improvised | Grep each specified string | VERIFIED | S-1 at `OnboardingScreens.swift:79-80`, S-2 at `OnboardingConnectScreens.swift:97,101`, S-4 at `:31`, S-5 at `OnboardingScreens.swift:54`, S-6 at `OnboardingConnectScreens.swift:280`. All exact |
| 3.5.1c | "Not now" is plain text, never styled as a button | Read the component | VERIFIED | `OnboardingScreens.swift:53-66` renders body text in `inkSecondary` with `.buttonStyle(.plain)` and a 44pt target, exactly as S-5 specifies |
| 3.5.1d | The creature is not a system glyph | Read the placeholder | VERIFIED | `OnboardingCreatureWindow.swift:137-220` draws the egg, crack and hatchling from primitives, with the reason stated at `:14-16` |
| 3.5.1e | The screen is not a dead end when Link is abandoned | Read the exit path | VERIFIED | `OnboardingConnectScreens.swift:241-248` renders the disconnected creature with a persistent connect affordance and a "Continue without connecting" escape, per R-8.8 |
| 3.5.1f | Onboarding uses the same palette object as the rest of the app | Read the palette declaration | FAILS, MAJOR | `OnboardingCreatureWindow.swift:22-37` declares `OnboardingPalette`, a second copy of the same eight hex values already in `CoinyTheme.swift:8-24`, with `inkSecondary` where the other says `ink2`. The comment at `:20-21` says it was scoped this way "to avoid colliding with whatever token set the Pet tab rebuild introduces", which is an accurate description of two agents working in parallel |
| 3.5.1g | Onboarding uses the same Window component as the app | Compare the two Window implementations | FAILS, MAJOR | `OnboardingCreatureWindow` insets its bezel by 3 and its creature by a 0.45/0.55 fraction; `CoinyWindow` (`CreatureWindow.swift:32-44`) insets by 0.5 and pads by 14% of the frame. Same named object, two geometries, two files. The comment at `OnboardingCreatureWindow.swift:7-10` acknowledges the duplication and defers it |
| 3.5.1h | The creature the user hatches is the creature they then meet | Compare the two placeholder renderers | FAILS, MAJOR | `HatchlingShape` (`OnboardingCreatureWindow.swift:184-220`) is a stroked rounded rectangle with two circle eyes, a flat mouth and a shell fragment. `CreaturePainter` (`CreaturePlaceholderArt.swift:35-145`) is a Canvas form with stage-dependent width, ear nubs from stage 5, and four distinct eye treatments. The user watches one creature hatch and is handed a different one on the next screen |
| 3.5.1i | Filled-button text meets contrast in dark mode | Compute the pair | FAILS, MAJOR | Covered at 3.4.2g: `.white` on `#E8A33D` |

### 3.5.2 The journey surface

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.5.2a | The journey carries no character art beyond the pinned Panel | Read every child view for a creature | VERIFIED | `HomeJourneyView.swift:16-60` renders rung rows, goals, guardrails and one debt row. The only Window is `HomeView.swift:233`, pinned in the header above it |
| 3.5.2b | State is carried by words, never by colour alone | Read the trailing slot for each rung state | VERIFIED | `HomeJourneyView.swift:168-200` renders "done", "ACTIVE", "skipped", "not applicable" as text. The one coloured element, the ACTIVE capsule at `:187`, carries its own label |
| 3.5.2c | No rung can be failed and every skip is reversible | Read the state vocabulary | VERIFIED | `:131-136` permits skipping only pending and active rungs; `:266` offers "Take it back". There is no failure case in the enum |
| 3.5.2d | The journey does not animate | Grep the file for animation | VERIFIED | Zero animation modifiers in `HomeJourneyView.swift`, `JourneyGoalsSection.swift`, `JourneyGuardrailsSection.swift`. The doc comment at `:5-6` states the constraint |
| 3.5.2e | Skip actions are reachable without a long press | Read the affordances | VERIFIED | `:117-121` provides a `contextMenu`; `:97-106` provides `accessibilityActions` covering the same set, so VoiceOver reaches them without the gesture |
| 3.5.2f | The journey draws from the token set | Grep `CoinyTheme` in the journey files | VERIFIED | 19 references in `HomeJourneyView.swift`, 12 in `JourneyGoalsSection.swift`, 9 in `JourneyGuardrailsSection.swift`. Zero system colours in any of the three |

### 3.5.3 The debt module

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.5.3a | Debt is never rendered in red | Grep the debt files for `.red` | VERIFIED, within the module | `DebtView.swift`, `DebtDetailView.swift` and `DebtPlanSection.swift` contain zero system colours; all three use `CoinyTheme` exclusively (20, 30 and 21 references). The violation is outside the module, at `ManageAccountsView.swift:411` |
| 3.5.3b | The copy never shames | Read the total header and row copy | VERIFIED | `DebtView.swift:118-134` labels the total "OWED" with the reasoning in comment; `DebtRowView` leads with the payment that clears the debt, not the balance |
| 3.5.3c | The loading state is not a spinner | Read the loading branch | VERIFIED, and it is the only one in the app | `DebtView.swift:88-98` renders three 44pt skeleton rows in `rule`, `accessibilityHidden`. Every other loading state in the app is a bare `ProgressView` (3.6.2) |
| 3.5.3d | Balances are not monospaced | Read the value render sites | FAILS, MINOR | Covered at 3.2.3. The module sets every balance in `design: .monospaced`, which is internally consistent and against §3.2 |
| 3.5.3e | Stepper controls use the specified radius | Read the step button | FAILS, MINOR | `DebtPlanSection.swift:167-173` uses `cornerRadius: 8` twice, off the `{2, 4, 10, pill}` scale |
| 3.5.3f | The strategy choice states its dollar cost | Read the strategy control | VERIFIED | `DebtPresentation.swift:183,229-231` builds a cost clause comparing the chosen strategy against the alternative in dollars, surfaced by `DebtPlanSection` |

### 3.5.4 The Wealth rebuild

Judged against `docs/design-direction.md` §6.3, which sets four structural rules
for this screen specifically.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.5.4a | Rule 1: six fixed groups, not 27 sections | Read the group model | VERIFIED | `WealthGroups.swift` collapses every class into liquid, invested, crypto, owned, speculative, owed, rendered by `NetWorthView.swift:57,66-73` |
| 3.5.4b | Rule 2: nothing empty is ever shown | Read the section builder | VERIFIED | `WealthGroups.swift:183` returns nil for any group with no rows, and `:195` filters zero-value sections out of the composition bar. The 26-empty-boxes problem §6.3 opens with is genuinely solved |
| 3.5.4c | Rule 3: groups collapsed by default, sub-1% holdings rolled into "Other (n)" | Read `WealthGroupBoxView` for disclosure state | FAILS, MAJOR | `NetWorthView+Groups.swift:105-142` has no expansion state and no threshold: every group renders every row, always. A user with forty holdings gets forty rows with no hierarchy, which is the problem §6.3 rule 3 exists to prevent |
| 3.5.4d | Rule 4: one chart, opacity steps of ink, not hues | Read the composition colours | FAILS, MAJOR | Covered at 3.4.2d |
| 3.5.4e | The hero number follows the type system | Read the total header | FAILS, MAJOR | `NetWorthView.swift:119` is SF Rounded 48pt bold, unscaled (3.1.5, 3.4.1e) |
| 3.5.4f | Category codes replace tinted icons | Grep the codes | FAILS, MAJOR | Covered at 3.4.6a. `WealthRowView` renders `row.cls.displayName` as prose with no leading chip |
| 3.5.4g | The staleness timestamp is always visible | Read the footer | VERIFIED | `NetWorthView.swift:183-196` renders `generatedLabel` unconditionally, per R-7.28 |
| 3.5.4h | Excluded accounts are footnoted and tappable | Read the footnote | VERIFIED | `:131-155` implements S-19 with a 44pt tappable target and an expanding list |
| 3.5.4i | The rebuild draws from the token set | Grep `CoinyTheme` in the Wealth files | FAILS, MAJOR | `NetWorthView.swift`, `NetWorthView+Groups.swift`, `NetWorthView+NewAssets.swift`, `NetWorthView+WealthInlines.swift`, `NetWorthView+TruelayerInlines.swift` and `NetWorthView+CollectibleInlines.swift` contain zero `CoinyTheme` references between them. The screen the design system was written for is the screen that does not use it |

### 3.5.5 The paywall

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.5.5a | The primary purchase action is not the system default tint | Read the button | FAILS, MAJOR | `PaywallView.swift:165` is `.buttonStyle(.borderedProminent)` with no tint override, and there is no `AccentColor` asset (3.4.2e), so the primary purchase action on the money screen renders in system blue. `PaywallView.swift:112` selects the tier card with the same blue |
| 3.5.5b | Prices come from StoreKit, never hardcoded | Read the price render path | VERIFIED | `PaywallView.swift:105,147` use `Product.displayPrice`; `SubscriptionCatalog.swift:69-75` takes the price as a parameter. No dollar figure is hardcoded anywhere in the purchase path |
| 3.5.5c | The pre-purchase disclosure states period, renewal, price, contents and cancellation | Read the disclosure string builder | VERIFIED | `SubscriptionCatalog.swift:73-74` produces all five elements in the S-30 shape, rendered at `PaywallView.swift:144-154` |
| 3.5.5d | The paywall draws from the token set | Grep | FAILS, MAJOR | Zero `CoinyTheme` references. Header, features, disclosure and error all use `.secondary`/`.red`/`.quaternary` |
| 3.5.5e | The feature list is not an icon-tile grid | Read the feature rendering | VERIFIED | `PaywallView.swift:134-141` is a plain checkmark-and-text list with no tiles, no per-feature colour and no illustration |
| 3.5.5f | The header copy is a real sentence, not a slogan | Read it | VERIFIED, marginally | `PaywallView.swift:61` "More room to grow" is a slogan, but `:63-64` immediately states the free tier's exact contents in specifics, which passes §10's specificity test. Not a §10 string; §10 specifies only S-30 for this screen |
| 3.5.5g | Restore purchases is always visible | Read the layout | VERIFIED | `PaywallView.swift:35,169-174` renders it unconditionally at a 44pt target, not behind a disclosure |

---

## 3.6 Empty, error and loading states

Given its own pass, per the brief. `docs/prd.md` §8.3 is a per-screen matrix and
§10 holds the strings; both are treated here as the specification.

### 3.6.1 Empty states

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.6.1a | Activity's day-one empty state is S-26 and nothing else | Compare code to §8.3 | FAILS, MINOR | `SpendingView.swift:60-64` renders `ContentUnavailableView("No reactions yet", systemImage: "tray", ...)`. §8.3 specifies "Transactions arrive within a day of connecting. Nothing else"; the code substitutes improvised copy plus a stock system illustration |
| 3.6.1b | The subscriptions list empty state is S-35 | Compare code to §10 | FAILS, MINOR | `SubscriptionsView.swift:15-19` reads "No subscriptions detected" / "Recurring charges appear here once 3+ months of transactions have been synced." S-35 is "Nothing recurring found yet. Detection improves as transactions arrive." The substituted copy also states a threshold the detector does not use: `backend/src/subscriptions/detect.ts:21-24` runs on a 120-day window with a minimum occurrence count, not three months |
| 3.6.1c | Wealth's empty state offers a next action | Read the branch | FAILS, MINOR | `NetWorthView.swift:159-169` states "Nothing connected yet." and explains what will appear, then stops. The connect affordance is a separate row further down the scroll (`:171-180`), so the empty state itself is terminal, which §10's third copy test forbids |
| 3.6.1d | Debt's empty state is one plain line, not an illustration | Read the branch | VERIFIED | `DebtView.swift:100-108` is a single sentence in `ink2` at a 44pt target, with the reasoning in comment |
| 3.6.1e | The journey's empty state renders rung 0 active rather than an illustration | Read the presenter | VERIFIED | `HomePresentation.swift:117` emits `code: "RUNG 0"` for a user with no pet state, and `HomeJourneyView` renders the full ladder regardless, per §8.3 |
| 3.6.1f | No empty state uses a stock system illustration | Grep `ContentUnavailableView` | FAILS, MINOR | Four sites: `NetWorthView.swift:45`, `ManageAccountsView.swift:135`, `SubscriptionsView.swift:15`, `SpendingView.swift:60`. Each renders a large grey SF Symbol above centred text, which is the platform default and reads as unfinished on a product whose identity is a drawn creature |

### 3.6.2 Loading states

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.6.2a | No spinner renders inside the Window | Read the Home loading path | VERIFIED | `HomeView.swift:143-176` renders the Window from `store.pet` immediately, with the condition falling back to `HomePresentation.condition(for: nil)`. There is no loading branch on Home at all, which is the §8.3 requirement |
| 3.6.2b | Wealth renders cached values instantly rather than a spinner | Read the load path | FAILS, MINOR | `NetWorthViewModel.swift:60-69` sets `.loading` when `netWorth == nil`, and `NetWorthView.swift:37-39` renders a full-screen `ProgressView("Loading…")`. The cache is consulted only on failure (`adoptFailure`), not on first paint, so a cold open shows a spinner where §8.3 says it should show yesterday's numbers |
| 3.6.2c | Loading states are skeletons, not spinners, on list surfaces | Count both | FAILS, MINOR | 36 `ProgressView(` call sites against one skeleton (`DebtView.swift:88-98`). §8.3 specifies skeleton rows for the expanded journey and the subscriptions list; neither has one |
| 3.6.2d | An in-flight action is distinguishable from an idle one | Read the busy states | VERIFIED | `HomeView.swift:199` swaps to "Opening Link…", `DebtView.swift:166` to "Refreshing…", `OnboardingScreens.swift:34-40` to an inline spinner with the button disabled. Consistent and correct across the built surfaces |

### 3.6.3 Error states

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.6.3a | Every error carries a retry affordance | Read every error branch | FAILS, MAJOR | `NetWorthView.swift:44-52` and `ManageAccountsView.swift:135-141` do. `SubscriptionsView.swift:47-53` renders `error.localizedDescription` as a grey caption floating in an `.overlay` with no retry and no dismissal. The seven `Text(error).font(.caption).foregroundStyle(.red)` sites in `NetWorthView+WealthInlines.swift` and the four in `+TruelayerInlines.swift` are the same pattern in red |
| 3.6.3b | Error copy is written, not a raw `localizedDescription` | Grep for `localizedDescription` in a rendered position | FAILS, MAJOR | `SignInView.swift:106,112`, `SubscriptionsView.swift:63` and the view models behind the twelve inline error rows all surface the raw system string. A user who loses network on the sign-in screen is shown Foundation's URLError text |
| 3.6.3c | Errors do not use system red | Grep | FAILS, MAJOR | 33 `foregroundStyle(.red)` sites, almost all error text (3.4.3d). The specified colour is the `negative` token, which does not exist in `CoinyTheme` |
| 3.6.3d | The pet never announces a backend error | Read the speech path | VERIFIED | `HomeView.swift:181-188` renders `HomePresentation.speechLine(for:)` and treats nil as empty with reserved height; no error string can reach it |
| 3.6.3e | Per-class failures read as failures, not as zeros | Read the row treatment | VERIFIED | `WealthGroups.swift:225` maps a failed class to `.failure(message: "Can't reach <provider> right now.")`, S-18's shape, and `NetWorthView+Groups.swift:209-210,261-266` renders a Retry button with no value and speaks no number |
| 3.6.3f | A refresh that fails while data is on screen is visible | Read the refresh path | VERIFIED | `NetWorthViewModel.swift:33` holds `refreshErrorMessage`, rendered as a banner at `NetWorthView.swift:92-94`, so a silent stale screen is not possible |
| 3.6.3g | The offline banner is S-25 | Compare | VERIFIED | `NetWorthView.swift:88` is "Offline. Showing your last numbers.", exact |
| 3.6.3h | Deletion failure keeps the user signed in and says so | Read the deletion path | VERIFIED, behaviour; FAILS, copy | `SettingsView.swift:72-85` signs out only on server-confirmed success, which is correct and comment-documented. The copy at `:92,94` is improvised: S-27 requires the clause "and tells your banks to cut access", which the shipped string omits, and S-28's exact text is not used |

The empty, error and loading pass is where the split between surfaces is
sharpest. Home, the journey and Debt were built with these states as
requirements and read as finished. Wealth's inline provider sections, the
subscriptions list and every provider view render errors as small red captions
with no action, which is the laziest available treatment and the one the brief
predicted.

---

## 3.7 Default-component tells

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.7.1 | No screen uses the system blue tint | `grep -rn "\.tint(\|accentColor"` plus the asset-catalog check | FAILS, MAJOR | `RootView.swift:40` tints the whole tab bar `.accentColor` with no such asset defined, so every selected tab, every `.borderedProminent` button and the paywall's selection border render in system blue. This is the most widely visible single defect in the app |
| 3.7.2 | Buttons use one defined style | Count distinct primary-button treatments | FAILS, MAJOR | Four: `OnboardingPrimaryButton` (`OnboardingScreens.swift:27-49`, signalFill on 10pt radius), `HomeView.swift:196-206` (the same treatment written inline, with different text colour), `CoinyTheme.signal` text buttons in Debt, and 29 `.bordered`/`.borderedProminent` system buttons everywhere else |
| 3.7.3 | List chrome is deliberate, not stock `Form` | Grep `Form {` | FAILS, MINOR | 21 `Form` blocks across 16 files, all in add-asset sheets and Settings, rendering default grouped-inset chrome with system separator insets against a design system whose only structure is a flat row and a hairline |
| 3.7.4 | Navigation bars are styled | Grep `navigationTitle` and any bar appearance customisation | VERIFIED, as a deliberate choice | 29 `navigationTitle` call sites across 24 files and zero `toolbarBackground` or `UINavigationBarAppearance` overrides. Per §4.7 the navigation layer is where the OS is supposed to provide the material, so leaving it alone is correct rather than lazy |
| 3.7.5 | No dead pre-rewrite view is still compiled into the binary | Grep each view's symbol for a reference outside its own file | FAILS, MINOR | `WaitingForFirstReactionView` has zero references anywhere (its doc comment points at `PetView.swift`, which no longer exists); `TipCard` and `coinyTips` exist only to serve it; `CryptoView` is referenced only from `ViewSmokeTests.swift:112`. All four compile into the shipped binary and carry the §3.3 copy violation, the material tiles and the ambient green pulse |
| 3.7.6 | Symbol icons are not standing in where a drawn mark belongs | Read the mascot and the tab bar | FAILS, BLOCKER | `SignInView.swift:16` (3.1.2). The tab bar's Home item is `house` where §4.6 specifies the 20pt creature Stamp, which is acceptable until the art lands but should be tracked |

---

## 3.8 Copy tells, and the §10 string audit

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.8.1 | No exclamation marks in user-facing strings | `grep -rnE '"[^"]*!["[:space:]]'` excluding `!=` | VERIFIED | Zero. No "Oops!", no "Let's get started", no "Welcome!" anywhere in the tree |
| 3.8.2 | No emoji | Unicode-class grep | VERIFIED | Zero (3.1.10) |
| 3.8.3 | No em dashes in user-facing strings | `grep -rnP '\x{2014}'` and inspect each hit's position | FAILS, MINOR | Three rendered strings carry U+2014: `SignInView.swift:82` (between "Sign in failed" and "missing credentials"), `NetWorthView+WealthInlines.swift:170` and `:178` (after "Step 1" and "Step 2"). The remaining hits are code comments, which §10 does not govern |
| 3.8.4 | No typographic arrows in copy | Same grep | FAILS, MINOR | `NetWorthView+WealthInlines.swift:173` (3.1.8) |
| 3.8.5 | The §10 strings are used where §10 specifies them | Check each of S-1 to S-36 that has a shipped surface | FAILS, MINOR | Present and exact: S-1, S-2, S-4, S-5, S-6, S-15, S-16 (partial), S-17, S-18, S-19, S-25, S-29, S-31. Absent or improvised: S-26 (3.6.1a), S-27 and S-28 (3.6.3h), S-35 (3.6.1b). S-16's "As of <time>" prefix does not appear as a literal anywhere; `WealthGroups.swift` builds age labels by another route |
| 3.8.6 | Copy is specific rather than cheerful | Sample the shipped strings against §10's three tests | VERIFIED, on the rebuilt surfaces | `HomePresentation.swift:205-219`, `DebtPresentation.swift`, `JourneyPresentation` and the onboarding screens all state numbers, names or dates. `HomeJourneyView.swift:244` "Came loose. Worth another look; the completion stands." is exactly the register §10 asks for |
| 3.8.7 | No user-facing string describes hardware that does not exist | Grep for device language | FAILS, MAJOR | `TipCard.swift:47` "Big deposits trigger a full celebration with lights and sound." There is no light and no speaker; hardware is gated post-launch (`docs/vision.md` §8). This is a false statement to a user, on top of 3.3.2 |
| 3.8.8 | The word "advice" never appears | Grep | VERIFIED | Zero occurrences in any user-facing string |
| 3.8.9 | Currency is formatted through a locale-aware formatter, not concatenated | Grep for hardcoded `"$"` | VERIFIED | `HomePresentation.swift:249-255` and `DebtPresentation` use `NumberFormatter` with `currencyCode = "USD"`; the render sites use `format: .currency(code: "USD")`. No string concatenates a dollar sign |
| 3.8.10 | Straight quotes are not used where typographic ones belong | Inspect the apostrophes in shipped copy | VERIFIED, as a deliberate choice | Every apostrophe in the tree is straight (`Let's`, `Couldn't`, `Can't`, `Didn't`). §10 does not specify curly quotes and the PRD's own string table uses straight ones, so the code matches its spec. Worth revisiting when a real typeface lands, since Butterick's rule 6 treats straight quotes as the clearest amateur tell in set type |

---

## 3.9 Layout tells

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.9.1 | Not everything is centred | Read the alignment of each main surface | VERIFIED, mostly | The journey, Debt and the Wealth rows are all `alignment: .leading`. Onboarding centres by design (it is a sequence of single-purpose screens) and `NetWorthView.swift:112,126` centres the total header, which is defensible for one hero number per screen |
| 3.9.2 | There is no uniform card grid | Grep `LazyVGrid` and repeated card constructs | FAILS, MINOR | `ManageAccountsView` stacks 19 identical `GroupBox`es with identical internal structure and identical header shape, differing only by hue. That is a uniform grid with one column. `OnboardingScreens.swift:99,116` uses a `LazyVGrid` for the chip quiz, which is the correct use of one |
| 3.9.3 | Unequal information carries unequal visual weight | Compare a group total to a sub-row | FAILS, MAJOR, on Wealth | `NetWorthView+Groups.swift:132,136` sets the group name and its total in `.headline`; `:158,232` sets the class name and its value in `.subheadline`. One step of size difference across the whole screen, with `spacing: 16` between everything (3.4.4b), so a $268,000 investment group and a $40 collectible read as peers |
| 3.9.4 | Hierarchy is communicated by proximity and labels, not boxes | Read the section construction on each surface | FAILS, MAJOR, and split by surface | Home, the journey and Debt use a caption label plus 40pt of space plus hairline rows (`DebtView.swift:138-143`), exactly as §4.4 specifies. Wealth and Manage Accounts use `GroupBox`. Both patterns are in the same binary |
| 3.9.5 | Touch targets are at least 44pt | Grep `minHeight: 44` against the interactive elements | VERIFIED, broadly | 37 explicit `minHeight: 44`/`frame(width: 44, height: 44)` sites covering the journey rows, Wealth rows, debt rows, onboarding buttons, the excluded-accounts footnote and the skip links. The inline `Button("Sync")` calls in the provider views (for example `NetWorthView+TruelayerInlines.swift:34`) have no explicit minimum and rely on `.bordered` padding |
| 3.9.6 | Long content survives the largest Dynamic Type sizes | Read the layouts that could clip | UNVERIFIED | `HomeView.swift:136-140` switches the collapsed surface to a `ScrollView` at accessibility sizes, and the speech area reserves 88pt (`:186`), which is short of the ~100pt §4.1 calls for at four lines of 22pt. `NetWorthView.swift:119`'s fixed 48pt will not clip but will not scale (3.4.1e). Settles with the AX5 snapshot tests PRD R-11.3 requires and that do not exist |

---

## 3.10 Motion tells

Covered as a system in 3.4.5. Two rows remain that belong here rather than
there.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.10.1 | Animation is applied because it earns its place, not because it was available | Enumerate every animated element and ask what it communicates | VERIFIED, on iOS | Seven animation sites. Six communicate a state change the user caused or the creature's aliveness. The seventh (`WaitingForFirstReactionView.swift:16-20`) communicates nothing and is dead code |
| 3.10.2 | The signature moment, the stage change, is built | Read for a stage-transition sequence | UNVERIFIED, unbuilt | No stage-change sequence exists: `CreaturePlaceholderArt.swift` renders a stage as a size and a nub count, with no transition between stages. §4.5 calls this "the single most produced moment in the app". Settles when the sprite commission delivers; it cannot be built against geometric placeholders |

---

## 3.11 Consistency across the four surfaces

The brief asks directly whether onboarding, the journey, Wealth and the paywall
read as one product. **They do not.** The evidence is mechanical, not
impressionistic.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.11.1 | There is one palette object | Count palette declarations | FAILS, MAJOR | Two on iOS (`CoinyTheme.swift:6`, `OnboardingCreatureWindow.swift:22`) holding the same values under different member names, plus a third, unrelated one on Android (`android/.../CoinyTheme.kt:10`) |
| 3.11.2 | Every surface uses one of them | Count adopting files | FAILS, MAJOR | 14 of 46 view files use a palette; 31 use none. The split is not random: it is exactly the rewritten surfaces against the untouched ones |
| 3.11.3 | There is one Window component | Count Window implementations | FAILS, MAJOR | Two (3.5.1g), with different bezel geometry |
| 3.11.4 | There is one creature | Count creature renderers | FAILS, MAJOR | Two, visually unrelated (3.5.1h) |
| 3.11.5 | There is one primary button | Count treatments | FAILS, MAJOR | Four (3.7.2), and two of them disagree on the text colour over the same fill, one of which fails contrast in dark mode (3.4.2g) |
| 3.11.6 | There is one row primitive | Compare the row constructions | FAILS, MAJOR | Two: hairline-under-row on Home, journey, Debt and onboarding; `GroupBox` plus `Divider()` on Wealth and Manage Accounts (3.9.4) |
| 3.11.7 | Money is set the same way everywhere | Compare the money type across surfaces | FAILS, MINOR | Four treatments: SF Rounded 48 bold (`NetWorthView.swift:119`), system monospaced largeTitle (`DebtView.swift:126`), `@ScaledMetric` 44 semibold with `monospacedDigit` (`OnboardingConnectScreens.swift:23`), and `subheadline.monospacedDigit` for rows. The same figure would look like four different products depending on which tab it appeared in |
| 3.11.8 | Error treatment is consistent | Compare error rendering across surfaces | FAILS, MAJOR | Banner plus retry on Wealth's top level, `ContentUnavailableView` plus retry on Wealth's failure state, red caption with no action in twelve inline provider sections, grey floating overlay in `SubscriptionsView`, red caption in `SignInView` and `PaywallView` |

**The verdict, stated plainly.** Onboarding, Home, the journey and Debt read as
one product designed by one person: same palette semantics, same row, same
motion budget, same copy register, states treated as requirements. Wealth, the
paywall, Settings, Manage Accounts and the twenty provider views read as a
different, earlier product: system tint, system colours, `GroupBox`, stock
empty states, raw error strings. Sign-in reads as a third thing, and it is the
first thing anyone sees.

The split maps cleanly onto which files the parallel rewrite touched. The
rewrite did not fail; it succeeded on four surfaces and did not reach the
others, and nothing in the repository will stop the boundary from moving back
(3.15).

---

## 3.12 Dark patterns over the paywall and the consent flows

Measured against the FTC's "Bringing Dark Patterns to Light" (September 2022)
taxonomy and Apple's subscription requirements. Auto-renewal law itself belongs
to Part 5; the rows here are the ones where the craft failure and the legal
exposure are the same line of code.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.12.1 | The cancellation path is stated before purchase | Read the disclosure | VERIFIED | `SubscriptionCatalog.swift:73-74` includes "Renews <period> until cancelled in Settings > Apple Account > Subscriptions", rendered above the purchase button at `PaywallView.swift:33-34` |
| 3.12.2 | Cancellation is reachable in-app, not only by instruction | Grep `manageSubscriptionsSheet` | VERIFIED | `SettingsView.swift:227,235` opens Apple's own manage-subscriptions sheet, and `:238-242` opens the refund sheet. Both at 44pt targets in a section titled "Subscription" |
| 3.12.3 | Cancellation is not harder to reach than purchase | Count taps to each | FAILS, MINOR | Purchase is two taps from Settings ("View plans", "Subscribe"). Cancel is one tap from the same section, so the paths are comparable. But the paywall itself has no manage or cancel affordance, so a user who arrives there considering a change must back out to find it. Adding `.manageSubscriptionsSheet` to `PaywallView` is a two-line fix |
| 3.12.4 | Links to the Terms of Use and Privacy Policy are present on the purchase screen | Grep the app for either link | FAILS, BLOCKER | Neither string appears anywhere in `ios/Coiny`. `SettingsView.swift:50-58` lists only Backend and Version. Apple requires functional links to both in the binary for auto-renewable subscriptions, and burying the terms is also the FTC report's "information hiding" pattern. This is a submission blocker as well as a craft finding |
| 3.12.5 | No pre-checked upsell or hidden default | Read the initial selection state | VERIFIED, with a note | `PaywallView.swift:13-14` preselects Individual annual. Annual-first is a recorded decision (DR-24) and the annual price is displayed as "$X/yr" beside it, so nothing is concealed. Presenting the larger absolute figure first is defensible; concealing the monthly option would not be, and it is one tap away at `:126-132` |
| 3.12.6 | No false urgency, scarcity, or countdown | Grep for timers, "limited", "only", "ends" | VERIFIED | None present. No trial, no introductory offer, so no "free trial then charged" pattern either |
| 3.12.7 | The free tier's contents are stated on the paywall | Read the header | VERIFIED | `PaywallView.swift:63-64` enumerates the free tier exactly, which is the opposite of the "confirmshaming" pattern and worth keeping |
| 3.12.8 | Purchase failure states what happened without blaming the user | Read the error path | FAILS, MINOR | `PaywallView.swift:39-43` renders `service.lastErrorMessage` in system red. `:177` gets it right for the products-unavailable case ("Nothing is wrong with your account; try again later"), which shows the register the error path should have used too |
| 3.12.9 | The notification consent ask is honestly pre-framed | Compare the pre-permission copy to the enforced budget | VERIFIED | `OnboardingConnectScreens.swift:280` is S-6 verbatim, "at most twice a week", which matches `PUSH_MAX_PER_WINDOW` per R-9.1. The screen offers "Not now" at equal prominence (`:288`), so the consent is not a forced choice |
| 3.12.10 | The Plaid consent ask states who holds the credentials | Read the connect screen | VERIFIED | `OnboardingConnectScreens.swift:101` is S-2's second clause, "Plaid holds the credentials. We never see them.", shown before the button, not after |
| 3.12.11 | Account deletion is not obstructed | Read the deletion flow | VERIFIED, mechanics; FAILS, copy | Two taps from Settings with a confirming alert, and the user is not signed out unless the server confirms (`SettingsView.swift:72-85`). The confirmation copy omits S-27's bank-access clause, which understates rather than overstates the consequence (3.6.3h) |

---

## 3.13 Android: should it look like iOS or like Material?

The brief flags this as a real question. It is not yet a question, because the
Android client has no design position at all: it is the Compose new-project
template with data wired into it.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.13.1 | Android uses Coiny's palette, not the Material template default | Read the theme | FAILS, MAJOR | `android/app/src/main/kotlin/app/coiny/ui/CoinyTheme.kt:11-13` is `primary = Color(0xFF6750A4)`, `secondary = 0xFF625B71`, `tertiary = 0xFF7D5260`, which are the verbatim Material 3 baseline values emitted by the Compose project template. The file is named `CoinyTheme` and contains no Coiny token |
| 3.13.2 | The Android mascot is not a system glyph | Read the mood renderer | FAILS, MAJOR | `PetScreen.kt:118-121` selects between `Icons.Filled.SentimentVerySatisfied`, `SentimentSatisfied`, `SentimentNeutral` and `SentimentDissatisfied` by mood band. This is §3.1 tell 2 in Material form, and it was never removed because the rewrite was iOS-only |
| 3.13.3 | Android money colours are not stoplight | Grep the colour literals | FAILS, MAJOR | `PetScreen.kt:125-127` and `SpendingScreen.kt:146-148` both use `0xFF4CAF50` / `0xFFFF9800` / `0xFFF44336`, which are Material Green 500, Orange 500 and Red 500. `PetScreen.kt:152` adds Pink 500 for a `Favorite` heart |
| 3.13.4 | Android has no always-visible vitality bars | Grep progress indicators on the pet screen | FAILS, MAJOR | `PetScreen.kt:203` renders a `LinearProgressIndicator` per vitality, which is §3.1 tell 13 unchanged |
| 3.13.5 | Android has no AI-signature iconography | Grep the icon imports | FAILS, MINOR | `PetScreen.kt:29` imports `Icons.Filled.AutoAwesome`, used at `:162`. `AutoAwesome` is Material's sparkles glyph and the single most recognisable "an AI made this" icon in the set |
| 3.13.6 | Android does not animate ambiently | Grep `infiniteRepeatable` | FAILS, MINOR | `PetScreen.kt:110` drives a breathing `scale` at `:144` on a Material `Icon`, which is scaling a system glyph, the exact technique §3.1 tell 12 calls "a CSS trick standing in for character animation" |
| 3.13.7 | A decision exists on whether Android follows iOS or Material | Search the docs for the decision | UNVERIFIED | Neither `docs/design-direction.md` nor the PRD's decisions register takes a position. The answer follows from §1.1: the Window and the creature are the product's identity and are platform-neutral, so they should port unchanged, while navigation, the back affordance and the tab bar should be Material per `m3.material.io/foundations`. That decision needs the founder, and it should be recorded before any Android UI work resumes |

**Recommendation, stated so it is not left implicit.** Android should not ship
in this state at any gate. The cheapest correct action is not to restyle it but
to keep it out of the release train until the iOS design system is enforced
(3.15), then port the tokens, the Window and the creature in one pass. Restyling
it now duplicates the work and creates a third palette to keep in sync.

---

## 3.14 What is genuinely good

Required by the brief's constraint 5, and it is not padding: four surfaces here
are better than most shipped consumer finance apps, and the parts of this
document that read as harsh are harsh about a boundary, not about the whole.

- **The motion budget is held.** Zero springs, zero overshoot, zero count-ups,
  zero animated chart draws, seven animation sites in a 16,000-line app, and
  Reduce Motion handled by removing the geometry effect rather than shortening
  it (`HomeView.swift:108-112`). This is the single hardest §4 rule to hold and
  it is held.
- **The creature is drawn, not stamped.** `CreaturePlaceholderArt.swift` is 145
  lines of deliberate 1-bit geometry with each state readable in silhouette, and
  it isolates the swap to one file. A crude drawn creature was the correct call
  and it was made.
- **Home and the journey are the design system working.** `HomeView.swift` and
  `HomeJourneyView.swift` use only tokens, only the row primitive, only the
  specified motion, and put state in words. If every surface looked like these
  two, this part would be twelve rows long.
- **Debt is the module that took "never shame" seriously.** No red, no "you
  owe", the payment that clears the debt promoted above the minimum, the
  strategy's dollar cost stated, and the only real skeleton loading state in the
  app.
- **Onboarding uses the PRD's actual strings.** Five §10 strings verbatim,
  "Not now" implemented exactly as specified as plain text rather than a
  secondary button, and no dead end when Link is abandoned.
- **The Wealth data model is right even where the presentation is not.** Six
  groups, empty sections suppressed, per-class status carried in text, failures
  that read as failures rather than zeros, the staleness timestamp always
  visible. The screen's structure is solved; its surface is not.
- **Accessibility is treated as structural.** 37 explicit 44pt targets, combined
  accessibility elements on every composite row, `accessibilityActions`
  mirroring the context menu so VoiceOver reaches the skip options, and
  accessibility labels that speak the condition and the rung in words.
- **No colour is smuggled.** Zero hardcoded hex outside the two palette files,
  which means every colour defect in this document is a one-token substitution.

---

## 3.15 Why the tells came back, and the one thing that would stop it

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 3.15.1 | The design system is enforced by something other than attention | Read the lint config and the test suite | FAILS, MAJOR | `ios/.swiftlint.yml` has no `custom_rules` block. No file in `ios/CoinyTests` or `ios/CoinyUITests` references `CoinyTheme`, `purple`, `thinMaterial` or any design token. Nothing in CI would fail if `.purple` were added tomorrow |
| 3.15.2 | Snapshot tests exist for the surfaces at default and AX5 | Read the test suite | FAILS, MINOR | `ViewSmokeTests.swift` instantiates views to prove they do not crash; there is no snapshot library and no size-class matrix. PRD R-11.3 requires AX5 snapshots for Pet, Plan and Wealth |
| 3.15.3 | New views inherit the palette by default rather than by discipline | Read how a view acquires colour | FAILS, MAJOR | Colour is acquired by typing `CoinyTheme.ink` in each view. A view that does nothing gets `.primary` and system blue, so the default outcome for any new file written by any agent is the untokenised one. An asset catalog with `AccentColor` and named colours would make the default correct instead of wrong |

Six of the thirteen §3 tells reappeared in files §3 did not name, and every one
of them is in a file written or last touched by an agent that had no mechanical
reason to read §3. That is the finding underneath all the others: the checklist
is documentation, and documentation loses to defaults. Three changes would
close it, in this order and at this cost.

1. **Add an asset catalog with `AccentColor` set to `signal` and the eleven §4.2
   colours as named colour sets.** One-time, roughly an hour. It fixes 3.7.1,
   3.4.2e and 3.5.5a simultaneously, converts `CoinyTheme.swift` from 42 lines
   of `UIColor` arithmetic into token names, and makes the do-nothing default
   correct for every view written after it.
2. **Add SwiftLint `custom_rules` banning `Color.blue|green|red|purple|pink|
   orange|yellow|indigo|cyan|mint|teal|brown`, `.thinMaterial`, `design:
   .rounded`, and `.spring(` in `ios/Coiny/Views`.** One-time, under an hour,
   zero ongoing cost, and it fails in the same CI job that already runs. This is
   the control that would have caught `SignInView.swift:20` before it landed.
3. **Delete the four dead pre-rewrite views** (`WaitingForFirstReactionView`,
   `TipCard`, `coinyTips`, `CryptoView`). Ten minutes. It removes the §3.3
   celebration copy, the hardware claim, the material tiles, the ambient pulse
   and four tinted feature cards in one commit, with no behaviour change because
   nothing references them.

Everything else in this document is a normal edit. These three are the ones that
change whether the edits stay made, and none of them adds an ongoing maintenance
cost to a solo founder: a lint rule and an asset catalog are written once and
then only ever noticed when they fire.

---

## What this part did not cover

- **Rendered output.** Every row here is read from source. Nothing has been seen
  on a device or a simulator, so anything that depends on how a layout actually
  lands (clipping at AX5, the real contrast of a material over a specific
  background, whether the composition bar's 1pt segment gaps read as intended)
  is UNVERIFIED by construction. 3.9.6 and 3.4.6f are the two rows this most
  affects.
- **The widget, Lock Screen and Watch surfaces** (§6.6). None exists in the
  tree; there is nothing to audit.
- **Accessibility as a discipline.** Contrast, Dynamic Type and VoiceOver appear
  here only where they intersect a craft finding. Part 6 owns them.
- **Auto-renewal and subscription law.** 3.12.4 is raised because a missing
  terms link is simultaneously a dark pattern; the statutory analysis is Part 5's.
- **The reaction contract's data layer.** 3.3.1 verifies the client's gate only.
  Whether the server can emit a `celebrate` for a deposit is a PRD §7.6 question.

---

## Bullet-to-row map

Written as a ledger, per the brief, to confirm every bullet in the Part 3 brief
produced at least one row.

| Brief bullet | Rows |
|---|---|
| Re-audit every tell in §3 against current code | 3.1.1 to 3.1.13 (all thirteen), plus 3.2.1 to 3.2.8 for §3.2 and 3.3.1 to 3.3.4 for §3.3 |
| Audit the new code for tells §3 never anticipated: onboarding | 3.5.1a to 3.5.1i |
| ... the journey surface | 3.5.2a to 3.5.2f |
| ... the debt module | 3.5.3a to 3.5.3f |
| ... the Wealth rebuild | 3.5.4a to 3.5.4i |
| ... the paywall | 3.5.5a to 3.5.5g |
| Verify the design system is applied: typography | 3.4.1a to 3.4.1f |
| ... the single-accent colour rule | 3.4.2a to 3.4.2g |
| ... the money-colour rule | 3.4.3a to 3.4.3f |
| ... spacing and radius | 3.4.4a to 3.4.4e |
| ... motion durations and easing | 3.4.5a to 3.4.5f |
| ... iconography | 3.4.6a to 3.4.6h |
| Default-component tells | 3.7.1 to 3.7.6 |
| Copy tells | 3.8.1 to 3.8.10 |
| Layout tells | 3.9.1 to 3.9.6 |
| Motion tells | 3.10.1, 3.10.2, and 3.4.5 as the system pass |
| The empty, error and loading states | 3.6.1a to 3.6.1f, 3.6.2a to 3.6.2d, 3.6.3a to 3.6.3h |
| Consistency across surfaces | 3.11.1 to 3.11.8, with the verdict in prose beneath |
| HIG citations where a screen departs from a convention | 3.4.6e and 3.4.6f (Materials, Liquid Glass), 3.9.5 (44pt targets), 3.7.4 (navigation layer) |
| Android, iOS look or Material look | 3.13.1 to 3.13.7 |
| Nielsen's heuristics as the organising rubric | Match of system and real world: 3.8.5 to 3.8.9. Visibility of system status: 3.6.2, 3.6.3f, 3.5.4g. Error recovery: 3.6.3a to 3.6.3c. Consistency and standards: 3.11. Aesthetic and minimalist design: 3.9.3, 3.9.4. User control and freedom: 3.5.2c, 3.12.2, 3.12.11 |
| Butterick on type | 3.4.1a to 3.4.1f, 3.8.10 |
| Dark-patterns pass over the paywall and consent flows | 3.12.1 to 3.12.11 |
| Be willing to conclude something is fine | 3.14, plus the 22 VERIFIED rows |

Every subsection from 3.1 to 3.15 carries a table. 3.0 is method and 3.14 is the
prose exception the brief's "argument goes in prose under the table" clause
permits; every argument it makes rests on a row above it and is cited there.
