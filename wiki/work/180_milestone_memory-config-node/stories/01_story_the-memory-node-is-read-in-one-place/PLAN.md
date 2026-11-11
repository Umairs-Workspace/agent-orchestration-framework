# Build brief

## Mechanism

`memory-config.mjs` is a pure module. It imports `commandError` and `KNOWLEDGE_CORPORA`, and nothing
else. It holds the following:
- `LEGACY_MEMORY_KEYS`, a frozen table of `{ from, to }` dotted paths: `memory.sources` →
  `memory.corpora`, `memory.graphify` → `memory.backends.graphify`, and `graph` → `memory.graph`.
  The warnings and the rewrite both walk this table.
- `readMemoryConfig(config)`. It takes the ROOT config, because the legacy `graph` sits at the root.
  For each table row it checks both spellings, refuses a pair present twice, and validates what it
  finds. It returns `{ corpora, corporaSource, graph, backends, legacy }`. Validation reuses each
  resolver's existing messages and codes, with the path set to the key the author wrote.
- `rewriteLegacyMemoryConfig(config)`. It returns a new object, so the input is never mutated, plus
  `{ moves, conflicts }`. It follows ADR-006's key order: the `memory` node goes where the root
  `graph` was when `memory` is absent. Every other key keeps its insertion order. Stories 02 and 03
  are its only callers.

The three resolvers keep their exported names and read through `readMemoryConfig`:
- `resolveMemorySources(memory)` and `autoMemoryEnabled(memory)` answer from the `operator`
  membership of `corpora`. They take the memory node, so wrap it as `{ memory }`.
- `resolveGraphifyExtraction(memory)` reads `backends.graphify`, and its `path` becomes the
  authored spelling.
- `readShareSettings(config)` reads `.graph`, and its messages name the authored path.

`inspectMemoryConfiguration` adds `corpora`, `corporaSource`, `paths` and `legacy`. Config
inspection turns `legacy` into `warning` diagnostics. The `status` face in `memory.mjs` adds a
`config` object to the status answer and its one or more text lines. Do that in the face, after the
port answers, not inside any backend.

Watch for:
- FF-18001's detector is textual. Name the normalised object something other than `memory`, for
  example `node`, so that a reader of the new shape does not trip it. Read every raw key here, and
  never elsewhere.
- `acd-memory-backend-selection` counts textual `.memory` + `.backend` reads. Do not add one.
- The schema keeps `sources` and `graphify` under `$defs/memory`, and the root `graph`, for one
  release, each description saying "Deprecated — use …". `test/command/config-inspect.test.mjs`
  pins the extractor enum's location, so move it to `backends`.

## Verification

Under an isolated `AOF_GLOBAL_HOME`, run `aof test --scope impacted --story 180/01`, which selects
the suites the story's declared files reach, and the `memory-auto-source` integration feature,
unedited. End-to-end: in a temp project, write the legacy
config `{ "graph": { "share": "off" }, "memory": { "backend": "local", "sources": ["claude-auto-memory"] } }`
and run `aof project doctor` and `aof memory status`. You should see two legacy warnings and
`corpora: work, imports, code, operator`. Then add `"memory.graph"` and see the conflict refusal.
Record both controls' red probes in VERIFICATION.

## Out of scope

Writing any config (stories 02 and 03). The init default backend (story 02). Removing the legacy read,
which is the TECH_DEBT entry.
