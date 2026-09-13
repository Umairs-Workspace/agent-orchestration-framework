# 62/01 · The proposal, its lane and its patch — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The proposal object
A proposal carries `class`, `target`, `lane`, `laneBasis`, `evidence`, `patch`, `applier`, `reason`,
`finding`, `provenanceResolution`, `sourceFacts` and `distance`, and its class comes from a frozen set
equal to SPEC's four.

### A lane the registry decides
Lane membership is computed from `tunableSet(model)`'s keys — the arbiter's own `parameter-tuning:`
edge — so no module under `src/work-tune/` holds a tunable key literal or a class→lane map, and a knob
removed from that edge leaves the tunable lane with no edit here.

### Routing is not committing
A non-ordinal key declared on the tuning edge is routed to the tunable lane and its refusal comes back
from the acceptor; no path in the family decides ordinality or diverts a proposal on the ground that 61
would refuse it.

### No computable patch, no applier
A proposal with `patch: null` carries `applier: null` and a coded reason, while a patch with no
applier is a reachable, rendered state — the asymmetry runs in one direction only. Every applier
resolves through the injected `resolveCommand` to a registered command, and is never a shell string, a
file path or a prose instruction.

### `absent` is a value
A patch over a key the config does not carry renders `from: absent` with a `fromSource` that says so —
at HEAD that is every `work.loop.*` key and the whole model map — and the shipped bundle default
appears nowhere as a `from`.

### A patch renders only on the base its evidence assumed
The four-row base table is driven whole: absent/assumed-absent and held/assumed-that-value render;
absent/assumed-a-value and held/assumed-otherwise are moved premises with both readings named. A
proposal whose `from` equals its `to` is absent from the emitted set and present in `findings` as
`already-in-force`.

## Assumptions

- **The two lanes read `from` through two different homes on purpose** — the tunable lane's arrives on
  the acceptor's report and is not re-resolved inside the family; the advisory lane's comes from
  `agentModelMap` over the config the face supplies.
