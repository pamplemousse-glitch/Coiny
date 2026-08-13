# Coiny: Art Direction and UI Design

**Status:** proposal, v1. Written 2026-08-11.
**Author:** design lead brief for Antoine Wiley / Athanor Works.
**Companion docs:** [`prd-app-v2.md`](./prd-app-v2.md) (product truth), [`product-brief.md`](./product-brief.md) (vision, mostly unfilled), [`feature-backlog.md`](./feature-backlog.md) (asset pipeline, superseded by §7 below).

**What this document is for.** Two audiences. Sections 1 through 4 and 6 are for Antoine, and they are buildable specifications. Section 5 is a self-contained brief to hand a paid illustrator. Section 7 is how to find and contract that illustrator. Section 8 is the line between the two.

**One hard rule that applies to everything below:** the app currently has no visual identity at all. `ios/Coiny/Resources/` is empty. There is no asset catalog, no app icon, no accent color, and `RootView.swift` calls `.tint(.accentColor)`, which resolves to stock iOS blue. That is not a problem to fix later. It is the reason this document can be opinionated without renegotiating anything.

---

## 1. The central tension

Coiny is two products sharing a bundle identifier.

**Product one** is a creature you become attached to. It has eight evolution stages, a voice, and a face. Its entire job is emotional. It succeeds if a user feels something when it changes.

**Product two** is one of the most comprehensive net worth aggregators that exists on iOS. The backend already fans out to roughly 40 asset sources: Plaid banking and investments and liabilities, Coinbase, Zerion, twelve on-chain wallet clients, Hyperliquid, Kraken, SnapTrade, YNAB, TrueLayer, Alpaca, Kalshi, Polymarket, Steam CS2 skins, NFT floor prices, RentCast property AVMs, MarketCheck vehicle values, GoldAPI metals, KicksDB sneakers, Discogs vinyl, PCGS graded coins, TCGapi trading cards, PokemonPriceTracker, EIA energy positions, USDA farmland, and thirteen freeform manual categories. Kubera charges $250 a year for less coverage. Its entire job is precision. It succeeds if a number is right and legible.

These two products want opposite things from a screen. The creature wants space, softness, ambiguity, and time. The ledger wants density, alignment, hierarchy, and speed. Most attempts to merge them produce one of two failures:

1. **The mascot infects the data.** Cartoon iconography creeps onto the balance sheet, every asset class gets a cute colored badge, and the app stops looking like something you would trust with a mortgage figure. This is the failure mode Coiny is currently in. `NetWorthView.swift` renders 27 stacked `GroupBox` sections, each with its own SF Symbol tinted a different system color: blue, green, orange, purple, yellow, indigo, cyan, mint, teal, brown, pink, and red. It reads as a settings screen wearing a party hat.

2. **The data starves the creature.** The pet gets demoted to a decorative header above a chart, loses all ambient presence, and becomes a logo. This is what happens to every "fun" fintech mascot within two versions.

### 1.1 The resolution: The Window

**The creature never appears on a data surface. Data never appears on the creature surface. They are connected by a single physical object that appears at three sizes.**

That object is **The Window**: a hard-edged rectangular display with a 2px corner radius, a 1px inset bezel, and a field color slightly warmer than the app background. It is the same aspect ratio and pixel grid as the Sharp Memory LCD in the deferred hardware roadmap. The creature lives inside it. Nothing else in the app is ever drawn that way.

The Window appears at exactly three sizes:

| Size | Dimensions | Where | Contents |
|---|---|---|---|
| **Full** | 192 x 192 pt | Home tab collapsed, onboarding, stage-change moment | The creature, animated, plus its one line of speech below the frame |
| **Panel** | 64 x 64 pt | Pinned above the expanded journey on Home, widgets, Watch | The creature, single idle frame, no speech |
| **Stamp** | 20 x 20 pt | Activity feed rows that triggered a reaction, tab bar | One face, one frame, 1-bit |

Six rules make this work, and they are the whole design system in miniature:

1. **The Window is the only illustration in the entire app.** No spot illustrations, no empty-state mascots, no decorative icons, no onboarding artwork. Scarcity is what keeps the creature special and it is also what keeps the commission budget under $6,000.
2. **The Window is the only place ambient motion happens.** Everything outside it moves only in direct response to a touch.
3. **The Window is the only place the pixel typeface is used.** The pet speaks in a bitmap face. The app speaks in a grotesque. You can tell who is talking without reading the words.
4. **No number ever appears inside the Window.** The pet's speech may contain numbers as words in a sentence, but the frame itself never renders a balance, a gauge, or a progress bar.
5. **Outside the Window there is no illustration at all.** The Wealth and Activity tabs are made of type, hairline rules, whitespace, and one chart. This is not austerity for its own sake. It is what makes those tabs feel trustworthy next to a $340,000 figure.
6. **The bridge is the Stamp.** In the Activity feed, most rows are plain type. The three or four rows in a month that actually moved the pet get a 20pt Stamp in the leading gutter. That is the only point where the two products touch, and its rarity is the entire effect.

### 1.2 Why this resolves it rather than compromising

The instinct with a tension like this is to blend: soften the data a little, sharpen the creature a little, meet in the middle. That produces the exact mush described in failure mode one.

The Window resolves the tension by **quarantine plus a shared substrate**. The two halves share a palette, a spacing scale, a corner-radius vocabulary, and a motion budget. They do not share a visual language. A user moving from the Home tab to the Wealth tab should feel that they walked from a front room into a workshop in the same house: same floorboards, same light, completely different purpose.

It also happens to be the cheapest possible resolution. One creature, drawn once, at three sizes, is a $3,000 to $6,000 commission. A fully illustrated app is $25,000 and a permanent maintenance liability every time you add the 41st asset class.

And it is honest about the hardware. The PRD defers hardware, but does not kill it. Designing the app's one illustrated element as a physical display at a real hardware resolution means the day a device exists, the art already runs on it. No other direction gives you that for free.

---

## 2. Three art directions

Each of these is fully specified and genuinely different. They are not three palettes on the same skeleton: they differ in medium, in production pipeline, in cost, and in who they are for.

---

### Direction A: Pocket Instrument

**One line:** a precision instrument that happens to contain a living thing.

**Mood.** Quiet, exact, handmade, slightly clinical, warmed only by the creature. The feeling of a good field notebook, a Braun calculator, a Sharp reflective LCD in daylight. Everything is a grid, a rule, or a number, except one small window where something is alive.

**Medium.** Grid-honest pixel art for the creature. Type, hairline rules, and whitespace for everything else. Reflective-LCD green-grey surfaces rather than white or cream. No gradients anywhere. No shadows except a single 1px hairline used for layering.

**Reference points.**
- The original Bandai Tamagotchi's 32 x 16 pixel monochrome LCD, where every character had to read as a silhouette because there was no room for detail ([Tamagotchi official](https://tamagotchi.com/)).
- The Game Boy DMG: 160 x 144 pixels, four shades of green, and the discipline that constraint produced ([Pan Docs, the community hardware reference](https://gbdev.io/pandocs/)).
- Panic's Playdate: a 400 x 240 1-bit reflective Sharp Memory LCD, no backlight, and a system typography program that proved 1-bit does not have to mean retro cosplay ([play.date](https://play.date/)).
- Sharp Memory LCD modules themselves, which are the display in Coiny's own hardware plan ([Adafruit's module documentation](https://www.adafruit.com/product/1393)).
- Teenage Engineering's product graphics, Field Notes, risograph printing, and the numeral discipline of a Swiss railway clock.

**Why it fits Coiny.**
- Pixel art is the only medium in this list that is *legible at 20 x 20 pt*. That is not an aesthetic point, it is a product requirement: the Stamp size, the tab bar, a Watch complication, and a Lock Screen widget all need the creature to survive at tiny sizes. A painted creature at 20pt is a smudge. A 20 x 20 pixel creature at 20pt is exactly itself.
- It is honest to the hardware. `feature-backlog.md` already specifies the device screen at roughly 96 x 96 for a Memory LCD. Authoring the master sprite at 96 x 96 means the app art and the future device art are the same file.
- It reads as *instrument*, not *toy*. This is the critical property for coexisting with a net worth figure. A pixel creature sitting next to a $340,000 number reads as a readout. A watercolor creature next to the same number reads as a children's app that has been handed your bank login.
- It is the hardest style in this document for a generative model to fake. Diffusion models produce "pixel-ish" images with off-grid pixels, anti-aliased edges, and 200-color palettes. Real grid-honest pixel art at six colors is immediately, visibly human. That is a durable anti-slop moat.
- Animation is cheap. Four frames at 8fps is a complete idle loop. There is no rigging, no interpolation, no Rive state machine, no After Effects license.

**Why it might fail.**
- Pixel art carries a nostalgia tax. A meaningful segment of the target user reads "pixel art" as "video game" and therefore "not serious about my money." The mitigation is that everything outside the Window is severe and typographic, so the pixel content is 4% of the surface area, but the App Store screenshots lead with it and that is a real risk.
- Emotional range is genuinely constrained. Six colors and 96 x 96 pixels is not a lot of room for the difference between "worried" and "sad." It demands a much better artist than a painted style does, because the expressiveness has to come from silhouette and posture rather than from rendering.
- The green-grey LCD palette is a strong commitment. If it lands wrong it reads as sickly rather than as a reflective display.
- It skews the audience. See below.

**Who it appeals to.** 26 to 40, design-literate, disproportionately male, the overlap of people who own a Playdate, a mechanical keyboard, a Teenage Engineering device, or a Casio F-91W. People who already believe that constraint is a form of quality. Notably, this is also the audience most likely to have a Hyperliquid account, on-chain wallets, and CS2 skins, which is to say: the audience the backend was already built for.

---

### Direction B: Terrarium

**One line:** a small warm creature in a small living world.

**Mood.** Hand-painted, breathing, wordless, tender. Overcast morning light. The feeling of a Ghibli establishing shot or a well-kept vivarium on a windowsill. Nothing is sharp. Nothing is loud. The creature is doing something small and unimportant when you arrive.

**Medium.** Hand-painted raster illustration, gouache or digital-gouache texture, visible brush edges, no vector cleanliness. The creature lives in a painted environment that changes with season and time of day. Type is a humanist sans with generous leading. Surfaces are soft chalky neutrals.

**Reference points.**
- Studio Ghibli background painting, specifically Kazuo Oga's work: warmth comes from desaturated greens and ochres, soft edge transitions, and light that is always slightly overcast rather than sunny.
- Ghibli character construction: warmth in a face comes from a large iris with a visible highlight, a very small mouth, a soft jaw, and a line weight that thins at the extremities rather than staying uniform.
- Neko Atsume's restraint: a flat cream background, a fixed camera, no scrolling, and cats that mostly just sit there. The engagement came from checking in, not from doing ([Neko Atsume](https://www.nekoatsume.com/en/)).
- Finch, the self-care pet app, which is the closest existing product to Coiny's emotional model and which uses soft flat vector rather than painting ([finchcare.com](https://finchcare.com/)).
- Monument Valley's light and Alto's Odyssey's silhouette-against-gradient-sky compositions ([Monument Valley](https://www.monumentvalleygame.com/)).
- Picture-book illustrators: Carson Ellis, Rebecca Green, Jon Klassen's flat shape-and-texture approach.

**Why it fits Coiny.**
- Maximum emotional warmth, which is the actual product mechanic. Attachment is the whole thesis. This direction buys the most attachment per pixel of anything here.
- It is the most differentiated from every fintech app in existence. Nothing in the competitive set looks remotely like this.
- It has the broadest demographic appeal and skews least male, which matters because the archetypes in the PRD are not all Playdate owners.
- Money anxiety is real, and this is the only direction that actively soothes rather than merely refraining from alarming.

**Why it might fail.**
- **Cost.** This is the expensive one by a wide margin. Eight evolution stages times twelve expression states in hand-painted raster, plus a painted environment, is a $15,000 to $30,000 commission and a multi-month schedule. For a solo pre-revenue founder that is the whole budget.
- **It does not scale down.** A painted creature at 64pt loses its brushwork. At 20pt it is mud. You would have to commission a separate simplified mark for widgets, Watch, and the Activity Stamp, which is a second commission in a second style, which is how brands fracture.
- **It cannot run on the hardware.** A 1-bit 96 x 96 Memory LCD cannot display a gouache painting. Choosing this direction is choosing to abandon visual continuity with the device, permanently.
- **It is a crowded lane now.** Finch, Fabulous, Headspace, Calm, and a hundred wellness apps occupy "soft warm illustrated." What was distinctive in 2019 is a genre in 2026. There is a real chance this reads as generic-wellness rather than as Coiny.
- **Consistency risk.** Keeping 96 painted assets stylistically identical across a months-long commission is genuinely hard, and it degrades if you ever have to change artists.

**Who it appeals to.** 22 to 35, skews female, the Finch and Calm and Duolingo audience, people who want their money app to be gentle with them. Broadest reach, lowest differentiation.

---

### Direction C: The Mechanical Bank

**One line:** a small brass automaton that is very serious about its job.

**Mood.** Precise, tactile, faintly absurd. Enamel and oxidized brass. The feeling of a watch movement, an old vending machine, a cast-iron mechanical coin bank from the 1880s where you put a penny in the dog's mouth and it flips into the barrel. Machined, not drawn.

**Medium.** Geometric vector, built from circles and arcs on a strict grid, rigged and animated with a state machine rather than frame-by-frame. Deep ink surfaces, brass and enamel accents, isometric or strictly frontal presentation. Real mechanical easing: things click into position rather than easing softly.

**Reference points.**
- Nineteenth-century American cast-iron mechanical banks, which are the literal historical ancestor of this product. A physical object that performs a small delightful animation in exchange for you saving a coin. Nobody in fintech is using this and it is sitting right there.
- Machinarium and Amanita Design's mechanical characters.
- Swiss watch dial typography, Braun and Dieter Rams control layout, Nixie and split-flap displays.
- Duolingo's move to rigged characters driven by a state machine rather than pre-rendered animation, which is the correct production model for a vector creature ([Duolingo design](https://design.duolingo.com/)).
- Rive as the delivery format, which is built for exactly this ([rive.app](https://rive.app/)).

**Why it fits Coiny.**
- The name is Coiny. The product's ancestor is a piggy bank. A mechanical coin bank is a genuinely ownable idea with real historical depth and zero competitors using it.
- Mechanical reads as precise, and precise reads as trustworthy with money. This direction has the best claim to sitting next to dense financial data without any tension at all.
- A rigged vector creature is resolution-independent. One file serves 192pt, 64pt, and 20pt, and scales to a marketing site and a poster with no additional commission.
- Animation is state-machine driven, so adding a new expression later is a rig change rather than a new commission. Long-term cheapest to extend.

**Why it might fail.**
- **Machines are hard to love.** This is the core risk and it is not small. The product mechanic depends on attachment. A brass automaton earns respect more easily than affection, and Coiny needs affection.
- **Steampunk is one bad decision away at all times.** Brass plus gears plus sepia is a cliche with a very strong gravitational pull. Avoiding it requires an artist with real restraint, and you cannot tell from a portfolio whether someone has it until you are three revisions in.
- **Brass and sepia palettes read dated.** Warm metallics are a 2012 skeuomorph signature and the association has not fully faded.
- **Rigged vector animation is a specialist skill.** The pool of artists who can both design a character and rig it in Rive is much smaller and more expensive than the pool who can draw sprite sheets.
- It skews male harder than Direction A does.

**Who it appeals to.** 28 to 45, watch and tool and object enthusiasts, people who read Hodinkee and own a Leatherman. Narrowest audience, highest respect, lowest warmth.

---

### 2.4 The pick: Direction A, Pocket Instrument

**Chosen.** With one modification stated up front so this is a clean choice rather than a blend: the creature is authored with a **strict 1-bit-safe silhouette** and then colored with a **fixed six-color palette**. It is not pure monochrome. The rule that makes this a single coherent decision rather than a hedge is precise and testable:

> **Every state must be identifiable when the sprite is reduced to pure black and white with no dithering.** Color is allowed to make the creature feel alive. Color is never allowed to carry information.

That single rule buys the entire Window system: the Full size can be six-color, the Stamp can be 1-bit, and they are provably the same character because the silhouette test was the authoring constraint. It also guarantees Watch complications, Lock Screen widgets, and the future Memory LCD work without a second commission.

**The defense, against the two directions it beat:**

**Against Terrarium (B).** Terrarium wins on warmth and loses on everything else that is load-bearing. Three arguments decide it.

First, cost against the actual constraint. Antoine is solo and pre-revenue. Terrarium is a $15,000 to $30,000 commission with a multi-month timeline and a hard dependency on one artist staying available. Pocket Instrument is $3,000 to $6,000 with a four-to-six week timeline. That is not a preference, it is the difference between commissioning art this quarter and not commissioning it.

Second, scale. The PRD's own information architecture requires the creature at Panel size pinned above the expanded journey, and §1.1 here requires it at Stamp size in the Activity feed. Terrarium cannot do 20pt. Choosing it means either abandoning the Stamp, which is the only bridge between the two halves of the product, or commissioning a second mark in a second style, which fractures the identity.

Third, and most importantly: **Terrarium makes the central tension worse, not better.** The whole design problem is that a charming creature and a dense ledger fight each other. Painted gouache is the *most* charming and therefore the *most* in conflict with a $340,000 figure. Pixel art is charming in a register that is adjacent to instrumentation, so it sits next to hard numbers without either one apologizing. Direction A is chosen partly *because* it is less cuddly.

**Against The Mechanical Bank (C).** C has the better story. "The app is a mechanical coin bank" is a more interesting sentence than "the app is a handheld instrument," and I want to be honest that I nearly picked it. It loses on the single most important product property: **you have to love the thing for the product to work at all.** Coiny's retention thesis is attachment. C is a direction that earns admiration. Admiration does not survive the user overspending on groceries three weeks running. A small living creature does. Secondarily, the artist pool for rigged vector character work is thinner and pricier, and steampunk drift is an unmanageable risk when you are commissioning remotely with limited art direction bandwidth.

**What Direction A gives up, stated plainly.** It gives up warmth, and it narrows the audience. Both are real costs. The mitigations are: the six-color palette rather than 1-bit, a creature form chosen specifically for softness (see §5.1), and a voice that carries the emotional load that the pixels cannot. The PRD already locked that voice as "quietly competent, specific, unbothered, never disappointed in you, slightly odd," and note that four of those five traits are much easier to convey in pixel art than in gouache. The art direction and the voice were converging on the same answer.

---

## 3. The anti-slop checklist

Generic advice is useless here, so this section is specific to files in this repository. Every item under "the current app" is a real line of shipped code.

### 3.1 The current app's tells, by file

| # | Tell | Where | Why it is a tell | What we do instead |
|---|---|---|---|---|
| 1 | **The indigo-purple-pink gradient** | `OnboardingView.swift:62` and `:290`, `.foregroundStyle(.purple, .pink)` on the hero symbol | This is the single most recognized signature of AI-generated design. Purple has become visual shorthand for "an AI made this." It is on the first screen a new user sees. | Delete. The onboarding hero is the Window containing an egg. The only accent in the app is a single amber (§4.2). Purple appears nowhere. |
| 2 | **The mascot is a system glyph** | `PetView.swift:84-92`, `moodSymbol` returns `"face.smiling.inverse"` / `"face.dashed"` | Emoji-as-iconography, in its worst form: the product's entire emotional payload is a stock SF Symbol. It is also identical to the mascot of every other unfinished app. | Commission the creature (§5). Until it lands, ship a deliberately crude 8-frame placeholder Antoine draws himself in Aseprite. A bad hand-drawn creature is infinitely better than a good system glyph, because the system glyph says "we have not decided anything." |
| 3 | **The rainbow badge grid** | `NetWorthView.swift`, 27 `GroupBox` sections each with a distinct SF Symbol tinted `.blue`, `.green`, `.orange`, `.purple`, `.yellow`, `.indigo`, `.cyan`, `.mint`, `.teal`, `.brown`, `.pink`, `.red` | Repeated identical icon-on-top cards, the universal AI feature-card layout, at a scale of 27. Also: color is being used decoratively while carrying zero information. Twelve hues, zero meaning. | Icons do not scale to 40 categories. Replace with **three-letter monospaced category codes** (`BNK`, `INV`, `CRY`, `RE`, `VEH`, `MTL`) set in ink, plus six disclosure groups (§6.3). |
| 4 | **Glassmorphism on content** | `PetView.swift:174`, `SpendingView.swift:156` and `:194`, all `.background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))` | Frosted cards are a named AI tell. Worse, this is against Apple's own guidance: Liquid Glass belongs to the navigation and control layer, and Apple explicitly says not to apply it to content ([HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)). | Content surfaces are flat opaque fills with a single 1px hairline rule. Glass is reserved for the tab bar and toolbars, where the OS puts it anyway. |
| 5 | **SF Rounded for the hero number** | `NetWorthView.swift:156`, `.font(.system(size: 48, weight: .bold, design: .rounded))` | SF Rounded is the "make it friendly" default. It is what you reach for when you have not chosen a typeface. On a net worth figure it reads as a kids' banking app. | Instrument Sans, 44pt, weight 600, tabular lining figures, ink colored (§4.1). |
| 6 | **Stoplight money colors** | Throughout. `NetWorthView.swift:157` colors the net worth total green when positive and red when negative. Also `:182`, `:456`, `:469`, `:496`; `SpendingView.swift:170` | Raw system `.green` and `.red` are garish, fail on colored backgrounds, are the most common colorblind failure, and encode a value judgment. Your net worth is not "good." It is a number. | Absolute values are always ink. Only *deltas* get color, in a desaturated moss and clay pair, always paired with an explicit sign (§4.3). |
| 7 | **Cards inside cards** | `NetWorthView.swift`, every section: `GroupBox { VStack { Divider ... } }` inside a `ScrollView` `VStack(spacing: 24)` | Nested container soup. Named tell. It also produces 27 competing boxes with no hierarchy between them. | One repeated primitive: a flat row, 44pt minimum height, separated by a 1px rule. Grouping comes from spacing and a section label, not from a box. |
| 8 | **ASCII arrow in copy** | `OnboardingView.swift:296`, `Text("Let's go →")` | Typographic arrows pasted into strings are a code-level tell. | `Text("Meet them")`. Verbs, no glyphs. |
| 9 | **Weightless symmetric tagline** | `OnboardingView.swift:68`, "Your pocket-sized financial companion" | Says nothing. Could describe forty products. This is the "Build faster. Ship smarter." family. | Say what it literally does. "Coiny watches your money and reacts." Or take the PRD's positioning line directly. |
| 10 | **Emoji in pet copy** | `product-brief.md:98` proposes reaction lines like "💰 Yes! Refuel time!" and "😢" | Emoji as the emotional channel. It also directly undercuts the creature: if the emoji conveys the feeling, the sprite is decoration. | The PRD already locked emoji-free voice lines. Enforce it as a rule: **no emoji in any user-facing string, ever.** The pet's face is the emoji. |
| 11 | **Uniform spacing** | `VStack(spacing: 24)` and `spacing: 32` applied globally | Even spacing everywhere flattens hierarchy and is a named tell. | Tight inside a group (4 to 8pt), generous between sections (32 to 56pt). §4.4. |
| 12 | **Bounce and elastic easing** | `PetView.swift:118`, `.spring(response: 0.35, dampingFraction: 0.45)` on the celebrate scale | Springy hover-and-bounce is a slop signature. It is also the wrong technique: scaling a glyph is a CSS trick standing in for character animation. | UI uses `easeOut`, 180 to 260ms, no overshoot. The creature animates by swapping sprite frames, which is what actual character animation is. §4.5. |
| 13 | **Fake vitality bars** | `PetView.swift:128-129`, two `ProgressView` bars labelled Health and Mood, always visible | Gauges-as-decoration. The original Tamagotchi hid hunger and happiness behind a button press, and it was right to. | Vitality and Energy are hidden by default. Tapping the Window flips it to a status readout. §6.1. |

### 3.2 The tells to not introduce

Things that are not in the code yet and must never get there.

- **Inter, Geist, or Space Grotesk.** Inter is now the Framer and SaaS-template default, widely described as reading "templated" rather than chosen ([Pimp My Type on Inter](https://pimpmytype.com/inter-v4/)). Fine for admin tooling. Wrong for a consumer brand.
- **Söhne.** Excellent typeface, now indelibly "the ChatGPT font" because OpenAI uses it throughout ([Klim](https://klim.co.nz/fonts/soehne/)). Using it on an app with a pet that talks to you is asking to be read as an AI wrapper.
- **A centered hero with a badge above the headline and three rounded feature cards below.** The average of every landing page. If Coiny gets a marketing site, it must not be this.
- **Monospaced balances.** Developer-tool aesthetics leaking into finance is its own 2020s cliche. Coiny uses a *proportional* grotesque with the `tnum` tabular-figures feature enabled for column alignment. Tabular figures and a monospaced typeface are not the same thing, and the distinction matters: mono is reserved for category codes and timestamps only (§4.1).
- **Donut charts.** Every finance app has one. Coiny's composition view is a single horizontal stacked bar (§6.3).
- **Confetti.** See §3.3, this one is not just taste.
- **Dark mode as the default because it looks "fintech."** Coiny defaults to light because the reflective-LCD surface is the identity and it only exists in light. Dark mode is fully supported and fully specified, but it is the alternative, not the brand.
- **Corner radii above 20px.** Cards and rows are 10px. Chips are 4px. The Window is 2px. Full pill only on the single rung tag.
- **Unmodified thin-line icons in rounded-square tiles.** The universal AI feature card. Coiny's iconography is type (§4.6).

### 3.3 The one anti-slop rule with legal teeth: never celebrate a transaction

This is not a taste question and it belongs in this section because it is the failure that would actually damage the company.

Robinhood shipped a digital confetti animation that fired when a user placed a trade, removed it in 2021 after sustained criticism, and in January 2024 agreed to pay $7.5 million to settle claims brought by the Massachusetts Securities Division over gamification and digital engagement practices ([Massachusetts Securities Division](https://www.sec.state.ma.us/divisions/securities/)). The SEC opened a formal request for comment on exactly these practices ([SEC, 2021](https://www.sec.gov/news/press-release/2021-167)).

Coiny is a pet that celebrates financial events. That is one design decision away from the same problem. The rule:

> **The creature celebrates saving, paying down debt, and completing a ladder rung. It never celebrates a transaction, a trade, a deposit into a brokerage, a price movement, or a balance.**

The PRD already enforces the underlying principle at the data layer, banning reactions to market moves and deleting `crypto_price_surge` and `crypto_price_drop`. This is the visual corollary. Practically: the celebrate animation is gated to ladder rung completion and goal contribution only, and it is a four-second sprite sequence inside the Window, never a full-screen particle effect.

---

## 4. Design system

### 4.1 Typography

Three roles, three faces. All three are free and OFL or MIT licensed, which matters for a pre-revenue solo founder and does not cost distinctiveness.

**A note on SF Pro before anything else.** Apple's downloadable SF Pro and SF Mono files are licensed only for creating UI mockups, and Apple's license explicitly does not permit embedding those font files in a shipped product, or using them in marketing, on a website, or in a logo ([developer.apple.com/fonts](https://developer.apple.com/fonts/)). Calling the system font through `Font.system` or `UIFont.systemFont` is a platform API call and is completely fine. Bundling `SF-Pro.otf` in the app or putting it on a Coiny marketing page is not. Coiny keeps the system font for standard controls where iOS expects it, and uses its own faces for identity.

#### Role 1: UI and numerals

**[Instrument Sans](https://fonts.google.com/specimen/Instrument+Sans)** by Rodrigo Fuenzalida and Jordan Egstad.

- **License:** SIL Open Font License 1.1. Free, commercial use permitted, embedding in an iOS app permitted ([source repo](https://github.com/Instrument/instrument-sans)).
- **Cost:** $0.
- **Variable:** yes. Weight 400 to 700, Width 75 to 100, plus italics.
- **Tabular figures:** yes, `tnum` is confirmed in the family's feature set. This is the reason it was chosen over other free grotesques, and it is non-negotiable for a net worth app.
- **Why this and not Inter:** it has actual character in the `g`, `R`, and `a`, a slightly condensed default width that suits dense financial rows, and it has not yet become a default. It is also genuinely underused, which is the whole point.

**Type scale.** Six sizes, ratio at or above 1.25, no in-between values. Everything is Dynamic Type scalable ([HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)).

| Token | Size / line height | Weight | Tracking | Use |
|---|---|---|---|---|
| `display` | 44 / 46 | 600 | -0.02em | The net worth figure. One per screen, maximum. |
| `title` | 26 / 30 | 600 | -0.01em | Screen titles, rung names |
| `heading` | 18 / 24 | 600 | 0 | Section labels, group headers |
| `body` | 16 / 24 | 400 | 0 | Row primary text, prose |
| `data` | 16 / 24 | 500, `tnum` | 0 | Every balance and amount |
| `caption` | 13 / 18 | 400 | 0.01em | Secondary row text, units, dates |

Six sizes. Not eight, not eleven. Flat hierarchy from sizes that are too close together is a named tell, and 44 / 26 / 18 / 16 / 13 has clear steps.

#### Role 2: category codes and timestamps

**A custom build of [Iosevka](https://github.com/be5invis/Iosevka)** by Belleve Invis.

- **License:** SIL OFL 1.1. Custom builds inherit the license and are legal to ship commercially, provided the build is not named "Iosevka" (reserved font name clause) and the license notice is retained ([LICENSE.md](https://github.com/be5invis/Iosevka/blob/main/LICENSE.md)).
- **Cost:** $0 plus about two hours of setup.
- **Why:** Iosevka is configurable. You select stylistic sets, widths, and glyph variants via a build plan, generated most easily through the [Iosevka Customizer](https://typeof.net/Iosevka/customizer), then compile locally with Node. The output is a typeface **that no other product on the App Store has**. For a founder who has been told not to look generic, a bespoke typeface for zero dollars is the single highest leverage typographic move available.
- **Build settings to specify:** narrow width, `ss08` or similar for a more geometric lowercase, slashed zero on, ligatures off, and only the weights you need (Regular and Medium). Ship it as `CoinyMono`.
- **Where it is used, exhaustively:** the three-letter asset category codes, relative timestamps in the Activity feed, and account mask digits. **Never on a balance.** That restriction is what keeps it from becoming the "monospace numerals" cliche.

#### Role 3: the pet's voice

**[Departure Mono](https://departuremono.com/)** by Helena Zhang.

- **License:** MIT ([source repo](https://github.com/rektdeckard/departure-mono)). Free, commercial use permitted, embedding permitted. Obligation is to retain the copyright notice, which means one line in an in-app acknowledgements screen. Note: several font aggregator sites incorrectly label this as OFL. It is MIT.
- **Cost:** $0.
- **Design constraint:** it is a bitmap-derived face designed for pixel-perfect rendering at multiples of 11px. Coiny uses it at exactly **22px** for the pet's speech line and **11px** for the Window's internal status readout. Never at any other size, never scaled fractionally.
- **Why:** this is the typographic move that makes the Window feel like a real display. The pet's speech renders in an actual bitmap face on the same pixel grid as the sprite. The user perceives, without being told, that the pet's words come from inside the machine and the app's words come from outside it. It is one font swap doing the work of an entire art treatment.
- **Constraint it imposes:** the PRD's locked voice lines are long. "You have paid Netflix $17.99 for 14 months. That is $251. Keeping it?" is 63 characters. At 22px Departure Mono on a 393pt-wide iPhone that is three lines. The speech area under the Window must be laid out for **up to four lines at 22px**, roughly 100pt of vertical space, not a one-line caption.

#### Paid upgrade path

If Coiny raises money and wants to buy a display face, the two worth quoting are:

- **[Basis Grotesque](https://www.myfonts.com/collections/basis-grotesque-font-colophon-foundry/)** by Colophon Foundry. Desktop is $60 per style, or $768 for the full 16-style family. An App EULA for embedding in an iOS app exists but Colophon does not publish its price, so it requires a direct quote. Colophon was acquired by Monotype in December 2023, so terms may shift.
- **[Favorit](https://abcdinamo.com/typefaces/favorit)** by ABC Dinamo, with Favorit Mono as a sibling that has confirmed tabular figures and a slashed zero. Dinamo prices desktop licenses by company headcount, starting at EUR 90 per style at three employees ([Dinamo pricing](https://abcdinamo.com/news/about-our-pricing)). The app-embedding license is quote-only.

Neither is necessary. Instrument Sans plus a custom Iosevka plus Departure Mono is a better and more distinctive system than most funded startups ship, and it costs nothing.

### 4.2 Color

The palette is derived from the product's own material: a reflective Sharp Memory LCD in daylight, which is a slightly green-cast grey rather than white. That is where the surface colors come from, and it is why the app does not look like the default cream that generic design converges on.

**Contrast ratios below are computed WCAG 2.x values**, verified against the light screen background `#EDEFE7` and the light raised surface `#F8F9F4`, and against the dark equivalents. AA for normal text is 4.5:1, AA for large text and UI components is 3:1 ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).

#### Light (default)

| Token | Hex | Role | Contrast on `screen` | on `surface` |
|---|---|---|---|---|
| `screen` | `#EDEFE7` | App background. The LCD. | base | base |
| `surface` | `#F8F9F4` | Raised rows, sheets, cards | base | base |
| `field` | `#E4E7DA` | Inside the Window only | base | base |
| `ink` | `#191C17` | Primary text, all balances | **14.84** | **16.27** |
| `ink-2` | `#4E534A` | Secondary text | **6.80** | **7.46** |
| `ink-3` | `#6E7468` | Labels, units, disabled | **4.15** | **4.55** |
| `rule` | `#D3D8C9` | 1px hairlines | 1.25 (decorative) | 1.37 |
| `signal` | `#9C5310` | Interactive text, links, the one accent | **4.95** | **5.43** |
| `signal-fill` | `#A85B14` | Filled button background | white text on it: **5.03** | |
| `positive` | `#3D6B44` | Positive delta only | **5.35** | **5.86** |
| `negative` | `#9A3B32` | Negative delta only | **5.94** | **6.52** |

`ink-3` at 4.15 on `screen` is below AA for normal text. It is therefore permitted **only at `caption` size and above with weight 500, or on `surface` where it reaches 4.55**. Everywhere else, secondary text uses `ink-2`.

#### Dark

| Token | Hex | Role | Contrast on `screen` | on `surface` |
|---|---|---|---|---|
| `screen` | `#151711` | App background | base | base |
| `surface` | `#1E211A` | Raised rows, sheets | base | base |
| `field` | `#1C1F16` | Inside the Window only | ink on it: 13.84 | |
| `ink` | `#E8EBE0` | Primary text, all balances | **14.96** | **13.51** |
| `ink-2` | `#A8AEA0` | Secondary text | **7.94** | **7.17** |
| `ink-3` | `#7E857A` | Labels, units | **4.75** | **4.29** |
| `rule` | `#2E3229` | 1px hairlines | 1.38 (decorative) | 1.25 |
| `signal` | `#E8A33D` | Interactive, accent | **8.38** | **7.56** |
| `positive` | `#8FBF8A` | Positive delta only | **8.59** | **7.76** |
| `negative` | `#E39B92` | Negative delta only | **8.06** | **7.28** |

Every value in both tables clears AA for normal text except the two hairline tokens, which carry no information, and light `ink-3`, which is constrained as noted.

**Why amber and not green or purple.** Purple is the AI signature. Green is the fintech default and, more practically, green is needed for the positive-delta role, so using it as the brand accent would make brand and meaning collide on the same screen. Amber is an indicator-lamp color, it belongs to the instrument idea, it is close to unused in consumer finance, and because it is reserved exclusively for interaction it can never be confused with a financial value.

**Exactly one accent.** Amber is the only chromatic color in the interface outside of deltas and the creature's own six-color palette. Not one accent per tab. Not a color per asset class. One.

### 4.3 The money color rule

This is the rule the current code gets wrong in six places, and getting it right is most of the difference between "trustworthy" and "toy."

1. **Absolute values are always `ink`.** A balance, a net worth total, an account value, a debt amount, and a holding value are all rendered in primary ink regardless of sign or size. `NetWorthView.swift:157` currently colors the net worth figure green when positive. Delete that. A net worth of $340,000 is not a success state and a net worth of -$4,000 is not an error state. They are facts, and coloring facts is editorializing.

2. **Only deltas get color.** A change over a period, a gain, a loss, a variance against plan. Never a level.

3. **Color is never the only channel.** Every colored delta carries an explicit `+` or `-`. This is a hard accessibility requirement, not a nicety: red-green is the most common color vision deficiency and roughly 1 in 12 men have some form of it. Test by rendering every delta greyscale and confirming it still parses.

4. **The pair is desaturated moss and clay, not stoplight.** `#3D6B44` and `#9A3B32` in light, `#8FBF8A` and `#E39B92` in dark. System `.green` and `.red` are banned from the codebase. They are shrill, they fail on tinted backgrounds, and they carry an alarm connotation that a 2% monthly drawdown does not deserve.

5. **Debt is never red.** This is where the design principle and the product principle meet. The PRD's second principle is "never shame." A mortgage rendered in alarm red every time the user opens the Wealth tab is shaming them daily for a normal financial instrument. Liabilities render in `ink` with a leading minus sign, in a group labelled "Owed." The only place `negative` appears near debt is on a *change*: a balance that went up this month.

6. **Credit utilization, credit score, and emergency runway keep their three-band coloring**, because those genuinely are graded health metrics with published thresholds rather than raw values. But they use `positive` / `signal` / `negative` rather than `.green` / `.orange` / `.red`, and each shows the threshold inline so the color is explained rather than asserted. This is the one carve-out and it should not grow.

### 4.4 Spacing, radius, and structure

**Spacing scale.** `2, 4, 8, 12, 20, 32, 56`. Loosely geometric, deliberately not a rigid 8pt grid, because uniform spacing everywhere flattens hierarchy.

The rule that matters more than the scale: **tight inside a group, generous between groups.** Rows within a section sit 4pt apart. Sections sit 32 to 56pt apart. The current code uses `VStack(spacing: 24)` for everything, which is why 27 sections read as one undifferentiated list.

**Radius.**

| Element | Radius |
|---|---|
| The Window | 2px |
| Rows, cards, sheets | 10px |
| Inline chips, category codes | 4px |
| The active rung tag | full pill |
| Buttons | 10px |

Nothing is 16px or above except the pill. The current `RoundedRectangle(cornerRadius: 16)` used throughout goes to 10.

**Structure.** One repeated primitive, used everywhere: **the row.** Minimum 44pt tall for touch targets, leading category code or label, trailing value, separated from its neighbor by a 1px `rule` hairline inset to the leading text margin. Sections are introduced by a `heading` label and whitespace. There are no boxes. Grouping is communicated by proximity and a label, which is what proximity and labels are for.

Shadows: one, and it is not really a shadow. Sheets and the tab bar get a 1px `rule` hairline on the leading edge. No blur, no colored glow, no elevation system.

### 4.5 Motion

**The motion budget.** The creature moves. The interface does not, except in direct response to a finger.

That is the whole principle and it is unusually strict. It exists because ambient motion is attention, and if the Wealth tab has a shimmer or a count-up or a chart that draws itself, it is competing with the only thing in the app that is supposed to be alive.

| Category | Spec |
|---|---|
| **Creature idle** | 4 frames at 8fps, looping. Frame swap, not tween. A blink cycle fires on a randomized 4 to 9 second interval. |
| **Creature reaction** | 6 to 12 frames at 12fps, plays once, returns to idle. |
| **Stage change** | The signature moment. 16 to 24 frames, 12fps, roughly 2 seconds. Full-screen dim to `screen` at 100%, the Window scales from 192pt to 260pt with `easeOut` over 400ms, the sequence plays, the new stage's idle begins, the speech line types in one character per 24ms in Departure Mono. This is the single most produced moment in the app and it should be the only one. |
| **UI transitions** | `easeOut`, 180 to 260ms. No spring, no overshoot, no bounce. Delete `.spring(response: 0.35, dampingFraction: 0.45)`. |
| **Disclosure groups** | 200ms `easeOut` height change. No rotation on the chevron beyond 90 degrees, no bounce. |
| **Charts** | Draw instantly. No animated draw-on. |
| **Numbers** | Do not count up or roll. The odometer effect is a fintech cliche and it delays the user reading the number. |
| **Pull to refresh** | System default. Do not customize it with the creature. |

**Reduce Motion.** When `accessibilityReduceMotion` is on: the creature holds a single static frame per state, expression changes still occur as instant frame swaps (this is important, the emotional information must survive), the stage-change sequence becomes a crossfade between the first and last frame over 300ms, and all UI transitions become opacity-only.

**Low Energy is a nap, not a wound.** The PRD is explicit that low Energy from app absence must never render as distress, because a sad pet triggered by not opening the app is emotional blackmail and produces avoidance. Visually: at Energy below 20 the creature is asleep. Closed eyes, curled posture, a slow 2-frame breathing loop at 0.5fps. It is peaceful. It is never sad, never grey, never small. The distinction between "asleep" and "sick" must be unmistakable in the sprite, and it is called out again in the character brief.

### 4.6 Iconography

**The app has almost no icons, on purpose.**

Twenty-seven multicolored SF Symbols is what happens when icons are asked to do a job they cannot do. Icons do not scale past roughly a dozen categories before they become an emoji soup where the user recognizes none of them. Coiny has 40 asset categories and will have more.

**Category identity comes from type: a three-letter code in CoinyMono, uppercase, tracked +0.06em, `ink-2`, in a 4px-radius chip with a 1px `rule` border and no fill.**

```
BNK  INV  CRY  DFI  CHN  HYP  NFT  STM  ALP  MTL
RE   VEH  SNK  VNL  KAL  PLY  TCG  PKM  CON  ENR
FRM  YNB  SNP  KRK  TRL  MAN  DBT
```

This works where icons do not because it scales infinitely, it is unambiguous, it reads at any size, it needs no design work when integration 41 ships, it aligns in a column (which icons of varying optical weight do not), and it reinforces the instrument aesthetic for free. It is also the kind of decision nobody makes by default, which is the point.

**Where real icons are still used:** system navigation only. Tab bar, toolbar buttons, disclosure chevrons, the back chevron. SF Symbols, one weight (Regular), **one color (`ink`, or `signal` when active)**, never tinted per-category. The tab bar's Pet icon is the exception: it is the 20pt 1-bit Stamp of the creature, which is worth the one-off.

**Institution logos.** Bank and brokerage brand marks are the one place external color enters the interface. They appear at 20 x 20pt, greyscale by default, and in full color only inside the account detail sheet. This keeps a Chase blue and a Coinbase blue from becoming accidental accent colors on the main list.

### 4.7 iOS 26 and Liquid Glass

Xcode 26.5 and the iOS 26.5 simulator are the current toolchain per `handoff.md`. Building against the iOS 26 SDK opts the app into the Liquid Glass design language automatically. The deployment target in `ios/project.yml` is currently iOS 17.0, so any explicit glass API needs availability gating.

**The single most important piece of Apple guidance for this app:** Liquid Glass is a material for the **navigation and control layer**, and Apple says not to apply it to content ([HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials), [Adopting Liquid Glass](https://developer.apple.com/design/human-interface-guidelines/adopting-liquid-glass)). Coiny currently does the opposite: `.thinMaterial` is applied to content cards in `PetView` and `SpendingView`. That is both a slop tell and a HIG violation, and fixing it is the same edit.

Rules for Coiny:

- **Glass belongs to the tab bar and toolbars only.** Let the system provide it. Do not add `.glassEffect()` to content.
- **Never stack glass on glass.** Apple is explicit about this and it is the most common adoption mistake.
- **Content sits on flat opaque fills.** `screen` and `surface`, always.
- **Do not tint the glass.** Apple advises using tint sparingly and only to convey meaning. Coiny has one accent and it is not spent here.
- **The Window is never glass.** It is an opaque physical display with a hard 2px radius. It is the one element that must read as an object rather than a layer.
- **Respect Reduce Transparency.** When on, glass surfaces fall back to opaque `surface`. Test it: much of the Liquid Glass legibility criticism through the iOS 26.0 and 26.1 cycle came from text over glass over busy content, and Apple's own response was to add a less transparent option in Settings. Coiny should look correct under both.
- **Do not use `UIDesignRequiresCompatibility`.** The Info.plist opt-out is a temporary escape hatch, not a design decision, and Apple has signalled it will not persist.
- **App icon.** iOS 26 icons are authored as layered documents in [Icon Composer](https://developer.apple.com/icon-composer/) and must work in light, dark, clear, and tinted variants ([HIG: App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)). Coiny's icon is the Window at full bleed containing the creature's face at Panel scale. It is deliverable 3 in the commission (§7.2) and the artist must be briefed on the four-variant requirement, because a design that depends on its background color will fail the clear and tinted variants.

---

## 5. The character design brief

**This section is written to be handed to a paid illustrator with minimal editing.** It is self-contained. Everything above is context Antoine needs and the artist does not.

---

### Brief: Coiny, character design and sprite production

**Client:** Athanor Works (Antoine Wiley)
**Product:** Coiny, an iOS app. A small creature reacts to the user's real financial behavior and grows as they build financial stability.
**What we are commissioning:** one original character, designed and delivered as pixel-art sprite sheets across 8 growth stages and 14 states.

#### 5.1 Form direction

**Medium: pixel art.** Grid-honest, hand-placed pixels. Not a raster painting downscaled. Not a pixelation filter. Authored in Aseprite or an equivalent at native resolution.

**The governing constraint, above all others:**

> **Every state must be identifiable when the sprite is flattened to pure black and white with no dithering, at 24 x 24 pixels.**
>
> Color makes the creature feel alive. Color never carries information. If "worried" and "sad" are only distinguishable by hue, they are the same drawing and we will send it back.

This exists because the character has to work at 192pt on the main screen, at 64pt in a widget, and at 20pt as a 1-bit stamp in a transaction list. Silhouette, posture, and shape do the work. This is the same constraint the original Tamagotchi worked under at 32 x 16 pixels, and it is why those characters are still recognizable thirty years later.

**Species: open, with a strong steer.**

We are not prescribing a species and we want the artist's exploration. But the mechanic below is the best idea we have and should be the starting point:

> **A small hoarding creature with a visible storage feature.** A rodent-adjacent or bird-adjacent animal with cheek pouches, a pouch belly, or a similar container that visibly fills and empties.

Why: it puts the product's core idea directly into the silhouette. Full pouches read as "saved" from across a room and at 20 pixels. Empty pouches read as "spent." No gauge, no bar, no number, no color coding required. It is also a real animal behavior, which keeps it from feeling like a mascot with a gimmick bolted on.

Two alternates worth one sketch each during exploration:

- **Vessel.** A creature that is partly a container. A lantern-bodied or jar-bodied thing with a visible internal level.
- **Sprout.** A plant-animal hybrid where growth is literal and the 8 stages are botanical.

**Proportions and appeal.** Large head relative to body, roughly 1:1.5 head to body at the youngest stage moving toward 1:2 at the oldest. Eyes large, positioned low on the head, with a single-pixel highlight. Mouth small and used sparingly. Limbs short and simple.

**One deliberate imperfection.** A note borrowed from Ken Sugimori's approach to the original Pokemon designs: when a design gets too clean or too cool, add one element that is slightly goofy or off-balance. It is what separates a character you like from a logo you recognize. We would rather the creature be a little strange than a little generic. The product voice is "quietly competent, specific, unbothered, never disappointed in you, slightly odd," and that last word is doing real work.

**References to look at:** original Bandai Tamagotchi character silhouettes, Digimon virtual pet sprites, Game Boy era Pokemon front sprites, and the Playdate's system art for how 1-bit constraint can feel contemporary rather than nostalgic.

**References to avoid:** Duolingo's Duo and modern mascot-brand vector characters, anything with a gradient, anything with a drop shadow, anything with an outline that varies in width to suggest depth.

#### 5.2 Personality the design must convey

| Trait | What it means for the drawing |
|---|---|
| **Quietly competent** | It is not frantic. It has good posture. It looks like it knows what it is doing even when it is worried. |
| **Specific** | It has a distinct silhouette you could pick out of ten. No generic blob. |
| **Unbothered** | Its resting state is calm and slightly occupied, not eagerly waiting for you. |
| **Never disappointed in you** | This is the most important one. Its negative states are *concerned about the situation*, never *judging the viewer*. It never crosses its arms, never frowns at the camera, never taps a foot. When things go badly it looks at the problem, not at you. |
| **Slightly odd** | One feature is a little wrong on purpose. |

**Hard prohibition:** the creature must never look accusatory. Money shame causes avoidance, and an app the user avoids is a dead product. Every negative state must pass this test: if the user is having the worst financial month of their life, does looking at this drawing make them want to close the app? If yes, redraw it.

#### 5.3 Growth stages: exactly 8

These names and this order are fixed by the product. They map one-to-one onto the user's real financial progress, so each is a meaningful, earned, permanent transformation. A stage can never be lost, so each new stage should feel like a reward.

| # | Stage name | What the user did to earn it | Design direction |
|---|---|---|---|
| 0 | **Egg** | Connected an account | Not yet a creature. A shell with a visible hint of what is inside. Must be appealing on its own for weeks. |
| 1 | **Hatchling** | Built a $2,000 starter cash buffer | Just emerged. Fragment of shell still attached. Barely mobile. Largest head-to-body ratio. |
| 2 | **Sprout** | Captured their full employer 401k match | First real growth. Standing. First hint of the adult silhouette. |
| 3 | **Fledgling** | Paid off every debt above 10% APR | Noticeably lighter and freer. This one should read as *unburdened*, since the achievement is the removal of a weight. |
| 4 | **Adolescent** | Fully funded their emergency fund | Awkward proportions, mid-transformation, limbs slightly too long. Charming rather than elegant. |
| 5 | **Adult** | Funded tax-advantaged accounts to their target rate | The definitive form. This is the silhouette the brand is built on and the one that appears in the app icon. |
| 6 | **Elder** | Sustained a 25% savings rate for 3 months | Calm, settled, a little more substantial. Dignity, not decrepitude. Not grey, not stooped. |
| 7 | **Ascendant** | Reached 25x annual essential expenses invested | The rarest state, reached by almost nobody, and it should look like it. Permission to be strange and beautiful here. |

**Within-stage progress.** Rungs take months and sometimes years to complete, so the creature must visibly change *inside* a stage or progress feels invisible. Deliver each stage with **3 progress variants** at roughly 33%, 66%, and 100% of the rung: small changes only, such as slightly larger size, a posture change, or one small accessory appearing. Variant 3 of stage N should read as clearly closer to stage N+1 than variant 1 does.

That makes **8 stages x 3 variants = 24 base forms.**

#### 5.4 States and expressions: exactly 14

Each state is required for **the Adult stage (5) at minimum**, which is the priority delivery. Full state coverage for all 8 stages is phase 2 (see §7.2 for the commissioning order).

| # | State | Frames | Notes |
|---|---|---|---|
| 1 | **Idle** | 4, loop @ 8fps | The default. Occupied with something small, not staring at the viewer. |
| 2 | **Blink** | 3, one-shot | Fires on a random 4 to 9 second interval over idle. |
| 3 | **Notice** | 4, one-shot | Plays when the user opens the app. The creature was doing something and looks up after about a second. It does not greet, it just notices. |
| 4 | **Content** | 4, loop @ 6fps | Slightly better than idle. Things are going well. Subtle. |
| 5 | **Happy** | 6, one-shot | A good thing happened. A paycheck, a contribution, a debt payment. |
| 6 | **Celebrate** | 12, one-shot @ 12fps | Reserved exclusively for completing a foundation rung or a goal. Never fires on a transaction. The biggest expression in the set. |
| 7 | **Curious** | 5, one-shot | The pet has a question, such as a detected subscription. Head tilt. Used for prompts. |
| 8 | **Worried** | 4, loop @ 6fps | Something is off but not urgent. Attention directed away from the viewer, at the problem. |
| 9 | **Sad** | 4, loop @ 4fps | Genuinely low. Still never accusatory. Slower, smaller, turned slightly away. |
| 10 | **Sleeping** | 2, loop @ 0.5fps | **Critical distinction: this is peaceful, not unwell.** Fires when the user has not opened the app. Curled, closed eyes, slow breathing. It must be impossible to mistake for state 11. |
| 11 | **Unwell** | 4, loop @ 4fps | Sustained poor financial vitality over weeks. Visibly different from sleeping: eyes open but dull, posture drooped rather than curled. Used rarely. |
| 12 | **Receiving** | 6, one-shot | Taking something in and storing it. If the hoarder form is chosen, this is the pouch-filling animation, and it will be the most-played sequence in the app. |
| 13 | **Disconnected** | 3, loop @ 4fps | No bank connected, or a connection broke. The creature is present but cannot see anything. Looking around, patient, not distressed. **This state is always forgotten and it is the state a new user sees most.** |
| 14 | **Stage transition** | 20, one-shot @ 12fps | The transformation from stage N to stage N+1. Delivered once per stage boundary, so 7 sequences total. This is the emotional peak of the product. |

#### 5.5 Technical delivery specification

**Canvas and grid**

| Item | Spec |
|---|---|
| Master resolution | **96 x 96 px** per frame, transparent background |
| Grid | 1 logical pixel = 1 actual pixel. No sub-pixel placement, no anti-aliasing, no partial alpha except fully transparent. |
| Alpha | Binary only. A pixel is fully opaque or fully transparent. |
| Reduction 1 | **48 x 48 px**, 1-bit black and white, hand-corrected. For widgets, Watch, and the future hardware display. Not an automatic downscale, hand-fixed. |
| Reduction 2 | **24 x 24 px**, 1-bit. For the Activity feed Stamp and the tab bar. Idle, Happy, Worried, Sleeping, and Disconnected only. |

96 x 96 is chosen because it matches the Sharp Memory LCD resolution in the hardware plan, and because it displays at 192pt on iPhone at exactly 6x integer scale on a 3x screen (96 x 6 = 576 device px = 192pt @3x). Only integer scaling is ever used. Nearest-neighbor sampling only.

**Palette**

- **Maximum 6 colors plus transparent**, for the entire creature, across all stages.
- Deliver the palette as an `.ase` / `.gpl` swatch file.
- The palette must sit correctly on both `#E4E7DA` (light field) and `#1C1F16` (dark field). Test on both before delivery.
- Accessory and cosmetic unlocks may introduce a 7th and 8th color, specified per accessory, never in the base creature.
- No gradients. No dithering finer than a 1px checkerboard, and dithering used for form only, never for glow.

**Animation**

- Frame counts as specified in §5.4.
- Constant frame rate per sequence. No easing between frames, no interpolation, no tweening. Every frame is drawn.
- Motion in whole-pixel increments only. Never sub-pixel, never rotation, never scaling.
- Loops must be seamless: the last frame must flow into the first with no visible pop.

**Files delivered**

1. **Aseprite source files** (`.aseprite`), layered, with named tags for every animation sequence. These are the master and they are what we own.
2. **PNG sprite sheets**, one per stage, power-of-two dimensions, one row per animation, left to right, fixed cell size, no padding between cells.
3. **JSON atlas** per sheet, Aseprite's standard array export, including frame durations and tag names ([Aseprite export documentation](https://www.aseprite.org/docs/cli/)).
4. **The 1-bit reductions** at 48px and 24px, same structure.
5. **A single reference sheet PNG** showing all 8 stages side by side in idle, at 4x, for internal reference and marketing.
6. **The palette file.**
7. **The app icon**, delivered as a layered source suitable for import into Apple's Icon Composer, working across light, dark, clear, and tinted variants.

**Formats we do not want and why**

- **No Lottie.** Lottie is a vector animation format and it will destroy pixel art.
- **No Rive.** Same reason. Correct tool, wrong medium.
- **No GIF.** Lossy palette handling, no per-frame metadata, no alpha control.
- **No sprite sheet without a JSON atlas.** We are not hand-measuring cell offsets.
- **No flattened PNGs without the Aseprite source.** The source is a deliverable, not a courtesy.

#### 5.6 What NOT to do

- No anti-aliasing, no soft edges, no partial alpha, no blur, no glow, no drop shadow on the sprite.
- No gradients anywhere in the character.
- No more than 6 colors in the base creature.
- No rotation, no scaling, no skewing. If it needs to turn, draw the turn.
- No sub-pixel motion. Everything moves in whole pixels.
- No non-integer display scaling, and no bilinear filtering at any point in the pipeline.
- No emotion carried by the mouth alone. Every state must read in silhouette.
- No emotion carried by color alone. Every state must read at 1-bit.
- No accusatory posture in any negative state. No crossed arms, no pointing, no frowning at the viewer, no hands on hips.
- Do not make "sleeping" look sick, and do not make "unwell" look asleep.
- No text, no numbers, no currency symbols, and no emoji anywhere in the sprite.
- Do not design a creature whose appeal depends on being seen large. It will spend most of its life at 20 and 64 pixels.
- No AI-generated or AI-assisted imagery in any delivered asset. See §7.5.

---

## 6. Screen by screen

The PRD's information architecture is four tabs: **Pet, Plan, Activity, Wealth**, with Settings behind a gear. Goals move out of Settings and into Plan.

### 6.1 Pet

The home screen. Its job, per the PRD's fourth product principle, is to answer "what do I do" before "how am I doing."

**It does not scroll.** One screen, one creature, one instruction. That is a deliberate and slightly aggressive choice, and it is the strongest possible statement that this app is not a dashboard.

```
+-------------------------------------------+
|                                    [gear] |   toolbar, glass, system
|                                           |
|                                           |
|         +-----------------------+         |
|         |                       |         |
|         |                       |         |   The Window, 192x192pt
|         |       [creature]      |         |   field #E4E7DA, 2px radius
|         |                       |         |   1px inner bezel in rule
|         |                       |         |   tap to flip to status
|         +-----------------------+         |
|                                           |
|   Groceries went $38 over the plan this   |   Departure Mono 22px
|   week. Nothing to fix today. I moved     |   ink, up to 4 lines
|   the line for next week.                 |   ~100pt reserved
|                                           |
|                                           |
|                                           |   56pt gap
|  RUNG 4                       BUFFER      |   caption, ink-3 / CoinyMono
|  Full emergency fund                      |   heading, ink
|  ####################-------------  62%   |   4pt bar, signal on rule
|                                           |
|  $7,440 of $12,000                        |   data, ink-2
|                                           |
|          [  Move $200 now  ]              |   signal-fill, 10px radius
|                                           |   the one instruction
+-------------------------------------------+
|   [pet]      Plan     Activity    Wealth  |   tab bar, system glass
+-------------------------------------------+
```

**Notes.**

- The creature sits at roughly 38% of screen height, not centered. Dead-center is the template answer and it wastes the lower third.
- The speech line sits **outside** the Window. The pet speaks into the room. Nothing but the creature is ever inside the frame.
- **Tapping the Window flips it** to a status readout: Vitality and Energy as two 11px Departure Mono rows on the field, inside the frame, for as long as the finger is down. This is how the original Tamagotchi handled its hunger and happiness meters, and it is why `PetView`'s two permanent `ProgressView` bars should be deleted. Status is available, not ambient.
- **Exactly one action button.** If there is no clear next action, the button is absent and the rung block sits alone. Never two competing calls to action.
- The rung progress bar is a 4pt flat bar in `signal` over `rule`. Not a ring, not a gauge, no gradient.
- When Energy is low the creature sleeps and the speech line is empty. No "come back soon" copy. That is the blackmail the PRD bans.

### 6.2 Plan

New surface. Holds the Foundation Ladder, target goals, and guardrails. This is the screen that makes Coiny a financial product rather than a toy, and it is the one most at risk of becoming a checklist.

```
+-------------------------------------------+
|  The Climb                                |   title
|                                           |
|  +-------+                                |
|  |  [c]  |  RUNG 4  Buffer                |   Panel Window, 64x64pt
|  +-------+  Full emergency fund           |   heading + caption
|                                           |
|  ####################-------------  62%   |
|  $7,440 of $12,000                        |
|  4.5 months of essentials, sized to your  |   caption, ink-2
|  income volatility.            [why?]     |   'why' opens the derivation
|                                           |
|                                           |   56pt
|  --------------------------------------   |   rule
|  0  Sighted                          done |   ink-3, 44pt rows
|  1  Floor                            done |
|  2  Free money                       done |
|  3  Bleeding stopped                 done |
|  4  Buffer                        ACTIVE  |   ink, signal tag, pill
|  5  Sheltered                             |   ink-3
|  6  Surplus                               |
|  7  Freedom                          14%  |
|  --------------------------------------   |
|                                           |
|                                           |   56pt
|  GOALS                                    |   heading
|  Japan, March                             |
|  ##########--------------------     31%   |
|  $1,240 of $4,000    $230/mo to make it   |   data + caption
|                                           |
|  Emergency top-up                         |
|  #####################------        68%   |
|                                           |
|                                           |   56pt
|  GUARDRAILS         this month            |   heading + caption
|  Dining out            $312 of $350       |   row
|  Rideshare              $88 of $80   +$8  |   negative delta, signed
|                                           |
|                                           |   56pt
|  YEARS TO FREEDOM                         |
|                                           |
|   51 -------[]------------------- 7       |   slider, signal thumb
|   10%     savings rate 25%      75%       |
|                                           |
|            32 years                       |   display, ink
|                                           |
+-------------------------------------------+
```

**Notes.**

- The Panel Window at the top is the only illustration on this screen, and it is what connects a progress ladder to the creature. Without it, this screen belongs to a different app.
- **Completed rungs stay visible and stay marked done.** The PRD is explicit that rungs never un-complete, so the list is a record of achievement, not a to-do list with items disappearing. This is a meaningful emotional difference and it is worth the vertical space.
- Rung 7 shows a percentage forever and never says "done," per the PRD.
- **Every derived number has a `[why?]`** that opens a sheet showing the derivation and the citation. The PRD's fifth principle is "precision or silence," and this is its interface expression.
- The years-to-freedom slider is the one genuinely playful control in the data half of the app, and it earns its place because moving it produces a real, sourced number.
- Guardrails show the overage as a signed delta in `negative`. The absolute figures stay ink. A guardrail is never rendered as a failure.

### 6.3 Wealth, and the 40-category problem

This is the hardest screen and the one that most needs rebuilding. Today `NetWorthView.swift` renders 27 `GroupBox` sections unconditionally, each with a "Connect" button, whether or not the user has that asset. A new user with one checking account currently sees a checking balance followed by 26 empty boxes advertising Hyperliquid, Polymarket, CS2 skins, and graded coins. That is a vendor directory, not a net worth screen.

**Four structural rules fix it.**

**Rule 1: six groups, fixed, not 27.** Matches the PRD's collapse target.

| Group | Contains |
|---|---|
| **Liquid** | Checking, savings, cash, money market, TrueLayer, YNAB |
| **Invested** | Plaid Investments, SnapTrade, Alpaca, Kraken, retirement accounts |
| **Crypto** | Coinbase, Zerion DeFi, 12 chain wallets, Hyperliquid, NFTs |
| **Owned** | Real estate, vehicles, metals, sneakers, vinyl, cards, coins, Steam, energy, farmland, manual assets |
| **Speculative** | Kalshi, Polymarket |
| **Owed** | Credit cards, loans, mortgages, Spinwheel liabilities |

**Rule 2: nothing empty is ever shown.** A group with no connected accounts does not render. All 40 connection affordances move to a single searchable "Add an account" screen, reached from one button. This is the single highest-impact change on the screen and it is mostly deletion.

**Rule 3: progressive disclosure by value.** Groups are collapsed by default showing only name, share of total, and value. Expanded, they list accounts sorted by value descending. **Any holding below 1% of net worth collapses into a single "Other (12)" row** at the bottom of its group.

**Rule 4: one chart, and it is not a donut.** A single horizontal stacked bar showing the six groups as proportions of gross assets. It is 8pt tall, full width, uses six values of `ink` from 100% down to 25% opacity rather than six hues, and is labelled by a legend row beneath it. Composition is a proportion question, and a stacked bar answers it in one eighth the vertical space of a donut with better labelling.

```
+-------------------------------------------+
|  Wealth                            [+]    |   title + Add an account
|                                           |
|  NET WORTH                                |   caption, ink-3
|  $342,880                                 |   display 44pt, ink, tnum
|  +$4,210   +1.24%      30 days      v     |   positive, signed, period
|                                           |
|   .·''·.__.·''·.__.·'                     |   sparkline, 1px, ink-2
|   ....................................    |   48pt tall, no fill
|                                           |
|  ########:::::::::----.....--  --------   |   composition bar, 8pt
|  Liquid  Invested  Crypto  Owned   Owed   |   caption legend
|                                           |
|                                           |   56pt
|  --------------------------------------   |
|  v  LIQUID                    $24,110     |   heading row, 44pt
|     18% of assets                         |   caption, ink-3
|  --------------------------------------   |
|     [BNK]  Chase Checking      $3,240     |   code chip + name + tnum
|     [BNK]  Ally Savings       $20,870     |
|     ------------------------------------  |
|     Emergency runway              4.2 mo  |   graded metric, positive
|  --------------------------------------   |
|  >  INVESTED                 $268,400     |   collapsed
|     71% of assets                         |
|  --------------------------------------   |
|  >  CRYPTO                    $41,220     |
|     11% of assets                         |
|  --------------------------------------   |
|  >  OWED                     -$28,900     |   ink, not red. minus sign.
|  --------------------------------------   |
|                                           |
|  Values as of 11 Aug, 6:04                |   caption, ink-3
|                                           |
+-------------------------------------------+
```

**Notes.**

- The net worth figure is `ink`. Never green. Never red.
- The delta is the only colored element and it always carries a sign.
- **"Owned" and "Speculative" are separate groups on purpose.** Lumping a Kalshi position in with a house is a category error that misrepresents the user's actual risk, and separating them costs nothing.
- Category codes replace 27 tinted icons. `[BNK]` is a 4px chip, CoinyMono, `ink-2`, 1px `rule` border, no fill.
- A staleness timestamp at the bottom, always. The PRD flags that net worth currently fans out live on every request and should move to cached sync, which makes "as of" mandatory rather than optional.

### 6.4 Activity

A cash-flow feed. Design Decision A in the product brief stands: cash movements only, no unrealized gains.

**The Stamp is the whole design idea here.** Most rows are plain type. The two or three events in a month that actually moved the pet carry a 20pt 1-bit creature face in the leading gutter. Its scarcity is what gives it meaning, and it is the only point in the app where the creature appears on a data surface.

```
+-------------------------------------------+
|  Activity                        [subs]   |
|                                           |
|  SAVINGS RATE                             |   caption
|  18%          spend $3,412  in $4,160     |   display + data
|  30-day average                           |   caption, ink-3
|                                           |
|                                           |   32pt
|  TODAY                                    |   heading, sticky
|  --------------------------------------   |
|     Whole Foods                   -$84.20 |   body + data, both ink
|     Groceries                             |   caption, ink-3
|  --------------------------------------   |
|     Spotify                       -$11.99 |
|     Subscription                          |
|  --------------------------------------   |
|                                           |
|  YESTERDAY                                |
|  --------------------------------------   |
| [c] Acme Corp                   +$2,140.00|   <- Stamp. rare.
|     Paycheck. $240 is spoken for.         |   pet line, Departure Mono
|  --------------------------------------   |
|     Shell                         -$52.10 |
|     Gas                                   |
|  --------------------------------------   |
```

**Notes.**

- **Amounts are `ink`, not red and green.** A grocery purchase is not an error. Direction is carried entirely by the sign and by the fact that debits vastly outnumber credits, so the rare `+` stands out on its own.
- The reaction line renders in Departure Mono directly beneath the merchant, so the pet's voice is typographically distinct from the app's voice even in a list.
- Date headers are sticky, `heading` size, `ink-3`.
- Category overrides move out of this list. They are a settings-shaped feature living in a feed, and the current inline placement is why the screen feels like a tools palette.

### 6.5 Onboarding

Currently four pages built around purple SF Symbols. The PRD calls for a full rewrite and deletes the name-entry page.

**The one structural change that matters: show the egg before asking for the bank.** The current flow asks for a bank connection before the user has met anything. Reverse it. The emotional hook comes first, then the ask, and the ask is framed as the thing that wakes the creature up.

```
   1. THE EGG              2. THE ASK             3. THE HATCH

+---------------+      +---------------+      +---------------+
|               |      |               |      |               |
|  +---------+  |      |  +---------+  |      |  +---------+  |
|  |         |  |      |  |         |  |      |  |         |  |
|  |  [egg]  |  |      |  |  [egg]  |  |      |  | [hatch] |  |
|  |         |  |      |  |  dark   |  |      |  |  anim   |  |
|  +---------+  |      |  +---------+  |      |  +---------+  |
|               |      |               |      |               |
| Something is  |      | It cannot see |      | *crack*       |
| in here.      |      | anything yet. |      |               |
|               |      |               |      | Oh. Hello.    |
|               |      | Connect an    |      |               |
|               |      | account and   |      | I can see     |
| Coiny watches |      | it wakes up.  |      | four accounts |
| your money    |      |               |      | and $342,880. |
| and reacts.   |      | Plaid holds   |      |               |
|               |      | the creds. We |      | Give me a     |
|               |      | never see     |      | minute.       |
|               |      | them.         |      |               |
|               |      |               |      |               |
| [  Continue ]|      | [ Connect   ] |      | [ Meet them ] |
|               |      | Not now       |      |               |
+---------------+      +---------------+      +---------------+
```

**Notes.**

- Three screens, not four. Name entry is deleted per the PRD; Sign In with Apple already supplies it when available and the app does not need it otherwise.
- The egg is the Window at Full size. There is no other artwork in onboarding.
- All copy is in the pet's voice, in Departure Mono, from screen one. The user meets the character before they meet the product.
- Screen 3 is the payoff and it must state a real number pulled from the connection that just succeeded. That is the magic moment, and it is only possible because the ask came second.
- "Not now" is plain text, `ink-2`, never styled as a button and never hidden. Skipping is a supported path.
- No page-dot carousel styling, no purple, no `.thinMaterial`.

### 6.6 Widget, Lock Screen, and Watch

Not a launch requirement, but it is the reason the sprite spec includes 48px and 24px 1-bit reductions, so it should be designed now rather than retrofitted.

- **Home Screen small widget:** the Panel Window at 64pt on `field`, with the rung name and percentage in `caption` beneath. No balance. The widget's job is the creature, not the number.
- **Lock Screen circular:** the 24px 1-bit Stamp inside the rung progress ring. Pure 1-bit is a requirement here, not an option.
- **Watch complication:** identical to Lock Screen circular.
- **Live Activity:** reserved for one case only, an in-progress goal contribution transfer. Not for ambient state.

---

## 7. Hiring the artist

### 7.1 Where to look, ranked for this specific job

| Channel | What you find | Cost to post | Verdict for Coiny |
|---|---|---|---|
| **[Cara](https://cara.app/)** | Artist-run platform founded explicitly as an anti-AI-scraping space. High concentration of working illustrators and character designers. | Free | **Start here.** The talent is strong and, critically, being present on Cara signals you understand why artists care about this. See §7.5. |
| **[r/gameDevClassifieds](https://www.reddit.com/r/gameDevClassifieds/)** | Working game artists, many pixel specialists, actively looking for contract work. | Free | **Best single source for sprite work.** Pixel art is a game-dev skill before it is an app skill, and this is where those people are. |
| **[r/HungryArtists](https://www.reddit.com/r/HungryArtists/)** | Broad freelance illustration, wide quality range. | Free | Good for volume of applicants. Requires more filtering. |
| **[Polycount](https://polycount.com/)** | Veteran game artists, more 3D-weighted but a real 2D presence. | Free | Higher average seniority, lower response rate. |
| **[ArtStation](https://www.artstation.com/jobs)** | Portfolio-first, game and film industry. Excellent for evaluating work, weaker for cold outreach. | Free to browse | **Best for sourcing by portfolio.** Find people whose work you want, then email them directly. |
| **itch.io and pixel art communities** | Indie game artists, often the strongest pure pixel artists. | Free | Deep specialist talent. Search game credits for pixel art you admire and contact the artist. |
| **[Dribbble](https://dribbble.com/hiring)** | Product and brand illustration, polished, app-oriented. | Paid job posts | Skews toward flat vector and away from sprite work. Weaker fit for Direction A. |
| **Behance / Adobe Talent** | Broad, agency-adjacent. | Free | Fine, high noise. |
| **[Working Not Working](https://workingnotworking.com/)** | Curated senior creative talent, advertising-adjacent. | Paid | Overqualified and overpriced for a single character. |
| **Upwork / Fiverr Pro** | Very wide range. Fiverr Pro is vetted. | Free | Usable but you are selecting on responsiveness rather than on taste. Last resort. |

**The highest-yield method is not a job post.** Play games with pixel art you admire, find the artist in the credits, look at their ArtStation or Cara, and send a direct email with a real brief and a real budget in the first message. Response rates on a specific, funded, respectful cold email from a founder are far better than on a public post, and you skip the entire filtering problem.

### 7.2 What to commission, in what order

Do not commission 24 base forms and 14 states as one contract. Stage it, so that the first payment buys you the information you need to decide whether to continue with this artist.

**Phase 1: Design exploration.** $400 to $900.
Three to five distinct character concepts as static 96 x 96 sprites in the Adult stage, each in idle. Plus one "worried" for the strongest concept, because that is the state that reveals whether the artist can do non-accusatory negative emotion. **Paid.** Non-exclusive at this stage: you are buying exploration, not rights.
*Decision gate: if none of the concepts is right, pay in full, thank them, and try a different artist. This is $700 to avoid a $5,000 mistake.*

**Phase 2: The Adult stage, complete.** $1,400 to $3,000.
The chosen concept, at stage 5 (Adult), with all 14 states, all frames, all reductions, plus the palette file. This is a fully shippable app: one stage, fully expressive. The Window works, the Stamp works, the widget works.
*Decision gate: build it into the app and live with it for two weeks before continuing.*

**Phase 3: The remaining 7 stages.** $2,000 to $4,500.
Stages 0 through 4 and 6 through 7, each with 3 progress variants, in idle plus the 6 most common states. Plus the 7 stage-transition sequences, which are the most animation-heavy items in the whole commission.

**Phase 4: App icon and marketing sheet.** $300 to $700.
The layered icon source for Icon Composer across all four iOS 26 variants, plus the all-stages reference sheet.

**Total for a complete character program: roughly $4,100 to $9,100.** Budget $6,000 and expect to land near it.

Note that this replaces the guidance in [`feature-backlog.md`](./feature-backlog.md), which currently recommends "AI-generated for v1, replace with custom pixel art once we have user data" at a $500 to $1,000 budget. That recommendation should be considered withdrawn. It underestimates the cost by roughly 6x, and the "replace it later" plan does not survive contact with reality: the placeholder becomes the product, and generative pixel art has exactly the off-grid, over-palette characteristics that make an app read as AI-made.

### 7.3 2026 rate ranges

Rates vary widely by region and seniority. These are working ranges for US and Western Europe based freelancers; Eastern Europe, Latin America, and Southeast Asia typically run 40% to 60% of these figures at comparable quality, and the pixel art talent pool in those regions is genuinely deep.

| Work | Junior | Mid | Senior |
|---|---|---|---|
| Character concept, single static design | $150 to $400 | $400 to $900 | $900 to $2,000 |
| Full mascot package (design, turnaround, style guide) | $800 to $2,000 | $2,000 to $5,000 | $5,000 to $10,000+ |
| Pixel sprite, single static, 64 x 64 | $15 to $30 | $30 to $60 | $60 to $120 |
| Pixel sprite, single static, 128 x 128 | $30 to $60 | $60 to $110 | $110 to $220 |
| Animation, per frame | $8 to $20 | $20 to $45 | $45 to $90 |
| Complete animated sprite set, one character | $600 to $1,500 | $1,500 to $4,000 | $4,000 to $9,000 |
| Hourly | $25 to $45 | $45 to $85 | $85 to $150 |

The [Graphic Artists Guild Handbook: Pricing and Ethical Guidelines](https://graphicartistsguild.org/handbook-pricing-ethical-guidelines/) is the standard published reference for US illustration rates and is worth the purchase price before negotiating, mainly so you can recognize when a quote is unreasonably *low*, which is a warning sign about experience or about the artist's understanding of scope.

**A note on cheap quotes.** A $200 quote for the full Phase 2 package means the artist has not understood the brief, and you will spend the difference in revision rounds and eventually in re-commissioning. Pay the middle of the range.

### 7.4 Evaluating a portfolio

Most illustration portfolios are static hero images, which tell you almost nothing about whether someone can produce this commission. Look for:

**Positive signals**
- **The same character drawn in multiple emotional states.** This is the single strongest signal and it is surprisingly rare. Anyone can draw a cool character once. Drawing it worried, then asleep, then celebrating, and having it remain recognizably the same creature, is the actual skill being purchased.
- **Actual sprite sheets in the portfolio, not just finished GIFs.** Someone who shows sheets thinks in production terms.
- **Animation that reads at small size.** Ask to see it at 100% rather than at 4x.
- **Restrained palettes.** Look for work under 16 colors. Palette discipline is the clearest marker of a real pixel artist versus an illustrator who applied a filter.
- **Shipped game credits.** Someone who shipped a game has delivered on a schedule with a spec.

**Warning signals**
- Only 4x or 8x upscaled presentation, never native resolution. This hides off-grid pixels.
- Anti-aliased edges or soft shadows in work described as pixel art.
- A portfolio of single hero pieces with no sequences.
- Every character has the same face.
- No process shots, no work-in-progress, no roughs.

**The paid test.** Phase 1 above *is* the test, and it is paid. Unpaid art tests are widely and rightly regarded as exploitative, and asking for one will cost you the best candidates immediately. Paying $400 to $900 for real exploration from two artists in parallel is a completely normal thing to do and is cheaper than being wrong.

### 7.5 The AI question, and how to not get it wrong

This matters more than a founder using Claude Code might expect. A substantial share of working illustrators in 2026 will not take a commission connected to generative AI, and [Cara](https://cara.app/) exists specifically as a platform built in response to AI training on artists' work without consent. Many artists now include AI clauses in their own contracts.

Do this:

1. **Say it unprompted, in the first email.** "The character will be drawn by you. No AI-generated art will be used in this product, and your work will not be used to train any model." Putting it in the first message rather than waiting to be asked changes the entire tone of the conversation.
2. **Put it in the contract as a mutual clause.** You warrant you will not use their work as training data or generate derivatives from it. They warrant the delivered work is original and not AI-generated. Both directions.
3. **Do not use AI-generated concepts as reference in the brief.** If you generate mood images to think with, do not send them. Send real references: Tamagotchi sprites, Playdate art, Game Boy sprites, other artists' work with credit.
4. **Be straightforward that the app itself is built with AI coding tools.** It is true, it is not the same thing as generating the art, and being upfront about the distinction is better than having it come up later.

None of this is performance. The reason to commission a human is that generative pixel art is visibly, structurally wrong at the level of the pixel grid, and the whole thesis of this design direction is that the difference is legible to users. Acting consistently with that belief is just coherence.

### 7.6 Contract terms

**Do not write "work made for hire" and assume it works.** Under US copyright law, a work by an independent contractor only qualifies as work made for hire if it falls into one of nine enumerated statutory categories and there is a signed agreement saying so ([17 U.S.C. § 101](https://www.law.cornell.edu/uscode/text/17/101), and the Copyright Office's [Circular 9](https://www.copyright.gov/circs/circ09.pdf)). A character sprite sheet for a mobile app does not clearly fall into any of them. A contract relying on work-for-hire language alone can leave copyright with the artist.

**Use a present-tense assignment clause instead**, and belt-and-braces it:

> "Contractor hereby irrevocably assigns to Client all right, title, and interest in and to the Deliverables, including all copyrights, worldwide, in perpetuity. To the extent any Deliverable qualifies as a work made for hire, it shall be so treated; to the extent it does not, this assignment applies."

Other terms worth getting right:

| Term | What to specify |
|---|---|
| **Deliverables** | Enumerate the file formats from §5.5 explicitly, and state that layered Aseprite source files are a deliverable. This is the most commonly omitted item and the most expensive to be missing later. |
| **Revisions** | Two rounds included per phase, defined as consolidated feedback delivered at once. Additional rounds at the hourly rate. Two is the norm; unlimited revisions is bad for both sides. |
| **Payment** | 50% on signature, 50% on delivery for small phases. 30/40/30 across concept, first delivery, and final for Phase 3. Never 100% on completion; no experienced freelancer will accept it, and offering it marks you as inexperienced. |
| **Kill fee** | If you cancel mid-phase, the artist keeps the deposit and delivers work completed to that point. Standard and fair. |
| **Portfolio rights** | Grant them. The artist may display the work in their portfolio and credit themselves. It costs nothing and it is the difference between a transaction and a working relationship. |
| **Credit** | Name them in the app's About screen and in the App Store description. Free, and it matters. |
| **Moral rights** | US law does not recognize moral rights for most visual work in this context, but many artists are outside the US where they exist and are often inalienable. Ask for a waiver where waivable, and do not be alarmed if they decline: it mainly means you should not mutilate the work and credit them, which you were going to do anyway. |
| **Originality warranty** | They warrant the work is original, not AI-generated, and not infringing. |
| **Timeline** | Per phase, with a stated response time for your feedback. Founder feedback latency is the most common cause of freelance schedule slip, and naming it makes it your problem to manage. |

For a commission at this size, a two-page agreement is appropriate. A 14-page master services agreement will cost you candidates.

---

## 8. What Antoine builds versus what he buys

### Buy

| Item | Why | Cost |
|---|---|---|
| **The creature: design, 8 stages, 14 states, all sprite sheets** | This is the product. It is a genuine specialist skill with a decade-long learning curve, and it is the one thing where the gap between competent and excellent is visible to every user in the first three seconds. | $4,100 to $9,100, staged |
| **The app icon** | Same artist, same commission, must come from the character. Not a separate hire. | Included in Phase 4 above |
| **Sound design, later** | Out of scope for this document, but the same logic applies: buy it, from someone who does it. Not a launch requirement. | Defer |

### Build

| Item | Why |
|---|---|
| **The entire type system** | Three free typefaces and a specified scale. This is a configuration task, not a design task, once §4.1 exists. |
| **The entire color system** | Fully specified in §4.2 with verified contrast ratios. It is an asset catalog and a Swift token file. |
| **Every screen layout** | §6 is a buildable spec. The layouts are type, hairline rules, and whitespace. That is exactly the kind of design a technical founder can execute correctly from a written specification, and exactly the kind that gets worse when handed to a generalist UI designer who will add cards, shadows, and a second accent color. |
| **The custom Iosevka build** | Two hours with the Customizer and a Node toolchain. Produces a typeface nobody else has, for $0. |
| **The sprite renderer** | A `SpriteView` that reads the Aseprite JSON atlas and swaps `UIImage` frames on a timer, with nearest-neighbor sampling and integer scaling only. This is a day of work and it is worth writing before commissioning Phase 2, so the pipeline is proven with placeholder art. |
| **Widgets, Live Activities, Watch** | Standard WidgetKit. The art is already delivered. |
| **The placeholder creature** | Antoine draws an 8-frame crude creature in Aseprite himself, today, to unblock everything. Aseprite is $20. A crude hand-drawn creature is not embarrassing; a stock SF Symbol is. |

### Explicitly do not buy

- **A UI designer for the app.** The app's interface is a type and spacing system, and hiring a generalist to "make it look nice" is how it acquires a second accent color, a card system, and a purple gradient. If any external design help is bought later, buy an hour of critique, not execution.
- **A brand identity package.** Coiny's identity is the creature, the Window, and the amber. A logo suite, brand book, and stationery system is $5,000 for artifacts nobody will see.
- **AI-generated sprites as a stopgap.** They will ship. Everything ships. And they carry exactly the visual signature this document exists to avoid.

---

## 9. The first five things to do

1. **Delete the purple.** `OnboardingView.swift:62` and `:290`. Fifteen minutes, and it removes the single most damaging visual tell in the app.
2. **Create the asset catalog** with the §4.2 tokens for light and dark, and set the accent to `signal`. Half a day, and every subsequent change gets easier.
3. **Fix the money colors.** Absolute values to `ink`, deltas to the moss and clay pair with explicit signs, `.green` and `.red` banned. Touches six files, mostly deletion, and it is the change that most moves the app from "toy" to "trustworthy."
4. **Collapse Wealth to six groups and stop rendering empty ones.** This is the largest single improvement available and it is mostly deletion.
5. **Send three cold emails on Cara and r/gameDevClassifieds** with the §5 brief and a stated Phase 1 budget. Everything else in this document can proceed in parallel, but the creature has a lead time and nothing else does.

---

## Appendix: sources

**Apple platform**
- [HIG: Materials](https://developer.apple.com/design/human-interface-guidelines/materials)
- [HIG: Adopting Liquid Glass](https://developer.apple.com/design/human-interface-guidelines/adopting-liquid-glass)
- [HIG: App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [HIG: Typography](https://developer.apple.com/design/human-interface-guidelines/typography)
- [HIG: Color](https://developer.apple.com/design/human-interface-guidelines/color)
- [Apple Fonts and license terms](https://developer.apple.com/fonts/)
- [Icon Composer](https://developer.apple.com/icon-composer/)

**Typography**
- [Instrument Sans on Google Fonts](https://fonts.google.com/specimen/Instrument+Sans) and [source repo](https://github.com/Instrument/instrument-sans) (OFL 1.1, `tnum` confirmed)
- [Departure Mono](https://departuremono.com/) and [source repo](https://github.com/rektdeckard/departure-mono) (MIT)
- [Iosevka](https://github.com/be5invis/Iosevka), [LICENSE.md](https://github.com/be5invis/Iosevka/blob/main/LICENSE.md), [Customizer](https://typeof.net/Iosevka/customizer)
- [Basis Grotesque, Colophon Foundry via MyFonts](https://www.myfonts.com/collections/basis-grotesque-font-colophon-foundry/)
- [Favorit, ABC Dinamo](https://abcdinamo.com/typefaces/favorit) and [Dinamo pricing model](https://abcdinamo.com/news/about-our-pricing)
- [Söhne, Klim Type Foundry](https://klim.co.nz/fonts/soehne/) (avoid: the ChatGPT face)
- [Pimp My Type on Inter](https://pimpmytype.com/inter-v4/)

**Visual lineage**
- [Tamagotchi official](https://tamagotchi.com/)
- [Pan Docs, Game Boy hardware reference](https://gbdev.io/pandocs/)
- [Playdate, Panic](https://play.date/)
- [Sharp Memory LCD module documentation, Adafruit](https://www.adafruit.com/product/1393)
- [Neko Atsume](https://www.nekoatsume.com/en/)
- [Finch](https://finchcare.com/)
- [Duolingo Design](https://design.duolingo.com/)
- [Monument Valley](https://www.monumentvalleygame.com/)

**Production tooling**
- [Aseprite](https://www.aseprite.org/) and [CLI and export documentation](https://www.aseprite.org/docs/cli/)
- [Rive](https://rive.app/) and [Lottie](https://airbnb.io/lottie/) (both rejected for pixel work, listed for completeness)

**Accessibility**
- [W3C: Understanding Contrast (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
- [APCA contrast, the perceptual model behind WCAG 3 drafts](https://git.apcacontrast.com/)

**Hiring, contracts, and ethics**
- [Cara](https://cara.app/)
- [r/gameDevClassifieds](https://www.reddit.com/r/gameDevClassifieds/), [r/HungryArtists](https://www.reddit.com/r/HungryArtists/)
- [ArtStation Jobs](https://www.artstation.com/jobs), [Polycount](https://polycount.com/), [Dribbble Hiring](https://dribbble.com/hiring), [Working Not Working](https://workingnotworking.com/)
- [Graphic Artists Guild Handbook: Pricing and Ethical Guidelines](https://graphicartistsguild.org/handbook-pricing-ethical-guidelines/)
- [17 U.S.C. § 101, definitions including work made for hire](https://www.law.cornell.edu/uscode/text/17/101)
- [US Copyright Office Circular 9: Works Made for Hire](https://www.copyright.gov/circs/circ09.pdf)

**Gamification risk**
- [SEC request for comment on digital engagement practices, 2021](https://www.sec.gov/news/press-release/2021-167)
- [Massachusetts Securities Division](https://www.sec.state.ma.us/divisions/securities/) (Robinhood gamification settlement, January 2024)

**Internal**
- [`prd-app-v2.md`](./prd-app-v2.md), especially §1.8 voice, §3.3 the Foundation Ladder, §3.8 information architecture, §5.2 the three-variable state model, §5.3 evolution
- [`product-brief.md`](./product-brief.md), Design Decision A
- [`feature-backlog.md`](./feature-backlog.md) §F1 and the asset pipeline table, superseded by §7 above
- [`handoff.md`](./handoff.md), current build state and toolchain
