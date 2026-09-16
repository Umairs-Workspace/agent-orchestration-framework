---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. Conditional (only if a non-trivial decision was made). Shared by the milestone's
  stories. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
-->
# 78 · The loop execution record — Architecture Decisions

## The measurement this milestone was refined against

Taken 2026-09-03, at refine, because `STATE.md` required it before any design: *"Refine should confirm
`brief.loop` is actually landing before designing against it — otherwise this milestone ships a
renderer for a field nobody writes."*

Over every run record under `wiki/work` (61 files, all types, whole history):

| fact | measured |
|---|---|
| run records on disk | **61** |
| records carrying `brief.loop` | **0** |
| records carrying an empty `brief` | 58 |
| records carrying `sessionId: null` | 61 |
| distinct loop declarations found | **0** |

Milestone 53 is `done` and the writer exists — `src/commands/loop.mjs:776` mints the `loopRunId`,
`:1065` builds the seven-key envelope, and `:512` reads it back by that key. The join is *implemented*
and, in this repository's entire history, *unexercised*: every item here was built through the
`/aof:*` prompt path, which never enters the loop shell. So `brief.loop` is a producer whose data set
is empty — the `run-store.heartbeat()` shape milestone 69 named, caught this time before the renderer
was designed rather than after.

This did not stop the milestone. It **inverted its primary case** (ADR-003).

## ADR-001: The record is a new document, `EXECUTION.md`, under the item — not a section of `VERIFICATION.md`

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `STATE.md` left this open and forbade a default: a new document is what the operator
asked for and reads better in a PR, but *"an id declared or cited in a `STATE.md` is invisible to
every register check"* (m66/`OUTCOME.md:130-131`), so a new document is unreadable by existing checks
until a frozen set is widened. A `## Loop execution` section inside `VERIFICATION.md` would be
checkable on day one and would sit beside `## Accept decision`, where the human already signs.

Both frozen sets were measured rather than assumed. `REGISTER_BLOCKS` is a four-entry list over three
files (`src/declared-id.mjs:128-133`); doctor's `CONVENTION_DOCS` is a three-entry list
(`src/work-doctor.mjs:137`) plus the per-type record doc. Widening either is a one-line change.

**Decision.** A new document, `EXECUTION.md`, in the item's own folder, alongside `ARCHITECTURE.md`
and `VERIFICATION.md`.

The decisive reason is not readability — it is the **writer boundary**. `VERIFICATION.md` is authored
by `aof:verify` with the product-owner as single writer; evidence agents report and never author
there. A machine writer that must regenerate one section of that document, byte-identically, while a
human is editing the sections around it, is a strictly worse contract than one that owns a whole
file. "Replace exactly these bytes and leave the human's bytes alone" is the hardest form of the
idempotence requirement ADR-002 has to meet, and it would be self-inflicted.

The "invisible to checks" objection is real and is answered by scope rather than by widening: this
milestone ships its own shape check (story 03), which reads the file directly. Adding `EXECUTION.md`
to the generic register machinery would make **every** item owe the document; only items that ran
loops owe it. Doctor reads it **when present** and never demands it.

**Alternatives considered.**
- *A `## Loop execution` section in `VERIFICATION.md`* — rejected on the writer boundary above. Its
  genuine advantage (checkable on day one) costs less to replicate than its cost to absorb.
- *A section in `STATE.md`* — rejected outright: `STATE.md` is the narrative, and its ids are
  invisible to every register check by the finding cited above.
- *Under `observability/`* — rejected. That folder's own header disclaims it as *"safe to delete or
  `.gitignore`"*, which is precisely the fate `SPEC.md` cites as the reason this record exists.
- *Under `runs/`* — rejected. `runs/` is DERIVED and wholly rebuildable (19/ADR-002); a document
  carrying a human signature is the one thing in this milestone that is not rebuildable.

**Consequences.** The record is a peer of the item's other record documents and is committed with the
work. No existing frozen set moves. A future decision to widen `REGISTER_BLOCKS` to it stays available
and additive.

**Invariant.** The record is written only under the item's own folder. → FF-7810.

## ADR-002: The record is a face over a registered command; the signature is the one thing not derived

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `SPEC.md` binds this milestone to the milestone-08 spine: the document is derived from a
registered `work:*` command with a stable `--json` contract, is byte-identical on unchanged inputs,
and is never a second source of truth. But a human signature is by construction *not* derivable from
any input, so a naive regeneration destroys the only part of the document that is not machine-made.

**Decision.** One registered command whose **bare face is a READ** — it resolves the model and emits
it, touching no disk — with `--write` as the only door to the filesystem. This is the `work:grade`
idiom (`--run` as the only door to execution, 54/ADR-003 §2), and it is chosen for the same reason:
a face that writes by default cannot be composed by anything that only wants to look.

The signature survives regeneration by being **read back before it is written**. `--write` parses the
existing document's sign-off table, carries every signed row forward verbatim, and re-renders
everything else from the model. So the derived half is always fresh and the non-derived half is never
lost — and the file remains a face, because nothing anywhere resolves an execution fact *from* it.

**Alternatives considered.**
- *Regenerate wholesale and require re-signing* — rejected: it makes every regeneration destroy
  operator work, which trains operators not to regenerate.
- *Keep signatures in a sidecar* — rejected: a second store to keep in step, and 53 already argues
  against exactly that shape (a document some second store would have to keep in step).

**Consequences.** The writer is a read-modify-write, not a truncate-and-emit, and its correctness has
two independent obligations that story 02 owns jointly: byte-identity on unchanged inputs, and
signature preservation across a change.

**Invariants.** Regeneration is byte-identical on unchanged inputs → FF-7803. A signed row survives
regeneration verbatim → FF-7804. No read path resolves loop facts from the document → FF-7805.

## ADR-003: Honest absence is the PRIMARY rendering, and the record carries its own join coverage

**Status:** Accepted
**Date:** 2026-09-03

**Context.** The measurement above: 0 of 61 run records carry `brief.loop`. `SPEC.md` anticipated the
possibility — *"if 53 has not populated it, this milestone renders the absence honestly and says
so"* — and treats it as a contingency. It is not a contingency. It is the state of **every item in
this repository today**, and therefore the state the record will be in on the day it ships.

**Decision.** The empty rendering is the primary case, specified and tested first, not an edge case
handled last. And the record states its own join coverage as a fact on the page: how many run records
were found for the item, how many carried a loop declaration, and the resulting ratio.

A record that renders nothing without saying why is indistinguishable from a broken renderer — and is
the observability report over again, which is the failure `SPEC.md` opens by naming. A record that
says *"14 runs, 0 carried a loop declaration — nothing that executed for this item named a loop"* is a
finding an operator can act on.

**Alternatives considered.**
- *Block the milestone until `brief.loop` has data* — rejected. The instrumentation belongs to 53,
  which is `done`; what is missing is not code but exercise of the loop shell against this repo's own
  work. Waiting would park a built renderer behind an operational habit.
- *Render an empty document and let the reader infer* — rejected by the argument above.

**Consequences.** The milestone is acceptable with zero loop coverage in the repository, and its
acceptance evidence must include both a zero-coverage item and a populated one (a fixture, or one
real item driven through `aof work loop` once). Story 00's contract carries both.

**Invariant.** Coverage is always stated, including when it is zero → FF-7801's projection contract.

## ADR-004: A capped loop and an uncapped one must not produce the same record

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `SPEC.md` states the requirement and the current failure in one line: *"A `ceiling:
uncapped` loop and a capped one must not produce identical records; today they do."* The registry's
own honesty problem is adjacent and is **not** this milestone's to fix — `STATE.md` routes it to 55:
`ceiling: none` is silent while `unknown` and `uncapped` warn, so "terminates by construction" is
indistinguishable in the registry's output from a machine-verified bound.

**Decision.** The projection reads the declared `ceiling` from the registry record and the cycles
observed from the run declarations, and renders them **together, per loop**, so the pair is legible:
cycles observed against the ceiling declared. The three non-numeric ceilings — `uncapped`, `unknown`,
`none` — are rendered as three distinct, named states, never collapsed to "no limit".

This milestone renders the distinction it can see. It does not repair the registry check that fails
to warn on `none`; that stays 55's, and the record's honest display of `none` as its own state is what
makes the gap visible rather than what closes it.

**Consequences.** Two loops that ran identically but declared different ceilings produce visibly
different records, which is the requirement. The record does not assert that a bound was *respected* —
only what was declared and what was observed; the judgement stays with the reader and the signature.

**Invariant.** Ceiling states are distinguishable in the rendered record → FF-7806.

## ADR-005: Three named gap classes — absence is stated, never omitted

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `SPEC.md` requires the record to name *"a loop that ran and is not declared, a declared
loop that never ran, an authority that could not be resolved"*, on the principle that absence is the
finding.

**Decision.** Exactly three gap classes, named in the projection and rendered as their own section:

- **ran-undeclared** — a `brief.loop` declaration whose loop id resolves to no registry record.
- **declared-never-ran** — a registry loop in scope for the item with no run carrying its id.
- **authority-unresolved** — a loop that ran whose registry record cites an actuator or reference
  owner the endpoint grammar cannot resolve.

They are three because they have three different remedies: instrument the loop, drive it, or fix the
registry. A single "gaps" bucket would erase that.

**Consequences.** `declared-never-ran` is loud today by construction (every declared loop, for every
item), which is correct and is exactly the finding ADR-003 wants surfaced rather than hidden. Its
volume is bounded by the registry's size (17 records), not by the work stream's.

## ADR-006: A new renderer that IMPORTS the frozen glyph table — `renderLoopGraph` is not touched

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `renderLoopGraph`'s bytes are frozen by 52/FF-5208 across ten structural-duplicate
scenarios, and `SPEC.md` puts extending it out of scope. Measured coupling today
(`aof graph impact`, graph built 2026-09-03T16:13:42.918Z, 15068 nodes / 36722 edges):
`src/commands/loops-graph.mjs` has **4** dependents — `src/command-core.mjs` and three arch tests —
and imports only `src/command-error.mjs` and `src/work-loops.mjs`. It is the cheapest module in the
repository to leave alone.

**Decision.** A new renderer, in its own module, for the item-scoped graph. It reuses 52's conventions
by restatement — `flowchart LR`, code-unit sort, collision-safe node keys — with one exception: the
**glyph table is imported, not restated**. `KIND_SHAPES` is already an export
(`src/commands/loops-graph.mjs:32`), and a second hand-copied glyph table is a guaranteed future
drift: 58 and 59 each added a kind, and each would then have had two tables to find.

Importing a frozen export changes none of its bytes, so FF-5208 is untouched; it is a read.

**Alternatives considered.**
- *Extend `renderLoopGraph` with a scope parameter* — rejected: out of scope by `SPEC.md`, and it
  would put a branch inside ten frozen scenarios.
- *Restate the glyph table* — rejected on the drift argument above.

**Invariant.** One glyph table serves both faces, and the frozen module is unmodified → FF-7802.

## ADR-007: The record does not gate. An unsigned record reports at `warn`

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `STATE.md` left this open with a real argument on both sides. For: an unsigned record is
the observability report again — generated and ignored. Against: 66 faced precisely this and declined
(*"the measure→decide path already works through a human"*, `66/SPEC.md:80-81`), and 59's thesis is
that an agent-generated record a human rubber-stamps *"may be worse than none, because it launders a
machine claim as human judgement."*

**Decision.** No gate. `aof work doctor` reports an unsigned or stale record at **warn**; a warn-only
doctor result does not fail `aof:validate`, and that is the intended strength rather than a weakness.

A third argument, available only after this refine's measurement, settles it: at 0% join coverage
**every** record in this repository would be empty, so a gate would refuse every accept from day one
over a fact no operator can currently supply. A gate whose first act is to block the whole stream is
not a gate, it is an outage.

Recorded for the future so it is not re-derived: if this ever *does* gate, the gate belongs on
`aof work status <ref> done` — story 73's door — and never on a prompt.

**Alternatives considered.**
- *Gate `done` on a signature* — rejected on all three arguments above.
- *Report nothing* — rejected: then the record is unread by construction, which is the failure mode
  the milestone exists to avoid.

**Invariant.** No status, doctor, validate or acceptor door reads the signature as a verdict →
FF-7808.

## ADR-008: The command is board-deferred — and `SPEC.md`'s board-reachability scope item is withdrawn

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `SPEC.md` puts in scope: *"`work:loops-*` becomes board-reachable … A record nobody can
reach from the board is half a deliverable."* That was true when 78 was written. It is no longer:
**chore 64 is `done`, and it closed the gap in the opposite direction.** All four loop commands are
now members of the `BOARD_DEFERRED` carve-out
(`test/arch/acd-work-command-route-coverage.test.mjs:143-160`) and present in the frozen `WORK_IDS`
(`test/command-core-contract.test.mjs:116-119`), with the reasoning recorded in place:

> *"a board face for this family is not a deferral awaiting a decision — it is a decision already
> recorded at 53's gate"* — because 52/FF-5202 asserts `ui/` never references the loop family, so a
> served `/api/work/loops-*` would be a door no UI is permitted to open.

**Decision.** The scope item is **withdrawn**. `work:loop-record` joins the same carve-out for the
same reason, with its own entry documenting the deferral. The board reaches the record the way it
reaches everything else in this family: not at all — the operator reads a committed markdown file,
which `SPEC.md` itself names as the surface (*"A markdown file the operator already has in their
editor is the surface"*).

**Consequences.** Story 02 adds one `BOARD_DEFERRED` member and one `WORK_IDS` entry, and no
`/api/work` route. `ui/` is untouched, so 52/FF-5202 stays green without being re-pinned.

**Invariant.** `work:loop-record` is a documented `BOARD_DEFERRED` member and no
`/api/work/loop-record` route exists → FF-7807.

## ADR-009: The execution family is named apart from the registry family — FF-5201's read-only law is preserved by construction

**Status:** Accepted
**Date:** 2026-09-03

**Context.** This is the constraint that decides the module names, and it is not stylistic. 52/FF-5201
**discovers** loop modules from disk by two patterns — `src/work-loops*.mjs` and
`src/commands/loops-*.mjs` — asserts the discovered set equals its expected six, and then asserts that
**every discovered module contains no write call form**
(`test/arch/acd-loop-registry-not-an-item-type.test.mjs:27-36, :70-75`). Its own comment names this
milestone's shape as the case it exists to catch: *"a future … writer `src/commands/loops-init.mjs`"*.

A command named `work:loops-record` in `src/commands/loops-record.mjs` would therefore be red twice
over — once for changing the discovered set, once for writing.

**Decision.** The new modules are named into the **execution** family, not the registry family:

| module | role | matches FF-5201's patterns |
|---|---|---|
| `src/loop-record.mjs` | the pure projection (story 00) | no |
| `src/loop-record-render.mjs` | the pure renderer (story 01) | no |
| `src/commands/loop-record.mjs` | the command and the writer (story 02) | no |

This is not an evasion of the gate; it is the distinction the gate encodes. The repository already
separates the two families exactly this way — `src/work-loop.mjs` (the execution shell's pure leaf),
`src/loop-bounds.mjs` and `src/loop-progress.mjs` all sit outside FF-5201's reach, while
`src/work-loops.mjs` and `src/work-loops-checks.mjs` sit inside it. The **registry** is framework data
and is read-only by law; **executions** are per-item facts that live in run records under the item.
This record is of the second kind, so it takes the second family's name.

Confirmed by measurement at refine: `work-loop.mjs`, `loop-bounds.mjs`, `loop-progress.mjs` and
`loop-record.mjs` are all disjoint from `^work-loops.*\.mjs$`.

**Consequences.** FF-5201's expected-module list is **unchanged** by this milestone, and its read-only
sweep is neither widened nor weakened. Story 00's and 01's leaves are pure anyway (FF-7801), so the
naming is belt and braces rather than a way to hold a writer somewhere the sweep cannot see it — and
FF-7810 asserts the write scope independently.

**Invariant.** No module this milestone adds matches FF-5201's discovery patterns, and its expected
list is untouched → FF-7810.

## ADR-010: This milestone owns the generated-document discipline; story 79 inherits it

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `SPEC.md` has 78 `depends: [79]` and expects to inherit three things from it: where a
generated document lives, the writer's idempotence discipline, and the regenerate-and-diff drift
check. **Story 79 is `not-started` and unrefined.** Refining 78 against three decisions that do not
exist yet would either block this milestone or invent them silently.

**Decision.** The three are decided **here** — ADR-001 (where), ADR-002 (idempotence), FF-7803 (drift)
— and 79 inherits them. 78 is the strictly harder case: per-item scope, a preserved human signature,
and a primary rendering of absence. A discipline that covers it covers 79's repo-wide declared graph,
and the reverse is not true.

The dependency edge stands and the ordering preference in `SPEC.md` is unchanged: 79 needs nothing
from 53 and should still land first if the operator sequences it that way. Either order works — if 79
lands first it implements these ADRs; if 78 lands first, 79 conforms to them. What is removed is the
possibility of both milestones deriving the same three answers independently and differing.

**Consequences.** 78 can be built without 79 having shipped. Whichever lands second cites these ADRs
rather than re-deciding.

## Fitness functions

<!-- The declaring register. The id stands ALONE in the first cell. Every entry names its path in
     the runnable test tree. ALL TEN HAVE NOW LANDED and each carries `green`, with its red probe
     recorded in VERIFICATION.md's citing register at the story gate that delivered it: FF-7801 at
     78/00, FF-7802 and FF-7806 at 78/01, FF-7803/7804/7805/7807/7810 at 78/02, and
     FF-7808/FF-7809 at 78/03. The `pending` token this register opened with reported at warn while
     the controls were unwritten; none remains. -->

| id | invariant | enforced by | source | status |
|---|---|---|---|---|
| **FF-7801** | The projection is pure — `src/loop-record.mjs` reaches no `node:fs`, no clock and no spawn through its direct imports; it computes over injected records only. | `test/arch/acd-loop-record-projection-pure.test.mjs` | ADR-002, ADR-003 | `green` |
| **FF-7802** | One glyph table serves both faces — the new renderer imports `KIND_SHAPES` and restates no glyph, and `src/commands/loops-graph.mjs` is byte-unmodified by this milestone. | `test/arch/acd-loop-record-renderer-additive.test.mjs` | ADR-006 | `green` |
| **FF-7803** | Regeneration is byte-identical on unchanged inputs, across separate processes. | `test/arch/acd-loop-record-idempotent.test.mjs` | ADR-002, ADR-010 | `green` |
| **FF-7804** | A signed sign-off row survives regeneration verbatim; every other line is re-derived. | `test/arch/acd-loop-record-signature-preserved.test.mjs` | ADR-002 | `green` |
| **FF-7805** | The record is a face, never a second truth — no read path resolves a loop execution fact from `EXECUTION.md`; every consumer reaches the registered command. | `test/arch/acd-loop-record-is-a-face.test.mjs` | ADR-002 | `green` |
| **FF-7806** | Declared-ceiling states are distinguishable in the rendered record — a capped loop and an `uncapped` / `unknown` / `none` loop do not render identically. | `test/arch/acd-loop-record-ceiling-legible.test.mjs` | ADR-004 | `green` |
| **FF-7807** | `work:loop-record` is a documented `BOARD_DEFERRED` member and no `/api/work/loop-record` route exists. | `test/arch/acd-loop-record-board-deferred.test.mjs` | ADR-008 | `green` |
| **FF-7808** | The record never gates — no status, doctor, validate or acceptor door reads the signature as a verdict, and doctor's findings for it carry severity `warn`. | `test/arch/acd-loop-record-never-gates.test.mjs` | ADR-007 | `green` |
| **FF-7809** | The sign-off block is frozen — the `h2`, the table header, and the id alone in the first cell. | `test/arch/acd-loop-record-signoff-shape.test.mjs` | ADR-001, m66/ADR-001 | `green` |
| **FF-7810** | Write scope — the writer writes only under the item's own folder, no code path writes under the loop registry directory, and no module added by this milestone matches FF-5201's discovery patterns. | `test/arch/acd-loop-record-write-scope.test.mjs` | ADR-001, ADR-009, m52/FF-5201 | `green` |

## Story boundaries, and the coupling they were drawn from

Drawn from `aof graph impact` over a graph built fresh at refine
(2026-09-03T16:13:42.918Z — 15068 nodes, 36722 edges, egress none):

| module | dependents | consequence for the partition |
|---|---|---|
| `src/work-loops.mjs` | **55** | A read hub — the four loop commands, acceptor, audit, tune, trigger and 46 test files. Every story **reads** it; none modifies it. |
| `src/run-store.mjs` | **60** | The same, one family over. Read through it; never change it. |
| `src/commands/loops-graph.mjs` | 4 | Tightly bounded and frozen — ADR-006's "leave it alone" costs nothing. |
| `src/work-doctor.mjs` | 21 | `CHECK_GROUPS` is an append seam; story 03 appends one lane, as 66/02 and 54/04 did. |
| `src/command-core.mjs` | — | The single registration point; story 02 alone touches it. |

The cut that follows: **stories 00 and 01 are pure leaves that import nothing shared** — they take
injected records and return a model and bytes respectively, so they can be built and reviewed in
parallel against a shape this document fixes. **Stories 02 and 03 own the edges** — 02 the filesystem
and the command registry, 03 the doctor lane and the frozen sign-off shape — and each touches a
different shared file, so they do not collide with each other either.

A boundary that put the renderer with the command would have coupled byte-determinism (a pure,
exhaustively testable contract) to the filesystem, which is the one thing FF-7803 must be able to
assert without standing up a workspace.
