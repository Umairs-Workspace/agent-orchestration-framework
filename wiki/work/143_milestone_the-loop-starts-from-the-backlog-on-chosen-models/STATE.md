---
doc: state
---
# 143 · The loop starts from the backlog, refines a whole item in one pass, and runs each phase on the model the operator chose — State

## Progress

- Captured 2026-10-02 from the operator.
- Refined 2026-10-02 (`aof:refine 143 --autonomous`, solo): ADR-001…005 in `ARCHITECTURE.md`, four
  stories, every contract authored. Next: `aof:continue 143`.
- Continued 2026-10-02 (`aof:continue 143`, hybrid at the operator's choice: each story is built
  inline, then reviewed by one independent agent). Built in the sibling worktree `aof-143` on branch
  `143-loop-from-backlog-on-chosen-models` off `main`, because the primary checkout sits on 134's branch.

## Feedback (for retro)

- **143/00: the declared write set named two new files in directories already at their budget
  ceiling** (`test/loop` 63/63 and `test/arch/loop` 66/66, `acd-source-directory-budget`). The cases
  were folded into the suites whose subject they share: the backlog-scope cases into
  `loop-command-refusals.test.mjs`, and FF-14301 into `acd-loop-scope-guard.test.mjs`. `files:` and the
  FF table were corrected. Stories 01 and 03 declare the same kind of new file. Refine should check
  budget rows before declaring a new file.
- **143/00: the contract says `aof work loop <slug> --json` launches, but `--json` never launches.**
  Face policy (`spine/face.mjs`) makes `--json` the read-only probe. So through the CLI, `--json` with
  a backlog slug answers `wouldPromote` like `--dry-run`, and the promotion happens on the foreground
  launch. The scenarios are exercised through `runLoopBody`, as every launch-path loop suite is.
- **143/00: ADR-005 says the mesh assignment directive and the trigger declaration build loop
  declarations. They don't.** Both import only `decideLoopScope` and hand the loop a numeric scope,
  so the declaration is always built by the loop shell. The `null` default still covers them.
- **143/00 decision: an L1 report on a backlog slug answers `wouldPromote` and writes nothing,**
  because L1 is read-only (`acd-loop-l1-read-only`). ADR-001 §4 did not name L1.
- **143/00 known edge:** an `--level L3` launch on a backlog slug promotes before the L3 gate is
  computed. The gate reads the promoted number's doctor, so a refused gate leaves the item promoted
  and the loop not started — no worse than promoting by hand, then being refused.
- **143/00 review close** (one independent architect+QA reviewer, CHANGES REQUESTED, no Blocker):
  - *fixed:* an L1 launch on a backlog slug printed nothing (the launch face never renders a
    return) — it now prints the answer as an account line, asserted.
  - *fixed:* the resume case's lineage assertion iterated zero times (the resume halted at once) —
    the fixture now launches at cap 1 and resumes at cap 3, and asserts the resume drove.
  - *fixed (Nit):* the resume path resolved the slug twice; it now refuses on the row it holds.
  - *fixed (health):* the shell's line bound tightened from 2311 to 2131
    (`loop-command-wave.test.mjs`); the split is ledgered as TECH_DEBT item 92.
  - *recorded (Nit):* the L3-promotes-before-its-gate edge above.
  - *amendment for the accepting contract:* task 00's `--json` launch scenarios cannot launch
    (face policy), and its FF-14301 scenario names the unfolded file path.
- **143/02 review close** (APPROVE):
  - *fixed (Important):* a blank model (`verify=  `) parsed, then fell back to config silently —
    it now refuses `session-choice-empty` (or is effort-only with an effort suffix), asserted.
  - *fixed (Nit):* FF-14303's read detector gained the bracket and destructuring spellings.
  - *fixed (Nit):* the same `split("=", 2)` inline-value defect in the two hand-rolled parsers
    (`knowledge/src/memory.mjs`, `mesh/src/commands/session.mjs`); moving them onto
    `parseSpecArgv` is story-shaped — `story (operator)`.
  - *amendment for the accepting contract:* task 01's FF-14303 scenario names the unfolded path.
- **143/01 build decisions:**
  - `work.loop.refine` IS registered in both resolver maps (appended last), against the build brief's
    "do not add it if nothing enumerates": FF-12901's sweep refuses any `work.loop.*` key the loop
    family names that the maps do not carry, and the flag's description names it.
  - `refine` is the LoopState document's eleventh key on every answer, not on the probe alone:
    FF-5409 freezes one shape for the probe and a walk's end state.
  - The shell grew 2131 → 2161 lines; the bound in `loop-command-wave.test.mjs` was raised with that
    reason, because `packages/work-loop/src` is at its file budget (TECH_DEBT 92 owns the split).
  - FF-14302 folded into `acd-loop-concurrency-single-home.test.mjs` (`test/arch/loop` at its ceiling).
- **143/01 review close** (APPROVE, no Blocker):
  - *fixed (Important):* a re-entered break-down refine that failed after its answer was retried
    without `--autonomous` — the decision and the re-entry now share the engine's
    `isWholeItemCascade`, so the retry keeps the cascade.
  - *fixed (Important):* nothing tested the wire from a `whole-item` decision to the drive — walk
    cases now assert the composed prompt in-process and the child's `autonomous` lend.
  - *fixed (Nit):* an inherited refine mode is resolved through the vocabulary, so a hand-edited
    `"Whole-Item"` resumes as `per-story` rather than being echoed; the stale "ten-key" names.
  - *amendment for the accepting contract:* task 00's FF-14302 scenario names the unfolded path.

## Notes & decisions in flight

- Operator, 2026-10-02: "I want this done via the cli `aof work loop <> --`; we can discuss how to best lay
  this out as command line arguments." Agreed the same day: one repeatable `--model [<phase>=][<model>][:<effort>]` flag, e.g. `--model refine=opus:xhigh --model verify=fable:high`, with `--thinking` kept as the effort-only form (SPEC § Scope).

- **Default decisions taken at refine (autonomous; review them):**
  - Subagent role models stay out of scope: `--model` sets the spawned session only (ADR-003 §7).
  - `work.loop.refine`, not `work.autonomous.refine`, because FF-6901 makes `work.loop.*` the one home (ADR-002 §1).
  - Whole-item applies to the break-down drive (a milestone with no stories). A cascade that dies
    part-way is finished by the ordinary per-story refine drives (ADR-002 §4).
  - Session flags layer by specificity: a phased value beats an unphased one. Two values at the
    same specificity for the same part of the same phase refuse, even when they are equal (ADR-003 §4).
  - On resume, recorded FLAG choices are re-applied and config/default entries re-resolve. Any new
    session flag drops the recorded flag set as a whole (ADR-004 §3).
  - A backlog slug with `--stop`, `--hand-off` or `--resume` refuses, because it cannot have a
    running loop. `--dry-run` reports `wouldPromote` and writes nothing (ADR-001 §4).
- Graph: the first `aof graph build .` timed out at 120 s (`graphify-timeout`). A retry with
  `AOF_GRAPHIFY_TIMEOUT_MS` raised built it (17,935 nodes, egress none). Boundaries cite its impact
  answers (ADR-005).
- No diagram: no ADR here has enough moving parts to need one.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
