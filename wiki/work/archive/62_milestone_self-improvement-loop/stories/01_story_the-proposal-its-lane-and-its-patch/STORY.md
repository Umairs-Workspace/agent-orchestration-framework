---
type: story
number: 01
slug: the-proposal-its-lane-and-its-patch
title: "The proposal, its lane and its patch — the registry decides which lane, and no computable patch means no applier"
parent: 62
status: done
owner: product-owner
created: 2026-08-31
updated: 2026-09-01
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-003, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-004, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-007, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-010, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-008, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-001, src/work-acceptor/admissibility.mjs, src/bundle/loops/speed-thoroughness-autonomy.md, src/command-core.mjs, src/work-counters.mjs, src/work-loops.mjs, src/work-bundle.mjs, test/arch/acd-tunable-set-is-the-registry.test.mjs, scripts/test.mjs]
files: [src/work-tune/proposal.mjs, test/arch/acd-proposal-class-is-computed.test.mjs, test/arch/acd-no-patch-no-applier.test.mjs, test/tune-proposal.test.mjs, scripts/test.mjs]
---
# 01 · The proposal, its lane and its patch

## User story

As the human who will read a harness-change proposal and decide whether to apply it,
I want each proposal to be a complete object — what changes, from what to what, and which registered
command applies it — or to say plainly that no such change is computable,
so that I am never handed a half-rendered diff and left to finish it approximately.

Two decisions do the work here, and both are about refusing to keep a list. The first: a proposal's
**lane** is computed from the arbiter's own `parameter-tuning:` edge, read through `tunableSet(model)`.
A proposal whose target is on that edge can be routed to the acceptor; everything else is advisory and
no code path takes it toward a commit. Writing that partition as a table keyed by config key would make
this milestone a second home for the tunable set, which is exactly what 61 spent a story preventing.
Computed from the edge, a knob removed from the registry leaves the tunable lane with nothing edited
here.

The second: a proposal carries a **patch** only where a complete before→after over a declared target is
computable. A cap adjustment is complete — this key, this current value, this proposed value. A model
reallocation is complete — this role, this current model, this proposed model. A prompt revision is not:
this milestone cannot author replacement prose, and a blob of model-written text presented with the
authority of a computed change is worse than no proposal at all. A story-sizing hint has no target file
whatsoever. Those carry no patch, carry no applier, and say which of the two they are. They are still
emitted, still carry their evidence, and are still worth a human's time — as findings, not as diffs.

The applier is the third refusal to keep a list: it is a **registered command id** that the registry
answers for, never a shell string and never a prose instruction. The set of things that can change this
system is the command registry, and a proposal naming anything outside it is naming a hand-edit and had
better say so.

Three of SPEC's four proposal classes therefore can never auto-apply, under any future evidence — model
maps are non-ordinal by 61/ADR-001 §5, and a prompt revision and a sizing hint are not steps on an
integer at all. That is a property of the class, not this quarter's limitation, and the object says so.

## Tasks

- [x] `tasks/00_the-lane-is-the-registrys-answer.feature` — a proposal targeting a key on the arbiter's tuning edge is tunable-lane and any other target is advisory, with the edge as the only source of that answer
- [x] `tasks/01_an-advisory-proposal-reaches-no-commit-path.feature` — over a registry declaring no tunable key every proposal is advisory and the acceptor is not consulted at all
- [x] `tasks/02_no-computable-patch-no-applier.feature` — a proposal that cannot compute a complete before→after carries no patch, no applier, and a coded reason naming what makes it uncomputable
- [x] `tasks/03_an-applier-is-a-command-the-registry-answers-for.feature` — every applier resolves to a registered command, and one that does not is refused rather than rendered
- [x] `tasks/04_a-patch-is-read-against-the-value-in-force.feature` — a patch's `from` is the target's value at emit time, so a proposal whose premise has already moved is refused rather than rendered against a stale base

## Notes

- **Lane membership is computed, never typed** (`ARCHITECTURE.md#ADR-003` §1). No tunable key literal
  and no class→lane map lives in this module; 61/ADR-008 §4 is the rule being honoured.
- **The advisory lane is permanent** (`ARCHITECTURE.md#ADR-003` §2), because 61/ADR-001 §5 already
  rules model maps non-ordinal and a permanent human diff. The surface states it as a property of the
  class.
- **No half-diff** (`ARCHITECTURE.md#ADR-004` §1, §2). A patch is complete or absent; there is no
  third state, and the completeness is checkable as three fields present together.
- **The two lanes read `from` through two different homes, deliberately** (`ARCHITECTURE.md#ADR-012`
  §4). The tunable lane's arrives on the acceptor's report, where `declaredKnob`/`valueAt` already
  resolve it, and must NOT be re-resolved here. The advisory lane's is resolved here, through
  `agentModelMap` / `AGENT_MODEL_MAP_PATH` (`src/work-bundle.mjs`) — *"the ONE accessor both render
  and validation call — do not re-walk the path"* — over the config the face hands in.
- **`from` equal to `to` is a finding, not a no-op proposal** (`#ADR-012` §8): emitting it would let
  it count toward ADR-001 §4's non-vacuity condition.
- **The patch/applier asymmetry is intended** (`#ADR-012` §9): a patch with no applier is reachable; an
  applier with no patch is not.
- **This module is PURE** — records, config, provenance verdicts and the applier resolver are handed
  in; no filesystem, no clock, and **no static import of `src/command-core.mjs`** (`#ADR-013` §2).
  The ring ban is family-wide because a leaf closes it exactly as well as the face does, measured; the
  face injects a `resolveCommand` bound to `getCommand`, and this module calls what it was handed.
- **`from` is the value in force at the LAYER THE PATCH WRITES, and `absent` is a value** (`#ADR-013`
  §9). At HEAD the config carries no `work.loop` section and no model map, so a patch that ADDS a key
  is the normal case, not an error case; the shipped bundle default is never read here (§9a).
- **And the comparison is against the base THE EVIDENCE ASSUMED, not against non-null** (`#ADR-014`
  §1). Absence-as-assumed renders a patch; absence where the evidence assumed a value is a moved
  premise and renders none, with both readings named. Every `work.loop.*` key's evidence was gathered
  under an absence, so this is the normal path here rather than an edge case.
- **The candidate arrives formed.** 62/05 clusters and carries the sources; this story shapes, lanes
  and patches what it is handed.
  That is what keeps it independent of 62/00 and 62/02 and buildable beside them.
- **Two controls land with this story**, `FF-6202` and `FF-6203`.
- **Stage 1** — builds in parallel with 62/00, 62/02, 62/03 and 62/05; no edge to any of them.
- **The corpus-wide non-vacuity claim moved to `FF-6208`** (`#ADR-013` §7); FF-6202 and FF-6203 prove
  non-vacuity over planted fixtures, which this story can clear on its own.
