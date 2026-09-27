---
doc: research
---
<!--
  Milestone RESEARCH.md — blocking unknowns resolved by measurement.
  Owner: researcher. Read-only on the codebase; never writes code or design decisions.
-->
# 53 · The loop as a CLI artifact — Research

Delegation gate (`work.agents.delegation`) is **off** in this workspace's `.aof/aof.config.json`
(no `agents.delegation` key present) — every fact below was gathered directly by reading source,
no `codex exec`/`gpt-5.6-sol` delegation used.

Structured around the eight numbered questions in the brief. Each has a **Finding** with
`file.mjs:line` evidence; anything not determinable is called out explicitly in **Unknowns**
at the end rather than guessed.

---

## Q1 — `mesh-worker-execution.mjs`'s anatomy: driver vs mesh-coupling

**Scale correction (measured, not a nitpick).** The file is **3286 lines** today
(`wc -l src/mesh-worker-execution.mjs`), not the SPEC's cited 3142 — it has grown ~150 lines since
the milestone SPEC was written (2026-08-13). The exported-function inventory below is complete as
of this read.

### The generic session-driving layer (mesh-blind — no assignmentId/workspaceId/lease param anywhere in these signatures)

| Export | Lines | What it does |
|---|---|---|
| `buildDriverCommand(driver, brief)` | `mesh-worker-execution.mjs:847-856` | codex-only headless argv builder (`codex exec --json -o …`) |
| `NEEDS_INPUT_SENTINEL` / `NEEDS_INPUT_INSTRUCTION` | `:914, :924-930` | the "ask a human" protocol line + its system-prompt producer text |
| `DIRECTIVE_COMPLETE_SENTINEL` / `DIRECTIVE_COMPLETE_INSTRUCTION` | `:944, :946-952` | the "I'm done" declared-completion protocol pair |
| `WORKER_SESSION_INSTRUCTION` | `:956-958` | the two instructions concatenated into ONE `--append-system-prompt` payload (claude allows only one) |
| `defaultWatchTranscriptSessionId({cwd,env,signal,maxWaitMs})` | `:975-1033` | snapshots `<claudeProjectsDir>/*.jsonl`, polls for the first NEW basename — that's the session id, zero model cooperation |
| `COMPLETION_IDLE_MS` (15 min) / `DECLARED_COMPLETION_IDLE_MS` (10 s) | `:1093, :1097` | undeclared-vs-declared completion confirmation windows |
| `HUMAN_INPUT_TOOL_NAMES = ["AskUserQuestion"]` | `:1108` | closed set of tool names whose pending call means "waiting on a human" |
| `defaultWatchTranscriptCompletion({cwd,env,sessionId,signal,…})` | `:1258-1364` | polls the transcript for a settled `stop_reason`, requires a quiet stretch across the WHOLE session tree (parent + subagents) before declaring done/needs-input |
| `defaultPtySpawn` | `:1373` | `createTerminalSpawn(loadNodePty)` — the literal factory `terminal-ws.mjs`'s `/ws/terminal` also spawns through |
| `INTERACTIVE_COMMAND_READY_DELAY_MS` (5000) | `:1383` | how long to wait before typing the command into the PTY (claude's TUI must be ready) |
| `resolveInteractiveDriverLaunch(driver, options)` | `:1397-1436` | resolves bin/args/env via `terminal-providers.mjs`'s `resolveProvider`, appends `--permission-mode auto --append-system-prompt <WORKER_SESSION_INSTRUCTION>`, strips VSCode/IDE-attachment env vars |
| `ensureWorktreeTrusted` | `:1442` (re-export) | lives in `claude-trust.mjs`; only a re-export here |
| `driveInteractiveClaudeSession(brief, options)` | `:1463-1813` | **the whole driver loop**: spawn PTY → concurrently watch for session id → watch for completion (transcript) → sentinel scan on raw output → PTY-liveness probe (`process.kill(pid,0)` every 15s) → resolves `{outcome:"done"\|"failed"\|"needs-input", sessionId, failureReason?}` |
| `defaultSpawnRuntime(brief, options)` | `:1827-1851` | driver dispatcher: `codex` → one-shot `execFile`; everything else (default `claude`) → `driveInteractiveClaudeSession` |

`brief` is `{itemRef, worktreeCwd, task, command}` and `options` is a plain injection bag
(`ptySpawn`, `which`, `watchTranscriptSessionId`, `watchTranscriptCompletion`, `driver`,
`resumeSessionId`, `commandDelayMs`, `livenessIntervalMs`, `onSessionIdCaptured`, `onSessionEnd`,
`onOutputChunk`, `onPtyLive`, `trustWorktree`, `onNeedsInputPending`) — **none of it is
assignment/lease/worktree-registry-shaped**. This is the "smallest set of functions a local loop
would need": `driveInteractiveClaudeSession` (the entry point) plus its four collaborators
(`resolveInteractiveDriverLaunch`, `defaultWatchTranscriptSessionId`,
`defaultWatchTranscriptCompletion`, `defaultPtySpawn`) plus the three sentinel/instruction
constants.

### The mesh-coupled layer (assignment lifecycle — worktree, run-store, leases, clone/push credentials, terminal-ws relay)

| Export | Lines | Coupling |
|---|---|---|
| `workerHasRepo`, `cloneRepoForWorkspace`, `resolveCloneUrl`, `parseRepoFromCloneUrl`, `meshCheckoutsRoot`, `meshCheckoutPath`, `buildAskpassShim` | `:319-822` | clone-on-miss + scoped-checkout machinery |
| `pushWorktreeBranch`, `commitWorktreeChanges` | `:573-711` | durable-worker-pushback (m38/story 07) |
| `pinWorkspaceIdInCheckout` | `:822` | identity pin on a fresh clone |
| `createMeshWorkerExecutionHandler(options)` | `:2059-2806` | **the assignment orchestration**: repo guard → clone-on-miss → `addWorktree`/`reuseWorktreeOnBranch` (mesh-worktree.mjs) → `transitionRunStart`/`transitionRunComplete` (effects/run-transitions.mjs, which wraps run-store.mjs) → `sendAssignmentStatus` up the worker-stream-client wire → `reportAssignmentSettled` (durable fact + outbox) → push-then-remove/retain the worktree on done/failed. This is where `spawnRuntime` (defaulting to `defaultSpawnRuntime` above) gets CALLED, injected with the assignment's `brief`. |
| `settleStrandedRunRecords` | `:2806` | reconciles orphaned run records at worker restart |
| `createMeshWorkerWithdrawHandler` | `:2859` | control-driven withdrawal (`livePtyKills`/`withdrawnByControl` module maps) |
| `createMeshWorkerTerminalInputHandler` | `:2935` | keystroke routing into a live assignment PTY |
| `createMeshWorkerTerminalResumeHandler` | `:2999` | `claude --resume` re-attach on a parked session |
| `createMeshRecoveryPushHandler` | `:3224` | pushes a stranded worktree home |
| module-scope registries `activeWorktrees`, `livePtyKills`, `withdrawnByControl`, `livePtyWrites`, `liveSessionInputs` | `:175, :1922-1938` | all assignment-id/session-id keyed, all mesh-only |

### Is there already a clean seam?

**Functionally yes, structurally no.** The driver functions listed above take no mesh-shaped
parameter and could be called from a local, non-mesh caller today. But there is no module
boundary that says so: they live in the same 3286-line file as the assignment orchestration, and
that file's own top-of-file imports (`mesh-worker-execution.mjs:111-154`) pull in `run-store.mjs`,
`effects/run-transitions.mjs`, `effects/assignment-transitions.mjs`, `mesh-worktree.mjs`,
`workspace.mjs`, `global-work-store.mjs`, `workspace-identity.mjs`, `mesh-repo-marker.mjs`,
`mesh-presence.mjs` as a load-time side effect of importing ANYTHING from this module — a local
loop that only wants `driveInteractiveClaudeSession` still pays the whole mesh module graph's
load cost and inherits its blast radius for `graph impact` purposes.

**Milestone 50 already measured this and explicitly declined to reuse the file** for exactly this
reason. `src/mesh-session-spawn-handler.mjs`'s own header (lines 1-9):

> "A SIBLING to mesh-worker-execution.mjs, NEVER an extension of it. That module is the widest
> hub in src/ (47 dependents) and is entangled with the ASSIGNMENT lifecycle — worktree + run
> record + state machine + terminal reports. A bare session has NONE of that … this module does
> not import it (task 00's locked scenario asserts exactly that)."

### Does milestone 50's session-launcher extract a reusable spawn seam? — **No, and by design.**

`mesh-session-spawn-handler.mjs` (worker-side, `createMeshWorkerSessionSpawnHandler`) and
`mesh-session-spawn-directive.mjs` (wire-frame builders) implement a **structurally different**
thing: a bare operator SHELL (`resolveDefaultShell` → `process.env.ComSpec`/`SHELL`), spawned via
`createTerminalSpawn(loadNodePty)` directly — **`terminal-providers.mjs`/`resolveProvider` is
deliberately NOT imported** (`mesh-session-spawn-handler.mjs:19-20, 44-56`), because ADR-007 ruled
this is "an operator shell, not a sandboxed agent" — full ambient env inheritance, no
`--append-system-prompt`, no NEEDS_INPUT/DIRECTIVE_COMPLETE sentinel scanning, no transcript watch,
no `{outcome:done|failed}` resolution at all. It never terminates on its own; it just sits there
until the operator closes it or types `claude`/`codex` into it by hand
(`mesh-session-spawn-handler.mjs:25-26`). There is no `{outcome}`-resolving promise to return —
the whole point of the driver this milestone needs. **The two modules solve adjacent but
disjoint problems**: 50 = "give me a terminal on this machine"; 53 = "drive this phase's prompt to
a terminal state and tell me which". Reusable from 50's module: the mesh-blind
`resolveDefaultShell` pattern and its worktree-door-resolution idiom
(`resolveSessionWorktree`, `mesh-session-spawn-handler.mjs:126-155`) are precedent for a
LOCAL-loop worktree/cwd resolution, not the session-driving logic itself.

---

## Q2 — the command registry / CLI-as-contract spine

**Registration shape** (`src/command-core.mjs:7-26`): a `Command` is
`{ id, input: <JSONSchema>, run: async(input, ctx) => result, cli: { route?, spec, argv, render, json, exit? } }`.
`ctx = { workspace }`. `run` returns basis-neutral data (raw absolute paths — no
`displayPath`/relativise inside `run`; that's a face concern). `COMMANDS` is a flat array in
`command-core.mjs:301-397`; `REGISTRY = new Map(COMMANDS.map(c => [c.id, c]))`; `invoke(id, input, ctx)`
(`command-core.mjs:418-424`) is the ONE in-process call every face makes.

**The generic CLI face** (`src/spine/face.mjs`) is `runCommandFace(command, args)`
(`face.mjs:125-181`): spec-parse (`parseSpecArgv`, per-command flag vocabulary, unknown flag is a
loud coded refusal) → optional `loadWorkspace` (`cli.spec.workspace !== false`) → `cli.argv` →
`invoke` → `cli.render`/`cli.json` → one `--json` error envelope
(`{ok:false, error, code, ...detail}`, `face.mjs:186-207`) → a post-invoke effects-journal sweep
(`sweepPendingEffects`, `face.mjs:267-284`). The route table (`deriveRouteTable`,
`face.mjs:87-99`) is built FROM the registry (`command.cli.route` arrays) — a route collision
between two commands throws at derivation time.

**The launcher seam — directly relevant to `aof work loop`'s shape.** A long-lived
foreground-process command declares `cli.launch(options)`: returns `null` ⇒ not launcher mode
(falls through to the ordinary probe/invoke path); returns a function ⇒ the daemon body, awaited
until the process ends (`face.mjs:144-161`). **`--json` NEVER launches** — this is FACE POLICY,
checked before the seam is even consulted, so the registered `run()` must always be a
non-blocking PROBE for the bijection spawn-test to pass. Precedent:
`meshServeCommand` (`src/commands/mesh-serve.mjs:110-167`) — the registered `run` calls
`launcherProbe(ctx.workspace)` (non-blocking); `--serve` (a declared FLAG, not a route word)
selects `runMeshServeDaemon` via `cli.launch`. Same idiom: `work:ui`
(`src/commands/work-ui.mjs`), `graph:serve`, `mesh:ui`. **This is the load-bearing precedent for
how `aof work loop <ref|range>` (a long-lived, phase-sequencing shell) must be shaped** to satisfy
the bijection test's "spawn `aof work loop --json`, assert it runs clean + returns" requirement.

**A pre-existing name collision the architect must resolve.** `work:refine`, `work:continue`,
`work:verify` **already exist** as registered commands
(`src/commands/continue.mjs:135-253`, `createPhaseDoorCommand("continue"|"refine"|"verify")`,
routes `["work","continue"]`/`["work","refine"]`/`["work","verify"]`), and they do something
DIFFERENT from what the SPEC describes for the new atomic drivers. Today's `work:<phase>` answers
"WHERE should this run" (local vs remote vs already-running) and either (a) returns
`{where:"local", command:"/aof:<phase> <ref>"}` for the CALLER's own terminal to type, or (b)
dispatches a mesh assignment. Its own header (`continue.mjs:24-26`): **"It does NOT spawn
anything itself."** The SPEC's `aof work refine|continue|verify <ref>` is described as "spawn one
session running that phase's existing prompt, watch the transcript to completion, gate" — a
DIFFERENT verb under the same three names. This is a direct id/route collision
(`work:continue`/`work:refine`/`work:verify` are taken) that the architect has to name a decision
against — rename the new drivers, fold the new behaviour into the existing commands (changing
their contract), or something else. Not resolved here; flagged as a fact.

**The bijection arch-tests.**
`test/arch/acd-work-command-cli-bijection.test.mjs` derives its subject set from
`listCommands().filter(c => c.id.startsWith("work:"))` (`:40-44`, never hard-coded) and asserts,
per command: (a) `cli.argv`/`cli.render` are functions; (b) a reachable CLI dispatch (either the
legacy `workCommand` ladder in `cli.mjs`, or — per the m42 wave-(d) migration this repo is mid-way
through — a `cli.route`-derived table entry, `deriveRouteTable` re-derived, never grepped
hard-coded, `:26-30`); (c) `aof work <sub> --json` spawn-and-parses ONE clean JSON document
(`:9-18`). A new `work:loop`/`work:refine-driver`/whatever-it's-named command is **automatically
covered with no test edit** ("no new door") as long as it carries `cli.route` + `cli.argv` +
`cli.render`/`cli.json`, and its registered `run()` returns promptly under `--json` (the launcher
discipline above). `test/arch/acd-migrate-command-cli-bijection.test.mjs` is the SAME pattern
applied to the unrelated `migrate:*` namespace — cited by the brief as a second precedent, but it
would not itself gate a `work:*`-namespaced loop command; it's included here only as confirmation
the "registry-derived, no hard-coded list" bijection idiom is used twice, consistently.

**The narrower bundle-parity gate.** `test/arch/acd-work-insert-command-bundle-parity.test.mjs` is
scoped ONLY to `work:insert-*` commands (per milestone 52's research, `acd-work-insert-command-bundle-parity.test.mjs:23-27`)
— it would NOT catch a CLI-only `work:loop` shipping with no `/aof:*` wrapper. Whether `aof work
loop` needs a bundle-command wrapper is an operator house-rule question (memory:
"work-command-implies-claude-command"), not a registry-enforced gate today.

---

## Q3 — `aof work next` (`nextWork` in `src/work.mjs`)

**Return shape** (`work.mjs:862-869, 1011`): `{state:"ready", ref, type, slug, status, path}` |
`{state:"blocked", ref, type, slug, status, path, waitingOn:[...]}` | `{state:"done"}`. The
COMMAND layer (`src/commands/next.mjs:31-140`) wraps this with a mesh-lease overlay
(`held`/`skipped`) and can additionally return `{state:"held", skipped}` — but the raw engine
function only ever returns the three states above.

**Inputs**: `nextWork(workDir, scopeRef, {candidacyView, view})` (`work.mjs:908`).

**Scope support is NARROWER than the milestone's own naming implies — a measured gap.**
`nextWork`'s scope parser is `inRange(scopeRef)` (`work.mjs:847-860`): it accepts a bare NUMBER
(`^\d+$` → exactly that driver) or a RANGE (`^(\d+)-(\d+)$` → drivers in `[lo,hi]`). **It does
NOT recognise an `NN/SS` story ref** — anything that doesn't match either regex falls through to
`() => true`, i.e. **matches every driver, silently** (no error, no warning). This is a real
inconsistency inside `work.mjs` itself: `validateWork`'s own `inScope`
(`work.mjs:723-730`) — a SEPARATE, richer scope parser in the SAME file — DOES handle `NN/SS`
pairs and slug substrings; `work-doctor.mjs`'s `inScope` (`work-doctor.mjs:455-463`) is a third,
independently-written copy that ALSO handles `NN/SS`. `nextWork` is the one function of the three
that does not. **Consequence for this milestone**: `aof work loop <ref|range>` cannot lean on
`nextWork`'s existing scope arg to scope down to a single STORY — passing `18/02` today silently
becomes "no scope" (walks the whole stream, offers the first ready item anywhere), which is not
what "loop this one story" would mean.

**The phase-for-item mapping (type + status → refine/continue/verify) exists ONLY as prose.**
Confirmed by direct read of `src/bundle/commands/autonomous.md:60-81` (`<process>` step 2, quoted
in full under Q7 below) — it is a bulleted decision list a MODEL reads and acts on:
"milestone with no stories → `aof:refine NN`"; "story whose tasks aren't authored/tagged →
`aof:refine NN/SS`"; "story with tasks, not done → `aof:continue NN/SS`"; "milestone with all
stories done → `aof:verify NN`". **No function in `src/` computes this mapping.** The one piece
of it that IS code, `resolveDirectivePhase(workspace, phase, dispatchRef, storeOptions)`
(`src/commands/continue.mjs:114-133`), answers a narrower, different question — "does dispatching
`continue` at a MILESTONE ref mean the single-phase directive or the whole `autonomous` cascade" —
and only for the `continue` verb; it does not decide refine-vs-continue-vs-verify for a story at
all. **The closest existing machine-readable signal for "has this story's tasks been
authored/tagged"** is `hasTaskFiles`/`item.hasTasks` (`work-doctor.mjs:138-144`, populated in the
snapshot at `work-doctor.mjs:281`), currently consumed only by doctor's advisory
`started-story-no-tasks` finding (`work-doctor-coherence.mjs:322-328`) — not by any phase-decider.
A local-loop phase-mapper would either reuse this exact predicate or re-derive it.

---

## Q4 — the run store (`src/run-store.mjs`) + milestone 20's resilience work

**Record shape** — 15 keys, frozen (`run-store.mjs:344-362` `buildRecord`, `:370-388`
`normalizeRecord` for forward-compatible reads): `runId, itemRef, state, attempt, outcome,
sessionId, brief, createdAt, updatedAt, failureReason, heartbeatAt, retryOf, reclaimedAt, node,
resumeAfter`. Path seam: `runsDir(item)` = `item.dir/runs`, one JSON file per run, optionally
node-partitioned (`runNodeRecordPath`, `run-store.mjs:59-86`).

**State machine** — a CLOSED 5-edge transition table (`LEGAL_TRANSITIONS`, `run-store.mjs:96-102`):
`queued>running`, `queued>cancelled`, `running>done`, `running>failed`, `running>cancelled`.
`isLegalTransition(from,to)` is the pure predicate (`:106-108`); everything else — every self-loop,
every move out of a terminal state — is illegal. `queued` is a reserved, never-actually-minted
state (`startRun` always begins at `running`, `:398` region) that only gates the dedup check.

**Attempt ceiling** — `shouldRetry(record, maxAttempts)` = `isRetryable(record.failureReason) &&
record.attempt < maxAttempts` (`run-store.mjs:141-143`), deliberately TIME-BLIND (that's
`retryReadiness`'s job). The ceiling itself is resolved OUTSIDE the store — `run-store.mjs` reads
no config (08/ADR-002 basis-neutral) — at `work.autonomous.maxAttempts`, default 3, resolved at
e.g. `src/commands/run-retry.mjs:62` and `src/commands/resume.mjs:119`; this repo's own
`.aof/aof.config.json` sets it to `3`.

**Retryable/non-retryable classification** — `isRetryable(failureReason)` (`run-store.mjs:126-130`):
`runtime_offline`/`timeout`/`session_limit` → retryable (infra); `agent_error`/anything
else/`null` → non-retryable, FAIL CLOSED. `session_limit` carries a `resumeAfter` park gate
(`retryReadiness`, referenced in `resume.mjs:25, 80`) distinct from the plain retryable/not split.

**`aof resume`** — `src/commands/resume.mjs` (`work:resume`). Two modes on the SAME command: no
`ref` → a SWEEP over every item's runs, reporting readiness rows (`in-flight`/`stranded`/`parked`/
`attempts-exhausted`/ready) sorted ready-first-then-soonest; a `ref` → ACT: reclaim any stranded
`running` record first (`transitionStaleRunsReclaimed`, `resume.mjs:137`), then
`transitionRunStart({mode:"retry", …})` (`resume.mjs:143-147`). It re-derives NO classification —
every refusal (`no-retryable-run`/`not-retryable`/`attempts-exhausted`/`retry-parked`/
`duplicate-run`) propagates coded from the store, unchanged (`resume.mjs:15-17, 138-142`).

**What a durable LOOP would need to add.** Nothing in `run-store.mjs`'s frozen 15-key shape names a
"phase" (refine/continue/verify) or a "loop" concept — a run record today is scoped to ONE
execution (one `aof work refine <ref>` attempt, in the mesh path one assignment's worker run). The
milestone's `--resume`-able LOOP state (which phase it was in, which item in a range, how many
gate-retries used) is a NEW concept layered on top: either (a) a new record TYPE (a `loop` record
distinct from a `run` record, e.g. `wiki/work/NN…/loops/<loop-id>.json`), reusing `run-store.mjs`'s
path/atomic-write/state-machine idioms but as a sibling store, or (b) additive fields threaded
through the EXISTING run record via its `brief` (already an opaque, verbatim-persisted bag,
`run-store.mjs:352` `brief: brief ?? {}` — never reshaped) plus a `retryOf`-style lineage chain
across the range's items. **Not decided here** — both are mechanically possible against the
current API; the state-machine test's 25-cell closed-table assertion
(`test/run-store-state-machine.test.mjs:17-19, 62-77`) and the classification purity test
(`test/arch/acd-run-retry-classification.test.mjs`, source-greps `isRetryable`/`shouldRetry`'s
BODIES for `Date`/`readFile`/`process`/etc, `:64-76`) would need to keep passing byte-identically
either way, since neither test is loop-aware and neither should become so.

**How run state reaches the board (m21) — the face.** Exactly ONE: `work:run-status`
(`src/commands/run-status.mjs:19-101`, `{ref, runs: RunRecord[]}`) is invoked by BOTH the CLI
route (`route: ["work","run-status"]`) and the board's HTTP route `GET /api/work/run-status`
(`src/board-ui.mjs:110-119`, a thin `invoke("work:run-status", …)` call — no duplicated logic).
There is no separate WS-push face for run state; the board's story polls this same read.

---

## Q5 — `aof work doctor` (`src/work-doctor.mjs` + `work-doctor-*.mjs`)

**Check/score shape today.** A check is a pure `(snapshot, ctx) => Finding[]` function, where
`Finding = {code, severity:"warn"|"error", path, message}` (`work-doctor.mjs:11-16`). The
`CHECK_GROUPS` array (`work-doctor.mjs:398-413`) is the registry: `orphanFolderGroup`,
`duplicateDriverNumberGroup`, `statusCoherenceGroup`, `lifecycleCompletenessGroup`,
`cacheAuthorityGroup`, `freshnessGroup`, `structuralIntegrityGroup`, `budgetGroup`,
`meshIdentityCommittedGroup`. `doctorWork(workDir, config, scope, options)`
(`work-doctor.mjs:508-533`) builds ONE shared read-only snapshot (`buildSnapshot`,
`:232-318` — items enriched with meta/mtimes/docs/`hasTasks`, plus a cache overlay for
worker-authored status), runs every group over it, concatenates, de-dupes on
`code\0path\0message` (`:483-491`), filters to scope (`inScope`/`filterFindingsToScope`,
`:455-481` — this copy DOES support `NN/SS`, see Q3's note on `nextWork`'s narrower one).

**`--json` shape** (`src/commands/doctor.mjs:232-246`): `{healthy, strict, errors, warnings,
findings}` — `healthy`/`strict`/`errors`/`warnings` are computed at the COMMAND layer (the FACE),
not inside the engine; the engine's `run()` itself returns only `{findings}`
(`doctor.mjs:174-182`). **There is no numeric SCORE concept anywhere today** — findings are the
only output shape, aggregated into counts, never a 0-100 or similar score. A "Loop-Ready score"
is genuinely new surface, not an extension of an existing numeric field.

**Determinism gate.** `test/arch/acd-doctor-engine-determinism.test.mjs` asserts (a) calling
`doctorWork` twice over the same fixture + fixed `now`/`staleWindow` yields byte-identical
`JSON.stringify` output, and (b) NO `work-doctor*.mjs` module (globbed —
`doctorModules()`, `:27-32`, `/^work-doctor.*\.mjs$/` over `src/`, not a hard-coded file list)
contains a `Date.now(`/`new Date(` call, comments stripped. **Consequence for adding a Loop-Ready
score**: (1) any NEW module named `work-doctor-*.mjs` (e.g. `work-doctor-loop-ready.mjs`) is
AUTOMATICALLY swept into this determinism gate with no test edit — it must read time/fs only via
injected `ctx`/snapshot data, matching every existing group; (2) since `doctorWork` returns a bare
`Finding[]` array (not an object), a score cannot be added to the ENGINE's return without either
changing that return shape (touches every existing caller, including the determinism test's own
`JSON.stringify(doctorWork(...))` calls) or computing the score at the COMMAND boundary
(`src/commands/doctor.mjs`) from the returned findings — mirroring exactly how `healthy`/`strict`
are already computed there today, never inside the engine.

---

## Q6 — milestone 52's loop registry (`src/work-loops.mjs`, `src/work-loops-checks.mjs`, `src/commands/loops-*.mjs`)

**`loadLoops(workDir)`** (`work-loops.mjs:497` onward) reads `wiki/work/loops/*.md` (or wherever
`loopsDirectory` resolves) and returns `{source, present: boolean, nodes: [...], findings: [...]}`.
`present: false` (with `nodes:[]`, `findings:[]`) is the ENOENT case (`work-loops.mjs:503`) — **this
is the exact mechanical hook the milestone's "registry-optional" requirement needs**: no directory
⇒ `present === false`, cheaply and synchronously checkable before running anything else.

**`work-loops-checks.mjs`'s exports** — `CHECK_FINDING_CODES` (a frozen 8-code set: `loop-graph-ungrounded-component`,
`loop-graph-grounded-exogenous-only`, `loop-unpaired-optimizer`, `loop-unowned-reference`,
`loop-self-referential-edge`, `loop-shared-actuator-unarbitrated`, `loop-timescale-inversion`,
`loop-timescale-not-comparable`, `:48-57`), `CHECK_IDS` (`["grounding","pairing",
"reference-ownership","actuator-arbitration","timescale"]`, `:59-65`), and the five check
functions themselves: `decomposeLoopGraph`, `checkGrounding`, `checkPairing`,
`checkReferenceOwnership`, `checkActuatorArbitration`, `checkTimescale` (`:118-336`+), each a pure
`(model) => Finding[]` over the SAME `{code, severity:"warn", path, message}` shape doctor uses
(`finding()` helper, `:89-91`).

**Composition is already proven mechanically possible** — `work:loops-validate`
(`src/commands/loops-validate.mjs:29-48`) is the existence proof: it calls `loadLoops`, and ONLY
IF `model.present` runs each of the five `CHECK_IDS` checks (`ownFindings = model.present ?
CHECKS[id](model) : []`, `:34`); when absent, `checks[id] = {ran: false, findings: 0}` for all
five and the overall result is `{present: false, findings: [], summary: {error:0, warn:0, checks}}`.
**A Loop-Ready score can call this SAME `loadLoops` + conditional-checks pattern** — gate on
`model.present`, compose 52's five checks' finding counts when present, fall back to a base set
(presumably doctor's own findings, or new loop-artifact-specific base checks) when absent — with
no new API needed from `work-loops.mjs`/`work-loops-checks.mjs`; both already export everything a
composing caller needs.

---

## Q7 — `src/bundle/commands/autonomous.md`

**Quoted loop structure** (full text read; `autonomous.md:40-124`, `<process>` block):

- Reclaim orphaned runs first (a restart-time backstop scan, not a daemon) — delegates to
  `work:run-start`'s own reclaim, per the doc's own words: `autonomous.md:41-47`.
- **Loop** until `aof work next <range> --json` returns `state: "done"` (`:52`):
  1. Ask `aof work next <range> --json` → branch on `done`/`blocked`/`ready` (`:54-58`).
  2. Act on the ready item BY ITS TYPE/STATE — this is the prose phase-mapper cited under Q3
     (`:60-81`): milestone-no-stories → `aof:refine NN`; story-tasks-unauthored → `aof:refine
     NN/SS`; story-with-tasks-not-done → `aof:continue NN/SS` then `aof work validate NN/SS`
     (retry to `maxAttempts` on findings/red) then `aof:verify NN/SS`; milestone-all-stories-done
     → `aof:verify NN` (+ `--ship` → `aof:code-review NN`); uat-session-ready → `aof:verify NN`
     then STOP for human sign-off.
     Run-tracking: `aof work run-start`/`run-complete`/`run-retry`/`resume` wraps each item's
     attempt, with an explicit "let the store DECIDE resume-vs-fresh — do not re-reason the
     failure table in prose" instruction (`:85-98`) — i.e. even the PROSE loop already defers
     classification to the code (`run-store.mjs`), it just does not defer the CONTROL FLOW
     (spawn/watch/gate/retry-count) itself.
  3. Loop: confirm the tree is committed, go back to step 1 (`:122-124`).
- **Caps**: `work.autonomous.maxAttempts` (default 3, config-read at `:14`) is the validate-gate
  retry cap; there is NO other numeric cap in the document — the `<stop_conditions>` block
  (`:126-143`) is the full stop-condition set: `@uat` gate, `blocked` result, wrong/infeasible
  contract, an open decision that can't be safely defaulted, `maxAttempts` exhaustion. **None of
  this is enforced by anything other than the model choosing to follow the prose** — this is the
  literal SPEC claim ("the build-loop cap is unenforceable: it is an instruction a model may
  skip") confirmed at the source: there is no code path that stops a model mid-turn.

**Bundle rendering / manifest-hashing** (`src/work-bundle.mjs`). `bundle.json`
(`src/bundle/bundle.json`) declares each command member as
`{id, kind:"command", file:"commands/<name>.md", runtimes:["claude"], commandNamespace:"aof"}` —
`autonomous`/`continue`/`refine`/`verify` are all declared this way (`bundle.json:28-45`).
`loadBundle()` (`work-bundle.mjs:88-161`) reads the descriptor, parses each member's frontmatter +
body (`splitFrontmatter`, `:66-82`). `renderBundleOutputs`/`renderConfigOutputs`
(`work-bundle.mjs:225-236`, via `adapters.mjs`) render each to its `.claude/commands/aof/<id>.md`
target and content-hash it (`hashContent`, from `lock.mjs`, called at `:181, :215` for
asset/template outputs and inside `renderConfigOutputs` for resource outputs). **What must change
for a prompt edit to ship**: edit the `.md` body under `src/bundle/commands/` (content changes the
hash automatically — no manual bump needed), then re-render — per this repo's own
`.claude/rules/build-deploy-restart.md`, that's `node scripts/install-local.mjs` (a payload
file-copy, no SEA rebuild) followed by a desktop-app restart to pick it up. If `autonomous.md` is
reduced to a thin shell-out (this milestone's stated goal), the SAME mechanism applies — it's
still a `.md` bundle member, just a much shorter one; no new rendering machinery is needed.

---

## Q8 — test isolation + how these areas are tested

**The fake terminal-provider seam — precisely, for reuse.** `test/support/mesh-worker-terminal-fixture.mjs`
exports exactly two functions:
- `createFakeWhich(presentBins = ["claude"])` (`:14-16`) — a stubbed PATH-lookup mirroring
  `terminal-providers.mjs`'s own `which(bin, env) => path|null` contract.
- `createFakePtySpawn({onWrite})` (`:83-93`) — returns `{spawn, spawnCalls, ptys}`; `spawn` is an
  async `(bin, args, options) => pty` that records every call and hands back a fresh
  `createScriptedPty` (`:25-76`, a full `IPty` double: `onData`/`onExit`/`write`/`kill`/`resize`,
  with `dispose()`-able subscriptions matching real node-pty's unsubscribe contract). `onWrite`
  fires SYNCHRONOUSLY inside `term.write(...)`, letting a test script the "agent's" response to
  the EXACT command line the driver typed, with `emitData`/`emitExit` callbacks — no timing race
  against the driver's own internal awaits, because the driver's `onData`/`onExit` handlers are
  registered BEFORE `term.write` is ever called.

Both are consumed together, injected as `{ptySpawn, which}` straight into
`driveInteractiveClaudeSession(brief, options)` — see
`test/mesh-worker-driver-interactive-pty.test.mjs:14-116` (drives the REAL
`driveInteractiveClaudeSession`/`resolveInteractiveDriverLaunch`/`resolveProvider` chain, only the
LEAF node-pty spawn + PATH lookup are faked — "never a hand-built stub of what the provider ought
to emit", per its own header, `:1-12`) and
`test/mesh-worker-completion-detection.test.mjs:17-48` (additionally injects
`watchTranscriptSessionId`/`watchTranscriptCompletion` as scripted async functions returning
canned `{outcome}` objects, so completion-detection scenarios never touch a real transcript file
at all). This is the exact prior art a local-loop driver's tests would reuse unchanged — the fake
occupies the SAME `{ptySpawn, which}` seam whether the caller is the mesh assignment handler or a
future local `work:refine`/`work:loop` driver, because `driveInteractiveClaudeSession` itself is
mesh-blind (Q1).

**The assignment-level fixture** (`test/support/mesh-worker-exec-fixture.mjs`,
`withMeshWorkerExecFixture`, `:20-70`) is the ADDITIONAL layer needed only for testing
`createMeshWorkerExecutionHandler` (the mesh-coupled orchestration) — a real `git init`+commit repo
plus a hermetic `AOF_GLOBAL_HOME` temp dir (`env.AOF_GLOBAL_HOME = home`, `:61`), auto-cleaned in a
`finally`. A local-loop driver test would NOT need this fixture's git/worktree/global-store
machinery — only the terminal fixture above, plus a plain temp `wiki/work/` fixture (the
`buildFixture()` idiom used throughout `test/arch/*bijection*` tests) for the item/status side.

**Isolation discipline confirmed at the source**: every fixture in this family builds its own
`mkdtemp` root and passes `env: {AOF_GLOBAL_HOME: home}` explicitly through to `loadWorkspace` /
`ctx.globalWorkStoreOptions` — none of it touches the real `~/.aof`, consistent with this repo's
hook-enforced test-isolation rule.

---

## Unknowns

- **The `work:refine`/`work:continue`/`work:verify` name collision (Q2) is not resolved here** —
  whether the architect renames the new atomic drivers, changes the existing "where should this
  run" doors' contract, or picks a third shape is a design decision, not a research finding.
- **How `aof work loop <ref|range>`'s scope should resolve a story-level ref** is unanswered by
  the current codebase — `nextWork`'s own scope parser cannot do it (Q3); whether the loop
  command should widen `nextWork`, wrap it with a pre-filter, or scope by a different mechanism is
  left open.
- **Durable loop state: a new record type vs. fields on the existing run record (Q4)** — both are
  mechanically possible; no code or prior-milestone decision commits to either. Not decided here.
- **Whether the Loop-Ready score belongs as a new `work-doctor-*.mjs` check-group (composed into
  `aof work doctor`'s existing findings) or as its own registered command** (the SPEC says "on
  `aof work doctor`", which reads as the former, but the doctor engine returns a bare array with
  no score field today — Q5) is left to the architect; both are mechanically available.
- **Whether `aof work loop` needs a `/aof:*` bundle-command wrapper** is unresolved by any
  registry-enforced gate (only `work:insert-*` is covered by `acd-work-insert-command-bundle-parity`,
  Q2) — it is an operator house-rule question, not answered by the codebase.
- **Live-soak behaviour of a LOCAL (non-mesh, non-worker-daemon) `driveInteractiveClaudeSession`
  invocation was not tested here** — every existing exercise of this driver (production and test)
  runs it either inside a mesh worker's daemon process or against a fully faked `{ptySpawn, which}`
  pair; nothing in this repo has run it as a plain foreground child of an interactive `aof`
  invocation. Whether the 5-second `INTERACTIVE_COMMAND_READY_DELAY_MS` / 15-minute
  `COMPLETION_IDLE_MS` / liveness-probe constants tuned for a headless worker daemon are also
  correct for a human watching a local loop run is an open, `@manual`-soak-only question, not
  something this read-only research can measure.
