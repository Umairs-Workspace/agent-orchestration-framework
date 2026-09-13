---
type: story
number: 03
slug: loop-ready-score
title: "The Loop-Ready score — a readiness bar that a repo with no loop graph still clears"
parent: 53
status: done
owner: product-owner
created: 2026-08-15
updated: 2026-08-17
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 03 · The Loop-Ready score

## User story

As an **operator deciding how far to trust a run**, I want `aof work doctor` to tell me which
autonomy level this repo currently clears and exactly which checks are holding it down, so that "how
autonomous can this be" is a number with named evidence rather than a feeling — and so that a repo
that has never declared a loop graph is **scored honestly rather than punished for a graph it has no
reason to have**.

## Context

`src/work-doctor-loop-ready.mjs` (new): one pure function over injected plain data, returning the
frozen `LoopReady` shape. Plus the composition at the command boundary in `src/commands/doctor.mjs`
— a deferred `invoke("work:loops-validate")`, one additive `loopReady` key in `json()`, one render
line.

Four measured constraints converge here, and the design is what satisfies all four at once:

**Doctor has no score concept.** RESEARCH §Q5: `doctorWork` returns a bare `Finding[]`;
`healthy`/`strict`/`errors`/`warnings` are computed at the **command boundary**, never in the engine.
So the score is computed where `healthy` already is — that is the house pattern, not a workaround —
and `CHECK_GROUPS` is not extended, which keeps the engine's return byte-unchanged.

**52 pre-committed this seam in writing.** 52/ADR-007 ruled that folding the loop checks into doctor
was *"rejected, and deliberately left for 53… When 53 opens it, it composes through
`invoke("work:loops-validate", …)` — never by importing the loop modules."* That is honoured
verbatim.

**There is a trap in honouring it.** Reaching `invoke` means `doctor.mjs` importing
`command-core.mjs`, which imports all 75 command modules including `doctor.mjs` — TECH_DEBT item
26's registry ring. Measured today: **no command module statically imports `command-core.mjs`**, and
53 must not be the first. The deferred `await import(...)` inside `run()` — the
`src/commands/assets-ui.mjs:42` precedent — costs one line and is already in the tree.

**The score must never become a second checklist.** It cannot disagree with the graph because it
does not compute: composed rows read `loops.summary.checks[<id>].findings` verbatim for 52's five
frozen check ids.

ADR references: 53/ADR-007 (all of it); 52/ADR-007 §5 and 52/ADR-011 §12 (the honoured
pre-commitment and the frozen check ids).

## Acceptance

- **The frozen `LoopReady` shape** of ADR-007 §4 exactly: `{score, passed, applicable, clears,
  registry:{present, composed, error, warn}, checks:[{id, state, evidence}], blocking:[...]}`.
  `clears` is `"none" | "L1" | "L2"` — **`L3` never appears in 53**.
- **Registry-optional, both ways.** With no `loops/` directory: `registry.present:false`,
  `composed:false`, the five 52 check ids present as `not-applicable` and **excluded from
  `applicable`**, so a repo with no loop graph scores four out of four and is not penalised. With a
  registry present: the composed counts **equal `work:loops-validate`'s own `summary.checks`
  exactly** — no count recomputed, no finding re-classified, no severity re-decided.
- **The four base check ids are frozen** — `stream-coherent` (zero `error`-severity doctor findings
  in scope), `cap-declared` (`work.autonomous.maxAttempts` is **DECLARED** — the id's own word
  governs, and the `?? 3` fallback at `src/commands/run-retry.mjs:62` is not a declaration, so a
  check that also passed on it could never fail; ADR-010 §12 supersedes ADR-007 §5's "resolves"),
  `memory-on` (`memory.backend` declared), `tasks-authored` (every in-scope story carries a task
  payload, answered by **`buildSnapshot`'s per-story `hasTasks`**, `src/work-doctor.mjs:281`, off
  the ONE snapshot doctor already builds — never an N-invoke `work:tasks` fan-out, which measured
  3,214 ms for 185 stories against a 1,157 ms doctor baseline; ADR-010 §13). Each row carries its
  `evidence`.
- **Equal weights, stated as a decision.** `score = round(100 * passed / applicable)`, with
  `not-applicable` rows out of the denominator. No weighting is invented — there is no evidence in
  this repo for one, and a weighted score would be a fabricated number reported as a measurement.
- **`blocking` names the failing checks holding `clears` down**, so the output is actionable rather
  than a bare percentage.
- **The module is in doctor's lane and not in its registry.** It is a member of
  `acd-doctor-engine-determinism`'s glob set (so a rename cannot silently escape the sweep) and is
  **not** a member of `CHECK_GROUPS` (so `doctorWork`'s bare-array return is unchanged). It reads no
  clock and no filesystem, and imports no `work-loops*.mjs` — transitively.
- **`src/commands/doctor.mjs` holds no static import of `command-core.mjs`** and reaches the registry
  only through the deferred import inside `run()`, and it hoists the `buildSnapshot` build to that
  same impure edge so the snapshot is built once, not twice. **`src/work-doctor.mjs`'s diff is
  EXACTLY TWO additive lines** — the `export` keyword on `inScope` (`:455`) and `options.snapshot ??`
  on the snapshot build (`:514`) — which ADR-010 §13 rules in place of ADR-007's "not edited",
  because the alternative was a FOURTH scope parser inside the milestone that ledgered the three as
  TECH_DEBT item 49. `CHECK_GROUPS` is not extended, `doctorWork`'s return is unchanged, and the
  four lane modules are untouched.
- **`aof work doctor --json` gains exactly one additive key**, `loopReady`; the human render gains
  one line. Every existing key, finding and exit code is unchanged.
- **The score is advisory and gates nothing.** No `src/` module reads `loopReady` on any path that
  can refuse a loop. It becomes a gate at L3, in 55.
- **The story's evidence lands WITH the story, registered.** Five new suites under this story's
  frozen name family — `test/loop-ready-{json-key,registry-absent,composed,base-checks,score}.test.mjs`
  — reusing `test/doctor-command-core.test.mjs`'s harness SHAPE, each **imported AND spread** in
  `scripts/test.mjs` inside this story's own labelled `// milestone 53 / story 03` block, in the
  same diff as the scorer they mechanise. Not later, and not 53/05's — a story accepted on evidence
  the runner never invokes is TECH_DEBT item 48 exactly (ADR-011 §1/§2). **The five suites' shared
  fixture helper `test/support/loop-ready-fixture.mjs` is DECLARED in this story's owned set**
  (ADR-015 §3) — story-owned shared support authored with the story, not a suite, so no registration
  sweep sees it (the milestone-52 precedent, `test/work-loops-coverage-ledger.test.mjs:702-706`);
  localising it into five copies was refused. It builds the registry at `<workspace.aofDir>/loops`
  (`:30-39`), which is ADR-012's home and the home this story's task contracts state.
- **The one pre-existing test file this story edits is `test/doctor-command-core.test.mjs`, and its
  diff is EXACTLY ONE ASSERTION** — `doctor/00`'s top-level key set widens from `["findings"]` to
  `["findings", "loopReady"]`, still a closed set equality failing in BOTH directions, asserted
  order-independently. ADR-014 rules this in place of ADR-011 §3's "byte-unchanged", because
  `json()` takes no `ctx` and cannot `invoke`, so the key must be born in `run()` (ADR-010 §15) —
  and because milestone 15's delivered criterion (`15/00 00_doctor-command.feature:36`, "the result
  carries no other top-level field") is **SUPERSEDED in 53's record, never edited**: what it
  guaranteed — the face's verdict never leaking backwards into `run()` — survives intact, since
  `loopReady` is a computed fact, not a verdict. The ceiling is measurable, not promised: one
  `Object.keys(` occurrence, the line byte-equal to ADR-014 §3's pinned replacement, an unchanged
  683-line residue digest, and the exported `name` set untouched. The test case keeps its name,
  which quotes 15/00's scenario title verbatim — traceability to an immutable criterion outranks
  the staleness, and a rename would be a second changed line.

## Tasks

- [x] [00 — `loopReady` is ONE additive key on `aof work doctor --json`, one render line, and nothing else moves](tasks/00_additive-json-key.feature)
- [x] [01 — no `loops/` directory: the five 52 rows read `not-applicable`, leave the denominator, and the repo scores four out of four](tasks/01_registry-absent.feature)
- [x] [02 — with a registry, the five composed rows ARE `work:loops-validate`'s `summary.checks`, read verbatim](tasks/02_composed-verbatim.feature)
- [x] [03 — the four base checks and their evidence, under doctor's own scope filter](tasks/03_base-checks.feature)
- [x] [04 — the equal-weight fraction, the rounding rule, and `clears`/`blocking`](tasks/04_score-clears-and-blocking.feature)

## Notes

### Refinement ruling — the retired registry home, closed 2026-08-17

The 2026-08-17 integration exposed a second contradiction, of a different kind from the one below:
the executable record named a directory production no longer resolves. ADR-012 / story 53/07 moved
the loop registry from `<work.dir>/loops` to `<workspace.aofDir>/loops` (`.aof/loops` here), the
landed shared fixture followed the new home, and this story's five suites went **33/33 green against
it** — while tasks 00–02 still built their registries at `wiki/work/loops` in **30** places
(`00` ×2, `01` ×17, `02` ×11) plus once here, for 31 in the story. Green tests that do not mechanise
the paths their contract states are not evidence for that contract.

**ADR-015 §3** ruled it, and this round executed the ruling: the instrument was wrong, not the
design. ADR-012 stands unamended; all 30 occurrences are re-aimed to `.aof/loops` and the three
REFINEMENT INPUT comments struck. **No scenario is weakened** — every Given/Then keeps its shape and
only the address moves. One leg gets STRONGER at the new home rather than merely relocated: task 01's
*"adding or removing the registry changes nothing about doctor's own findings"* was the single red in
the pre-07 tree (`wiki/work/loops/` is inside doctor's own item scan, so a present registry emitted
`orphan-folder`); under `.aof/loops` it is outside that scan and the assertion is true. No `src/` and
no test-code change — the implementation was already right.

Tasks 00–02 stay unticked here: the contract and the fixture now agree, and `aof:continue 53/03`
ticks them on a re-run of the five suites.

### Refinement ruling — the envelope contradiction, closed 2026-08-16

The 2026-08-16 build exposed an internal contradiction: this story's task 00 required
`invoke("work:doctor", {}, ctx)` to return `{findings, loopReady}`, while ADR-011 §3 froze
`test/doctor-command-core.test.mjs` byte-for-byte and that suite asserted `Object.keys(result)`
equals exactly `["findings"]` (`doctor/00:161-168`). Both could not be green.

A targeted Three Amigos round ruled it, and **ADR-014** records the ruling. The direction was
forced rather than chosen: ADR-010 §15 measured that `json(result, faceCtx = {})` takes no `ctx`
and cannot `invoke`, so `loopReady` must be composed in `run()` and the envelope must grow. So the
contract that moves is the **test** — code, and changeable — not the design and not milestone 15's
delivered record, which is immutable and was not touched. The legacy assertion widens by exactly
one line; the delivered "no other top-level field" guarantee is **narrowed to a closed two-key
set**, not abandoned. Measured while ruling: it is the only envelope key-set pin in the tree, and
`1` of that suite's `24` cases is red at HEAD because checkpoint `88a91cd` already landed the
envelope change.

The raw build event stays in the parent milestone's `STATE.md` under `## Feedback (for retro)`.

This story is **fully independent** — it shares no file, no import and no contract with 53/00, 53/01
or 53/02. It composes a command that shipped in milestone 52, so it can start immediately and needs
no part of the loop to exist. The four base checks are the smallest defensible set answerable from
data doctor already has, **flagged for the operator** in the milestone STATE; the PRD's "denylist
honoured" belongs to 55, and 55 widens this list additively.
