---
doc: architecture
---
# 178 · Memory is its own command — Architecture Decisions

Recall `ff117e61-24fd-4d6a-9f18-f5fd47c01ff5` (architect, area architecture) surfaced two decisions
this milestone builds on. 05/ADR-002 already made memory a top-level config object, so the face now
matches the config. 22/ADR-001 set the precedent that a new top-level face (`aof mesh`) is a thin
face over registered commands, and ADR-001 follows it. The other three records (09/ADR-005,
11/ADR-005, 15/ADR-002) concern MCP faces, graph reach and `--strict`, and bear on nothing kept in
scope.

The boundaries below follow the graph's coupling (`aof graph build .`, 2026-10-29T11:18Z, 21,024
nodes). `packages/knowledge/src/commands/memory.mjs` has exactly one dependent, its core binding
`packages/core/src/application/bindings/commands/work/memory.mjs`, whose only dependent is
`assemble.mjs`. So the face change is contained to that pair and the registration. The indexer
`local-indexing.mjs` and the seam `memory.mjs` are imported by the knowledge suites and two core
bindings, never by the command door, so the record change (ADR-002) and the face change (ADR-001)
share a write only in `memory.mjs`.

## ADR-001: `aof memory` is the canonical route, and `aof work memory` is a second registered door onto the same command

**Status:** Accepted
**Date:** 2026-10-29

**Context.** `work:memory` is one registered command (story 128) whose `run`, `argv`, `render` and
`json` delegate to the seam's one core path, `runMemoryVerb`, with byte-for-byte output as the bar,
because bundle prompts paste `recall --block` output and hooks read `recall --json` as an array.
The spine gives a command exactly one route: `deriveRouteTable` (`packages/contracts/src/commands.mjs:58`)
keys one `cli.route` per command and refuses a collision. It has no alias concept. The insert-*
verbs are this codebase's alias precedent: each is a registered command composing the canonical
one, never a second implementation (`packages/work/src/commands/promote.mjs:493`).

**Decision.**
- `createMemoryCommand` returns two commands built from ONE descriptor:
  - `memory`, route `["memory"]`, the canonical door;
  - `work:memory`, route `["work", "memory"]`, the alias. It spreads the canonical descriptor and
    replaces only `id` and `cli.route`. Its `input`, `run`, `argv`, `render` and `json` are the
    canonical's own function objects.
- The alias prints nothing extra: no deprecation line on stdout or stderr. Its usage text is the
  canonical usage, which spells `aof memory`. That text is the one place the alias's output differs
  from what it printed before this milestone, and it is the intended difference.
- `work:memory` keeps its id, so the command inventory, the cli-bijection and route-coverage
  controls, and anything keyed on the id still resolve. Those controls gain a row for `memory`.
- `aof --help` lists `memory` as a family of its own, beside `graph` and `mesh`. The alias stays
  listed under Work until the migration (ADR-003) has landed. Whether to hide it afterwards is left
  to whoever retires it.
- The binding stays at `packages/core/src/application/bindings/commands/work/memory.mjs`. Moving it
  would spend a source-directory budget row to relocate a 30-line file.
- No removal date. The alias is kept indefinitely. Retiring it is its own item, once nothing
  outside this repo spells the old path.

**Alternatives considered.**
- *Add `cli.aliases` to the spine.* It would be a general mechanism for one use. It would touch
  `deriveRouteTable`, `resolveRoute`, the help renderer and every control that walks routes, which
  is the blast radius of the spine, not of memory.
- *Split into one command per verb (`memory:recall`, `memory:ingest`, …), as `graph` is.* It would
  duplicate `parseMemoryArgv`'s rules across six adapters and put the byte-for-byte bar at risk six
  times over, for a face change. A per-verb split can follow if a consumer needs per-verb schemas.
- *Keep the ladder-style shim in `cli.mjs`.* Story 128 closed that door deliberately
  (`acd-work-memory-routed`), and reopening it is two doors.

**Consequences.** Both spellings work for as long as the alias stands, so the prompt migration
(ADR-003) can land after this without a broken window. A change to memory's behaviour is made once
and shows through both doors.

**Invariant.** The alias shares the canonical command's implementation. `work:memory`'s `run`,
`argv`, `render` and `json` are the same function objects as `memory`'s (FF-17801).

## ADR-002: A work record carries its item's `origin:` as a resolved project-root path list, shown and never scored

**Status:** Accepted
**Date:** 2026-10-29

**Context.** The operator chose link-following over indexing `wiki/planning` (STATE, 2026-10-29):
refine and every other edge recall the work corpus, as today, and a recalled record should lead to
the planning document behind it. The links already exist. 34 drivers carry `origin:` in their
record doc's frontmatter, in three spellings measured across the stream: project-root-relative
(`wiki/planning/PRD-memory-engine.md`), record-doc-relative (`../../planning/PRD-web-ui-restructure.md`)
and a flow list of either (`[../../planning/PRD-acd-loop-engineering.md, ../../planning/PRD-graph-engineering.md]`).
The `MemoryRecord` shape is frozen (05/ADR-005) and has grown once before, when 148/ADR-003 added
`tags` with an index version bump and no migration. The index is derived, and `status` reports a
store from an older version as stale until an ingest rebuilds it.

**Decision.**
- `MemoryRecord` gains `origin`, an array of project-root-relative paths with forward slashes. It is
  `[]` when there is none, never omitted, matching how `tags` is carried. It joins
  `MEMORY_RECORD_FIELDS`.
- **Whose origin.** A record indexed from a work item takes the `origin:` its own item's record doc
  declares. A story that declares none takes its top-level driver's (a story's records carry
  `item: "39/02"`, and its PRD is the milestone's). Records from the import store and from operator
  auto-memory carry `[]`, because their items are not stream items.
- **Resolution.** Each declared value is tried relative to the project root, then relative to the
  record doc's own folder. The first candidate that names an existing file inside the project root
  is kept, normalised. A value that resolves to neither is dropped, and `status` counts drops as
  `origin.unresolved`. The memory index never cites a path that does not exist, the same invariant
  `source` keeps.
- **Index version.** `INDEX_VERSION` and `GRAPHIFY_INDEX_VERSION` move 3 → 4 in lockstep (the
  frozen-shape control pins the lockstep). No migration: a version-3 store reports stale until
  `aof memory ingest`.
- **Projections.**
  - `--block`: a record with a non-empty `origin` gains ` · origin <p1>; <p2>` after its tags and
    before its source, so the source stays last. A record with `[]` renders byte for byte as before.
  - Text view: one `↳ origin <p1>; <p2>` line after the source line.
  - `--json`: the field, as stored.
- **Ranking is untouched.** `origin` is not tokenised, boosted or filtered on. No `--origin` scope.

**Alternatives considered.**
- *Index `wiki/planning` as a corpus (the original SPEC).* Declined by the operator. It reaches
  documents no item links to (two today) at the cost of a new source, a scope flag and a section
  record format.
- *Derive the link at recall time from the item's record doc.* It would put a file read per record
  on every recall, the hot path the hooks call. It would also make a recall's answer depend on the
  tree at recall time rather than on the index, which breaks "the index is the projection".
- *Keep `origin` as the raw frontmatter string.* A record-doc-relative value means nothing once
  detached from its doc. An agent would have to re-resolve it.

**Consequences.** A block line from a shatter-framed milestone gets longer by one field. Every
consumer that parses the block treats it as opaque text pasted into context, and the `--json`
consumers read named fields, so neither breaks. `memory-recall-pick` inherits the field on the
records it picks from.

**Invariant.** Every path in an indexed record's `origin` names an existing file inside the project
root (FF-17803).

## ADR-003: The migration is a spelling change everywhere the bundle speaks, guarded so the old spelling cannot return to an asset

**Status:** Accepted
**Date:** 2026-10-29

**Context.** 56 occurrences of `aof work memory` across 15 bundle asset files (6 core commands, the
workflow reference, the codex variant, the retrospective-memory-ingest loop and 6 Hyperagent
planner skills), plus the root `README.md`, `schemas/aof.schema.json`'s `memory.backend`
description and the `packages/knowledge/README.md` command list. The rendered runtime folders
(`.claude/`, `.opencode/`, `.agents/`, `.codex/`, `.aof/loops/`) are generated output (AGENTS.md),
re-rendered by `aof work update`. Story 125's README control resolves every `aof …` the README
spells against the route table, so the README's lines resolve only once `aof memory` is routed
(ADR-001).

**Decision.**
- Every bundle asset and doc above spells `aof memory`. The generated folders are re-rendered with
  `aof work update`, never hand-edited.
- The Hyperagent planner skills change only the command's spelling inside their "CLI steps are
  replaced" list. Their substitution (search the repository) is unchanged, because Hyperagent
  planning uses Hyperagent's own knowledge indexing. Updating the uploaded skills is the operator's
  manual step (169/ADR-007), named in the hand-over.
- Cowork's planning skill is rendered from `shatter.md` (165/ADR-002), so it is migrated by the same
  edit. Re-uploading the `.plugin` after `aof planning init --runtime cowork --force` is the
  operator's step.
- Test files and work-stream history keep the old spelling where they test or record the alias.
  Only what ships to a runtime is migrated.
- A guard keeps it that way: no file under `packages/*/assets/` spells `aof work memory` (FF-17802).

**Alternatives considered.**
- *Leave the prompts on the alias indefinitely.* That would make the alias load-bearing for every
  agent run, and the new command would be the one nobody calls.
- *Migrate in the same story as the face.* Possible, but it puts 15 asset files and the
  re-rendered folders into the face's review. The two are separable because the alias stands, so
  they are separate stories, with this one depending on the face.

**Consequences.** After this milestone the alias serves only humans' muscle memory and anything
outside the repo. Its retirement is a small, separate item.

**Invariant.** No bundle asset spells the retired path (FF-17802).

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-17801 | `work:memory` and `memory` are both registered, at routes `work memory` and `memory`, and the alias's `run`, `argv`, `render` and `json` are the canonical command's own function objects | `test/arch/command/acd-memory-alias-one-implementation.test.mjs`, registered in `test/arch/command/index.mjs` — **landed (178/01)**, red probe in-file | ADR-001 |
| FF-17802 | No file under `packages/*/assets/` contains the string `aof work memory` | `test/arch/memory/acd-assets-spell-aof-memory.test.mjs`, registered in `test/arch/memory/index.mjs` — **landed (178/02)**, red probe in-file. Moved from `test/arch/bundle/`, whose controls FF-12405 leg 10 freezes at 23 | ADR-003 |
| FF-17803 | Over a built index of the live stream, every record carries an `origin` array, and every path in it is project-root-relative, forward-slashed and names an existing file inside the project root; `INDEX_VERSION === GRAPHIFY_INDEX_VERSION === 4` | `test/arch/memory/acd-record-origin-resolves.test.mjs`, registered in `test/arch/memory/index.mjs` — **landed (178/03)**, red probe in-file | ADR-002 |
