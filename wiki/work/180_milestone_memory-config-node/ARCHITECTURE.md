---
doc: architecture
---
# 180 · One memory node in the config — Architecture Decisions

Recall `3e2a45a7-d5e6-4b50-8db9-a2d3d3a6002b` (architect, area architecture) returned five
decisions. Four bear on this milestone, and all four are honoured:
- 179/ADR-001 is honoured by ADR-002. `memory.corpora` names only `KNOWLEDGE_CORPORA`, so the
  config cannot name a corpus the port does not know.
- 179/ADR-002 is honoured by ADR-003. Share stays transport, wrapped by `graph:build` and kept out
  of the engine. Only its two keys move.
- 179/ADR-003 is honoured by ADR-002. `operator` stays a record corpus behind the record backend,
  and no key routes a recall to an engine.
- 10/ADR-003 is honoured by ADR-001 and ADR-004. The `backend` enum stays the one place a selection
  is reviewed. `claude-cli` stays the extraction default, and only the place that setting lives
  changes.

148/ADR-005, the retrieval eval, is irrelevant here. The SPEC's own recall
(`f85f7807-b819-47b6-b974-4df5f4db744e`) also honours 10/ADR-003. The `backend` key keeps its name
and its single read site, so `acd-memory-backend-selection` stays as it is.

**Two corrections to the SPEC, recorded rather than silently applied (STATE, D1 and D2).**
- The SPEC says 178 declared `planning` under `memory.sources`. It did not. The operator chose
  link-following over a planning corpus (178/ADR-003), so `sources` still admits only
  `claude-auto-memory`. The migration therefore carries one value.
- The SPEC's illustrative `"corpora": ["work", "code"]` would be refused by ADR-002. That ADR says
  why.

**Boundaries follow the graph** (`aof graph build .`, 2026-10-30T17:45Z, 21,158 nodes, 46,459 edges,
code-only, egress none). `graph impact` shows the old keys have exactly three readers, and the
milestone's faces have two more callers:
- `claude-auto-memory.mjs`'s `resolveMemorySources` is imported by `memory.mjs` and
  `memory/local-indexing.mjs`;
- `graphify-backends.mjs`'s `resolveGraphifyExtraction` is imported by `memory.mjs`,
  `memory/graphify-backend.mjs` and `graphify-code-backend.mjs`;
- `graph-share.mjs`'s `readShareSettings` is imported by the four sharing graph commands;
- `core/src/work/update.mjs` is imported by the two init/update bindings;
- `config-editor.mjs` is imported only by `assemble.mjs`.

None of those files imports another milestone face. So the shape and its one reader are a single
story (01), because all three readers and both report faces meet in `memory.mjs`. The two writers,
`aof work update` (02) and the config editor (03), share nothing but the module 01 creates. They
build in parallel after it.

## ADR-001: One `memory` node, read in one module; the backend selection keeps its own single read

**Status:** Accepted
**Date:** 2026-10-30

**Context.** The memory keys live in three places, and each place has its own reader:
- `memory.sources` is read by `resolveMemorySources`
  (`packages/knowledge/src/memory/claude-auto-memory.mjs:35`);
- `memory.graphify.extractionBackend` is read by `resolveGraphifyExtraction`
  (`packages/knowledge/src/graphify-backends.mjs:13`);
- the root `graph.share` and `graph.remote` are read by `readShareSettings`
  (`packages/knowledge/src/graph-share.mjs:36`).

`memory.backend` has its own single read, `selectBackendName`, and `acd-memory-backend-selection`
guards it (05/ADR-002). Validation is hand-written. The JSON schema is enforced by the tests, not at
load.

**Decision.**
- **The shape.** `$defs/memory` becomes this:
  ```json
  { "backend": "graphify", "corpora": [...], "graph": { "share", "remote" }, "backends": { "graphify": { "extractionBackend" } } }
  ```
  For one release, the schema still admits the legacy spellings, marked deprecated in their
  descriptions: `memory.sources`, `memory.graphify`, and the root `graph`.
- **One reader.** The new module `packages/knowledge/src/memory-config.mjs` is the only module that
  reads `corpora`, `graph` or `backends`, under either spelling.
  - `readMemoryConfig(config)` takes the root config and returns the node in the new shape:
    `{ corpora, corporaSource, graph: { share, remote }, backends: { graphify }, legacy }`.
  - `legacy` lists `{ path, replacement }` for every old spelling it read.
  - The three resolvers keep their names, error codes and answers, and read through this module.
    `resolveMemorySources` becomes the `operator` membership of `corpora` (ADR-002).
- **The single read of `backend` is untouched.** `memory-config.mjs` never reads `memory.backend`.
  `selectBackendName` stays its one reader, and 05/ADR-002's control does not move.
- **A setting has one home.** A config that spells one setting both ways is refused with
  `memory-config-conflict`, and the refusal names both paths. These are the three pairs: `sources`
  and `corpora`, `memory.graphify` and `memory.backends.graphify`, and the root `graph` and
  `memory.graph`. It is refused even when the two values agree, because two homes is the defect.
- **Errors name the path the author wrote.** An invalid value under a legacy key keeps its old code,
  and its `path` is the legacy path. Examples are `invalid-memory-sources` with path
  `memory.sources.0`, and `graph-share-unknown` with path `graph.share`. The same value under a new
  key has path `memory.corpora.0` or `memory.graph.share`. The corpora code is
  `invalid-memory-corpora`.
- **The legacy warning has two homes, and neither is a command's output.**
  - Config inspection reports each `legacy` entry as a diagnostic: severity `warning`, code
    `memory-config-legacy`, the old key as its `path`, and a message that names the replacement and
    says that `aof work update` rewrites it. `aof project doctor` therefore shows the warning, and
    its `config-valid` check stays `ok`.
  - `aof memory status` prints the same entries (ADR-005).

  `recall`, `ingest`, every `--block` and every graph verb print exactly what they print today.
- **The rewrite lives beside the reader.** `rewriteLegacyMemoryConfig(config)` is a pure function
  that returns `{ config, moves, conflicts }`, and it is exported from the same module. The mapping
  from old path to new path is one frozen table, `LEGACY_MEMORY_KEYS`, which the reader's warnings
  and the rewrite both use. ADR-006 and the config editor call it, and neither restates the mapping.
- **The legacy read is bounded.** It is a TECH_DEBT entry, filed by story 01, that names the release
  after which `readMemoryConfig` stops reading the old spellings and the schema drops them.

**Amends 174/FF-17401 leg (b).** `graph-share.mjs` may import `memory-config.mjs`. That module
reads configuration only. It imports nothing but `@aof/contracts/error` and the corpus vocabulary in
`engine.mjs`: no index, no backend, no transport. FF-18001 pins that import set. Leg (b) still
refuses every other memory import.

**Alternatives considered.**
- *Let each resolver read both spellings itself.* That gives three dual readers and three copies of
  the deprecation text, and none of them could detect a conflict across keys. Rejected.
- *Accept both spellings when they agree.* Then the next edit changes one of them and silently loses.
  Rejected.
- *Print the warning on every memory and graph command.* That breaks byte-for-byte output for
  scripts and hooks that parse `--block`, and prints the same line hundreds of times in a loop.
  Rejected.

**Consequences.** A later engine's settings arrive as one `backends.<name>` block, read in one
place. Readers outside the module see the new shape only.

**Invariant.** Across `packages/*/src`, only `memory-config.mjs` reads `corpora`, `sources`,
`graphify`, `backends` or `graph` off a memory object, or `graph` off the root config. Its imports
are `@aof/contracts/error` and `engine.mjs` alone (FF-18001).

## ADR-002: `memory.corpora` is the set of corpora served; absent means today's set, and only `operator` is optional

**Status:** Accepted
**Date:** 2026-10-30

**Context.** The port knows `work`, `code`, `operator` and `imports` (179/ADR-001,
`packages/knowledge/src/engine.mjs:24`). Today, `work` and `imports` are indexed whenever a record
backend is selected, and `code` is built on demand by `aof graph build`. `operator` is indexed only
when `memory.sources` names `claude-auto-memory` (159/ADR-001). The SPEC puts "changing what any
existing key means" out of scope.

**Decision.**
- `corpora` is a duplicate-free array, and its items are exactly `KNOWLEDGE_CORPORA`.
- **Absent means the default set**, `["work", "imports", "code"]`, which is today's behaviour.
  `corporaSource` reports `default` or `project setting`.
- **`work`, `imports` and `code` are always served.** An explicit list that leaves one out is refused
  with `invalid-memory-corpora`, and the message says why: the corpus is always served, and
  `memory.backend: "none"` is how memory is turned off. Leaving a corpus out has no meaning yet.
  Refusing now keeps every future meaning open, while silently ignoring it now would make a
  later meaning a breaking change.
- **`operator` is the one optional corpus.** `operator ∈ corpora` is exactly today's
  `sources: ["claude-auto-memory"]`. `autoMemoryEnabled` answers from it, and the leaf, its records,
  its containment and FF-15901..3 are unchanged.
- The migration maps `sources: ["claude-auto-memory"]` to
  `corpora: ["work", "imports", "code", "operator"]`. It drops `sources: []` and writes no
  `corpora`, because an empty list was already the default.
- The schema's `corpora` items enum equals `KNOWLEDGE_CORPORA`, and FF-18002 holds it there. Its
  `allOf`/`contains` states the three required members.

**Departs from the SPEC's illustrative `["work", "code"]`.** Under this rule that list is refused,
because it leaves out `imports`. The SPEC's own out-of-scope line is what decides it.

**Alternatives considered.**
- *Purely additive (`corpora: ["operator"]`).* A list where `work` can be listed but not removed reads
  as a switch that does nothing. Rejected.
- *Omitting a corpus turns it off.* That is a new capability. Its meaning for `code` (does
  `graph build` refuse?) and for `imports` is undefined, and the SPEC rules it out. Rejected for
  this milestone. The refusal keeps it available later.

**Invariant.** The schema's corpora enum equals `KNOWLEDGE_CORPORA` (FF-18002). Every list
`readMemoryConfig` accepts contains `work`, `imports` and `code`.

## ADR-003: The code corpus's share settings move under `memory.graph`, unchanged in meaning; the never-shared rule is scoped to the code corpus

**Status:** Accepted
**Date:** 2026-10-30

**Context.** 174/ADR-001 put `graph.share` and `graph.remote` at the root. The schema's description
says the memory work graph and index are never shared, and FF-17401 holds that rule.

**Decision.**
- `memory.graph` holds `share` (`git-refs` or `off`) and `remote` (non-empty, and not starting with
  `-`). These are the same enum, pattern, defaults and errors as today. An absent `memory.graph`, or
  `share: "off"`, keeps every build local.
- `readShareSettings(config)` reads `readMemoryConfig(config).graph`. The four sharing commands are
  unchanged.
- `$defs/memory.properties.graph`'s description carries the rule as one sentence: it governs the
  code corpus's artifact only, and the work graph and the memory index are never shared.
  FF-18002 asserts the sentence, and FF-17401 stays the behavioural control.
- FF-17401 leg (d), the live no-remote-call check, writes its fixture in the new spelling.

**Alternatives considered.**
- *`memory.corpora` entries as objects, such as `{ "code": { "share": … } }`.* That turns a list of
  names into a per-corpus settings bag, and the next setting would land in the same bag. It would
  also make egress a per-corpus key by the back door (see ADR-005). Rejected.

**Invariant.** No path under `memory.graph` reaches `.aof/memory-graph/` or the memory index
(FF-17401, unchanged), and the schema's sentence says so (FF-18002).

## ADR-004: Per-engine settings live in `memory.backends.<name>`; graphify's extraction setting moves there, and every block is validated whether or not its engine is active

**Status:** Accepted
**Date:** 2026-10-30

**Context.** `memory.graphify` is one engine's private setting at the memory root. 154/09 validates
it even when another backend is selected (`memory.mjs:639`).

**Decision.**
- `backends` is an object, and its property names are engine names from the `backend` enum. This
  milestone defines only `backends.graphify`, with `extractionBackend` whose enum equals
  `GRAPHIFY_BACKENDS`. `additionalProperties` is false, both on `backends` and inside each block.
- Absent `extractionBackend` still reports `claude-cli` as the legacy default, with source
  `legacy default`. That default does not change, because only its home moves.
- An inactive block is validated exactly as today. `backends.graphify` with an unknown extractor is
  refused while `backend` is `local`.
- `EXTRACTION_CONFIG_PATH` becomes `memory.backends.graphify.extractionBackend`. A legacy-spelled
  setting reports `memory.graphify.extractionBackend` as its source path, so the face names the key
  the author actually wrote.
- **Cross-item consequence.** The backlog item `retire-graphify-memory-backend` plans to drop
  `memory.graphify.extractionBackend`. If 180 lands first, that item drops
  `memory.backends.graphify` and the legacy spelling instead, and it does so through
  `LEGACY_MEMORY_KEYS`. This is recorded in STATE as a note for its refine. Refine does not edit
  another item's SPEC.

**Invariant.** The `backends` property names are a subset of the `backend` enum, and the
`extractionBackend` enum equals `GRAPHIFY_BACKENDS` (FF-18002).

## ADR-005: Egress stays a reported classification, never a config key; the faces print the new paths

**Status:** Accepted
**Date:** 2026-10-30

**Context.** The SPEC asks ARCHITECTURE to decide whether egress becomes a per-corpus setting.
Today egress is reported, not configured. `graph:build` classifies it from `GRAPHIFY_BACKENDS`
(179/ADR-002). The graphify memory backend's `status` reports `extractionEgress: "docs-media"`. The
work corpus reaches a hosted model only through that backend's extraction, and only when
`memory.backend` is `graphify`.

**Decision.**
- **No egress key is added**, anywhere under `memory`. A per-corpus `egress` key would be a new
  switch to enable sending, which the SPEC forbids. A key that could only *forbid* sending would
  duplicate `memory.backend: "local"`, which already sends nothing. FF-18002 asserts that the schema
  holds no property named `egress` under `$defs/memory`.
- Egress keeps being *reported*: by `aof memory status` for the work corpus, by
  `aof graph build`'s `egress` field for the code corpus, and by config inspection's
  `memory.extraction`.
- **The work corpus's default.** "The work corpus cannot be sent to a hosted model by default"
  depends on what `aof work init` selects for a new project. It selects `graphify` today
  (`init.mjs:258`), so init's default is a product decision. It is asked as a business question in
  story 02's example map, never taken as a default here. The ADR rule holds either way: no key added
  here makes sending easier than today.
- **The faces print the new paths.**
  - Config inspection's `memory` block gains `corpora`, `corporaSource` and `paths`, which holds
    each setting's dotted path, and `extraction.path` names the path ADR-004 resolved.
  - `aof memory status` gains a `config` object, `{ corpora, corporaSource, legacy }`, plus one text
    line per entry. When nothing is legacy, the text adds exactly one line, `corpora: …`.
  - The memory `status` answer is otherwise unchanged.

**Alternatives considered.**
- *`memory.corpora[].egress`.* Rejected above.
- *Fold the init default into this ADR.* That would decide a product default without the person
  who owns it. Rejected.

**Invariant.** `$defs/memory` declares no `egress` property at any depth (FF-18002).

## ADR-006: `aof work update` rewrites the old shape by filling, never re-authoring; init writes only the new shape

**Status:** Accepted
**Date:** 2026-10-30

**Context.** `updateWork` (`packages/core/src/work/update.mjs:60`) re-renders the bundle, then
re-establishes the gitignore and the work-dir git files. It never writes `.aof/aof.config.json`.
127/ADR-005 governs config writes: fill the hole and never clobber, and every foreign section
survives byte-intact, through the one read-merge-write in `work/headroom.mjs`.

**Decision.**
- After the bundle write, `updateWork` reads the project config, calls `rewriteLegacyMemoryConfig`
  and writes **only if** `moves` is non-empty, through the same `readConfig`/`writeConfig`.
- **No move means no write.** The file stays byte-identical and its mtime does not change. A second
  run is therefore a no-op.
- **What moves.**
  - `memory.sources` becomes `memory.corpora` (ADR-002's mapping).
  - `memory.graphify` becomes `memory.backends.graphify`.
  - The root `graph` becomes `memory.graph`.
- **Where the moved keys go.** Inside `memory`, the keys sit in the order `backend`, `corpora`,
  `graph`, `backends`. When there was no `memory` node, it takes the root `graph` key's position.
- **Everything else is untouched.** Every other root key keeps its position and its serialized
  bytes. That includes `memory.backend`, which is never filled or changed here.
- **A conflict is reported, never resolved.** A pair present in both spellings is left exactly as
  written, and `conflicts` names it. The read side refuses it with `memory-config-conflict` (ADR-001),
  so the operator chooses. Moves for the other, unconflicted pairs still apply.
- `--dry-run` reports the moves and conflicts and writes nothing. The envelope carries
  `memoryConfig: { moves, conflicts, written }`, and the text face prints one line per move and per
  conflict.
- No project config means no step, and no config is created. A config that does not parse fails
  `aof work update` exactly as it does today. `updateWork` already reads the config for the work
  dir (`update.mjs:133`) before this step, and this ADR does not change that.
- **Init writes only the new shape.** `initConfig` writes nothing but `memory.backend`, which is
  valid in both shapes. A config that init creates carries no legacy key, and init never migrates,
  because update does that. Which backend init selects is story 02's business question (ADR-005).

**Alternatives considered.**
- *Migrate at load, in memory, and never write.* That leaves the old shape on disk forever and the
  warning permanent. Rejected.
- *Migrate in `aof work init`.* Init fills holes for a fresh project. A migration is update's job, and
  the SPEC names update. Rejected.

**Invariant.** A config with nothing legacy is not written by `aof work update`. Behavioural, proven
by story 02's scenarios, and `acd-no-clobber-without-force` is unchanged.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-18001 | Across `packages/*/src`, only `packages/knowledge/src/memory-config.mjs` reads `corpora`/`sources`/`graphify`/`backends`/`graph` off a `memory` object, or `graph` off the root config; that module imports only `@aof/contracts/error` and `engine.mjs` | `test/arch/memory/acd-memory-config-one-reader.test.mjs`, registered in `test/arch/memory/index.mjs`; pending (lands with story 01) | ADR-001 |
| FF-18002 | `$defs/memory.properties.corpora.items.enum` equals `KNOWLEDGE_CORPORA` and requires `work`, `imports`, `code`; `backends` property names are a subset of the `backend` enum and `backends.graphify.extractionBackend`'s enum equals `GRAPHIFY_BACKENDS`; `memory.graph`'s description carries the never-shared sentence; no `egress` property exists anywhere under `$defs/memory` | `test/arch/memory/acd-memory-node-schema.test.mjs`, registered in `test/arch/memory/index.mjs`; pending (lands with story 01) | ADR-002, ADR-003, ADR-004, ADR-005 |
