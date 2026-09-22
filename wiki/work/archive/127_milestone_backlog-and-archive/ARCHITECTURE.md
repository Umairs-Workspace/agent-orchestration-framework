---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: what did we decide, and why?
  Owner: architect. ADRs are append-only; a superseded decision is marked, never deleted.
  Structural invariants belong here as FITNESS FUNCTIONS (the register at the foot), not in a
  task .feature — a .feature states observable behaviour over a seam, a fitness function states a
  property of the tree.
-->
# 127 · Backlog and archive — Architecture

The SPEC made the design decision — two more roots, one rule each, identity is the number and
never the location. These ADRs formalise HOW the tree, the enumerator, the two new verbs and the
fleet cache carry that decision; they do not re-litigate it.

## Memory recall — what was surfaced, and what it changed

`aof work memory recall … --area architecture --block`, run before the first ADR. Five records
returned; each honoured or departed from in writing.

- **`41/ADR-001`** (*the re-index engine is its own module, `src/work/reindex.mjs`, which IMPORTS
  `work.mjs`'s readers and is never imported back; frontmatter rewrites are surgical single-line*)
  → **HONOURED, and it decides ADR-003 §3 and ADR-004 §2.** `promote` stamps `number:` with the
  single-line writer; `archive` rewrites only link lines and never reserialises a frontmatter.
  `work.mjs` gains no import of reindex, promote or archive.
- **`41/ADR-002`** (*re-index is MECHANICAL — the deterministic CLI does numbering / slot-open /
  scaffold; prose framing is prompt-authored on top*) → **HONOURED, and sharpened by ADR-003 §1:**
  the `aof:add-*` prompts' "max NN + 1" arithmetic — the LLM-authored mint the SPEC counts as the
  second minting place — is retired; the only number-minting code path is `promote`.
- **`119/ADR-005`** (*the `src/` interior is `src/mesh/` + `src/work/` + one subject-named home;
  `src/work.mjs` does not move*) → **HONOURED.** The two new verbs are `src/commands/promote.mjs`
  and `src/commands/archive.mjs` beside their siblings; the enumerator stays in `src/work.mjs`; no
  new top-level directory.
- **`71/ADR-003`** (*the loop's creation authority is exactly one type in exactly one place —
  `promote-finding-to-chore` / `promote-gap-to-chore` append to the stream*) → **HONOURED.** Both
  are unchanged and keep appending to the stream (ADR-003 §5); `work.intake` governs `aof:add-*`
  only (ADR-005 §1). They share the mint (`appendPosition`) but not the intake.
- **`48/ADR-009`** (*give a concern ONE home and REMOVE a block from the widest-out-degree file
  rather than add one*) → **HONOURED, and it is the shape of story 01.** `ITEM_RE` goes from three
  homes to one, seven second-scanners retire onto `listItems`, and `insert-shared.mjs` (622 lines)
  is expected to shrink rather than grow (ADR-003 §4, Codebase health).

## Measured facts this document reasons from

Measured 2026-09-11 on the working tree at `2321dce8` (graph built `2026-09-11T14:59:30Z`, 16,371
nodes, 39,904 edges, egress none — `aof graph build .`). Cited as actual structure, not inference.

| claim | value | source |
|---|---|---|
| importers of `src/work.mjs` | **302** modules/tests — the god-node; `listItems` is the seam every enumerator goes through | `aof graph impact src/work.mjs` |
| callers of `src/work/reindex.mjs` in src | **2** — `src/commands/insert-shared.mjs`, `src/effects/stream-transitions.mjs` | `aof graph impact` |
| callers of `src/commands/insert-shared.mjs` | `insert-chore/milestone/story/uat.mjs`, `promote-finding-to-chore.mjs`, `promote-gap-to-chore.mjs` | `aof graph impact` |
| home of `appendPosition` | `src/work-promote/promotion.mjs:52` (← the two `promote-*-to-chore` commands) — NOT `insert-shared.mjs`; the SPEC's table is off by one file | `sed -n 40,62p` |
| homes of `ITEM_RE` | **3** — `src/work.mjs:69` (exported), `src/work/doctor.mjs:84` (exported copy), `src/commands/migrate-folder.mjs:61` (private copy); all three are `/^(\d+)_(milestone\|story\|task\|uat\|spike\|chore)_([a-z0-9-]+)$/` | `grep -n "ITEM_RE = " src -r` |
| modules pairing a `readdir` of a work root with their own item match | **7** besides `listItems` — enumerated and decided per file in ADR-001 §4 | `grep -rn "readdir" src` + reading each |
| `Number.parseInt(<row>.number` files in src | **10** — `work.mjs`, `work/reindex.mjs`, `work-promote/promotion.mjs`, `work/doctor.mjs`, `work/doctor-freshness.mjs`, `work/doctor-depends.mjs`, `work/doctor-coherence.mjs`, `memory/local-indexing.mjs`, `commands/migrate-folder.mjs`, `commands/insert-shared.mjs` (the SPEC's 33 counts call sites) | `grep -rln "parseInt([a-zA-Z.]*number" src` |
| runtime readers of a live item PATH outside `wiki/` | **1** — `test/arch/planning/acd-tune-carries-no-second-rule.test.mjs:21` (reads `62_milestone_…/stories/04_story_the-tuners-face/STORY.md`); plus `wiki/work/35_…/reference/retired-dispatch-tests/*.mjs`, which import `src/work.mjs` from inside the tree and are in no runner — they move with their folder | SPEC §Objective, re-checked |
| `findWork` free-text branch | `src/work.mjs:908-914` — matches `slug`/`name` by substring; a backlog ref needs no new grammar | read |
| `listItems` view short-circuit | `src/work.mjs:393` — `if (Array.isArray(view?.items)) return view.items;` | read |
| fleet cache row builder | `src/global-work-store.mjs` `mapItemRow` (~`:1224`) | brief |
| bundle wrappers | `src/bundle/commands/{add-*,insert-*}.md` exist; no `promote.md` / `archive.md`; no `work.intake` anywhere in src | `ls`, `grep -rn intake src` |
| compat proof | `wiki/work/TECH_DEBT.md` sits at the root unmatched by `ITEM_RE` and every pre-127 reader ignores it | `ls wiki/work` |

---

## ADR-001 — One enumerator, three roots; `ITEM_RE` has one home

<!-- Heading shortened at this milestone's accept (2026-09-16): the refine brief's architecture slice carries each declared ADR's heading, and at the original lengths 127/01's slice carried one of the two ADRs it declares (VERIFICATION F-10). The original sentence is the lede below; the id and every citation are unchanged. -->

**One enumerator, three roots: `listItems` walks the stream, `backlog/**` and `archive/`, and `ITEM_RE` has ONE home**

### Context

`listItems` (`src/work.mjs:392-424`) is the seam 302 importers reach the tree through, and it
walks exactly one root with one regex. The SPEC adds two roots. Seven other modules `readdir` a
work root with their own match, and `ITEM_RE` is copied in two of them — so today a new root
would have to be taught to eight scanners, and it would be taught to some.

### Decision

1. **Three roots, one function.** `listItems(workDir, { view })` walks, in this order:
   `<workDir>` (as today, byte-identical rows), then `<workDir>/backlog/**`, then
   `<workDir>/archive/`. Each root is walked only when it exists (`readDirSafe`); a project with
   neither is byte-identical to today. The `view` short-circuit at `:393` is untouched — the cache
   row shape is ADR-006's job.
2. **The backlog leaf grammar is a SECOND exported constant beside `ITEM_RE`**, in `src/work.mjs`:
   `BACKLOG_ITEM_RE = /^(milestone|story|chore|spike|uat)_([a-z0-9-]+)$/`. One home, two shapes.
   `task` is deliberately absent (a task is never a backlog driver). The walk is recursive: any
   directory under `backlog/` that does NOT match `BACKLOG_ITEM_RE` is a group and is descended
   into; one that matches is a leaf and is NOT descended (a backlog driver has no `stories/`,
   ADR-005 §4). Row: `{ number: null, type, slug, name, dir, ref: slug, parent: null,
   backlog: "<group path relative to backlog/, forward-slashed, '' at the top>" }`.
3. **A backlog slug is unique across the whole backlog tree** — `findWork` resolves it by slug,
   and a group carries no semantics (SPEC), so two leaves `a/milestone_x` and `b/milestone_x` are a
   collision `validateWork` reports (`backlog-slug-duplicate`) and `promote` refuses. A backlog slug
   colliding with a numbered item's slug is NOT a collision (the numbered item resolves by number
   first; the free-text branch returns both rows, as it does today for any shared slug).
4. **`archive/` is walked with `ITEM_RE`, name verbatim**, its milestones' `stories/` walked
   exactly as at the root, and every row (driver and story) carries `archived: true`. `ref`,
   `number`, `parent` are what they would be at the root — the location adds one flag and changes
   nothing else. `archive/` is FLAT: no groups (a second grouping grammar would be a second
   scanner's worth of rules for no operator need).
5. **`ITEM_RE` has one home.** `src/work/doctor.mjs:84` and `src/commands/migrate-folder.mjs:61`
   import it from `src/work.mjs`. The seven second-scanners, decided per file:

   | file | decision | reason |
   |---|---|---|
   | `src/work/doctor.mjs:122` | **RETIRE onto `listItems`** | it enumerates the work root to lane the same items `validateWork` lanes; a second walk is a second answer |
   | `src/commands/migrate-folder.mjs:308` | **RETIRE onto `listItems`** (+ import `ITEM_RE`) | it computes an append number over the root — that is `appendPosition`'s job (ADR-003 §2) |
   | `src/work-tune/provenance.mjs:23` | **RETIRE onto `listItems`** | already the right regex, still a second `readdirSync` of the parent; `listItems` filtered by `dir` gives the same rows |
   | `src/integrations/routing.mjs:253` | **KEEP, allow-listed** | it matches a NON-aof `NN_milestone_slug` form the shared grammar does not admit (a foreign tree); retiring it would change what routing sees. Its keeper reason is recorded in FF-12701's allow-list |
   | `src/import/recovery.mjs:55` | **KEEP, allow-listed** | scans a FOREIGN source tree with `AOF_MILESTONE_RE` + loose `NN-slug` forms; it is not a work-root scanner |
   | `src/memory/local-indexing.mjs:520` | **KEEP, allow-listed** | it walks the wiki for NON-item folders and skips `ITEM_RE` matches precisely because the work-stream loop (which uses `listItems`) indexes items; it must learn `backlog/` and `archive/` are item roots (skip them too) — via `listItems`'s row `dir`s, not a third regex |
   | `src/mesh/worker-execution.mjs:288-297` | **KEEP, not a scanner** | `readdir`s worktree checkouts under `.aof/mesh/worktrees`, never a work root; no item match |

6. **Compat is by construction.** Neither `backlog` nor `archive` matches `ITEM_RE`, so a pre-127
   reader ignores both roots exactly as it ignores `TECH_DEBT.md` today.

### Alternatives

- A `listBacklog` / `listArchive` beside `listItems` — rejected: three enumerators is the disease
  this ADR treats; every reader would have to know to call three.
- Encode the group in a frontmatter key rather than the path — rejected: the scanner opens no doc
  (SPEC), and a group is a folder and nothing else.

### Consequences

Every reader sees three roots for free and `.number` can now be `null` (ADR-002). `doctor.mjs`
(fan-in 28) and `migrate-folder.mjs` lose a regex and a walk each. FF-12701 holds it.

---

## ADR-002 — Identity is the ref; one live-row predicate

**Identity is the ref, never the location: ONE live-row predicate decides which walkers filter, and every `.number` consumer is null-safe**

### Context

With ADR-001 a row may be un-numbered (backlog) or archived. The SPEC names which readers keep
seeing archived rows and which stop; without one home for that rule, each of ten `.number`
consumers and each of five "what is next" walkers would grow its own filter, and they would drift.

### Decision

1. **One predicate, one home.** `src/work.mjs` exports `isLiveStreamRow(row)` ⇔
   `row.number != null && row.archived !== true`. It is the ONLY place the two flags are read as a
   scheduling question.
2. **Walkers that answer "what is next" pass through it** and see neither backlog nor archived
   rows: `nextWork`, the loop scope (`src/work/loops.mjs`), `listStream`'s default (`--all`
   includes archived; backlog rows are listed under their own `backlog` group in the default
   listing, since "what is live" includes what is waiting), `recent`, and the board's default
   (ADR-006). `reindex.selectAffected` and `appendPosition` consider only live rows — a backlog row
   has no number to shift, an archived row's number is never shifted.
3. **Readers that answer "what is this ref" do NOT filter on `archived`**: `findWork`, `read`,
   `doc`, `memory ingest`, depends resolution (`siblingGate`, `doctor-depends`), `validateWork`,
   `doctor`. `findWork` resolves a backlog slug through its existing free-text branch. Validate's
   and doctor's NUMBERING lanes (gaps, duplicates, contiguity) filter with the predicate — a backlog
   row is not a gap and an archived row still holds its number.
4. **Every `Number.parseInt(<row>.number` site** in the ten files is preceded by the predicate or
   a `number != null` guard. A site that reduces over rows filters first; a site that reads one
   row guards. No site swallows `NaN`.
5. **Sort order** for a mixed listing: live numbered rows by number, then backlog rows by group
   path then slug, then archived rows by number — deterministic, so `--json` is byte-stable.

### Alternatives

- Filter at each site by hand — rejected: ten sites, five walkers, and the sixth would forget.
- A separate `listLiveItems` enumerator — rejected: a second enumerator (ADR-001).

### Consequences

The only new export beside the regex is one predicate; a null-safety mistake is a textual arch-test
failure (FF-12702), a walker that stops calling the predicate fails FF-12706.

---

## ADR-003 — `promote` is the ONE mint; `insert-*` become thin aliases

**`promote` is the ONE mint: default appends, `--at P` opens a slot through the existing engine, the folder moves, and `insert-*` become thin aliases**

### Context

Two places mint a number today: the `aof:add-*` prompts (agent arithmetic) and `appendPosition`
(`src/work-promote/promotion.mjs:52`, ← the two `promote-*-to-chore` commands). `insert-*` opens a
slot through the reindex engine via `runInsertTopLevel` (`src/commands/insert-shared.mjs:244-300`).
The SPEC asks for one verb and one home for "the next number", and for the reindex engine to gain
no second caller.

### Decision

1. **`aof work promote <slug> [--at P] [--yes]`** in `src/commands/promote.mjs`, registered in the
   CLI and shipped with `src/bundle/commands/promote.md` (`/aof:promote`, reachable via
   `aof work update`). It resolves `<slug>` through `findWork` to exactly one backlog row (0 or >1
   is a refusal naming the candidates).
2. **Default position is `appendPosition`.** It stays in `src/work-promote/promotion.mjs` (the
   graph says its callers are already the promote family — the SPEC's "move it" is satisfied by
   leaving it where it is and making `promote.mjs` its third caller in the SAME family). It reduces
   over `isLiveStreamRow` rows only (ADR-002 §2).
3. **`--at P` opens the slot through the EXISTING engine** — the same `countShiftedByInsert` /
   slot-open path `runInsertTopLevel` uses — then MOVES `<backlog>/…/<type>_<slug>` to
   `<workDir>/<NN>_<type>_<slug>` and stamps `number: NN` into the record doc's frontmatter with
   the surgical single-line writer (`41/ADR-001`); the `backlog:` group is not written anywhere (it
   was a path, never a fact). `--at` shifting a live item is the existing confirm/`--yes` gate.
4. **`insert-milestone|story|chore|uat --at P` become thin aliases**: scaffold into `backlog/`
   (the write side ADR-005 owns) then call `promote --at P`. Smaller-diff argument: retiring the
   four verbs would also retire `acd-work-insert-command-bundle-parity` and four bundle wrappers
   and change an accepted contract; aliasing deletes `runInsertTopLevel`'s own slot-open + scaffold
   body (`insert-shared.mjs:244-300`) and its numbering, keeps the verbs' names and wrappers, and
   leaves the engine with ONE caller family (`promote`) plus `stream-transitions.mjs`, which is not a
   minting caller. `insert-shared.mjs` shrinks (Codebase health).
5. **`promote-finding-to-chore` / `promote-gap-to-chore` are unchanged** (`71/ADR-003`): they keep
   appending to the stream through `appendPosition`. They share the mint, not the intake.
6. **`depends:` is validated at promotion.** Numeric refs must resolve (live or archived — an
   archived dependency is satisfied, not missing); a `depends:` entry naming a backlog slug is
   refused with "planning note, not a gate — promote `<slug>` first or drop the entry".
7. **`aof:refine` / `aof:continue` call `promote` as step 0** when handed a backlog ref, so chore
   and spike (no refine step) have the same one door.

### Alternatives

- Retire `insert-*` — rejected above on diff size and contract churn.
- Let `promote` renumber by its own arithmetic — rejected: `41/ADR-002`, and a second engine.

### Consequences

One code path mints; the prompts stop doing arithmetic. `reindex.mjs` keeps exactly its two src
callers, of which one (`insert-shared`) is now reached only via `promote`. FF-12703 holds it.

---

## ADR-004 — `archive` is a verbatim MOVE; no number, no reindex

<!-- Heading shortened at 127's accept (2026-09-16): the refine brief's architecture slice carries each declared ADR's heading, and at this milestone's heading lengths the slice was budget-truncated past the ids its stories declare (127/VERIFICATION). The original sentence is the lede below; the id and every citation are unchanged. -->

**`archive` is an explicit verbatim MOVE that touches no number and imports no reindex**

### Context

3,102 citations resolve by number; 81 of 82 sibling prose links are done → done. The SPEC rules:
explicit only, never automatic on `done`, name verbatim.

### Decision

1. **`aof work archive <NN> | --done [--yes]`** in `src/commands/archive.mjs` with
   `src/bundle/commands/archive.md`. `<NN>` names a top-level driver whose status is `done`;
   anything else is a refusal naming the status. `--done` selects every top-level `done` driver not
   yet archived and lists them before the confirm gate. A story under a live milestone is never a
   target; it moves with its milestone.
2. **The move is `<workDir>/<name>` → `<workDir>/archive/<name>`**, folder name verbatim, every
   file byte-identical EXCEPT the relative prose links that cross the archive line: from a
   root-level file, `../NN_…` → `../archive/NN_…` when NN is being archived; from inside the moved
   folder, a link to a root sibling gains one `../`. Never a number, never a `ref` citation
   (`52/ADR-003`, `depends: [121]`), never a frontmatter reserialise (`41/ADR-001`). Links between
   two items archived in the same run are left untouched (both sides move together).
3. **The one live path-reader** (`test/arch/planning/acd-tune-carries-no-second-rule.test.mjs:21`)
   is rewritten to resolve its fixture through `findWork("62/04").dir` rather than a literal path,
   so no future archive touches it again; the retired suites under
   `wiki/work/35_…/reference/retired-dispatch-tests/` move with their folder and stay in no runner.
4. **Publish, don't renumber.** The new `dir` is published through the existing publish-on-mutate
   effect (`src/effects/*`) so the fleet cache follows; the memory index is regenerated by the
   existing `memory ingest` — `archive` invokes neither a reindex nor an ingest of its own.
5. **`archive.mjs` imports neither `src/work/reindex.mjs` nor `src/commands/insert-shared.mjs`
   and writes no `number:` line** — the structural form of "nothing is renumbered".

### Alternatives

- Automatic on `done` — rejected (SPEC): the verify ceremony cites the folder it just closed.
- Hide `done` rows in place — rejected (SPEC): the tree is the requirement.

### Consequences

`find 52` / `read 52` / `validate` / `depends` all answer identically before and after; `next`,
`loop`, default `list`/`recent`/board stop seeing it (ADR-002). FF-12705 holds the never-renumbers
half; FF-12706 the visibility half.

---

## ADR-005 — `work.intake` is WRITE-side only

**`work.intake` is WRITE-side only: the read side is mode-less**

### Context

The SPEC introduces `work.intake: "backlog" | "stream"` so an existing project is unchanged without
a migration. The risk is a reader that branches on it — and then a `"stream"` project with a stray
`backlog/` folder would have two truths.

### Decision

1. **The key is read in exactly three places**: the scaffold path the `aof:add-*` prompts and the
   `insert-*` aliases use (where to land the folder), `aof work init` (writes `"backlog"` for a new
   project), and `promote` (to explain, in its refusal text, that a stream-intake project promotes
   nothing because nothing is born in the backlog). Absent ⇒ `"stream"`.
2. **No reader branches on it.** `listItems`, `findWork`, `listStream`, `nextWork`, `validateWork`
   and doctor read `backlog/` and `archive/` whenever they exist, under either setting.
3. **Under `"backlog"`**, `aof:add-milestone|chore|spike|uat` (and a parentless `add-story`) land
   `<workDir>/backlog/[<group>/]<type>_<slug>/` with no `number:` in the record doc; under
   `"stream"` they append through `promote`'s default path (never their own arithmetic —
   `41/ADR-002`).
4. **`aof:add-story` under a backlog milestone refuses** with "promote first": a backlog driver
   has no `stories/` (ADR-001 §2).
5. This repository sets `"backlog"` in `.aof/aof.config.json` as part of story 05.

### Alternatives

- Make `"backlog"` the absent default — rejected: an existing project would silently change where
  its next item lands.

### Consequences

The string `intake` appears only in scaffold / init / promote / bundle prompts. FF-12704 holds it.

---

## ADR-006 — The fleet cache and the board carry the shapes; the board partitions, never filters

**The fleet cache and the board carry the shapes; the board partitions, it does not re-enumerate**

### Context

`listItems` short-circuits onto `view.items` when a fleet view is passed (`src/work.mjs:393`);
`mapItemRow` (`src/global-work-store.mjs` ~`:1224`) builds those rows. `src/board-ui.mjs` serves
`listStream` under `/api/work`. If the cache row lacks the new fields, a remote node's `find` for a
backlog or archived item answers differently from the owning node.

### Decision

1. **`mapItemRow` carries `number: null` + `backlog` and `archived: true`** exactly as
   `listItems` emits them, and the view merge preserves them, so `isLiveStreamRow` answers the same
   over a cache row as over a disk row. No consumer of `view.items` learns a second field name.
2. **`/api/work` takes an `includeArchived` parameter, default excluded**, and passes it to
   `listStream`'s `--all` path — the board never filters `archived` itself, and never enumerates.
3. **The board (`ui/src/board/model.ts` `deriveBoard`) partitions backlog rows out BEFORE card
   derivation** (a `number: null` row must never reach a lane that sorts by number) and hides
   archived rows behind one toggle that flips the API parameter. The visual intent is DESIGN.md's
   and is not restated here.

### Alternatives

- A separate `/api/backlog` — rejected: a second read model for the same enumerator.

### Consequences

`src/board-ui.mjs` keeps its one import of `src/work.mjs`; the UI keeps no core import
(`acd-work-ui-no-core-import` unchanged). Story 04 lands it; no FF of its own — the contract is
behavioural and lives in the story's `.feature`s, backed by the existing cache-shape suites.

---

## Codebase health — what these stories land in

`src/work.mjs` is imported by 302 modules (graph, above); the intent of this milestone is to make
it the ONLY enumerator rather than a bigger one. **Removed** from its neighbourhood: two `ITEM_RE`
copies (`doctor.mjs:84`, `migrate-folder.mjs:61`), three second-scanners retired outright
(`doctor.mjs:122`, `migrate-folder.mjs:308`, `provenance.mjs:23`) and three allow-listed with a
recorded reason, the `aof:add-*` prompts' number arithmetic, and `runInsertTopLevel`'s own
slot-open + scaffold body. **Added**: two command files (`promote.mjs`, `archive.mjs`), one
predicate (`isLiveStreamRow`), one regex constant (`BACKLOG_ITEM_RE`), one config key read in three
write-side places. `src/commands/insert-shared.mjs` (622 lines) is expected to SHRINK — the
`insert-*` verbs become aliases and the file loses the numbering it no longer owns; story 02's
review measures it and a grown file is a finding. `src/work.mjs` gains roughly 40 lines (a second
root loop and a predicate) and no import. The `.number` null-safety ratchet (FF-12702) is the
recurring-shape control: the eleventh `parseInt(row.number)` fails CI rather than needing eyes.

---

## Proposed partition

Drawn with the PO from the graph's coupling, not inferred: story 01 is the seam every other story
consumes (`listItems`'s row shape — 302 importers), so it goes first and the rest fan out from it in
parallel; 02 and 03 share no file (`promote.mjs` vs `archive.mjs`, `insert-shared` vs `effects/*`);
04 touches only the cache/board layer (`global-work-store.mjs`, `board-ui.mjs`, `ui/`), which
imports 01's export and nothing of 02/03; 05 is the dogfood and needs all four verbs to exist.

| story | ADRs | lands | files (graph-derived) | depends |
|---|---|---|---|---|
| 01 `one-enumerator-three-roots` | ADR-001, ADR-002 | `listItems` three roots + row shapes + `BACKLOG_ITEM_RE`; `ITEM_RE` one home; second-scanners retired/allow-listed; `isLiveStreamRow`; `.number` null-safety in the 10 files; archived exclusion in `next` / loop / `list` / `recent` (+ `--all`). FF-12701, FF-12702, FF-12706 | `src/work.mjs`, `src/work/doctor.mjs`, `src/commands/migrate-folder.mjs`, `src/work-tune/provenance.mjs`, `src/integrations/routing.mjs`, `src/memory/local-indexing.mjs`, `src/work/loops.mjs`, `src/commands/{list,recent,next}.mjs`, `src/work/reindex.mjs`, `src/work-promote/promotion.mjs`, `src/work/doctor-{freshness,depends,coherence}.mjs`, tests | — |
| 02 `promote-mints-the-number` | ADR-003, ADR-005 | `src/commands/promote.mjs` + CLI; `insert-*` aliases; `appendPosition` over live rows; `work.intake` + `init`; `aof:add-*` / `aof:insert-*` prompts rewired; `promote.md`; refine/continue step 0. FF-12703, FF-12704 | `src/commands/{promote,insert-shared,insert-*}.mjs`, `src/work-promote/promotion.mjs`, `src/work/init.mjs`, `src/bundle/commands/{add-*,insert-*,promote,refine,continue}.md`, `src/cli.mjs` | 01 |
| 03 `archive-is-a-move` | ADR-004 | `src/commands/archive.mjs` + CLI; link rewrite; live path-reader test; publish effect; `archive.md`. FF-12705 | `src/commands/archive.mjs`, `src/effects/*`, `src/bundle/commands/archive.md`, `test/arch/planning/acd-tune-carries-no-second-rule.test.mjs`, `src/cli.mjs` | 01 |
| 04 `the-fleet-and-the-board-see-the-shapes` | ADR-006 | `mapItemRow` + view merge; `/api/work` include-archived; board partition + toggle per DESIGN.md | `src/global-work-store.mjs`, `src/board-ui.mjs`, `ui/src/board/{model.ts,Overview.tsx,…}` | 01 |
| 05 `this-tree-holds-what-is-live` | all | `.aof/aof.config.json` gains `work.intake: "backlog"`; `aof work archive --done` over this repository's 123 done items; the outsider verification of SPEC §Objective's last paragraph (find/read/validate/next/board) | `.aof/aof.config.json`, `wiki/work/**` (moves), `wiki/work/TECH_DEBT.md` (link rewrites, if any) | 01, 02, 03, 04 |

Story `depends:` entries are sibling story numbers. 02 and 03 both touch `src/cli.mjs` (one
registration line each) — accepted as a one-line merge rather than a dependency.

---

## Fitness functions

HARNESS SHAPE (`119/ADR-010`): each arch-test exports `archTests`, an array of `{ name, run }`,
and is registered by one import + one spread in `test/arch/work/index.mjs` — never discovered by
`readdir`. Every control below is declared `pending` at refine and lands with its story; each
landed control owes a red probe in `VERIFICATION.md`. The id stands alone in its first cell.

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-12701 | **One enumerator, one regex home.** `ITEM_RE` and `BACKLOG_ITEM_RE` are each defined (`const … = /^…$/`) in exactly one src file, `src/work.mjs`; every other src reference is an import from it. No src module other than `src/work.mjs` pairs a `readdir`/`readdirSync` of a work directory with an item-name match (`_(milestone\|story\|…)_` or an imported item regex) — asserted over a comment-stripped sweep of `src/**`, with an explicit allow-list of the three keepers by path and reason (`src/integrations/routing.mjs` foreign `NN_milestone_slug` form; `src/import/recovery.mjs` foreign source tree; `src/memory/local-indexing.mjs` non-item wiki walk) so a fourth keeper cannot arrive silently. Non-vacuous: the sweep must find `src/work.mjs`'s own pairing. Red probe: paste a private `ITEM_RE` back into `src/work/doctor.mjs`, and separately add a `readdir` + `ITEM_RE.exec` to `src/work-tune/provenance.mjs`. | `test/arch/work/acd-work-root-one-enumerator.test.mjs` | ADR-001 |
| FF-12702 | **Every `.number` consumer is null-safe.** Over the ten files (asserted as the current set by set-equality, so an eleventh file must be added here consciously), every `Number.parseInt(<x>.number` site is, within the enclosing function, either preceded by a call to `isLiveStreamRow` / a `.filter(isLiveStreamRow)` over the same rows, or by a `<x>.number != null` / `=== null` guard — a textual arch-test over the source, one finding per unguarded site with `file:line`. Non-vacuous: at least ten sites are classified. Red probe: remove the guard from `appendPosition`'s reduce and observe the site named. | `test/arch/work/acd-number-null-safe.test.mjs` | ADR-002 |
| FF-12703 | **One mint.** `appendPosition` is exported from `src/work-promote/promotion.mjs` only and called from exactly the promote family (`src/commands/promote.mjs`, `promote-finding-to-chore.mjs`, `promote-gap-to-chore.mjs`) — asserted by grep over `src/**` and the graph's dependents; the reindex slot-open (`countShiftedByInsert` / `runInsertTopLevel`'s successor) is reached from `src/commands/promote.mjs` and nowhere else in `src/commands/`; no `src/commands/insert-*.mjs` contains `parseInt`, `Math.max` over numbers, or a `number:` write of its own; `src/work/reindex.mjs`'s src importers remain exactly `{insert-shared.mjs, effects/stream-transitions.mjs}` or a strict subset. Red probe: compute `max + 1` inside `insert-milestone.mjs`. | `test/arch/work/acd-one-mint.test.mjs` | ADR-003 |
| FF-12704 | **Intake is write-side only.** The tokens `work.intake` / `intake` appear in src only in the scaffold path, `src/work/init.mjs`, `src/commands/promote.mjs` and `src/bundle/commands/*.md` (an allow-list by path); `src/work.mjs`, `src/work/doctor*.mjs`, `src/work/loops.mjs`, `src/commands/{list,next,recent,find,read,doc}.mjs` and `src/board-ui.mjs` contain the token zero times. Non-vacuous: the allow-listed writers contain it at least once each. Red probe: make `listItems` skip `backlog/` when intake is `"stream"`. | `test/arch/work/acd-intake-write-side-only.test.mjs` | ADR-005 |
| FF-12705 | **Archive never renumbers.** Two subjects — the face `src/commands/archive.mjs` and the engine `src/work/archive.mjs` (03 task 03: the seam imports its fact-writers, so the engine is `reindex.mjs`'s twin rather than part of the command). Each file's direct import specifiers are a closed set (the face: `node:*`, `src/work.mjs`, `src/effects/stream-transitions.mjs`, `src/command-error.mjs`; the engine: `node:*`, `src/work.mjs`); every transitive path from either to `src/work/reindex.mjs` or `src/commands/insert-shared.mjs` crosses `src/effects/stream-transitions.mjs` — a SOURCE-LEVEL walk over import specifiers (03 task 05: `graphify-out/` is gitignored, so the graph is not read), non-vacuous on the seam path it excludes; neither source contains `number:`, `parseInt(`, `Math.max(` or `appendPosition`; the link rewriter is driven over a scratch text and leaves its `number:` line byte-identical (its one regex requires `](`); and the face calls the seam, never `archiveItems(`, whose src callers are exactly the seam. Red probes: import `reindex.mjs` into the face; import `insert-shared.mjs` into the face; import `promotion.mjs` into the engine; write `number:` in the rewriter; loosen the regex to `(../`; call the engine from the face; reach `insert-shared.mjs` through an intermediate `archive-flags.mjs`. | `test/arch/work/acd-archive-never-renumbers.test.mjs` | ADR-004 |
| FF-12706 | **The scheduling walkers filter through the one predicate; the resolving readers do not.** `nextWork`, the loop scope in `src/work/loops.mjs`, `listStream`'s default path and `recent` each reference `isLiveStreamRow` (asserted textually, and driven over a fixture with one live, one backlog and one archived driver: the walkers return only the live one); `findWork`, `validateWork` and `src/work/doctor.mjs` contain no `archived` filter (`.archived` read only inside `isLiveStreamRow` and the listing sort) and, driven over the same fixture, `findWork("<archived NN>")` returns the archived row with `archived: true`. Red probe: add `.filter(r => !r.archived)` to `findWork`; and separately drop the predicate from `nextWork`. | `test/arch/work/acd-next-walkers-exclude-archived.test.mjs` | ADR-002 |
