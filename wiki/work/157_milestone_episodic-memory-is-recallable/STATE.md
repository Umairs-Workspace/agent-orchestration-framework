---
doc: state
---
# 157 · Episodic memory is recallable — State

## Current position

2026-10-12: `aof:verify 157` accepted stories 01, 02 and 03.
- Every `@manual` scenario was walked: the live stream, plus a disposable stream for 03's edges.
- FF-15701 and FF-15702 are green, with recorded red probes.
- One blocker (VERIFICATION F-01, m153's FF-15301 census) was fixed inline and is closed.
- RETROSPECTIVE R1–R2 and the four OUTCOMEs (the milestone's and each story's) are authored.

The milestone moves to `done` after the whole-tree regression gate (`REGRESSION.md`).

## Decisions

- Episodic types are derived from existing sources and add no record field. JSON sources extend
  the locator string (ADR-001, ADR-002). Cancelled runs are terminal.
- Tune and lesson recurrence stay lesson-only, and `--all` overrides `--limit` (ADR-003).
- A matched prior finding is cited, never auto-closed (ADR-004). "The build record" for the retry
  acknowledgement is the milestone `STATE.md` `## Notes & decisions in flight` entry for the
  attempt. Verify confirmed this reading: it matches the way continue already names the milestone's
  `STATE.md` for recorded findings.
- The episodic leaf is `packages/knowledge/src/memory/episodic-indexing.mjs`. Core injects its
  readers through `createLocalIndexing({ episodicReaders })`.
- The graph was unavailable at refine (EPERM, then a timeout), so boundaries were drawn from source
  imports (ARCHITECTURE, Breakdown).

## Carried follow-ups

- `.opencode/agents/aof-architect.md` and `.opencode/commands/aof/review.md` differ from a fresh
  render. This drift predates 157.
- `scripts/generate-bundle-manifest.mjs` has no `--help`. Passing the flag writes the manifest.
- The episodic leaf spells the terminal run states itself, because the run store exports no
  terminal predicate (19/ADR-001).

The build-time `## Feedback (for retro)` notes graduated into `RETROSPECTIVE.md` R1–R2 at verify.
