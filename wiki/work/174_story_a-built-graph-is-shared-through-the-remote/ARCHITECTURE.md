# 174 · A built graph is shared through the project's own remote — architecture

Decisions settled on 2026-10-27 at refine, after the operator answered EXAMPLES Q1–Q4. Solo: the
architect, QA and developer lenses are played inline in one session. Grounded in spike 173's
measurements against this repo's GitHub remote, and in the codebase graph built 2026-10-20 at
`b669097`. `aof graph impact` puts the coupling of `graph-bundle.mjs`, `commands/graph-build.mjs`,
`commands/graph-export.mjs` and `commands/graph-import.mjs` entirely inside the graph command
family, their core bindings and `test/graph/graph-bundle.test.mjs`. The story stays inside that
boundary, plus the config schema.

**Recall.** The first architect recall (observation `6f1b7a52-3c0e-4d2a-9e51-1740a7c2b001`) returned
nothing, because the memory index on this node was empty (`records=0`), not because nothing was on
record. It was re-run after `aof work memory ingest` (5,192 records) as observation
`0b7e4c21-9a3f-4f6d-8c12-1740a7c2b002` and returned five ADRs. Four are **honoured**:
- m11/ADR-003 ("the codebase graph is a git-ignored, derived artifact, never silently served
  stale"): a fetched graph is kept only when `inputsCurrent` confirms it, `graphify-out/` stays
  ignored, and the build result names the fetch (ADR-001).
- m38/ADR-016: scoped by ADR-002 below.
- m13/ADR-002 and m24/ADR-003: every remote call is an argv `git` call through the injected
  helper, never a shell string.

m23/ADR-004 was irrelevant. No near-miss was surfaced.

## ADR-001: A commit's graph is a blob behind a versioned ref on the project's own remote, and `graph:build` fetches it on a miss and publishes it after a clean build

**Status:** accepted · **Source:** spike 173 Finding; EXAMPLES Q1, Q5–Q7

**Context.** 166 made a graph portable as one bundle file but left the carry to the operator.
Spike 173 measured that GitHub accepts, lists and serves a ref outside `refs/heads/` that points
straight at a blob, that a plain clone never downloads it, and that the bundle is 1.3 MB. The
graph is derived (10/ADR-005), so a remote copy is a cache entry, never a second authoritative
store.

**Decision.**

- **Key.** `refs/aof/graph/v<BUNDLE_VERSION>/<full commit sha>`. The commit is the one graphify
  stamped (`built_at_commit`), which publish requires to equal HEAD. The `aof-inputs.json` digest
  cannot be the key: it hashes the files graphify *read*, which are known only after a build. It
  stays the validator. After a fetch, the existing `inputsCurrent` check decides whether graphify
  runs. A bundle-format bump changes the namespace, so an old reader never fetches a bundle it
  cannot unpack.
- **Value.** The ref points at the bundle blob: one object, no wrapping commit, no history. It is
  written with `hash-object -w` and pushed as `<blob>:<ref>`, **never with `--force` or a `+`
  refspec**. Git refuses to move a ref that points at a non-commit, which gives first-writer-wins
  for free (ADR-003).
- **Read path.** `ls-remote` names the blob; `fetch <remote> <ref>` with no local destination
  brings the object without creating a local ref; `unpack-file <blob>` writes it to a file, because
  the injected git returns stdout as text and a gzip bundle cannot pass through it. The file is
  then laid out through the same staged swap `graph:import` uses (166 Q7). Fetch and import share
  that one code path, never a copy of it.
- **Where it hangs.** `graph:build`, only for a code-only whole-root build whose `outRoot` is the
  project root. The order is: inputs current → done, no network. Otherwise, with sharing on, fetch
  the graph for HEAD and, if its inputs are current, done. Otherwise run graphify, then publish.
  The explicit verbs `graph:fetch`, `graph:publish` and `graph:prune` run each half by hand.
- **Remote and switch.** `graph.share: "git-refs"` turns it on; absent or `"off"` means today's
  behaviour, byte for byte (Q4). `graph.remote` names the remote, default `origin`. The default
  branch is the remote's own HEAD (`ls-remote --symref <remote> HEAD`).
- **Failure is soft.** Every remote call runs with `GIT_TERMINAL_PROMPT=0` and the helper's
  timeout. An unreachable remote, a refused push or a missing credential is a warning on the build
  result, never a failed build. A node without push access therefore fetches only.

**Consequences.** One more effect on a build: a network round trip of ~0.8 s on a miss. That is
paid only when the local graph is not current, against a ~300 s build. A published bundle stays
fetchable by sha after its ref is deleted (spike 173 G), so ADR-003's eligibility rule is what
bounds exposure, not pruning.

## ADR-002: Only the codebase graph rides the ref transport; memory never does, and the transport touches no mesh stream

**Status:** accepted · **Source:** EXAMPLES Q8; m38/ADR-016 (`acd-memory-index-never-on-mesh`)

**Context.** m38/ADR-016's invariant 3 says memory syncback never fetches a remote index or a
peer's cache. `graph:build` serves two graphs: the codebase graph at `<projectRoot>/graphify-out/`
and the memory work graph at `.aof/memory-graph/graphify-out/`, which the memory backend reaches
through `invoke("graph:build")` with its own `outRoot`. ADR-016 calls `graphify-out/graph.json`
"machine-local" because, when it was written, that file *was* the memory recall index. Memory has
since moved to its own root (the eviction fix recorded in `memory/graphify-backend.mjs`), and 166
already carries the code graph between machines as a file. So ADR-016's rule now governs the memory
graph and index, not the code graph.

**Decision.** The ref transport lives in one module, `packages/knowledge/src/graph-share.mjs`. It
is the only module that names `refs/aof/graph/`, and it imports nothing from the memory modules or
any mesh transport module. No memory module imports it. `graph:build` calls it only when the build
is code-only, whole-root and `outRoot === projectRoot`. So the memory work graph and the memory
index are never fetched or published, whatever `graph.share` says. ADR-016 is honoured unchanged:
this transport is git to the project's own remote, not a mesh stream, and the memory side never
reaches it.

**Consequences.** A memory graph is still rebuilt per clone, which costs little (10/ADR-005). If
sharing it is ever wanted, that needs its own ADR superseding this one and an amendment to
ADR-016.

## ADR-003: Only a clean build of a default-branch commit is published, the first publish wins, and each publish prunes to the newest 20

**Status:** accepted · **Source:** EXAMPLES Q1–Q3; spike 173 Finding 3 and 5

**Decision.**

- **Eligible.** A graph is published only when all of these hold. Graphify's `built_at_commit`
  equals HEAD. `git status --porcelain` is empty: nothing modified, staged or untracked that is not
  ignored (`listCloneFiles` reads `--others`, so a dirty build carries uncommitted work's
  structure). HEAD is an ancestor of, or equal to, the remote default branch's tip, and that tip is
  present locally (Q2). Anything else fails closed. Each skip names its reason: the files, the two
  commits, or "not on the default branch".
- **First publish wins.** An existing ref for the commit means already published; nothing is
  pushed. A push the remote refuses because the ref appeared meanwhile reads the same way. Bundles
  are never compared: two nodes building one commit stamp different `builtAt`/`exportedAt`, so
  their bytes always differ (this corrects spike 173 Finding 2, which read a difference as
  non-determinism).
- **Retention.** Keep a ref only if its commit is one of the newest 20 first-parent commits of the
  default branch's tip. Every successful publish prunes, and `graph:prune` applies the same rule by
  hand (Q3). Prune deletes by name with `push --delete`, and skips with a reason when the tip is not
  local. The count is a constant beside `BUNDLE_VERSION`, not a setting.

**Consequences.** A loop lane or feature branch never publishes; its worktree fetches the graph of
the default-branch commit it branched from. The ref list on the remote stays near 20 (~26 MB).

## Fitness functions

Both controls are declared here and land with their subject. Register them in
`test/arch/graph/index.mjs`, and record a red probe for each in VERIFICATION.md.

| ID | Invariant | Enforced by | Source |
| --- | --- | --- | --- |
| FF-17401 | `refs/aof/graph/` is named in exactly one source module, `graph-share.mjs`; no memory module imports it, and it imports no memory or mesh-transport module | test/arch/graph/acd-graph-share-code-graph-only.test.mjs | ADR-002 |
| FF-17402 | No source module pushes to `refs/aof/graph/` with `--force`, `-f` or a `+` refspec, and every remote git call in `graph-share.mjs` passes `GIT_TERMINAL_PROMPT=0` | test/arch/graph/acd-graph-share-never-forces.test.mjs | ADR-001, ADR-003 |
