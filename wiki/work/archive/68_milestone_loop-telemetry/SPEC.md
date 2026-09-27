---
type: milestone
number: 68
slug: loop-telemetry
title: "Loop telemetry — cost, phase and progress are recorded, not inferred"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-08-22
depends: [08, 19, 21]
origin: [../../planning/PRD-acd-loop-performance.md, ../../planning/RESEARCH-agent-loop-economics.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 68 · Loop telemetry — cost, phase and progress are recorded, not inferred

## Objective

aof cannot price its own work. The run record is fifteen fields
(`src/run-store.mjs:344-362`) and carries **no tokens, no cost, no phase, no model, and no duration**
beyond `updatedAt - createdAt` — where `updatedAt` only moves on a state transition. Everything the
framework knows about what it spends is reconstructed after the fact by `work-observe.mjs`, a
transcript miner that attributes an agent to a milestone by **regex over free text**
(`agentMatchesMilestone`, `:661-667`).

That reconstruction is measurably wrong in four ways, all evidenced in
[RESEARCH-agent-loop-economics.md](../../../planning/RESEARCH-agent-loop-economics.md):

- **It double-counts.** 18 of 143 agent rows appear in two milestone reports — 7.07 h of active time
  and 1,345k output tokens billed twice.
- **It overwrites its own history.** `report.md` and `agents.json` are rewritten in place
  (`:1118-1119`). Milestone 45's retrospective cites *"477h39m span, 30m17s active, one infra kill"*;
  the file it cites now says *25m21s span, 25m21s active, 0 infra kills*. Every `Refs:
  observability/report.md` in the corpus is unfalsifiable.
- **Its toolchain classifier is blind in this repo.** `TOOLCHAIN_RE` (`:67-68`) matches `npm test`,
  which `.claude/rules/build-deploy-restart.md:150-153` forbids here. Real runs are
  `AOF_GLOBAL_HOME=$(mktemp -d) node …` and classify as `"bash"`. Result: **zero of sixty grind
  reasons were toolchain-related**, while a hand-written retro reported 33%.
- **It cannot answer for one story.** `resolveMilestoneFolder` (`:988-1006`) reads only the top level
  of `wiki/work`; `"52/00"` resolves to `null` and throws.

Meanwhile Claude Code already emits, natively over OTLP, the exact measurements aof is guessing at:
`claude_code.cost.usage` in USD attributed by model and `query_source`, `claude_code.token.usage`
split across input/output/cacheRead/cacheCreation, and `claude_code.active_time.total{type:
user|cli}` — which decomposes aof's headline 96.7% idle into waiting-on-model, waiting-on-human and
nothing-running. Attribution becomes a resource attribute set at spawn (`run.id`, `story.id`,
`phase`) rather than a text match after the fact.

This milestone is the foundation of the arc. It turns every later lever into a measured
before/after instead of a vibe, and it is the reason 69–72 are sequenced behind it.

## Scope

In scope:
- **A run record that carries spend.** Phase, attempt, model, effort, the four token classes,
  ingested `costUsd` with a price-table version, turn and tool-call counts, and a typed
  `exitReason` (`final_output | max_turns | timeout | stall | budget_exceeded | abort | error`).
- **Attribution at spawn, not after.** `OTEL_RESOURCE_ATTRIBUTES` carrying `run.id`, `story.id`,
  `milestone.id`, `phase`, `machine.id`, `worktree.id`, set where the session is launched
  (`src/agent-session-driver.mjs`).
- **Ingested cost beats inferred cost.** One token-bucket convention, mutually exclusive, enforced
  in the writer; `costUsd` persisted at write time and never recomputed.
- **Story- and phase-scoped observe.** `aof work observe <NN>/<SS>` answers, and `aof work observe`
  reports per-phase rather than per-milestone-only.
- **Append-only snapshots.** An observe run never overwrites the evidence a retrospective cited.
- **De-duplicated attribution.** An agent run belongs to exactly one item.
- **The toolchain classifier fixed or retired** in favour of the emitted tool-result events.

Out of scope:
- **Acting on the measurements** — caps, budgets, reapers and routing are milestones 69–72. This one
  makes the numbers true; it does not enforce anything with them.
- **A dashboard product.** A `--json` contract and the existing board face are the surface; a
  hosted observability stack is a project choice, not a framework deliverable.
- **Retro-fitting history.** Existing `observability/` snapshots stay as they are, marked as derived
  by the old miner.

## Stories

Partitioned at refine (2026-08-20) against a fresh codebase graph — boundaries follow the
call/dependency coupling `aof graph impact` reports, and the rationale for each cut is in
[ARCHITECTURE.md](ARCHITECTURE.md) § Story partition.

- [x] `00_story_spend-bearing-run-record` — The spend-bearing run record: a sixteenth key, and a writer that refuses a lie. Lands **alone, first** (`src/run-store.mjs`, 41 dependents).
- [x] `01_story_attribution-at-spawn` — Attribution at spawn: the session id the record has always modelled, finally written — plus the OTel attributes, with no receiver.
- [x] `02_story_spend-ingest-at-settle` — Spend ingest at settle: the transcript's own numbers, copied once, priced once.
- [x] `03_story_attribution-by-join` — One run, one item: the regex retired, and the classifier that reports zero.
- [x] `04_story_story-and-phase-scoped-observe` — Observe answers for a story and a phase: the resolver that reads one level deep.
- [x] `05_story_append-only-snapshots` — Append-only snapshots: an observe run stops overwriting the evidence a retrospective cited.

**Sequencing.** 68/00 first and alone — every other story reads its contract. Then 68/01, 68/02,
68/04 and 68/05 are all parallel-eligible; 68/03 is sequenced behind 68/01, whose producer supplies
its live evidence.

## Dependencies

- **08 (cli-command-core)** — every new observable lands as a registered command with a `--json`
  contract; the spine holds.
- **19 (work-run-lifecycle)** and **21 (board-run-observability)** — this milestone extends the run
  record those two established and the face 21 built.
