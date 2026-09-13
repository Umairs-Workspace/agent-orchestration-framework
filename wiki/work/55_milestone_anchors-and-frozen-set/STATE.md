---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.

  COMPACTED 2026-08-27 at the milestone accept. The in-flight narrative — six story build notes, the
  two gate refusals, the nine control-edit instances, the two verify-time incidents and the running
  finding commentary — is archived, because every part of it that carries forward has graduated:
  · the LESSONS      → `RETROSPECTIVE.md` R1–R9, and thence to memory (`aof work memory ingest`)
  · the FINDINGS     → `VERIFICATION.md` `## Findings` (F-55-00-1 … F-55-M-8), the live register
  · the EVIDENCE     → `VERIFICATION.md` `## Verification evidence` + `## Fitness functions`
  · the DECISIONS    → `ARCHITECTURE.md` ADR-001…ADR-007, cited by the notes that recorded them
  · the DELIVERED    → `OUTCOME.md`, authored at this accept
  What remains below is the roll-up, the closure record, and the follow-ups that outlive the item.
-->
# 55 · Anchors & the frozen set — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. The source of truth for each story's status
     is its own STORY.md frontmatter; this is the at-a-glance roll-up. -->

| story | status | owns |
|---|---|---|
| 00 · The anchor taxonomy | done | `src/work-loops.mjs`, new bundle records |
| 01 · The groundedness report | done | `src/work-loops-checks.mjs`, the `loops-*` faces |
| 02 · Provenance at write time | done | the stamper + its write sites |
| 03 · Raw capture before classification | done | the capture path |
| 04 · The frozen set, compiled | done | `src/claude-settings.mjs`, the hook asset |
| 05 · L3 unlocked | done | `src/work-loop.mjs`, `commands/loop.mjs`, loop-ready |

**Milestone ACCEPTED 2026-08-27.** Shattered 2026-08-13 from `PRD-acd-loop-engineering.md` +
`PRD-graph-engineering.md`; refined 2026-08-26 (`aof:refine 55 --autonomous --solo`) into 6 stories,
22 task contracts, 125 scenarios, 7 ADRs and 8 declared fitness functions; built 2026-08-26/27; gated
three times (two declines, then the operator's re-verify).

## Closure record

- **All eight declared controls resolve, are registered, are green, and carry a red probe** performed
  against a real source edit restored byte-exactly. FF-5501…FF-5508; no entry ever left `pending` at
  accept. → `VERIFICATION.md` `## Fitness functions`
- **Milestone 55's own lane: 66/66.** Six behavioural suites plus all eight controls, run together at
  the re-verify. → `VERIFICATION.md` `#### The operator's re-verify`
- **`aof work validate 55` PASS; `aof work doctor 55` zero errors.** The residual warns are three
  argued classes, none of them a finding: `numbering-gap` (stream-level), the
  `control-runner-unchecked` / `rubric-join-unchecked` pair (both report a missing *configuration*),
  and the pre-existing `78 → 79` depends edge (`79` is a story; `git diff main...HEAD` over both is
  empty).
- **The full lane's count is not cited as a verdict, deliberately.** The five previously attributable
  failures are confirmed gone by set-difference; three of the remainder trace by digest and line count
  to a concurrent session writing this tree mid-run. → `F-55-M-6`, `F-55-M-7`
- **Fourteen findings; no blocker open.** Ten closed, four deferred to backlog — `F-55-00-1`,
  `F-55-02-2`, `F-55-M-6`, `F-55-M-7`. → `VERIFICATION.md` `## Findings`

## Carried forward

<!-- What outlives this item. Everything else is in the four documents named in the header comment. -->

- **To milestone 59 (the instrument audit)** — `F-55-M-6` and `F-55-M-7` are one subject seen twice:
  the milestone gate's lane is reproducible neither in its result (±1 intermittent, a different test
  each run) nor in its subject (no exclusive hold on the tree it measures). The repair is a gate that
  measures a fixed revision.
- **To whoever next touches `arch/69 FF-6908`** — `F-55-02-2`: its byte-freeze over
  `src/run-store.mjs` was re-aimed to a `buildRecord` key-list assertion in a diff, and the
  declaration it answers to still reads as the byte-freeze it no longer is. The repair is a
  ratification, not a code change.
- **To whoever next touches `acd-registry-single-home`** — `F-55-00-1`: 53's FF-5312 tracked-ness leg
  was replaced by a weaker `git check-ignore` per-file leg. The honest repair accepts *tracked or
  staged-and-not-ignored* rather than dropping tracking.
- **To 57 / 58** — this repository scores **50% (5/10)** Loop-Ready with `grounding`,
  `anchor-grounding`, `pairing`, `reference-ownership` and `actuator-arbitration` blocking, and four
  self-referential components standing. L3 is open in the ladder and closed here until both halves of
  its gate clear.
- **To `aof work update` in this repo** — the compiled `test-isolation` hook ships in the bundle and
  this tree still executes the pre-55 hand-wired one, which over-blocks commands that merely mention
  the suite path. Observed again at this very gate. → `OUTCOME.md` `## Gaps`

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — 55's own lane 66/66, all eight controls included
- [x] Fitness functions green — FF-5501…FF-5508, each with a recorded red probe
- [x] `@manual` signed off — no `@manual` and no `@uat` lane exists in this milestone; every task
      contract is `@executable`, so no agent-run procedure and no human sign-off was owed
