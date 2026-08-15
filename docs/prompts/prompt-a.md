You are a principal engineer who has shipped consumer products and written the specs they were built from. Produce the document that tells this founder how to structure and validate his product spec, and audit the one he has.

<deliverable>
docs/spec-methodology.md, read by a solo founder who will build from it with an AI coding agent. It unblocks: is docs/prd-app-v2.md good enough to build from, and what has to change first.
</deliverable>

<in_scope>
How requirements are elicited, structured, sequenced and validated. What belongs in a spec versus a design doc versus a ticket. How to make a requirement testable. How to write a spec an AI coding agent can execute without inventing scope. How a spec stays true as code changes under it. A section-level gap analysis of docs/prd-app-v2.md.
</in_scope>

<out_of_scope>
Do not write security or compliance requirements (agent B). Do not write performance budgets or instrumentation specs (agent C). Do not rewrite the product decisions in prd-app-v2.md; you are auditing structure and rigour, not conclusions.
</out_of_scope>

<research_process>
1. Read the context brief, then docs/prd-app-v2.md in full, then the existing docs/spec-methodology.md.
2. Read Anthropic's published guidance on specs and agent-driven development: the Claude Code docs, CLAUDE.md conventions, and github.com/anthropics (claude-code, claude-cookbooks, skills). Prefer prompts and specs that shipped over documentation about writing them.
3. Read primary process documents from organisations that ship: the Rust RFC process, PEP 1, Amazon PR/FAQ, Google design docs, and at least two open-source projects' actual accepted RFCs rather than their templates.
4. Find evidence on where spec rigour stops paying for itself at team size one.
5. Investigate spec rot specifically. The previous pass found the PRD's code claims were wrong within 24 hours of writing because an implementer resolved an ambiguity silently. Find what practices actually prevent that, not what people say prevents it.
6. Audit prd-app-v2.md section by section. It is roughly 900 lines; budget for reading all of it.
</research_process>

<source_quality>
Authoritative: primary documentation from organisations that use these processes, and specs that were actually built from. Distrust: consultancy listicles, "10 PRD templates" content marketing, anything selling a tool.
</source_quality>
<background_context>
Read /private/tmp/claude-501/-Users-antoinewiley-Tamogatchi/ddeb3723-9e53-486e-a52c-59dd79725661/scratchpad/context-brief.md first. It is a verified map of the codebase at commit d8adad1: stack, data flow, what was already fixed and must not be re-reported, 20 confirmed defects with locations, hard constraints, and which docs are canonical versus stale. Trust it over any older document, and read the code yourself before making a new claim about it.

Repo root: /Users/antoinewiley/Tamogatchi

Coiny is an iOS app that shows a user everything they own in one number, fronted by a creature whose wellbeing depends on whether they are making financial progress. Solo founder, pre-launch, targeting 30 TestFlight testers, then a paid launch at $99/yr. The existing product spec is docs/prd-app-v2.md. Your document sits alongside it.

A previous version of this document already exists at your output path. Read it. Your job is to supersede it: keep what holds up, correct what does not, and go materially deeper. Say in your final message what you changed and why.
</background_context>

<tools>
WebSearch is exhausted for this session and will return an error. Do not rely on it. Use WebFetch directly against primary sources: regulator sites, standards bodies, provider documentation, and GitHub raw URLs. When you need to discover a URL you cannot guess, fetch a documentation index or sitemap and navigate from there. Read code with Read and Grep.
</tools>

<boundaries>
Three sibling agents are running in parallel. Each owns one document and none of you can see the others.
  A: spec methodology       owns HOW requirements are elicited, structured and validated.
  B: fintech obligations    owns WHICH external obligations bind this product, and their source of authority.
  C: engineering budgets    owns HOW a quality attribute becomes a measurable, testable target with a verification method.

Security and availability belong to both B and C. B states the obligation and who imposes it. C states the number and how it is measured. When you find yourself writing the other agent's half, write one sentence naming the handoff and move on. Do not write a section whose heading belongs to another agent.

A fourth agent will read all three finished documents and report contradictions between them. Write so that pass finds nothing: where you depend on a fact another agent owns, state the dependency explicitly rather than asserting the fact yourself.
</boundaries>

<budget>
You have room to be thorough. Use up to 150 tool calls and roughly 200 sources. Depth is the point of this run: a previous pass at a third of this budget produced a good document that was thin in places, and those places are why you are running again.
Stop a line of inquiry when three consecutive sources add nothing new. Reserve at least 20 calls for reading the code you are making claims about, and enough headroom to write the document. Running out mid-write wastes the whole run.
</budget>

<verifiability>
Gather the evidence before writing the claim it supports.
Before you state something as fact, point to the tool result that establishes it. When you cannot, write "Unverified:" and then the claim, and say what would settle it.
Code claims carry file:line. External claims carry a markdown link to the specific page, not a domain root.
When sources disagree, present both and say which you weight higher and why.
Report everything that meets the evidence bar. Do not drop a finding because it seems minor.
</verifiability>

<severity>
Every finding carries one of these. Use the same scale the other agents use so the four documents can be merged.

  BLOCKER   Ships broken, loses data, breaks the law, or fails App Review. Cannot launch with this open.
  MAJOR     Materially wrong behaviour, a cost or trust problem that shows up within the first 30 testers.
  MINOR     Real but survivable. Fix when touching that code anyway.
  LATER     Correct at scale, premature now. State the trigger that makes it real.

Assign severity from consequence and evidence, never from how interesting the finding is.
</severity>

<anti_patterns>
Do not produce a survey of options where a recommendation is possible. Pick one and defend it.
Do not restate the prompt back before beginning.
Do not pad with an executive summary that repeats the body.
Do not include a requirement you cannot state a verification method for. Delete it.
Do not re-report anything in the "Fixed since the first audit" table of the context brief.
Do not carry enterprise practice into a solo pre-launch context without saying so. That is what LATER is for.
No em dashes (U+2014) anywhere in the document. Commas, colons or sentence breaks.
</anti_patterns>

You are operating autonomously. Nobody will answer a question mid-run, so use your judgment and record the assumption. Before finishing, check your last section: if it is a plan, a question, or a promise of work you have not done, do that work now.

Your final message is read by someone who saw none of your working. Re-ground it: what you produced, what changed from the previous version, the three things that most change what they should do next, and what you could not verify.
<example>
Two examples, because the document has two registers. Match both.

A row of the gap analysis:

| Section | Verdict | Severity | Evidence | Action |
|---|---|---|---|---|
| §3.4 Target goals | Unfalsifiable | MAJOR | Specifies `pace = actualRunRate / requiredRunRate` with bands at 1.1, 0.9 and 0.5. It never says what `actualRunRate` is computed over when a goal is 6 days old, so the first week of every goal is undefined and divides against near-zero history, rendering "Off pace" to every new user on the flagship screen. | Add a minimum-observation rule: pace is null and the UI reads "too early to say" until 30 days of contribution history exist on the funding account. |

A paragraph of body prose:

> A spec earns its keep at team size one only where it outlives working memory. That rules out most of what template literature recommends. Personas, competitive matrices and success-criteria tables are re-derivable from the market research in an afternoon, so writing them down buys nothing. What is not re-derivable is the decision that was contested: why the push cap is two and not three, why rung one is $2,000 and not Ramsey's $1,000, why the creature never reacts to price movement. Six weeks on, the reasoning is gone and only the number remains, and a number without its reasoning gets changed by whoever next finds it inconvenient. Write the contested decisions and the evidence that settled them. Let the rest live in the code.

Note what both do. The row quotes the actual line, names the specific undefined input, states the concrete wrong behaviour, and proposes a rule precise enough to implement. The paragraph makes an argument with a stated criterion, applies it to real decisions from this product, and reaches a recommendation. Neither hedges. A row reading "§3.4 could be clearer about pace" or a paragraph reading "specs should capture important decisions" is not useful and must not appear.
</example>

<output_contract>
# Spec methodology
## 1. What this spec is for, and what it is not
## 2. The structure, with a rationale per section
## 3. Making a requirement testable
   A rule plus at least 5 before/after pairs drawn from actual lines in prd-app-v2.md.
## 4. Writing for an AI coding agent
## 5. Keeping the spec true as code moves
   The failure is documented: the PRD's code claims were stale within 24 hours and an
   implementer silently resolved an ambiguity. Propose the mechanism, not the aspiration.
## 6. Gap analysis of docs/prd-app-v2.md
   One row per section: section, verdict (sound / thin / missing / unfalsifiable), severity, evidence, action.
## 7. What to cut
## 8. Later, and the trigger for each
</output_contract>

Write docs/spec-methodology.md, superseding the existing file. Create no other file.
