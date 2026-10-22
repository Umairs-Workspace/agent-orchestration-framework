---
doc: architecture
---
# 168 · A prototype builds something fast — Architecture Decisions

Recall `a6b09ba9-1a98-4d99-8580-272aa92af247` (architect, `--area architecture`) surfaced five
records. Two bear on these decisions and one is departed from on purpose:

- **m41/ADR-002** (re-indexing is mechanical CLI work, prose stays with the prompt) is
  **honoured** by ADR-004. `aof work prototype` writes numbers, dates, statuses and log lines;
  the session writes the intent, the hand-off and the shortcuts.
- **m37/ADR-001** (spike and chore are top-level drivers, treated the `uat` way) is
  **departed from** by ADR-001. A prototype sits at the root like a spike, but it is not a
  driver: nothing may depend on it and the loop never offers it.
- **m37/ADR-003** (the engine is only a structural validator, and the per-type lifecycle lives in
  the skills) is **departed from** in one place by ADR-003. A prototype's four status words and
  their moves are declared in the engine, because validate has to accept those words and the
  status writer has to refuse an illegal move. Everything else about the lifecycle stays in the
  bundle command.

m13/ADR-004 and m05/ADR-002 were also returned. Neither bears on these decisions.

**Measured at refine (2026-10-22, read-only).** The item-type grammar has one home,
`ITEM_RE` (`packages/work/src/identity.mjs:14`), with `BACKLOG_ITEM_RE` beside it at `:22`. The
type-to-record-doc map does not have one home. It is spelled four times: `recordDoc`
(`packages/work/src/records.mjs:22-34`), `recordDocFor` (`packages/work/src/doctor/coherence.mjs:59-71`),
`recordDoc` (`packages/work/src/doctor/index.mjs:92-103`) and the ratchet's own
(`packages/work/src/commands/ratchet.mjs:39-40`). The status vocabulary is the frozen five in
`VALID_STATUS` (`packages/work/src/lifecycle.mjs:20`), and its edge table is at `:66-72`.
Only one code path mints a top-level number: `appendPosition`, guarded by FF-12703
(`test/arch/work/acd-one-mint.test.mjs`). `runInsertTopLevel`
(`packages/work/src/commands/promote.mjs:510`) is the engine every `insert-*` face calls, and today
it requires `--at`. The diagram verbs already take two subjects, an ADR id and `loop`
(`packages/work/src/commands/diagram/plan.mjs:114`).

**Graph-derived coupling (`aof graph build .`, 2026-10-22T13:55:52Z, 20,024 nodes, egress none).**
`aof graph impact` over the four record-doc spellings and the lifecycle shows 41 dependents across
`packages/work/src`, three `packages/core` bindings and the work, notion and grade suites. Every
one of them reads the map or the vocabulary through the four modules named above, which is why
ADR-002 collapses the map before ADR-001 adds a type to it. Without that, one new type means
four edits. The diagram verbs (`plan.mjs`, `export.mjs`) couple to `layout.mjs` and `records.mjs`
only. The board couples to the item rows through `apps/ui/src/board/api.ts`, and the work
engine has no edge into it.

---

## ADR-001: A prototype is a top-level work item and never a driver. Nothing depends on it, nothing schedules it, and it is never converted

**Status:** Accepted
**Date:** 2026-10-22

**Context.** The SPEC puts a prototype in `wiki/work` as `NN_prototype_<slug>/`, so `find`,
`status`, the board and `aof:explain` resolve it like any other ref. It also says the loop does
not drive prototypes, mesh does not dispatch them, and a prototype is never promoted into a story
or a milestone. Spike and chore (m37/ADR-001) were made drivers because they gate other work.
A prototype gates nothing. Making it a driver would put it in `nextWork`'s walk
(`packages/work/src/readiness.mjs:135`, which filters on `isDriver`) and make it a legal
`depends:` target. The loop would then offer it, and a milestone could wait on it.

**Decision.**

1. `ITEM_RE` admits `prototype`. A `NN_prototype_<slug>` folder at the root of the work tree
   is listed by `listItems` and resolved by `aof work find`. `BACKLOG_ITEM_RE` admits it too,
   because the start move passes through the backlog for an instant to reach the one mint (ADR-004).
2. `isDriver` and `isDependTarget` (`packages/work/src/dependencies.mjs:8, :24`) stay **false**
   for a prototype. `nextWork` never offers one, `aof work next` never names one, and a
   `depends:` entry naming a prototype's number is the existing "does not resolve to a top-level
   item" finding. A prototype's record carries no `depends:` and no `parent:`.
3. Nothing converts a prototype. No verb turns one into a milestone, story or chore, and
   `aof work promote` moves it only from the backlog to the stream, as part of the start move.
4. A prototype is never dispatched. `aof work prototype` builds in the operator's session on the
   current branch, with no dispatch worktree, no lane and no mesh assignment.

**Alternatives considered.**
- *A driver, like spike and chore.* Rejected: it would make the loop offer a prototype and let
  governed work wait on one. Both are out of scope in the SPEC.
- *A folder outside the numbered stream, such as `wiki/work/prototypes/`.* Rejected: the SPEC
  wants a prototype resolved like any other ref, with the same numbering. A second root is a
  second enumerator, which `acd-work-root-one-enumerator` exists to prevent.

**Consequences.** The type joins the grammar and nothing else in the scheduling graph. Every
reader that switches on `isDriver` is unchanged, because a prototype answers false.

**Invariant.** FF-16802.

---

## ADR-002: The type-to-record-doc map has one home, in the identity leaf

**Status:** Accepted
**Date:** 2026-10-22

**Context.** Four modules map an item type to its record-doc filename (measured above). The
doctor copies say why they exist: the doctor is a pure lane, and `records.mjs` reads the disk
(for the milestone's AOF.md-first choice). So each lane copied the pure part. Adding `prototype`
to four copies is how they drift apart, which is what happened to `isDependTarget` before
chore 104.

**Decision.**

1. `packages/work/src/identity.mjs`, which is already pure and already imported by every lane,
   exports `RECORD_DOC_BY_TYPE`: a frozen map of `milestone → SPEC.md`, `story → STORY.md`,
   `uat → SESSION.md`, `spike → SPIKE.md`, `chore → CHORE.md` and `prototype → PROTOTYPE.md`.
2. `recordDoc` in `records.mjs` keeps only the AOF.md-first choice for a milestone and reads
   every other answer from the map. `typeHasRecordDoc` is derived from it as before.
3. The two doctor copies and the ratchet's copy are deleted, and each imports the map.

**Alternatives considered.** *Add the type to all four copies.* Rejected: it is the drift this
ADR removes. Measuring the blast radius is cheaper than carrying a fifth copy.

**Consequences.** Adding a type is one map entry. The doctor lanes stay pure, because the map
is pure.

**Invariant.** FF-16801.

---

## ADR-003: A prototype has its own four status words and its own moves, declared beside the frozen five

**Status:** Accepted
**Date:** 2026-10-22

**Context.** The SPEC's lifecycle is `active` ⇄ `paused` → `done` | `abandoned`, and both ends
can be reopened. The frozen five (`lifecycle.mjs:20`) cannot carry it:

- `paused` is not `blocked`. The board counts a blocked item as an alarm, and a paused
  prototype is not one.
- `abandoned` has no word in the five.
- `done` is terminal in the five, and it closes the acceptance horizon. A prototype's `done` is
  the operator's "good enough", and a later continue reopens it.

**Decision.**

1. `packages/work/src/lifecycle.mjs` declares `PROTOTYPE_STATUS`
   (`active`, `paused`, `done`, `abandoned`) and `PROTOTYPE_STATUS_EDGES`:
   `active → paused | done | abandoned`, `paused → active | done | abandoned`,
   `done → active`, `abandoned → active`. A new prototype is born `active`.
2. `statusVocabularyFor(type)` and `itemStatusEdges(from, type)` answer per type. Every other
   type gets the frozen five and the existing table, unchanged. `VALID_STATUS` keeps its five
   words in its frozen order (`packages/knowledge/src/import/recovery.mjs:540` destructures it).
3. Validate checks a prototype's `status:` against `PROTOTYPE_STATUS`, and the status writer in
   `records.mjs` refuses a move the prototype table does not declare. So `aof work status <ref>`
   reports a prototype's legal moves like any other item's.
4. `isOpen` is unchanged. A `done` prototype reads as closed, and the only effect is that a
   shape finding on it reports at `warn`. It is not refused.

**Alternatives considered.**
- *Map the four words onto the five* (`active` as `in-progress`, `paused` as `blocked`).
  Rejected for the three reasons above.
- *Keep the lifecycle out of the engine*, as m37/ADR-003 did for spike and chore. Departed from:
  validate has to accept the words, and the writer has to refuse an illegal move. Both are
  engine acts, so the words and moves live where the five live.

**Consequences.** Readers that tally statuses (the board, the fleet) meet four new words on
prototype rows only. ADR-007 decides how the board shows them. No other reader filters prototype rows by status.

**Invariant.** FF-16803 (a prototype in each of its four statuses validates clean).

---

## ADR-004: One verb, `aof work prototype`, does the mechanical half of the four moves. The `/aof:prototype` command does the building and the prose

**Status:** Accepted
**Date:** 2026-10-22

**Context.** The SPEC wants one verb with four moves (start, continue or add, stop, complete),
building inline in one session on the current branch, with no spawns and no review lanes.
m41/ADR-002 splits each such verb into a deterministic CLI part and a prompt part.

**Decision.**

1. **Positional grammar.** `aof work prototype <arg> ["<addition>"]`. When `<arg>` is all digits,
   or names an existing prototype's slug, it is a **ref**, and the move is continue. An all-digit
   `<arg>` that resolves to nothing is refused as `prototype-ref-unknown`, never started as a
   prototype named "168". An `<arg>` that resolves to an item of another type is refused as
   `prototype-not-a-prototype`. Any other `<arg>` is the **ask**, and the move is start.
2. **Start** derives a kebab slug from the ask (or takes `--slug`), then calls
   `runInsertTopLevel` with `type: "prototype"` and **no position**. `runInsertTopLevel` gains the
   append form (no `--at` means the bare `promote` append it already performs), and the scaffold's
   `DOCS_BY_TYPE` gains `prototype: ["PROTOTYPE.md", "STATE.md"]`. The number therefore comes from
   the one mint, and FF-12703's caller set is unchanged. The verb writes the ask into `## Intent`
   and as the first dated entry under `## Wants`, appends a `started` line to `## Log`, and leaves
   the status `active`.
3. **Continue or add.** The verb appends `- <date> · <addition>` to `## Wants` and a dated
   `want added` line to `## Log`. If the prototype is `paused`, `done` or `abandoned`, it moves it
   to `active` and logs `reopened`. Changing or dropping a want is the session's own edit to
   `## Wants` (struck through, never deleted). The session logs it with `--log "<line>"`, which
   appends one dated line and does nothing else.
4. **Stop and complete.** `--stop`, `--done` and `--abandon` each append a dated log line and make
   their status move. Each refuses with `prototype-handoff-missing` when `STATE.md`'s
   `## Hand-off` still holds the template's placeholder. The session writes the hand-off first,
   so a stop cannot leave the next session nothing to resume from. **The verb then copies that
   hand-off into `## Log`**, as a quoted block under the move's dated line. `## Hand-off` only
   ever holds the latest checkpoint and the next session replaces it, so the Log is where every
   checkpoint is kept. The prototype stays fluid and is still auditable: the Log holds each stop's
   full state (what worked, where it stopped, what was next), with no phase files and no plan made
   in advance. A continue that rebuilds a missing hand-off from the log copies nothing, because
   the last stop's hand-off is already in the Log.
5. **Dates, not clocks.** Every line the verb writes carries the date (`--today` overrides it, as
   `insert-*` allows). The verb records no time of day and no duration, and it mints no run record.
6. **The command, `/aof:prototype`.** It reads `PROTOTYPE.md` and the hand-off, calls the verb
   for the move, then builds in this session. Its `allowed-tools` exclude `Agent`. It makes no
   branch and no worktree, runs no review lane, makes no commit, and keeps `## Shortcuts` current as
   it goes. A session that ends without `--stop` has still logged as it went. The next continue
   rebuilds the hand-off from the log and the code. It ships in the bundle for every runtime that
   carries `add-chore` (claude, opencode, and the codex workflow section) and reaches a project
   through `aof work update`.

**Alternatives considered.**
- *Mint the number in the verb.* Rejected: FF-12703 allows one mint.
- *A family of verbs* (`prototype-start`, `prototype-stop`). Rejected by the SPEC.
- *The CLI writes the hand-off from flags.* Rejected: a hand-off is prose, and the session that
  built the code is the one that can write it (m41/ADR-002).

**Consequences.** `runInsertTopLevel` gains an append form that `insert-*` faces never use (they
always pass `--at`). The prototype verb is the fifth face over the engine and adds no mint.

**Invariant.** FF-16804 (builds inline), and FF-12703 unchanged (one mint).

---

## ADR-005: Validate checks only a prototype's two files. The doctor's lifecycle lanes do not apply to it

**Status:** Accepted
**Date:** 2026-10-22

**Context.** The SPEC requires `aof work validate` to stay green over a prototype with no
stories, features or criteria. The native frontmatter branch (`packages/work/src/validation.mjs:225-243`)
already fits any record doc that carries `type`, `number`, `slug`, `status`, `created` and
`updated`. The doctor's lifecycle lanes (`missing-verification`, `missing-retrospective`,
`milestone-no-stories`, `stale-parent`, the control register) are written for governed types.

**Decision.**

1. Validate holds `PROTOTYPE.md` to the native branch, with the status read per ADR-003.
   It adds two shape checks: `PROTOTYPE.md` carries `## Intent`, `## Wants` and `## Shortcuts`,
   and the folder carries a `STATE.md` with `## Hand-off` and `## Log`. `## Diagrams` is optional.
2. A `depends:` or `parent:` on a prototype is a validate finding (ADR-001 §2).
3. The doctor's coherence and lifecycle lanes skip a prototype. None of `missing-verification`,
   `missing-retrospective`, `milestone-no-stories`, `stale-parent`, `control-unresolved` or the
   acceptance-door checks report on one.
4. The empty prototype template validates **red** until the start move fills its Intent and
   first Want. A folder made by hand from the template is not a prototype yet.

**Alternatives considered.** *No shape checks, only frontmatter.* Rejected: the four moves edit
named sections, so a prototype missing one has broken the next continue, and validate is where
that should show.

**Consequences.** A prototype costs validate one record read and one `STATE.md` read. It adds no
lifecycle check.

**Invariant.** FF-16803.

---

## ADR-006: A prototype's diagrams go through the same plan and export, with the diagram's name as the subject. A prototype diagram can be redrawn

**Status:** Accepted
**Date:** 2026-10-22

**Context.** `aof diagram plan <ref> <subject>` takes an ADR id or `loop` today. A prototype has
no ADRs. Its briefs live under `PROTOTYPE.md` `## Diagrams`, one `### <name>` each. The SPEC
asks for a prototype target on `aof:add-diagram`, not a sibling command. A prototype's wants
change, so a drawn diagram can be replaced. That is the opposite of the ADR rule, where a
delivered ADR's diagram is immutable.

**Decision.**

1. When the ref resolves to a prototype, `aof diagram plan` and `export` read the subject as a
   diagram **name** (the slug grammar `assertSlug` already enforces). The brief is the prose under
   `### <name>` in `## Diagrams`. The stem is the name itself, so the files are
   `diagrams/<name>.{html,svg,png}`. No ADR check, `--slug` or `diagram-item-delivered` applies.
2. The prototype brief reader, the stem and the paths go in `packages/work/src/diagrams/layout.mjs`.
   That file is the one home of a diagram's place and spelling (FF-13302), so it is extended rather
   than copied.
3. A prototype plan never refuses a drawn diagram. The command decides whether to redraw.
4. `/aof:add-diagram` gains a prototype branch with three forms. `<ref> "<what to draw>"` writes a
   new `### <name>` brief, then plans, draws and pastes the block. `<ref>` draws every brief that
   has no `](diagrams/` link. `<ref> <name>` redraws that diagram and replaces its block. The ADR
   path is unchanged.
5. `diagramFile` (the board's diagram server) still admits only `ADR-NNN-<slug>` stems. Showing
   prototype diagrams on the board is out of scope, and the links work in the markdown.

**Alternatives considered.** *Stems prefixed `P-`, for the board's file grammar.* Rejected for now:
the board does not show prototype diagrams, and a prefix that nothing reads is noise.

**Consequences.** The diagram verbs gain a third subject, dispatched on item type before the ADR
checks. The doctor's diagram lane reads `ARCHITECTURE.md`, which a prototype does not have, so
it reports nothing for a prototype.

**Invariant.** FF-13302 (diagram layout single home), extended, not duplicated.

---

## ADR-007: The board shows a prototype in the existing status lanes, badged with its type and its own status word. There is no new lane

**Status:** Accepted
**Date:** 2026-10-22

**Context.** The board's lanes are keyed on the frozen five (`apps/ui/src/board/BoardLanes.tsx:139-155`),
and `place` drops an item whose status has no lane. Spike and chore reach the lanes through
`derived.otherDrivers` (`apps/ui/src/board/model.ts:89`), tagged with their type. If a prototype
were added to that list unchanged, every `active` or `paused` prototype would vanish from the
board without a word. m37/ADR-003 set the precedent of a type badge and no new lane.

**Decision.**

1. `WorkItem.type` in `apps/ui/src/board/api.ts` admits `prototype`, and its `status` admits the
   four prototype words.
2. `deriveBoard` lists prototypes beside spike and chore. A prototype's card goes in the lane its
   status maps to: `active` to `in-progress`, `paused` to `not-started`, and `done` and
   `abandoned` to `done`. The mapping is one function in `model.ts`.
3. The card's tag reads `prototype · <status>`, so `paused` and `abandoned` stay visible as
   themselves inside a shared lane.
4. The milestone tallies, `activeMilestones` and `blockedGates` never count a prototype.

**Alternatives considered.**
- *A prototype lane.* Rejected, following m37/ADR-003: a lane is added only if there is demand
  for one.
- *Leaving prototypes off the board.* Rejected: the SPEC lists the board among the surfaces that
  resolve a prototype.

**Consequences.** UI-only change, with no new surface and no DESIGN.md. The existing lane, card
and badge components are reused as they are.

---

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-16801 | The type-to-record-doc filename map is declared only in `packages/work/src/identity.mjs` (`RECORD_DOC_BY_TYPE`). No other `packages/` source maps a type to `SPEC.md`, `STORY.md`, `SESSION.md`, `SPIKE.md`, `CHORE.md` or `PROTOTYPE.md` | `test/arch/work/acd-record-doc-map-one-home.test.mjs` (pending) | ADR-002 |
| FF-16802 | `isDriver` and `isDependTarget` answer false for a prototype, and `nextWork` over a stream that holds only a prototype offers nothing | `test/arch/work/acd-prototype-stays-light.test.mjs` (pending) | ADR-001 |
| FF-16803 | A well-formed prototype folder (PROTOTYPE.md and STATE.md, no `stories/`, `tasks/`, `.feature` or VERIFICATION) passes `validateWork` and draws no doctor finding in each of `active`, `paused`, `done` and `abandoned` | `test/arch/work/acd-prototype-stays-light.test.mjs` (pending) | ADR-003, ADR-005 |
| FF-16804 | `packages/core/assets/commands/prototype.md` does not list `Agent` in `allowed-tools`, and `packages/work/src/commands/prototype.mjs` imports no dispatch, worktree, lane or git module | `test/arch/work/acd-prototype-stays-light.test.mjs` (pending) | ADR-004 |

## Build refinements (graduated from STATE at 168's close)

Decisions the build took inside the ADRs above, kept here so the compacted STATE loses none:
- **A status word no type owns is not a status (ADR-003).** `isStatusWord(word)` sits beside
  `statusVocabularyFor` in `lifecycle.mjs`. The writer's `invalid-status` gate refuses only a word
  that no type owns. A word that another type owns (`in-review` asked of a prototype, `paused` of a
  milestone) reaches the per-type edge check, which refuses it as `status-edge-not-applicable` and
  names the legal moves.
- **A prototype's `done` skips the budget preflight (ADR-003 §1).** The status verb runs its
  record-doc budget check only on governed acceptances. A prototype's `done` means "good enough",
  not an acceptance.
- **The contract defaults (ADR-004, ADR-006).** The slug is the ask's words with leading filler
  dropped, at most six. `runInsertTopLevel` appends only when passed `append: true`, so the
  `insert-*` faces keep `insert-invalid-at`. The new refusal codes are `prototype-one-move` (two
  moves, or a new ask beside a move flag), `diagram-name-unknown` and
  `diagram-slug-not-applicable`. A heading with no prose reuses `diagram-brief-missing`.
- **The `add-diagram` argument hint is unchanged (ADR-006).** It stays `"<ref> [ADR-NNN]"`, which
  151's delivered feature states. The prototype forms are in the command body and its description.
- **The board's mapping is one module (ADR-007).** `laneCards` and `tabsFor` moved into the pure
  `model.ts` beside `laneFor`. `status.tsx`'s helpers read the wire status through `laneStatus`,
  so a prototype's ring agrees with its lane, and the card's meta line shows the prototype's own
  word.
