---
doc: architecture
---
# 135 · Key examples in the contract — Architecture

STATE names three things this document must settle: `Rule:` blocks versus a feature per rule
(ADR-002), how the trace matches an example to a scenario (ADR-004), and the fallback for a runner
that does not bind `Rule:` (ADR-002 §3). The operator added a fourth at refine (2026-10-03): move
specification by example into its own package (ADR-001). ADR-003 is the parser, ADR-005 the board,
ADR-006 the formulation prose, and ADR-007 the break-down.

## Memory recall: what was surfaced, and what it changed

- **54/ADR-006**: "a scenario join is DECLARED, never inferred, and an unjoined case is reported
  unjoined." **Honoured.** The trace joins on ids the contract declares, never on matching values
  (ADR-004 §1).
- **m134/R2**: "When a restructure merges under a refined milestone, re-derive each unbuilt story's
  `files:` from the new tree before its build." **Honoured in advance.** 01 is a restructure *inside*
  this milestone. 03 to 05 declare the post-01 paths as forward references, and STATE carries the
  re-derive step.
- **m134/R1**: "schedule its live run before its stories reach review." **Honoured.** STATE puts the
  live run after the 04 and 05 builds and before either goes to review.
- The PO recall for the milestone domain came back empty.

## ADR-001 — Specification by example is its own package, `@aof/specification-by-example`

### Context

The operator asked at refine whether specification by example could be an add-on (2026-10-03).
There is no runtime plugin mechanism. Every workspace package is a build-time dependency that core
always bundles into the one payload. The "add-on" switch already exists: `work.examples.enabled`,
which defaults off. What can be done is to move the practice out of `@aof/work` into its own
package, so it has one home and `@aof/work` stops naming it. The operator chose that, and the name.

134 already injected most of it. `createDoctorExamples`, `createExampleAnswers` and the run store's
answer readers are all built in core and passed in. Only three places in `@aof/work` still name the
map directly (measured): the snapshot probe (`doctor/index.mjs:19`, `:496-501`), the budget kind
(`doctor/budget.mjs:2`, `:38`, with `DEFAULT_BUDGETS.examples` at `doctor/index.mjs:923`) and the
continue door (`commands/continue.mjs:4`, `refuseOpenExamples` at `:201`).

### Decision

1. **`packages/specification-by-example/`** (`@aof/specification-by-example`). It holds the map
   grammar (`src/map.mjs`, moved from `packages/work/src/examples/map.mjs`), the answer reader
   (`src/answers.mjs`), the doctor lane (`src/doctor-lane.mjs`, from `work/src/doctor/examples.mjs`)
   and the build-door check (`src/build-door.mjs`, from `refuseOpenExamples`). 135's trace (ADR-004)
   is born there.
2. **Dependencies run one way.** The package may import `@aof/work` (`feature-parse`, `lifecycle`)
   and `@aof/contracts`. `@aof/work` imports nothing from it, and no `@aof/work` source spells the
   map's file name (FF-13501). Core composes the two.
3. **The three direct references become extension seams in `@aof/work`, which knows nothing about
   examples:**
   - *Snapshot probe.* `createWorkDoctor` takes an injected `storyProbe(item, { projectsDir })`. It
     returns `{ docSizes, extensions }` and the engine merges both into the story row. The package
     supplies the probe that reads `EXAMPLES.md` and its answers, only when the gate is on and the
     file exists (unchanged from 134/ADR-005 §2). The row field becomes `extensions.examples`.
   - *Budget kind.* The budget lane takes injected `{ doc, kind, lines }` rows next to its built-in
     ones. The package contributes `EXAMPLES.md → examples, 50`, and `work.doctor.budgets.examples`
     still overrides it.
   - *Build door.* `createPhaseDoorCommands` takes an injected `beforeBuild(ctx, row)` list and runs
     each before the build. The package supplies `refuseOpenExamples`. Its refusal code
     (`examples-question-open`, 409) and its message stay the same.
4. **What stays where it is.** `examplesEnabledFromConfig` stays in core's config inspection,
   because config has one home and the package gets the resolver injected. The bundle prose
   (`refine.md`, the `EXAMPLES.md` template) stays in core's assets, because the bundle is one
   install unit. `Rule:` stays in `@aof/work`'s parser, because it is the one Gherkin reader
   (66/ADR-003) and validate, the board and the ratchet read through it.
5. **No behaviour change.** Every 134 suite passes from the new home with only its imports changed.
   FF-13401, FF-13402 and FF-13403 keep their invariants. Their paths move to the package. The arch
   tests are code, so they may change. 134's delivered `.feature` files are not touched.

### Alternatives considered

- *A runtime plugin loaded only when the gate is on.* No such mechanism exists. Building one is a
  milestone of its own, and the payload ships every package anyway. Rejected; the config gate is
  the add-on switch.
- *Leave the code in `@aof/work`.* The operator's call was to move it.

### Consequences

`@aof/work` loses a directory (`src/examples/`) and a lane module. It gains three small seams that a
future practice can reuse. `yarn.lock` gains one workspace entry, which is not a third-party
dependency. The move changes the directory-budget rows in the same story.

## ADR-002 — `Rule:` blocks by default, one feature per rule as the fallback, and one notion of "group"

### Context

Research §7 Q4: should a map rule be a `Rule:` block inside a task feature, or a feature of its own?
RESEARCH R1 shows aof's binding is unaffected by `Rule:`. R6 shows no third-party runner exists here
to measure.

### Decision

1. **The default is `Rule:` blocks.** A task feature stays one coherent unit of work
   (`acceptance-criteria.md`, granularity), and its scenarios sit in one `Rule:` per map rule it
   illustrates. A rule's title starts with its map id: `Rule: R1 · <the rule>`.
2. **A scenario's group** is the `Rule:` it sits under, or its `Feature:` if it sits under no rule.
   A group *names* rule `R<n>` when its title starts with `R<n> · ` (the map's own separator).
   Every reader in this milestone asks about groups, never about `Rule:` directly.
3. **The fallback is one feature per rule.** A project whose runner does not bind `Rule:` writes one
   task feature per map rule, with the title `Feature: R1 · <the rule>` and no `Rule:` keyword.
   Because of §2, the trace (ADR-004) and the board (ADR-005) read this form the same way, so the
   fallback needs no code path of its own. `refine.md` names it (ADR-006).

### Alternatives considered

- *A feature per rule by default.* It splits a coherent task across files whenever one task
  illustrates two rules, and it multiplies task count. Kept as the fallback, not the default.

## ADR-003 — The parser learns `Rule:` as a grouping that owns its scenarios

### Decision

All changes are **additive keys** on `parseFeature`'s value (`packages/work/src/feature-parse.mjs`).
Today's keys and values stay identical for every feature with no `Rule:` and no `Example:`, which
is every delivered feature (RESEARCH R5).

1. **`scenarios[].rule`** is `{ name, line }` for the `Rule:` the scenario sits under, or `null`.
   **`rules`** is a new top-level list, `[{ name, line, tags }]`, in file order. A rule ends where
   the next `Rule:` or the end of file begins.
2. **A rule's tags have rule scope.** Tags read before `Rule:` belong to that rule and apply to every
   scenario in it, alongside the feature's tags: `effective = feature + rule + scenario`. They no
   longer leak onto the next scenario (RESEARCH R2). `tags` still lists every tag token, so the
   validate vocabulary check is unchanged.
3. **`Example:` is admitted** as a synonym for `Scenario:`, with `outline: false`
   (RESEARCH R3, Gherkin 6). The header comment's list of admissions grows by one, measured at 0.
4. **Examples blocks carry their cells.** `examples[].columns` holds the header cells and
   `examples[].cells` holds one array of trimmed cell strings per data row. `rows` is unchanged
   (RESEARCH R4).
5. **A `Background:` under a rule** stays legal and reads as today. Who owns a Background is not a
   grouping fact any reader needs.
6. The parser spells no map id. Reading `R<n> · ` and `E<n>` is the package's job (FF-13402).

## ADR-004 — The trace: an agreed example resolves by its id, inside its rule's group

### Context

SPEC: every `stated` or `confirmed` example resolves to a scenario or an Examples row, and a miss is
a doctor finding that names the example. Matching by value would be the inferred join that
54/ADR-006 refuses. A value written as prose in the map ("5 loans") never equals a step's text
("holding 5 loans").

### Decision

1. **The join is by declared id.** A scenario *carries* example `E<n>` when its name starts with
   `E<n> · `. An Examples row carries it when its cell under the column headed `example` is exactly
   `E<n>`. The readers for both, and for a group naming `R<n>`, are new exports of the package's
   `map.mjs`, so the grammar keeps one home (FF-13402).
2. **An agreed example resolves** when at least one scenario or row in the story's task features
   carries its id **and** sits in a group naming the example's rule. If it is carried only in the
   wrong group, it does not resolve, and the message says where the id was found. A `proposed`
   example may be carried and is never required.
3. **One more reader, in the lane that already reads the map:** a sixth code in the package's
   doctor lane, `example-untraced`. It is error-severity on the acceptance horizon (`severityFor`):
   `error` while the story is open, `warn` once it is `done`. It reads the row's `featureTexts`
   (already on every story row, `doctor/index.mjs:551`) through the one parser. The build door
   refuses on it like any other error (134/ADR-005 §4).
   - **Why not the rubric lane.** The SPEC says this belongs in "the existing traceability lint".
     The rubric lane (`doctor/rubric.mjs`) traces scenarios to test cases, and it is advisory by
     construction: its codes array is barred from every gate, and its comment explains why. An
     error code there would break that lane's contract. The examples lane already holds the map,
     the gate and the horizon. This follows the SPEC's intent (no sibling lint) and departs from
     its wording.
4. **When it applies.** All four must hold: the gate is on; the story has an `EXAMPLES.md` that is
   not "not applicable"; the story has at least one task feature; and at least one of those features
   has a group naming a rule id, which marks a contract formulated from the map. Otherwise the lane
   says nothing about tracing. So:
   - At refine's discovery stop no `tasks/` exists yet, so the trace cannot block the stage that
     writes the contract.
   - A contract written before 135 uses no rule ids, so it lints as today. This applies to
     delivered features, and to 144 (`in-review`, the only story with a map, RESEARCH R5). Whether
     144 should be held to the trace anyway is 135/04's business question, asked at the end review.
5. **What it does not check.** It does not check that the scenario's wording matches the map row;
   that is review's job. It does not report a scenario that names an id missing from the map.

### Consequences

A contract that removes **every** rule heading reads as pre-135 and the trace goes quiet. That is a
visible rewrite of the whole contract, which review catches, and the limit is stated rather than
engineered around, as 134/ADR-003 did for renumbering.

## ADR-005 — The board's feature view groups scenarios under their rule

### Decision

1. `aof work tasks` (`packages/work/src/commands/tasks.mjs`) adds `rule` (the rule's title, or
   `null`) to each scenario it projects. This is additive. `/api/work/tasks` carries it, and
   `TaskScenario` in `apps/ui/src/board/api.ts` gains `rule: string | null`.
2. The detail panel (`apps/ui/src/board/DetailPanel.tsx`) shows each rule as a heading over its
   scenarios, in file order. Scenarios outside any rule come first, because Gherkin puts them
   before the first `Rule:`, and show exactly as today. A feature with no rule shows exactly as
   today. The binding checklist is in `DESIGN.md`.

## ADR-006 — The Contract stage formulates from the map

### Decision

Only when the gate is on **and** the story's map is applicable. Otherwise formulation is unchanged
(SPEC out of scope).

1. **`refine.md`, story Contract, Formulation.** The PO reads the map first. It writes one `Rule:`
   per map rule, titled `R<n> · <rule>`, and under it one headline scenario per key example,
   titled `E<n> · <outcome>`. QA writes its outlines beneath, inside the same rule. A row that
   restates a map example carries the id in an `example` column. Where a map row and a table row
   say the same thing, the map row is the headline and the table keeps only the edges. The fallback
   (ADR-002 §3) is named for a runner that does not bind `Rule:`.
2. **`aof-product-owner.md` and `aof-qa.md`** each get the half that is theirs.
3. **`wiki/acceptance-criteria.md`** gets the level above its three zoom levels: key examples as the
   headline, the matrix for the edges, and the `Rule:` block as the place a map rule lives.
4. `packages/core/assets/manifest.json` hashes `refine.md` and both
   agent briefs, so the one story that edits them owns the manifest too.

## ADR-007 — Five stories: a package, a parser, a board, a trace, a prose

| Story | Owns | Depends |
|---|---|---|
| 01 the-practice-is-its-own-package | ADR-001: the move, the three seams, the budget rows, FF-13501 | none |
| 02 the-parser-reads-rule-as-a-group | ADR-003 | none |
| 03 the-board-groups-scenarios-by-rule | ADR-005 | 01 (shared budget file), 02 |
| 04 an-agreed-example-cannot-fall-out | ADR-004, FF-13502 | 01, 02 |
| 05 the-contract-is-formulated-from-the-map | ADR-006 | 01 (the discovery-beat suite's import) |

Waves: 01 and 02, then 03, 04 and 05 in parallel. Each later story declares 01's package paths as
forward references.

**Where the cuts fall.** `aof graph impact` (built 2026-10-03T10:31:53Z, code only, no egress, 18,029
nodes). The graph does not resolve `@aof/*` package specifiers, so importers that use a specifier
are under-reported. Those were counted by grep instead.

- 01 changes only `@aof/work`'s three seams and core's composition. Its callers are all
  injection-shaped already (core `bindings/work/doctor.mjs`, `bindings/commands/continue.mjs`,
  `bindings/run-store.mjs`), so the move stays inside one story.
- `feature-parse.mjs` has seven dependents: four sources (`commands/tasks`, `doctor/rubric`,
  `ratchet`, `validation`) and three suites, one of them FF-5704
  (`test/arch/work/acd-feature-parse-examples-additive.test.mjs`). FF-5704 pins the parser's value
  against a pre-Examples copy over the whole corpus, so 02 extends its additive-key stripper in the
  same story. No source reader has to change in 02. 03 and 04 each pick up the new keys on their
  own side.
- `examples/map.mjs` has six graph dependents, all inside `@aof/work` (the three seams, the lane,
  the answers reader and its suite). `commands/continue.mjs` and `doctor/examples.mjs` are each
  imported only by a core binding and a test support file. The move is contained.
- 03 is the only story touching `apps/ui`, and 05 the only one touching the bundle assets and the
  manifest.
- 04 writes only files 01 creates, so it waits for 01. Its tests extend the package's suites.

**The live run** (one mapped story refined and linted end to end) is the milestone's `@manual`
verification in `STATE.md`, not a story.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-13501 | **Dependencies run one way.** No module under `packages/work/src/**` imports `@aof/specification-by-example`, `packages/work/package.json` does not list it, and no comment-stripped `@aof/work` source spells `EXAMPLES.md`. pending | `test/arch/examples/acd-sbe-package-one-way.test.mjs` | ADR-001 §2, §3 |
| FF-13502 | **The trace is declared, never inferred.** The lane resolves an example only through `map.mjs`'s id readers over `parseFeature`'s value. No module in the package compares an example's text to a scenario's text or steps. pending | `test/arch/examples/acd-example-trace-declared.test.mjs` | ADR-004 §1 |
