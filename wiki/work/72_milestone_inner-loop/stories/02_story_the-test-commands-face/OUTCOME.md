# 02 · The test command's face — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### `aof test` is a registered top-level command, the one face this milestone adds to `src/commands/`
`src/commands/test.mjs` is registered in `src/command-core.mjs` under the id `test` with the one-word route `["test"]`, outside the `work:` namespace; it composes 72/00's declaration and bounded launch with 72/01's selection and changed-set reader, and holds nothing of its own beyond one frozen result object and two faces over it.

### The scope forms are three, and a fourth is a refusal
`--scope impacted`, `file` and `all` are the only forms. An absent, differently-cased or unknown scope is `test-scope-unrecognised`; `file` with no file named is `test-file-scope-names-no-file`. Both are results rendered on either face with nothing selected, no runner launched and exit 1 — never a fallback to one of the three.

### The report is failures-only by default and is derived from both streams and the exit code
Each failing case is printed with its assertion text, then one summary line — `selected/total suites · scope · graph built <builtAt> · <widenings> · may / may not stand as a verdict`. Stdout and stderr are concatenated before the one shipped TAP reader (`normaliseReport`) parses them, so a `not ok` this repository's runner writes to stderr is read. A green-reading report beside a non-zero exit is reported as a contradiction and exits 1; a report no normaliser can read is reported as producing no verdict and exits 1.

### One result object, two faces
`--json` returns the frozen result itself and the human face renders from the same object. `--verbose` adds the passing rows and removes no line the quiet run printed.

### Every result says whether it may stand as a verdict, and only an unwidened whole run may
`gate` is `true` only when the scope ran as `all` and nothing widened; every `impacted`, `file` and widened result carries `gate: false`. No status, accept, merge, loop or audit door invokes the command — censused by invocation shape over `src/commands/item-status.mjs`, `src/work-doctor.mjs`, `src/work-loop.mjs`, `src/work-audit/**` and `src/bundle/**` — and the registered command declares no `cli.launch`.

### No test module enters the aof process
None of the nine modules the command reaches resolves a specifier under a declared test root when imported alone in a fresh process, and the family holds no dynamic import of a test path.

### This repository's runner runs named suites additively, through its one execution loop
`scripts/test.mjs --only <file>…` imports each named suite file, takes every runner-shaped array it exports, and runs them through the same `runSuite` the full path calls — parameterised in place as `runSuite(tests, { lanes = true })`, the integration, cargo and shell lanes skipped by one early return on a selection. A file that is absent, does not evaluate or exports nothing runnable is reported `not ok` by path and the run exits 1; `--only` with no file refuses naming the option; the assembled array is not read, reordered, restructured or appended to; and importing the runner runs nothing, whatever the importer's argv holds.

### REG-MUT-11's residue is re-derived and no leg is weakened
`test/arch/acd-loop-suite-registration.test.mjs` differs from HEAD by exactly one line, `:269` (`RUNNER_RESIDUE`); the four region pins, `residueFloor`, the integration-lane count, both registration patterns and the resolve-on-disk leg are byte-unchanged.

## Assumptions

- **`work.test.report.format` names what the runner emits** — the report is parsed by the declared format alone (`tap` is the one format the declaration admits); a runner emitting something else reads as "no verdict", never as green.
- **The `--only` sentinel is required** — bare positionals are never suite files, which is what keeps the registration census's probe child, whose argv carries the runner's own path, from running 8,401 cases inside a read.
- **`--scope impacted` widens to `all` on any tree holding an untracked file** — the commonest inner-loop state — and the whole suite then runs with no output until it finishes (ADR-003 §3: no streaming); the widening is announced in the summary line at the end, not before the launch (`m72/F-72-AN`).
- **`--scope file <one suite>` pays this repository's runner its whole static import** — 3.4–6.5 s before the first assertion (ADR-004 §6, TECH_DEBT item 86); the cost is the runner's, and a cheaper selection entry can be declared in `work.test` with no framework change.

## Gaps

### The registration report (ADR-004 §4)
- **Status:** open
- **Discharge condition:** a producer of per-file provenance (`Map<file, exported names>`) that does not import test modules into the aof process — `src/work-audit-probe.mjs` reporting names WITH their file of origin, a story of its own outside this milestone's write set.
A selected file the assembled array does not register is not reported by `aof test`. 72/01's `registrationReport` decides correctly over what it is given and this command hands it nothing, because the only shipped producer of assembled names returns them with no provenance at the cost of a ~3.5 s child. Recorded as `m72/F-72-AO`.

### No `/aof:test` bundle wrapper
- **Status:** discharged
- **Discharge condition:** none owed — `ARCHITECTURE.md#ADR-006` §4a suspends the work-command wrapper rule for this command, because FF-7204 censuses `src/bundle/**` for any invocation of it.
`aof test` is a developer tool an agent runs directly, discoverable from `aof --help`; a bundle wrapper would be the door the control forbids, and the absence is a decision rather than an omission.
