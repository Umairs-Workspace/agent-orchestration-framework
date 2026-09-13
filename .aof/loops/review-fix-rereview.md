---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: loop:review-fix-rereview
kind: loop
title: Review, fix, and re-review
controlled: open review findings
reference: [prose:src/bundle/commands/continue.md]
measurement: [prose:src/bundle/commands/continue.md]
actuator: [prose:src/bundle/agents/aof-developer.md]
cadence: event:per-phase
ceiling: [config:work.loop.reviewRounds]
owner: unknown
optimizing: true
layer: operational
---
# Review, fix, and re-review

Framework record source: `src/bundle/loops/review-fix-rereview.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

The controlled variable is open structural, behavioural, and design-conformance findings, judged
against the contract and ADRs; the reference, agent-judged measurement, and phase trigger are described
at `src/bundle/commands/continue.md:65-70` and RESEARCH §Q1.2. Because no deterministic grader is named,
both evidence axes correctly point to that prose.

Confirmed fixes are applied through the developer (`src/bundle/commands/continue.md:65-66`), so the
narrowest actuator is `src/bundle/agents/aof-developer.md:1`, byte-identical to build-to-green's real
shared lever. The ceiling points to `config:work.loop.reviewRounds`, whose resolver owns the number;
RESEARCH found no loop owner, hence the uncited and honest `owner: unknown`.

`optimizing: true` means this iterative loop drives the open-finding count toward zero through an
actuator that can change that count. That differs from verify-triage-accept: review loops through fixes
and re-review, whereas verify is a terminal acceptance gate. No independent watcher or arbiter is cited,
so no `monitoring` or `veto` edge is manufactured.

**`layer: operational`, corroborated by its own cadence.** The trigger is `event:per-phase`, whose
scope sits inside a single phase, and the layer declared here is the one that scope implies. It is an
ordinal, compared with the layer of the loop that sets this one, and no duration is derived from it.

**Its reference is set by `loop:autonomous-cascade`, one layer above it.** The edge is declared on
the cascade's own record and is labelled there as authored: the item the cascade selects is what
determines what this loop judges — that item's contract and its ADRs. `owner:` is a different claim
and stays `unknown`; naming who sets the reference does not name who is accountable, and the gap is
still reported.
