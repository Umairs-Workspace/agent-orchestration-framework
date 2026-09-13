---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: loop:retrospective-memory-ingest
kind: loop
title: Capture milestone lessons into memory
controlled: milestone lessons made recallable
reference: [prose:src/bundle/commands/retrospective.md]
measurement: [prose:src/bundle/commands/retrospective.md]
actuator: [module:src/work/memory.mjs#runMemory]
cadence: event:per-milestone
ceiling: none
owner: unknown
optimizing: false
layer: governance
---
# Retrospective memory ingest

Framework record source: `src/bundle/loops/retrospective-memory-ingest.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

The controlled variable is milestone lessons made recallable. Feedback, verification evidence, and
observability form the reference at `src/bundle/commands/retrospective.md:28-37`; agent triage is the
measurement at `src/bundle/commands/retrospective.md:38-40`. Those two authorities are prose because no
deterministic grader exists (RESEARCH §Q1.6).

The ingest act is reached through the defining export `runMemory` at `src/work/memory.mjs:496` — the
seam's in-process entry, a thin composition over the one core path (`runMemoryVerb`,
`src/work/memory.mjs:482`) that the registered command also runs. `ingest` is a member of `MEMORY_VERBS`
at `src/work/memory.mjs:58` and aliases the reindex path at `src/work/memory.mjs:470`; no finer
ingest-specific export exists. Since story 128 the memory surface IS a registered command id —
`work:memory` (`src/commands/work/memory.mjs`, route `aof work memory`) — but that id names the whole
verb surface (recall, brief, ingest, reindex, status), and the act this record actuates is the ingest verb
alone, which `runMemory` reaches with `["ingest"]` and nothing wider. `module:src/work/memory.mjs#runMemory`
is therefore still the narrowest real export; `command:work:memory` would be broader than the act.

Verify invokes retrospective ingestion at milestone close (`src/bundle/commands/verify.md:95-99`), which
defends `event:per-milestone`; a capture pass terminates by construction, so `ceiling` is `none`.
`src/bundle/commands/retrospective.md:44` assigns an owner to each lesson, not to this loop, so the loop
owner remains `unknown`. `optimizing: false` records a capture pass with no extremum to reach.

**`layer: governance`, corroborated by its own cadence.** The trigger is `event:per-milestone`,
the widest scope this vocabulary has, and the layer declared here is the one that scope implies. It
is an ordinal position, not a duration.

**Its reference is set by `actor:operator`.** The edge is declared on the operator's own record and
labelled there as authored, because what counts as a lesson worth making recallable is a governance
judgment with no declared revising cycle — written progressively by whichever role is active when a
lesson surfaces, an aggregate with no single author. No artifact in this repository names an owner
for it, and none is cited. `owner:` remains `unknown`: `src/bundle/commands/retrospective.md:44`
assigns an owner to each lesson, not to this loop.
