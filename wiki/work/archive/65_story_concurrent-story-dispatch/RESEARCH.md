---
type: research
number: 65
slug: concurrent-story-dispatch
title: "Where the loop's wall-clock actually goes"
owner: researcher
created: 2026-08-15
updated: 2026-08-15
schema: 1
aofVersion: 0.1.0
---
<!--
  RESEARCH.md — measured facts that a decision rests on. No decisions here (those are ADRs),
  no scope (that is the record doc). Every number names the artifact it came from so it can
  be re-run and disagreed with.
-->
# 65 · Where the loop's wall-clock actually goes

## Method, and what these numbers are not

Every figure below comes from `aof work observe <ref>`, which derives per-agent timing from Claude
Code session transcripts under `~/.claude/projects`. Seven reports are committed artifacts; two
were regenerated live on 2026-08-15 and are marked as such.

Three caveats, because they change how the numbers read:

1. **Calendar span is not machine time.** It is first-agent-start → last-agent-end, so it swallows
   overnight gaps, meals and the operator's day job. A 644h span is not 644h of anything. The
   honest quantity is the **serial-chain cost** — chain total minus its longest link — which is the
   wall-clock a parallel run would have handed back and nothing else.
2. **Per-milestone attribution is loose.** Agents are matched to a milestone by transcript
   proximity, so chains bleed across milestones: milestone 38's developer chain contains
   `Build story 48/01`, `Build story 49/00` and `Build story 49/03`. Read the chains as "the
   developer role over this window", not "this milestone exactly".
3. **Stall threshold is a parameter.** All reports here use the 10m00s default. Raising it moves
   time from "idle" into "active" and shrinks the reported grind; it does not move serial-chain
   cost, which is computed from overlap, not from idleness.

## The measured landscape

| item | span | real active | idle | parallelism | source |
|---|---|---|---|---|---|
| 38 cross-machine-worker-execution | — | — | — | **1.24×** | regenerated 2026-08-15 |
| 45 ui-app-shell-routing | 25m21s | 25m21s | 0s | — | committed |
| 47 fleet-repo-filter | 644h47m | 9h49m | 634h58m | 1.78× | committed |
| 48 fleet-session-identity | 79h03m | 5h02m | 74h00m | 1.47× | committed |
| 49 terminals-home | 126h46m | 9h25m | 117h21m | 1.94× | committed |
| 50 session-launcher | 122h54m | 2h29m | 120h25m | **1.00×** | committed |
| 52 loop-registry-and-graph | 143h07m | 3h13m | 139h54m | 1.85× | committed |
| **vista-app-web 352** multi-provider-agent-templates | **25h12m** | 17h44m | 7h28m | 1.43× | committed, other repo |

`1.00×` means strictly one-at-a-time. The aggregate figures flatter the picture: a milestone reads
`1.94×` overall because QA fans out across stories while the **developer builds never do**.

## Issue 1 — independent story builds run one at a time

The cost of serialising, per role, from each report's own serial-chain table. `cost` is
chain-total minus longest-link: the wall-clock a parallel run returns.

| item | role | links | chain total | longest link | **cost** |
|---|---|---|---|---|---|
| **vvw 352** | aof-developer | 6 | **12h59m** | 2h48m | **10h11m** |
| 38 (live) | aof-developer | 30 | 18h14m | 1h54m | **16h20m** |
| 38 (live) | aof-architect | 20 | 5h53m | 43m50s | 5h09m |
| 47 | aof-developer | 8 | 5h06m | 1h11m | 3h54m |
| 47 | aof-architect | 8 | 3h34m | 36m55s | 2h57m |
| 49 | aof-qa | 10 | 3h20m | 39m16s | 2h41m |
| 49 | aof-architect | 10 | 3h09m | 48m44s | 2h20m |
| 49 | aof-developer | 7 | 2h55m | 47m00s | 2h08m |
| 48 | aof-architect | 6 | 2h03m | 25m56s | 1h37m |
| 48 | aof-developer | 5 | 1h44m | 29m04s | 1h15m |

**vvw 352 is the cleanest case** because the milestone was built in one window with no
cross-milestone bleed: nine stories, six developer builds, `1.00×`, chain
`352/01 2h11m → 352/02 2h12m → 352/03 1h47m → 352/04 2h48m → 352/05 1h44m → 352/06 2h15m`.
**10h11m of a 25h12m span was serialisation alone** — 40% of the entire milestone.

**The architect is serialised in every single report** (`1.00×` in 38, 47, 49, 50, 52). Structural
reviews of independent stories have no reason to queue; they queue because the loop hands the
reviewer one story at a time, the same root cause.

**Why the loop cannot do better today.** `depends` is built and validated only `if (isDriver(item))`
— milestone/uat/spike/chore (`src/work.mjs:339`, guarding `:751` and `:811`) — so a story's
`depends` parses and is discarded. `nextWork` returns on the first not-done story
(`src/work.mjs:999`), so `aof work next` answers with exactly one item. Story independence exists
only as italic prose in a `SPEC.md` (`*(depends 00, 01)*`) and as `ARCHITECTURE.md` partition
sections. Nothing a command can read records what may run at once, so one-at-a-time is the only
**safe** order available — this is a missing-data problem wearing a scheduling problem's clothes.

**And the safety concern is not theoretical.** In vvw 352, `src/sandbox/provisionSandboxAgent.ts`
was edited **×9** during the `352/02` build and **×8** during the `352/05` build — two stories the
architect had partitioned as *independent*. A partition's independence claim is not reliable, so
concurrency without per-story worktree isolation would have corrupted that file. `src/mesh-worktree.mjs`
already implements worktree-per-item, branch-per-item, cleanup-on-done and stranded recovery; it is
reachable only from assignment dispatch (`src/mesh-worker-execution.mjs:2444`) and the session lane
(`src/mesh-session-spawn-handler.mjs:136-151`, which already handles the concurrent-`add` race).

**Nothing dispatches from code.** The builds were spawned by a session executing
`src/bundle/commands/continue.md:59`. That prompt names "the parallelism across independent
stories" at `:30` as a reason to prefer orchestrated mode, but is never told what may run at once.

## Issue 2 — grind: the fix-test-rerun loop and file thrash

**Not this story's target.** Recorded so the serialisation number is not read as the only problem.

- Toolchain wait as a share of active time, worst observed per agent: **90%**, then 44%, 39%, 35%,
  35%, 33%. An agent at 90% toolchain wait is not thinking; it is waiting for a test command.
- File thrash — one file edited repeatedly inside a single agent run: **×70**, ×60, ×41, ×39, ×36,
  ×34, ×33, ×26. In vvw 352, `shared-behaviour-still-syncs-every-provider.spec.ts` ×14 and
  `provisionSandboxAgent.ts` ×9 in one build each.
- vvw 352's own §Why slow attributes 33–44% of active time to toolchain wait across four builds,
  with the same command re-run 35× in one agent run.

Concurrency **multiplies** this rather than fixing it: six agents each at 40% toolchain wait, run
at once, contend for the same test runner. This is `PRD-acd-loop-performance.md` territory and is
the reason the ready set must be a *bound* set, not an unbounded fan-out.

## Issue 3 — dead air, and no watchdog

**Not this story's target.** Dead air = the main thread quiet, nothing driving, no human asked.

| item | dead air | share of span |
|---|---|---|
| 47 | 31h20m | 5% |
| 49 | 15h06m | 12% |
| 52 | 10h35m | 7% |
| 50 | 6h58m | 6% |
| **vvw 352** | **6h06m** | **24%** |
| 48 | 5h58m | 8% |

Milestone 49 records single dead-air windows of 6h55m and 58m50s that woke on their own, and agents
idle up to 4h01m *after* reporting. Nothing in aof notices a stalled agent; the operator does,
eventually. A concurrent loop makes this **worse**, because a stall in one of six lanes is far less
visible than a stall in the only lane.

## Issue 4 — the run stops and stays stopped

**Not this story's target**, and the largest single number in the whole dataset.

| item | blocked waiting for a human | infra kills | cost of those kills |
|---|---|---|---|
| 47 | 107h28m (17%) | 6 | 36h20m |
| 48 | 58h05m (73%) | 4 | 35h04m |
| 50 | 46h38m (38%) | 2 | 20h55m |
| 49 | 39h06m (31%) | 1 | 16h48m |
| 52 | 22h28m (16%) | — | — |
| **vvw 352** | 35m03s (2%) | 1 | 0s |

Milestone 49's single largest loss is one API session-limit kill at 23:46Z that nothing restarted
until a human noticed **16h48m** later. vvw 352 is the outlier in the good direction — 2% blocked —
which is *why* its serialisation cost is so visible: with the human wait removed, one-at-a-time
becomes the dominant term.

## What this story does and does not address

**Addresses.** Issue 1, in three parts: story `depends` as data so the ready set is *safe*;
`aof work next` answering with the whole ready set so a dispatcher can *see* it; per-story worktree
isolation so dispatching it concurrently is *sound*.

**Does not address.** Issue 2 (grind — `PRD-acd-loop-performance.md`), Issue 3 (a stall watchdog),
Issue 4 (restart-after-infra-kill). Each is separately measured above and separately worth doing.

**Depends on nothing.** The ready set is *what the CLI answers*; every dispatcher reads it — the
prompt loop that exists today, and any code-owned loop that may exist later. vvw 352 was measured on
the shipped bundle in a repo that knows nothing of this repo's roadmap.

## Open questions the data cannot answer

- **What is the right concurrency bound?** Issue 2 says it is not unbounded — six agents at 40%
  toolchain wait contend. No measurement here fixes the number; it wants a soak.
- **How often does a partition's independence claim actually hold?** One counter-example is
  measured (vvw 352, two stories one file). One example is enough to require isolation and not
  enough to predict the rate.
- **Does concurrency change the grind rate per agent?** Unknown. Contention could raise toolchain
  wait per lane while still lowering total wall-clock.
