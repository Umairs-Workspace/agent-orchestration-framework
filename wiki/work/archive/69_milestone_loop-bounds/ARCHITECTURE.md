---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — the structural record. Answers ONE question: what was decided,
  and what must stay true? Owner: architect. ADRs + the fitness register.
  Behavioural acceptance lives in task .feature files, never here.
-->
# 69 · Loop bounds — Architecture

> **Measured on this tree at refine (2026-08-21).** Every number and every claim about the CLI below
> was taken here, on the installed binary, not inherited from the SPEC or the RESEARCH. Where a
> measurement CONTRADICTS the SPEC, the measurement wins and the contradiction is named — see
> ADR-004 and § Corrections to the SPEC's premises.

## Grounding — the coupling this partition follows

`aof graph build .` (code-only, `egress: none`, `builtAt: 2026-08-21T15:29:49.129Z`,
11,705 nodes / 28,231 edges; already current). Then `aof graph impact` on every candidate boundary.
Dependents are counted whole; the `src/`-only count is what a boundary can actually collide with.

| Module | deps | dependents (src-only) | Read |
|---|---|---|---|
| `src/run-store.mjs` | 4 | 45 (**17**) | **The god-node.** Holds `heartbeat()`, `isStale`, `staleRunningRuns`, `retryReadiness`, the park gate. This milestone **calls** it and writes no key (ADR-006). |
| `src/work-loop.mjs` | **0** | 12 (**1**: `commands/loop.mjs`) | Pure leaf, one production caller. Already carries `cap`, `cap-exhausted`, `retry-parked`. The cap's enforcement home. |
| `src/work-loops.mjs` | 2 | 15 (**3**: `loops-{graph,show,validate}.mjs`) | The registry validator. Owns the `ceiling` grammar and `loop-ceiling-uncapped`. |
| `src/work-dispatch.mjs` | 3 | 3 (**1**: `commands/dispatch.mjs`) | Holds the dead-but-real `dispatchReadySet` **and** `laneChanges`. Two stories, two functions. |
| `src/mesh-assignment-reclaim.mjs` | 12 | 7 (**1**: `mesh-launcher.mjs`) | The control tick — dispatch half and reclaim half, already two separate bodies. |
| `src/agent-session-driver.mjs` | 7 | 18 (**2**: `commands/drive.mjs`, `mesh-worker-execution.mjs`) | The spawn seam. `driveInteractiveClaudeSession` is the only thing in the repo that holds a PTY handle. |
| `src/mesh-worker-execution.mjs` | 22 | 51 (**3**) | The mesh caller. Big — edited at named seams only (68's rule, 70's rule, kept). |
| `src/bundle/hooks/` | — | installed by `aof work update` | A proven, shipped hook-asset shape with exactly one instance. This milestone adds the second. |

Four facts drew the partition.

1. **`run-store.mjs` has seventeen `src/` dependents and already exports everything this milestone
   needs.** `heartbeat()` is six lines with zero production callers (68/ADR-008: *"Its caller is
   69's"*). `staleRunningRuns` and `isStale` are exported and in service. So the milestone that
   finally uses them adds **no key and no state** to the record — see ADR-006.
2. **The two loop leaves have zero or one production dependent.** `work-loop.mjs` imports nothing
   and is imported by one command. That is where a cap can be introduced without touching anything.
3. **The control tick's two halves are already separate function bodies** — `runControlDispatchReclaimTick`'s
   dispatch loop and `reclaimStaleAssignments`. 68 proved region-level cuts on a single file are
   safe when the regions do not call each other; these do not.
4. **Exactly one function in the repo owns a live process handle.** `driveInteractiveClaudeSession`.
   Everything ADR-004 decides follows from that.

---

## Corrections to the SPEC's premises

Refine is the last honest place to check a SPEC's factual claims. One did not survive, one was
resolved as STATE asked, and one was confirmed.

1. **"In-process caps at the spawn site — `--max-turns` and `--max-budget-usd` where the spawn path
   supports them."** — **The spawn path supports neither.** Measured on the installed binary
   (`claude 2.1.233`, this control node, 2026-08-21):
   - `--max-turns` **does not appear in `claude --help` at all** (`claude --help | grep -i turns`
     → no match, exit 1).
   - `--max-budget-usd` exists, and its own help line reads *"Maximum dollar amount to spend on API
     calls **(only works with `--print`)**"*.

   aof's worker launch is **forbidden** from carrying `-p` / `--print` / `--output-format` by a
   *shipped, currently-green* fitness function — `test/arch/acd-worker-driver-no-headless-print.test.mjs`
   (m38 / ADR-013, invariant 3) — on the measured evidence that a `-p` turn cannot pause to ask a
   human and reports `terminal_reason: "completed"` indistinguishably from real completion. So the
   in-process caps are not merely unpassed, they are **structurally unavailable on aof's path**, and
   reaching them would require reverting a guard this repo built after a measured incident.

   This is the answer to STATE's first open question, and it is the answer STATE anticipated: *"If
   only the latter, the wall-clock reaper is the whole enforcement story on the current path."* It
   is. ADR-004 makes that the design rather than a fallback.

2. **"the prose bound and `dispatchReadySet` are two answers to one question"** — **confirmed, and
   resolved the way STATE said the evidence supports.** `dispatchReadySet` is a real worker pool
   with `peak`/`ranAtOnce` instrumentation and a documented reason for its default; its only
   importers are `commands/dispatch.mjs` (which does not call it) and two tests. It gets its
   production caller (ADR-005). The *prose* half — the sentence in `continue.md` that hands a number
   to a model — is a prompt-layer edit and belongs to **71** by this milestone's own scope split.
   69 makes the prose unnecessary; it does not rewrite it.

   **[AMENDED 2026-08-22 — the pointer AND the claim.** The ADR is **ADR-006**, not ADR-005. And the
   production caller landed without settling the question: 69/04's review measured that the pool's
   lane frees when the *worktree* exists, before any agent starts, so a production caller bounds
   materialisation and not agent work. The per-machine authority is now the **lane**, and the prose
   half is unchanged — still 71's. See ADR-006's 2026-08-22 amendment.]

3. **"a mesh-wide lease keyed in the store"** — **there is no lease surface to extend.** `src/mesh-lease.mjs`
   does not exist; the whole m26 leasing mechanism was deleted in m34's "global mesh only"
   correction and its tests are parked, unrunnable, in
   `wiki/work/35_milestone_mesh-work-assignment/reference/retired-dispatch-tests/`. m35 rebuilt the
   capability on `global_assignments` + the WS control stream. ADR-006 therefore puts the mesh-wide
   bound on the table that exists rather than resurrecting a retired one.

---

## ADR-001 — The cap's value is a DECLARATION with one home, and the registry is where 54 reads it

**Status.** Accepted.

**Context.** Four milestones (54, 53, 62, 65) are blocked on a number nobody would name. 54's own
words: *"it enforces a bound; it does not invent its value."* Meanwhile the loop registry already
has the exact slot for it — `ceiling:` — with a closed grammar (`none` | `uncapped` | `unknown` |
a list of `config:` / `module:` / `prose:` / `command:` pointers) and a warn-level finding,
`loop-ceiling-uncapped` (`src/work-loops.mjs:299`). Two framework records declare `uncapped`:
`build-to-green` and `review-fix-rereview`. The value has nowhere to hide.

**Decision.** The values are named here, they live in **one** new pure leaf, and the registry
records point at it rather than restating it.

| Bound | Value | Why this value |
|---|---|---|
| **Review → fix → re-review** | **N = 1.** A second round requires a *named blocker* — a production defect, a guard that protects nothing, or a contract violation. Everything else becomes a work item. | Huang et al. (ICLR 2024): self-correction without an external oracle is net-**negative** (GSM8K 95.5 → 91.5 → 89.0). MAST: step repetition 17.14%. aof's own m52: **13** delta-application runs against 5 authoring runs, 41.8% of the milestone's tokens. m66: five closure rounds nobody asked for. |
| **Build to green** | **Failure to progress**, not an iteration count: stop after **two consecutive rounds with no reduction in the failing-scenario count.** | The success terminator (`all scenarios green`) already exists and is correct. What is missing is a *failure* bound. An arbitrary N would cap correct work; a progress bound only caps work that has stopped being work. |
| **Attempts** | `work.autonomous.maxAttempts` **stays 3**, and is paired with a `scheduleToClose` ceiling. | Large attempt counts are only safe when a total-duration cap exists (Temporal, Step Functions). 3 × `startToClose` bounds the pair in ADR-002. |

**Where the values live.** A new pure leaf, `src/loop-bounds.mjs` — `DEFAULT_*` + `resolve*(value)`
+ `*FromConfig(workspace)`, the shape this repo already uses in `mesh-sync-cadence.mjs`,
`mesh-presence-loop.mjs`, `mesh-presence.mjs`, `cache-provenance.mjs`, `mesh-session.mjs`,
`mesh-relay.mjs` and `work-dispatch.mjs`. New config subtree: `work.loop.*`.

**What this ADR deliberately does NOT annex.** Two bounds already have single homes with guards on
them, and moving either would break the guard that protects it:

- `work.dispatch.concurrency` — one reader, `work-dispatch.mjs`, pinned by
  `acd-dispatch-bound-single-home`. It **stays there**.
- `work.autonomous.maxAttempts` — a closed reader set pinned by `acd-loop-cap-single-home`. It
  **stays there**, and that guard is *extended* to cover the new leaf rather than a sibling being
  added beside it.

**Consequences.** 54 has a number and a pointer to it. `loop-ceiling-uncapped` stops firing on the
framework's own records — not because the finding was weakened, but because the declaration became
true. A project that installs the bundle inherits resolved ceilings.

---

## ADR-002 — Four deadlines, one policy object, and every one of them is enforced by aof

**Status.** Accepted.

**Context.** Temporal's four-timeout taxonomy maps onto aof's recorded failure modes one-for-one,
and every one of aof's is a measured event on this tree, not a hypothetical.

**Decision.** Five values, resolved together in `src/loop-bounds.mjs` (ADR-001), one policy object.

| Name | Detects | Terminal behaviour | Starting value | Derivation |
|---|---|---|---|---|
| `startToClose` | crashed / hung after starting | **kill and retry**, per attempt | **30 min** | 47/01 and 47/02 each burned **11h07m** then succeeded in **15.9 min**. 30 min × 3 attempts bounds each at ≤46 min instead of 11 h. |
| `heartbeat` | no progress *within* an attempt | kill and retry | **15 min** | The system's standing staleness constant — `DEFAULT_ASSIGNMENT_HEARTBEAT_STALE_MS` and `COMPLETION_IDLE_MS` are both already 15 min. **The same constant, not a third copy.** |
| `scheduleToStart` | nobody picked it up | **alert and escalate — never retry** | **10 min** | A row that is `assigned` but never dispatched is not a failure to retry; retrying re-queues the same undispatched row. Run 46/00 has read `running` since 2026-08-08. |
| `scheduleToClose` | total across all attempts | **give up, escalate, preserve** | **2 h** | `maxAttempts` (3) × `startToClose` (30 min) + slack for retry latency. This is the ceiling that makes `maxAttempts: 3` safe (ADR-001). |
| `startupGrace` | — | suspends `heartbeat` only | **5 min** | A full `git clone` (no `--depth`, no `--filter`) plus a dependency install produces no tool-result events. Without a grace, every worktree materialisation reads as a stall. |

**Two rules that keep this from becoming five independent clocks.**

1. **`heartbeat` is suspended, and only `heartbeat`, during `startupGrace`.** `startToClose` and
   `scheduleToClose` run from the moment the attempt starts. A grace that pauses the wall clock is
   how a 5-minute grace becomes an unbounded one.
2. **`scheduleToStart` never produces a retry.** It is the one timeout in the set whose terminal
   behaviour is *not* the retry path, and it is stated here because the retry vocabulary would
   happily accept it: `timeout` is already in `RETRYABLE_REASONS`.

**Consequences.** Every deadline resolves from one object; a project overrides one key without
learning five. The 22 hours that produced nothing become ≤92 minutes.

### AMENDMENT (2026-08-24, at `aof:verify 69`) — the reach this ADR spends, declared

Milestone 53's ADR-015 §5 caps how far `src/agent-session-driver.mjs` may reach and states that
raising the ceiling **requires an ADR**. This milestone raises it, so here is the ADR rather than a
silently edited number (VERIFICATION F-69-V10, which found the ceiling had been over-run and unrecorded
since 69/01–69/02 merged).

- **Driver root-inclusive reach: 23 → 24.** The one new node is `src/loop-bounds.mjs`, imported at
  `src/agent-session-driver.mjs:56` so the driver's liveness idle window and per-attempt deadline
  resolve through the ONE bound home rather than literals of their own — which is the property
  FF-6901 exists to hold, and which `@manual` 69/01 task 02 scenario 2 caught the driver failing.
  The leaf **imports nothing**, so it adds exactly one node and no subtree; it is in no
  `DENIED_TRANSITIVE` path; and it is imported **without re-export**, so FF-5302's frozen export set
  is untouched. The mesh-blindness this control exists to protect is unaffected: a config resolver
  reaches no store, no assignment and no workspace identity.
- **Assignment sink reach: 59 → 62.** Three leaves, all reached only from
  `src/mesh-worker-execution.mjs` and all this milestone's: 69/01's `run-heartbeat-consumption.mjs`
  (the liveness queue drain), 69/02's `loop-bounds.mjs` (the deadline policy the two spawn seams
  hand the driver), and 69/05's `mesh-park-resume.mjs` (the park/resume reactor). No denylist, no
  other admission and no other ceiling moves with them.

**What this amendment does NOT license.** It raises two counts by a stated amount for four named
leaves; it does not relax the denylist, the admitted-route assertions, or the rule that the next
milestone to add a node comes back here first. The counts are pinned exactly (`<= 24`, `=== 62`) so
the next addition fails the gate rather than sliding through.

---

## ADR-003 — The heartbeat is stamped by CONSUMPTION, and the producer is a hook, not a pinger

**Status.** Accepted.

**Context.** `run-store.heartbeat()` has had zero production callers since it was written.
`heartbeatAt` is therefore `null` from mint to terminal, `isStale` silently degrades to `updatedAt`
(which only moves on a state transition), and a live run is indistinguishable from a dead one. The
operator-facing instruction in `autonomous.md` tells a human to detect orphans by a field that is
always null.

The naive fix is a pinger — a timer inside aof that stamps every N seconds. That fix is worse than
nothing: a pinger proves the *pinger* is alive, and the two 11h07m runs would have pinged
faithfully for eleven hours.

**Decision.** **Stall means no new tool-result events, not no ping** (Restate's inactivity timeout;
Temporal's heartbeat-carries-details). The producer is a `PostToolUse` hook in the driven session.

- **The hook is the second instance of a shipped, proven shape.** `src/bundle/hooks/` already holds
  `claude-artifact-sync.json` + `artifact-sync-enqueue.mjs`, installed by `aof work init` / `aof work
  update`, marked `aofManaged`, content-hashed and drift-protected. The heartbeat hook is authored
  to the same contract, and the *rule* it must obey is the rule that file learned the hard way:
  **it derives nothing** — no workspace identity, no cwd derivation, no `src/` import, no store
  open, and **exit 0 on every path**.
- **The run's identity is handed to the hook in the spawn ENV, not derived.** 68/01 already sets
  `OTEL_RESOURCE_ATTRIBUTES` at exactly this seam, carrying `run.id` / `story.id` / `milestone.id`,
  after the IDE-attachment scrub. The heartbeat hook reads the run it belongs to from the
  environment its session was spawned into. Env is per-process and untracked, so the
  absolute-path-in-a-tracked-file failure (`artifact-sync-enqueue.mjs`'s ADR-013/C2 lesson) cannot
  recur here.
- **One staleness constant.** The threshold resolves through ADR-002's `heartbeat` value, which is
  the same 15 minutes `mesh-assignment-reclaim.mjs` and `agent-session-driver.mjs` already use. A
  second copy is the defect this milestone exists to remove, one level down.
- **The consumer is the reaper** (ADR-004). The hook records; the reaper decides. Nothing branches
  inside the hook.

**Consequences.** `isStale` stops degrading. `dualStalenessDecision` — which already ANDs node
presence with run heartbeat — gets a real second signal for the first time, so the reclaim path it
guards becomes correct rather than accidentally-presence-only.

---

## ADR-004 — Enforcement is OUT-OF-PROCESS, because the in-process caps do not exist on this path

**Status.** Accepted. **This ADR overrides a SPEC bullet — see § Corrections, item 1.**

**Context.** Measured above: `--max-turns` does not exist on `claude 2.1.233`; `--max-budget-usd`
works only with `--print`; and `--print` is forbidden in the worker launch by a shipped fitness
function, on evidence that it cannot pause for a human. The SPEC's "in-process caps at the spawn
site" therefore has no site.

**Decision.** aof enforces its own deadlines, from outside the model's process.

1. **The kill lives where the handle lives.** `driveInteractiveClaudeSession` is the only function
   in the repo holding a PTY handle. It arms ADR-002's `startToClose` and `heartbeat` deadlines at
   spawn and resolves `{ outcome: "failed", failureReason: "timeout" }` on expiry. **No vocabulary
   is invented:** `timeout` is already in `RETRYABLE_REASONS` (*"no verdict in time"*), and
   `timeout` / `stall` / `max_turns` / `budget_exceeded` are already in 68's `EXIT_REASONS`, fixed
   there *"precisely so that 69 has a stable thing to enforce against"*. This milestone is what
   makes those members reachable.
2. **The reaper is the backstop, not the primary.** A driver that is itself dead cannot kill
   anything. The periodic scan — the control tick, already running at 15 s and already calling
   `reclaimStaleAssignments` — is what catches a run whose *supervisor* died. Primary: the driver.
   Backstop: the reaper. Both reach the same edge, `reclaimRun`, which m42 already consolidated into
   one home for exactly this reason.
3. **No bound is spoken to the model.** aof does not tell the agent its budget and hope. That is
   the failure this milestone is named after, and it is also 71's subject, not this one's — 71 makes
   the prompts *agree* with a bound the runtime already enforces.
4. **codex is untouched.** Its headless `execFile` path already carries a 10-minute timeout. It was
   never the §4.3 problem and no story here edits it.

**Consequences.** The Agent SDK move (RESEARCH Tier-3 #19) becomes a *live option with a stated
prize* — `maxBudgetUsd` is subagent-inclusive and unreachable any other way — rather than a
speculative bet. It is not this milestone's, and ADR-004 is what a future proposal argues against.

---

## ADR-005 — Progress is MEASURED, never judged; liveness is not progress

**Status.** Accepted.

**Context.** A heartbeat would have caught the 8-day zombie. It would **not** have caught the two
11h07m burns, which were almost certainly heartbeating fine while looping. Magentic-One's answer is
a Progress Ledger with `IsProgressBeingMade`, `max_stalls`, `max_reset_count` — but its ledger is
re-evaluated by a model every round, and this repo has direct evidence (Huang et al.; its own m52)
that a model asked whether progress is being made will find some.

**Decision.** The ledger's inputs are deterministic and already available.

- **The proxies:** files touched and lines changed (`git status --porcelain` inside the lane's own
  tree — `laneChanges(worktreePath)`, **already built** in `work-dispatch.mjs` and already used by
  the lane sweep), commits made, and failing-scenario count. No LLM judge, no `IsInLoop` prompt.
- **The policy:** `maxStalls` consecutive no-progress samples → **reset with a summary**;
  `maxResets` → **escalate**. Both values resolve from ADR-001's leaf.
- **`build-to-green`'s ceiling is this ledger** (ADR-001): two consecutive rounds with no reduction
  in the failing-scenario count.
- **The ledger is append-only and does NOT touch the run record.** Samples land in a
  `runs/<runId>.progress.ndjson` sibling. `readRuns` skips every entry that is not `*.json` (twice —
  the flat branch and the node-partitioned branch), so the file is invisible to the god-node's
  reader by construction, and 68/ADR-007's append-only discipline is preserved rather than
  re-argued.

**Consequences.** The one signal that would have caught the 22 hours exists, and it costs no model
call. Grinding — 199 edits against 1 test run, one file edited 70× — becomes a measurement.

---

## ADR-006 — The slot is acquired BEFORE work is accepted, on the two surfaces that exist

**Status.** Accepted. **AMENDED 2026-08-22 (69/04's independent review) — the per-machine decision
bullet below is SUPERSEDED and the mesh half's membership rule is widened; see the amendment at the
end of this ADR. The title still holds: what changed is WHAT holds the slot, not when it is taken.**

**Context.** There are two bounds and today neither is enforced. Per-machine: `dispatchReadySet` is
a real worker pool with `peak`/`ranAtOnce` instrumentation and **no production caller**; `aof work
dispatch` computes `bound` and attaches it *as a number for a language model to read*. Mesh-wide:
there is no bound at all — the control tick dispatches every connected `assigned` row, every 15 s.

**Decision.** Two bounds, two mechanisms, no new store.

- **Per-machine — resurrect, do not delete.** — **SUPERSEDED by the 2026-08-22 amendment below: a
  production caller is not an admission authority.** `dispatchReadySet` gets its production caller in
  `commands/dispatch.mjs`. The bound stays `work.dispatch.concurrency` in its existing single home
  (ADR-001's non-annexation rule) — **that last clause survives the amendment unchanged**; the
  sentence before it does not.
- **Mesh-wide — extend the branch that already exists.** The control tick's dispatch loop already
  contains the exact shape needed: `if (!connected) continue;` — *leave the row `assigned`, dispatch
  it on a later tick, never a silent drop and never a loud error.* "Over the bound" is that same
  branch with a different predicate. The counted set is read from `global_assignments`, which
  already carries `state`, `target_node_id` and `code`.
- **No lease table, no claim file, no new column.** § Corrections item 3: the lease machinery was
  retired, and the assignment row is what replaced it. A slot is a *count over rows*, not a
  persisted object with its own lifecycle to get wrong.
- **The counted set excludes parked rows from day one** — `state = 'running'` AND
  `code IS NOT 'needs-input'`. **WIDENED by the 2026-08-22 amendment below: `accepted` occupies a
  slot too, by its own state** — a control restart erases every reservation held only in a
  launcher's memory, and an `accepted` row is then counted by nobody. That code is **already
  written** by the worker
  (`mesh-worker-execution.mjs:1712,1760`), so this half is correct before ADR-007 lands. ADR-007
  makes the park real; ADR-006 makes it count. **Qualified by ADR-007's 2026-08-22 amendment:** the
  predicate is right, but one of those two writers is the pre-exit publish the amendment removes —
  the counted set is only as honest as the moment the code lands on the row.
- **`run-store.mjs` is not written to.** No key, no state, no transition. The three facts this
  milestone needs already have homes: liveness on `heartbeatAt`, the park on
  `global_assignments.code`, progress in its own sibling file. Seventeen `src/` modules import this
  record; the milestone that finally *uses* it should not also reshape it.

**AMENDMENT — 2026-08-22 (independent review; two blockers against 69/04).** The mesh half's
mechanism stands and is sharpened into the two rules it was missing. The per-machine half's
mechanism did not survive review and is replaced.

**1. A production caller is not an admission authority — the LANE is the local slot.** The bullet
above said `dispatchReadySet` *"gets its production caller in `commands/dispatch.mjs`"*, and review
rejected that as the per-machine answer. Measured at the review: the door passes `resolveDispatchLane`
as the pool's `runLane` (`src/commands/dispatch.mjs:91`), and that function creates-or-reuses a git
worktree and RETURNS (`src/work-dispatch.mjs:148`). The pool's lane therefore frees the instant the
tree exists — **before any agent starts** — so `peak`/`ranAtOnce` measure worktree-CREATION
concurrency, and reporting them as agent concurrency would publish a number nothing obeys (the harm
`acd-dispatch-bound-single-home` names in its own header: *"a bound enforced at 3 and reported as 6
is an operator making decisions from a number nothing obeys"*). The process that does the work is
spawned later and by someone else: `src/bundle/commands/continue.md:87-97` is a PROMPT — read
`bound`, call `aof work dispatch <ref>` per member, then *"spawn the builds together"*. **A
process-local pool cannot bound the lifetime of work it neither starts nor owns**, and handing the
number to a model is the failure this milestone is named after — one level up from where this ADR
aimed.

**The counted set is the LANE SET**: every worktree `git worktree list --porcelain` reports under the
dispatch root (`inspectDispatchLanes` + `isUnderMeshDispatchWorktreesRoot` — both shipped, and
already classifying every lane). It is the exact structural twin of the mesh half — a count over
records the work itself produces — and it is chosen for four properties, each already true today:

- it **spans the worker's real lifetime**: the lane is created BEFORE the developer is spawned (there
  is nothing to build in otherwise) and removed only by `cleanupDispatchLane` once the work merges
  back;
- it is **durable across processes** — git's own record, readable by a process that opened none of
  it, which is what the retired lease store was reached for and is not needed for;
- it adds **no state**: no lease table, no claim file, no column, no `run-store.mjs` write (FF-6908);
- it is **already inspected by a shipped function**, whose lane state is derived from what the lane
  itself produced rather than from a liveness claim some other process made about it.

**Which lanes occupy a slot — `working` AND `quiet`; only `prunable` does not.** `quiet` means one
thing only: no file change inside `DEFAULT_LANE_QUIET_MS` (10 min). That is what a long test run, a
lane still inside ADR-002's `startupGrace`, and ADR-007's park all look like. **Quiet is not dead**,
and releasing on quiet would over-admit precisely during the two states this milestone introduces.
`prunable` is git reporting no tree at that path — there is nothing for a process to work in.
`dirty` is deliberately NOT consulted: uncommitted work is the sweep's never-remove rule, not an
occupancy signal, and a lane can be dirty and finished or clean and mid-build.

**The release is the lane's REMOVAL, never a timeout** — `cleanupDispatchLane` when the work merges,
or `aof work dispatch --sweep --remove` for a stranded one, which already refuses to remove a lane
holding uncommitted work. **The cost, stated rather than discovered:** a lane whose agent died holds
capacity until someone sweeps. That is the safe direction — the alternative silently over-admits —
the recovery verb already exists — the loop's own prompt already drives it (`continue.md` step 5:
*"When a lane's work is merged back, `aof work dispatch --cleanup <ref>`. If a run died, `aof work
dispatch --sweep` reports what was left behind"*) — and `--list` already names the lane, its state
and its last activity, so the holder is visible rather than mysterious. **The release path is
therefore already in service; what the amendment adds is that it now returns capacity.**

**And the cost NOT paid.** A liveness-based answer — `staleRunningRuns` / `isStale`, which FF-6908
permits READING (it forbids only writing) — would give 69/04 a dependency on 69/01 that it does not
have today, because `heartbeatAt` is `null` until that hook lands. It also answers a different
question: those predicates say a RUN looks dead, not that a LANE is free. The mtime-derived answer is
the lane's own evidence, and it is available now.

**Four rules the local door obeys** (the shape; the code is 69/04's):

1. **Admission is checked BEFORE a lane is materialised**, never after.
2. **Reuse consumes no new slot.** A ref that already holds a lane — or whose branch git holds in
   another tree (`resolveDispatchLane`'s door 1) — is already inside the counted set, so
   re-dispatching it is idempotent and MUST be admitted. A door that stops being re-runnable at the
   bound is a door no loop can be driven through.
3. **Each lane this invocation opens joins the count before the next member is admitted** — the same
   within-scan reservation the mesh half already needed, for the same measured reason: N members
   checked against one snapshot all pass.
4. **Over the bound is a REFUSAL the caller can act on** — per member, carrying a code, reported in
   the `dispatched[]` shape a failed lane already uses; never a throw, never a silent drop, and never
   a queue. The member is simply not opened, and asking again later is the whole retry story: the
   mesh half's *leave the row `assigned`* branch, spelled locally. `cleanupDispatchLane`'s
   `{ outcome: "refused", code }` is the shape this repo already uses to say no.

**What `dispatchReadySet` keeps** — a real but smaller job: it bounds the fan-out of lane
MATERIALISATION inside one invocation, and `peak`/`ranAtOnce` are exactly that. They are never
reported as agent concurrency, and no verdict about capacity is read off them.

**The bound still has ONE home**, and this amendment adds no second one: `work.dispatch.concurrency`
via `dispatchConcurrencyFromConfig` in `src/work-dispatch.mjs`, where `inspectDispatchLanes` already
lives; the door stays `src/commands/dispatch.mjs`. Measured on the graph today (`aof graph build .` →
already current, `builtAt 2026-08-22T13:35:24.476Z`, 11,887 nodes / 28,716 edges, egress none; then
`aof graph impact`): `src/work-dispatch.mjs` now has **three** `src/` dependents —
`commands/dispatch.mjs`, `commands/mesh-terminal-resume.mjs`, `mesh-assignment-reclaim.mjs` — where
§ Grounding measured one. **Three READERS of one home is ADR-001's rule holding, not breaking**:
`acd-dispatch-bound-single-home` names second SITES (a copied default, a re-implemented resolver, a
direct read of the configured key), never importers.

**Not double-counted with the mesh half.** The two counted sets are disjoint by construction: a local
lane lives at `.aof/mesh/dispatch-worktrees/<slug>` and a mesh assignment's tree at
`.aof/mesh/worktrees/<assignmentId>`, and `inspectDispatchLanes` filters to the former. An item at
work under a mesh assignment is counted once, by its row — and `resolveDispatchLane`'s door 1
REUSING that tree is exactly why reuse must not take a second slot (door rule 2 above).

**What the runtime now REFUSES — so 71 has something to point at.** `aof work dispatch` will not open
the (bound + 1)th lane on this machine: it answers *refused, at capacity*, and the ref stays ready.
It cannot stop an orchestrator that spawns an agent in no lane at all — that residue is prompt-layer
and **71's** — but the prompt's own step 3 goes through this door, so the sentence in `continue.md`
stops being the enforcement and becomes a description of it. **This milestone still rewrites no
prose** (ADR-004 rule 3, and the SPEC's own scope split).

**2. Mesh-wide: occupancy is proved by the ROW'S OWN STATE, and `dispatchedIds` is not a shadow
lease.** Review's second blocker: *"scheduler admission is not reserved across ticks/resume"*. The
counted set as first written was `state = 'running'` alone, with the pending-send reservation held
process-locally by the launcher across ticks. **A control-daemon restart drops that memory**, and
rows sitting in `accepted` — a real member of `ACTIVE_ASSIGNMENT_STATES`
(`src/assignment-record.mjs:40`), authored by the worker — were then counted by nobody, so the next
tick could over-admit. The membership rule is therefore **`accepted` OR `running`, and never
`code = 'needs-input'`**, in ONE home (`assignmentOccupiesDispatchSlot`), exported because that
decision table is the task's executable contract. A worker-authored `accepted` row is durable proof
that admission happened, and it is the only such proof that survives a restart. `dispatchedIds`
reverts to exactly what it always was — a **once-guard** within one launcher lifetime, deliberately
unpersisted — and must never be read as occupancy: carrying a successful send as occupancy across
ticks would let a sent-but-never-acknowledged row consume an unobservable slot forever. The one
interval no row can yet cover — directive sent, worker has not yet written `accepted` — is closed by
a **within-scan reservation**: the count increments on `result.sent` before the next row is
considered. (Measured on this tree at `0c41562`: this is what the tick now does.)

**3. RESUME RE-ACQUIRES — the park's release is not a right of return.** ADR-007's park takes the row
out of the counted set; nothing may put it back to work without taking a slot, or a resumed park
walks a target over its bound — the same over-admission through a different door. **The rule, which
is 69/04's definition and 69/05's contract:** a parked run's answer is admitted only if its target is
under the bound at the moment of admission; over the bound the run **stays parked** and the answer is
**refused with a code the human can act on and retry** (`resume-capacity-full`) — never queued, never
silently admitted, never a second run. Re-acquisition and un-parking are ONE transaction over the
same rows the tick counts (leaving `needs-input` IS joining the counted set), so two concurrent
answers cannot both observe the last free slot. **The mechanism is 69/05's** — ADR-007's own
amendment already routes it (*"a target at its bound refusing an answer is 69/04's door, not
69/05's"*) — and the rule is here, which is the split this milestone drew and keeps.

**4. One rule now covers both surfaces, which is what makes this reviewable.** *Admission is a count
over durable facts the work itself already produces — git's worktree list locally,
`global_assignments` across the mesh — plus a within-scan reservation for the interval before that
fact exists.* Neither half persists anything **for the purpose of counting**, so FF-6908 is untouched
and stays true: **the lane is not a lease.** It is the tree the work happens in, created because the
work needs it and removed when the work lands; its state is READ, never written, and no per-slot
object with its own lifecycle is introduced on either surface.

**Consequences.** "At most `bound` at once" becomes a property of two durable records any process can
read — git's worktree list and `global_assignments` — rather than a request to a model or a count
living inside one command's memory. The instrumentation `dispatchReadySet` was written with stays
readable evidence of MATERIALISATION and stops being mistaken for evidence of agent concurrency. And
an operator verb becomes load-bearing: `aof work dispatch --sweep` is how a machine gets its capacity
back after a lane's agent dies, which is the price of counting the lane rather than a liveness claim.

---

## ADR-007 — A run waiting on a human releases its slot, through the park that already exists

**Status.** Accepted.

**Context.** Blocked-on-human is the **largest recorded lost-time category in all six instrumented
milestones** — 107h28m (m47), 58h05m (m48), 46h38m (m50). Today a `needs-input` outcome calls
`sendAssignmentStatus(assignmentId, "running", { code: "needs-input" })`: the row stays live, the
slot stays held, and a blocked run is indistinguishable to the scheduler from an eleven-hour one.
Worse, m42's live-question path holds the **PTY itself** open while a pending `AskUserQuestion`
out-waits the 15-minute idle window.

The parking machinery already exists, built for a different cause: `resumeAfter`,
`parseResumeAfter`, `DEFAULT_PARK_MINUTES`, `retryReadiness`, the `retry-parked` loop stop, and the
`--resume` re-attach path whose own comment reads *"a needs-input park is the same run resuming,
never a second record."*

**Decision.** One park concept, two causes. A blocked run parks through the same gate a
session-limited run parks through.

- **Detection is immediate, with the heartbeat as backstop.** — **SUPERSEDED by the 2026-08-22
  amendment below: silence is not the park's backstop.** `HUMAN_INPUT_TOOL_NAMES` already
  detects a pending question directly, so the park does not wait 15 minutes. A block the detector
  misses still parks, because a session waiting on a human produces no tool-result events and
  ADR-003's heartbeat deadline expires on its own. **No fifth timeout is introduced.**
- **The process terminates; the conversation does not.** `sessionId` is already persisted (68/01)
  and `--resume` already re-attaches a new process to the same persisted conversation. The park
  writes nothing new to do this.
- **The run stays `running`; the row leaves the counted set.** No new run state, no new failure
  reason, no retry lineage — a resumed park is the same run, and `RETRYABLE_REASONS` would have
  turned it into a second attempt. ADR-006's counted set already excludes the `needs-input` code.
  **And it RE-ACQUIRES one on resume — ADR-006's 2026-08-22 amendment, clause 3: the release is not
  a right of return.** The rule is 69/04's definition; applying it at the answer is 69/05's mechanism.
- **`on-max-attempts: pause`, not kill.** An exhausted run preserves its worktree. Half of this is
  already true and pinned: `removeWorktree(…, { force: true })` exists **only** on the `done`
  branch, guarded by `acd-worker-driver-no-headless-print` invariant 5. What this milestone adds is
  that exhaustion is *reported as preserved-for-triage* rather than as an indistinguishable
  `failed`.

**AMENDMENT — 2026-08-22 (architect review; two blockers against 69/05).** Two clauses above were
wrong in a way the build could not repair, and both are corrected here rather than in the code.

1. **Silence is NOT the park's backstop — the explicit detector is the whole of it.** The clause
   above read *"a block the detector misses still parks, because … ADR-003's heartbeat deadline
   expires on its own."* That is the same expiry ADR-002 gives `heartbeat`, whose terminal
   behaviour is **kill and retry**. One signal cannot carry two terminal behaviours, and the
   runtime cannot read human intent out of silence: a session that has stopped producing tool
   results is observationally identical whether a human is thinking or the process is wedged. So a
   block the detector misses is a `timeout` on ADR-002's table — killed and retried like any other
   — and when the attempts exhaust, `on-max-attempts: pause` preserves the worktree and the
   conversation. The park is exactly as good as `HUMAN_INPUT_TOOL_NAMES`, which is the honest
   statement of it, and 69/02 keeps the silence path undivided. **Still no fifth timeout.**

2. **The park is a capacity FACT — published once, after a confirmed exit. Posture is not
   capacity.** Two defects, one rule.
   **(a)** The live-question seam publishes the capacity-releasing code mid-flight
   (`mesh-worker-execution.mjs:1730`) while the PTY is still alive and still answerable in place
   through m42's live-input path. ADR-006's counted set excludes any `needs-input` row, so the
   machine is double-booked: work is admitted onto a node still hosting the blocked session. The
   pending question may still be SURFACED before exit — the board's "waiting on you" is posture and
   stays — but posture must not move the counted set.
   **(b)** The settle publishes through the durable `assignment.reported` outbox, whose reactor
   refuses every non-terminal state (`state-not-terminal:running`, `effects/table.mjs`). The park is
   therefore carried durably, discarded on arrival, and acked as paid for a row it never changed —
   strictly worse than no durable channel, because the sender records success. ADR-006's *"posture
   is best-effort and belongs on the status frame"* holds for `accepted`/`running`; it does **not**
   hold for the park, the one non-terminal report in this system that MOVES CAPACITY. The reactor's
   admitted set therefore names the park edge explicitly — `running` carrying the `needs-input`
   code — and nothing else non-terminal.

**And its mirror: the resume's clear lands BEFORE the spawn.** The park's code is the thing that
releases capacity, so it must arrive only once the process is gone — and be cleared only before a
process exists again. Both orderings serve one property: **the counted set never under-counts a
live process.** Whoever holds the admission authority then reads a set that is never wrong. This
milestone introduces **no second concurrency-resolution site here** (FF-6907): a target at its bound
refusing an answer is **69/04's door**, not 69/05's, and 69/05 stays dependency-free because a
publish ordering needs nobody's authority to be correct.

FF-6909 pins clause (2) and the resume's clear-before-spawn ordering; clause (1) is contract
material and lives in 69/05's task 00.

**Consequences.** The single largest lost-time category stops consuming capacity. A human answering
a question hours later resumes the same conversation rather than paying a cold restart.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 69 is open and is NOT admitted at accept —
     `aof work doctor 69` reports each unresolved control as `control-unresolved`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was
     changed to make it fail, and the message observed.

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in the suite registry inside its own labelled story block. A suite
     exported under the wrong key is never invoked.

     FOUR OF THE ELEVEN EXTEND A GUARD ALREADY IN SERVICE (FF-6901, FF-6904, FF-6905 — guards that
     predate this milestone; FF-6911 — 69/04's OWN landed guard, extended by the 2026-08-22
     amendment) — the file named is the one already passing, and the extension lands in it. For those
     four the red probe is the ONLY evidence the extension is armed.

     FF-6907 LANDED (18d642f) and therefore no longer carries `pending`. ADR-006's 2026-08-22
     amendment RESTATED its invariant to what the landed control actually asserts: the discredited
     clause — "`dispatchReadySet` has a production caller", read as the admission authority — is now
     FF-6910's subject, declared here with its intended path and `pending` until that file lands. A
     restated invariant with a landed file is not a cleared one; FF-6910 is the part still owed.

     NOT here (these are task .feature material — observable behaviour over the real seam):
     "a second review round without a named blocker is refused", "a run that stops producing tool
     results is reaped", "a parked run frees a slot", "the ledger reports no progress after two
     identical rounds", "a machine at its lane bound refuses the next dispatch and the ref stays
     ready", "a parked run's answer is refused while its target is full". -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-6901 | **One bound home, and the two that already exist are not annexed.** Every deadline and loop-cap value resolves through `src/loop-bounds.mjs`; no second `DEFAULT_*`/`resolve*` pair for the same concept exists in `src/**`; and `work.dispatch.concurrency` and `work.autonomous.maxAttempts` keep their pre-existing readers. The existing cap single-home guard is **EXTENDED**, never joined by a sibling. | `test/arch/acd-loop-cap-single-home.test.mjs` *(extended)* | ADR-001, ADR-002 |
| FF-6902 | **No framework loop record declares `uncapped`.** Every `ceiling:` under `src/bundle/loops/*.md` is `none` or a pointer list, and every `config:` pointer names a key the resolver actually resolves — a ceiling pointing at nothing is a finding, not a declaration. | `test/arch/acd-no-uncapped-framework-loop.test.mjs` | ADR-001 |
| FF-6903 | **Liveness is consumed, never pinged.** No module in `src/**` schedules a periodic self-stamp of `heartbeat()`; its production caller is the hook-fed path, and the staleness threshold resolves to the ONE constant ADR-002 declares rather than a second copy. | `test/arch/acd-heartbeat-by-consumption.test.mjs` | ADR-003 |
| FF-6904 | **Every bundled hook derives nothing.** The clause set already proven for one hook body holds for **all** of `src/bundle/hooks/*.mjs`: no `src/` import, no store open, no workspace-identity derivation, exec form, exit 0 on every path. The existing single-hook guard is **EXTENDED to the class**. | `test/arch/acd-artifact-sync-hook-derivation-free.test.mjs` *(extended)* | ADR-003 |
| FF-6905 | **Enforcement is out-of-process and no bound is passed to the model.** No `--max-turns`, `--max-budget-usd`, `-p`, `--print` or `--output-format` argv is constructed for the `claude` driver anywhere in `src/**`; the deadline is armed against a held process handle. The existing launch-argv guard is **EXTENDED**. | `test/arch/acd-worker-driver-no-headless-print.test.mjs` *(extended)* | ADR-004 |
| FF-6906 | **Progress is measured, never judged.** `src/loop-progress.mjs` imports no agent/model/prompt surface and reads only deterministic signals; its writer is append-only and opens no existing sample file for truncation. | `test/arch/acd-progress-measured-not-judged.test.mjs` | ADR-005 |
| FF-6907 | **One production admission door per surface, and each consults its bound before it opens work.** Exactly one production path in `src/**` opens a local dispatch lane (`resolveDispatchLane`) and exactly one admits an assignment directive (`dispatchDirective(buildDirectiveFrame(…))`); the local door's bound-carrying pool call precedes its lane open; the mesh tick derives its counted set from assignment rows and tests it BEFORE the send; the control scan has exactly one production scheduler, serialized through an in-flight tail no failed tick can poison; and `work.dispatch.concurrency` keeps its pre-existing one home. *(The pool call preceding the lane open is a MATERIALISATION-ORDER property and is not by itself an admission authority — FF-6910 carries that. See ADR-006's 2026-08-22 amendment.)* | `test/arch/acd-slot-before-admission.test.mjs` | ADR-006 |
| FF-6908 | **No lease store, and the run record gains nothing.** No module opens a lease table, claim file or per-slot persisted object; and this milestone adds no key, state or transition to `src/run-store.mjs` — the record's key set and `LEGAL_TRANSITIONS` are byte-unchanged. | `test/arch/acd-no-lease-store-run-record-untouched.test.mjs` | ADR-006, ADR-007 |
| FF-6909 | **The park is published once, after exit, and the channel that carries it applies it.** In `src/**` no assignment-status frame carrying the `needs-input` code is constructed from a path holding a live PTY handle (the live-question seam reports posture without it); every park publish sits on an exit-confirmed settle path; the durable `assignment.reported` reactor names the park edge (`running` + `needs-input`) in its admitted set rather than refusing it as non-terminal, and admits no other non-terminal state; and the park's code is cleared before a resumed process is spawned, never after. | `test/arch/acd-park-published-once-after-exit.test.mjs` | ADR-006, ADR-007 (2026-08-22 amendment) |
| FF-6910 | **The local slot is the LANE, and it is counted before one is materialised.** The dispatch door derives its counted set from the lanes git reports under the dispatch root (`inspectDispatchLanes`, `prunable` excluded) and consults it BEFORE any lane is opened — the counted-set read precedes both the pool call and `resolveDispatchLane`; an over-bound member is REFUSED with a code in the reported result rather than opened, thrown or dropped; and no lane-occupancy fact is persisted anywhere but git's own worktree list — no second lane registry, no occupancy file, no run-record write. | `test/arch/acd-lane-is-the-local-slot.test.mjs` | ADR-006 (2026-08-22 amendment) |
| FF-6911 | **Every door that starts OR RESUMES work on a target consults the one counted set.** Occupancy membership has a single home (`assignmentOccupiesDispatchSlot`): no other module in `src/**` re-spells the `accepted`/`running`/`needs-input` predicate to decide capacity, and no path treats the unpersisted once-guard set as occupancy. Every production path that can put a target back to work — the tick's directive send AND the parked-answer resume — reads `countDispatchSlotsByTarget` against the bound before it sends, and the whole-`src` closure ENUMERATES those doors, so a new one fails the gate instead of bypassing it silently. 69/04's own admission guard is **EXTENDED**, never joined by a sibling. | `test/arch/acd-slot-before-admission.test.mjs` *(extended)* | ADR-006 (2026-08-22 amendment), ADR-007 |

## Story partition

Drawn from the `graph impact` measurements in § Grounding, not from the SPEC's bullet order.

| Story | Subject | Graph rationale | Depends |
|---|---|---|---|
| **69/00** `the-declared-cap` | The number four milestones are waiting on, declared and resolvable | New pure leaf `src/loop-bounds.mjs` (**0 deps**) + `src/work-loop.mjs` (**0 deps, 1 src dependent**) + `src/work-loops.mjs` (3 src dependents, all `loops-*` commands) + two framework records. Nothing it touches is imported by anything that another story touches. | — |
| **69/01** `heartbeat-by-consumption` | The producer that was never wired, wired by consumption | New bundle hook asset (**no inbound edges**) + the driver's **env** seam (the one 68/01 already extended, after the scrub) + the tick's **reclaim** half. | 69/00 |
| **69/02** `the-four-deadlines` | Deadlines aof enforces against a handle it holds | `driveInteractiveClaudeSession` — the **only** function holding a PTY handle — plus its two production callers' driver-call seams. Disjoint from 69/01 by function: 01 owns the env, 02 owns the session lifetime. | 69/00 |
| **69/03** `progress-not-liveness` | The signal a heartbeat cannot give | New pure leaf `src/loop-progress.mjs` (**0 deps**) + a sibling NDJSON `readRuns` skips by construction. Reuses `laneChanges` read-only. Touches no shared writer. | 69/00 |
| **69/04** `slots-before-work` | A slot acquired before work is accepted, on both surfaces | `work-dispatch.mjs`'s `dispatchReadySet` (**1 src dependent**) + `commands/dispatch.mjs`; and the tick's **dispatch** half, extending its existing leave-it-assigned branch. | — |
| **69/05** `blocked-releases-its-slot` | The largest measured lost-time category stops holding capacity | `mesh-worker-execution.mjs`'s needs-input seam (3 src dependents, edited at that seam only) + the driver's pending-question detector + (2026-08-22 amendment) the `assignment.reported` reactor's admitted set in `src/effects/table.mjs`, which no other story here touches. Consumes ADR-006's counted-set definition as a **contract**, not as code, and introduces no concurrency-resolution site of its own — which is what keeps it dependency-free. | — |

**Sequencing.** **69/00, 69/04 and 69/05 start together.** 69/04 needs nothing from 69/00 —
the concurrency bound keeps its existing home (ADR-001's non-annexation rule), so there is nothing
to wait for. 69/05 needs nothing either: the code it parks on is already written. **69/01, 69/02 and
69/03 follow 69/00**, which supplies the resolver each reads. That is 3-wide, then 3-wide.

**The two declared overlaps.** Both are named here rather than discovered later, because STATE
records the exact failure this repo has already paid for — two stories an architect had partitioned
as independent both editing one file, ×9 and ×8.

1. **69/01 and 69/04 both edit `src/mesh-assignment-reclaim.mjs`** — 01 the reclaim half, 04 the
   dispatch loop. These are already two separate function bodies that do not call each other (68
   proved this cut on `work-observe.mjs`). Whichever lands second rebases rather than re-derives.
2. **69/01, 69/02 and milestone 70/01 all touch `src/agent-session-driver.mjs`** — three distinct
   halves: 69/01 the spawn **env**, 69/02 the **session lifetime**, 70/01 the launch **argv**. The
   cross-milestone half matters most: **69 and 70 are sibling children of 68 and may run
   concurrently.** 70/01 edits `resolveInteractiveDriverLaunch`; 69/02 edits
   `driveInteractiveClaudeSession`. Different functions, ~60 lines apart. Named, not assumed.

**A THIRD overlap, added 2026-08-22 with ADR-006's amendment — named here rather than discovered at
the next review.** 69/05's resume door (`src/commands/mesh-terminal-resume.mjs`) READS 69/04's
counted set: `countDispatchSlotsByTarget` and `dispatchConcurrencyFromConfig`. Measured on the graph
(`aof graph impact`, artifact `builtAt 2026-08-22T13:35:24.476Z`), the edge is **one-way** — the
resume door imports the definition; the definition imports nothing of 69/05's — so the split holds:
the admission RULE is 69/04's, the resume MECHANISM is 69/05's. The same measurement re-reads the
69/04 row above: `src/work-dispatch.mjs` now has **three** `src/` dependents where § Grounding
measured one, all of them READERS of the one bound home. 69/04's subject also widens with the
amendment — it now reads `inspectDispatchLanes`, which lives in the file it already owned, so the
partition itself is unchanged.

**What no story owns, deliberately.** The prose bound in `continue.md`, the review-round wording,
and findings-become-work-items are **71**'s (the SPEC's own scope split). 69 makes the bound real in
the runtime; 71 makes the prompts agree with it. A reviewer can refuse a prompt-layer edit in this
milestone on that sentence alone.
