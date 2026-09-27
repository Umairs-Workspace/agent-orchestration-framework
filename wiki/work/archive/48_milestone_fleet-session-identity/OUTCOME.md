# 48 · Routable session identity — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The session id of record
A session record is keyed by `(nodeId, workspaceId, assistant, sessionId)` and carries the assistant's own
id in a frozen ordered seven; the id is read through the ordered ladder `--session` → `payload.session_id`
→ `env.CLAUDE_SESSION_ID` and is `null` when no channel supplies one — never generated, never normalised,
stored byte-identical.

### One live session, one record
Two concurrent sessions on the same `(node, workspace, assistant)` are two files on disk, and ending one
leaves the other's record and its presence entry intact.

### The orphan reaper
A TTL-expired session record is removed from disk by its owning node at the `startSession`/`pingSession`
write seam, under the same `isStale` predicate the rest of the mesh uses; a reap fault degrades loudly and
does not fail the start or ping.

### The session on the presence wire
`readLiveSessions` projects every live session to the frozen ordered six
`{ sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun }`, `ui/src/fleet/api.ts`'s
`PresenceSession` declares exactly those six, and the control stream remains an entry-level pass-through
with no per-field whitelist.

### A complete wire: run subsumption moved to the formatter
The presence producer no longer drops a session whose workspace has a run — every live session reaches the
wire stamped with the fact `workspaceHasRun`, and `fleetCurrentWorkLines` applies the display rule at the
render, strictly on `workspaceHasRun === true`. What the fleet draws is byte-identical to what it drew
before, on both the JS and Rust surfaces.

### The fleet-side session index
`buildSessionIndex` in `global-mesh-query.mjs` answers "what live sessions exist across the mesh" as an
`(nodeId, sessionId)` lookup plus a deterministically ordered array — a pure, rebuildable projection that
performs no I/O, reads no clock, stores nothing, and returns `null` on every miss. It is served as the
additive top-level `sessions` key on the global status payload, and a duplicate `(nodeId, sessionId)` is
resolved by a total order (latest `lastPingAt`, then `workspaceId`/`repo`/`assistant`), never collapsed by
filesystem arrival order.

### Attribution without a second authority
`workItem` is derived onto a session at the index alone, joined on `(target_node_id, session_id)`; no
session record carries a work-item field and no session write path reads `global_assignments`. A session
with no assignment is first-class: `workItem: null`, present and never dropped.

### A session index that is live on the real fleet
A deployed node publishes the six-key entry with a real routable id, and `aof mesh status --json` on the
control node returns it — measured on a three-node fleet, not only in fixtures.

## Assumptions

- **The assistant supplies the id** — the ladder resolves an id only if the harness passes `--session`,
  a payload `session_id`, or `CLAUDE_SESSION_ID`; an assistant that supplies none is recorded and published
  with `sessionId: null` and is therefore not addressable.
- **A session id is filesystem-safe below ~164 characters** — the id becomes a path segment, and
  `writeText` prepends ~62 characters composing its atomic temp, so a longer id fails the write loudly
  rather than truncating ([TECH_DEBT](../../TECH_DEBT.md) item 34).
- **Liveness is the presence aggregate's answer, computed once** — the index and every surface consume the
  TTL-filtered `sessions[]` they are handed; nothing downstream re-derives session liveness or reads a
  clock.
- **A pre-m48 node's absent `workspaceHasRun` renders** — subsumption applies strictly on `=== true`, so a
  node still running an older build (which already subsumed at its own producer) is unchanged during a
  rollout.
- **The index's freshness gate is node-level** — a node whose `freshness` is `stale` or `unknown`
  contributes zero sessions, so the index is only as current as the roster's own staleness rule.

## Gaps

### `workspaceHasRun: true` with an empty `activeRuns`
- **Status:** open
- **Discharge condition:** a producer path exists that can stamp a session `true` while its node reports no
  active runs — at which point the formatter's behaviour for that combination needs a stated rule.
The stamp is derived from the same run set that fills `activeRuns`, so the combination is unreachable from
the producer and is not enumerated by any scenario. The formatter would suppress the session line for a
payload that carried it.

### Deduplicated repo names on the `(session)` line
- **Status:** open
- **Discharge condition:** milestone 49 decides the rule in its DESIGN and lands it in the JS formatter and
  the Rust view-model in one commit.
Two live sessions in the same repo render that repo twice on the current-work line. The line has a second
implementation in Rust pinned verbatim by `crossSurfaceDriftViolations`, so a JS-only dedupe fails CI.

### A UI surface that addresses a session
- **Status:** open
- **Discharge condition:** milestone 49 consumes the index into the grid of live panes; milestone 50
  registers newly spawned sessions into it.
Every live session is now addressable as `(nodeId, sessionId)` and nothing in the product opens a terminal
on one. The index is served and typed; it has no reader.

### A case-insensitive filesystem still merges two ids differing only in case
- **Status:** open
- **Discharge condition:** the leaf segment stops being the sole disambiguator for two ids that differ only
  in case — either a case-preserving key or a records-per-directory layout.
The fourth key segment percent-encodes every byte outside `[A-Za-z0-9._-]` and is injective, so two
distinct ids cannot collide by escaping; on a case-insensitive filesystem they can still collide by case.
Accepted residual of ADR-010 R1, with no fitness function by decision.
