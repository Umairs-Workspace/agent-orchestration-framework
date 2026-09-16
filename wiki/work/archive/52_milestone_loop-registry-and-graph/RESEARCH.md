---
doc: research
---
# 52 · Loop registry & the loop graph — Research

Delegation gate (`work.agents.delegation`) is **off** in this workspace's
`.aof/aof.config.json` (no `agents.delegation` key present) — every fact below was gathered
directly, no `codex exec` delegation used.

## Q1 — the loop inventory, field by field

Field-by-field evidence for the seven loops the SPEC names, plus a scan for a missed one. A
field with no citation is marked **UNKNOWN** — no code/prose was found to evidence it, and
none is invented.

### 1. build-to-green

| Field | Value | Citation |
|---|---|---|
| Controlled variable | `@executable` scenarios/rows green + fitness functions pass | `src/bundle/commands/continue.md:57` |
| Reference | the task's `.feature` file (scenarios + tags) | `src/bundle/commands/continue.md:56-58` (implicit — the feature IS the target; no separate reference doc) |
| Measurement | re-running the scenario suite (no named tool/command in the prompt — the developer agent decides how) | `src/bundle/commands/continue.md:56-58` — **prose only, no named machinery** |
| Actuator | `aof-developer` (orchestrated) or the same session inline (`--solo`) | `src/bundle/commands/continue.md:56-57`, agent def `src/bundle/agents/aof-developer.md:1-4` |
| Cadence | **UNCAPPED** — no retry ceiling, no turn limit, no time bound anywhere in `continue.md`. Confirmed by `PRD-acd-loop-engineering.md:58`: "Gap: it is uncapped (loop-performance owns the cap)." PRD table's "minutes" is an estimate, not a measured/enforced value. | grep of `continue.md` found no cap language; `wiki/planning/PRD-acd-loop-engineering.md:58` |
| Owner | **UNKNOWN** — no "owner" field or role is declared for the loop itself (the PO owns the *item*, `src/bundle/commands/continue.md:89`, but not this loop as a control concept) | — |

### 2. review→fix→re-review

| Field | Value | Citation |
|---|---|---|
| Controlled variable | open findings (structural + behavioural + design-conformance) | `src/bundle/commands/continue.md:65-84` |
| Reference | architect/QA/designer verdict against the ADRs/contract | `src/bundle/commands/continue.md:65-70` |
| Measurement | agent judgment (`aof-architect`, `aof-qa`, `aof-designer` review passes) — no deterministic grader | `src/bundle/commands/continue.md:65-84` — **prose only** |
| Actuator | `aof-developer` applies confirmed fixes | `src/bundle/commands/continue.md:66` |
| Cadence | **UNCAPPED**, same as build-to-green — no fix↔re-review ceiling in the prompt | `src/bundle/commands/continue.md` (no cap text found) |
| Owner | **UNKNOWN** | — |
| **Independence fact** | Every ACD role agent carries `Write` — none is read-only. `aof-architect.md:4` tools=`Read, Grep, Glob, Bash, Write, Edit`; `aof-qa.md` tools include `Write`; `aof-developer.md` tools include `Write, Edit`. The PRD's "Maker/checker separation — present and strong" claim (`PRD-graph-engineering.md:159`) holds at the ROLE/prompt level, not at the TOOL-scope level — a checker agent is not structurally prevented from writing the artifact it reviews. | `src/bundle/agents/aof-architect.md:4`, `aof-qa.md`, `aof-developer.md` (tools lines, all read verbatim) |

### 3. verify→triage→accept

| Field | Value | Citation |
|---|---|---|
| Controlled variable | findings triaged + item accepted (`status: done`) | `src/bundle/commands/verify.md:124-134` |
| Reference | VERIFICATION evidence / `## Definition of Done` (chore) / `## Finding` (spike) | `src/bundle/commands/verify.md:64-93`, spike/chore branch `verify.md:32-62` |
| Measurement | `@executable` suite + fitness functions run (automated), `@manual` scenarios executed by agent, `@uat` by human | `src/bundle/commands/verify.md:69-89` — the automated/`@manual` half is machinery-adjacent (it invokes a real suite run), but no code computes a pass/fail verdict for this loop; the prompt reads the result |
| Actuator | `aof-qa` (brokers human `@uat`), `aof-developer` (runs `@manual`), PO (triage) | `src/bundle/commands/verify.md:71, 86, 92` |
| Cadence | **per item**, structural (once per ref at its verify stage) — not a wall-clock period | `src/bundle/commands/verify.md:3` (`argument-hint: "<item ref>..."`), invoked once per ready item in `autonomous.md:74` |
| Owner | PO explicitly triages findings: "Triage (PO): blocker → …; non-blocker → …; design-gap → …" — the only loop of the seven with an explicit, named triage owner | `src/bundle/commands/verify.md:92` |

### 4. the autonomous cascade

| Field | Value | Citation |
|---|---|---|
| Controlled variable | items reaching `done` over a range | `src/bundle/commands/autonomous.md:6-10` |
| Reference | `aof work next` order (dependency-aware, deterministic) | `src/work.mjs:908-1012` (`nextWork`), invoked at `autonomous.md:49-58` |
| Measurement | `aof work next <range> --json` state (`done`/`blocked`/`ready`) — **this is genuinely machine-readable**: a registered command, JSON contract | `src/commands/next.mjs` (`id: "work:next"`), `nextWork` return shape `src/work.mjs:862-869, 1011` |
| Actuator | the cascade itself: dispatches `aof:refine`/`aof:continue`/`aof:verify` per item | `src/bundle/commands/autonomous.md:60-81` |
| Cadence | bounded by `work.autonomous.maxAttempts` (**default 3**, machine-readable config) per item's validate-gate retries — this is an attempt ceiling, not a time cadence | `src/bundle/commands/autonomous.md:14, 73`; default resolved at `src/commands/run-retry.mjs:62` (`?? ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3`); this repo's own `.aof/aof.config.json` sets `work.autonomous.maxAttempts: 3` |
| Owner | **UNKNOWN** — no declared owner; the operator invokes `/aof:autonomous` | — |
| Note | `nextWork` (`src/work.mjs:908`) is the ONE deterministic sequencer both the autonomous cascade and `work:next`/the board read — a real, reusable, machine-readable "reference" the loop record can point at rather than restate. | `src/work.mjs:908-1012` |

### 5. run resilience — the one engineered controller (most precise pass, per the task)

`src/run-store.mjs` is the ONLY loop of the seven where every field below is backed by a
named function/constant, not a paragraph of prose.

| Field | Value | Machine-readable? | Citation |
|---|---|---|---|
| Controlled variable | run `state` reaching a terminal value (`done`\|`failed`\|`cancelled`) | **YES** — `state` is a stored key on every run record, read via `readRuns`/`work:run-status --json` | record shape `src/run-store.mjs:344-362`; `VALID_OUTCOMES` `src/commands/run-complete.mjs:24` |
| Reference | the closed transition table `LEGAL_TRANSITIONS` (queued→running→{done,failed,cancelled}) | **YES** — a `Set` literal, queried via the pure `isLegalTransition(from,to)` | `src/run-store.mjs:96-108` |
| | the retryable/non-retryable classification (`runtime_offline`/`timeout`/`session_limit` retryable; `agent_error`/unknown fail-closed non-retryable) | **YES** — `isRetryable(failureReason)`, a pure predicate over a `Set` | `src/run-store.mjs:126-130` |
| | the attempt ceiling (`work.autonomous.maxAttempts`, default 3) | **YES**, but **resolved outside the store** — the store is config-blind by design (08/ADR-002 "basis-neutral"); the ceiling is passed in as a number | `src/run-store.mjs:141-143` (`shouldRetry(record, maxAttempts)`); resolved at `src/commands/run-retry.mjs:62` |
| Measurement | `heartbeatAt` age vs a staleness threshold | **YES** — pure predicate `isStale(run, nowMs, stalenessThreshold)`, reused verbatim by `src/mesh-presence.mjs` (23/ADR-002) so run-layer and node-layer staleness can never drift | `src/run-store.mjs:667-671` |
| | park/resume readiness for a `session_limit` failure | **YES** — `retryReadiness(record, maxAttempts, nowMs)` returns `{ready, state, readyAt}` | `src/run-store.mjs:253-262` |
| Actuator | `retryRun` (mint lineage-linked resume), `reclaimRun`/`reclaimStaleRuns` (force-fail an orphan), `applyTransition`/`completeRun` (terminal write) | **YES** — each is an exported function AND a registered `--json` command (`work:run-retry`, `work:run-complete`, `work:run-start`) | `src/run-store.mjs:593-640, 684-729, 528-574`; commands `src/commands/run-retry.mjs`, `run-complete.mjs`, `run-start.mjs` |
| Cadence | the LOCAL restart-time reclaim scan is **event-triggered** (runs whenever `work:run-start` is invoked), not wall-clock periodic. Default heartbeat-staleness window: 15 min. | Threshold is machine-readable (a resolved number); the trigger itself is "per `run-start` call", not a timer | `DEFAULT_HEARTBEAT_STALE_MS = 15 * 60 * 1000` at `src/commands/run-start.mjs:29` |
| | The MESH-fleet reclaim path (a distinct but related control, see loop 8 below) DOES run on a real 15s wall-clock ticker | **YES** — `DEFAULT_SYNC_CADENCE_SECONDS = 15` | `src/mesh-sync-cadence.mjs:25`; wired at `src/mesh-launcher.mjs:1517-1533` |
| Owner | **UNKNOWN / NOT a field** — the frozen 15-key run record (`src/run-store.mjs:344-362`) carries no `owner`/`ownerRole` key. `node` (partition provenance) exists but is not an "owner of the loop." | — | `src/run-store.mjs:344-362` (full key list below) |

Full frozen run-record shape (15 keys, `src/run-store.mjs:344-362`): `runId, itemRef, state, attempt,
outcome, sessionId, brief, createdAt, updatedAt, failureReason, heartbeatAt, retryOf, reclaimedAt,
node, resumeAfter`.

**Verdict for the SPEC's "declare, never duplicate" instruction:** four of the six fields
(controlled variable, reference's transition table + classification, measurement, actuator)
are ALREADY machine-readable as named pure functions/constants in `run-store.mjs` today. A
loop record for run-resilience should point at these symbols, not restate the transition
table or the classification set. Only `owner` is genuinely absent, and cadence is split
(local: event-triggered; mesh: a real 15s tick belonging to a *different* module).

### 6. retrospective→memory ingest

| Field | Value | Citation |
|---|---|---|
| Controlled variable | lessons captured as `R<n>` entries in `RETROSPECTIVE.md`, then made recallable via memory | `src/bundle/commands/retrospective.md:41-48` |
| Reference | STATE `## Feedback (for retro)` + VERIFICATION findings + `observability/agents.json` stalls | `src/bundle/commands/retrospective.md:28-37` |
| Measurement | agent triage ("keep only what carries a lesson") — no deterministic grader | `src/bundle/commands/retrospective.md:38-40` — **prose only** |
| Actuator | the retrospective session writes `RETROSPECTIVE.md`; `aof work memory ingest` (alias of `reindex`) folds it into the configured backend | `src/bundle/commands/verify.md:95-99`; `MEMORY_VERBS` incl. `"ingest"` at `src/work-memory.mjs:28`; ingest≡reindex noted `src/work-memory.mjs:13-14` |
| Cadence | **per milestone**, at `aof:verify` step 5 (close) or standalone backfill via `aof:retrospective` | `src/bundle/commands/verify.md:95-99`; `src/bundle/commands/retrospective.md:2-16` |
| Owner | per-LESSON owner is a declared field ("**Owner:** the role/lane"), not a per-LOOP owner | `src/bundle/commands/retrospective.md:44` |

### 7. observe→tune (PROPOSED — split cleanly: half exists, half does not)

| Half | Status | Field evidence |
|---|---|---|
| **observe** | **EXISTS** | `src/work-observe.mjs` mines Claude Code transcripts. Metrics: per-agent `activeMs`, `stalledMs`, `turns`, `tokens{in,out}`, `tools`, `model`, `stalls[]`, `diagnostics` (grind/toolchain-wait/edit↔test); summary `calendarSpanMs`, `activeUnionMs`, `realIdleMs`, `blockedOnHumanMs`, `deadAirMs`, `governancePct`. Full JSON shape at `src/work-observe.mjs:1050-1111`. Command: `aof work observe <ref> [--write] [--if-enabled]` — `src/commands/observe.mjs:23-107`. Cadence: **per milestone**, on-demand or via `--if-enabled` at retrospective close (`work.observability.enabled`, default **on** since 2026-08-07, `src/work-observe.mjs:1125-1138`). |
| **tune** | **DOES NOT EXIST** | No `work-tune.mjs`, no `aof work tune` command anywhere in `src/` or `src/commands/` (confirmed by directory listing — no file matches `*tune*`). It is milestone 62 territory per `wiki/planning/PRD-acd-loop-engineering.md:153-159, 204-208` (self-improvement-loop milestone). Controlled variable/reference/actuator/cadence/owner: **all UNKNOWN — none exist to evidence.** |

### The eighth (and only genuinely new) control loop the PRD table missed

| Candidate | Verdict | Why |
|---|---|---|
| **mesh assignment reclaim** (`src/mesh-assignment-reclaim.mjs`) | **REAL CONTROL LOOP — missing from the PRD table** | Controlled variable: non-terminal assignment state (`assigned`\|`accepted`\|`running`). Reference: dual staleness gate — presence-stale (`isNodeStale`, threshold `DEFAULT_PRESENCE_STALENESS_SECONDS = 90`, `src/mesh-presence.mjs:57`) **AND** run-heartbeat-stale (`isStale`, `DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS = 15*60*1000`, `src/mesh-assignment-reclaim.mjs:83`) — both must agree, imported/shared never re-derived (`src/mesh-assignment-reclaim.mjs:17-19`). Measurement: the same two pure predicates. Actuator: `transitionAssignmentState` → `reclaimed` + `transitionRunReclaimed` (`src/mesh-assignment-reclaim.mjs:32-37`). Cadence: a REAL wall-clock tick, `syncCadenceFromConfig(ws)` → default **15s** (`src/mesh-sync-cadence.mjs:25`), wired into `mesh-launcher.mjs` control role only (`src/mesh-launcher.mjs:1513-1533`). This is the ONLY OTHER loop besides run-resilience with every field this precisely machine-readable, and it is control-node-only (role-gated). |
| `mesh-presence-loop.mjs` | **NOT a control loop — a periodic broadcast** | It calls `publishOnce()` on a fixed timer (`startPresenceLoop`, `src/mesh-presence-loop.mjs:72-83`). No controlled variable is driven toward a reference — it is a one-way heartbeat publish. Cadence default 5s (`DEFAULT_PRESENCE_CADENCE_SECONDS`, `src/mesh-presence-loop.mjs:27`). |
| `mesh-sync-cadence.mjs` | **NOT a loop itself — a shared cadence policy** | Pure resolver (`resolveSyncCadenceSeconds`, `src/mesh-sync-cadence.mjs:35-41`), consumed BY the assignment-reclaim loop above and by the launcher's replication tick. No controlled variable of its own. |
| `src/degrade.mjs` | **NOT a control loop — an event sink** | `reportDegrade` writes coded events; nothing reads them back to correct behaviour today (no consumer closes a loop on a degrade code). See Q2 — it is a measurement stream with no actuator yet, i.e. it is the RAW MATERIAL for the eventual audit loop (milestone 55+), not itself a loop. |
| `src/work-doctor.mjs` | **NOT a control loop — an on-demand diagnostic** | `doctorWork` (`src/work-doctor.mjs:508-533`) produces findings; it has no actuator (nothing in this module writes a fix). It is `validateWork`'s sibling, invoked on demand (`aof work doctor`), not a background cycle. |

## Q2 — what is already machine-readable

| Surface | Contents | Command / `--json` surface | Citation |
|---|---|---|---|
| `src/run-store.mjs` | Run record (15 keys, listed above); terminal states `done\|failed\|cancelled`; non-terminal `queued\|running` (queued is reserved — never actually minted, `src/run-store.mjs:90-95`); attempt + `retryOf` lineage; `heartbeatAt`/`reclaimedAt`; `node` partition provenance | `work:run-start`, `work:run-complete`, `work:run-retry`, `work:run-status`, `work:resume` — each a registered `command-core.mjs` entry with `cli.route` + `--json` | `src/commands/run-start.mjs:31-239`, `run-complete.mjs:26-163`, `run-retry.mjs:23-117`, `run-status.mjs:19-101`, `resume.mjs` |
| `src/work-observe.mjs` | Per-agent: `activeMs`, `stalledMs`, `turns`, `tokens{in,out}`, `tools`, `model`, `stalls[]`, `diagnostics{grind,toolchain-wait,edit↔test}`. Milestone-level: `calendarSpanMs`, `activeUnionMs`, `realIdleMs`, `blockedOnHumanMs`, `deadAirMs`, `blockedAfterInfraKillMs`, `serializationCostMs`, `governancePct`. Granularity: **per-agent-session, per-milestone** (mined from Claude Code transcripts under `~/.claude/projects/<slug>/`) | `aof work observe <ref> [--write] [--json]` | `src/work-observe.mjs:1050-1111`; command `src/commands/observe.mjs:23-107` |
| `src/degrade.mjs` | Coded degrade events: `reportDegrade(code, error, extra)`. **Code vocabulary is mostly the emitting MODULE's own name** (`"run-store"`, `"mesh-worker-execution"`, `"control-stream-server"`, …), not a small closed taxonomy — a grep of every call site (~130 sites across `src/`) found the code is the literal module-name string at ~90% of sites, with a handful of finer-grained codes (`"effect-applies"`, `"effect-failed"`, `"effect-unknown-reactor"`, `"effects-journal-open"`, `"mesh-ui-terminal-input-oversize"`, `SOCKET_ERROR_CODE`). Events are written as JSONL to `<globalMeshRoot>/logs/degrade.log` (throttled 5s/code, best-effort, never throws) | `aof mesh logs degrade` reads it (`meshLogsCommand`, not traced further here) | `src/degrade.mjs:1-44`; sink `src/mesh-log.mjs:26-63`; call-site sample via `grep -rn "reportDegrade(" src/` |
| `src/work.mjs` `nextWork` | The deterministic sequencer both `work:next` and the autonomous cascade read | `aof work next <ref\|range> --json` | `src/work.mjs:908-1012`; `src/commands/next.mjs` |
| `src/work.mjs` `validateWork` | `{path, problem}` findings (folder↔frontmatter, closed tag vocabulary, `depends` acyclicity) | `aof work validate <ref> --json` (`work:validate`) | `src/work.mjs:718-843`; `src/commands/validate.mjs:16, 34` |
| `src/work-doctor.mjs` `doctorWork` | `{code, severity, path, message}` findings (cross-item health: coherence, freshness, structural integrity, budget, mesh-identity) | `aof work doctor <ref> --json` (`work:doctor`) | `src/work-doctor.mjs:12-21, 508-533`; command `src/commands/doctor.mjs:73, 190` |
| `mesh-assignment-reclaim.mjs` + `mesh-presence.mjs` | Dual staleness predicates (`isNodeStale`, `isStale`) — already-computed booleans over presence/heartbeat records | not directly `--json`-exposed as a loop metric today; consumed internally by the control tick | `src/mesh-assignment-reclaim.mjs:20-21`; `src/mesh-presence.mjs:57, 461-469` |

## Q3 — the storage seam for the loop records (facts only)

### What a new item type drags in

`ITEM_RE` (`src/work.mjs:48`) is the closed folder-name vocabulary:
`/^(\d+)_(milestone|story|task|uat|spike|chore)_([a-z0-9-]+)$/`.

`aof graph impact src/work.mjs --json` reports **240 dependents** (measured 2026-08-14). Of
those, **30** are `src/` modules and **43** are non-test files total (the rest — 197 — are
`test/` files, mostly arch tests). Full non-test list captured; load-bearing sample:

| Reader | What it needs to cope with | Citation |
|---|---|---|
| `src/work-doctor.mjs` | **Duplicates, does not import**, `ITEM_RE` and `isDriver` — "Mirrors `work.mjs`'s `ITEM_RE`" / "Mirrors `work.mjs`'s `isDriver`" | `src/work-doctor.mjs:40-43, 60-63` |
| `src/work-doctor-coherence.mjs`, `work-doctor-freshness.mjs` | Import `isDriver` FROM `work-doctor.mjs` (the duplicate), not from `work.mjs` | `src/work-doctor-coherence.mjs:18`, `work-doctor-freshness.mjs:19` |
| `src/commands/migrate-folder.mjs` | Comment: "six-type alternation in lockstep with `src/work.mjs`… a top-slot spike/chore folder must count toward `nextFreeSlot`" — slot arithmetic keyed on the same closed set | `src/commands/migrate-folder.mjs:47-48` |
| `src/commands/insert-shared.mjs` | Comment naming the six-type split (milestone/story vs uat/spike/chore) for its scaffold logic | `src/commands/insert-shared.mjs:130` |
| `ui/src/board/api.ts`, `model.ts`, `BoardLanes.tsx` | Hard-coded TS union type `"milestone" \| "story" \| "task" \| "uat" \| "spike" \| "chore"`; `otherDrivers` filter keyed on the literal type strings | `ui/src/board/api.ts:8-11`, `model.ts:28, 65`, `BoardLanes.tsx:148` |
| `src/commands/list.mjs`, `next.mjs`, `validate.mjs` | **Type-agnostic** — delegate to `work.mjs`'s generic `listItems`/`nextWork`/`validateWork`; no special-casing found | `src/commands/list.mjs`, `next.mjs`, `validate.mjs` (read in full; no type-string literals found) |

A **fifth** implication not asked for but load-bearing: `ITEM_RE` is not DRY today even
within `src/` — a future 7th type (or a `loops` pseudo-type) edited only in `work.mjs` would
silently NOT be recognised by `work-doctor.mjs`'s orphan-detection pass (its own copy of
`ITEM_RE`/`isDriver`) until that copy is hand-edited too.

### How `listItems` treats a non-`ITEM_RE` directory in `work.dir`

**Ignored silently — no finding, no error.** `listItems` iterates `readDirSafe(workDir)`,
and for each directory entry: `const match = entry.name.match(ITEM_RE); if (!match) continue;`
— a non-matching directory is skipped with no trace, not even a doctor/validate finding.

Citation: `src/work.mjs:281-291` (the `continue` at line 287). `readDirSafe` itself swallows
ENOENT (`src/work.mjs:252-258`).

**This means:** a `wiki/work/loops/` directory (or any non-`NN_type_slug`-shaped directory)
placed directly inside `work.dir` is invisible to `listItems`, `nextWork`, `validateWork`, and
`work-doctor`'s snapshot pass alike — nothing in the current stream-reading code would notice
it, flag it, or attempt to parse it as a work item.

### Frontmatter parsing/writing today

- **Read:** `parseFrontmatter(text)` (`src/work.mjs:348-358`) — a MINIMAL reader: `key: value`
  lines inside a `---\n…\n---` block, inline lists `[a, b]`, quoted scalars stripped. Explicitly
  does NOT parse block lists/maps or inline flow maps `{ … }` (18/ADR-007, `src/work.mjs:344-347,
  360-366`). **It is a pure function over raw text — no `item` object required** — so it is
  directly reusable on a non-item markdown doc (e.g. a standalone `loops/<slug>.md`) with no
  adaptation; only its caller (`readMeta`, `src/work.mjs:387-389`) is item-shaped.
- **Write:** `applyItemFrontmatter(item, mutate)` (`src/work.mjs:522-546`) — the general
  frontmatter WRITER. It is **item-shaped**: it calls `recordDoc(item)` to resolve the doc
  filename and requires `item.dir`/`item.type` (`src/work.mjs:523-527`). It is NOT directly
  reusable on an arbitrary non-item doc without either (a) constructing a fake `item`-shaped
  object with a `.dir`/`.type` that `recordDoc` maps to a filename, or (b) a new sibling writer
  that reuses the same byte-preserving block-capture idiom (`src/work.mjs:534-543`) over an
  arbitrary path. **No existing seam writes frontmatter to an arbitrary non-item path today.**

### Milestone 37's empirical cost of adding a new item type (the price tag)

Source: `wiki/work/37_milestone_spike-chore-item-types/ARCHITECTURE.md` (spike/chore, added
additively to the same closed enum this milestone would extend).

| Measure | Value | Citation |
|---|---|---|
| Graph impact at the time | `aof graph impact src/work.mjs` → **35 importers** (now 240 — the god-node has grown 6× since) | ARCHITECTURE.md:327-330 |
| Files touched in `src/work.mjs` itself | `ITEM_RE`, `recordDoc`, `isDriver`, the `nextWork` item-is-the-work branch, `validateWork`'s native-branch confirmation — **all in ONE file**, so the milestone ruled **only one story may edit `src/work.mjs`** | ARCHITECTURE.md:37-81, 334-338 |
| New record-doc filenames | 2 (`SPIKE.md`, `CHORE.md`) — `recordDoc` gains 2 map entries | ARCHITECTURE.md:96-97, 127 |
| Fitness functions (arch-tests) added | **6** (FF-3701 … FF-3706) — vocabulary admission, driver-ness, record-doc mapping, two "validates clean with no tasks/.feature" checks, one "chore has a DoD section" check | ARCHITECTURE.md:294-321 |
| ADRs | 4 (ADR-001 top-level-driver shape, ADR-002 record-doc shape, ADR-003 verify-path dispatch, ADR-004 shatter framing) | ARCHITECTURE.md (whole doc) |
| Story partition | 3 stories: (00) the ONLY story touching `work.mjs` (engine), (01) sibling scaffold files (templates/add-* commands) — **touches NO `work.mjs`**, (02) sibling skill/board files (verify dispatch, board badge) — **touches NO `work.mjs`** — the god-node rule forced a by-LAYER cut, explicitly rejecting a by-TYPE cut | ARCHITECTURE.md:325-361 |
| Non-`work.mjs` surfaces later found to also need the vocabulary (this research, not ARCHITECTURE.md) | `work-doctor.mjs` (duplicate `ITEM_RE`/`isDriver`), `commands/migrate-folder.mjs` (slot arithmetic), `ui/src/board/*.ts(x)` (TS union type) | see table above |

## Q4 — the command family precedent

- **Registry shape.** A `Command` is `{ id, input: <JSONSchema>, run: async(input, ctx) =>
  result, cli: { route?, spec, argv, render, json, exit? } }`. `ctx = { workspace }`. Results
  are basis-neutral (raw absolute paths); path-display projection is a FACE concern, never
  inside `run`. `src/command-core.mjs:7-26`.
- **`invoke(id, input, ctx)`** — the one in-process call every face uses; unknown id throws.
  `src/command-core.mjs:412-418`.
- **The registry-derived route table.** `deriveRouteTable(commands)` (`src/spine/face.mjs:87-99`)
  builds a `Map` keyed by `cli.route.join(" ")` from EVERY registered command that declares a
  `route` array — a collision between two commands' routes throws at derivation time (a
  programmer error, not a runtime surprise). `resolveRoute` does longest-prefix argv matching
  (`src/spine/face.mjs:104-120`).
- **`src/spine/face.mjs`** is confirmed the ONE generic CLI face: spec-parse → optional
  `loadWorkspace` → `cli.argv` → `invoke` → `cli.render`/`cli.json`, one `--json` error envelope
  (`{ok:false, error, code}`), plus a post-invoke effects-journal sweep. `src/spine/face.mjs:1-33,
  125-181`.
- **The `graph:*` family — the closest precedent for `work:loops show|graph|validate`.** FOUR
  separate command objects (`graph:build`, `graph:query`, `graph:triage`, `graph:impact`), each
  its own file (`src/commands/graph-build.mjs`, `graph-query.mjs`, `graph-triage.mjs`,
  `graph-impact.mjs`), each with a 2-word `cli.route` (`["graph","build"]`, etc. —
  `graph-build.mjs:180`, `graph-impact.mjs:123`), each independently registered in
  `command-core.mjs`'s `COMMANDS` array (`src/command-core.mjs:298-391`, entries at lines
  306-309). A shared face-projection helper (`relativiseGraphPath`) lives in
  `src/commands/graph-shared.mjs:7-10` and is reused by `query`/`triage`/`impact`.
- **A DIFFERENT existing pattern (for contrast): `mesh:assign`.** ONE command object with
  flag-based sub-dispatch (`--to`/`--withdraw`) rather than one command per verb —
  `src/commands/mesh-assign.mjs:20` (`id: "mesh:assign"`), route `["mesh","assign"]`
  (`mesh-assign.mjs:54`). Both patterns coexist in this codebase; the SPEC's own phrasing
  ("`show` / `graph` / `validate` registered … `--json` contracts", plural "registered") reads
  closer to the `graph:*` one-command-per-verb shape than the `mesh:assign` one-command
  many-flags shape, but this is the architect's call, not asserted here as settled.
- **The CLI↔command bijection arch-test idiom.**
  `test/arch/acd-graph-command-cli-bijection.test.mjs` and
  `test/arch/acd-work-command-cli-bijection.test.mjs` both assert, over the REGISTRY-DERIVED
  set (never hard-coded): (a) every command carries a non-null `cli` adapter with `argv`/`render`
  functions, (b) every verb is CLI-reachable via `cli.route` OR a legacy ladder branch, (c)
  spawning `aof <ns> <verb> --json` against a bare fixture emits exactly one parseable JSON
  envelope (success or the structured error). Because the set is registry-derived
  ("no new door" — `acd-work-command-cli-bijection.test.mjs:1-7`), a new `work:loops-*` command
  with a `cli.route` + `--json` projection is AUTOMATICALLY covered with no test edit.
  Citations: `test/arch/acd-graph-command-cli-bijection.test.mjs:1-20, 102-165`;
  `test/arch/acd-work-command-cli-bijection.test.mjs:1-40`.
- **The bundle-wrapper parity gate — narrower than the house rule.** The ONE arch-test that
  enforces "a `work:*` command has a bundle command wrapper" is
  `test/arch/acd-work-insert-command-bundle-parity.test.mjs`, and it is **scoped only to
  `work:insert-*` commands** (`listCommands().filter(c => c.id.startsWith("work:insert-"))`,
  `acd-work-insert-command-bundle-parity.test.mjs:23-27`) — it would NOT automatically catch a
  CLI-only `work:loops` shipping with no `/aof:*` wrapper. `src/bundle/commands/` today has 25
  `.md` files and none named `loops*` (directory listing, 2026-08-14). The broader "a `work:*`
  command isn't done until its bundle wrapper ships" is an operator-held house rule, not (yet) a
  registry-derived gate the way the CLI bijection is.

## Q5 — the pathology checks: what already exists

- **No SCC (strongly-connected-component) implementation anywhere in this repo or its
  dependencies.** `package.json` dependencies are `@inquirer/prompts`, `node-pty`, `ws`;
  devDependencies are `ajv`, `esbuild`, `postject` — no graph library. A repo-wide grep for
  `tarjan`/`stronglyConnected`/`strongly-connected`/`scc\b` across `src/` and `node_modules/`
  returned zero matches. The only graph algorithm present is `findCycle` (`src/work.mjs:685-713`)
  — a DFS-based single-cycle finder (white/grey/black colouring) over a `Map<number, number[]>`
  built from `depends` edges; it returns AT MOST ONE cycle, not a full SCC decomposition, and it
  stops at the first cycle found (`for (const node of graph.keys()) { if (...) break; }`,
  `src/work.mjs:709-711`). graphify (the external, spawned codebase-graph binary) is a separate
  advisory tool, not an npm dependency, and out of scope per the SPEC's own "graphify is not this
  graph" constraint — not investigated further here.
- **`validateWork`'s finding envelope, dedup rule, scope semantics** (`src/work.mjs:718-843`):
  - **Shape:** `{ path: string, problem: string }` — pushed via `add(target, problem)`
    (`src/work.mjs:721`). Note this is a DIFFERENT, narrower shape than `work-doctor.mjs`'s
    `{ code, severity, path, message }` (`src/work-doctor.mjs:12-13`) — the two existing finding
    envelopes in this codebase are not unified today.
  - **Dedup rule:** exact-match on the concatenation `${finding.path}${finding.problem}` — a
    `Set` of seen keys, filtering duplicates after all checks run (`src/work.mjs:834-842`). No
    fuzzy/normalized dedup.
  - **Scope semantics:** `inScope(item)` (`src/work.mjs:723-730`) — no `scopeRef` ⇒ everything in
    scope; a bare number ⇒ that milestone + its stories (`item.parent ?? item.number` matched
    against the ref); an `NN/SS` pair ⇒ exact story match; otherwise a slug substring match.
    Critically, the `depends`-cycle check (`findCycle`) runs over the WHOLE graph regardless of
    scope and is reported at `workDir` (not any single item's path) — `src/work.mjs:830-832` —
    i.e. one structural (whole-stream) check already coexists with the per-item scoped checks in
    the same envelope, which is a real precedent for how a whole-graph SCC/pairing/timescale
    finding could sit in the same `findings[]` array without a path that names one item.

## Cadence-normalization observation (not a decision)

The measured cadences above are NOT all on the same axis, which the SPEC's timescale-inversion
check will need to reconcile:

| Kind | Examples | Unit |
|---|---|---|
| **Wall-clock, periodic** | mesh assignment reclaim (15s), mesh presence publish (5s), run-heartbeat staleness window (15 min), presence staleness (90s) | seconds |
| **Event-triggered, per-item** | verify→triage→accept, build-to-green, review→fix→re-review | "once per ref at its phase" |
| **Event-triggered, per-milestone** | retrospective→memory ingest, observe | "once per milestone at close" |
| **Uncapped / structurally absent** | build-to-green and review loops carry no cap at all today | n/a |

A "is the outer loop N× slower than the inner loop" check presupposes both loops resolve to a
comparable time unit; several of the loops above have no time unit to compare (they are
triggered by lifecycle events, not a clock), and two have literally no bound. This is a fact
about the current system, not a proposal for how to normalize it.

## Unknowns

- **Owner** is not a machine-readable (or even reliably prose-declared) field for six of the
  seven loops. Only verify→triage→accept names an explicit owner ("PO", `verify.md:92`) and
  retrospective names a per-LESSON (not per-loop) owner (`retrospective.md:44`).
- No numeric/enforced cadence exists for build-to-green or review→fix→re-review — "minutes" /
  "minutes–hours" in the PRD table is not evidenced by any cap, timeout, or measured average in
  this codebase; it reads as an estimate.
- Whether `work:loops` will end up as one command-per-verb (the `graph:*` shape) or one
  command with flag dispatch (the `mesh:assign` shape) is unresolved by precedent — both exist,
  the SPEC's phrasing leans toward the former, but this is left to the architect.
- Whether an eventual `loops/` storage directory would need `ITEM_RE` admission at all (vs.
  living happily unrecognised, per the "ignored silently" finding above) is a design question,
  not answered here.
- `degrade.mjs`'s code vocabulary is close to "one code per emitting module" rather than a
  designed taxonomy — whether this is adequate raw material for a future audit loop (milestone
  55+) is out of scope for this milestone's research and not assessed here.
