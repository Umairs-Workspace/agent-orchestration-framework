# 63 · Event-driven triggers — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

<!-- Milestone-level state only. Where a story states a capability whole, it is CITED rather than
     restated — the aggregation happens in the recall index, not by writing one fact twice. -->

### aof's loop can be woken by something other than a person
A trigger is reviewable data that resolves to a `work:loop` input and the argv carrying it, with no session acting as orchestrator anywhere on the path. Four sources — a cron cadence, a mesh assignment, a CI signal and an inbound feedback finding — all resolve through one compiler and one face. The declaration this tool ships is non-vacuous over itself: every declared source has a trigger that resolves. Stated whole by `m63/00`, `m63/04` and `m63/05`.

### The trigger layer is a caller, and that is structural rather than careful
Nothing under `src/work-trigger/` or `src/commands/trigger.mjs` spawns a process, drives a phase, performs gate arithmetic, holds a clock or a receiver, or authors a slash command — and `work:trigger` declares no `cli.launch`, so it cannot launch even by accident. The one launcher 53 left the loop stays the only one.

### An unattended run is bounded by a declaration the machinery enforces, not by convention
The frozen set's fourth enforcement point compiles: `gate-order` leaves `deferred`, and an unattended launch resolves only the declared program and leading argv — anything else is a coded refusal carrying nothing spawnable. Every attended launch is byte-identical to what it resolved before. Stated whole by `m63/02`.

### A declared level is a request the gate re-decides at every fire
No trigger caches an admission verdict, no config key or flag admits L3 by the back door, and a refused level is named with its failing half rather than silently downgraded. Stated whole by `m63/01`.

### The one dispatch phase with an orchestrator to remove no longer has one
`autonomous` resolves to a loop launch carrying a scope; `refine`, `continue` and `verify` send the bytes they always did. Stated whole by `m63/03`.

### An unattended loop run is watched as a process and settles on its own exit
Stated whole by `m63/06`.

### What holds all of this is eight controls, each of which has been seen red
Every declared control has a recorded red probe — the change made, the message observed, the revert proven byte-identical. Three of them are green over trees that never held the defect, and their probes are the only evidence they are armed.

## Assumptions

- **A dispatched loop carries no level, so `resolveLoopLevel`'s default applies — and that default is L2, which DRIVES.** Nothing in the trigger or dispatch path names a level, which is what keeps 55/FF-5508 unbreached; the consequence is that dispatching `autonomous` dispatches a driving loop, not a report-only one.
- **The mesh is the execution substrate, and this milestone assumed it healthy.** 63 touches only the trigger→loop seam; leasing, reclaim, presence and routing are untouched and were taken as working.

## Gaps

### The cross-machine trigger path has no automated cover
- **Status:** open
- **Discharge condition:** a two-node lane in CI or a scheduled soak that enrols, dispatches and settles against a real relay, so admission, frame shape and payload identity are exercised by a machine rather than by an operator who happens to look.
Every mesh test drives in-process fixtures on one host. Three defect classes are unreachable by construction — a value correct on loopback and wrong for a remote peer, a frame well-formed when a fixture builds it and malformed when a peer sends it, and an identity derived correctly but describing the wrong artefact. Four such defects were latent for a month and were found by hand in one evening (`VERIFICATION.md` F-63-K, F-63-L, F-63-M, F-63-Q; the gap itself is F-63-N).

### The live skewed-pair lane is observed in one direction only
- **Status:** open
- **Discharge condition:** a mesh workspace where the worker is enrolled with a local clone AND the configured credential provider can mint for that repo.
Two of `63/03 tasks/03`'s four Outline rows are observed and passing; the two needing the upgraded worker are not. Carried in full on `63/03`'s own `OUTCOME.md`.

### An unattended loop's output has no route to the fleet terminal view
- **Status:** open
- **Discharge condition:** a run-scoped frame identity the fleet mirror accepts.
Carried whole by `m63/06`'s `OUTCOME.md`.
