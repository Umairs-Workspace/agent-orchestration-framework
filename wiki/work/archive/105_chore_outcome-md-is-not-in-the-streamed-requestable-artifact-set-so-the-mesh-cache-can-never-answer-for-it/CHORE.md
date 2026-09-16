---
type: chore
number: 105
slug: outcome-md-is-not-in-the-streamed-requestable-artifact-set-so-the-mesh-cache-can-never-answer-for-it
title: "Outcome Md Is Not In The Streamed Requestable Artifact Set So The Mesh Cache Can Never Answer For It"
status: done
owner: <role>
created: 2026-09-04
updated: 2026-09-05
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
# 105 · Outcome Md Is Not In The Streamed Requestable Artifact Set So The Mesh Cache Can Never Answer For It

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

`OUTCOME.md` became a first-class delivered-story record (story 80 widened outcomes past the
milestone; 85/01 made its absence a doctor fact) but was never added to `WORK_ITEM_ARTIFACTS` —
43/ADR-007's single home for the set a worker STREAMS and a face may REQUEST. So a worker streamed
every other record of the worktree it was building and silently omitted this one: the mesh cache
could never hold an `OUTCOME.md`, `work:doc OUTCOME` was a coded `invalid-doc` refusal on a document
that exists on disk, and 85/01's doctor check had to justify departing from 43/06's R6.1 cache
suppression on a fact the cache was structurally incapable of holding. Add the entry, and re-measure
what it actually buys.

## Definition of Done

- [x] Add an OUTCOME entry to WORK_ITEM_ARTIFACTS in src/work-artifacts.mjs (the one home 43/ADR-007 names), confirm the derived WORK_ITEM_DOC_FILES view still passes acd-work-artifact-set-single-home, and re-measure how many done stories the doctor check then answers for from the cache rather than from disk. Today it is 0 of 277, which is why 85/01's check departs from the R6.1 cache suppression.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "OUTCOME.md is not in the streamed/requestable artifact set, so the mesh cache can never answer for it" (`src/work-artifacts.mjs:28`)
- **Raised reviewing:** `85`, review round 1
- **Promotion key:** `finding:85:outcome.md is not in the streamed/requestable artifact set, so the mesh cache can never answer for it`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

**Discharged 2026-09-05.** One entry joins the manifest —
`{ name: "OUTCOME", file: "OUTCOME.md" }`, placed between `VERIFICATION` and `RETROSPECTIVE` (the
manifest's order is the streaming order, and that is the order a story's close writes them in). The
derived `WORK_ITEM_DOC_FILES` view is unchanged in shape and gains `OUTCOME` for free, which is
exactly what the derivation is for: nine names now, from one definition.

**Box 1, clause 2 — `acd-work-artifact-set-single-home` still passes**, all seven of its cases,
including the ADR-013/C9 clause that asserts the derived view EQUALS the manifest's file-kind
entries in manifest order. The widening cost that guard no edit, which is the property it exists to
have.

**Box 1, clause 3 — the re-measurement, and it is the interesting half.** Before the entry: the
cache answered for a done story's `OUTCOME.md` **0 of 286**. After it: still **0 of 286** — but for
a different reason, and the difference is the whole point.

The old ceiling was structural: the name was unstreamable, so the count could never rise however
the mesh ran. The remaining ceiling is operational: a worker streams only its **active worktree**,
so a story's records reach the cache while that story is being built elsewhere and not otherwise.
Measured over this stream, the whole cache holds record-doc rows for **2 refs** — `VERIFICATION.md`
×2, `ARCHITECTURE.md` ×2, `RETROSPECTIVE.md` ×1 — and `RETROSPECTIVE.md`, which has been in the
manifest since 43, likewise answers **0 of 286** for a done story. That is the control: the second
delivered record was never blocked by the manifest and scores the same, which is what identifies
the residual cause as the active-worktree bound rather than the set.

**So 85/01's departure from R6.1 stands, and its measurement is unchanged** — suppressing on
`degraded()` would still silence the backlog this check exists to report. What no longer stands is
one *clause of its stated reason*: `src/work-doctor-coherence.mjs` (and the mirroring comment in
`test/delivered-story-records-reported.test.mjs`) says the fact "is one the cache CANNOT have:
`OUTCOME.md` is not in `WORK_ITEM_ARTIFACTS` at all". Half of that is now false. **Left unedited
deliberately:** chore 104 held a live run against `src/work-doctor-coherence.mjs` throughout this
one, in this same checkout, and a concurrent write to a file another lane is authoring is the
corruption this stream has already paid for once. Routed to the operator rather than fixed here —
see the finding below.

**Not widened, and named so it is a decision rather than an omission:** the board UI's
`DocName` union (`ui/src/board/api.ts`) and its per-type tab list are already a deliberate SUBSET of
the manifest (they carry neither `ARCHITECTURE` nor `DESIGN` nor `RESEARCH` nor `STATE`), so they
are not a mirror this widening owes an update to.

**Fixed at the review close (routed, not scheduled).** `test/artifact-sync-drain.test.mjs` still
restated the manifest's file-kind set as an eight-name literal, and sized two assertions off it
(`14`, and `12` for "the other twelve"). Self-consistent, so it stayed green while asserting over a
smaller set than the code streams — the same shape of drift this chore repairs, one layer down. Its
seed and both counts now derive from the fixture's `RECORD_DOCS`, which derives from the manifest.
The second count was found by the re-run, not by reading: the first fix left it at `12` and the
suite went red on `13 !== 12`, which is the assertion doing its job.

**Not changed — the delivered contract, and deliberately.** `43/03`'s
`02_artifact-manifest-widening-and-content-hash.feature` carries a `Scenario Outline` whose Examples
table enumerates the eight names as delivered; the mirroring row table in
`test/artifact-sync-manifest.test.mjs` is left at eight to match it. `OUTCOME` is proven streamed
AND requestable regardless, by the sibling scenario that iterates `WORK_ITEM_DOC_FILES` itself —
and non-vacuously, since the control node now holds fifteen artifacts where it held fourteen.

**Follow-up (operator's call, not minted here):** correct the two stale justification comments once
chore 104's lane closes — `src/work-doctor-coherence.mjs` (the `story-record-missing` block's "not
in `WORK_ITEM_ARTIFACTS` at all" clause) and the same sentence restated in
`test/delivered-story-records-reported.test.mjs`. The check's behaviour and its measured
justification are both unchanged; only that one clause of the reason is out of date.


## Accept decision

**Accepted** on the chore criterion (ADR-003) — the ticked checklist and a green `validate`, both
confirmed at source rather than read off the boxes. No scenario suite and no human sign-off apply: a
chore carries no behavioural contract.

- **Checklist** — both boxes under `## Definition of Done` are `- [x]`, none left `- [ ]`.
- **`aof work validate`** — `PASS — 105 is well-formed.` scoped, and `PASS — work stream is
  well-formed.` over the whole stream.
- **Box 1, clause 1, at source** — `src/work-artifacts.mjs:41` carries
  `{ name: "OUTCOME", file: "OUTCOME.md" }` in the manifest, between `VERIFICATION` and
  `RETROSPECTIVE`.
- **Box 1, clause 2, re-run rather than read** — `test/arch/acd-work-artifact-set-single-home.test.mjs`
  plus `test/artifact-sync-manifest.test.mjs` and `test/artifact-sync-drain.test.mjs`: exit 0, 25
  assertions, none failing (isolated `AOF_GLOBAL_HOME`, focused run — the full suite binds `:4182`).
- **Box 1, clause 3, the re-measurement** — accepted as recorded: 0 of 286 before and after, with
  `RETROSPECTIVE.md` as the control that identifies the residual bound as the active-worktree one
  rather than the artifact set. The clause asked for a re-measurement, not for the number to move.
- **Carried, not blocking** — the two stale justification comments in
  `src/work-doctor-coherence.mjs` and `test/delivered-story-records-reported.test.mjs` are recorded
  as the open gap in `OUTCOME.md`, deliberately left for chore `104`'s lane to close rather than
  written into a file another live lane is authoring.
