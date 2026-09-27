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
# 126 · The declaration is the unit — Architecture

## Memory recall — what was surfaced, and what it changed

`aof work memory recall "supervised declaration reconcile level-triggered restart loop clock resume
deadline attempt" --area architecture --block`, run before the first ADR was written. Five records
returned; each honoured or departed from in writing, below. A recall run earlier in this session
under the same query surfaced one further record (`63/ADR-011`, the level-less trigger defended at
the resolver); it is acknowledged in the same list rather than dropped for not recurring.

- **`36/ADR-002`** (*supervision is spawn + watchdog + jittered backoff over a **role-driven** set,
  the role read from `mesh status --json`*) → **HONOURED in mechanism, DEPARTED FROM in the set.**
  ADR-006 keeps the watchdog, the state machine, the backoff and the Job Object verbatim, and
  replaces exactly one thing: `supervision_set(is_control_node)`'s `match` becomes a set *supplied*
  by aof. The departure is the SPEC's own headline and is recorded as a supersession of that ADR's
  decision 1, never as a silent widening.
- **`53/ADR-004`** (*the loop is RESUMED not RESTORED; durable loop state is the frozen `brief.loop`
  envelope; no new store, no new directory; `src/commands/run-status.mjs` is not edited*) →
  **HONOURED, and it decides two ADRs.** ADR-004's opt-in is a NINTH key on that envelope rather
  than an allow-list in config, because a config list of "which scopes may auto-resume" is precisely
  the sibling store this ADR refuses. ADR-003 **narrows** its "not edited" clause — render, not
  document — in the open, and re-pins the control that holds it.
- **`68/ADR-002`** (*`phase` is NOT minted here; it is read from `brief.loop.phase`*) →
  **HONOURED.** ADR-003's `run-status` render reads `brief.loop.phase`/`cycle`/`cap`/`level` off the
  record and mints nothing; ADR-002's in-flight lines read the same facts the shell already holds.
  126 authors no new field anywhere.
- **`20/ADR-003`** (*resume-vs-fresh is a **verb** distinction — `work:run-retry` resumes the prior
  session on the same lineage; `work:run-start` always starts fresh*) → **HONOURED, and it supplied
  ADR-001's subject.** The attempt series is the `retryOf` lineage, which is exactly what
  `maxAttempts` counts; the clock's subject is therefore the lineage, not the declaration.
- **`63/ADR-001`** (*a trigger is a DECLARATION plus a RESOLUTION, and the trigger layer is a
  CALLER, not a coordinator*) → **HONOURED, and it is the shape of ADR-005.** aof answers *which
  declarations should be running on this node now* and composes the argv; the Rust supervisor runs
  it. The resolution's whole output is a `work:loop` input plus its argv, which is why ADR-005's row
  carries an argv and no policy.
- **`63/ADR-011`** (*the level-less trigger is defended at the RESOLVER, not at the caller*) →
  **HONOURED.** ADR-004's predicate resolves level and cap from the recovered declaration through
  `resolveLoopResume`'s existing inherit/override rule; the supervisor is handed a complete argv and
  defends nothing.

---

## Every number here carries the command that produced it

Item 83's closing rule applied to this document: **a number in an ADR is a measurement claim, and a
claim without its command is prose.** Every figure below was measured on 2026-09-08 against the
**working tree** at `b088825c` (= HEAD), which carries milestone 124's uncommitted diff to
`src/work/loop.mjs` and `src/commands/loop.mjs`. Line citations into those two files are therefore
working-tree positions and sit ~32 lines below their `b088825c` equivalents.

| claim | measured | command |
|---|---|---|
| `src/commands/loop.mjs` · `src/work/loop.mjs` | **2,081** · **1,223** lines | `wc -l <file>` |
| `src/commands/run-status.mjs` · `src/commands/mesh/desktop.mjs` · `src/commands/mesh/identity.mjs` | **101** · **587** · **530** | same |
| `app/desktop` core `supervision.rs` · `poll.rs` · `status.rs`; shell `supervisor.rs` · `main.rs` | **286** · **96** · **427** · **580** · **506** | same |
| `LOOP_STOPS` members (incl. `deadline-exhausted`) | **12** | `node -e "import('./src/work/loop.mjs').then(m=>console.log(m.LOOP_STOPS.length))"` |
| occurrences of `deadline-exhausted` in `src/` | **3** — the decider, the stop list, the shaper | `grep -rn "deadline-exhausted" src/ \| wc -l` |
| `reportLine(report, …)` call sites in the loop shell, **all terminal** | **19** | `grep -c "await reportLine(report" src/commands/loop.mjs` |
| direct in-flight `report(` calls that already exist | **2** gate-ladder lines (`:243`, `:251`) + the L1 row line (`:1023`) + the grade rung (`:1874`) | `grep -n "report(\`" src/commands/loop.mjs` |
| `console.log` in the loop shell | **1**, the injected launcher printer at `:2076` | `grep -n "console.log" src/commands/loop.mjs` |
| PRINTERS roster / ceiling | **12** entries, `commands/loop.mjs` already licensed as a `cli.launch` body | `sed -n '32,70p' test/arch/command/acd-console-log-confined.test.mjs` |
| `decideScheduleToClose` call sites in the shell | **2** — `:1616` (resume lineage) and `:1676` (in-process retry) | `grep -n "decideScheduleToClose" src/commands/loop.mjs` |
| — the `startedAt` either one passes | a **run-derived** instant: `retryLineageStartedAt(...)` at `:1615`, else `phaseRun.record.createdAt` at `:1657` | `sed -n '1611,1680p' src/commands/loop.mjs` |
| the failing run record, 124/00 attempt 1 | `createdAt` 23:32:33.272Z · `heartbeatAt` 00:02:19.028Z · `updatedAt` = `reclaimedAt` 11:02:13.985Z · `failureReason` `runtime_offline` · `attempt` 1 · `retryOf` null | `node -e` over `…/124…/stories/00…/runs/node-7297/20260907T233233272Z-0000.json` |
| — attempt duration **at its last heartbeat** | **1,785,756 ms = 29.8 min** | same record: `(heartbeatAt − createdAt)` |
| — `updatedAt − createdAt` (the reclaim stamp) | **41,380,713 ms = 11.49 h** | same record |
| the lineage that succeeded, same story, same day | `-0001` 20.0 min (`timeout`) → `-0002` 30.1 min (`timeout`, `retryOf` `-0001`) → `-0003` 18.2 min (`done`, `retryOf` `-0002`) | `node -e` over the three records |
| — accumulated attempt time vs wall-clock lineage | **4,101,267 ms vs 4,104,442 ms — a 3.2-second difference** | same, summed |
| `scheduleToClose` ceiling | **7,200,000 ms (2 h)** | `69/ADR-002`'s table |
| run record keys | **16** (`runId … spend`) | `sed -n '525,545p' src/run-store.mjs` |
| `brief.loop` declaration keys | **8** (`loopRunId, scope, level, cap, phase, cycle, startedAt, id`) | `sed -n '1130,1161p' src/work/loop.mjs` |
| — keys `recoverableDeclaration` PROJECTS | **5** (`loopRunId, scope, level, cap, startedAt`) | `sed -n '1177,1196p' src/work/loop.mjs` |
| `RETRYABLE_REASONS` | **3** — `runtime_offline`, `timeout`, `session_limit` | `sed -n '301,303p' src/run-store.mjs` |
| `retryReadiness` states | **5** — `ready`, `parked`, `not-retryable`, `attempts-exhausted`, `no-run` | `sed -n '428,437p' src/run-store.mjs` |
| items in this stream · run records on disk | **410** · **105** | `listItems`/`readRuns` probe (scratchpad `decl-cost.mjs`) |
| — run records carrying `brief.loop` · non-terminal | **8** · **3** | same probe |
| — cost of the naive declarations answer over the whole stream | **167.3 ms** (24.8 list + 142.5 read), warm cache | same probe |
| `MeshStatus` (Rust) | `nodes` · `boards` (`#[serde(default)]`) · `is_control_node`; unknown keys ignored | `sed -n '186,196p' app/desktop/crates/core/src/status.rs` |
| the Rust poll cadence | `POLL_INTERVAL = 3 s`, one `mesh status --json` per tick | `app/desktop/crates/app/src/supervisor.rs:62`, `:331-377` |
| `SupervisorState`'s local-process signals | exactly **2** fixed fields, read at **6** sites in `main.rs` | `grep -rn "server_signal\|ui_signal" app/desktop/crates/` |
| `cargo` lane coverage | `cargo test` over `app/desktop/Cargo.toml` (**excludes `crates/app`**) + `cargo check` over the app crate | `sed -n '183,215p' scripts/test.mjs` |
| `node:sqlite` import sites in `src/` | **2**, in two duplicated `resolveSqlite` bodies | `grep -rn 'import("node:sqlite")' src/` |
| — the targeted `emitWarning` wrap, measured | swallowed **1**; `DatabaseSync` present; `emitWarning` restored; a **second** import emits **0**; a different `ExperimentalWarning` still prints | scratchpad `warn-probe.mjs` on `node v22.22.2` |
| `HKCU\…\CurrentVersion\Run` entries on this machine | **10** `REG_SZ` | `reg query "HKCU\Software\Microsoft\Windows\CurrentVersion\Run"` |
| `claude auth status` | exists (`login \| logout \| status`) | `claude auth --help` |
| `tauri-plugin-autostart` | **not a dependency** | `grep -n autostart app/desktop/crates/app/Cargo.toml` |
| this repo's pinned workspace id | `mesh.workspaceId = 9db1fd84f5895e38` | `node -e` over `.aof/aof.config.json` |
| `TECH_DEBT.md` | **74** entries, **3,614** lines against a **3,634** ceiling; 46 open, **28 unstatused** | `aof work debt` |

**Two corrections to the SPEC, made here rather than left standing.**

1. **The clock's `startedAt` is not the declaration's origin.** `SPEC §Objective`'s third row reads
   *"`decideScheduleToClose` … the declaration's origin timestamp"*. Neither call site passes
   `brief.loop.startedAt`: `:1617` passes `retryLineageStartedAt(...)` — the **root of the `retryOf`
   chain**'s `createdAt` — and `:1677` passes the fresh run's own `createdAt`. The defect and the
   magnitude are exactly as the SPEC states; the *origin* is a run instant, and that is what decides
   the fix. The declaration envelope does not have to change for ADR-001 at all, which is why
   ADR-001 adds no persisted key. (The reported `elapsedMs=41384106` is ~3.4 s more than this
   record's own `createdAt → reclaimedAt` span of 41,380,713 ms, consistent with `now` being read a
   few seconds after the reclaim stamp on a 410-item sweep. Nothing turns on the difference.)
2. **`"reclaimed"` occurring "once in `src/`" is the assignment vocabulary, not the run edge.** The
   run-side reclaim is `transitionRunReclaimed` (`src/effects/run-transitions.mjs:147-170`), which
   raises `run.completed` with `reclaimed: true` and settles `failed` / `runtime_offline` +
   `reclaimedAt`. The SPEC's point survives intact — **nothing turns that verdict into a relaunch** —
   but the consumer ADR-004 supplies reads `failureReason`/`reclaimedAt` on the record, not a string.

**The graph.** Built at this decision point: `aof graph build .` reported **`No code-graph topology
changes detected`** and `Already current at 16091 nodes, 39008 edges, 0 hyperedges (egress: none,
built 2026-09-08T17:32:56.982Z)` — an `unchanged` build is a success, so the artifact is current for
the tree these ADRs describe. Every figure below is `aof graph impact <file>` against that build —
*actual* structure, not inferred coupling.

| module | dependents ← | imports → |
|---|---|---|
| `src/global-work-store.mjs` | **109** | 10 |
| `src/run-store.mjs` | **65** | 5 |
| `src/work/loop.mjs` | **44** | 1 (`loop-progress.mjs`) |
| `src/mesh/presence.mjs` | **43** | 7 |
| `src/commands/loop.mjs` | **38** | 17 |
| `src/effects/journal.mjs` | **31** | 2 |
| `src/loop-bounds.mjs` | **30** | **0** (a true pure leaf) |
| `src/mesh/assignment-reclaim.mjs` | 14 | 14 |
| `src/commands/mesh/desktop.mjs` | 5 | **1** (`face-shared.mjs`) |
| `src/commands/mesh/identity.mjs` | 5 | 7 |
| `src/commands/run-status.mjs` | **1** (`command-core.mjs`) | 6 |
| `app/desktop/crates/core/src/supervision.rs` | **1** (`supervisor.rs`) | 0 |
| `app/desktop/crates/core/src/status.rs` | 2 (`supervisor.rs`, `view_model.rs`) | 0 |
| `app/desktop/crates/app/src/supervisor.rs` | 1 (`main.rs`) | 4 core modules |
| `app/desktop/crates/core/src/poll.rs` | **0** | 0 — *in the graph, genuinely uncoupled* |

---

## ADR-001 — The clock's subject is the ATTEMPT SERIES, not the calendar: `scheduleToClose` sums attempt durations over the `retryOf` lineage, and downtime is charged to nobody

**Context.** `69/ADR-002` derives `scheduleToClose` as *"`maxAttempts` (3) × `startToClose` (30 min)
+ slack"*, titles its column *"total across all attempts"*, and rules that it runs *"from the moment
**the attempt** starts"*. Every clause names attempts. The implementation subtracts two instants —
`elapsedMs = now − startedAt` (`src/work/loop.mjs:784`) — which is a wall-clock span, and the two
readings agree exactly as long as nothing pauses. The measured failure is what happens when
something does: 29.8 minutes of attempt against a 120-minute ceiling was billed as 11.49 hours and
the declaration became **permanently** unresumable, because the origin is fixed and `now` keeps
moving. That is the sharpest form of the defect and the reason it is not a preference: a bound that
grows while nothing runs is not a bound on anything.

The second half of the context is what makes the fix cheap: **the records already hold every
instant.** `createdAt` opens an attempt. `heartbeatAt` is the last moment it was observed alive
(stamped by consumption — `69/ADR-003`). `updatedAt` closes it, except on the one path where it
does not: a **reclaimed** attempt's `updatedAt` is the reclaim stamp, written hours later by a
sweep, which is why the honest end of a reclaimed attempt is its last heartbeat. `retryOf` chains
the attempts, and the shell already walks that chain (`retryLineageStartedAt`, `:674-685`).

**Decision.**

1. **The subject is the attempt series — the `retryOf` lineage — which is exactly `maxAttempts`'
   subject** (`20/ADR-003`'s recall hit). The declaration is not the clock's subject and its
   `startedAt` is not the clock's input; neither call site passes it today, so this is a
   clarification of the code as much as a change to it.
2. **A new pure summer in `src/work/loop.mjs`, data in and a number out.** It takes the lineage's
   records and `now`, and returns accumulated attempt milliseconds. Per attempt:
   - **reclaimed** (`reclaimedAt != null`): end at `heartbeatAt ?? updatedAt` — the last observed
     liveness, never the reclaim stamp;
   - **settled** (any terminal state): end at `updatedAt`;
   - **running**: end at `now`.
   It reads a clock through no door of its own; `now` arrives as data, like every decider in this
   module.
3. **`decideScheduleToClose`'s input contract becomes `{ elapsedMs, ceilingMs }`.** The instant
   arithmetic moves out; the halt, the producer `loop:schedule-to-close>=ceiling`, the
   `disposition: "preserved-for-triage"`, the `deadline: "scheduleToClose"` detail and the refusal
   codes are byte-identical. Both shell sites pass `elapsedMs` from §2 instead of a `startedAt`.
4. **This SUPERSEDES `69/02`'s task-01 criterion that calls the decider with `{startedAt, now,
   ceilingMs}`** — the two-instant form, exercised at `test/work/four-deadlines.test.mjs:126-139`.
   That `.feature` is delivered and is therefore **not edited**; the new rule lives in 126's own
   contract, and the test is code and is re-pointed at the summer + the decider in the same diff.
   Both of the criterion's observable claims survive unchanged: 99 ms under a 100 ms ceiling is
   admitted, 100 ms halts as `deadline-exhausted` with `preserved-for-triage`.
5. **No new persisted key, anywhere.** Not on the run record (16 keys, frozen through additive
   supersession), not on `brief.loop`. §2's inputs are already on disk. This is the ADR that makes
   `53/ADR-004`'s "no new store" claim keep paying.
6. **The two bounds are ANDed and neither is weakened.** `maxAttempts` still counts attempts
   (`shouldRetry`), `cap` still counts drive cycles, and `scheduleToClose` still bounds total
   compute. **The stated cost:** inter-attempt latency — the gate ladder, findings composition — is
   no longer charged, so the effective ceiling widens from "90 min of attempts + 30 min slack" to
   "120 min of attempts". Measured on 124/00's own three-attempt lineage the difference is **3.2
   seconds** (4,101,267 vs 4,104,442 ms), because attempts there were 2.7 s apart; the two measures
   diverge only when the machine goes down, which is the case this ADR exists for. `69/ADR-002`
   already budgets that gap separately, by name, as "slack for retry latency".

**The property, stated so it can be tested.** *A declaration halted only by downtime is resumable
forever; a declaration that has actually consumed its compute budget is not.* Applied to the
measured failure: 1,785,756 ms of attempt against a 7,200,000 ms ceiling is **admitted**, with 90.2
minutes of budget remaining — instead of a permanent refusal.

**Alternatives.** (a) *Persist an accumulator on the declaration.* Refused — a second derivation of
a fact the records already carry, and the one that goes stale if a record is repaired by hand
(`53/ADR-004`'s central argument, applied to itself). (b) *A fresh declaration per reboot.* Refused
by `SPEC §Scope` and correctly: it resets the total budget, which makes a bounded loop unbounded.
(c) *Subtract only the gap between the last heartbeat and the reclaim.* Refused — it is the same
arithmetic with a special case bolted on, and it still charges an operator for the hours their
laptop was shut. (d) *Charge wall-clock but only while the loop process is alive.* Refused: the
records cannot distinguish "the loop was alive and idle" from "the machine was off" without a
liveness signal for the shell itself, which is a new persisted fact.

### AMENDED at the contract beat, 2026-09-08 — a STALE `running` attempt ends at its last liveness, not at `now`

`ADR-004`'s amendment below is the Blocker; this is its other half, and without it the summer
reproduces the exact bill this ADR exists to delete. A loop that dies with the machine leaves a
`running` record that nothing reclaims until a `run-start` sweep or a `--resume` runs — which on the
measured failure was **eleven hours later**. §2 as written ends a `running` attempt at `now`, so
between 00:02Z and 11:02Z that one record would have been charged the full 11.49 h all over again,
the reclaim stamp having simply not been written yet.

**The rule, stated once and covering all four shapes:** an attempt ends **at its close (`updatedAt`)
if it settled**, **at its last observed liveness (`heartbeatAt ?? updatedAt`) if it is reclaimed OR
stale**, and **at `now` only while it is demonstrably alive.** Reclaimed and stale are the same
physical fact — a runtime that stopped reporting — differing only in whether anyone has written the
verdict down yet, so they must not be charged differently.

Consequently the summer takes the **staleness threshold as data**: `stalenessMs`, the same
`heartbeatFromConfig(workspace)` value (`src/loop-bounds.mjs:60`) that `isStale` is handed — read by
the caller from the ONE bound home and passed in, never resolved inside the decider, so `69/FF-6901`
is honoured rather than annexed. FF-12601's attempt-shape leg is **four** shapes, not three, and
drives the measured record **both ways** — as the reclaimed record it became and as the stale
`running` record it was between 00:02Z and 11:02Z — for the same **1,785,756 ms**, which is the
clearest available proof that the two paths agree.

### AMENDED at the contract beat, 2026-09-08 (126/02 feasibility) — the `retryOf` walk gets ONE engine-resident home, and `stalenessMs` is OPTIONAL because two callers ask different questions

FF-12601 said the lineage is walked "through the shell's existing `retryOf` walk". That cannot
stand once ADR-004's predicate needs the same walk: **`src/work/loop.mjs` has ZERO `import`
statements** (`grep -c "^import " src/work/loop.mjs` → `0`), which is the property that makes every
decider in it drivable over literal fixtures, and the engine may not reach into the shell to get one.

**The walk moves into the engine as one pure function** — records plus a start record in, the
lineage out, terminating on a broken or cyclic `retryOf` exactly as today — and the shell's
`retryLineageStartedAt` (`src/commands/loop.mjs:674-685`) is re-pointed at it. The shell keeps **no
second traversal**. This is a subtraction: one walk, two callers, where the alternative was two walks
that agree until one is edited.

**`isStale` is handed IN, on the summer's input bag**, beside `stalenessMs` — the same way ADR-004
§4 hands the predicate its verdicts. The engine importing nothing is not a stylistic preference here;
it is what keeps `src/work/loop.mjs` at 44 dependents and 1 import.

**And `stalenessMs` is OPTIONAL, because the summer has two callers asking different questions.**
Absent, a `running` attempt is treated as **alive** and ends at `now` — *the render's* question
("how long has this been going?"), which is what 126/01 calls it for. Supplied, a **stale** `running`
attempt ends at its last liveness — *the budget's* question ("how much compute has this consumed?"),
which is ADR-004's. One function, one arithmetic, and the difference between the two readings is a
declared input rather than two implementations.

---

## ADR-002 — The loop narrates in flight through the ONE injected printer it already has, by default; `--quiet` silences in-flight lines and nothing else

**Context.** `reportLine` (`src/commands/loop.mjs:982-993`) replays `state.driven` in full and then
prints the state line — and **all 19 of its call sites are terminal returns**. A loop that drives for
three hours prints nothing until it stops. Four in-flight lines already exist and prove the seam
works: the two gate-ladder lines (`:243`, `:251`), the grade rung (`:1874`) and the L1 row line
(`:1023`). What is missing is a line at the one place a multi-hour wait begins — `drivePhase`
(`:1027-1058`), which mints the run and then awaits `work:drive-<phase>`, the PTY session — and the
facts that make a line worth reading: which cycle of which cap, at which level, on which lineage.
Those facts are all in scope at the drive site (`cycles`, `resolved.cap`, `resolved.level`,
`act.phase`, `act.ref`).

The discipline this must not break is a hard one. `commands/loop.mjs` is a **licensed** printer —
one of twelve, category (2), a `cli.launch` body — and `PRINTERS` may only shrink. The one
`console.log` is the launcher's injected `report` (`:2076`); the core defaults to `NO_PRINT`
(`:1233`), which is what keeps `--json`'s document a document.

**Decision.**

1. **One new seam, derived from the existing printer, never a second one.** The body derives
   `narrate` from the same injected `report`: identity when narrating, `NO_PRINT` under `--quiet`.
   No new `console.log`, no new PRINTERS row, no change to the ceiling of 12, and the frozen probe
   is untouched — `--json` never launches (`53/ADR-005`, `acd-loop-probe-contract`).
2. **Two classes of line, and the classification is structural, not a list.** *In-flight* lines go
   through `narrate`; the *terminal account* goes through `report`. Every existing in-flight line
   (the two gate rungs, the grade rung, the L1 row line) moves to `narrate`; every `reportLine` site
   stays on `report`. One predicate, testable, and it does not need re-litigating per line.
3. **The lines, in the module's existing idiom** (`Gate work:validate <ref> — N finding(s).`):
   - `Driving <ref> — <phase>, cycle N of <cap>, <level>.` — immediately before `drivePhase`.
   - `Retrying <ref> — <phase>, attempt N of <cap> (<failureReason>).` — at the in-process retry.
   - `Resumed <ref> — attempt N of <cap> on run <runId>.` — at the resume-lineage retry.
   - `Reclaimed <ref> — run <runId> (<failureReason>).` — one per run settled by `--resume`'s sweep.
   Facts only, drawn from what the shell holds; no invented vocabulary, no second spelling of a stop.
4. **`--quiet` silences in-flight lines and NOTHING else.** The terminal account `53/ADR-016` makes
   the one authoritative record — every driven ref and phase, accepted milestones, and on a halt the
   stop id, the halted ref and the exact `aof work loop <range> --resume` command — is printed under
   `--quiet` exactly as it is today. A flag that could suppress the authoritative account would make
   the wrapper's promise conditional on a flag.
5. **Default ON.** `SPEC §Scope` is right that a command which runs for hours in silence is a defect
   rather than a preference, and the ratchet is that the flag is `--quiet`, not `--verbose`: the
   silent behaviour is the one that has to be asked for.
6. **The flag lands in three places or it does not exist**: `work:loop`'s input schema (which is
   `additionalProperties: false`, `:2040-2047`), `cli.spec.flags`, and `cli.argv`. `--json` still
   never launches, so the probe is unaffected.
7. **A per-heartbeat liveness line is DEFERRED, with its seam named.** `SPEC §Scope` asks for "which
   stage within the drive". The loop cannot see inside the PTY — it is awaiting one
   `invokeRegistered` call — and the honest granularity available to it is the act and the gate
   rung, which is what §3 delivers. The signal that would supply more already exists: the driver's
   own heartbeat timer reads the consumed heartbeat on the policy's cadence
   (`src/agent-session-driver.mjs:1231-1241`). Adding a callback there is a change to a module whose
   reach is ADR-governed (`53/ADR-015` §5, raised once already by `69/ADR-002`'s amendment), and a
   narration story should not also spend that ceiling. Named, not dropped.

**Alternatives.** (a) *Print from the core rather than the launch body.* Refused: the core's
`NO_PRINT` default is what keeps `--json` a single document. (b) *A second printer for progress.*
Refused by the ratchet, and unnecessary — one injected function already reaches stdout. (c) *A
`--verbose` opt-in.* Refused on §5. (d) *Stream structured events instead of lines.* Refused: it is
a second face for a command whose machine face is the frozen probe.

**Consequences for the delivered suites.** Measured, because the risk is smaller than it looks:
**no delivered suite collects the loop's `report` lines and asserts them as an exact array or by
index.** Every collector uses `.at(-1)` with `assert.match` (`loop-command-stops.test.mjs:60`,
`warm-fix-loop.test.mjs:208,223`, `work-loop-production-review-bound.test.mjs:181`,
`loop-progress-production.test.mjs:405`) or derives the string from `state.driven` rather than from
stdout (`loop-driven-row-carries-the-grade.test.mjs:241`); the only `lines.length` assertions in
this family belong to `work doctor` and `aof work loops`, which this milestone does not touch
(`grep -rn "reports.length\|lines.length\|deepEqual(reports" test/loop test/grade test/work`). The
story still owns re-baselining any collector that turns out to count, and the class is named so a
surprise is a finding rather than a mystery.

### AMENDED at the contract beat, 2026-09-08 — the classification is by ROLE, not by call site; three lines move, not four

126/00's QA found that §2's structural predicate — *"every `reportLine` site is an account line;
everything else is in-flight"* — is a proxy that fails on its own list. Two measured cases break it:

- **`runL1` never calls `reportLine`** (`src/commands/loop.mjs:995-1024`, entered at `:1425`): it
  builds its rows, then prints them at `:1023` and returns. Those row lines are the **entire output
  of an L1 invocation**, so moving them to `narrate` would make `aof work loop <scope> --level L1
  --quiet` print **zero bytes** — the precise opposite of §4's "silences nothing that matters".
- **`Nothing to resume in <scope> — no run carries a loop declaration.`** (`:1276`) is an account
  line — it is what that invocation returns — and it is not a `reportLine` site either, so the
  predicate does not reach it at all.

**The ruling: classify by ROLE.** An **account** line is what an invocation returns to the operator —
every `reportLine` site (19), **the L1 row lines**, and **the `Nothing to resume` line** — and stays
on `report`, printed under `--quiet` exactly as today. An **in-flight** line is one printed while a
drive or a gate is *pending* — the two gate rungs (`:243`, `:251`), the grade rung (`:1873`), and the
four lines §3 adds — and goes on `narrate`.

So the existing in-flight lines that move number **THREE, not four**, and the invariant that falls
out is sharper than the one it replaces: **`--level L1 --quiet` prints exactly what `--level L1`
prints.** FF-12602's leg is corrected to the three sites and gains that L1 equivalence as a driven
case, which is a stronger claim than a call-site sweep because it is behavioural.

---

## ADR-003 — `run-status` renders what the record holds: the RENDER moves, the DOCUMENT does not, and `53/ADR-004`'s "not edited" invariant is narrowed in the open

**Context.** The record carries sixteen keys and `brief.loop` carries eight more; the human render
prints **two** (`src/commands/run-status.mjs:88-95` — `runId` and `state`). The `--json` adapter
already passes the whole result through (`:100`), so the machine face has never lost anything; the
defect is a renderer that discards its input, which is why `SPEC §Scope` is right that no new field
is authored.

**The trap the SPEC does not name, and it is load-bearing.** `src/commands/run-status.mjs` is
**byte-pinned by sha256** at `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs:115`
(`a537cec0…`, a CRLF-normalised digest), as leg 2 of `53/FF-5307` — the control that holds
`53/ADR-004`'s *"`src/commands/run-status.mjs`, `src/board-ui.mjs` and `ui/` are not edited"*
invariant. It has already been re-pinned once, by `119/01`, for a path citation. **Any renderer edit
reds it.**

**Decision.**

1. **The render gains the facts the record already holds**, per run: phase, cycle/cap, level and
   attempt (from `brief.loop` — `68/ADR-002`'s discipline: read, never minted), elapsed and
   heartbeat age, session id, node, failure reason, and the `fromWorker`/`reportedBy` provenance the
   result already carries. The empty-history line and the `answeredFrom` semantics are unchanged.
2. **Elapsed and heartbeat age are DERIVED PURELY, from an injected `now`** — the same arithmetic
   ADR-001 §2 defines, reused rather than re-derived, so a run's "how long has this been going" and
   the clock that bounds it can never disagree. `run-status` reads no wall clock of its own; the
   render receives `now` as data (the `22/R2` inject-the-clock discipline `mesh:status` already
   follows for staleness).
3. **The `--json` document does not change.** No key is added, removed, renamed or reordered;
   `json: (result) => result` stays. Leg 1 of `53/FF-5307` — the `brief.loop` round-trip through
   this face — stays byte-identical, and is asserted, not assumed.
4. **`53/ADR-004`'s invariant is NARROWED, and the narrowing is recorded here.** Its intent was that
   *loop state needs no new face* — which remains true and is the reason §3 exists. Its letter froze
   the file. 126 narrows it to: **the DOCUMENT is frozen; the RENDER is not.** The same act
   `53/ADR-014` performed on a delivered guarantee, done in the open rather than by quietly editing
   a hash. The story that edits the renderer re-pins `53/FF-5307` leg 2 **in the same diff**, with
   the reason written beside the pin exactly as `119/01`'s is.
5. **`src/board-ui.mjs` and `ui/` stay untouched**, and their pins stay where they are. Nothing here
   reopens the board.

**Alternatives.** (a) *A new `--verbose` render flag.* Refused: it makes the honest render the
opt-in and leaves the two-key default as the thing an operator sees first. (b) *Render from the
worker projection instead of disk.* Refused — TECH_DEBT item **19** measures a cached run row that
read `running` for two days after the run finished; disk is the authority for a local run, and the
`fromWorker` marker is how a projection-answered read says so. (c) *Drop the byte-pin instead of
re-pinning it.* Refused by `55/VERIFICATION` F-55-02-1's own ruling, quoted in the control: an
unpinned file is covered by no byte-freeze at all.

### AMENDED at the contract beat, 2026-09-08 — §2's injected `now` had no producer on the LIVE path, and the face is where it comes from

QA found the hole while building 126/01, and it is the exact species this milestone is about: the
headline outcome would have failed silently for an operator while every test stayed green. Measured:
the face calls `cli.render(result, faceCtx)` (`src/spine/face.mjs:181`) with
`faceCtx = { positionals: options._, options }` (`:145`) — **nothing on that object is a clock**. So
§2 (the render receives `now` as data), §3 (no new key on the document) and FF-12603's module-literal
leg (no `new Date(`) together left `aof work run-status <ref>` with **no path to an instant at all**.
`mesh:status`'s own `input.now ?? new Date()` idiom does not transfer, because there the value is
consumed inside `run()`; here it would have to ride the frozen document to reach the render.

**The ruling: the face supplies the instant a human render is produced.** `src/spine/face.mjs` adds
**one additive key**, `now` (ISO-8601 Z), to the `faceCtx` it already hands every `cli.render` —
read from the wall clock **there and nowhere else** — and `run-status`'s render reads `faceCtx.now`.
Tests inject by calling the render with a `faceCtx` of their own. `run()` is untouched; the input
schema gains **no** `now` (it is a render input, not a command input); the `--json` document is
untouched, so §3 and §4's narrowing stay exactly as minimal as they were; and no other render
changes. This is `22/R2`'s inject-the-clock discipline lifted to the one seam every human render
already passes through, so the next render that needs an instant finds one waiting rather than
inventing a second door.

**Refused, and why.** (a) *An additive `now` key on the document.* It widens precisely the §3/§4
narrowing this ADR exists to keep minimal, and it would put a clock reading in the machine face that
no machine consumer asked for. (b) *A non-enumerable carrier on the result.* A hidden coupling a
reviewer cannot see is worse than the hole it closes. (c) *A `--now` CLI flag.* A test seam on an
operator surface — the shape `53/ADR-005` refuses for `work:loop` and this face should not acquire.

**Consequences.** FF-12603 gains a leg (the render reads `faceCtx.now` and is **total without it** —
figures absent, never `NaN`) plus a one-line structural check that `src/spine/face.mjs` supplies
`now` on the `faceCtx` of **every** render, so the next renderer inherits it. Story 01's write set
gains `src/spine/face.mjs`. And the module-literal leg is vindicated rather than weakened: forbidding
`new Date(` in `run-status.mjs` is exactly what made this hole visible at the contract beat instead
of at an operator's terminal.

---

## ADR-004 — ONE pure decider answers "which declarations should be running on this node now", composed from the store's existing verdicts; supervision is a NINTH declaration key and is OFF by default

**Context.** `STATE.md` names the consequence to get right: the predicate must distinguish **died**
from **stopped for cause**, or the reconciler becomes a crash-loop. That distinction already exists,
has one home, and was exercised on this very failure — `isRetryable` over three reasons,
`shouldRetry` over the attempt ceiling, `retryReadiness` over the park clock, returning five named
states. The predicate's whole job is to *compose* those with `readLoopDeclaration` and ADR-001's
clock; a predicate that tested `failureReason` strings itself would be the fourth derivation of a
classification the store owns.

`SPEC §Out of scope` names the opt-in as possibly-a-story: *auto-resume without one means every
login silently spends tokens re-entering whatever was open when the lid closed.* It is a story, and
the default is OFF.

**Decision.**

1. **One pure decider, in `src/work/loop.mjs`, run records in and rows out.** Signature in shape:
   `decideSupervisedDeclarations({ workspaces, maxAttempts, ceilingMs, stalenessMs, now })`, where
   each workspace carries `{ workspaceId, projectRoot, items: [{ ref, runs }] }`. No filesystem, no
   clock, no store handle, no registered-command import — the module's existing discipline, and the
   reason it can be driven over literal fixtures.
2. **The listing rule, stated once and derived from nothing new.** A declaration (keyed by
   `loopRunId`, recovered by `readLoopDeclaration` over the scope's runs) is **desired** iff its
   latest run in scope is either
   - **live** — `state: "running"` and not stale by the store's own `isStale` (the ONE staleness
     predicate, shared with presence since `23/ADR-002`); or
   - **resumable** — `retryReadiness(record, maxAttempts, nowMs).ready === true` **and** ADR-001's
     accumulated attempt clock still admits the lineage.
   Everything the SPEC asks for falls out without a single new classification: `runtime_offline` and
   `timeout` are retryable ⇒ listed; `session_limit` is `parked` until `resumeAfter` ⇒ listed when
   ready; `needs-input` settles `failed/needs-input`, which is **not** retryable ⇒ never listed
   (`src/commands/drive.mjs:287-312` — and it must never be, which is why this is checked at the
   seam rather than trusted); `agent_error` ⇒ `not-retryable` ⇒ not listed; `attempt >= cap` ⇒
   `attempts-exhausted` ⇒ not listed. A **completed** scope needs no rule at all: its last run is
   `done`, which is not a failure. Neither do `uat-gate`, `dependency-blocked` or `cap-exhausted`,
   all of which halt *after* a successful drive.
3. **`deadline-exhausted` is RECOMPUTED, because nothing persists it.** `grep -rn
   "deadline-exhausted" src/` returns three in-process hits; a halted loop leaves only terminal run
   records behind. §2's clock leg is therefore not a convenience — without it the predicate would
   list a declaration whose next `--resume` halts immediately, and a level-triggered reconciler
   would relaunch it every tick. This is the one place the answer must *decide* rather than read.
4. **The predicate names no failure reason and no run state literal that the store already owns.**
   It calls `isStale`, `retryReadiness` and `readLoopDeclaration`; it does not re-test
   `"runtime_offline"`. `src/commands/run-start.mjs:235-244`'s `reclaimedPrior` test is deliberately
   **not** collapsed into this: it answers a different question (*is this fresh mint actually a
   retry*) and carries an extra `reclaimedAt != null` clause that is policy, not classification.
   Collapsing them would change a shipped path's behaviour for tidiness. Both already route their
   classification through `shouldRetry`, which is the property that keeps them from drifting, and
   that is what FF-12604 asserts rather than a merge.
5. **The opt-in is a NINTH key on the declaration: `supervised`.** Set by `--supervised` on `aof
   work loop`, default `false`, appended LAST — the additive-supersession discipline `102/00` used
   for the eighth key and the run record used to reach sixteen. It is inherited on `--resume` by
   `resolveLoopResume`'s existing rule (explicit flag wins, absent inherits), so supervision behaves
   exactly like level and cap and needs no new grammar.
   **The measured detail that makes this real:** `recoverableDeclaration` (`:1177-1189`) projects
   only **five** keys, so a ninth key that is not added there never survives
   `readLoopDeclaration` — it must be projected as a sixth, defaulting to `false`. `usableDeclaration`'s
   five-key requirement is **not** extended, or every declaration already on disk becomes unusable.
   The eight `brief.loop` records currently on disk therefore read `supervised: false`, which is the
   default this ADR wants, retroactively and for free.
6. **The opt-in is NOT a config allow-list and NOT a registry file.** `53/ADR-004` refuses a sibling
   store for durable loop facts, and "which scopes may auto-resume" is a durable loop fact. A config
   list also outlives its subject — an entry for a scope finished three weeks ago still says
   `resume me` — whereas a declaration key lives exactly as long as the declaration.
7. **This is what `reclaimed` gains: a consumer.** The reclaim path is unchanged — the dual-staleness
   decision stays where it is, `transitionRunReclaimed` stays the one edge — and the predicate reads
   the `failed`/`runtime_offline` record it writes. 124's thesis, applied to the fourth return path.

**Alternatives.** (a) *Ask `work:next` whether the scope is complete.* Refused twice over: it is a
registered command, and importing one from another module closes the registry TDZ ring (TECH_DEBT
item **26**); and §2 shows the question is unnecessary. (b) *A `kind: service|job` field on each
row.* Refused by `STATE.md` before this document existed, and correctly — re-answering the question
every tick dissolves the lifetime problem. (c) *Auto-resume everything that is resumable.* Refused
by `SPEC §Out of scope`: every login would silently spend tokens. (d) *Put the predicate under
`src/work-trigger/`.* Refused — that family is 63's, its invariants are asserted over exactly those
paths, and this is the loop's own decider.

### AMENDED at the contract beat, 2026-09-08 — §2's listing rule missed the DIED loop, which is the milestone's own case

QA found this on 126/02 and it is a Blocker against the framing itself. §2's live branch required
`running` **AND not stale**, and its resumable branch requires `retryReadiness(...).ready`. But a
`running` record has `failureReason: null`, so `isRetryable(null)` is false and `retryReadiness`
answers **`not-retryable`** (`src/run-store.mjs:429-430`). A loop that died with the machine leaves
exactly that record — `running`, stale, unreclaimed until something sweeps — so under §2 as written
**the predicate would never have listed the very record this milestone was framed on**, and the
supervisor would never restart what died. FF-12604's fixture already said *live-stale ⇒ listed*: the
register knew better than the prose, which is the argument for writing the register first.

**The ruling — a stale `running` record IS the died runtime.** `isStale` is the ONE staleness
predicate (`src/run-store.mjs:1022`, shared with presence since `23/ADR-002`) and a stale `running`
record is precisely the verdict reclaim would write, not yet written. §2's listing rule is therefore
three branches, not two. A declaration is desired iff its latest run in scope is:

- **(a) `running` and FRESH** — alive. Listed, so a hand-driven scope draws one `duplicate-run` and
  the hold `ADR-006`'s contract-beat note §1 places, never a second driver.
- **(b) `running` and STALE** — died. Listed, subject to the clock.
- **(c) `retryReadiness(record, maxAttempts, nowMs).ready === true`** — resumable. Listed, subject to
  the clock.

**The clock leg applies to (b) and (c) alike**, so the stale-running × exhausted-clock cell is **not
listed** — a died loop with no compute budget left is still a human's problem, not a relaunch. §4's
no-literals discipline is unaffected: (b) is `isStale` plus the state the record already carries, not
a failure-reason string. FF-12604's class list gains both cells: stale-running listed,
stale-running-over-ceiling not listed.

### AMENDED at the contract beat, 2026-09-08 (126/02 feasibility) — the predicate cannot tell RUNNING from SETTLED, and the STORE is where that vocabulary lives

The amendment above rules that a stale `running` record is the died runtime. The predicate cannot
implement it. `retryReadiness` over a `running` record answers **`not-retryable`**
(`src/run-store.mjs:429-430` — `failureReason` is `null`, so `isRetryable(null)` is false), which is
byte-identical to its answer for an `agent_error`; and §4 forbids the decider a run-state literal of
its own, precisely so it cannot grow a fourth derivation of the store's vocabulary. So the decider
had no admissible way to ask the question its own listing rule turns on.

**The ruling: `src/run-store.mjs` gains ONE additive pure export, `isRunning(record)`, beside
`isStale`** — the store owns the run-state vocabulary, and the fix is to have it *say* what it
already knows rather than to have a consumer guess. It is handed into the decider on its input bag
alongside `isStale` and `retryReadiness`, so §4's no-literals discipline is not merely preserved but
made satisfiable. FF-12604's "asserted by call" list is therefore four: **`isRunning`, `isStale`,
`retryReadiness`, `readLoopDeclaration`.**

**Consequences, both of which are re-pins rather than new freedoms.**

1. **`53/FF-5307` leg 2's byte-pin of `src/commands/run-status.mjs`'s sibling, `src/run-store.mjs`
   (`a282af92…`), is re-pinned in 126/02's diff with the reason written beside it** — the same act
   126/01 performs for the renderer, and the same narrowing: the record's **SHAPE** (16 keys) and the
   **5-edge machine** stay frozen and are asserted, while the file's bytes move by one export. An
   unpinned file is covered by no byte-freeze at all (`55/VERIFICATION` F-55-02-1), so the entry is
   updated, never dropped.
2. **`test/support/work-loop-story-fixtures.mjs:129-157` carries the golden EIGHT-key
   `buildLoopDeclaration` expectation** — 102/00's own additive-claim-made-executable — and it is
   imported by **seven** suites (`grep -rln "work-loop-story-fixtures" test/ | wc -l` → 7). The ninth
   key (ADR-004 §5) lands there, once, in the same discipline the eighth used. Story 02's write set
   gains both files.

---

## ADR-005 — The answer rides the ONE data command as an additive `declarations` key, behind a flag on that same verb; each row carries an argv composed at one home and its own `cwd`

**Context.** `36/ADR-004` §2 is the constraint: fleet data is read through **exactly one** aof
command, `mesh status --json`, never a second data-bearing verb and never a direct read of aof's
on-disk store — and `acd-desktop-single-data-path` enforces it. `mesh:status` is already the house
example of additive growth: `boards` (m25) and `isControlNode` (m27) were both appended to a frozen
`{ nodes }` shape, and the Rust deserialiser ignores unknown keys with `#[serde(default)]` as its
idiom for one that is optional.

The honest problem is cost. The declarations answer is the first **node-wide, disk-walking** read
`mesh:status` would perform — `boardsProjection` reads only the registry. Measured over this stream:
**167.3 ms** (410 items, 105 run records, 8 carrying `brief.loop`). At the supervisor's existing 3 s
cadence that is ~5.6% of a core, forever, and it grows with the stream — paid by every caller of
`mesh status`, including the fleet UI and the board, none of which read the key.

**Decision.**

1. **`declarations` is an additive key on `mesh:status`'s result, emitted only under a new
   `--declarations` flag on that same verb.** One command, one document family, one data path; the
   flagless document stays **byte-identical**, which is what protects the board, the fleet UI and
   `acd-mesh-command-cli-bijection` (whose `argsFor("status")` spawns `["mesh","status","--json"]`
   and needs no edit). A flag on the one admitted verb is not a second data path; a second verb
   would be, and that is what the control forbids.
2. **The cadence is ONE loop and ONE interval; the flag rides every Nth tick.** The Rust poll keeps
   its single 3 s `POLL_INTERVAL` and its single `mesh status --json` spawn, and passes
   `--declarations` on every tenth tick (30 s). One poll, one command, two freshnesses — the fleet
   view keeps its 3 s refresh and the reconcile costs **167 ms / 30 s ≈ 0.6% of a core**. A
   reconcile that is 30 s late is a reconcile; a fleet view that is 30 s late is a stale UI, which
   is why the two are not simply both slowed.
3. **A row carries what the supervisor needs and nothing it must interpret**: an id (the
   `loopRunId`), a human label, the argv, the `cwd`, and the declaration's own scope/level/cap for
   display. No policy, no reason, no state machine — the supervisor never learns what a loop is.
4. **The argv has ONE home, and it is a new pure leaf.** `argvFor`/`loopInputOf`/`LEVEL_FLAG` live
   inside `src/commands/trigger.mjs` (`:209-222`), a **registered command module** — importing it
   from `identity.mjs` closes the registry ring (TECH_DEBT item **26**). They move to a zero-import
   leaf beside `src/loop-bounds.mjs` (30 dependents, 0 imports — the precedent for exactly this
   shape), gaining a `RESUME_FLAG` spelled once; `trigger.mjs` and the declarations producer both
   import it. The row's argv is `["work","loop",<scope>,"--level",<level>,"--resume"]`, derived from
   the declaration, never assembled a second time. `63`'s controls follow the composer to its new
   home in the same diff; the trigger family's own invariants (no spawn, no write, no timer) are
   untouched, because a pure argv composer does none of those things.
5. **`cwd` is the workspace's own `projectRoot`, from its descriptor — and this is TECH_DEBT item
   4's fix stated at the one place it bites.** The supervisor's spawns set no `current_dir` today
   and would inherit the app's, which for a login-autostarted supervisor is exactly the
   `C:\WINDOWS\system32` shape item 4 measured. A declaration that carries its own `cwd` means
   identity comes from that workspace's own pinned `mesh.workspaceId` (this repo:
   `9db1fd84f5895e38`), never from the supervisor's launch directory. Item 4 is **not** re-fixed
   here — it is honoured at the new spawn and reported as a preflight check by ADR-007 §4.
6. **The workspace set is `resolveNodeWorkspaces(nodeId)`, and its LOUD SKIPS are carried, not
   swallowed.** That function already returns `{ ok, workspaces, skipped }` where `skipped` names
   each `no-descriptor` / `workdir-missing` / `not-a-directory` row precisely so a zero-workspace
   answer cannot masquerade as "nothing to do". The `declarations` key carries that list verbatim.
   When the node has no membership rows at all, the command's own `ctx.workspace` is the single
   member — the standalone case, stated rather than left to produce a silent empty answer.
7. **`mesh serve --serve` and `mesh ui` do NOT come from the answer.** `SPEC §Scope` asks for the
   supervised set to be supplied by aof rather than by a `match`, and §1 of ADR-006 delivers exactly
   that for **declarations**; the two mesh daemons stay where `36/ADR-002` put them, for one
   measured reason: **`mesh status` is itself one of the supervisor's spawns.** A supervised set that
   included the process the set is read through has a bootstrap with no base case — and on a node
   whose control daemon is down, the answer that would restart it cannot be obtained. The role latch
   is the base case and it stays. The generalisation this milestone actually needs is that the
   supervised set is a *map* rather than two fields (ADR-006 §2); the two daemons are simply its two
   statically-seeded members.
8. **Disk is the authority.** The producer reads run records through `readRuns`, never the
   worker-streamed projection: TECH_DEBT item **19** measures a cached run row that read `running`
   for two days after its run finished, and a reconciler fed that row would never stop relaunching.

**Alternatives.** (a) *A new command, `aof work declarations --json`.* Refused by `36/ADR-004` §2
and its control: it is a second data-bearing verb, and the app would have two spawns where the whole
milestone-36 discipline is that it has one. (b) *Compute the key unconditionally.* Refused on the
measurement in §2 — every unrelated caller would pay 167 ms and rising for a key it does not read.
(c) *A second Rust poll loop at a slower cadence.* Refused: `36/ADR-004`'s "no second cadence" is
about exactly this, and §2 gets the same effect from one interval. (d) *Have the supervisor read
`.aof/` directly.* Refused — it is the direct-store read `acd-desktop-single-data-path` forbids by
regex, and rightly.

### AMENDED at the contract beat, 2026-09-08 — §6's workspace resolver has a FOURTH outcome, and it is not "no workspaces"

`resolveNodeWorkspaces` returns `{ ok: false, workspaces: [], skipped: [] }` on **two** paths — the
store failing to open (`src/mesh/presence.mjs:198`) and a query throwing (`:236`) — and that is
byte-identical to `ok: true` with zero membership rows unless the caller reads `ok`. §6 as written
would have collapsed *"the resolver could not answer"* into *"this node has no workspaces"*, and then
applied the standalone fallback to it — inventing a single-workspace answer out of a store failure.

**The ruling: the key is `{ ok, rows, skipped }`.** `ok: false` means the resolver did not answer:
`rows` is empty, the **standalone fallback does NOT apply**, and the supervisor changes nothing that
tick — an unreadable store must never read as "stop everything". The standalone fallback (the
command's own `ctx.workspace` as the single member) applies **only** to `ok: true` with zero
workspaces, which is the genuine one-checkout case. `skipped` continues to carry the resolver's own
LOUD-skip rows verbatim. FF-12605 gains a leg: an unreadable store is **reported**, never read as an
empty node, and never silently replaced by the local workspace.

### AMENDED at the contract beat, 2026-09-08 (126/02 feasibility) — the argv leaf imports NOTHING, and `RESOLVED_TRIGGER_KEYS` does not move

§4 said "a zero-import leaf beside `src/loop-bounds.mjs`" and meant it loosely. Made exact, because
the composer is **leaving 63's family** and with it the sweeps that hold that family's absences
(`FF-6301`'s no-spawn/no-phase/no-gate, `FF-6303`'s no-timer/no-write): the leaf carries **no
`import` of any kind — not a project module and not a `node:` builtin** — which is
`src/loop-bounds.mjs`'s shape exactly (`grep -c "^import \|require(" src/loop-bounds.mjs` → `0`,
30 dependents). A module that imports nothing cannot spawn, cannot write, cannot read a clock and
cannot open a socket, so the four invariants the composer is leaving behind become **structural
rather than swept** — a strictly stronger position than the one it left.

**And `RESOLVED_TRIGGER_KEYS` does NOT move.** It is the trigger ROW's four-key face contract
(`trigger, scope, level, argv`), asserted exhaustively by
`acd-trigger-is-a-caller-not-a-coordinator`, and it is not a loop input. Only `argvFor`,
`loopInputOf` and `LEVEL_FLAG` move, joined by the new `RESUME_FLAG`. §4's list is already correct on
this point and is confirmed rather than corrected, because "the argv has one home" is the kind of
sentence a builder can read as licence to move the whole neighbourhood.

---

## ADR-006 — The Rust supervisor reconciles a SUPPLIED set against actual, level-triggered; the engine is reused verbatim and no completion semantics cross into Rust

**Context.** The substrate is already the right shape and 286 + 580 lines of it are already written:
`SupervisedChild { label, argv }`, `CleanExitReason::classify`, `LocalProcessState`, `transition`,
`jittered_backoff_ms`, the Job Object, `supervise_child`'s spawn/wait/kill loop, `handle_exit`'s
crash-vs-clean classification, and the role latch's property that *a manual Stop is never overridden
by the next poll*. Exactly three things are hard-wired: `supervision_set`'s `match` on
`is_control_node`, `SupervisorState`'s two fixed signal fields, and `engine_main`'s two named
controllers.

**Decision.**

1. **`SupervisedChild` becomes owned and carries a working directory.** `label: String`, `argv:
   Vec<String>`, `cwd: Option<PathBuf>`, plus an `id: String` — the `Declaration`. The two mesh
   daemons keep their constructors, now returning owned values with `cwd: None`. `supervision_set`
   is superseded by a function that takes the two statically-seeded members **plus** the rows parsed
   from the poll (`36/ADR-002` decision 1, superseded in the open — see ADR-005 §7 for why the two
   daemons are not themselves supplied).
2. **`SupervisorState`'s two fixed signals become a map keyed by declaration id**, with the two
   daemons holding reserved ids so `server_signal`/`ui_signal` become accessors over that map rather
   than fields. The six consumers are named and all live in one file: `main.rs:103-106` (the IPC
   view-model), `:146` and `:435` (the UI-running gate for the window URL), `:224-225` (the tray's
   `ServerState`/`UiState`), `:289` (the local-signal ramp), `:422` (the tray label). No consumer
   learns about declarations; each keeps asking for the id it already asks for.
3. **Controllers are created and retired by the reconcile, not by `engine_main`.** Each tick's row
   set is compared with the live controller map: a new id spawns a `ChildController` +
   `supervise_child` task; an id that vanishes has its `desired` flipped false, which the existing
   `WaitResult::Stop` path already turns into a kill. `engine_main` stops hard-wiring the loop
   children; the IPC Start/Stop commands become id-addressed.
4. **NO completion semantics in Rust.** A loop that exits 0 is already handled correctly by
   `handle_exit` — `success ⇒ desired = false, "stopped"` — and the row simply does not appear next
   tick, so nothing relaunches it. If it *does* appear next tick, it is because aof says it should
   be running, and starting it is right. This is the whole of the reconciler's contract: **make
   actual match declared.** No `kind`, no exit-code policy, no scope knowledge.
5. **Operator Start/Stop is a HOLD the poll never overrides — the role latch's property,
   generalised.** Each controller keeps a `held` flag (today's `role_started`); once the operator has
   spoken for a declaration, the reconcile stops driving that controller's `desired` and only
   removes it when the row disappears. This is the existing invariant, given a name and a map.
6. **`CleanExitReason` gains a FOURTH named clean exit: `duplicate-run`.** Measured hazard: the run
   store refuses a second non-terminal run per item with `duplicate-run` (409,
   `src/run-store.mjs:589-593` — the anti-loop backstop), so a supervised loop launched while an
   operator is already driving that scope in a terminal exits **non-zero** and is classified as a
   genuine crash — a backoff loop against a correct refusal. It is exactly the shape of the three
   existing named clean exits and is handled identically: surface it, do not restart-storm.
7. **A halted supervised loop becomes visible through `last_clean_exit`, and that requires one
   argued change.** Today `last_clean_exit` is populated only for a named clean exit-1; an exit-0
   child surfaces nothing (`handle_exit`, `:493-521`). A loop that halts prints its stop id, ref and
   exact resume command and exits **0** — the most important sentence the operator can receive, and
   currently the one place it would vanish. `handle_exit`'s success branch therefore surfaces the
   child's **last output line** through the same field. `read_tail`'s bounded 8 KiB buffer already
   captures it; nothing new is read.
8. **The spawn roster becomes an ALLOW-LIST, which is an argued extension of an existing control,
   not a new one.** `36/ADR-004` §3 states the allow-list of spawnable verbs is exactly
   `{status, serve, ui}`, but `acd-desktop-read-only-fleet` implements a **deny**-list of five mesh
   mutation verbs — so a `["work","loop",…]` spawn passes today by silence rather than by decision.
   That is not good enough for a spawn that drives agents and writes files. The control is
   **extended** (same claim, same home — never a sibling) to a named roster: `mesh status`, `mesh
   serve`, `mesh ui`, `work loop`, and nothing else, with `work loop` admitted here, in writing, as
   local process supervision on this machine. The other three desktop controls
   (`no-mesh-logic`, `single-data-path`, `trusted-spawn`) are unchanged and are depended upon, not
   restated — every declaration spawn still resolves the absolute co-located `aof` path and passes a
   shell-less argv.

**Where the Rust tests can live, measured.** `scripts/test.mjs:183-215` runs `cargo test` over
`app/desktop/Cargo.toml` — whose workspace **excludes `crates/app`** — and only `cargo check` over
the shell crate. So a Rust unit test in `supervisor.rs` would never run. The reconcile decision is
therefore extracted into `crates/core` as a pure function (row set + live set ⇒ start/stop/retain
plan) with its `#[cfg(test)]` beside `supervision.rs`'s existing tests, and the shell keeps only the
spawning. That is the same core/shell split `36/ADR-002` already drew, applied to the one new
decision.

**Alternatives.** (a) *Restart-on-exit with a completion signal from aof.* Refused by `STATE.md`:
re-answering the question every tick is what makes the lifetime field unnecessary. (b) *Keep two
fixed signals and add a third for "loops".* Refused — it is the `match` again, one level down. (c)
*Let the supervisor read the run store to decide.* Refused by `acd-desktop-no-mesh-logic` and by the
whole supervise-don't-reimplement discipline. (d) *A new control for the spawn roster.* Refused —
the claim is `read-only-fleet`'s own; a sibling control asserting an overlapping allow-list is the
species this tree keeps refusing.

**At the contract beat (126/03, 2026-09-08) — three rulings that resolve §6 and §7 without moving a
decision.** Recorded here so the ADR and the contract agree rather than diverging quietly.

1. **A named clean exit places the SAME hold an operator Stop places** (§5's `held` flag): released
   when the row disappears, lifted by an explicit Start. Without it, `duplicate-run` against a scope
   someone is driving by hand is re-attempted every poll — the row persists, so a plain
   `desired = false` is re-asserted true on the next tick, which is a 30-second retry loop against a
   *correct* refusal. The hold is what makes §6 actually mean "surface it, do not restart-storm".
2. **`duplicate-run` is classified on the store's MESSAGE, not its code** — `a non-terminal run
   already exists for this item` (`src/run-store.mjs:593`) — because the code token never reaches a
   non-`--json` child's output: `bin/aof.mjs:5` prints `error.message` alone. That is the same basis
   the three existing named clean exits already use (`CleanExitReason::classify` matches on the
   emitted message), so this is the existing mechanism reused, not a new one — and it is the reason
   §6 could be a fourth enum member rather than a new channel.
3. **The notice lives in the desktop WINDOW FOOTER, never the tray menu, and is cleared per child.**
   `SupervisorState.last_clean_exit` → `get_view_model`'s `notice` (`app/desktop/crates/app/src/main.rs:75`,
   `:106`) → `app/desktop/ui/app.js:336`, where it already overrides the footer text. §7's exit-0
   tail therefore surfaces a halted supervised loop's last line — its stop id, ref and exact
   `--resume` command — in the one place an operator is already reading, with no new UI surface. The
   clear-on-restart behaviour at `supervisor.rs:432` becomes per-declaration rather than global.
4. **The two seeded daemons are spawned with `current_dir` = the resolved install dir.** Today
   `supervise_child` sets no `current_dir` at all (`app/desktop/crates/app/src/supervisor.rs:408-414`),
   so a login-autostarted supervisor would hand `mesh serve --serve` and `mesh ui` the app's own
   non-workspace logon cwd — the hazard `ADR-007`'s amended alternative (c) names. One line beside
   the spawn restores what `aof mesh desktop run` effectively gave them. Declaration children are
   unaffected: they carry their own `cwd` from the row (`ADR-005` §5). Recorded here rather than
   edited into §1, because an ADR's decision text is append-only and this is the beat that ruled it.
5. **§8's source roster gains a RUNTIME half, because a sweep cannot see a SUPPLIED argv.** The
   allow-list in §8 reads the Rust source; a declaration's argv arrives at runtime, in a document
   this node's own aof produced. So the parse in `crates/core` **drops any `declarations.rows` entry
   whose argv does not begin `["work", "loop"]`** — a gate deliberately **NARROWER** than the
   four-verb source roster, because a supplied row must never be able to spawn `mesh serve`,
   `mesh ui` or `mesh status` however the producer is compromised or wrong. Built the `boards` way
   and not a second derived struct: `#[serde(default)] Vec<serde_json::Value>` on `MeshStatus` plus
   ONE filtering accessor in the `session_line_parts` shape (`app/desktop/crates/core/src/status.rs:157-169`),
   so an **ill-typed row drops that row and the document survives** — the same absence-is-benign
   posture `#[serde(default)] boards` already has, and the reason a malformed declaration can never
   blind the fleet view riding the same poll.
6. **`SpawnForm` gains ONE additive field: `cwd: Option<PathBuf>`**
   (`app/desktop/crates/core/src/resolve.rs:119-123`), which is how a declaration's working
   directory (`ADR-005` §5) reaches the spawn without a second form.
   `form_mesh_status_spawn` (`:129-134`) sets `None`, so the existing spawn is byte-identical and
   the trusted-spawn surface is unmoved — program stays the resolved absolute path, args stay a
   plain vector, no shell string anywhere. Story 03's write set therefore gains
   `app/desktop/crates/core/src/resolve.rs`.

---

## ADR-007 — `aof mesh desktop install --autostart` writes ONE `HKCU\…\Run` entry through an injected runner; the verbs REPORT a preflight rather than repairing one; a Windows service is refused on the measured basis

**Context.** `SPEC §Scope` calls the installer *"the one place the daemon environment is fixed rather
than fought"* and `§Out of scope` refuses a Windows service on a measured basis: session 0 has no
login session, so `claude` is unauthenticated — the failure that burned the Mac worker's runs over
SSH, and the reason `CLAUDE.md` says never to start a daemon over SSH. Login autostart is the
correct shape because it is the only one that keeps agent sessions authentic. The surface is present
and ordinary: `HKCU\Software\Microsoft\Windows\CurrentVersion\Run` holds **10** `REG_SZ` entries on
this machine, each a program launched in the user's own logon session.

`src/commands/mesh/desktop.mjs` already has the shape this needs: `install` stages-then-swaps into
`~/.aof/bin`, `run` spawns detached through an injected `spawnFn`, and `stop` drives both its list
and its kill through injected `listFn`/`killFn` with a `--dry-run` — because the CLI bijection gate
spawns every registered mesh verb with `--json` and a machine-wide act must never be performed by a
probe (TECH_DEBT item **20**'s third lesson, which any new machine-wide verb inherits).

**Decision.**

1. **`--autostart` / `--no-autostart` are flags on the EXISTING `install` verb**, not a fifth verb.
   The act is part of installing; a separate `aof mesh desktop autostart` would be a second door to
   one act. `--autostart` writes one `REG_SZ` value naming the installed `aof-mesh-desktop.exe` by
   its absolute path in the resolved install dir; `--no-autostart` removes it. Both are
   **idempotent** — writing the value it already holds and deleting an absent value are both
   successes, so a deploy script runs either unconditionally (item 20's "already stopped is a
   SUCCESS" rule, adopted).
2. **The registry is reached through ONE injected runner**, exactly as `stop` reaches `tasklist` /
   `taskkill` — so the suites drive parse and decision over a fake and nothing in CI touches the
   real hive. The verb declares `--dry-run` for the same reason `stop` does, and for the same
   measured cause: the bijection gate spawns it.
3. **Platform is a seam with a CODED refusal, never a silent no-op.** The Tauri app ships
   Windows-only (`36/ADR-001`), so `--autostart` off Windows refuses with
   `autostart-unsupported-platform` and names the platform. A silent success on Linux would be the
   worst outcome available: an operator would believe their machine resumes work at login.
4. **A PREFLIGHT the `install` and `run` verbs REPORT — three checks, none of which repairs
   anything.** (a) `claude` resolves **and** `claude auth status` reports authenticated — the probe
   that costs no tokens and catches the exact failure this milestone exists to prevent; (b) the
   installed payload's build id, read the way the deploy rules already say to read it; (c) every
   workspace registered to this node carries its own pinned `mesh.workspaceId`. Check (c) is
   TECH_DEBT item **4** stated as a check, not re-fixed here — the fix at the spawn is ADR-005 §5,
   and this is the report that says whether a workspace is still cwd-derived. Each check reports
   pass/fail with a code; none of them writes.
5. **A Windows service is REFUSED, with the SPEC's reason recorded here so it is not re-proposed.**
   A service runs in session 0. `claude` there is unauthenticated. Every supervised loop would start
   and die on auth, burning a run record per attempt — which is precisely the failure mode ADR-006's
   backoff would read as a flapping child. There is no configuration of a service that fixes this;
   the login session is the requirement.
6. **`scripts/install-local.mjs` remains the DEV deploy and gains nothing.** It is a payload
   file-copy for this checkout; `aof mesh desktop install --autostart` is the operator-facing act on
   an installed tree. Two tools, two audiences, no overlap — and the rule that `--sea` is only for
   the launcher bootstrap or a release artefact is untouched.

**Alternatives.** (a) *`tauri-plugin-autostart`.* Rejected: it is not a dependency today
(`grep -n autostart app/desktop/crates/app/Cargo.toml` → none), it would put the decision in the
Rust shell where nothing else about installation lives, and the act is one registry value the CLI
can own with an injected runner and full test coverage. (b) *A Start-Menu Startup shortcut.*
Rejected — a `.lnk` in a user folder is harder to make idempotent and harder to verify than a named
registry value. (c) *Task Scheduler at logon.* Rejected on the measurement TECH_DEBT item 4 already
recorded: Task Scheduler's default cwd is `C:\WINDOWS\system32`, which is how a daemon once
published a system directory as a fleet workspace. (d) *A separate `aof mesh desktop preflight`
verb.* Rejected: a check nobody runs is prose; reporting it from the two verbs an operator already
runs is what makes it arrive.

### AMENDED at the contract beat, 2026-09-08 — `--dry-run`'s scope, the flag conflict, the value name, and the measured `claude auth status` contract

Four rulings from 126/04's contract beat, and one weakening of an alternative that is better named
than left standing.

1. **`--dry-run` is NEW on `install` and covers the WHOLE verb** — no placement, no registry write —
   and its render names both what would be installed and what would be written. `stop`'s rule
   generalised (*a probe never performs the act it names*), and the reason is the same measured one:
   `acd-mesh-command-cli-bijection` spawns every registered mesh subcommand with `--json`.
2. **`--autostart` and `--no-autostart` together is the coded refusal `autostart-flags-conflict`,
   raised before any act.** Measured basis: `parseSpecArgv` (`src/spine/face.mjs:47-79`) has **no
   `--no-` negation** — a boolean flag simply sets `options[key] = true`, and `--no-autostart`
   camelCases to `noAutostart`, which must therefore be its own declared boolean. Nothing downstream
   resolves the contradiction, so the verb must, loudly, rather than letting flag order decide.
3. **The registry value NAME is `aof-mesh-desktop`**, spelled once.
4. **`--no-autostart` off Windows refuses exactly like `--autostart`** — §3's coded
   `autostart-unsupported-platform` beats "removal runs unconditionally". A remove that silently
   succeeds on a platform that never had an entry is the same lie in the other direction.
5. **The `claude auth status` contract, measured** (`claude auth status`, this machine, 2026-09-08):
   it prints **JSON by default** (`--help` declares `--json` as the default and `--text` as the
   alternative), carries a top-level **`loggedIn: true|false`**, and exits **0**. So §4's
   `claude-authenticated` check parses `loggedIn` — the exit code is **not** the signal, which is the
   trap an obvious implementation would fall into.

**And alternative (c) is weaker than this ADR stated.** It rejected Task Scheduler partly on its
`C:\WINDOWS\system32` default cwd — but a `HKCU\…\Run` entry launches the app with the **same
non-workspace cwd at logon**. The hazard is *shared*, not avoided, and it is survivable for three
reasons worth naming rather than assuming: the **declaration** spawns are safe by construction
(`ADR-005` §5 gives each its own `cwd`); the existing `mesh-workspace-unconfigured` gate
(`src/global-work-publisher.mjs:38`, TECH_DEBT item 4, 2026-07-26) refuses publishing from a
non-workspace cwd, which is what stopped a system directory becoming a fleet workspace before; and
126/03 pins the two seeded daemons' `current_dir` to the resolved install dir — one line beside the
spawn, restoring the cwd `aof mesh desktop run` effectively gave them from `~/.aof/bin`. (c) stands
as a rejection; its stated reason is corrected here rather than left overclaiming.

### AMENDED at `126/06`'s post-hoc review, 2026-09-10 — the preflight is FOUR checks, it lives in its own module, and each of the six rulings below repairs something it shipped without

`126/06` appended a fourth check and was accepted before any review ran (`F-36`). The structural and
behavioural reviews were run after the fact; these are their rulings, and each replaces something
this ADR's §4 asserted and the code did not do.

1. **The preflight is FOUR checks, and it has its own module.** §4 above says "three"; the fourth is
   `heartbeat-hook-installed` — every workspace on this node registers the `claude-run-heartbeat`
   hook and the file that registration names is on disk. `126/04 task03`'s delivered scenarios say
   "exactly three" and are not edited: they remain the record of what `126/04` shipped, and this
   section is where the count moves. The whole preflight now lives in
   `src/commands/mesh/desktop-preflight.mjs` rather than in the command module that prints it:
   `desktop.mjs` went 587 → 1,053 → 1,167 lines in one milestone because a cross-cutting concern
   kept landing in the file with a verb attached to it, and the split is also what turns
   `FF-12607`'s "the preflight writes nothing on any path" sweep into a statement about a **whole
   file**. It had been a hand-kept list of five function headers; `126/06` added four more functions
   and did not add them to the list, so a quarter of the preflight sat outside the sweep with
   nothing to say so. `defaultRunner` moves with it — one spawn seam, imported by the autostart act
   and the process discovery rather than copied.

2. **A check answers from what it FOUND, not from constants beside it.** `126/06` hardcoded both the
   hook's file path and, implicitly, its event. Both are re-spellings of facts with one home
   (`ADR-008` §1, this milestone's own rule, violated three times in one function): the marker is
   `AOF_HOOK_MARKER`, the settings path is `CLAUDE_SETTINGS_RELPATH`, and the hook's declaration —
   the event it fires on — comes through `claudeHookDeclarations`, the ONE resolver
   (`43/ADR-013/C1`) for which claude hooks aof installs. The FILE comes from the registration found
   on disk, because `markedEntry` writes it into the entry's `args` and the harness resolves it
   through `${CLAUDE_PROJECT_DIR}`. A constant instead false-**FAILS** an overridden declaration —
   a supported path, since a project hook of the same id wins — and false-**PASSES** a stale
   canonical file sitting beside a missing registered one.

3. **A registration is a marker under the event that dispatches it, not a marker anywhere in the
   document.** `126/06` walked the whole settings document for the `aofManaged` value, so a marker
   parked under a key the harness never reads — an operator's disabled shelf, or simply the wrong
   event — reported `pass`. That is the failure this check exists to prevent, one level up from the
   one it was written for. The nesting BELOW an event is still walked rather than spelled, which was
   `126/06`'s own reason and still holds: `spliceSettings` groups entries under
   `hooks[event][].hooks[]`, and that grouping is the bundle's business.

4. **The report is BOUNDED, its remedy is scoped to the class it fixes, and it fails closed at the
   verb.** Three defects with one shape — a report an operator cannot act on:
   - The offender list was joined verbatim. Measured 33,030 characters for 300 workspaces. `F-28`'s
     lesson had been applied to the *skip* list, not to the list that actually explodes. Offenders
     are now named until a stated budget is spent, then counted.
   - `aof work update` was offered for every fault, including the three transient temp-launcher
     roots on this node whose settings will never be readable — a permanently red check with an
     inapplicable instruction. The unreadable class is now reported separately, without it.
   - "Fails closed" was one call wide: only `settingsFn` was wrapped, so a throw from the
     registration search or an injected probe escaped `runPreflight` into the face. On
     `mesh:desktop-run` that lands **after** the app is spawned detached, enveloping a launch that
     succeeded as a refusal. Every check now runs inside one guard.

5. **The node's workspaces are resolved ONCE, and the seams are forwarded by construction.**
   `resolveNodeWorkspaces` ran twice per preflight — 334 rows enumerated twice, the store opened,
   `mkdir`ed and migrated twice — on a verb this ADR says writes nothing on any path. One resolve
   fixes the cost, the write, and the third thing nobody had named: two checks free to see two
   different workspace sets. Separately, `126/06` added two injected seams and forwarded them from
   **neither** face, so on the only path an operator or the bijection gate takes both reads hit the
   real filesystem while two suites passed those keys believing they injected. Both verbs now
   forward `PREFLIGHT_SEAMS`, one list, asserted equal to what `runPreflight` actually reads.

6. **ALL SKIPPED is not the same fact as NONE REGISTERED.** A node whose registered workspaces were
   every one skipped reported `pass — No workspace is registered to this node`. Untrue, and the live
   path: this node carries **327** skips (`F-28`). §4's "a check that cannot answer reports `fail`"
   governs — nothing was checked, so nothing can be vouched for. Genuinely none stays a pass, which
   is `126/06`'s own delivered criterion and a different condition.


---

## ADR-008 — The `node:sqlite` ExperimentalWarning is filtered at ONE home both callers use, by a targeted `emitWarning` wrap restored in `finally` — never a blanket flag

**Context.** Two modules import `node:sqlite`, and each carries its own `resolveSqlite` body:
`src/effects/journal.mjs:41-50` and `src/global-work-store.mjs:152-171` (`grep -rn
'import("node:sqlite")' src/` → exactly 2). The warning they emit is the first and often only thing
an operator sees from a multi-hour loop. `SPEC §Scope` forbids a blanket suppression, correctly:
`--no-warnings` and `--disable-warning=ExperimentalWarning` also hide the deprecations this repo
wants.

**Measured, not assumed** (scratchpad `warn-probe.mjs`, `node v22.22.2`). Wrapping
`process.emitWarning` around the `await import("node:sqlite")` and swallowing only
`type === "ExperimentalWarning" && /SQLite/.test(message)`: **swallowed 1**, `DatabaseSync` present,
`emitWarning` restored. A **second** import in the same process emits **0** — Node emits it once per
process. A different `ExperimentalWarning` raised afterwards still prints, so the filter is targeted
rather than a mute. The unfiltered control prints `(node:PID) ExperimentalWarning: SQLite is an
experimental feature and might change at any time`.

**Decision.**

1. **One home for "import the SQLite runtime", and both callers use it.** A new pure-ish leaf whose
   whole job is: install the targeted `emitWarning` filter, `await import("node:sqlite")`, restore
   the original in `finally`, return the module. Both `resolveSqlite` bodies collapse onto it. This
   is a **subtraction** — two copies of one act become one — and it is the house rule (*extend
   existing surfaces, never add siblings*) applied to the smallest possible subject.
2. **Each caller keeps its OWN refusal.** `global-work-store` throws `sqlite-unavailable` (501) and
   accepts `options.sqlite === false` as a forced-unavailable; `journal` degrades differently. The
   shared leaf resolves the runtime and nothing else; it decides no policy, so neither caller's
   behaviour moves.
3. **The filter is scoped to the import and restored in `finally`.** It is never installed for the
   process lifetime, so an unrelated warning raised during an unrelated await can never be
   swallowed, and a throwing import still restores.
4. **No `--no-warnings`, no `NODE_NO_WARNINGS`, no `--disable-warning`, no `NODE_OPTIONS` edit,
   in any launcher, script, hook or bundled command.** Asserted as a leg of FF-12608, because the
   cheap fix is one line away at all times and it is the wrong one — and the env-var twin is the
   form a flag-only sweep would miss.

**Alternatives.** (a) *`--disable-warning=ExperimentalWarning`.* Refused by `SPEC §Scope` and by
measurement — it works, and it hides everything. (b) *A filter in each of the two modules.* Refused:
two copies of a filter is the shape this milestone's own ledger item 0 names first. (c) *Leave it.*
Refused — it was, measurably, the only output of an eleven-and-a-half-hour session.

**Consequence, measured at the contract beat and raised for TRIAGE at review rather than as a story
deliverable.** The suites cannot currently see this leaf regress. **60 files / 73 sites under
`test/` set `NODE_NO_WARNINGS: "1"` on the CLI child's env, and 3 of them also pass `--no-warnings`
as argv** — `test/integration/support/cli-context.mjs:34,40`,
`test/integration/cli-child-process.test.mjs:87,92` and
`test/arch/command/acd-cli-entry-executes.test.mjs:25,28` (`grep -rln 'NODE_NO_WARNINGS' test/ | wc -l`,
`grep -rn '"--no-warnings"' test/`). So every CLI integration test is blind to the warning by
construction: revert the leaf and not one of them reds. That is why FF-12608's tree-wide leg sweeps
`src/`, `bin/`, `scripts/`, `src/bundle/` and `package.json` — where the count today is **0**
(`grep -rn "NODE_NO_WARNINGS\|no-warnings\|disable-warning" src/ bin/ scripts/ package.json` returns
nothing, so the leg is honest and non-vacuous by absence) — and deliberately **not** `test/`, where
suppressing a child's warnings is a legitimate harness choice this ADR has no business forbidding.
Once the leaf lands, those flags are no longer needed for the SQLite warning; whether to retire them
is a triage question for the reviewing item, not a deliverable of 126/05.

---

## What 126 does NOT do

- **Mesh re-dispatch of a reclaimed assignment to another node.** A reclaimed assignment returning
  to the *local* declaration set is in scope (ADR-004 §2 lists it like any other resumable failure);
  choosing a new worker for it is a distinct concern with its own admission and credential
  questions. Deferred whole, per `SPEC §Out of scope`.
- **A scheduler inside aof.** `63/ADR-003` rules that aof ships **no clock and no receiver** — it
  declares, validates and answers when called. ADR-005 is a read face and ADR-006's Rust poll is the
  caller, which is exactly that ADR's shape rather than an exception to it. Loop policy stays in one
  language.
- **A Windows service.** ADR-007 §5, refused on the measured session-0 basis rather than deferred.
- **A sub-drive progress stream.** ADR-002 §7, deferred with its seam and its governance cost named.
- **Any new persisted key on the run record.** ADR-001 §5. The declaration gains one key (ADR-004
  §5) under the discipline that already grew it from seven to eight.
- **Any change to `src/board-ui.mjs` or `ui/`.** ADR-003 §5.

**The ledger.** `aof work debt` over the twelve files these ADRs touch returns **three** entries,
all re-measured at HEAD and all still live:

- **item 76** (`work.autonomous.maxAttempts` read as two unrelated bounds) — ADR-001 §6 and ADR-004
  §2 both consume the *already-resolved* value the shell holds and read the key no third time.
  Neither worsened nor depended upon.
- **item 91** (the loop's two cap counters, the declared one dead) — untouched by 126, and its
  citation `src/commands/loop.mjs:860` has already gone stale: `nextDecision` is at `:892` with six
  call sites. Worth correcting by that file's single writer in the same pass; the entry stands.
- **item 59** (`work-observe.mjs` mirrors `run-store.readRuns`) — 126 adds no third reader:
  ADR-004's predicate takes run records as **data** and ADR-005's producer reads them through
  `readRuns`, the one home. The entry is neither paid nor worsened.

**Two entries this milestone must cite and one it should not create.** TECH_DEBT item **4** is
honoured at the new spawn (ADR-005 §5) and reported as a check (ADR-007 §4); item **19** is why disk
is the authority for the declarations answer (ADR-005 §8); item **20** supplies the `--dry-run`
constraint any machine-wide verb inherits (ADR-007 §2) and its part (a) — `aof mesh desktop reload`
— stays open and unaddressed here. Item **22** (a failed assignment carries no code) is adjacent but
not on this path: nothing in 126 reads an assignment row. **No new ledger entry is proposed.**
Everything these ADRs found is fixed in its item — and the ledger is at **3,614 lines against a
3,634 ceiling**, so an entry that is not genuinely story-sized would spend the last of the headroom
on something this milestone is already fixing.

---

## Codebase health — what these six stories land in

Measured, not vibed.

**The loop pair is the god-node and it grew again.** `src/commands/loop.mjs` is **2,081 lines with
38 dependents** and `src/work/loop.mjs` **1,223 with 44** — up from 1,975 / 1,120 when 124 measured
them six weeks of work ago, and 124's own uncommitted diff is part of that. 126 adds to both: the
clock summer and the predicate to the engine, the narration seam and one flag to the shell. **The
mitigation is where the new code goes.** Every decision in this milestone is a *pure decider in the
engine* or a *leaf*, and the shell gains call sites rather than logic: ADR-001 §2 (summer), ADR-004
§1 (predicate), ADR-005 §4 (a new zero-import argv leaf), ADR-008 §1 (a new sqlite leaf). Two of
those are net **subtractions** — the argv composer stops being duplicated-in-waiting and the two
`resolveSqlite` bodies become one. That is the honest answer to "does this diff make it better or
worse": the shell grows by call sites and one flag; the derivations shrink by two.

**The desktop crates are small and are about to stop being.** 286 + 96 + 427 + 580 + 506 lines, and
`supervision.rs` has exactly **one** dependent (`supervisor.rs`), which is what makes ADR-006's
generalisation safe to attempt at all. The reconcile decision goes into `crates/core` for a measured
reason, not a stylistic one: `cargo test` never runs `crates/app`.

**The one place I would have ledgered, and did not.** The `mesh:status` command is 530 lines and is
about to grow a node-wide disk walk. It is already the single door for three unrelated projections
(nodes, boards, role). ADR-005 §1's flag is what keeps that growth from being paid by every caller,
and §6's reuse of `resolveNodeWorkspaces` keeps it from becoming a second enumeration strategy. If a
fourth projection arrives, the right move is to split the producer — but naming that as debt today,
before the third one has landed, would be forecasting rather than measuring.

**The ledger's own health, since `aof work debt` reports it.** 74 entries, **3,614 lines against a
3,634 ceiling** — 20 lines of headroom — with **72 of 74 over the 12-line budget** and **28 carrying
no `**Status:**` line at all**, including items 19, 20 and 22, all three of which this document
cites. An entry without a status can never be discharged by anything but a human re-reading the
file. That is a real finding of this review, it belongs to the ledger's single writer, and it is
reported here rather than fixed by an architect editing 28 entries mid-refine. Two stale citations
found in passing and worth the same pass: item 20's `src/commands/mesh-desktop.mjs` and
`test/mesh-desktop-stop.test.mjs` both moved in 119 (`src/commands/mesh/desktop.mjs`,
`test/mesh/desktop/mesh-desktop-stop.test.mjs`), and item 91's `:860` is now `:892`.

---

## Proposed partition

Advisory when it was written; **RATIFIED at the break-down, with one change — the merge in note 1
was taken.** This is the partition the product owner drew, recorded here so the register and the
document agree.

**Six stories. Three are parallel-eligible from day one; three form a chain on the loop god-node.**
The chain is not a preference — `src/commands/loop.mjs` and `src/work/loop.mjs` are declared in
`124/01`'s `files:`, and `SPEC §Dependencies` is right that two writers on those files is the
collision this milestone must not cause.

| # | subject | ADRs | rough write set | depends |
|---|---|---|---|---|
| **00** | **The loop says what it is doing and counts what it did** — a pure lineage summer, `decideScheduleToClose` takes `elapsedMs`, both shell sites re-pointed, `69/02` task 01's criterion superseded; and the `narrate` seam derived from the one printer, the four new in-flight lines, the four existing in-flight lines moved onto it, `--quiet`. | ADR-001, ADR-002 | `src/work/loop.mjs`, `src/commands/loop.mjs`; `test/arch/loop/acd-clock-counts-attempts.test.mjs`, `test/arch/loop/acd-loop-narrates-in-flight.test.mjs` + `test/arch/loop/index.mjs`; `test/work/four-deadlines.test.mjs`; loop suites under `test/loop/` | — |
| **01** | **`run-status` renders what the record holds** — the render gains the record's own facts and a pure elapsed/heartbeat-age derivation; `--json` unchanged; `53/FF-5307` leg 2 re-pinned. | ADR-003 | `src/commands/run-status.mjs`, `src/spine/face.mjs` (the `faceCtx.now` supply — ADR-003, AMENDED), `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs` (re-pin); `test/arch/run/acd-run-status-renders-the-record.test.mjs` + `test/arch/run/index.mjs`; a unit suite under `test/run/` | — |
| **02** | **The declaration predicate and its door** — the pure decider, the ninth `supervised` key + `--supervised`, the argv leaf, and `mesh status --json --declarations`. | ADR-004, ADR-005 | `src/work/loop.mjs`, `src/commands/loop.mjs`, `src/commands/mesh/identity.mjs`, `src/commands/trigger.mjs`, `src/run-store.mjs` (the `isRunning` export + its `53/FF-5307` re-pin), `test/support/work-loop-story-fixtures.mjs` (the golden declaration gains its ninth key), **new** `src/loop-argv.mjs`; `test/arch/loop/acd-declaration-predicate-is-composed.test.mjs`, `test/arch/mesh/acd-declarations-ride-the-one-data-command.test.mjs` + both indexes; `test/arch/loop/acd-trigger-*.test.mjs` (composer follows its home) | `126/00` |
| **03** | **The supervisor reconciles a supplied set** — `Declaration`, the controller map, the reconcile plan in `crates/core`, the fourth clean exit, the exit-0 tail, the id-keyed signals. | ADR-006 | `app/desktop/crates/core/src/{supervision,poll,status,resolve}.rs`, `app/desktop/crates/app/src/{supervisor,main}.rs`; `test/arch/ui/acd-desktop-supervises-a-supplied-set.test.mjs` + `test/arch/ui/index.mjs`; `test/arch/ui/acd-desktop-read-only-fleet.test.mjs` (roster extension) | `126/02` |
| **04** | **The installer fixes the daemon environment** — `install --autostart`/`--no-autostart` through an injected runner, the coded off-Windows refusal, the three-check preflight on `install` and `run`. | ADR-007 | `src/commands/mesh/desktop.mjs`; `test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs` + `test/arch/mesh/index.mjs`; suites under `test/mesh/desktop/` + `test/mesh/desktop/index.mjs`, `test/support/mesh-desktop-fixture.mjs` | — |
| **05** | **The warning has one home** — the shared sqlite-runtime leaf with the targeted filter; both `resolveSqlite` bodies collapse onto it. | ADR-008 | **new** `src/sqlite-runtime.mjs`, `src/effects/journal.mjs`, `src/global-work-store.mjs`; `test/arch/store/acd-sqlite-runtime-has-one-home.test.mjs` + `test/arch/store/index.mjs`; a unit suite under `test/store/` | — |

**Why row 00's `depends` is empty, and where the constraint actually lives.** A story's
`depends:` resolves ONLY to a sibling — `aof work validate` reports `depends "…" does not resolve
to a sibling` for anything else (`src/work.mjs:1203-1208`, m65/00's rule) — so `124/01` cannot be
written in a 126 story's frontmatter. The write-set constraint against `124/01` is carried by the
milestone's own `depends: [124]` (`126/SPEC.md` frontmatter), because that is where this stream
carries every cross-milestone edge; every story here therefore waits for 124's acceptance, which
is one event. The sibling edges in the column above (`126/00`, `126/02`) are unaffected — those
are siblings and resolve.

**Why the chain is what it is, from the graph rather than from reading.** `aof graph impact` shows
00 and 02 both writing `src/commands/loop.mjs` (38 dependents) **and** `src/work/loop.mjs` (44) —
two writers on one pair, so the sibling edge is structural, not cautious. 01's subject has **one**
dependent (`command-core.mjs`) and shares no node with anything here. 04's has **five** dependents
and imports exactly one module (`face-shared.mjs`). 05's two subjects (`effects/journal.mjs` ← 31,
`global-work-store.mjs` ← 109) are both heavily depended upon but are edited only inside their
private `resolveSqlite` bodies, and neither is touched by any other story. 03's subtree shares no
node with `src/` at all — its only coupling to 02 is the **document** `mesh status --declarations`
emits, which is why that edge is a real dependency and not a file collision.

**Two notes for the break-down.**

1. **The merge was TAKEN.** The clock (ADR-001) and the narration (ADR-002) ship as one story, 00.
   Recorded rather than argued, because the reason is now measured rather than balanced: 02 collides
   with the narration on **both** `src/commands/loop.mjs` and `test/arch/loop/index.mjs`, so a
   clock-only story could never have waved ahead of it. Merging strictly shortens the critical path
   on the god-node to `124 → 00 → 02 → 03` and costs nothing.
2. **Declare files, not directories — and one index file is genuinely shared.** Under
   `124/ADR-003`'s coverage-aware wave check a directory-shaped entry collides with everything
   beneath it, so a coarse `test/` in any one story would hold the rest out of its wave for no
   reason. Measured over the write sets above, the per-directory indexes are: 00 and 02 →
   `test/arch/loop/index.mjs` (already ordered by their `depends:` edge); 01 → `test/arch/run/`; 03
   → `test/arch/ui/`; 05 → `test/arch/store/`; and **02 and 04 BOTH → `test/arch/mesh/index.mjs`**,
   which is the one collision the partition does not already order — 04 is otherwise independent.
   The cheapest resolution is a `depends: [126/02]` edge on 04, which costs 04 nothing real (it sits
   late in the wave regardless) and is preferable to a coarse entry; hunk-disjointness does not help,
   because the wave check compares declared paths, not hunks. Flagged for the break-down rather than
   decided here. `scripts/test.mjs` must appear in **no** write set — adding a suite is one import
   and one spread in its per-directory index (`119/ADR-010`), and the cargo lane is already wired.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.

     `pending` is the TOKEN, not a position: it reports at warn while 126 is open and is NOT admitted
     at accept. `aof work doctor 126` reports each unresolved control as `control-unresolved`; what
     clears a row is landing the file or dropping the declaration, never re-marking it `pending`.

     Each declared control owes a RED PROBE in VERIFICATION.md once it lands: what was changed to
     make it fail, and the message observed. Each row names its intended path in the RUNNABLE test
     tree — `66/FF-6607` forbids a test-shaped file under `wiki/**`, so no control is staged beside
     this document.

     HARNESS SHAPE (119/ADR-010): every Node arch-test here exports an array of `{ name, run }` and
     is imported AND spread in its own `test/arch/<dir>/index.mjs`. A suite imported and not spread
     is not registered (59/FF-5903). `scripts/test.mjs` is unchanged by a new suite's arrival.
     RUST SHAPE: `scripts/test.mjs:183-215` runs `cargo test` over `app/desktop/Cargo.toml`, whose
     workspace EXCLUDES `crates/app` — so a Rust-side property lands as `#[cfg(test)]` in
     `crates/core`, never in the shell crate, where nothing would ever run it.

     CITATIONS. Milestones 53 and 69 assign FF ids and are cited as `53/FF-5307`, `69/FF-6901`.
     MILESTONE 36 ASSIGNS NO IDS — its register names controls by file — so its four desktop
     controls are cited by name (`36/acd-desktop-read-only-fleet`), deliberately, rather than by an
     id that would not resolve.

     DELIBERATELY NOT RESTATED, because a control already in service asserts it:
       · "the loop shell is the ONE licensed printer and the roster may only shrink" —
         acd-console-log-confined holds it; FF-12602 depends on it and adds no PRINTERS row.
       · "`--json` never launches; the registered run() is a promptly-returning zero-write probe" —
         53/FF-5304 (acd-loop-probe-contract) holds it; FF-12602 and FF-12604 both depend on it.
       · "the `brief.loop` envelope round-trips through work:run-status" — 53/FF-5307 leg 1 holds it;
         FF-12603 asserts the DOCUMENT is unchanged and re-pins leg 2 rather than restating leg 1.
       · "every deadline and cap value resolves through src/loop-bounds.mjs" — 69/FF-6901 holds it;
         ADR-001 changes an input contract, not a bound's home.
       · "the app runs no mesh logic / reads one data path / spawns a trusted absolute argv" —
         36/acd-desktop-{no-mesh-logic,single-data-path,trusted-spawn} hold all three; FF-12606
         depends on them and EXTENDS acd-desktop-read-only-fleet rather than siblinging it (ADR-006 §8).
       · "a control never executes what it reads" — test/arch/audit/acd-controls-never-execute.test.mjs
         already sweeps the tree and covers these eight on arrival.
       · "every registered command has a CLI route and one parseable --json document" —
         acd-{work,mesh}-command-cli-bijection cover the new flags on arrival.

     EIGHT ROWS, EIGHT DISTINCT PATHS. Seven are new files; one (FF-12606) is a new file PLUS a
     named extension of an existing control and a named `#[cfg(test)]` in the Rust core. -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-12601 | **The loop's total-compute clock measures ATTEMPT time and reads no wall-clock origin.** `decideScheduleToClose`'s input carries **no** `startedAt` and **no** `now` — asserted by direct call, where a two-instant invocation is refused rather than silently admitted — and the pure summer is asserted over a literal lineage fixture covering all **four** attempt shapes (ADR-001, AMENDED): a **settled** attempt ends at `updatedAt`; a **reclaimed** attempt at `heartbeatAt ?? updatedAt` (never `reclaimedAt`); a **stale `running`** attempt at that same last liveness; and a **fresh `running`** attempt at the injected `now` — the only shape that charges to `now`. The staleness threshold arrives as **data** (`stalenessMs`), asserted to be resolved by the caller from `src/loop-bounds.mjs`'s `heartbeatFromConfig` and never inside the decider, so `69/FF-6901`'s one home is honoured rather than annexed. Driven over the real record of the measured failure (`createdAt` 23:32:33.272Z, `heartbeatAt` 00:02:19.028Z, `reclaimedAt` 11:02:13.985Z, `attempt` 1, `retryOf` null): the summer returns **1,785,756 ms** driven **both ways** — as the reclaimed record it became AND as the stale `running` record it was between 00:02Z and 11:02Z, the two paths asserted equal — and the decider **admits** against the 7,200,000 ms ceiling, and the wall-clock reading of the same record (41,380,713 ms) is asserted to be what the code no longer produces — non-vacuity proved by the two numbers differing by more than an order of magnitude on one fixture. The lineage is walked through the **ONE engine-resident `retryOf` walk** (ADR-001, AMENDED), asserted by set-equality of the visited run ids against a three-deep `retryOf` chain, and `src/commands/loop.mjs` is asserted to hold **no `retryOf` traversal of its own** — `retryLineageStartedAt` re-pointed at the engine, not duplicated beside it. `stalenessMs` is asserted **OPTIONAL**: omitted, a `running` attempt ends at `now` (the render's question); supplied, a stale one ends at its last liveness (the budget's question) — one arithmetic, two callers, asserted over the same fixture both ways. **No new persisted key**, asserted BEHAVIOURALLY because `buildRecord` is module-private (the reason `53/FF-5307`'s own leg is behavioural): a freshly minted record's key set is 16, and `buildLoopDeclaration`'s returned key set is 8 — 9 once 126/02 lands, which is FF-12604's leg, not this one — so the clock adds none. Red probe: end a reclaimed attempt at `updatedAt` and observe the measured-failure fixture halt `deadline-exhausted`; and pass `{startedAt, now, ceilingMs}` to the decider and observe the refusal. | `test/arch/loop/acd-clock-counts-attempts.test.mjs` | ADR-001 |
| FF-12602 | **The loop narrates in flight through the ONE printer it already has, and `--quiet` silences in-flight lines ONLY.** `src/commands/loop.mjs` is asserted to contain exactly **one** `console.log` — the injected launcher printer — and to add **no** row to `PRINTERS` (whose `PRINTER_CEILING` stays `12` — the shrink-only ratchet `acd-console-log-confined` owns and this control depends on rather than copies). The narration seam is asserted to be **derived from** the injected `report`, not a second parameter reaching stdout: over a driven fixture with a collecting `report`, every narrated line arrives at that collector. The **two classes are asserted by ROLE** (ADR-002, AMENDED), not by call site: **account** lines stay on `report` — all 19 `reportLine` sites, the L1 row lines (`:1023`) and `Nothing to resume` (`:1276`) — and **in-flight** lines go on `narrate`: the **three** that exist today (`:243`, `:251`, `:1873`) plus the four ADR-002 §3 adds. Driven, and it is the leg a call-site sweep would have missed: **`aof work loop <scope> --level L1 --quiet` prints exactly what `--level L1` prints**, byte for byte and non-empty — `runL1` calls no `reportLine`, so a call-site classification would have silenced an L1 invocation entirely. Under `--quiet`, driven end to end: **zero** in-flight lines and a **byte-identical** terminal account, including a halt's stop id, ref and exact `--resume` command (`53/ADR-016`). Non-vacuity: the same fixture without `--quiet` emits at least one line of each shape, and the halt fixture's resume command is asserted present in both runs. Red probe: route one in-flight line through `report` and observe the `--quiet` zero-lines leg fail; and add a second `console.log` and observe the single-printer leg fail. | `test/arch/loop/acd-loop-narrates-in-flight.test.mjs` | ADR-002 |
| FF-12603 | **The `run-status` RENDER moves; the DOCUMENT does not.** The `--json` result of `work:run-status` is asserted **key-for-key identical** to today's over three fixtures — a disk-answered item, a `fromWorker` cache-answered item, and an item with no runs — including the full `brief.loop` round-trip (`53/FF-5307` leg 1's claim, depended on and asserted here only as "unchanged", never re-derived) and the `answeredFrom`/`reportedBy` provenance. The render is asserted to name each fact it prints **from the record**, and `src/commands/run-status.mjs` is asserted to contain no `Date.now()`, no `new Date(` and no `readFile` — the literal check that made the live-path hole visible at the contract beat rather than at an operator terminal (ADR-003, AMENDED). **The instant comes from the FACE**: the render is asserted to read `faceCtx.now` and to be **total without it** — an absent `now` renders the run with its figures OMITTED, never `NaN`, `Invalid Date` or a thrown error, asserted by calling the render with a `faceCtx` carrying no `now`; and `src/spine/face.mjs` is asserted, structurally over its one render call site, to supply `now` (ISO-8601 Z) on the `faceCtx` it hands **every** `cli.render`, so the next renderer that needs an instant inherits one. The input schema is asserted to gain **no** `now` — it is a render input, not a command input. `53/FF-5307` leg 2's sha256 pin of this file is asserted **present and re-pinned** (the entry exists, its digest matches the file, and the reason is written beside it) — an entry deleted rather than re-pinned fails this leg, because an unpinned file is covered by no byte-freeze at all. `src/board-ui.mjs` and the `ui/` tree hash are asserted **unmoved**. Non-vacuity: at least one fixture run carries a populated `brief.loop`, and the render's output is asserted to contain the phase and cycle it holds. Red probe: add a key to the `--json` document and observe the document leg fail; delete the run-status pin from `53/FF-5307` and observe the re-pin leg fail. | `test/arch/run/acd-run-status-renders-the-record.test.mjs` | ADR-003 |
| FF-12604 | **The declaration predicate CLASSIFIES nothing itself, reaches nothing, and supervision is opt-in.** The decider's source is asserted to contain **no** failure-reason literal (`runtime_offline`, `timeout`, `session_limit`, `agent_error`, `needs-input`), **no** run-state literal, no `node:fs`, no store open and no clock — its verdicts come from **`isRunning`, `isStale`, `retryReadiness` and `readLoopDeclaration`** — four, asserted by call rather than by shape. `isRunning` is the store's ONE additive pure export (ADR-004, AMENDED) and is what makes the no-literals rule satisfiable rather than merely stated: without it the decider could not tell a `running` record from an `agent_error`, since `retryReadiness` answers `not-retryable` for both. Driven over a literal fixture carrying **one run of every class**: `running`-fresh ⇒ listed (alive); `running`-**stale** ⇒ listed (**the died runtime** — the milestone's own record, and the cell ADR-004's amendment added); `running`-stale with the clock exhausted ⇒ **not** listed; `runtime_offline` under cap ⇒ listed; `session_limit` before `resumeAfter` ⇒ not listed, after ⇒ listed; `needs-input` ⇒ **never** listed; `agent_error` ⇒ not listed; `attempt >= cap` ⇒ not listed; a lineage whose ADR-001 clock is exhausted ⇒ **not listed even though `retryReadiness` says ready** (the recomputation leg — asserted by flipping only the ceiling and watching the row disappear); a scope whose latest run is `done` ⇒ not listed. Non-vacuity: every class is present and at least one row is listed. **The opt-in**: `buildLoopDeclaration` returns **9** keys with `supervised` **last**; `recoverableDeclaration` projects **6**, defaulting `supervised` to `false`; `usableDeclaration`'s required set is asserted **still 5**, so the eight declarations on disk stay readable; a declaration without the key produces **no** listed row. Red probe: test `failureReason === "runtime_offline"` inside the predicate and observe the no-literals leg fail; drop the clock leg and observe the exhausted-lineage fixture list a row. | `test/arch/loop/acd-declaration-predicate-is-composed.test.mjs` | ADR-004 |
| FF-12605 | **The answer rides the ONE data command, and every row carries a one-home argv and its own `cwd`.** `mesh:status`'s result is asserted **byte-identical to today** without `--declarations` (the flagless document, over a fixture with declarations present on disk) and to gain **exactly one** key with it. No second command is registered for this answer and no `work:*` verb is added — asserted over `listCommands()`. The argv on each row is asserted to be produced by the **shared leaf**, not assembled locally: the leaf is asserted to carry **no `import` of any kind** — not a project module and not a `node:` builtin, the `src/loop-bounds.mjs` shape exactly — which is what makes the four invariants it leaves behind in 63's family (no spawn, no phase drive, no gate decision, no timer/write) **structural rather than swept**; and `RESOLVED_TRIGGER_KEYS` is asserted to **stay** on `src/commands/trigger.mjs`, since it is the trigger row's face contract and not a loop input and to be the only module in `src/**` composing a `["work","loop",…]` array; `src/commands/trigger.mjs` is asserted to import it rather than to re-declare `LEVEL_FLAG`; and every `--flag` token the leaf spells is asserted to be one `work:loop` **declares**, in `cli.spec.flags` and in its input schema. **Each row's `cwd` is the workspace descriptor's own `projectRoot`** — asserted over a two-workspace fixture where the two roots differ and neither equals `process.cwd()` (TECH_DEBT item 4's failure mode, asserted absent rather than trusted). The key is `{ ok, rows, skipped }` (ADR-005, AMENDED): `resolveNodeWorkspaces`'s `skipped` list is asserted to reach the answer **verbatim**, and its **`ok: false`** paths (`src/mesh/presence.mjs:198`, `:236` — an unopenable store, a throwing query) are asserted to answer `ok: false` with empty `rows` and **no standalone fallback**, distinct from `ok: true` with zero workspaces, which does fall back to `ctx.workspace`. An unreadable store is reported, never read as an empty node. Non-vacuity: the fixture yields at least one declaration row and at least one skip. Red probe: spell the argv inline in the producer and observe the one-home leg fail; drop `cwd` from a row and observe the descriptor leg fail. | `test/arch/mesh/acd-declarations-ride-the-one-data-command.test.mjs` | ADR-005 |
| FF-12606 | **The supervised set is SUPPLIED, not matched, and Rust learns no completion semantics.** Over `app/desktop/**/*.rs` (Rust comments stripped): no `match`/`if` on `is_control_node` selects a supervised **set** (the role latch's single server start remains, named as the one admitted use — an exemption asserted as a named exemption, so a second cannot arrive silently); **no** loop/scope/phase/run vocabulary appears anywhere in the crate — asserted against a token list (`loop`, `scope`, `phase`, `run-status`, `declaration` as a *decision* rather than as the transported struct's name), so no policy leaks across the boundary, with **ONE named exemption** in the role latch's shape: the token `loop` may appear **only as the second element of the admitted `["work", "loop"]` argv literal** — the runtime gate (contract-beat note §5), which is the ONLY home in the Rust tree, since §8's roster is enforced in a NODE control (this row's own `enforced by` column names it) — and nowhere else, so the admitted verb's NAME is not mistaken for loop knowledge and a SECOND occurrence cannot arrive silently; and `SupervisorState` carries **no** per-child field, its signals resolved by id through one map, with the six `main.rs` consumers asserted to still resolve. **The spawn roster is an ALLOW-LIST**, asserted as an **extension of `36/acd-desktop-read-only-fleet`** in that control's own file — exactly `{mesh status, mesh serve, mesh ui, work loop}` — so a planted `["work","tune",…]` spawn reds there; the five forbidden mutation verbs and the three sibling desktop controls are depended on, not restated. **The runtime gate is NARROWER than the source roster**: the `declarations` parse is asserted to drop any row whose argv does not begin `["work", "loop"]` — driven with a planted `["mesh", "serve", "--serve"]` row and a planted string-instead-of-array argv, each asserted to drop **that row only** while the rest of the document (`nodes`, `boards`, `isControlNode` and the surviving rows) parses unchanged, the `#[serde(default)]` absence-is-benign posture `boards` already has. **The reconcile is a PURE function in `crates/core`** with its `#[cfg(test)]` beside `supervision.rs`'s existing tests (`cargo test` never runs `crates/app`), asserting: a row present and no child ⇒ start; a child with no row ⇒ stop; both ⇒ retain; a held declaration ⇒ neither started nor stopped by a tick; and a child that exited 0 while its row persists ⇒ **started again** (the level-triggered property, and the one a restart-on-exit design would get right by accident and a completion-aware one would get wrong). Non-vacuity: the plan's four outcomes each occur at least once, and the Node sweep asserts the `.rs` tree was actually walked. Red probe: give the reconciler an exit-code rule and observe the retain/restart case fail; add a `["work","tune"]` spawn and observe the roster leg fail. | `test/arch/ui/acd-desktop-supervises-a-supplied-set.test.mjs`, with the roster leg landing in `test/arch/ui/acd-desktop-read-only-fleet.test.mjs` *(extended)* and the reconcile property as `#[cfg(test)]` in `app/desktop/crates/core/src/supervision.rs` | ADR-006 |
| FF-12607 | **Autostart is ONE injected runner, idempotent, and never a silent no-op off Windows.** `src/commands/mesh/desktop.mjs` is asserted to reach the registry through an **injected** runner on every path (no un-injectable `reg`/`spawnSync`/`execFile` literal in the module — the `listFn`/`killFn` shape `stop` already uses), and `--autostart` is asserted to be a **flag on `install`**, with `listCommands()` asserted to hold no fifth `mesh:desktop:*` command. Per ADR-007's amendment: `--autostart` **with** `--no-autostart` is the coded refusal `autostart-flags-conflict`, raised before any act (the face has no `--no-` negation — `src/spine/face.mjs:47-79` — so nothing downstream would resolve it); the written value's NAME is `aof-mesh-desktop`; and the authenticated check is asserted to parse `loggedIn` from `claude auth status`'s JSON, **never** its exit code, which is 0 either way. Driven over a fake runner: writing the value twice yields one entry and two successes; removing an absent value succeeds; the written value is the **absolute** path to `aof-mesh-desktop.exe` in the resolved install dir, never a bare name. Off Windows, **both** `--autostart` and `--no-autostart` return the coded refusal `autostart-unsupported-platform` naming the platform (a removal that silently succeeds where no entry could exist is the same lie in the other direction) — a **non-zero, coded** answer that is never a success — over an injected platform, so the leg runs on every host. **This control asserts the SHAPE that refusal needs** — the platform is an argument at the act and never a `process.platform` read inside it, and the admission is exact and never case-folded — **and `126/04 task02` asserts the refusal itself**, over three driven scenarios; the split is written down here because a probe that neuters the refusal leaves THIS file green and reds those three (`F-27`). `--dry-run` is NEW on `install` and asserted to cover the **whole verb** — no placement AND no registry write — while its render still names both what would be installed and what would be written (the bijection gate spawns this verb, and a probe never performs the act it names). The **preflight** is asserted to name its **four** checks by code in one frozen, ordered list, to write nothing on any path, and to be reported by **both** `install` and `run`. **The count is four, not three** (ADR-007, AMENDED at `126/06`'s post-hoc review): `126/04 task03`'s delivered scenarios asserting "exactly three" are untouched and remain the record of what `126/04` shipped, and this row is where the count moves. **The swept region is a WHOLE FILE** — `src/commands/mesh/desktop-preflight.mjs`, which the preflight was extracted into — rather than a hand-kept list of function headers inside the command module: `126/06` added four functions to the preflight and did not add them to that list, so `registersHeartbeatHook`, `defaultSettingsFn`, `defaultHookFileFn` and `checkHeartbeatHookInstalled` sat outside the sweep and this sentence was silently false about a quarter of what it named. The un-injectable-child-process sweep and the single-direct-`spawn(` leg now run over **both** modules, which is strictly wider than what they covered before. Four further absences are asserted, each the shape of a defect the post-hoc review measured: the module re-spells **no** fact with a home — not the ownership marker, not the settings path, not the hook file, not the event (`AOF_HOOK_MARKER` / `CLAUDE_SETTINGS_RELPATH` / `claudeHookDeclarations` are imported, and the file is read from the registration found on disk); `workspacesFn` is called from **exactly one** site, so the node's workspaces are enumerated once per preflight rather than twice; every check runs inside **one** guard, in `PREFLIGHT_CHECKS`' order, so a throwing probe cannot escape into a face that has already spawned the app detached; and `PREFLIGHT_SEAMS` is asserted **set-equal** to the `options.*` keys `runPreflight` actually reads, with **both** verbs forwarding that one list — the leg that makes `126/06`'s "two new seams, forwarded by neither face" unrepeatable. Non-vacuity: each check produces both a pass and a fail over injected fixtures. Red probe: make the off-Windows path return `{ok:true}` and observe the coded-refusal leg fail; call `reg` directly and observe the injection leg fail; and plant a `writeFile` inside `checkHeartbeatHookInstalled` — a function the old header list did not name — and observe the widened sweep report it. | `test/arch/mesh/acd-autostart-is-one-injected-runner.test.mjs` | ADR-007 |
| FF-12608 | **The SQLite runtime has ONE import home, its warning filter is targeted, and no blanket suppression exists anywhere.** `grep`-equivalent over `src/**`: `import("node:sqlite")` occurs in **exactly one** module, and `src/effects/journal.mjs` and `src/global-work-store.mjs` both reach it through that leaf — asserted by import, not by absence. The leaf is asserted to install its `emitWarning` wrap, restore the original in a **`finally`**, and swallow only a warning whose `type` is `ExperimentalWarning` **and** whose message names SQLite: driven in-process, a planted non-SQLite `ExperimentalWarning` raised during the import **still reaches** the original, and `process.emitWarning` is asserted `===` its prior value after both a successful and a **throwing** import. Neither caller's refusal moves: `global-work-store` still throws `sqlite-unavailable` (501) and still honours `options.sqlite === false`; `journal` still degrades as it does. **No blanket suppression, tree-wide**: no `--no-warnings`, **no `NODE_NO_WARNINGS`** (the env-var twin a flag-only sweep misses — this repo already sets it on a CLI child at `test/arch/command/acd-cli-entry-executes.test.mjs:28`), no `--disable-warning` and no `NODE_OPTIONS` warning flag in `src/**`, `bin/**`, `scripts/**`, `src/bundle/**` or `package.json` — the swept roots deliberately EXCLUDE `test/`, where a harness suppressing its child's warnings is a legitimate choice, and where 60 files already do (ADR-008's consequence). Non-vacuity: the import under test really is the one both callers use, asserted by a counting fake. Red probe: drop the `finally` and observe the restore-after-throw leg fail; add `--disable-warning=ExperimentalWarning` to a bin shim and observe the tree-wide leg fail. | `test/arch/store/acd-sqlite-runtime-has-one-home.test.mjs` | ADR-008 |
