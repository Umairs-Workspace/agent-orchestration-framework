---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 50 · Session launcher — State

**COMPACTED AT ACCEPT, 2026-08-14.** The blow-by-blow is archived. Durable decisions live in
`ARCHITECTURE.md` (ADR-001…008) and `DESIGN.md` (DG-50-1…7); delivered product state and the gaps
this milestone declared live in `OUTCOME.md`; the carryable lessons live in `RETROSPECTIVE.md`
(R1…R7); the measured evidence lives in `VERIFICATION.md`. Nothing below restates them.

## Progress — **DONE**

| Stage | |
|---|---|
| Framed | 2026-08-02 · `aof:shatter wiki/planning/PRD-web-ui-restructure.md` |
| Refined | 2026-08-14 · `aof:refine 50 --autonomous` — 3 stories, all contracts authored |
| Built | 2026-08-14 · `aof:continue 50` — a 4th story added mid-build (the scope gap below) |
| **Accepted** | **2026-08-14 · `aof:verify 50`** |

- [x] **50/01 · session-spawn-directive** — the wire kind and its receive lane
- [x] **50/02 · fleet-spawn-route** — `POST /api/mesh/session` + the allowlist fitness update
- [x] **50/03 · worker-spawn-handler** — the worker-side PTY spawn + session registration
- [x] **50/04 · session-launcher-affordance** — the affordance and the honest spawn-outcome surface

**Accept evidence** (all re-measured at verify on a quiet tree, superseding the build-time tallies —
R7): **128/128** `@executable` across seven suites · **972/975** arch gates, the three remaining
byte-proven inherited from `main` and ledgered as **chore 64** · Rust **85/85** · `aof work validate`
PASS scoped and stream-wide · design conformance **CONFORMS** on every judgeable region against a
real render of the deployed build · honest failure verified **live in production** end-to-end.

**Accepted with one declared gap.** DG-50-1 — a launched session's tile observed against a real
launch — has never been rendered, because at accept the fleet had no node able to host one (the
control node is excluded by design; both workers were down). It is declared in `OUTCOME.md ## Gaps`
with its discharge condition, alongside three smaller unfilled frames. The success path itself is
exercised in-process by story 03's 34 scenarios, which spawn real PTYs.

## Decisions that graduated

Four things were settled here that outlive the milestone. Each is recorded at its permanent address;
this table is the index, not a second copy.

| Decision | Where it lives now |
|---|---|
| The fleet face dispatches over the EXISTING loopback relay bridge, not an options-bag handle — `session-spawn` is a third named lane beside `terminal-input` and `terminal-resume` | ADR-006 |
| A launched session runs the operator's default shell; `assistant` is a session-key LABEL that selects no binary | ADR-007 |
| The wire states a code and the browser states the sentence — one home per fact | DESIGN §DG-50-3 rule 3 (narrowed at verify, F-50-B) |
| `relaying` is the session projection's seventh key, appended at the tail, strict `=== true` | ADR-008 decision 8 |

## Carried forward

- **Chore 64 · inherited-reds** — three arch gates and one racy test, red on `main` and byte-proven
  not caused by this milestone (F-50-E, F-50-F).
- **TECH_DEBT item 45** — SECURITY T2's live revocation re-read is inert on every lane; no frame
  builder in the tree sets `issuer`. Found here, deliberately out of scope, ledgered.
- **`OUTCOME.md ## Gaps`** — DG-50-1's render, the R-C/R-D fixture frames (DG-50-2/3/7), DG-50-6's
  stress frame, and the panel's scroll clamp. Each carries a discharge condition.

## Archived — the blow-by-blow

Two build blockers were raised and both were resolved the same day by superseding ADRs. Story 02's
was **half right in the most useful way**: its process-topology finding was correct and saved a
green-but-dead route, while its "the relay bridge is deliberately limited to `terminal-input`" half
was false — one grep for the sibling kind constant would have found `TERMINAL_RESUME_KIND`. Story
03's was a genuine contract contradiction (ADR-003 mandated `resolveProvider(assistant)` and then
justified full env inheritance with "this is an operator shell"), correctly escalated because it was
not resolvable from the record.

A **scope gap** was found at build: the SPEC's first in-scope bullet — the affordance itself — had no
story, because ADR-005's partition was drawn from `aof graph impact` over `src/` and never crossed
into `ui/`. Story 04 was added by operator ruling rather than the SPEC being narrowed.

A **cross-story coupling ADR-005 did not anticipate**: story 03's launcher wiring added a third
`.sendTerminalFrame(` producer, tripping m49/ADR-003's shrink-only ceiling — a tripwire m49 left for
this milestone, behaving correctly. Story 03's 42 green scenarios therefore did not make the tree
green until story 04's lane B raised the ceiling and re-derived the feed axis in the same diff.

A **near-miss on test isolation**: `node scripts/check.mjs` shells the FULL suite, which binds
`:4182` on this machine. It ran ~2 minutes before being killed. No harm — it was under an isolated
`AOF_GLOBAL_HOME` — but the guard hook keys on that env var alone, so an isolated full-suite run
still passes a guard that exists partly to stop it. Worth extending the hook to the suite entrypoint.

The recurring lesson of the whole milestone — an ADR reasoning correctly about a hazard, concluding
the chosen form was safe, and never driving a detector against the unsafe alternative — occurred
**four** times, the fourth at the verify layer. All four are written up as R4 in `RETROSPECTIVE.md`,
which is where they now belong.
