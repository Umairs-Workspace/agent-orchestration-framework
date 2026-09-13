---
type: chore
number: 76
slug: reviewer-edit-grant
title: "The single writer needs a surgical pen — Edit for QA and the product owner"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-08-17
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 76 · The single writer needs a surgical pen — Edit for QA and the product owner

## Intent

**Two agents are instructed to make row-by-row edits to growing documents, and neither has `Edit`.**

| Agent | `tools:` | `Edit`? |
|---|---|---|
| `aof-architect` | `Read, Grep, Glob, Bash, Write, Edit` | ✅ |
| `aof-developer` | `Read, Grep, Glob, Bash, Edit, Write` | ✅ |
| `aof-security` | `Read, Grep, Glob, Bash, WebSearch, WebFetch, Write, Edit` | ✅ |
| **`aof-qa`** | `Read, Grep, Glob, Bash, Write` | ❌ |
| **`aof-product-owner`** | `Read, Grep, Glob, Write, AskUserQuestion` | ❌ |

`aof-qa.md:31` orders *"Author features with `Write`/`Edit` — NEVER a script you wrote to edit
them"* and names the consequence itself: *"the turn count (and token cost) rises several-fold for
the same deliverable."* QA has no `Edit`. To change three rows of a 25,451-byte `.feature` it must
re-emit the whole file — or do the forbidden thing, which is what the telemetry shows it doing: one
"Apply ADR-012 deltas" run wrote `scratchpad/apply.mjs`, `align.mjs`, `final.mjs`, `edits.txt` and
re-ran a node script five times, for 74.6k output tokens. Thirteen such runs are **661.6k tokens —
41.8% of milestone 52**, the largest single line item in the measured corpus
([RESEARCH-agent-loop-economics.md §2.2](../../planning/RESEARCH-agent-loop-economics.md)).

**Story 73 (`item-status-lifecycle`, accepted 2026-08-16) makes this worse before it makes it better.** It correctly
tightens single-writer discipline — `aof-qa.md` now reads *"Findings you REPORT into the PO's
register … you report findings unnumbered … you do not author the register"*, and the shipped
`VERIFICATION.md` template makes `## Findings` a seven-column register the product owner owns. That
is the right rule. But it moves a row-by-row append from an agent with no `Edit` to **another agent
with no `Edit`**. A register that grows one row per finding, written only with `Write`, is a
whole-file re-emit per finding — and `VERIFICATION.md` runs to 43–73 KB in real milestones.

Same for `ARCHITECTURE.md`, which the write-side telemetry shows rewritten **150 times** in milestone
66 while sitting at exactly its 700-line budget.

The grant is one word per file. It does not weaken the single-writer rule — that rule is about *who*
writes the register, not *how many bytes* they rewrite to do it.

## Definition of Done

- [x] `src/bundle/agents/aof-qa.md` frontmatter grants `Edit`
- [x] `src/bundle/agents/aof-product-owner.md` frontmatter grants `Edit`
- [x] `aof-qa.md:31`'s rule reads as written now that it is satisfiable — the "never a script"
      instruction stays; what changes is that the surgical path it points at exists
- [x] The audit that would have caught this is recorded as a rule for milestone **77**
      (`agent-capability-gap`: an agent instructed to use a verb its `tools:` does not grant), not
      re-derived by hand next time
- [x] `aof-designer` and `aof-compliance` reviewed and **explicitly decided**, not swept in: both
      lack `Edit`, and both are read-only judges by design. Record the decision either way
- [x] `bundle-model-map.test.mjs` and the agent-frontmatter tests updated if they assert tool lists
- [x] `src/bundle/manifest.json` regenerated; `acd-bundle-manifest-hashes` and
      `acd-bundle-membership` green
- [x] `.claude/` and `.codex/` renders refreshed (`aof work update`)
- [x] `aof work validate 76` is green

## Notes

**Why a chore.** Two frontmatter words. No new behaviour, no control, no contract to author.

**Why not left inside milestone 72.** Milestone 72 (`inner-loop`) lists *"`aof-qa` gets `Edit`"* in
its scope, and 72 is `not-started` and unrefined — it will not be built for some time. The
lifecycle change set is landing **now** and makes the PO the register's sole writer now. Doing the
grant on 72's timescale means shipping a known token regression and waiting. 72's scope line should
be amended to cite this chore rather than restate the work.

**The counter-argument, recorded so it is decided rather than assumed.** Withholding `Edit` is a
plausible way to keep a role from making surgical changes to code it should not touch. It does not
work here: neither agent's guard is its tool list — QA's is *"you do NOT edit production code (don't
grade your own homework)"* and the PO's is that it writes records, not code — and `aof-architect`
carries both `Edit` and the same *"You REVIEW code; you do NOT implement features"* rule. The
restraint is in the prompt in every other case. If the tool list is meant to be a second guard, it
should be argued for explicitly, because today it only guards the *cost*, and it guards it upward.

**Prompted by** the research arc of 2026-08-16 and reinforced by reviewing story 73 the same day.

## Decisions taken at execution (2026-08-17)

**`aof-designer` — GRANTED.** The chore's premise ("read-only judge by design") holds for its
*conformance* lane but not its *authoring* lane. `aof-designer.md:34` instructs it to
"Write/**update** `DESIGN.md`", and DESIGN.md is measured at **90–176 KB** in five recent milestones
(m45 90 KB, m46 106 KB, m47 176 KB, m49 107 KB, m50 70 KB) — every revision a whole-file re-emit,
the same defect this chore names, at file sizes larger than the register that prompted it. Its
structural guard is untouched: `aof-designer.md:20` cites the absence of **`Bash`** — *"your `tools`
list has no `Bash`; you are structurally read-only"* — and `Bash` is what keeps the browser out of
its hands (ADR-001). `Edit` guards nothing there.

**`aof-compliance` — DECLINED, for now.** The same argument applies in principle and its prompt
guard is likewise the prose ("never edits implementation or tests"), but there is **zero measured
cost**: no `COMPLIANCE.md` exists anywhere in the 79-item corpus, so the agent has never authored
the growing document a grant would serve. Recorded as a decision, not an oversight — revisit at the
first regulated-data milestone that spawns it.

**72's scope line needed no amendment** — `72/SPEC.md:95` already cites this chore by number under
*Out of scope*, rather than restating the work.

**No test asserted these tool lists**, so none needed updating. The only tool-list assertions in the
suite are fixtures (`adapters.test.mjs:59`, `adapter-warnings.test.mjs:146`) and the codex-render
negative (`work-init.test.mjs:464`, which asserts codex frontmatter omits Claude tool allow-lists —
still true; the codex renders carry no `tools:` line).

## Accept decision

**ACCEPTED 2026-08-17** on the chore criterion (ADR-003): ticked checklist + green validate. No
scenario suite was run and none exists — a chore carries no behavioural contract.

- **Checklist** — all 9 `## Definition of Done` boxes ticked, none left `- [ ]`. Each claim confirmed
  at the source rather than taken on the tick: `tools:` grants `Edit` in
  `src/bundle/agents/aof-qa.md`, `aof-product-owner.md` and `aof-designer.md` (and in the matching
  `.claude/agents/` renders); `aof-compliance.md` correctly still omits it, per the recorded decline;
  `aof-qa.md:30`'s "NEVER a script you wrote to edit them" rule is intact; the
  `agent-capability-gap` rule is recorded at `77/SPEC.md:68`.
- **Validate** — `aof work validate 76` → `PASS — 76 is well-formed.`
- **Manifest gates** — `acd-bundle-manifest-hashes` + `acd-bundle-membership` run by test-array
  import (never `node --test`, which false-passes these files): **6 pass, 0 fail**.
- **Doctor** — `aof work doctor 76` reports no finding against this chore at either severity; the
  single `numbering-gap` warn is stream-wide and pre-existing.

## Feedback (for retro)

- **The manifest gate was already red on this branch.** Regenerating `src/bundle/manifest.json`
  corrected **9 `.aof/loops/*.md` hashes** that had nothing to do with this chore —
  `acd-bundle-manifest-hashes` fails on the first mismatch, so it was failing on
  `.aof/loops/autonomous-cascade.md` before this chore started. `aof work update` likewise repaired
  drifted `.claude/commands/aof/autonomous.md` and `.codex/skills/aof-autonomous/SKILL.md`. This is
  the m07 near-miss (*enforce a derived artifact's freshness as a boundary, not a developer habit*)
  recurring: the regenerate step is still a habit.
- **`node --test` reports a FALSE PASS on this repo's tests.** They export named arrays of
  `{name, run}` (`archTests`, `bundleModelMapTests`, …), not `node:test` registrations — so
  `node --test test/arch/acd-bundle-manifest-hashes.test.mjs` runs **zero** assertions and prints
  `# pass 1`. It reported green over a manifest that was genuinely stale. Only a runner that imports
  the arrays gives a real verdict. A trap for any agent verifying a focused surface.
- **Pre-existing failure, flagged not fixed:** `work-init.test.mjs:476` asserts the codex `aof-refine`
  skill contains ``Use this skill when the user asks for `$aof-refine <item ref - NN or slug>
  [--autonomous]` `` — that string is no longer in `src/bundle/commands/refine.md` (unmodified by this
  chore). The assertion is stale against the shipped source. Out of scope here; needs its own item.
