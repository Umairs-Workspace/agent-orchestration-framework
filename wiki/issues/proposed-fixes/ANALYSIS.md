# Analysis — what the agent layer costs, and why

**2026-08-24.** Scope: the eight role agents in `.claude/agents/` and the phase commands that spawn
them. Not the loop shell, not the mesh — the path an operator actually drives with
`/aof:refine`, `/aof:continue`, `/aof:verify`.

---

## 1 · The measured shape

**A seven-story milestone on a downstream work stream: 12h42m, 77 commits.**

| type | fix | test | docs | merge | **feat** | chore | refactor | style |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| n | 19 | 18 | 12 | 9 | **7** | 6 | 4 | 2 |

**The feature work took 43 minutes** — four `feat` commits between 18:59 and 19:42 building four of
the seven stories. That is **5.6% of wall-clock**, and **109 minutes per story** for roughly six
minutes of code each.

**Refinement alone, on a large milestone: ~3.12M subagent tokens across 16 agents.** Refine is a
doc-producing phase. It spawned sixteen agents because `work.agents.mode` is `orchestrated` and
`--autonomous` cascades every sub-stage unconditionally — there is no size test in front of the
fan-out.

**Two other runs, for shape:**

- One `aof:continue` ran **1h55m and delivered nothing**; the story it was asked to finish was still
  `in-progress`. **37 of those minutes were a spawned reviewer sitting at zero bytes**, formally
  in-flight, indistinguishable from a working agent. See `../ISSUE-the-run-hung-and-nothing-noticed.md`.
- Milestone 52: **thirteen agent runs existed only to re-apply ADR deltas** to contracts already
  authored — 38% of agent-active time and **661.6k output tokens, 41.8% of the milestone** — against
  **one** build run at 7%.

**Corpus-wide across a downstream stream's instrumented milestones (42 agent runs):**
**3,082,276 cache-creation tokens per agent spawn** (~12 MB of text ingested per spawn),
a **538:1** input-to-output ratio, and **32.2h active against 50.0h stalled**.

---

## 2 · What the eight agent files actually contain

Every one of the eight has exactly six frontmatter keys: `aof-generated`, `name`, `description`,
`model`, `tools`, `aof-runtime`. Consequences, all verified against the live files:

- **No `maxTurns` on any agent.** A reviewer runs until it decides it is finished. One architect run
  reached 73 tool calls and 173k tokens with three self-initiated addenda; nothing bounded it.
- **No `effort` on any agent**, so every one inherits the harness default (`high`).
- **No `permissionMode`**, so scope is prose only.
- **Seven of eight pinned to `opus`.** Only `aof-researcher` is `sonnet`.
- **Four reviewers hold `Edit` while their own descriptions say they do not edit.** `aof-qa` ("does
  not edit production code"), `aof-designer` ("read-only fidelity judge"), `aof-security` ("never
  edits implementation"), `aof-architect` ("does not implement features"). The boundary is asserted
  in prose and contradicted by the tool grant.

And in the command layer: `continue.md:95` tells builds to *"Spawn the builds together … and wait for
all of them"*. `continue.md:144` — the review step — says nothing of the kind. Grepping every command
and agent file for a review-round bound returns nothing.

---

## 3 · Four mechanisms, and what each costs

### 3.1 Cold reviewers are told to rebuild the context that made them useful

A subagent starts its own conversation with its own system prompt; **its first request does not read
the parent's cache**, and subagents use the **five-minute TTL** regardless of plan. So each spawn
builds a prefix from scratch — and is then instructed to orient by reading the milestone's documents,
which on a real milestone means an 87 KB `ARCHITECTURE.md` and a 33 KB `STATE.md` before any work.

That is self-defeating on its own terms. The reason a fresh reviewer catches things a warm one misses
is that it *skips* the accumulated context; vendor guidance is explicit that a reviewer works
because it *"sees only the diff and the criteria you give it"*. Ours is given a clean context and
then told to fill it.

The extra context is not merely dearer. Measured on SWE-bench: a 100-line file window resolved
**18.0%** where showing the entire file resolved **12.7%**; keeping the last five observations
resolved **18.0%** where full history resolved **15.0%**.

### 3.2 The review lanes are serial

The arithmetic is not in dispute: independent subtasks *"finish in the time of the slowest one rather
than the sum of all of them."* Every published production reviewer runs its lenses in parallel. Ours
runs the sum — measured at 31 minutes of architect followed by 39 minutes of QA in one continue.

### 3.3 There is no verification pass between review and fix

Mature review pipelines spend a whole stage refuting candidate findings against actual code
behaviour, then deduplicate and rank by severity, before anything reaches a fix. Ours routes raw
findings straight into a remediation round.

The predicted consequence is documented: *"A reviewer prompted to find gaps will usually report some,
even when the work is sound… Chasing every finding leads to over-engineering."* **Seventy-seven
commits for seven features is that sentence, measured.** Milestone 66 recorded 91 findings against 59
verification rows across five closure rounds.

### 3.4 Nothing bounds the rounds, and round two is where accuracy starts falling

Intrinsic self-correction without an external oracle is net-negative: GPT-4 on GSM8K falls
**95.5% → 91.5% → 89.0%** across rounds, recovering to 97.5% only when given oracle labels. The
multi-agent failure taxonomy puts **step repetition at 17.14%** of failures and **"unaware of
stopping conditions" at 9.82%**.

The signature is legible in the commit log without any telemetry. Five consecutive commits,
15:52 → 17:38:

```
15:52  test: harden final structural controls
16:22  test: close final architecture bypasses
16:45  test: reject remaining structural evasions
17:13  test: enforce concrete architecture gates
17:32  test: harden final structural paths
```

Each declares itself final. None is. And the last hour of the same run contradicts itself — two
commits eighteen minutes apart asserting opposite things about the same fitness register.

---

## 4 · What comparable systems do

**On roster size.** Published guidance is to *"start with 3–5 teammates"* and that *"three focused
teammates often outperform five scattered ones"*. The built-in exploration agents number two, and
both are **read-only** and deliberately skip project context files to stay cheap. One well-regarded
research system uses five general-purpose agents and can justify each by ablation. A phase-based
approach using **zero role agents** — no roles, no tool-selection loop, three fixed phases — resolved
**32.00% of SWE-bench Lite at $0.70 per issue**, outperforming every open-source agentic approach
published at the time on both resolve rate and cost.

And the job titles themselves buy nothing measurable: 162 personas across 2,410 questions and four
model families found **no improvement over the control**. The value in our agent files is the
checklists, not the personas.

Eight roles is not obviously wrong. Eight roles *each spawned cold, serially, on Opus, uncapped, and
told to read the milestone* is.

**On the cost of adding agents.** Multi-agent systems use roughly **15× the tokens** of chat, and a
team of parallel sessions about **7×** a standard session when its members plan. That buys latency
only if the agents run in parallel. Ours pays the multiplier serially — the cost without the
benefit.

**On model routing.** The headline multi-agent result is **Opus lead + Sonnet subagents beating
single-agent Opus by 90.2%** — not Opus everywhere. Vendor cost guidance is *"Use Sonnet for
teammates"* and *"For simple subagent tasks, specify `model: haiku`."* Comparable frameworks resolve
the model **outside** the agent file, against profiles, with a routing mode that starts cheap and
escalates only on a soft failure. We hardcode `model: opus` in eight files.

**On sizing work before running it.** One comparable framework will not execute a plan until it has
been sized against a context budget, and enforces it: two to three tasks per plan, more than three is
a split signal, five or more is a hard blocker; any single task touching more than five files must be
split; the target is completing within **~50%** of the window, not 80%. Crucially, *reducing scope to
make it fit is itself a blocker* — the only legal escape is splitting. The estimate is
`(implementation + files read + verification output) / 4 chars`, multiplied by a **calibration factor
measured from that project's own estimate-versus-actual history**, with confidence **derived from
sample count** rather than self-rated.

We have no sizing rule anywhere. A seven-story milestone against an 87 KB architecture document with
twelve ADRs was never checked against anything — and a refine pass spawned sixteen agents with no
size test in front of it.

**On what a fresh subagent is handed.** The same framework forbids what we mandate: never inline
large files into a subagent prompt, never read another phase's full plan, do not re-read a file body
when frontmatter suffices, and below a large context window read **frontmatter only** from prior
summaries. In its place, each task declares the files it may write and a `read_first` whitelist that
is a hard gate.

**On stopping.** That framework caps its plan-check loop at three iterations **and** detects
non-convergence separately: if the issue count is not decreasing, it stops and offers
force-proceed / provide-guidance / abandon. Another caps an iterative retrieval loop at three cycles
with an explicit termination predicate.

**On reviewer discipline.** A comparable reviewer agent requires **>80% confidence** before
reporting, tells the agent *"A clean review is a valid review. Do not manufacture findings to justify
the invocation"*, ships an explicit list of things **not** to flag, and gates every finding behind a
four-part check: exact file and line, a concrete failure mode as input → state → outcome, evidence
that surrounding context was read, and a severity defensible against inflation.

Our three reviewers have none of that.

---

## 5 · What is deliberately not proposed

- **Cutting the roster.** Eight is defensible and is smaller than most comparable systems. The
  problem is how they are spawned and bounded, not how many exist.
- **Copying a catalogue.** One framework surveyed runs 31–33 agents and 72 commands with its own two
  authoritative documents disagreeing on the count; another ships 68 agents, 286 skills and 513
  auto-loadable instruction files while marketing itself as a context-optimisation system and
  publishing no measurement of its own overhead. Take mechanisms, not inventories.
- **Turn caps and effort in agent frontmatter.** Worth doing, and neither comparison framework does
  it either — so it is not borrowed, it is ours to get right. Recorded here rather than proposed as
  one of the four.
- **A findings dedupe implementation.** Both comparison frameworks concede they do not solve it. The
  verification-pass idea in §3.3 comes from published review pipelines, not from them, and is folded
  into Fix 3 as a precondition on round two rather than proposed as a separate engine.
