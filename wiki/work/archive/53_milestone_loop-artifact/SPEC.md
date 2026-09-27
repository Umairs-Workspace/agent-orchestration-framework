---
type: milestone
number: 53
slug: loop-artifact
title: "The loop as a CLI artifact — `aof work loop`, the code-owned shell"
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-20
depends: [20, 21, 38]
origin: [../../planning/PRD-acd-loop-engineering.md, ../../planning/PRD-graph-engineering.md]
schema: 1
aofVersion: 0.1.0
---
<!--
  Milestone SPEC.md — the record doc. Answers ONE question: why + scope of this milestone.
  Owner: product-owner. A milestone GROUPS stories and holds their shared context
  (ARCHITECTURE / DESIGN / RESEARCH / UAT live in this folder too, conditionally).
  Does NOT contain: a per-story user story (→ each STORY.md) or acceptance criteria (→ task .feature).
-->
# 53 · The loop as a CLI artifact

## Objective

aof's loop is driven from a Claude prompt. `autonomous.md` loops on the deterministic `aof work next`
and dispatches the phase slash-commands — so the *sequencer* is already code while the **dispatcher,
session lifecycle, caps and stop-conditions live in prose**. That is why the build-loop cap is
unenforceable: it is an instruction a model may skip.

The hard part is already built, in the wrong place. `mesh-worker-execution.mjs` spawns an interactive
`claude` in a PTY, drives it to `{outcome: done|failed}`, resumes, and detects the session from the
transcript — but only inside the mesh work-assignment path.

**This milestone promotes that driver to the local loop spine.** `aof work loop <ref|range>` becomes
the code-owned shell: it sequences via `aof work next`, spawns a per-phase session through the atomic
`aof work refine|continue|verify <ref>` drivers, runs the gate between phases with a bounded retry,
and drives the range to a terminal state — or halts at a real gate. The phase *prompts* are unchanged
and stay the agent node; the CLI owns only the shell. A loop survives a machine-off and resumes, which
is the exact failure that motivated the observability work in the first place.

**A loop must be usable without a graph.** This milestone stands alone deliberately: `aof work loop`
requires no loop registry, no anchors, no paired watchers, and it is the right and complete answer for
a single operator driving work with review-stops. The reason is not pragmatism, it is the arc's own
logic — every function the graph half adds (a paired watcher, a reference owner, an arbiter, an
auditor, an anchor) is a function **a human at the keyboard is already performing implicitly**. The
graph is what you build when you take that human out. So graph complexity is priced in **autonomy**,
not charged upfront: L1 and L2 need none of it, and L3 requires all of it.

Two consequences belong here rather than being rediscovered later. First, the ladder ships **L1 and L2
only**: L3 is declared, documented and *locked*, because an unattended self-driving loop without
anchored measurements and an enforced frozen set is the configuration the self-evolving-agent
literature has repeatedly measured failing. 55 unlocks it. Second, the **Loop-Ready score is
registry-optional** — it composes 52's structural checks when a loop graph is declared and falls back
to its own base checks when one is not. It is never a second checklist that can disagree with the
graph, and never a reason a plain loop cannot run.

## Scope

In scope:
- **`aof work loop <ref|range>`** — the code-owned shell: sequencing via `aof work next` scoped to a
  ref or `NN-MM` range, phase dispatch by type + status, the gate between phases, bounded retry, drive
  to terminal or halt at a genuine gate. Registered with a stable `--json` state contract.
- **`aof work refine|continue|verify <ref>`** — the atomic per-phase drivers `loop` composes: spawn one
  session running that phase's existing prompt, watch the transcript to completion, gate. The prompts
  are unchanged; these are the CLI drivers around them.
- **`--level L1|L2`** — report-only and assisted (today's `--autonomous` default). **L3 is declared and
  locked** in this milestone.
- **`--resume`** — durable loop state in the run store, so a loop survives a machine-off and resumes
  rather than stranding sessions.
- **Loop-Ready score on `aof work doctor`** — **registry-optional**: composes 52's structural checks
  when a loop graph is declared, falls back to its own base checks when one is not, and is never a
  parallel checklist that can disagree with the graph. The readiness bar an unattended run will later
  have to clear.
- **Standalone operation** — `aof work loop` runs with no loop registry, no anchors and no watchers.
  A repo that wants the loop and not the graph gets exactly that.
- **`autonomous.md` reduced to a thin shell-out** to `aof work loop` — the two coexist until `loop` is
  proven, then the prompt-driven version (the one with unenforceable caps) is removed.

Out of scope:
- **Unlocking L3** — 55, which supplies the anchors and the enforced frozen set that make it honest.
- **The grader loop** (54), **self-tuning** (62), **triggers** (63).
- **Moving phase logic into code.** The shell becomes code; each phase's what-to-do stays its prompt.
  No DAG engine, no re-implementation of the ACD phases as a pipeline.
- **Loop economics** — telemetry, budget, model map, the cap's *value*, headless-driver hardening — all
  owned by `PRD-acd-loop-performance.md`. This milestone consumes them.

## Stories

<!-- Broken down 2026-08-15 (`aof:refine 53 --autonomous`). The partition is graph-derived — see
     ARCHITECTURE.md §Story partition. Its defining property: no two stories edit the same file, and
     `src/work.mjs` (241 dependents) is edited by nobody, as is `src/cli.mjs`, `src/run-store.mjs`,
     `src/work-doctor.mjs`, `src/commands/continue.mjs`, `src/board-ui.mjs` and `ui/`.
     00, 01, 03 and 07 start concurrently. 07 was added and refined 2026-08-15 (ADR-012/ADR-013). -->

- [x] `00_story_session-driver-extraction` — the PTY driver moved to `src/agent-session-driver.mjs`,
  a subtraction from the 49-dependent sink, re-exported so all 49 dependents stay byte-unchanged.
- [x] `01_story_loop-engine` — every decision the shell makes, as pure functions over plain data
  (`src/work-loop.mjs`): scope guard, phase map, gate order, the closed stop set, the locked ladder.
- [x] `02_story_command-surface` — `aof work loop` on the launcher seam + the three
  `work:drive-<phase>` executors, registered. *(depends 00, 01)*
- [x] `03_story_loop-ready-score` — the registry-optional readiness bar on `aof work doctor`,
  composing 52's checks through `invoke`. *(fully independent)*
- [x] `04_story_autonomous-shell-out` — `autonomous.md` reduced to a shell-out, and the `@manual`
  soak that defines "proven". *(depends 02)*
- [x] `05_story_the-fitness-functions` — FF-5301…FF-5310, landed green. *(depends 00–04)*
- [x] `07_story_registry-home-and-delivery` — 52's loop registry moves to `.aof/loops/` and ships in
  the bundle, so a consumer repo has the records for the loops aof runs there. Supersedes
  52/ADR-001 decision 4. *(code-independent of 03 — 03 reaches the registry only via `invoke` — but
  **fixture-coupled**: 53/03's task contracts build registries at `wiki/work/loops/` in 27 places, so
  whichever of 03 and 07 lands SECOND rewrites the other's fixture paths. Found at 07's refine,
  2026-08-15; either order is fine, the coupling just has to be honoured.)*

## Dependencies

- **20 (autonomous-run-resilience)** — `--resume`, the attempt ceiling and the retryable/non-retryable
  classification are the run store's, not this shell's; the loop declares over them.
- **21 (board-run-observability)** — loop state is a run-store observable and reaches the board through
  the same face, never a side channel.
- **38 (cross-machine-worker-execution)** — this milestone *promotes* that milestone's PTY driver from
  the mesh assignment path to the local loop spine. It is the single largest piece of prior art here.
- **52 (loop-registry-and-graph) is deliberately NOT a dependency.** The two are parallel-eligible. A
  loop that could not run without a declared graph would charge every adopting repo the graph's cost
  before it had a reason to pay it, and would contradict this arc's own "the graph must earn its cost"
  constraint. 52 makes this loop *inspectable*; it does not make it *possible*. The coupling appears
  one rung up the ladder — at 55, where L3 is unlocked — not here.
