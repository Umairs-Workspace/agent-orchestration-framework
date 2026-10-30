---
doc: architecture
---
# 179 · One knowledge engine behind both memory faces — Architecture Decisions

Recall `0cc41230-ce60-48e3-8988-ebf655feee9b` (architect, area architecture) surfaced five
decisions this milestone builds on or amends. 05/ADR-003 (the backend interface) is amended by
ADR-001. 10/ADR-002 (the graphify memory backend reaches graphify only through `graph:build`) is
honoured unchanged by ADR-003. 10/ADR-003 (graphify in the memory enum, `claude-cli` by default) is
left alone: retiring it is `retire-graphify-memory-backend`'s job, not this one's. 13/ADR-003 (new
knowledge extends the indexer, never a bespoke store) is honoured by ADR-003. 39/ADR-002 (the two
delivery record types) bears on nothing in scope.

**What 177 changed about this milestone.** The SPEC was framed before 177's finding, which retires
the graphify memory backend. That retirement is a backlog milestone, `retire-graphify-memory-backend`,
and it says 179 should wait on it. These ADRs are drawn so that the build order does not matter.
The port wraps every record backend the registry holds, and builds no seam for the graphify memory
backend's private work-stream graph. If the retirement lands first, the registry holds one fewer
backend and nothing here changes. If 179 lands first, the retirement deletes one registration and one
module. Neither milestone re-opens the other's contracts (STATE, default D1).

**What 178 changed.** 178 shipped the `aof memory` face, with `aof work memory` as a byte-identical
alias (178/ADR-001). So the memory faces are `aof memory` and its alias. The SPEC's out-of-scope line
for 178 is satisfied, not pending.

**Boundaries follow the graph** (`aof graph build .`, 2026-10-30T11:47Z, 21,070 nodes, 46,235 edges,
code-only, egress none). `graph-impact.mjs`'s `computeImpact` has three production importers: the
`graph:impact` command and the core bindings for test selection and story-contract derivation.
`graph-normalize.mjs`'s readers are those three, plus seam liveness, `graphify.mjs`, the graphify
memory backend, and the artifact-moving `graph-export`/`graph-import` commands. `memory.mjs` has two
production importers, `bindings/work/memory.mjs` and `bindings/config-inspect.mjs`, and no graph
reader imports it. So the code corpus (ADR-002, ADR-004) and the record corpora (ADR-003) share no
source file. The only thing they share is the port module (ADR-001), which is why the port is
wave 1 and the two corpora build in parallel after it.

## ADR-001: One knowledge-engine port: four verbs, a capability declaration keyed by aof's corpora, and a structured miss for an unserved pair

**Status:** Accepted
**Date:** 2026-10-30

**Context.** Two pathways each drive graphify, write their own artifact and degrade on their own.
`aof memory` resolves a record backend through `resolveConfiguredBackend`
(`packages/knowledge/src/memory.mjs:140`) and calls 05/ADR-003's `{ name, recall, reindex, status }`.
`aof graph` builds through `createGraphBuildCommand` (`packages/knowledge/src/commands/graph-build.mjs:7`)
and answers `impact` by reading `graphify-out/graph.json` itself
(`packages/knowledge/src/commands/graph-impact.mjs:82`). Three core readers parse the same artifact
again. 176 found no second engine worth adopting, so the port is shaped by aof's corpora, not by any
one engine's model.

**Decision.**
- `packages/knowledge/src/engine.mjs` is the port. `createKnowledgeEngine({ backends })` returns
  exactly `{ ingest, recall, relations, status }`:
  - `ingest(corpus, input, ctx)`;
  - `recall(query, scope, opts, ctx)`, which asks the record corpora;
  - `relations(paths, ctx)`, which asks the `code` corpus;
  - `status(corpus, ctx)`, where an absent corpus answers every declared corpus, keyed by name.
- The corpus vocabulary is `KNOWLEDGE_CORPORA = ["work", "code", "operator", "imports"]` and the verb
  vocabulary is `ENGINE_VERBS = ["ingest", "recall", "relations", "status"]`. Both live in `engine.mjs`
  and are frozen. Config never names a corpus in this milestone (`memory-config-node` owns that).
- **The capability declaration.** Every backend exports `corpora`, a frozen map from corpus to the
  verbs it serves for that corpus, for example `{ code: ["ingest", "relations", "status"] }`.
  Construction validates it and throws a `TypeError` that names the backend and the offending entry
  when:
  - a corpus or verb is outside the vocabulary;
  - a declared verb has no method;
  - two backends declare the same (corpus, verb) pair.
- **A record backend keeps 05's method names.** Its `ingest` is its existing `reindex`: the port
  calls `reindex(input.only ?? null, ctx)`. The 05 suites that call `reindex` directly (43 sites)
  stand unchanged. An engine backend names its methods by the port's verbs.
- **An unserved pair is a value, not a throw, and never a fallback.** Asking a verb of a corpus that
  no backend declares answers `{ served: false, code: "corpus-unserved", corpus, verb, backends }`,
  where `backends` names the registered ones. This is `present: false`'s posture, one level up. The
  port never forwards the request to a backend that did not declare the pair.
- **Composition is per workspace.** Config selects the record backend per call (05/ADR-002), so a
  face composes the port over the backends it holds. The memory faces compose
  `[the configured record backend]`, and the code readers compose `[the graphify code backend]`.
  One contract, assembled where the backends are known. `packages/core/src/application/bindings/knowledge-engine.mjs`
  is the core home of that assembly.

**Amends 05/ADR-003.** A record backend's default export is now exactly
`{ name, corpora, recall, reindex, status }`. FF-17902 is the amended control, in the existing file.

**Alternatives considered.**
- *Rename `reindex` to `ingest` on every record backend.* This would give one method name per verb,
  but it touches 43 call sites in suites that exist to prove the refactor is behaviour-preserving. It
  also edits the 05 contract for a spelling. Rejected.
- *Two backend shapes and no shared declaration.* That is today's two pathways with a new name.
  Rejected.
- *Throw on an unserved pair.* A throw reads as a failure. "This backend does not hold that corpus"
  is a fact a caller acts on, the way `graph impact` labels a coverage gap (11/ADR-007). Rejected.

**Consequences.** A later engine plugs in by exporting `corpora` and the methods it declares.
Nothing about graphify leaks into the port. No face asks an unserved pair today, because there is no
`--corpus` flag yet. The miss is therefore proven at the port, against stub backends.

**Invariant.** The port answers exactly the four verbs, and every backend's declaration stays inside
the vocabulary with a method behind each declared verb (FF-17901).

### Diagram

**Why a picture helps.** Two faces, one port, two kinds of backend, and three artifacts. The point is
which arrow does *not* exist: a face reaching an artifact directly.
**View.** A left-to-right component view: faces → port → backends → artifacts.
**Components.**
- Faces: `aof memory` (with its alias), `aof graph build`, `aof graph impact`, and the three
  code readers (test selection, contract derivation, seam liveness).
- The port: `engine.mjs`, with its declaration check.
- Backends: the record backend (local, or graphify memory until it is retired, or none), and the
  graphify code backend.
- Artifacts: `.aof/aof.memory.index.json`, `graphify-out/graph.json`, and the retiring
  `.aof/memory-graph/`.

**Flows.** Each face reaches the port. The port routes by (corpus, verb) to exactly one backend. Each
backend owns its artifacts. The unserved pair returns from the port without touching any backend.

## ADR-002: graphify serves the `code` corpus behind the port, unchanged in behaviour, with one degrade path and the ignore policy owned by ingest

**Status:** Accepted
**Date:** 2026-10-30

**Context.** `graph:build` owns several things itself:
- binary resolution and the `graphify-missing` refusal (`graph-build.mjs:61`);
- egress classification (`classifyEgress`, `graph-build.mjs:82`, fed by the one table
  `GRAPHIFY_BACKENDS`, `packages/knowledge/src/graphify-backends.mjs:5`);
- the built-artifact honesty check (`readBuiltGraph`, `graph-build.mjs:98`).

`graph:impact` owns `no-graph` (`commands/graph-impact.mjs:69`). The nested `graphify-out/.gitignore`
is written only by the memory backend (`memory/graphify-backend.mjs:248`) and by a share fetch. That
is 149's open gap: `aof graph build .` leaves `graphify-out/` untracked.

**Decision.**
- `packages/knowledge/src/graphify-code-backend.mjs` is the engine backend
  `{ name: "graphify", corpora: { code: ["ingest", "relations", "status"] }, ingest, relations, status }`.
  It is composed in core from the existing graphify services.
- `ingest("code", input)` is today's build body, moved: binary resolution, the one spawn through
  `runGraphifyBuild` (09/ADR-002's sole spawn site is unchanged), `readBuiltGraph`, and egress from
  `GRAPHIFY_BACKENDS`. **It writes the nested `graphify-out/.gitignore` under the out root on every
  build**, which discharges 149's gap. Its result is today's `BuildResult`, field for field.
- `relations(paths)` is the structured edge read, formalised (176's finding): `readGraph` and
  `normalizeGraph` on every call, then `computeImpact`. Its answer is
  `{ served: true, available, unavailable, artifact, builtAt, files }`, where
  `files[i] = { file, present, dependencies, dependents }`. `unavailable` is `null`, `"no-graph"` or
  `"graph-unreadable"`, and an unavailable answer carries `cause`: the read error's `code`, or else
  its message. Seam liveness quotes that cause today. **It reads the artifact on every call and caches nothing**, because a cached
  graph is how two calls in one process stop being two answers (72/ADR-002).
- `computeImpact` (`packages/knowledge/src/graph-impact.mjs:46`) is rewritten to make **one pass over
  the edges per call**, however many paths are asked. Its matching rule and output stay as they are,
  and `graph-impact.suite.mjs` is the proof. That lets a caller ask about every file at once
  (ADR-004) without the O(paths × edges) walk its own comment prices.
- `status("code")` answers `{ binary: present | "graphify-missing", artifact, builtAt, unavailable }`
  through the same availability function `relations` uses. **This is the one degrade path for the
  corpus**: `graphify-missing` (binary), `no-graph` (artifact absent) and `graph-unreadable` (artifact
  does not parse) are produced in one place and nowhere else.
- **The faces become thin.**
  - `graph:build` calls `ingest("code", …)` and keeps 174's share wrapping. Share moves an artifact
    between clones; it is transport, not engine work.
  - `graph:impact` calls `relations(paths)` and maps `no-graph` to today's 424 refusal, byte for byte.
  - Their ids, schemas, routes and renders do not change, and the stdio MCP server, which reaches them
    through `invoke("graph:…")`, is unchanged.
- **The engine-native verbs stay outside the port.** These are `graph:query`, `graph:triage`,
  `graph:serve`, `graph:export`, `graph:import`, `graph:fetch`, `graph:publish` and `graph:prune`.
  query and triage return graphify's own NL output, which 09/ADR-001 forbids parsing. The rest move
  artifact bytes. None of them is a record or an edge read.

**Amends 09/ADR-001 and 09/ADR-002.** The command remains the CLI door and `graphify.mjs` remains
the sole spawn site. What changes is that `graph:build` and `graph:impact` no longer drive graphify
or read the artifact themselves. The graphify code backend is the one module that does. FF-17903
amends the bijection control to pin this.

**The retiring wart, named.** The graphify memory backend builds its work-stream graph by invoking
`graph:build` with `outRoot: .aof/memory-graph` (10/ADR-002, honoured). After this ADR, that call
rides `ingest("code")`, so the code corpus's ingest also builds a work-stream graph for one caller.
That is the single known exception. `retire-graphify-memory-backend` discharges it by deleting the
caller. No seam is built for a pathway that is about to be deleted.

**Alternatives considered.**
- *Move share into ingest.* That would make the engine own git transport (174/ADR-001's subject).
  Rejected.
- *Put query and triage behind `recall("code")`.* Their answer is fuzzy text from a hosted or
  heuristic traversal, and the SPEC says an unserved corpus is never answered fuzzily. Rejected.
  `recall("code")` is unserved.

**Consequences.** `aof graph build` now leaves an ignored `graphify-out/`. Every other output is
unchanged.

**Invariant.** `graph:build` and `graph:impact` neither import graphify's read functions nor
`computeImpact`, and with the binary or the graph absent they answer `graphify-missing` / `no-graph`
through the port (FF-17903).

## ADR-003: The record corpora sit behind the port; records never come from an engine, and the memory faces answer byte for byte as they do today

**Status:** Accepted
**Date:** 2026-10-30

**Context.** One derived index, `.aof/aof.memory.index.json` (05/ADR-005), holds the work stream
(05/ADR-007), imported milestones (13/ADR-003) and the opt-in operator auto-memory (159). The parser
leaves are the only record source (05/ADR-001), scope is a hard pre-filter (05/ADR-006), and every
`source` resolves to `path:line`. `executeMemoryVerb` (`memory.mjs:509`) dispatches straight to the
resolved backend.

**Decision.**
- Every record backend the registry holds (`BACKEND_REGISTRY`, `memory.mjs:96`) declares
  `corpora: { work: [...], operator: [...], imports: [...] }`, each `["ingest", "recall", "status"]`.
  The three share one index, so ingesting any one of them rebuilds the index they share. `none`
  declares the same set and answers empty: memory off is "served, empty", as today, never
  `corpus-unserved`.
- `executeMemoryVerb` composes the port over the resolved backend and dispatches through it:
  - `recall` and `recurrence` → `recall`;
  - `ingest` and `reindex` → `ingest("work", { only })`;
  - `status` → `status("work")`.

  `record-recall` still resolves no backend (153/ADR-001). The `resolveBackend` injection the
  twenty in-process harnesses use is kept. They inject a backend, and the port wraps it.
- **Bytes unchanged.** Every verb and projection under `aof memory` and `aof work memory` prints
  exactly what it prints today: block, text, `--json`, exit code.
- **No record backend declares `code` or `relations`, and no backend declaring `code` declares
  `recall`.** Records come from the parser leaves alone, and the port cannot route a recall to an
  engine.
- **The graphify memory backend is wrapped as-is.** It gains its `corpora` line and nothing else.
  Its work-stream graph is a private ranking signal (10/ADR-001), not a corpus of the port.

**Amends 10/ADR-001 and 10/ADR-002.** The two-half composition (parser records plus a graph re-rank)
stays private to that one backend until `retire-graphify-memory-backend` deletes it. The port sees a
record backend. 10/ADR-004's degrade to the local index is untouched.

**Alternatives considered.**
- *Lift the work-stream graph build behind the port as a corpus of its own.* 177 measured that it
  changed 0 of 200 recalls and retired it. Building a seam for it is the risk the SPEC's own
  dependency note names. Rejected.

**Consequences.** The memory face has no idea which engine serves which corpus. A later
`--corpus` scope (`memory-top-level-with-corpora`'s deferred gap, `memory-config-node`) is a
declaration lookup, not a new pathway.

**Invariant.** Every record backend exports exactly `{ name, corpora, recall, reindex, status }`. No
record backend declares `code` or `relations`, and no backend declaring `code` declares `recall`
(FF-17902, FF-17901).

## ADR-004: Every reader of the code graph asks `relations`; none parses the artifact itself

**Status:** Accepted
**Date:** 2026-10-30

**Context.** Three core readers parse `graphify-out/graph.json` on their own, through injected
`readGraph`/`normalizeGraph`:
- test selection (`packages/work/src/testing/select.mjs:156`);
- story-contract derivation (`packages/work/src/story-contract-derive.mjs:146`);
- seam liveness (`packages/work/src/audit/seam-liveness.mjs:219`).

Each has its own unavailable vocabulary. Test selection widens on `no-graph` and on
`graph-unreadable`, and reports the artifact's own `builtAt`. Derivation reports `GRAPH_UNAVAILABLE`.
Seam liveness needs the dependents of every candidate, read once (its ADR-006 §1a).

**Decision.**
- Each factory takes `relations` (the code port's verb, bound in core) instead of `graphJsonPath`,
  `readGraph`, `normalizeGraph`, `graphArtifactBuiltAt` and `computeImpact`.
- Each maps the port's `unavailable` onto its own existing vocabulary, so every widening reason,
  limit and refusal it reports today is reported unchanged.
- Seam liveness asks once, with every candidate, and reads `present` and `dependents`. The one-pass
  `computeImpact` (ADR-002) keeps that one walk.
- **No reader caches the answer across calls.** Test selection's purity clause holds.
- `graph-normalize.mjs` remains the artifact's location and shape home. The artifact-moving commands
  (export, import, bundle, share) keep using its path, because they move bytes and read no edges.

**Alternatives considered.**
- *Leave the three readers on the raw artifact.* "One engine seam" would then be false for exactly
  the callers that matter most, the selector and the refine-time derivation. Rejected.

**Consequences.** Seam liveness's match moves from exact-path to `computeImpact`'s suffix rule. Its
candidates are full repo-relative paths, as the graph's are, so the findings are unchanged.
`audit.test.mjs` is the proof. A future engine that serves `code` serves all four readers at once.

**Invariant.** Across `packages/*/src`, only the graphify code backend, the graph-normalize module
itself, the graphify driver's re-export and the graphify memory backend (its own
`.aof/memory-graph/` artifact, until retired) import `readGraph`, `normalizeGraph` or
`computeImpact` (FF-17904).

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-17901 | `createKnowledgeEngine` answers exactly `ingest`/`recall`/`relations`/`status`; every backend it is given declares `corpora` inside `KNOWLEDGE_CORPORA` × `ENGINE_VERBS` with a method behind each verb, or construction throws naming it; an unserved pair answers `corpus-unserved` without calling any backend; no backend declaring `code` declares `recall` | `test/arch/memory/acd-knowledge-engine-port.test.mjs`, registered in `test/arch/memory/index.mjs` — pending (179/01) | ADR-001, ADR-003 |
| FF-17902 | Every backend `BACKEND_REGISTRY` holds exports exactly `{ name, corpora, recall, reindex, status }` and declares `work`, `operator` and `imports`, never `code` or `relations` | `test/arch/memory/acd-memory-backend-interface.test.mjs` (amended, never deleted), registered in `test/arch/memory/index.mjs` — pending (179/03) | ADR-003 |
| FF-17903 | `graph-build.mjs` and `commands/graph-impact.mjs` import neither `readGraph`/`normalizeGraph` nor `computeImpact` nor the graphify driver; `aof graph build --json` with the binary absent answers `graphify-missing`, and `aof graph impact x --json` with no graph answers `no-graph` | `test/arch/graph/acd-graph-command-cli-bijection.test.mjs` (amended, never deleted), registered in `test/arch/graph/index.mjs` — pending (179/02) | ADR-002 |
| FF-17904 | Across `packages/*/src`, `readGraph`, `normalizeGraph` and `computeImpact` are imported only by `graphify-code-backend.mjs`, `graph-normalize.mjs`/`graph-impact.mjs` themselves, `graphify.mjs` and the graphify memory backend | `test/arch/graph/acd-code-graph-one-reader.test.mjs`, registered in `test/arch/graph/index.mjs` — pending (179/04) | ADR-004 |
