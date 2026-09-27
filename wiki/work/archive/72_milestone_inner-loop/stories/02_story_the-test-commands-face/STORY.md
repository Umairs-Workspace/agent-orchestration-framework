---
type: story
number: 02
slug: the-test-commands-face
title: "The test command's face — one registered command that selects, launches and reports failures, and decides nothing"
parent: 72
status: done
owner: product-owner
created: 2026-09-02
updated: 2026-09-03
depends: [72/00, 72/01]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-001, wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-002, wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-003, wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-004, wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-008, src/work-toolchain.mjs, src/work-test-select.mjs, src/commands/loop.mjs, src/work-audit-probe.mjs, src/work-audit/census.mjs, src/work-audit/spawn.mjs, src/spine/face.mjs, src/work-grade.mjs, src/graph-normalize.mjs, src/commands/graph-impact.mjs, test/support/source-slice.mjs, test/arch/acd-test-suite-registration.test.mjs]
files: [src/commands/test.mjs, src/command-core.mjs, scripts/test.mjs, test/command-core-contract.test.mjs, test/test-command-contract.test.mjs, test/arch/acd-test-command-reports-not-decides.test.mjs, test/arch/acd-loop-suite-registration.test.mjs]
---
# 02 · The test command's face

## User story

As an agent who has been told *"never run the full suite on this machine — run focused suites via
test-array imports instead"* and given no command that does it,
I want `aof test --scope impacted|file|all` to be that command,
so that selective testing is a tool I call rather than a throwaway `.mjs` I write again every run.

**This is the chore the milestone was raised to delete.** Because no command does this, each agent
hand-writes a script importing the arrays it wants — which is why **805 of 4,950 write events are
scratchpad files**, and why the same throwaway command was re-run 33×, 31×, 30×, 26×, 26×, 23×.

This story composes what 72/00 and 72/01 already built and adds nothing of its own beyond the face:
72/00's declaration and bounded launch, 72/01's selection, and one registered command in
`src/command-core.mjs`. Every line of logic stays in named modules outside `src/commands/` —
`src/commands/` is at 94 siblings and TECH_DEBT item 78 already indicts it, so this milestone adds
exactly ONE (the 95th) and a story that grows it by more has broken the partition.

**The output contract is failures-only, and it lives in the command rather than in a rewriter**
(`ARCHITECTURE.md#ADR-003`, which departs from the SPEC's `PreToolUse` rewriting hook and says why).
Each `not ok` with its assertion output, then one summary line — `selected/total`, `builtAt`, `scope`,
and each widening. `--verbose` restores the full stream and removes nothing. The human face and
`--json` render from the **same result object**, so the two cannot drift.

**The command REPORTS and never decides.** Every result carries `gate: false` unless `scope === "all"`
and nothing widened. No status, accept, merge, loop or audit door invokes it — asserted as a census
over those modules, so `09/ADR-004` is held structurally rather than by convention. The command
declares no `cli.launch`: it runs a spawn and returns, it does not hand a session to a terminal.

**No test module enters the aof process.** `src/commands/test.mjs` holds no dynamic import of a path
under any declared test root, and neither does any module in 72's families. This is asserted with a
fresh `node -e` process PER MODULE, because every in-suite probe reaches these modules through a warmed
cache and would see nothing.

The runner side is additive. `scripts/test.mjs` gains an argv reader and `--only <file>…`, which
dynamically imports each named suite file and takes its exported `{ name, run }[]` — the same
runner-shaped detection `src/work-audit-probe.mjs:36-50` already uses. **The static `tests` array is
not read, not reordered, not restructured and not appended to.** The rationale the SPEC inherited for
that rule is stale — `REGISTRATION_SPREAD` (`test/arch/acd-loop-suite-registration.test.mjs:271`) makes
the trailing comma optional, so an append no longer mints a digest, and `scripts/test.mjs:4497` still
says otherwise. The rule outlives its rationale: what actually binds is §5 below.

**This story re-derives `REG-MUT-11`'s pins, and that control is in its `files:`.** There is no
conforming implementation of the argv reader or the loop extraction that leaves it green
(`ARCHITECTURE.md#ADR-004` §5): `runnerPins` (`:286-307`) digests every runner line that is not a
registration import, not a spread inside the array, and not a comment or blank — so **the argv reader
alone moves the residue** — and the four `RUNNER_REGIONS` are cut from
`functionBody(text, "async function runSuite(")` with the loop anchored at `indexOf`, so extracting
the loop makes that cut miss. Re-derive the four region pins and `RUNNER_RESIDUE`; **weaken no leg** —
the region set, `residueFloor = 40`, the integration-lane count, both registration patterns and the
resolve-on-disk leg all survive intact. Re-deriving a pin and deleting a leg look identical in a diff,
so the review of this story owes an explicit before/after leg census rather than a green.

And the per-test `AOF_GLOBAL_HOME` isolation, the `ok -` / `not ok -` printing and the failure count
are extracted into ONE function both paths call — a second copy is how per-test isolation quietly
stops applying to the selected path.

## Tasks

- [x] `tasks/00_the-command-selects-launches-and-reports-failures-only.feature` — three closed scope forms, failures-only with one summary line, `--verbose` restoring and removing nothing, both faces rendered from one result, and an unrecognised scope refused rather than defaulted
- [x] `tasks/01_the-command-reports-and-never-decides.feature` — `gate: false` on every narrowed or widened result, no transition door invoking the command, no test module entering the process (probed per-module in a fresh process), and no declared session launch
- [x] `tasks/02_the-runner-learns-a-selection-argv-additively.feature` — `--only` runs named suites by dynamic import without reading the assembled array, the array and its registration digest are unchanged, one execution loop serves both paths, and a selected test still runs isolated

## Notes

- **`reads:` names `src/work-toolchain.mjs` and `src/work-test-select.mjs`, which do not exist until
  72/00 and 72/01 land.** `aof work validate` will report a transient `story reads path … does not
  exist` for each until then; this is 63/05's precedent and it clears when stage 1 lands, not by
  editing the declaration.
- Sole writer of `src/command-core.mjs`, `test/command-core-contract.test.mjs`,
  `test/arch/acd-loop-suite-registration.test.mjs` and of `scripts/test.mjs`'s **argv +
  execution-loop region**. Every other story appends only its own labelled suite block to that file —
  the sub-file sole-writer rule 63/ADR-009 §2b already used here.
- `test/arch/acd-loop-suite-registration.test.mjs` is a control this milestone did not declare and
  does not own the invariant of; it is in `files:` solely so §5's re-derivation is a declared write
  rather than a surprise. Its legs are 53's, not 72's.
- FF-7204 is this story's, and it is the only control in the milestone that makes claims about the
  COMPOSED command. No stage-1 story declares a control it could not clear (62/ADR-013 §7's lesson).
- **Parameterise `runSuite` IN PLACE; do not extract it.** Measured: extracting the loop makes the
  control's cut return `NOT FOUND`, and **re-anchoring the cut at the extracted function silently
  mis-cuts region 4** to 30 characters of an unrelated import — a green control whose integration-lane
  leg measures nothing. The arrangement that works is
  `async function runSuite(tests, { lanes = true } = {})` with the parameter *named `tests`* (so the
  loop header stays byte-identical) and an early `if (!lanes) return failures;` **before**
  `console.log("# integration")`. It leaves **all four region pins identical** and changes
  `RUNNER_RESIDUE` alone, 70 → 113 lines.
- **The review's discriminator: the diff of `test/arch/acd-loop-suite-registration.test.mjs` must be
  exactly ONE changed line — `:269`.** Any diff also touching a `from:` closure (`:264-267`),
  `RUNNER_LOOP_HEADER` (`:261`), the plants (`:843-892`) or `syntheticSuite()` (`:469-501`) has left
  the re-derivation lane, and the review must then demand a printed cut-body census — each region's cut
  text before and after, shown to contain its named subject. A re-derived pin over a mis-cut region and
  a deleted leg are the same green.
- **Read stderr.** `ok -` goes to stdout but `not ok -` and the stack go to **stderr**
  (`scripts/test.mjs:4539` vs `:4542-4543`), and `src/work-grade.mjs:459-465` already records that a
  stdout-only capture of a failing run reads all-green. A failures-only filter reading stdout prints
  "no failures" over a red run.
- **Do not author a second TAP parser.** `normaliseTap`/`normaliseReport` (`src/work-grade.mjs:137`,
  `:262`) already parse `ok -`/`not ok -` and attach a failure's diagnostic text verbatim — which is
  ADR-003's output contract. A second one here is the duplication species FF-7203 indicts, one file
  over.
- **The `--only` argv reader must DISPATCH inside the `invokedDirectly` guard** (`scripts/test.mjs:4607-4613`),
  not beside the parse. `assembledSuite()` spawns the probe, which `import()`s the runner with the
  runner's own path as `argv[2]`; a top-level dispatch would run all 8,401 registered cases inside a
  census. Requiring the `--only` sentinel — rather than treating bare positionals as suite files — is
  what makes that row pass for a reason rather than by luck.
- **`tasks/02`'s array-mutation scenario compares FIXTURE text**, never the live array: built as a live
  pin it reds on every sibling story's labelled block, and none of the five is that array's sole writer.
- The fresh-process probe is green on arrival and non-vacuous — `module.register()` (20.6+, the
  declared floor is `node >=20`) via `node --import`; `module.registerHooks` is 22.15+ and would pass
  **vacuously** on the floor. `src/command-core.mjs` alone resolves 1,464 specifiers, 0 under a test
  root. Use `TEST_ROOTS` (`src/work-audit/census.mjs:159`), not a literal.
- **No `src/cli.mjs` edit is needed** — `resolveRoute` runs before every ladder branch and walks route
  lengths down to 1 (`migrate` and `init` are the one-word precedents), so this story does not contend
  with 72/03 on that file. And the command id must **not** be `work:test`: both `work:*` controls filter
  on `id.startsWith("work:")`, and a `work:` id would demand a served `/api/work/test` route.
- The new arch file must contain **zero positional slices** — `POSITIONAL_SLICE_LEDGER` defaults to
  `max: 0` for an unledgered file (`test/arch/acd-test-suite-registration.test.mjs:157,:370`). Cut with
  `test/support/source-slice.mjs`.
