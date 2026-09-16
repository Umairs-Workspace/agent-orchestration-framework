---
doc: verification
updated: 2026-09-03
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 79 truly done, and what is the evidence?
  Written at aof:verify 79. Only sections with content appear (absence is information).
  Standalone story (parent: null) → this is the story's own verification record; there is no milestone
  SPEC box to tick. It DOES carry an OUTCOME.md — story 80 (`done`) widened that artifact from
  milestones to every delivering item.
  NO @uat scenarios → no ## User sign-off section (no human was pestered).
  NO UI surface (a CLI + generated-document concern, no DESIGN.md, no Route) → no design-conformance
  lane and no ## Design conformance section.
  NO ## Fitness functions register → story 79 is standalone and declares no ARCHITECTURE.md, so it
  declares no `FF-NN` id for a citing register to resolve to. The red probe that matters is recorded
  in evidence instead, against the gate it was run on.
-->
# 79 · The committed loop graph — Verification

## Method

Lanes in scope: **`@executable` only**, all four task features (`@executable @docs/@cli @work
@work-stream/@validate`). No `@manual`, no `@uat`, no UI surface — so no human was brought in and no
design-conformance render was attempted.

The suite was run **focused**, never as the whole repo lane: `global-work-propagation.test.mjs` binds
`:4182`, which this machine's live control daemon holds, and a full run on this node is a known false
signal. Selection was by `node scripts/test.mjs --only <file …>`, which imports the named files and
runs what they export through the runner's own `runSuite()` — so per-case global-home isolation still
applies. Every run carried a throwaway `AOF_GLOBAL_HOME` (hook-enforced).

Selection was widened past the story's own suites by **who reads what this story touched**: the two
frozen lists it moves (`WORK_IDS`, `BOARD_DEFERRED`), the CLI bijection that spawns every registered
verb as a real subprocess, and the whole 52 loop-registry gate family whose read-only law the new
writer had to be named around.

The live probes below were run against **this repository**, through the working tree's own `src/`
(bare `aof` on PATH symlinks to it), so they exercise the shipped behaviour rather than a fixture.

## Verification evidence

### Automated — **133 / 133 green, 0 failures, exit 0**

One selection, 17 suite files:

```
AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only \
  test/loop-document.test.mjs test/loop-document-command.test.mjs \
  test/arch/acd-loop-document-{current,write-scope,board-deferred,idempotent}.test.mjs \
  test/arch/acd-work-command-{route-coverage,cli-bijection}.test.mjs \
  test/command-core-contract.test.mjs \
  test/arch/acd-loop-{registry-not-an-item-type,render-deterministic,module-import-boundary}.test.mjs \
  test/arch/acd-loop-{graph-kind-legible,finding-envelope,suite-registration}.test.mjs \
  test/arch/acd-test-suite-registration.test.mjs test/work-loops-commands.test.mjs
```

**43 story-owned cases**, covering all 38 authored scenarios:

- **`test/loop-document.test.mjs`** — `loop-document/00` ×10. The composer: the fenced `mermaid`
  block carrying exactly the exported renderer's bytes, the generated marker as line 1 with no
  frontmatter before or after it, the health summary's counts, all five registry-state rows of the
  Scenario Outline (including "no registry directory present"), in-process determinism, purity (no
  clock, no filesystem, no environment — byte-identical from a different cwd), and the
  node-count-vs-visual-nodes reconciliation.
  `verifies → tasks/00_the-document.feature`
- **`test/loop-document-command.test.mjs`** — `loop-document-command/01` ×12, one per scenario. The
  bare face writing nothing; `--write` creating at the derived path; the path following a
  non-default `work.dir`; no caller-supplied output path in the input contract; byte-identity
  in-process and across separate processes; all six rows of the "a registry change moves the bytes"
  Outline; the one-file write scope; the registry left byte-identical by both faces; the honest
  absent-registry rendering at exit 0; the `--json` report; and the part-way write failure leaving
  the previous document intact with no temp file beside it.
  `verifies → tasks/01_the-writer-and-its-one-home.feature`
- **`test/arch/acd-loop-document-current.test.mjs`** — `arch/79/02` ×8, one per scenario. The drift
  gate itself, plus its own boundary: it writes nothing, it reports an absent document rather than
  passing it, it obtains its bytes through the registered command's composition (restating no part of
  the document's shape), it gates the suite and **nothing** in the work lifecycle, and its last entry
  asserts its own membership in the runner from inside the runner's process.
  `verifies → tasks/02_the-drift-check.feature`
- **`test/arch/acd-loop-document-board-deferred.test.mjs`** — `arch/79/03` ×6: registered exactly
  once and reachable beside the other loop verbs; the CLI face and the registry entry agreeing as a
  real subprocess; the documented `BOARD_DEFERRED` membership with its recorded reason and no served
  route; `ui/` carrying no token naming the command, its modules or its id; no ACD bundle wrapper
  owed; and all five loop verbs leaving a fixture registry byte-identical.
  `verifies → tasks/03_registration-and-the-name-that-is-forced.feature`
- **`test/arch/acd-loop-document-write-scope.test.mjs`** — `arch/79/01` ×4: exactly one file created
  or modified at the one derived path; no module this story adds matching either of FF-5201's
  discovery patterns, with its expected module list unchanged; FF-5201's read-only sweep neither
  widened nor weakened; and the composer proven a pure leaf through its direct imports.
  `verifies → tasks/03` §"the module names sit outside the registry family's discovery patterns",
  `tasks/01` §"the write scope is exactly one file", `tasks/00` §"composition reaches no clock…"
- **`test/arch/acd-loop-document-idempotent.test.mjs`** — `arch/79/01` ×3: byte-identity in-process,
  byte-identity across separate processes, and a changed registry as the ONLY thing that moves the
  bytes.
  `verifies → tasks/01` §"regeneration is byte-identical …"

Two scenarios are held by controls that already existed rather than by a story-owned case, which is
the intended shape — the story moves a frozen list, so the list's own gate is what must admit it:

- `tasks/03` §"the frozen command census admits the new id" → **`command-core/00` "the registry
  exposes exactly the known work commands"** (`test/command-core-contract.test.mjs`), which now
  carries `work:loop-document` on both sides.
- `tasks/00` §"the frozen renderer is left byte-unmodified" is asserted at runtime by
  `loop-document/00` (no write call form in `src/commands/loops-graph.mjs`; its input contract still
  exactly `["format"]`, `additionalProperties: false`) and at the diff level below.

### Regression on the surfaces the contract named — **90 / 90 green**

Every surface the story declared as its own blast radius was re-run rather than assumed:

- **`arch/52` ×9** — the loop-registry gate family (`acd-loop-registry-not-an-item-type`,
  `acd-loop-render-deterministic`, `acd-loop-module-import-boundary`, `acd-loop-graph-kind-legible`,
  `acd-loop-finding-envelope`). FF-5201's discovered-module set, its read-only sweep, FF-5202's
  `ui/`-never-references-the-loop-family assertion and FF-5208's determinism/glyph freeze are all
  green with the new modules on disk. This is the gate that **forced the name**, so it is the gate
  that had to be re-run.
- **`arch/15` ×7** — the route/CLI bijection: every registered `work:*` command carries a CLI
  adapter, is CLI-reachable, and `aof work <sub> --json` runs cleanly and emits parseable JSON for
  every registry-derived subcommand. `loop-document` is spawned here as a **real subprocess** with
  its bare (read) face — which is what makes "the bare face writes nothing" a load-bearing rule
  rather than a stylistic one.
- **`command-core` ×26** — the frozen `WORK_IDS` census and the whole command-core contract.
- **`loops-commands` ×26**, **`arch/53` ×12**, **`arch/58` ×4**, **`arch/47` ×2**, **`arch/43` ×2**,
  **`arch/57` ×1**, **`arch/ADR-004` ×1** — the loop command family's own behavioural suite and the
  suite-registration controls, re-run because `scripts/test.mjs` was edited.

**Zero new reds, and no inherited red in the selection.**

### Structural gates — no `FF-NN` id, and that is a decision

The four `test/arch/acd-loop-document-*.test.mjs` gates carry no `FF-NNNN` id. Story 79 is a
standalone story with no `ARCHITECTURE.md`, so an id here would be one no register declares — the
"invisible to every register check" shape 78/ADR-001 is written about. Each gate names the story and
the task whose criteria it mechanises instead, and `scripts/test.mjs` records the reasoning at the
import. Consequently this document carries **no `## Fitness functions` citing register**: there is no
declaration for it to resolve to, and `aof work doctor` raises neither `verification-register-missing`
nor `control-unresolved` for this item.

### Red probe of the drift gate — run against the REAL registry, not a fixture

The drift check is this story's payoff, so it was made to fail on purpose, on the bytes that shipped:

1. `.aof/loops/build-to-green.md` — `title: Build executable work to green` → `… (DRIFT PROBE)`.
   Nothing else touched; the document was **not** regenerated.
2. `node scripts/test.mjs --only test/arch/acd-loop-document-current.test.mjs` →

   ```
   not ok - arch/79/02 the committed loop document matches a fresh render of this repository's registry
   AssertionError: The committed loop document wiki/work/loops.md is STALE — a loop record changed
   and the document was not regenerated. Run `aof work loops document --write`.
   ```

   The failure names the committed document **and** the command that regenerates it — the
   "fail loudly and usefully" criterion, observed rather than asserted.
3. `git checkout -- .aof/loops/build-to-green.md` → sha256 back to `2592c921…`,
   `git status --porcelain .aof/loops/` empty, gate re-run **8 / 8 green**.

The gate's own suite already runs the same probe over a fixture registry across seven drift kinds
(record added/removed, edge added/removed, title changed, ceiling changed, finding-raising edge). This
probe adds the one thing a fixture cannot: that it reds on **this repository's** registry and
document.

### Live exercise of the new surfaces — against this repository

- `aof work loops document --json` (the bare face) →
  `{ path: "wiki\\work\\loops.md", written: false, changed: false, existed: true, nodeCount: 17,
  edgeCount: 23, … }`, 9,979 bytes of text emitted. sha256 of `wiki/work/loops.md` **unchanged**;
  `git status --porcelain` unchanged at 23 entries. **The read touched no disk.**
- `aof work loops document --write --json` → `written: true`, `existed: true`, **`changed: false`**,
  `regenerate: "aof work loops document --write"`, and the summary the page states:
  `{ error: 0, warn: 33, checks: { grounding: 11, anchor-grounding: 4, pairing: 0,
  reference-ownership: 0, actuator-arbitration: 0, timescale: 0 } }`. sha256 **byte-identical** to
  before the write. Idempotence proven at the source, not in a fixture.
- `wiki/work/loops.md` on disk: 229 lines, first line `<!-- aof-generated: \`aof work loops document
  --write\` — do not edit by hand -->`, no frontmatter, one fenced `mermaid` block, a `## Health`
  section carrying 17 records / 23 edges / `0 error, 33 warning` with the per-check split, and the
  stated reconciliation between declared-record count and drawn endpoints.
- `git status --porcelain src/commands/loops-graph.mjs` → **empty**. The frozen renderer is
  byte-unmodified across the whole story, at the diff level — which is the half of task 00's
  "byte-unmodified" claim the runtime gate cannot reach, and the open question the review close
  raised (see R2).

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-79-A | The story's declared `files:` write set omitted `test/support/loop-document-fixture.mjs` — the shared fixture repo both new behavioural suites and all four structural gates stand up. Additive and test-only, but the declared set was incomplete, so the next reader's map of the change set was wrong. | record accuracy | non-blocker | **PO (inline): repaired here, not deferred.** The review close asked for a repair "at refine"; refine does not run again on a story being accepted, and `aof:verify` owns the record docs — so it was fixed at this gate instead of being carried as a known-wrong record. | this story's own `STORY.md` frontmatter | **closed** |
| F-79-B | `aof work doctor 79` reports `numbering-gap` naming **79** — with 29, 30, 31, 42, 65, 73, 74, 80, 81, 83–87 — as missing from the top-level driver sequence. `isDriver` is milestone/uat/spike/chore, so **every parentless story reads as a gap** (`src/work-doctor-freshness.mjs:198-201`). | advisory noise | non-blocker | Defer. Pre-existing and repo-wide (15 items), and the **same root cause** as `65/F-65-C` — the same `isDriver` predicate also hides parentless stories from `aof work next`'s walk. Fixing it inside 79 would widen a story scoped deliberately. | backlog — carried on `65/F-65-C` | open |
| F-79-C | `aof work doctor 79` reports `rubric-join-unchecked`, so the scenario↔case join was **never machine-checked** for this item. The cause is not the missing key the message names: `.aof/aof.config.json` **does** declare `work.rubric.report` (`{ format: "tap", floor: 500 }`), but `declaredReportFrom` requires `report.path` to be a non-empty string (`src/work-doctor-rubric.mjs:86-90`), so it resolves to `null` and the lane reports its honest no-op — with a message that reads as "you configured nothing". | config gap + misleading message | non-blocker | Defer. Repo-wide (it fires for every item carrying `@executable` scenarios), not this story's to fix, and the lane is behaving as designed — it reports that it did **not** check rather than passing. The join was therefore done **by hand** at this gate: all 38 authored scenarios mapped to named cases, recorded above. | backlog | open |

Triage (PO, inline): **no blocker finding is open, and no design-gap finding is open.** F-79-A is
closed by repair. F-79-B and F-79-C are both pre-existing repo-wide advisories surfaced at this gate,
neither caused by nor fixable within this story's scope. Findings live here, never in a task folder.

## Gate

- `aof work validate 79` → **PASS — 79 is well-formed.**
- `aof work doctor 79` → 2 findings, both `warn`, both deferred above (F-79-B, F-79-C). **No
  `control-unresolved` at either severity** — this item declares no controls, so there is none to
  resolve. `doc-over-budget` on `STORY.md` (151 > 150) was raised on the first pass and is **cleared**:
  acceptance is the one place the artifact budget binds (`src/commands/item-status.mjs:96-114` would
  have refused the transition with `artifact-budget-exceeded`), and the record was brought to 149
  lines by deleting a refine-time parenthetical that had since become false — it claimed the mesh
  cache still reported chore 64 as `not-started`, and `aof work find 64 --json` now answers
  `status: "done", answeredFrom: "disk"`.
- `aof work doctor 79` Loop-Ready: **80% (8/10) — clears L1**; blocking entries are `grounding` and
  `anchor-grounding`, which are registry-content gaps routed to 55/57 and explicitly out of this
  story's scope.

## Accept decision

**ACCEPTED — 2026-09-03.**

All four task contracts are green: **38 / 38 authored scenarios** mechanised across 43 story-owned
cases, **133 / 133** in the selection with zero failures and zero inherited reds, and every surface
the contract named as its own blast radius re-run rather than assumed — including the whole 52
loop-registry gate family whose read-only law forced the writer's name.

What is claimed here is claimed **at the source**, not from a fixture: the committed
`wiki/work/loops.md` matches a fresh render of this repository's registry; `--write` against this repo
reports `changed: false` with a byte-identical file; the bare face wrote nothing and left `git status`
unmoved; the frozen `src/commands/loops-graph.mjs` is byte-unmodified in the diff; and the drift gate
was **made to red** on the real registry with a message naming the document and the command that
regenerates it, then restored byte-identically and re-run green.

`aof work validate 79` **PASSES**. No `@uat` scenarios exist, so no human was pestered. No UI surface,
so no design lane. The governance test milestone 52 named and stopped one step short of is now met
literally: a change to a loop record that is not regenerated **reds the suite**.

A standalone story → **status: done**, with two deferred repo-wide advisories (F-79-B, F-79-C) and
none of its own left open.
