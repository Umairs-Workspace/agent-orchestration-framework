---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: actor:operator
kind: actor
title: Human operator
ground: exogenous
target-setting: [loop:autonomous-cascade, loop:mesh-assignment-reclaim, loop:retrospective-memory-ingest, arbiter:speed-thoroughness-autonomy]
---
# Operator

Framework record source: `src/bundle/loops/operator.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

This actor is the human operator and therefore the registry's sole exogenous contact with reality;
ADR-005 §1 defines that role and `ground: exogenous`. The `actor:` id and title distinguish this node
from the seven controllers and require no loop-only control fields.

This record declares four target-setting edges, and they did not all arrive the same way. **One was
discovered and three were authored**, and each is labelled below so a reader meets the claim where
it is declared rather than having to open another file to find out which kind it is.

**`loop:autonomous-cascade` — DISCOVERED.** The operator sets the cascade's range through the command
argument at `src/bundle/commands/autonomous.md:15` (*"a range — an inclusive `NN-MM` range or a single
`NN`; pass it to the shell verbatim"*), which is threaded into the shell's `scope`; the cascade then
drives that range until `work:next` reports done. That artifact states the relation, so this edge is
read off the repository and cites it.

**`loop:mesh-assignment-reclaim` — AUTHORED, and no citation is offered for the relation.** What is
*discovered* is that this loop's reference is two genuinely config-settable numbers — `work.loop.heartbeatMs`
(resolved at `src/loop-bounds.mjs:48-50`) and `mesh.presence.stalenessSeconds` (resolved in
`src/mesh/presence.mjs`) — and that **nothing but a hand edit of `.aof/aof.config.json` changes
either**: RESEARCH §Q3 grepped for a programmatic writer of any loop-bound key across the command
surface and found none. What is *authored* is the claim that hand-editing those keys is an operator
act, and therefore that the operator is the node that sets this loop's reference. That is milestone
58's judgment (ADR-001 §2, §4), not a sentence any artifact in this repository supplies.

**`loop:retrospective-memory-ingest` — AUTHORED, and no citation is offered for the relation.** What
is *discovered* is that its reference — what counts as a lesson worth making recallable — is written
progressively by whichever role is active when a lesson surfaces, an aggregate with no single author
(RESEARCH §Q1.7). What is *authored* is that a governance judgment with no declared revising cycle
belongs to the operator. It is a decision, taken in the open, because the alternative was to invent
an owner or to leave a reference nobody is accountable for.

**`arbiter:speed-thoroughness-autonomy` — AUTHORED, and it is the only non-loop target admitted.**
What the operator sets there is the arbiter's `priority:` — the order in which speed, thoroughness
and autonomy win when they contend for the same agent. The human owns what is worth controlling at
all, so an arbiter whose priority no one is recorded as setting would be the evening's mood one level
up. No fourth loop edge and no second non-loop target is admitted here for any other reason
(ADR-001 §4).

**What changed since 52, and why it is not a reversal.** 52 recorded that no additional operator
relation had *equally direct evidence*, and added no edge on that ground; that discipline stands and
is the reason the three edges above are labelled authored instead of being dressed in citations they
do not have. What 58 changes is not the evidence but the move: an edge with no artifact behind it is
declared as a design act, in the open, rather than left absent. A citation this repository does not
supply is still never manufactured.
