# RESEARCH — Agent loop economics

**2026-08-16.** Subject: why the aof loop is slow, what the evidence actually says, and what every
comparable system does that aof does not.

Commissioned after [`ISSUE-why-a-simple-story-costs-three-hours.md`](../issues/ISSUE-why-a-simple-story-costs-three-hours.md).
That issue diagnosed one story. This re-derives the picture from every telemetry artefact on disk,
audits the prompt layer and the runtime independently, and surveys the state of the art.

Three independent passes were run over the repo — prompt layer, telemetry, runtime code — plus a
primary-source survey of coding-agent harnesses and durable-execution engines. Where the passes
disagree with the issue doc, the issue doc is corrected below.

---

## 0 · The headline

**aof spends 316 input tokens for every output token, and 7.4% of its calendar on work.**

Corpus: the six milestones that have an `observability/agents.json` on disk — 45, 47, 48, 49, 50,
52 — deduplicated to **125 unique agent runs** (18 rows appear in two milestone reports each; see
§5.6). Every figure below was recomputed from the raw records, not taken from a report.

| Measure | Value |
|---|---:|
| Calendar span | 675.2 h |
| **Union of active agent time** (windows minus recorded stall gaps) | **50.04 h — 7.4% busy, 92.6% idle** |
| Σ per-agent `activeMs` | 45.01 h |
| Σ agent stall time | **97.44 h**, across 22 of 125 runs |
| Output tokens | 9,271,950 |
| **Cache-create tokens** | **115,948,532** |
| **Cache-read tokens** | **2,812,920,653** |
| Cache-create **per agent spawn** | **927,588 tok ≈ 3.6 MB of text** |
| Cache-read **per turn** | 182,895 tok ≈ 715 KB (15,380 turns) |
| Context-in : output ratio | **315.9 : 1** |
| Tool calls | 9,353 — Bash 4,140 · Read 2,698 · Edit 1,331 · Grep 618 · Write 520 · Glob 34 |
| Error-ish tool results | 931 (**10.0%**) |

And what `aof work observe` itself reported per milestone (its own `summary` block, verbatim — these
overlap, so they do not sum):

| m | Span | Active union | Parallelism | Agents | Stalled | Grinding | Blocked on human | Dead air | Infra kills | Serialisation cost | Output | Gov % |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 45 | 25m | 25m | 1.00× | 1 | 0 | 0 | 47m | 0 | 0 | 0 | 56k | 100 |
| 47 | 644h47m | 9h49m | 1.78× | 42 | 10 | 16 | **107h28m** | 31h20m | 6 | 10h50m | 3,310k | 62 |
| 48 | 79h03m | 5h03m | 1.47× | 23 | 4 | 7 | 58h05m | 5h58m | 4 | 3h24m | 1,337k | 52 |
| 49 | 126h46m | 9h25m | 1.94× | 45 | 11 | 16 | 39h06m | 15h07m | 1 | 8h00m | 3,881k | 51 |
| 50 | 122h54m | 2h29m | 1.00× | 6 | 2 | 2 | 46h38m | 6h58m | 2 | 31m | 448k | 55 |
| 52 | 143h07m | 3h13m | 1.85× | 26 | 2 | 4 | 22h29m | 10h35m | 0 | 1h03m | 1,584k | **84** |

**Blocked-on-human is the largest recorded lost-time category in all six**, and that wait
currently holds a concurrency slot. **Governance outweighs build** in four of six.

The issue doc's framing — "every phase re-orients from zero, ≈610 KB re-read five times" — is
directionally right and **quantitatively too kind by roughly 5×**. The re-read is not 610 KB per
phase. It is **3.6 MB per spawn**, and it is paid at the cache-**write** rate because nothing aof
does allows a spawn to read a prefix anyone else already paid for.

That single number is the arc. Everything else is a multiplier on it.

---

## 1 · What the evidence confirms, and what it refutes

The issue doc's two root causes both survive. Four of its supporting figures do not. Correcting
them matters, because three of them point at the wrong lever.

| Claim | Verdict | The measured truth |
|---|---|---|
| Every phase re-orients from zero | **CONFIRMED, understated** | Not 610 KB/phase — 3.6 MB/**spawn**, 715 KB re-presented per **turn**. m52's `ARCHITECTURE.md` (175,955 B) was read **46×**; m49's (216,910 B) **78×**; m47's `DESIGN.md` **53×**. Floor figures — `hotFiles.read` keeps only the top 6 files per agent (`src/work-observe.mjs:269`). |
| The build loop has no stop condition | **SPLIT** | Build *has* a terminator (`continue.md:108-109`, "until every … scenario is green"). **Review has none.** `continue.md:118-120` names three lanes and "apply confirmed fixes" with no round cap, no re-review bound, no exit criterion. `code-review.md:77-81` says "**Repeat until no blocking finding is open**". The cap belongs on review, not build. |
| Rounds 2–5 were escalation nobody requested | **CONFIRMED** | m66 records five closure rounds (ADR-008…ADR-012) and "two review rounds" per story: 61 story findings + 30 refine findings against 59 verification rows. Round five's own record: *"milestone 66 was refused by the gate milestone 66 shipped."* Nobody asked. |
| 6h54m of dead air | **NOT REPRODUCIBLE** | No milestone totals 6h54m. Totals are m47 31h20m, m49 15h06m, m52 10h35m, m50 6h58m, m48 5h58m. A single **6h55m50s** gap exists (2026-08-13T02:32Z) and is billed to both m47 and m49. **"No watchdog" is confirmed**: `endedBy:"run"` — nothing noticed — accounts for 34/53 gaps in m47, 20/30 in m49, 29/39 in m52. |
| 16 agents stalled | **REFUTED** | 16 is the **grinding** count, not the stall count. m47: 10 stalled / 16 grinding. m49: 11 / 16. Deduped: **22 of 125 stalled** (35 events, 97.4 agent-hours frozen), **38 of 125 grinding**. `observe.md` explicitly forbids the conflation. |
| Parallelism 1.39× | **REFUTED** | No such figure on disk. Recorded: m45 1.00×, m47 1.78×, m48 1.47×, m49 1.94×, m50 1.00×, m52 1.85×. From run records m66 is **1.02×** — a 4-story milestone whose ARCHITECTURE declared a parallel partition and then ran serial. |
| 33% of active time on the toolchain; 61 runs at 55s | **REFUTED — and the metric is broken** | Measured: 114 classified runs, 1,419,578 ms, **avg 12.5 s, 0.76% of Σ active**. All-tool wait is **7.15 h = 15.9%**. **Zero** of 60 grind reasons were toolchain-related. Cause: `TOOLCHAIN_RE` (`src/work-observe.mjs:67-68`) matches `npm test`/`vitest`/`jest` — and `.claude/rules/build-deploy-restart.md:150-153` **forbids** `npm test` in this repo. Every real run is `AOF_GLOBAL_HOME=$(mktemp -d) node …`, classified `"bash"`. Reclassified by content: **340 test-ish calls averaging 30.5 s**, worst `scripts/check.mjs` at ≥600 s. |
| `aof work observe <NN>/<SS>` fails | **CONFIRMED, with the line** | `resolveMilestoneFolder` (`src/work-observe.mjs:988-1006`) reads only the top level of `wiki/work`. Executed: `"52"` → folder; `"52/00"` → `null` → throws `milestone-not-found` (`:1020-1024`). The substring branch also makes bare `"00"` resolve to *milestone* 00. |

**The correction that changes the plan:** the toolchain is *not* where the time goes. Model
generation is **84.1%** of agent-active time; all tool wait is 15.9%. The PRD's "(e) targeted test
execution" was called the "highest-confidence, cheapest win" on the strength of a 46% figure from a
different repo. In *this* repo the measured number is 6%. It is still worth doing — but it is a
Tier-2 lever, not the headline, and the reason the number looked big is that a broken classifier
was reporting zero while a hand-written retro reported 33%.

---

## 2 · Where the money actually goes

### 2.1 By work class — building is 7%

Milestone 52, 26 agent phases, 1,584k output tokens:

| Phase class | Runs | Active | % | Output |
|---|---:|---:|---:|---:|
| **Re-applying contract deltas** (ADR-012/013 rework) | 13 | 136 min | **38%** | **662k (41.8%)** |
| Review (architect/qa/designer) | 3 | 72 min | 20% | 268k |
| Authoring contracts | 5 | 49 min | 14% | 218k |
| Architecture authoring | 2 | 49 min | 14% | 202k |
| **Build** | **1** | **23 min** | **7%** | **93k** |
| Design | 1 | 19 min | 5% | 102k |
| Research | 1 | 9 min | 3% | 40k |

Governance-vs-build output split across milestones: m52 **84/16**, m45 100/0, m47 62/38, m48 52/48,
m49 51/49, m50 55/45.

`aof-qa` is 51 of 125 runs, 28.6% of active time, **29.1% of tokens**. In m52 alone it is **58.6%**.

### 2.2 The single largest line item has a one-line cause

`aof-qa.md:6` grants `Read, Grep, Glob, Bash, Write` — **no `Edit`**. `aof-qa.md:31` then orders
*"Author features with `Write`/`Edit` — NEVER a script you wrote to edit them"*, and names the
consequence itself: *"the turn count (and token cost) rises several-fold for the same deliverable."*

To change three rows of a 25,451-byte `.feature`, QA must re-emit the whole file. Telemetry shows
it collapsing into exactly the forbidden path: one "Apply ADR-012 deltas" run wrote
`scratchpad/apply.mjs`, `align.mjs`, `final.mjs`, `edits.txt`, re-ran a node script ×5 with 4
error-ish results, for 74.6k output tokens. Thirteen such runs = **661.6k tokens, 41.8% of the
milestone**.

The write-side telemetry nobody reads confirms the shape. `.aof/artifact-sync-queue.ndjson` holds
4,950 Write/Edit events over 1,336 distinct paths — **3.71× write amplification**:

| Path | Writes |
|---|---:|
| `ui/src/terminal/TerminalControl.tsx` | 156 |
| **`wiki/work/66_…/ARCHITECTURE.md`** | **150** |
| `ui/src/fleet/Fleet.tsx` | 98 |
| `scripts/test.mjs` | 88 |
| `wiki/work/49_…/ARCHITECTURE.md` | 77 |

`ARCHITECTURE.md` is the most thrashed artefact class in the system — and m66's sits at exactly its
700-line budget with zero headroom (`STATE.md:113`), which is *why* round-three rulings were
smuggled into table rows instead of new ADRs. The budget is a `warn` (`src/work-doctor-budget.mjs:40-62`);
nothing truncates, nothing refuses.

### 2.3 Failure detection latency, not failure

| Run | Burned | Then | Ratio |
|---|---:|---:|---:|
| 47/01 | 11h07m → failed | 15.9 min → done | 42:1 |
| 47/02 | 11h07m → failed | 15.9 min → done | 42:1 |
| 45/03 | 9h34m → failed | 6h35m → done | 1.5:1 |
| 46/00 | **still `running` since 2026-08-08** | — | — |

22 hours of wall-clock produced nothing, and the work that replaced it took 32 minutes. This is not
a hard-problem signature. It is a missing deadline.

Of 20 stalls over 30 minutes, **8 begin with "You've hit your session limit."** Two agents froze for
**16.84 h each** on the same reset.

### 2.4 What grinding actually is

Interleave patterns across 125 runs: **write-first 112, batched 10, tight fix-test loop 3.**
Aggregate **18.0 edits per verified run**. Worst case, `Build story 49/05`: **199 edits / 1 test
run**, one file edited 70×, one command re-run 33×, 65 error-ish results, 593 turns, **9.43 M
cache-create tokens (~36 MB)** for 377k output, inside a 4h24m wall of which 2h41m was stalled.

Grind is not test-waiting. It is **editing without checking** — the exact failure mode SWE-agent's
pre-apply validation gate is worth 3 SWE-bench points against.

---

## 3 · The runtime, audited

Ten findings from reading the code, each with a citation. These are what the prompt layer is
sitting on top of.

1. **Every phase is a cold interactive PTY.** `resolveInteractiveDriverLaunch`
   (`src/agent-session-driver.mjs:619-658`) builds `claude --permission-mode auto
   --append-system-prompt <1.2 KB>`. Base args are `[]` (`src/terminal-providers.mjs:25`). **No
   `--model`, no `--effort`, no `--max-turns`, no `--max-budget-usd`, no `--bare`, no
   `--output-format`.** The directive is typed into the PTY as keystrokes 5 s after spawn
   (`:1027`, `INTERACTIVE_COMMAND_READY_DELAY_MS = 5000`).
2. **Nothing is passed by value.** The brief is `{ itemRef, worktreeCwd, task: item.title, command }`
   (`src/mesh-worker-execution.mjs:1619`). Every run record on disk reads `"brief": {}`. The
   spawn frame carries five scalars (`src/mesh-session-spawn-directive.mjs:10-20`). The prompt is
   `/aof:continue <ref>`.
3. **`--resume` exists and is used only for crash recovery.** Its single production site is the
   human re-attach path (`src/mesh-worker-execution.mjs:2131`), and it passes `command: null`.
   `src/agent-session-driver.mjs:915` records that resume "attaches a NEW process to the SAME
   persisted conversation" — the mechanism to reuse a warm conversation exists and is deliberately
   not used between phases.
4. **No bound of any kind.** No token limit, no turn limit, no wall-clock limit, no cost ceiling.
   The claude PTY path has **no timeout at all** (codex's 10-minute `execFile` timeout at `:1054`
   is dead for claude — `buildDriverCommand` returns `null` at `:77`). The loop registry knows:
   `wiki/work/loops/build-to-green.md:10` and `review-fix-rereview.md:10` both declare
   `ceiling: uncapped`, and `loop-ceiling-uncapped` (`src/work-loops.mjs:299`) is a `warn` gating
   nothing.
5. **The heartbeat is a producer that was never wired.** `run-store.heartbeat()`
   (`src/run-store.mjs:647-653`) has **zero callers in `src/`** — only six test files. So
   `heartbeatAt` is `null` from mint (`:356`) to terminal, `isStale` silently degrades to
   `updatedAt` (`:668`), which only moves on a state transition. A live run is indistinguishable
   from a dead one. `autonomous.md:57-59` instructs the operator to detect orphans by a field that
   is always null.
6. **Concurrency is enforced by prose.** `dispatchReadySet` (`src/work-dispatch.mjs:205-235`) — the
   only bounded worker pool in the repo, with `peak`/`ranAtOnce` instrumentation — **has no
   production caller**. `aof work dispatch` opens one lane and attaches `bound` (default 3,
   `:58`) as *a number for the model to read*. `continue.md:66-88` asks a language model to respect
   it. On the mesh side there is no bound at all: the control tick dispatches every `assigned` row
   whose target is connected, every 15 s (`src/mesh-launcher.mjs:1481-1487`).
7. **No "ready set of one → don't fan out" check exists** anywhere in `work.mjs`,
   `commands/next.mjs`, `work-dispatch.mjs` or `commands/dispatch.mjs`. A one-member ready set
   still pays a worktree, a cold session, a commit and a push.
8. **Worktrees discard their dependencies.** Clone is a **full** `git clone` (no `--depth`, no
   `--filter`, `src/mesh-worker-execution.mjs:776`). Nothing in the runtime installs dependencies,
   so the agent pays `npm install` on its own tokens — and `removeWorktree(…, { force: true })` on
   every `done` (`:1785`) throws `node_modules` away. The next story pays it again. No shared
   store, no cache, no pool.
9. **A 15-minute idle tax per undeclared completion.** `COMPLETION_IDLE_MS = 15 min`
   (`src/agent-session-driver.mjs:315`) vs `DECLARED_COMPLETION_IDLE_MS = 10 s` (`:319`). Which one
   a phase pays turns on whether the model remembered to print `AOF_DIRECTIVE_COMPLETE` — a
   prompt-compliance coin flip worth **14 min 50 s per phase**, up to ~45 min across
   refine + continue + verify on one story.
10. **Hooks are registered twice.** `SessionStart`, `UserPromptSubmit` and `SessionEnd` each have two
    matcher groups running the identical command (`.claude/settings.json:3-63`), so `aof session
    ping` shells **twice on every user turn** — each a cold Node boot through `src/cli.mjs`, which
    statically imports `work.mjs` (64 KB) and `command-core.mjs` (76 static imports). Add
    `PreToolUse` on every `Bash` call and `PostToolUse` on every write.

Also: **7 of 8 agent roles run on Opus**, including `aof-developer`, the highest-volume role. No
model is passed at spawn, so the orchestrator runs on Claude Code's default. `headroom` — the one
token-reduction seam in the codebase (`src/headroom.mjs:81`) — is wired only to the *human*
terminal route (`src/terminal-ws.mjs:481`), never to a worker.

---

## 4 · The prompt layer, audited

| Surface | Files | Bytes |
|---|---:|---:|
| `.claude/commands/aof/*.md` | 24 | 136,731 |
| `.claude/agents/*.md` | 9 | 38,399 |
| `wiki/*.md` doctrine | 11 | 83,414 |

Measured per-boot orientation, milestone 52: the invariant part (`ARCHITECTURE.md` + `SPEC.md`) is
**182,381 B ≈ 45.6k tokens**, re-read at every one of 30 phase boots — **≈1.37 M input tokens
re-reading two files that never changed between reads.** Story 66/02's build boot is 144,157 B; ×5
phases = **180k input tokens before a line is written.**

Six prompt-layer defects that cost measurably:

- **Review concurrency is never stated.** `continue.md:85` says "Spawn the builds together … and
  wait for all of them". `continue.md:118-120` — the review lanes — says no such thing. Measured
  consequence: `aof-architect` concurrency **1.00×**, serial-chain cost 30m46s; `aof-qa` 32m01s.
  **1h03m of pure serialisation in one milestone, on a lane one word would have parallelised.**
- **The design lane cannot succeed on this machine.** `continue.md:129` and `verify.md:91` both
  mandate `npx playwright screenshot`. `.aof/aof.memory.graphify.index.json:6335` records *"`npx
  playwright` is **policy-blocked** in this repo"*, corroborated in seven artefacts. `verify.md:17`
  reads the base URL from `work.ui.baseUrl`; **`.aof/aof.config.json` has no `work.ui` key.** So
  every UI story burns 3 breakpoints × N surfaces of failed invocations plus two agent spawns to
  reach an `INCONCLUSIVE` the config already determined — and `continue.md:134` forbids the cheap
  exit. There is **no renderability precondition anywhere in the prompt layer.** The working
  substitute (cached ms-playwright Chromium over CDP) exists in seven records and no prompt.
- **The PO is told to run a shell command it has no shell for.** `refine.md:106-108` orders the PO
  to run `aof work memory recall … --block`; `aof-product-owner.md:6` grants no `Bash`.
- **The same graph rebuild is mandated at four sites** — `refine.md:116-137`,
  `aof-architect.md:58-95`, `code-review.md:41-48`, `aof-developer.md:19-31` — over a
  10,290-node / 24,983-edge graph, carrying **10,031 B of near-duplicate prose**.
- **The `@executable` suite + fitness functions run three times per item**: `continue.md:108-109`,
  `verify.md:71`, then `verify.md:132` → `validate.md:19`, plus `code-review.md:68` as a "craft pass".
- **Design conformance runs twice by design** — `continue.md:125-134` at build and `verify.md:85-96`
  at accept, from near-duplicate instruction blocks.

**Prompt caching, context reuse, session resumption, briefs: `grep -riE "prompt.cach|kv.cach"`
across `.claude/`, `AGENTS.md` and `wiki/*.md` returns nothing.** The layer names the problem twice
and offers one remedy:

> `refine.md:26-29` — *"A spawned agent starts cold: it re-reads the codebase, re-derives what you
> already know, and hands back a summary you then re-read."*

The remedy is `--solo`, which buys context reuse by **deleting parallelism**. There is no third
option. Building one is the arc.

---

## 5 · What every comparable system does that aof does not

Primary-source survey: Anthropic engineering + Claude Code/Agent SDK docs, SWE-agent, OpenHands,
Aider, Goose, Codex CLI, Cline/Roo, Amp, Cognition, Factory, Cursor, HumanLayer; Temporal, Restate,
DBOS, Inngest, Step Functions, LangGraph, OpenAI Agents SDK, Magentic-One, Mastra, Cloudflare
Agents; OTel GenAI semconv, Langfuse, LangSmith, Braintrust, Weave; LiteLLM; pnpm, Modal, Nx,
Bazel, Google TAP, Meta PTS.

### 5.1 The cache finding — the largest single lever

Claude Code's own documentation names aof's exact architecture as the pathology:

> *"In Claude Code, the cache is effectively scoped to one machine and directory. The system prompt
> embeds the working directory, platform, shell, OS version, and auto memory paths… **That includes
> worktrees of the same repository, since each worktree has its own working directory.**"*
> — [How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching)

> *"Sequential sessions share the prefix only when the git status snapshot at startup matches, since
> the system prompt also captures branch and recent commits."* — same

aof dispatches **one worktree per story** and mutates the tree in the build phase. Both halves of
the rule are violated by construction: every story is cold against every other story, and every
review phase is cold against the build that preceded it. That is the mechanism behind 927k
cache-create per spawn.

The fix is shipped and named: **`--exclude-dynamic-system-prompt-sections`** (CLI) /
`excludeDynamicSections: true` (SDK) —

> *"The per-session context moves into the first user message, leaving only the static preset and
> your `append` text in the system prompt so **identical configurations share a cache entry across
> users and machines**."* — [Modifying system prompts](https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts)

Tradeoff stated in the docs: cwd/git-flag/platform/shell/OS/memory-paths still reach Claude, but in
the first user message, where they carry marginally less weight.

Supporting facts, all from the same page:
- Subscription gets the 1-hour TTL automatically; it **drops to 5 minutes on usage credits** unless
  `ENABLE_PROMPT_CACHING_1H=1`.
- **Subagents always use the 5-minute TTL**, even on a subscription, and their first request never
  reads the parent's cache. **Forks do** inherit the parent's prefix.
- In a **workflow fan-out**, Claude Code "briefly holds all but the first so their first requests
  can read the prefix the first agent cached." This is precisely the mechanism aof's serial
  reviewers need.
- Cache key includes **model and effort level**. aof passes neither, so it is at the mercy of
  whatever the session defaults to.

**Cost arithmetic on aof's numbers.** Opus 5: input $5/MTok, 5-min cache write $6.25, 1-h write
$10, cache read $0.50. 927k cache-create = **$5.79 per spawn**. The same 927k as reads = **$0.46** —
a **12.6× delta**. Four phases ≈ **$23 per work item just to re-read the world**.

### 5.2 Nobody credible runs an unbounded loop

| System | Turn/step cap | Cost cap | Progress oracle |
|---|---|---|---|
| Claude Agent SDK | `maxTurns` (default none) → `error_max_turns` | `maxBudgetUsd` (default none), **includes subagent spend** | `stop_reason` |
| Claude Code CLI | `--max-turns` | **`--max-budget-usd`** | `/goal`: Haiku evaluator each turn → *Not yet met / Met / **Impossible***; stops on no-tool-use turns |
| Claude Code Stop hook | overridden after **8** consecutive blocks | — | your script |
| Claude Code workflows | 1,000 agents/run, **16 concurrent** | advisory at >25 agents or >1.5 M tokens | *"or two rounds in a row make no progress"* |
| mini-SWE-agent | `step_limit: 250` | `cost_limit: 3.0` USD | irreversible submit command |
| OpenHands | `max_iterations: 100` | `max_budget_per_task` | `AgentFinishAction` |
| Goose | 1,000 turns | — | compaction at 80% |
| LangGraph | `recursion_limit: 25` | — | `GraphRecursionError` |
| Magentic-One / MS Agent Framework | `max_turns 20` / `max_round_count 10` | — | **progress ledger**, `max_stalls 3`, `max_reset_count 2` |
| OpenAI Agents SDK | `max_turns` | — | typed final output |

And the evidence that unbounded is *worse*, not merely dearer:

- **MAST** (Cemri et al., NeurIPS 2025; 7 frameworks, 200+ traces): **step repetition 17.14%**,
  **unaware of stopping conditions 9.82%**, premature termination 7.82%. Inter-agent misalignment
  is **36.94%** of all multi-agent failures; task-verification failures **21.30%**. A
  multi-level verification architecture was worth **+15.6% absolute** on ProgramDev with the same
  base model.
- **Huang et al., ICLR 2024** — intrinsic self-correction without an external oracle is
  **net-negative**: GPT-4 on GSM8K 95.5% → 91.5% → 89.0% across rounds; with oracle labels 97.5%.
  Multi-agent debate at matched budget **loses to plain self-consistency** (83.0% vs 88.2%).

> **The operative rule:** a review round is worth paying for only when it consumes a *deterministic
> external signal* — test exit code, typecheck, lint, coverage delta. A reviewer LLM's opinion is
> not an oracle. Anthropic's own guidance says the same: *"A reviewer prompted to find gaps will
> usually report some, even when the work is sound… Tell the reviewer to flag only gaps that affect
> correctness or the stated requirements."*

This is exactly aof's m52 signature: 13 delta-application runs against 5 authoring runs; m66's five
closure rounds; 91 findings against 59 verification rows.

### 5.3 Context: less is measurably better, not merely cheaper

- **SWE-agent ACI ablations** (NeurIPS 2024), SWE-bench Lite resolved: 100-line file window
  **18.0%**; 30-line 14.3%; **full file 12.7%**. Keep last 5 observations **18.0%**; full history
  15.0%. **Lint/typecheck before applying an edit 18.0%; without it 15.0%.**
- **Chroma, Context Rot** (18 models): performance degrades with input length in *every*
  experiment; a **single distractor already hurts**; on LongMemEval **~300 focused tokens beats
  ~113k of full history**, with Claude models showing the largest gap.
- **OpenHands `LLMSummarizingCondenser`**: *"up to 2× reduction in per-turn API costs"* with
  *"equivalent or better performance on software engineering tasks."*
- **Anthropic context editing + memory tool**: **+39%** on internal agentic search; **84% token
  reduction** on a 100-turn eval.
- **Anthropic sub-agent guidance**: specialised sub-agents *"return condensed summaries (typically
  **1,000–2,000 tokens**)"* to the coordinator. **That is the size target for aof's phase brief.**
- **Aider repo map**: tree-sitter symbol skeleton, graph-ranked, **`--map-tokens` default 1k**.
- **Anthropic code-execution-with-MCP**: **150,000 → 2,000 tokens (98.7%)** by loading definitions
  on demand and filtering results outside context.

**Implication:** the answer to a 927k-token spawn is *not* a bigger window. A 2–4k-token brief will
**outperform** 927k of rediscovered context on the same task and cost ~300× less.

### 5.4 The reviewer finding — aof's cold reviewers are accidentally correct

Cognition, after publicly reversing their anti-multi-agent position, report code-review agents catch
**~2 bugs per PR, ~58% severe**, and — importantly — *"this technique works best when the coding and
review agents do not share any context beforehand"* (clean context reduces attention rot). Their
surviving rule: **writes stay single-threaded; parallel agents contribute intelligence, not actions.**

Anthropic's multi-agent post agrees on where parallelism pays and where it doesn't: multi-agent is
~15× chat tokens vs ~4× single-agent, and underperforms when *"all agents share identical context,
heavy interdependencies… real-time coordination (**e.g., most coding tasks**)."*

**So: do not warm the reviewer with the builder's transcript.** Give reviewers a clean conversation,
an *identical static prefix* (same model, effort, tools, agent type, output schema) so they share a
cache entry, a **stagger** so the first warms it for the rest, and a **structured brief** as the
first user message. Parallelise review; keep build single-threaded.

### 5.5 The enforcement layer — table stakes everywhere else

**Heartbeats are server-enforced deadlines, not client pings.** Temporal: missing a heartbeat within
`heartbeat_timeout` *is* the failure signal; heartbeats carry **details** so the retry resumes from
the checkpoint rather than from zero. Restate is even closer to aof's shape: **inactivity timeout
1 min, abort timeout 10 min**, where "stall" means *no new journal entries* — no pinger required.
For aof, a journal entry maps exactly to a Claude Code tool-result event.

**The four-timeout taxonomy** (Temporal) maps onto aof's failure modes one-for-one:

| Timeout | Detects | aof's symptom today |
|---|---|---|
| Schedule-to-start | nobody picked it up | the ~10% dead air |
| **Start-to-close** | crashed/hung after starting | **the two 11h07m burns** |
| Schedule-to-close | total across retries | no total budget exists |
| Heartbeat | no progress within an attempt | the 8-day zombie |

Temporal: *"Strongly recommended to set Start-To-Close."* Step Functions defaults both
`TimeoutSeconds` and `HeartbeatSeconds` to 99,999,999 s — i.e. off, exactly like aof — which is why
it forces `States.HeartbeatTimeout` to be a *separately catchable* error from `States.TaskFailed`.
Restate's `on-max-attempts: "pause"` (rather than kill) is the right default for an expensive agent:
preserve the worktree for triage.

**Concurrency slots are acquired before work is accepted.** Temporal slot suppliers, DBOS
`Queue(concurrency=, worker_concurrency=)` — a global/local split backed by a database, which is
precisely aof's mesh problem — Inngest `concurrency: {limit, key, scope}`. None of them hands a
number to the worker and asks nicely.

**And the single most important design idea in the survey for aof:** Inngest's
`step.waitForEvent()` **releases the concurrency slot**. Cloudflare's `waitForApproval()` hibernates
the Durable Object; Temporal states *"while waiting, the agent consumes no compute resources."*

> Blocked-on-human is aof's largest recorded lost-time category — **107h28m in m47, 58h05m in
> m48, 46h38m in m50**. Today a blocked run and an 11-hour run look identical
> to the scheduler. A run awaiting input must terminate its process, persist `{sessionId,
> resumeSessionAt}`, register a durable timer, and **release its lease**.

**Progress ≠ liveness.** Magentic-One's Progress Ledger is re-evaluated every round with
`IsRequestSatisfied` / `IsInLoop` / **`IsProgressBeingMade`**; stalls > `max_stall_count` → replan;
replans > `max_reset_count` → terminate. A heartbeat would have caught aof's 8-day zombie; it would
**not** have caught the 11h07m burns, which were almost certainly heartbeating fine while looping.
The cheap progress proxy for a coding agent needs no LLM judge: lines changed, files touched, tests
newly green, commits made — and Claude Code exports `claude_code.lines_of_code.count` and
`claude_code.commit.count` natively.

### 5.6 Observability — aof is hand-rolling something already emitted

`CLAUDE_CODE_ENABLE_TELEMETRY=1` plus OTLP exporters gives, per the
[monitoring docs](https://code.claude.com/docs/en/monitoring-usage):

- `claude_code.cost.usage` in **USD**, attributed by `model`, `query_source: main|subagent|auxiliary`,
  `effort`, `agent.name`, `skill.name`, `mcp_tool.name`
- `claude_code.token.usage` by `type: input|output|cacheRead|cacheCreation`
- **`claude_code.active_time.total{type: user|cli}`** — the direct instrument for aof's headline
  92.6% idle, decomposing it into waiting-on-model, waiting-on-human, and nothing-running
- `claude_code.api_request` events with `cost_usd_micros`, `duration_ms`, and all four token classes
- Beta tracing with a **`claude_code.tool.blocked_on_user`** span — aof's 40% human-block as a
  first-class measurement
- `OTEL_RESOURCE_ATTRIBUTES` set at spawn with `run.id`, `story.id`, `milestone.id`, `phase` —
  **which deletes the regex attribution miner outright**

That last point matters because `agentMatchesMilestone` (`src/work-observe.mjs:661-667`) matches on
*text mention*, which is why 18 of 143 agent rows are double-counted (7.07 h and 1,345k tokens
billed twice) and why `report.md`/`agents.json` being overwritten in place (`:1118-1119`) has already
made retrospectives unfalsifiable: m45's retro cites *"477h39m span, 30m17s active, 14h39m
human-blocked, one infra kill"*; the `agents.json` on disk today says **25m21s span, 25m21s active,
46m58s human-blocked, 0 infra kills, 1 agent**. The report was regenerated over its own evidence.

The cross-vendor convention on token buckets is settled and aof should adopt one explicitly:
Langfuse requires buckets be **mutually exclusive** (*"each token must be counted in exactly one
key"*); Braintrust does the opposite (prompt_tokens includes cached). Pick one, enforce it in the
writer, persist `costUsd` at write time with a price-table version, and **never recompute history**.

### 5.7 The inner loop

- **pnpm global virtual store** (`enableGlobalVirtualStore: true`) names aof's use case in its own
  docs: *"most useful"* for **git worktrees**, where *"each worktree gets a nearly free
  `node_modules`."*
- **Arcjet**, the closest published experience report: devcontainer rebuild on context switch **up
  to 20 minutes** → base-VM snapshot clone **5–10 seconds**; Go compile 60–90 s cold → **~10 s**
  with a pre-seeded cache volume.
- **Test impact analysis.** Google TAP: **<0.5% of test targets fail per changelist**;
  distance-based filtering at MinDist=6 ran **50% of affected tests for a 55% resource saving with
  no missed breakages**. Meta PTS: **~⅓ of tests, >99.9% of regressions caught**, *"doubled the
  efficiency of our testing infrastructure."* JS-native equivalents exist today —
  `jest --findRelatedTests`, `vitest related --run`, `--changed`.
- **aof's own suite is the worst case for this.** 734 `*.test.mjs` files; `scripts/test.mjs` is
  275,100 B with **728 static imports** assembling 700 suites, run **strictly serially** —
  `Promise.all` count: **0**; `.only`: 0; env filters: 0; `process.argv` filters: 0. Measured: full
  suite **~7.5–8 min**, `scripts/check.mjs` **≥10 min** (clamped at the stall threshold). The
  repo's own rule tells agents to *"run focused suites via test-array imports instead"* — and there
  is **no mechanism behind that instruction**, which is why **805 of 4,950 write events are
  scratchpad files** and why the same throwaway command was re-run 33×, 31×, 30×, 26×, 26×, 23×.
- **Output filtering at the tool boundary.** Anthropic ships the exact `PreToolUse` hook that
  rewrites test commands to failures-only output, *"reducing context from tens of thousands of
  tokens to hundreds."*

### 5.8 Model routing

Everyone with a cost problem routes. RouteLLM: **>85% cost reduction on MT-Bench at 95% of GPT-4
performance**. Anthropic: Opus lead + Sonnet subagents beat single-agent Opus by **90.2%**, and
*"token usage alone explained 80% of performance variance."* Goose: `GOOSE_LEAD_MODEL` for the
first 3 turns then a worker, auto-escalating back on N consecutive failures. Amp's Oracle: a
stronger model as an *escalation tool*, not a static assignment. Claude Code exposes
`CLAUDE_CODE_SUBAGENT_MODEL`, per-agent `model:` frontmatter, and an **effort** axis
(low/medium/high/xhigh/max) that is a second, cheaper routing dimension.

aof pins 7 of 8 roles to Opus in frontmatter, render-time only, and passes no model at spawn.
Because every aof phase is a separate process, **switching models costs it nothing cache-wise** —
routing is free here in a way it is not for a single long session.

---

## 6 · The gap list

Ordered by (measured impact) ÷ (effort). Every row cites the evidence above.

### Tier 1 — configuration and one-line changes

| # | Gap | Evidence | Fix |
|---|---|---|---|
| 1 | Spawn passes no cache-stabilising flags; every worktree is a cold prefix | §5.1; 927k cache-create/spawn; `src/agent-session-driver.mjs:634` | Add `--exclude-dynamic-system-prompt-sections`; `ENABLE_PROMPT_CACHING_1H=1`; pin `--model`/`--effort` per role |
| 2 | No turn or cost bound reaches the process | §3.4; two 11h07m burns | `--max-turns`, `--max-budget-usd` per phase; a wall-clock kill for the interactive path, which those flags may not cover |
| 3 | `aof-qa` has `Write` but no `Edit` | §2.2; **41.8% of m52's tokens** | Add `Edit` to `aof-qa.md:6` |
| 4 | Review lanes never told to run concurrently | §4; architect 1.00×, 1h03m serialisation in one milestone | One sentence in `continue.md:118`, mirroring `:85`; add a few seconds of stagger so the first warms the prefix |
| 5 | Design lane mandates a policy-blocked tool against a base URL that does not exist | §4; 7 corroborating artefacts; `work.ui` absent | Gate the lane on renderability; record the reason and skip; replace `npx playwright` with the cached-Chromium-over-CDP path already in the records |
| 6 | Session hooks registered twice; a Node boot per Bash call | `.claude/settings.json:3-91`; 4,950 queued spawns | De-duplicate the matcher blocks |
| 7 | Telemetry is off | §5.6 | `CLAUDE_CODE_ENABLE_TELEMETRY=1` + `OTEL_RESOURCE_ATTRIBUTES` at spawn |
| 8 | `PreToolUse` filtering of test output not used | §5.7 | Ship Anthropic's failures-only rewrite hook |

### Tier 2 — structural

| # | Gap | Evidence | Fix |
|---|---|---|---|
| 9 | Nothing passed by value; `"brief": {}` on every run | §3.2, §5.3 | A ≤2,000-token schema-validated phase brief (`--json-schema`), compiled once at continue-start from `STORY.md`'s already-resolved references, passed **in the prompt** |
| 10 | `ARCHITECTURE.md` is monolithic and thrashed | 91–176 KB; 150 rewrites; 700-line budget is a `warn` | Split per-ADR so a story reads its slice; story frontmatter already declares which ADRs it needs; make the budget bind |
| 11 | Review→fix→re-review is uncapped | §5.2; 13 delta runs vs 5 authoring runs | One round by default; a second requires a named blocker; **findings after round one become work items, not more rounds**; contract amendments ratify in the beat that raised them |
| 12 | Heartbeat producer unwired; no timeouts | §3.5; 8-day zombie, 22h of burn | `PostToolUse` async hook → `heartbeatAt`; a reaper; the four Temporal timeouts with a startup grace |
| 13 | Concurrency enforced by prose; `dispatchReadySet` dead | §3.6 | Acquire a slot before work is accepted; mesh-wide lease table + `p-limit` per machine |
| 14 | Blocked-on-human runs hold slots | 40% of span | Terminate, persist `{sessionId, resumeSessionAt}`, durable timer, release lease |
| 15 | No progress ledger | §5.5; the 11h burns heartbeat fine | Objective proxies — lines changed, commits, tests newly green — `maxStalls` → reset with a summary, `maxResets` → escalate |
| 16 | No targeted test execution | §5.7; 805 scratchpad writes; the instruction has no mechanism | A first-class `aof test --scope impacted|file|all` over the test-array registry; full suite once at the gate |
| 17 | Worktree deps discarded on every completion | §3.8 | pnpm global virtual store, or stop force-removing and return the tree to a warm pool |
| 18 | Observability is milestone-only, post-hoc, self-overwriting, double-counting, and its toolchain classifier is blind | §1, §5.6 | Story/phase-scoped; ingested cost; append-only snapshots; fix `TOOLCHAIN_RE` or delete it in favour of OTel |

### Tier 3 — larger bets

19. **Move the worker spawn from an interactive PTY to the Agent SDK** — buys `maxBudgetUsd`
    (subagent-inclusive), programmatic `AgentDefinition`s with per-agent model/effort/tools/maxTurns,
    in-process hooks, and structured output. The PTY exists so a human can attach and answer
    `NEEDS_INPUT`; that requirement is real and must be preserved, which is why this is Tier 3 and
    not Tier 1.
20. **Solo-vs-orchestrated derived from the ready set, not static config** — `aof:continue` already
    computes the ready set; a set of one is knowably solo before any agent spawns.
21. **A standing repo map** (~2–4k tokens, tree-sitter, regenerated on branch change) injected
    identically into every phase — stable, therefore cacheable, and a direct substitute for
    rediscovery.
22. **Correction-derived memory** — Cognition auto-generate memories from user corrections rather
    than from hand-written docs. aof has the memory subsystem and a `brief` verb
    (`src/work-memory.mjs:352`) that **no prompt calls**.

---

## 7 · What this means for the four milestones that are blocked

The deadlock the issue doc identified is real: milestone **54 (verification-loop)** refuses to pick
the cap's value because *"the cap belongs to the loop-performance arc"*, and the loop-performance
arc has no milestone in which to pick it. Milestones **53**, **62** and **65** defer to the same PRD.

This research resolves the number. From the evidence:

- **Build-to-green:** the terminator that exists (`all scenarios green`) is correct. What it needs is
  a *failure* bound, not a success one — stop after **two consecutive rounds with no reduction in
  the failing-scenario count**, which is Claude Code's own documented workflow pattern and does not
  require picking an arbitrary N.
- **Review→fix→re-review: N = 1.** One round by default. A second requires a named blocker — a
  production defect, a guard that protects nothing, or a contract violation. Everything else becomes
  a work item. Justification: Huang et al. (self-correction without an oracle is net-negative), MAST
  (step repetition 17.14%), and aof's own m52 (13 delta runs against 5 authoring runs, 41.8% of the
  milestone's tokens).
- **Attempts:** keep `maxAttempts: 3`, but pair it with a **schedule-to-close** ceiling — unlimited
  or large attempt counts are only safe when a total-duration cap exists. Restate's
  `on-max-attempts: pause` is the right terminal behaviour: preserve the worktree, surface for
  triage, do not kill.
- **Start-to-close:** aof's own data sets it. The two 11h07m failures succeeded in 15.9 minutes on
  retry. A **30-minute** start-to-close with 3 attempts would have bounded that pair at ≤46 minutes
  each instead of 22 hours combined.

The PRD's own ordering needs one correction and one addition. The correction: **"(e) targeted test
execution" is not the cheapest highest-confidence win in *this* repo** — its 46% figure came from
m346 and this repo measures 6%, because model generation is 84% of active time. The addition: the
PRD contains **nothing about prompt-cache economics**, which the evidence makes the largest single
lever, and **nothing about the QA tool grant**, which is the largest single line item.

Five milestones are proposed and scheduled: **68 loop-telemetry**, **69 loop-bounds**, **70
warm-start**, **71 loop-discipline**, **72 inner-loop**. 68 is the foundation; 69 picks the cap's
value and unblocks 54; 70 attacks the 927k; 71 lands the prompt-level discipline; 72 attacks the
grind. The PRD's `headless-driver-hardening` folds into 69 (timeouts) and 70 (`--model`/`--resume`
threading) rather than standing alone.

---

## 8 · The one-paragraph version

aof has the right shape and is missing the enforcement layer every durable-execution engine treats
as table stakes: deadlines the runtime enforces rather than the agent honours, slots acquired before
work is accepted, budgets checked at admission, progress measured rather than assumed, and context
handed over rather than rediscovered. Almost all of it is available as configuration on tools aof
already runs — Claude Code emits the telemetry, provides the hooks, exposes the bounds, and ships
the cache flag. They are simply not switched on. The framework spends 316 input tokens per output
token and 92.6% of its calendar idle, and its own most recent milestone shipped with no telemetry at
all because the one command that would have recorded it is invoked by a prompt nobody is required to
run.

---

## Sources

**Anthropic / Claude Code** — [How Claude Code uses prompt caching](https://code.claude.com/docs/en/prompt-caching) ·
[Modifying system prompts](https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts) ·
[CLI reference](https://code.claude.com/docs/en/cli-reference) ·
[Monitoring & OpenTelemetry](https://code.claude.com/docs/en/monitoring-usage) ·
[Agent loop](https://code.claude.com/docs/en/agent-sdk/agent-loop) ·
[Subagents](https://code.claude.com/docs/en/sub-agents) ·
[Dynamic workflows](https://code.claude.com/docs/en/workflows) ·
[Agent teams](https://code.claude.com/docs/en/agent-teams) ·
[Hooks](https://code.claude.com/docs/en/hooks) ·
[Manage costs](https://code.claude.com/docs/en/costs) ·
[Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) ·
[Writing effective tools](https://www.anthropic.com/engineering/writing-tools-for-agents) ·
[Multi-agent research system](https://www.anthropic.com/engineering/multi-agent-research-system) ·
[Code execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) ·
[Context management](https://claude.com/blog/context-management) ·
[Prompt caching is everything](https://claude.com/blog/lessons-from-building-claude-code-prompt-caching-is-everything) ·
[Pricing](https://platform.claude.com/docs/en/about-claude/pricing)

**Harnesses** — [SWE-agent (NeurIPS 2024)](https://proceedings.neurips.cc/paper_files/paper/2024/file/5a7c947568c1b1328ccc5230172e1e7c-Paper-Conference.pdf) ·
[SWE-agent history processors](https://swe-agent.com/latest/reference/history_processor_config/) ·
[mini-SWE-agent config](https://mini-swe-agent.com/latest/advanced/yaml_configuration/) ·
[OpenHands condenser](https://docs.openhands.dev/sdk/guides/context-condenser) ·
[OpenHands SDK (arXiv 2511.03690)](https://arxiv.org/html/2511.03690v1) ·
[Aider repo map](https://aider.chat/docs/repomap.html) ·
[Goose lead/worker](https://block.github.io/goose/docs/tutorials/lead-worker/) ·
[Codex prompting guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide) ·
[Amp changelog](https://ampcode.com/news) ·
[Factory droid exec](https://docs.factory.ai/droid-exec/overview) ·
[Cursor semantic search](https://cursor.com/blog/semsearch) ·
[HumanLayer — advanced context engineering](https://www.humanlayer.dev/blog/advanced-context-engineering) ·
[Cognition — Don't build multi-agents](https://cognition.com/blog/dont-build-multi-agents) ·
[Cognition — Multi-agents: what's actually working](https://cognition.com/blog/multi-agents-working)

**Orchestration** — [Temporal — detecting activity failures](https://docs.temporal.io/encyclopedia/detecting-activity-failures) ·
[Temporal — retry policies](https://docs.temporal.io/encyclopedia/retry-policies) ·
[Temporal — worker tuning](https://docs.temporal.io/develop/worker-tuning-reference) ·
[Restate — service configuration](https://docs.restate.dev/services/configuration) ·
[DBOS queues](https://docs.dbos.dev/python/reference/queues) ·
[Inngest concurrency](https://www.inngest.com/docs/guides/concurrency) ·
[Step Functions error handling](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html) ·
[LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) ·
[OpenAI Agents SDK](https://openai.github.io/openai-agents-python/running_agents/) ·
[Magentic orchestration](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/magentic) ·
[Cloudflare — human in the loop](https://developers.cloudflare.com/agents/concepts/agentic-patterns/human-in-the-loop/) ·
[LiteLLM budgets](https://docs.litellm.ai/docs/proxy/users)

**Observability** — [OTel GenAI agent spans](https://github.com/open-telemetry/semantic-conventions-genai/blob/main/docs/gen-ai/gen-ai-agent-spans.md) ·
[Langfuse token & cost tracking](https://langfuse.com/docs/observability/features/token-and-cost-tracking) ·
[LangSmith cost tracking](https://docs.langchain.com/langsmith/cost-tracking) ·
[OpenInference double-count issue](https://github.com/Arize-ai/openinference/issues/3164)

**Research** — [Chroma — Context Rot](https://www.trychroma.com/research/context-rot) ·
[Liu et al. — Lost in the Middle (TACL 2024)](https://aclanthology.org/2024.tacl-1.9/) ·
[Huang et al. — LLMs cannot self-correct reasoning yet (ICLR 2024)](https://arxiv.org/pdf/2310.01798) ·
[Cemri et al. — MAST (NeurIPS 2025)](https://arxiv.org/html/2503.13657v2) ·
[RouteLLM](https://sky.cs.berkeley.edu/project/routellm/)

**Inner loop** — [pnpm global virtual store](https://pnpm.io/global-virtual-store) ·
[Arcjet — devcontainers to VMs](https://blog.arcjet.com/from-devcontainers-to-vms-parallel-dev-environments-for-ai-agents/) ·
[Google — Taming Google-scale continuous testing](https://research.google/pubs/pub45861/) ·
[Meta — Predictive test selection](https://engineering.fb.com/2018/11/21/developer-tools/predictive-test-selection/) ·
[Jest CLI](https://jestjs.io/docs/cli) ·
[Vitest CLI](https://vitest.dev/guide/cli.html)
