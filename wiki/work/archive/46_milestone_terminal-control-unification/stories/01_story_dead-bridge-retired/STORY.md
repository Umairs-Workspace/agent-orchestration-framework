---
type: story
number: 01
slug: dead-bridge-retired
title: "The dead bridge is deleted and the fitness function guarding it is re-aimed at the producer that actually runs — a gate reading green about nothing is worse than no gate"
parent: 46
status: done
owner: product-owner
created: 2026-08-08
updated: 2026-08-08
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 01 · `wireTerminalBridge` is deleted, and its gate is re-aimed at the real producer

## User story

As the engineer trusting this repo's fitness functions,
I want the gate that asserts "no credential material ever enters the streamed terminal output" to be
pointed at the code that actually streams terminal output,
so that a green CI run means the invariant holds in production — not that it holds in a function
nothing calls.

`wireTerminalBridge` ([mesh-terminal-relay-bridge.mjs:187](../../../../../../src/mesh-terminal-relay-bridge.mjs#L187))
has **no production caller**. Spike 44 grepped it: the only references are its own definition and
`test/mesh-terminal-relay-bridge.test.mjs`. Production streams through
`onOutputChunk: (chunk, sessionId) => client.sendTerminalFrame(...)`
([mesh-launcher.mjs:1152](../../../../../../src/mesh-launcher.mjs#L1152),
[:1291](../../../../../../src/mesh-launcher.mjs#L1291)).

Meanwhile [acd-fleet-terminal-input-constrained](../../../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs)
detector #4 asserts that function's `String(chunk)` shape and its freedom from
`process.env` / askpass / mint material — SECURITY T14's surviving half. So the repo's guard against
credential leakage into a terminal stream is aimed at a corpse, and has been reading green while
asserting nothing about the path that carries real bytes off a worker.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_the-signal-gate-follows-the-real-producer.feature`

## Notes

**Order: none.** No dependencies in either direction. `src/mesh-terminal-relay-bridge.mjs` has 16
dependents but **only one dying export**, and the graph confirms no dependent imports it
(measured at the fresh build, 2026-08-08T14:20:13.555Z). Parallel-eligible.

**Governing ADR: [ADR-007](../../ARCHITECTURE.md).** The **invariant is preserved and re-aimed**, never
relaxed: *the streamed output signal is sourced exclusively from `term.onData`, and no credential, env,
askpass or mint material ever enters it.* Only the corpse goes. A story that deleted the function and
the detector together would be trading a misaimed gate for no gate at all, which is the strictly worse
outcome.

**The operator ruled this into scope** at refine (2026-08-08), against the alternative of leaving it as
carried debt. It is the one `src/` change in this milestone that is neither the origin seam nor the
frame queue.

**Deletion checklist — enumerate every reader before removing the export.** `wireTerminalBridge` is
documented as dead in *three* separate places (`scripts/test.mjs`, the identity gate's header comment,
and spike 44) and is still on disk; the risk here is the mirror-image mistake of deleting the export
while a fourth reader nobody enumerated still imports it. `test/mesh-terminal-relay-bridge.test.mjs`
exercises it directly and is the known one — decide its fate deliberately (the envelope builders
`buildTerminalFrameEnvelope` / `buildTerminalInputEnvelope` in the same module are **live** and their
coverage must survive).

**Not in scope:** any change to the mirror, the input lane, or the envelope shape. Invariants 1, 2 and 3
of `acd-fleet-terminal-input-constrained` and its whole behavioural lane are untouched by this story.
