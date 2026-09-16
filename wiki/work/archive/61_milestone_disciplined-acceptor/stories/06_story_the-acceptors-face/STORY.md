---
type: story
number: 06
slug: the-acceptors-face
title: "The acceptor's face — report-only by default, and every refusal that applies said out loud"
parent: 61
status: done
owner: product-owner
created: 2026-08-30
updated: 2026-08-31
depends: [61/00, 61/01, 61/02, 61/03, 61/04, 61/05]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-003, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-010, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-011, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-013, wiki/work/59_milestone_audit-loops/ARCHITECTURE.md#ADR-002, src/commands/audit.mjs, src/command-core.mjs, test/arch/acd-work-command-cli-bijection.test.mjs, test/arch/acd-work-command-route-coverage.test.mjs, test/command-core-contract.test.mjs, test/support/source-slice.mjs, src/loop-bounds.mjs, src/effects/journal.mjs, src/work-acceptor/admissibility.mjs, src/work-acceptor/criterion.mjs, src/work-acceptor/ledger.mjs, src/work-acceptor/observations.mjs, src/work-acceptor/store.mjs, src/bundle/loops/speed-thoroughness-autonomy.md, wiki/work/61_milestone_disciplined-acceptor/stories/02_story_the-observation-census/STORY.md, wiki/work/61_milestone_disciplined-acceptor/stories/04_story_the-rule-and-the-ledger/STORY.md, wiki/work/61_milestone_disciplined-acceptor/stories/05_story_the-event-a-ruling-raises/STORY.md, wiki/work/60_spike_acceptor-discipline/SPIKE.md]
files: [src/commands/acceptor.mjs, src/command-core.mjs, src/effects/harness-transitions.mjs, src/work-acceptor/rule.mjs, test/arch/acd-work-command-cli-bijection.test.mjs, test/arch/acd-work-command-route-coverage.test.mjs, test/arch/acd-report-only-is-the-default.test.mjs, test/arch/acd-dwell-gates-reversion-only.test.mjs, test/acceptor-command.test.mjs, test/command-core-contract.test.mjs, scripts/test.mjs]
---
# 06 · The acceptor's face

## User story

As the operator deciding whether this machinery is working or merely quiet,
I want one command that shows every pending proposal, the evidence behind it, the verdict and every
reason it did not commit — with a stable machine-readable shape,
so that "nothing happened" is a sentence I can read the reasons for, rather than a silence I have to
guess at.

The distinction this face exists to draw is the one spike 60 ranks as the milestone's real hazard. An
acceptor that structurally never fires is not a discipline but an off switch, and an off switch that
blocks real improvements gets routed around — which is the failure this whole arc exists to prevent,
re-entering by the back door. So "four rulings, threshold eight" and "this knob yields under one pair
per epoch; the floor is eight epochs away" must never render as the same sentence. The first is the
machinery working. The second is the machinery telling you it will never work as configured.

For the same reason the refusals do not collapse to the first one that applies. At HEAD a knob is
*both* inadmissible *and* unmeasurable, and those are two independent pieces of engineering; showing
only the first hides half the work needed to make the acceptor live.

The census the surface reports has to be honest about what it counted, but that is no longer this
story's to build: it was lifted into 61/02 at refine, because it reads the journal and is coupled to
nothing here. What remains here is the obligation to render what 61/02 counted — including what it
excluded — rather than presenting a filtered number as an unqualified one.

## Tasks

- [x] `tasks/00_one-command-over-the-acceptor.feature` — the verb is registered where every other work command is registered, its machine-readable output carries everything the human one does, and it declares no strictness flag
- [x] `tasks/01_report-only-is-the-default-and-permanent.feature` — the default answer is report-only, with the threshold and the current evidence count both visible, and committing is never the default
- [x] `tasks/02_every-refusal-that-applies-is-reported.feature` — all eight applicable refusals are reported in a fixed order rather than only the first, each names what would remove it, and a construction refusal never enters the lane
- [x] `tasks/03_a-structural-silence-is-told-apart-from-a-short-ledger.feature` — a knob that cannot reach the threshold as configured reads differently from one that is accruing toward it, and the distance is computed rather than asserted
- [x] `tasks/04_dwell-gates-reversion-and-never-gates-harm.feature` — a reversion inside the dwell window waits, and a counter-metric degradation pulls the change immediately regardless of dwell

## Notes

- **`src/command-core.mjs` is a god node** — 139 dependents, 84 dependencies (`aof graph impact`,
  2026-08-30) — where a new command costs one import and one array entry. One story owns it for the
  whole milestone, on 59's reasoning: several stories appending to one array is merge friction
  wearing an independence claim.
- **No `--strict` flag** (`ARCHITECTURE.md#ADR-010` §3). 59/FF-5911 holds the set of core commands
  declaring one closed, and this command has no gate to declare — which is also the right answer on
  the merits.
- **The face reports; it does not schedule and it does not propose.** `ARCHITECTURE.md#ADR-011` lists
  what this milestone deliberately does not do. Generating proposals is milestone 62's.
- **The census belongs to 61/02, and this story renders it.** Lifted out at refine on the
  developer's feasibility finding — it has zero coupling to the rule, the ledger or the command
  surface, so it builds in stage 1 instead of behind all three.
- **The refusal vocabulary is EIGHT, and `ARCHITECTURE.md#ADR-013` is why.** Re-refined
  2026-08-30 after the orchestrator found this contract's "seven" in conflict with what 61/04
  shipped. ADR-013 supersedes ADR-010 §2 on membership and order only: the **ruling lane** (the
  per-knob array saying why a knob did not move) is a frozen eight, `not-an-ordinal-knob` admitted
  as the structural twin of `step-would-be-compound`; every other coded refusal in this milestone is
  a **construction** refusal that never enters the lane. Task 02 is authored against that.
- **One scoped write into 61/04's module** — `src/work-acceptor/rule.mjs:517`, the single filter that
  takes `trial-unit-undeclared` out of `knobReport().refusals` (it stays on `basket.refusal`, where
  `FF-6103`'s delivered assertions read it). ADR-013 §4a assigns it here and bounds it to
  `knobReport`'s refusal filter and its comment; every other line of that module stays 61/04's. It is
  the one exception to ADR-012 §2's sole-writer table in this milestone.
- **Two integration seams were absent from refine's file set and were added when the full registry
  gates ran.** `test/command-core-contract.test.mjs` owns the exact work-command census and
  `test/arch/acd-work-command-route-coverage.test.mjs` owns the explicit CLI-only carve-out. The
  command cannot import the store (FF-6108), so `src/effects/harness-transitions.mjs` gains only the
  read-only `readHarnessRulings` facade over the store it already imports; the command still cannot
  reach a knob writer. These are the full-suite closure edits, not new product surfaces.
- **`assessProposal`/`assessTunableSet` expose a `refusals` array that is NOT the lane.** It answers
  the prior question and carries `key-outside-declared-set` / `harness-not-introspectable` as grounds
  (ADR-013 §1b). Render `not-admissible` into the lane and those two beneath it as detail; lifting one
  into the lane is the defect FF-6112 leg 3 exists to catch.
- **Stage 4** — the terminal story, and the only one that touches the command registry.
