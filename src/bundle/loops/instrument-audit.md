---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: auditor:instrument-audit
kind: auditor
title: The instruments are audited by something none of them supervises
audits: [module:scripts/test.mjs#tests, module:src/work-audit/census.mjs#runCensus, module:src/work-audit/evidence.mjs#runEvidence, module:src/work-audit/spawn.mjs#runBounded, module:src/work/doctor-controls.mjs#fitnessDeclarations, module:src/work/loops-checks.mjs#buildGroundednessReport, command:work:loops-validate, watcher:autonomous-cascade-watcher, watcher:build-to-green-watcher, watcher:review-fix-rereview-watcher, anchor:rubric-process-exit, anchor:run-lifecycle-policy, anchor:run-liveness]
measurement: [command:work:audit]
cadence: event:per-milestone
escalation: actor:operator
reporting: [actor:operator, actor:product-owner]
---
# Instrument audit

Framework record source: `src/bundle/loops/instrument-audit.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

This is the framework's own auditor, and the first record written in the grammar 59/00 added
(ADR-001 §1). Every previous widening of this registry shipped the records that use it in the same
milestone; a grammar nobody writes in is a grammar nobody has tested.

**What it audits, and why none of it is a work item.** The `audits:` list is the measuring
apparatus, not the work: the runner's assembled suite (`scripts/test.mjs#tests` — the array CI
actually executes, which is the authority 59/01 replaced a source-text search with), the three audit
lanes and the one bounded spawn seam they all go through, the register grammar the evidence lane
reads controls out of, the checks leaf that decides staleness and silence, the registry-validation
command, and the six declared instruments of this registry — three watchers and three anchors. An
`item:` endpoint is not merely absent here; the kind refuses one (ADR-001 §1), so *"the audit does
not review the work"* is a grammatical impossibility rather than a convention. Judging the work is
`loop:verify-triage-accept`'s, and this record cannot reach it.

**How it reads them: a command, never a document.** `measurement: [command:work:audit]` is a
registered command on the same command core `work:doctor` sits on (ADR-002 §2). An auditor's
measurement admits no `prose:` pointer at all (ADR-001 §1) — a prose authority means a person or a
model read something and reported it, which is the agent-as-judge auditing this milestone puts out
of scope wearing a machine's clothes.

**Its cadence is declared, and nothing schedules it yet.** `event:per-milestone` says how often the
instruments should be checked. ADR-007 §1 is explicit that this milestone does **not** put the audit
on the frozen five-row cost ladder — 54/FF-5409 froze that as a delivered acceptance criterion, and
adding a sixth row would edit a shipped contract. So the cadence is a fact on this record and the
trigger that honours it is milestone 63's. Until then the audit is runnable on demand, by an
operator or by a loop, with `aof work audit [scope] [--json] [--strict]`, and this paragraph says so
rather than implying a scheduler that does not exist.

**Where it can go directly.** `escalation: actor:operator` names an actor whose `ground:` is
`exogenous` — the registry's sole exogenous contact with reality (`src/bundle/loops/operator.md`).
It is an actor and not a loop on purpose: a bypass that terminated at another loop would be one more
hop through the machinery it exists to route around (ADR-006 §3). A finding whose code is in the
escalating set reaches this actor **in addition** to its reference-owner, never instead of one.

**What it declares no edge to, and that is the design.** `reporting:` names two actors and nothing
that appears in `audits:`. An auditor that reported to the thing it audits would be the arrangement
this milestone exists to replace, and the two lists are compared by a control rather than trusted.
The kind admits only `data-feed` and `reporting` as edges (ADR-001 §5a); `monitoring` is refused at
the endpoint for a measured reason — `checkPairing` adds every source's `monitoring` endpoint to its
paired set regardless of the source's kind, so an auditor declaring `monitoring: [loop:x]` would
clear a **gating** finding for that loop *by auditing it*. This record declares no `data-feed`
either: it reads its instruments through the command above, and an edge asserting otherwise would be
a claim no artifact supports.
