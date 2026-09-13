---
doc: retrospective
milestone: 48
written: 2026-08-11
---
<!--
  Milestone RETROSPECTIVE.md — the distilled lessons from how execution actually went.
  One R<n> per lesson, appended and never renumbered. References VERIFICATION findings, ADRs and
  the observability snapshot; never restates them. A clean catch with no process lesson is NOT an
  entry — it already lives in VERIFICATION.md.
-->
# 48 · Routable session identity — Retrospective

Distilled from `STATE.md`'s `## Feedback (for retro)` notes, [VERIFICATION.md](VERIFICATION.md)'s two
findings and their discharge, and the [observability snapshot](observability/report.md) over 23 agents.

**The through-line: five of the seven entries below are the same mistake wearing different clothes — a
claim about the producer, checked against a MIRROR of the producer instead of the producer itself.** The
typed declaration instead of the shaper (R6). The ADR's own summary of which gates it re-arms, instead of
a grep of the assertions (R2). A Gherkin row's premise about what a filesystem can store, instead of a
measurement (R4). A guard that matches the *text* of a command instead of the thing being guarded (R5). A
captured fixture that stood in for the producer until the producer moved (R3). This milestone's entire
purpose was to stop a wire from lying about what exists; it is fitting, and a little pointed, that its
own costs came from contracts written against stand-ins.

---

## R1 · A producer that drops data is a wire that cannot be re-read

m38/ADR-004 could not compute run-subsumption at the render, so it applied the rule at the **producer**
and pinned it there — `acd-session-run-reconciliation` asserted the same-workspace session was *absent*
from the assembled `sessions[]`. Two milestones later that exact session is the one that has to be
addressable, so the wire had to become complete and the fitness function's central assertion **inverted**
([ARCHITECTURE.md](ARCHITECTURE.md) ADR-004). m38 was not wrong — its F1 finding proved the render
genuinely could not derive the attribution — but it chose "drop it upstream" over "publish the missing
fact", and only one of those is reversible.

**Carry:** when a render cannot compute a rule, prefer publishing the missing FACT over applying the rule
at the producer. A dropped row is unrecoverable downstream; a fact everyone ignores costs a key.

## R2 · When an ADR re-freezes a shape, grep for every exact-key assertion over that shape

[ARCHITECTURE.md](ARCHITECTURE.md)'s "Explicitly NOT re-armed" section stated that
`acd-active-runs-frozen-string-array` "stays green untouched" — true of its `activeRuns` clauses, false of
its session clause, which pins `Object.keys(record.sessions[0])` as the m38 four. ADR-005's six-key entry
turned **three** arch-tests red, not the one the story partition named, and two of them live in files
named after a *different* invariant.

**Carry:** a producer-fed contract test pins a shape wherever the shape is fed, including in files named
after something else. Before writing "re-armed" vs "untouched", grep the repo for every `Object.keys(…)`
deep-equal over that shape and enumerate from the results, not from memory of the design.

## R3 · A cross-language captured fixture makes a key addition an operator gate — and the gate's own tests decide how it can be discharged

The milestone scheduled this correctly: it knew `acd-captured-producer-fixture` would go red, named it in
advance as the one human gate, and refused to hand-edit a payload to hide it. What the plan got wrong was
the *shape* of the discharge. It prescribed "deploy, run `aof mesh status --json` on a machine with a live
session, replace all three payloads" — but each fixture's own Rust assertions constrain the fleet it must
contain: empty `activeRuns` for the working-line regression, a two-repo node, a deliberately
non-alphabetical wire order, a named sessionless peer. A single live capture satisfies none of those and
would have taken four passing Rust tests down with it. The discharge that worked
([VERIFICATION.md](VERIFICATION.md) F-48-1) was three re-captures through the real aggregator with the
clock injected at each fixture's own original instants — so the diff is *only* what m48 changed — plus one
live capture for the branch that genuinely needs a real fleet.

**Carry:** when scheduling a captured-fixture re-capture, read the assertions the fixture feeds, not just
the fixture. The plan's unit is "what fleet must this payload contain", and a fixture whose shape cannot
occur on the operator's real machine needs a controlled producer run, not a live one. Injecting the clock
at the original capture instant is what makes the re-capture reviewable: the diff collapses to exactly the
keys the producer grew.

## R4 · An Examples row can smuggle a platform capability into an identity contract

`48/00/00_the-id-ladder.feature`'s byte-identity table carried a "200-character id" row. The claim it
*means* — never truncated — is real and binding. The claim it literally *makes* — a 200-char id is
persistable — is false on every filesystem in this fleet, because ADR-002 puts the key in a filename and
`src/fs.mjs` prepends ~62 characters of temp prefix (measured: 164 writes, 165 fails). Routed to
[TECH_DEBT](../TECH_DEBT.md) item 34 rather than fixed inside m48. Two second-order lessons came with it:
the developer's honest two-worlds discharge (succeeds byte-identical **or** fails leaving no record)
admitted a silent third world — neither threw nor wrote would have passed vacuously; and it pinned errno
`ENOENT`, the Windows spelling, which would have shipped green here and gone red the first time the suite
ran on the WSL worker or the Mac.

**Carry:** when a scenario asserts a value's size or charset, ask whether the assertion is about the
contract or about the substrate the contract is stored in. An either/or discharge must assert its branches
are exhaustive AND exclusive. And never pin a bare errno in a repo that runs on three platforms — assert
the property, carry the code as diagnostics.

## R5 · A guard that matches on command text is simultaneously too weak and too strong

The test-isolation hook was hit from both directions in one milestone. It **failed open** on an indirect
entry point: `scripts/check.mjs` shells the full suite, and a developer working under an explicit
"never run the full suite" instruction ran it anyway, because the instruction and the hook both name
`scripts/test.mjs` and a wrapper matches neither. It **failed closed** on `aof work feedback … --note "…"`,
twice, because a note *describing* a suite run is textually indistinguishable from one. This verify
session hit the false-positive four more times — on `sed`, `grep`, `git diff` and `tail` against
`scripts/test.mjs`, none of which execute anything.

**Carry:** the honest home for this rule is the thing being guarded, not the pattern. `scripts/test.mjs`
and `check.mjs` should refuse to run without an isolated `AOF_GLOBAL_HOME` themselves, with the hook kept
only as a fast outer hint. Filed against `.claude/hooks/aof/guard-test-isolation.mjs` + `scripts/check.mjs`.

## R6 · An "exactly these keys" enumeration must be read off the producer, never its typed mirror

`48/03/01_attribution-and-the-free-session.feature` enumerated the global status payload's other top-level
keys as "exactly" six. The real `shapeGlobalStatus` has carried `stalenessSeconds` since m43/story 04 — the
six matched `GlobalMeshStatus`'s TypeScript declaration, which does not spell that key. Asserting the six
would have required *dropping* a pre-existing key to make the list match: the precise inverse of the
additive rule the scenario exists to protect. The developer asserted what the shaper really produces and
named the departure instead of editing the contract mid-build, which is the right call; the feature's list
was corrected at verify ([VERIFICATION.md](VERIFICATION.md) F-48-2).

**Carry:** an acceptance criterion that enumerates a wire's keys is a claim about the PRODUCER. Read it off
the producer at authoring time. A type that lags the wire is the same defect ADR-005 exists to prevent —
here it leaked into a contract, one layer earlier.

## R7 · `run-start` at dispatch is what makes a crash recoverable instead of invisible

Stories 02 and 03 were dispatched without `aof work run-start`, and both then died mid-build on an API
session limit — so `run-complete --outcome failed` had nothing to record against, and the store could not
offer the resume-vs-fresh decision the autonomous contract delegates to it. The
[observability snapshot](observability/report.md) measures what that cost: both agents show **~17 hours
wall, of which ~16.9 hours are stall** against roughly 21 and 27 minutes of actual work. The recovery
succeeded anyway — both had already landed their production code and were resumed on the same lineage —
but only because the agents happened to be independently resumable and the tree could be measured by hand.
Nothing in the store knew the work had been attempted.

**Carry:** `run-start` is not bookkeeping to tidy up afterwards; it is what makes a crash recoverable by
the next invocation instead of invisible to it. Start the run at dispatch, in the same breath as spawning
the agent.
