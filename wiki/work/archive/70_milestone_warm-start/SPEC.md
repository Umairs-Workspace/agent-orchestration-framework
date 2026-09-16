---
type: milestone
number: 70
slug: warm-start
title: "Warm start — a phase is handed its context instead of rediscovering it"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-08-24
depends: [68]
origin: [../../planning/PRD-acd-loop-performance.md, ../../planning/RESEARCH-agent-loop-economics.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context.
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 70 · Warm start — a phase is handed its context instead of rediscovering it

## Objective

**aof spends 927,588 cache-creation tokens per agent spawn — roughly 3.6 MB of text ingested, at the
cache-write rate, before a line of work is done.** Across the six instrumented milestones the
context-in : output ratio is **316 : 1**: 2.93 billion input tokens against 9.27 million output.
One developer run (`Build story 49/05`) ingested **9.43 M cache-create tokens — about 36 MB** to
produce 377k of output.

There are two causes and both are structural.

**Nothing is passed by value.** The spawn brief is `{ itemRef, worktreeCwd, task, command }`
(`src/mesh-worker-execution.mjs:1619`) and every run record on disk reads `"brief": {}`. The prompt
typed into the session is `/aof:continue <ref>`. Every agent then rediscovers the same tree: in
milestone 52 the invariant part alone (`ARCHITECTURE.md` + `SPEC.md`, 182,381 B ≈ 45.6k tokens) was
re-read at all 30 phase boots — **≈1.37 M input tokens spent re-reading two files that never changed
between reads.** `ARCHITECTURE.md` shows 46 reads in m52, 78 in m49. The prompt layer names the
problem twice (`refine.md:26-29`, `continue.md:30-34`) and offers exactly one remedy — `--solo`,
which buys context reuse by deleting parallelism.

**And nothing that is ingested can be shared.** Claude Code's documentation states that the cache is
*"effectively scoped to one machine and directory… **That includes worktrees of the same repository,
since each worktree has its own working directory**"*, and that *"sequential sessions share the
prefix only when the git status snapshot at startup matches."* aof dispatches one worktree per story
and mutates the tree during build. Both halves of that rule are violated by construction: every
story is cold against every other story, and every review is cold against the build it follows. At
Opus rates, 927k as cache-creates costs **$5.79 per spawn**; the same tokens as cache-reads cost
**$0.46** — a 12.6× delta, roughly $23 per work item spent re-reading the world.

The fix is shipped and named: `--exclude-dynamic-system-prompt-sections` moves the per-session
context out of the system prompt *"so identical configurations share a cache entry across users and
machines."* aof's spawn passes no flags at all — no `--model`, no `--effort`, no cache flag
(`src/agent-session-driver.mjs:634`).

And less context is not merely cheaper, it is **better**. SWE-agent's ablations resolve 18.0% with a
100-line file window against **12.7% showing the full file**; Chroma's context-rot study finds ~300
focused tokens beating ~113k of full history. The answer to a 927k-token spawn is not a bigger
window. It is a 2,000-token brief.

## Scope

In scope:
- **A per-story build brief, passed in the prompt.** Compiled once at continue-start from
  `STORY.md`'s already-resolved references — the extraction refine performs and then discards — and
  handed to the spawn **by value**, schema-validated, at the ~1,000–2,000 token size Anthropic's
  own sub-agent guidance targets. Fix-loop respawns get the failing scenarios and the diff, not the
  tree.
- **A stable, shareable prompt prefix.** `--exclude-dynamic-system-prompt-sections` at the spawn
  site; the 1-hour cache TTL held deliberately rather than by accident; `--model` and `--effort`
  passed explicitly per role so the cache key is chosen, not inherited.
- **Cache economics as a first-class measurement.** `cacheRead ÷ cacheCreation` reported per phase
  from 68's record, with a target, because *"if creation stays high turn after turn, something is
  changing in your prefix."*
- **`ARCHITECTURE.md` split per ADR.** 91–176 KB monoliths, rewritten 150 times in one milestone,
  sitting at a 700-line budget that is currently a `warn` nothing enforces. Story frontmatter
  already declares which ADRs a story needs; a story should read its slice. The budget binds.
- **Warm the fix loop.** Review findings append to the build session via `--resume` rather than
  spawning a cold fixer — the single largest saving available, because it avoids re-ingesting the
  build context entirely.
- **Per-role model and effort routing.** 7 of 8 roles are pinned to Opus in render-time frontmatter
  and no model reaches the spawn. Because every aof phase is a separate process, switching models
  costs nothing cache-wise here — routing is free in a way it is not for a single long session.

Out of scope:
- **Warming the reviewer with the builder's transcript.** Deliberately excluded: Cognition's
  measured result is that code review *"works best when the coding and review agents do not share
  any context beforehand."* Reviewers get a clean conversation, an identical static prefix, and a
  brief — not the builder's history. Parallelising the review lanes is milestone 71.
- **A semantic code-retrieval index.** A generated repo-map-shaped standing brief is in scope as a
  stretch; training or hosting an embedding index is not.
- **Moving the worker spawn to the Agent SDK.** The interactive PTY exists so a human can attach and
  answer `NEEDS_INPUT`; that requirement is real. Revisit once 69 has established whether the
  headless caps are reachable on the current path.
- **Loop caps and round discipline** — milestones 69 and 71.

## Stories

Partitioned at refine (2026-08-21) against a fresh codebase graph — boundaries follow the
call/dependency coupling `aof graph impact` reports, and the rationale for each cut is in
[ARCHITECTURE.md](ARCHITECTURE.md) § Story partition.

- [x] `00_story_phase-brief` — The phase brief: a spawn is handed 2,000 tokens instead of a tree. The milestone's **spine** — a pure leaf compiler (`src/phase-brief.mjs`) on the `brief` bag that already exists.
- [x] `01_story_cache-stable-launch` — A launch whose prefix is shareable: the four things aof never passed (`--exclude-dynamic-system-prompt-sections`, `--model`, `--effort`, the 1-hour TTL).
- [x] `02_story_cache-economics` — Cache economics per phase: the ratio that says whether any of this worked. Read-only over 68's `spend` (`work-observe.mjs`, **0 dependencies**).
- [x] `03_story_architecture-slice` — A story reads its slice: the ADRs it declares, and a budget that binds.
- [x] `04_story_warm-fix-loop` — The fix loop resumes the build instead of re-ingesting it.
- [x] `05_story_brief-carries-the-contract` — A brief that carries what the phase must satisfy. **Added at the milestone gate (2026-08-22)**, on a measurement: the compiler drops the task contracts and the declared ADR slice from every real brief in this stream.
- [x] `06_story_saving-is-measured` — The saving is a number, not a claim. **Added at the milestone gate**: every run record in this stream still reports `unmeasured`, so nothing has yet demonstrated that this milestone achieved anything.

**Sequencing.** **70/00, 70/01 and 70/02 start together** — three disjoint seams (the typed payload,
the launch vector, the reporting leaf). 70/03 and 70/04 are sequenced behind 70/00, whose compiler
each extends. One overlap is declared rather than left to be discovered: 70/00 and 70/01 both edit
`src/commands/drive.mjs`, at distinct statements ~20 lines apart.

**Two stories were added at the milestone gate (2026-08-22), not at refine**, because the gate is
where the milestone was first measured rather than reasoned about. Both close a gap between "the
code is correct" and "the objective is met":

- **70/05** — the brief compiles, is bounded, and states honestly what it dropped; measured on this
  milestone's own five stories it drops the acceptance criteria and the ADR slice **every time**, in
  every phase, while spending less than half its budget. A `verify` brief is 244 characters. The
  headline deliverable does not yet function on real data, and 70/03's capability is inert until it
  does.
- **70/06** — nothing has been measured. Every run record in this stream reports `unmeasured`, so
  the Dependencies note below ("without 68 this milestone ships on faith") still describes the
  milestone exactly.

Neither was discoverable from the story lanes: every `@executable` scenario passes on fixtures sized
to fit the ceiling, and no scenario ever compiled a brief for a real item under `wiki/work/`.

**Two SPEC premises did not survive refine** and are corrected in
[ARCHITECTURE.md](ARCHITECTURE.md) § Corrections: story frontmatter does **not** already declare its
ADRs (zero of 201 stories do — 70/03 introduces the key), and `ARCHITECTURE.md` is **not** split into
sibling files (ADR-006 — it is pinned by four reader surfaces; the slice ships through the brief
instead). A third premise held: the cache flag is real and applies here (ADR-004).

## Dependencies

- **68 (loop-telemetry)** — the cache-hit ratio and per-phase ingest cost are the only way to prove
  any of this worked. Without 68 this milestone ships on faith.
