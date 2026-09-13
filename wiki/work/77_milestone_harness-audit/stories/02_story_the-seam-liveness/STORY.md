---
type: story
number: 02
slug: the-seam-liveness
title: "The seam liveness — an export nothing calls, and an unknown that stays an unknown"
parent: 77
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-07
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-006, wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010, wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-002, src/graph-normalize.mjs, src/graph-impact.mjs, src/work-audit/reads.mjs, src/work-audit/census.mjs, src/work-audit-probe.mjs, src/commands/assets/add.mjs, test/support/source-slice.mjs, scripts/test.mjs, test/arch/acd-audit-never-imports-project-code.test.mjs, test/support/read-src-files.mjs]
files: [src/work-audit/seam-liveness.mjs, test/work-audit-seam-liveness.test.mjs, test/arch/acd-seam-liveness-unknown-is-a-limit.test.mjs, test/arch/acd-codebase-grounding-no-parse.test.mjs, test/arch/acd-codebase-grounding-via-commands.test.mjs, scripts/test.mjs]
---
# 02 · The seam liveness

## User story

As an architect reviewing whether a seam this framework declares is actually wired,
I want the audit to name an exported seam that no production caller reaches, and to say plainly when it cannot tell,
so that a bound that exists only in prose — `dispatchReadySet` with no caller, `run-store.heartbeat()` behind an eight-day zombie run — is caught by a command instead of by the next quarter's research arc.

## Tasks

- [ ] `tasks/00_a-seam-with-no-production-caller-is-named.feature` — an exporting module on disk with no production dependent is one `audit-seam-unwired` at `warn`; a test dependent wires nothing, the graph is walked once for the whole candidate set, and the sweep counts source on disk rather than graph coverage
- [ ] `tasks/01_an-unknown-is-a-stated-limit-never-a-clean-seam.feature` — no artifact, an unreadable artifact and a `present: false` candidate each yield ZERO findings and a limit naming the reason; the floor is over source on disk so a graphless repo does not red, and the build time comes from the artifact
- [ ] `tasks/02_the-suppressions-are-derived-never-ledgered.feature` — a zero-export program is never a candidate and a resolvable relative dynamic import suppresses — both DERIVED; resolution is relative and never by basename, and the suppressions hold over a corpus the rule has never seen

## Notes

- **The lane READS the graph artifact and never builds it** — `72/ARCHITECTURE.md#ADR-002` already settled the analogous question for test selection, and `ADR-006` here follows it rather than re-deciding it. It reaches the artifact only through the shipped `src/graph-normalize.mjs` / `src/graph-impact.mjs` readers; a second graph reader in the family would be the god-node this milestone exists to detect.
- **An UNKNOWN is a stated LIMIT, never a clean seam.** An absent, unreadable or stale artifact, or a file the graph reports `present: false` for, produces a limit record naming the reason — never a silent pass that says the seams are fine. This is the widening rule of `72/ADR-002` carried over: an unknown may never narrow the claim.
- **Both false-positive shapes are DERIVED, not ledgered** (`ADR-006`). A zero-export file is a PROGRAM, which kills `src/work-audit-probe.mjs` with no exemption entry; a resolvable `await import("<rel>")` literal swept over `src/**` kills `src/scaffold.mjs`. A basename match was tried and rejected — it would have wrongly killed the one genuine finding, `src/sync.mjs:8 createSyncPlan`.
- **Write-set note for scheduling:** `test/arch/acd-codebase-grounding-{no-parse,via-commands}.test.mjs` are shared with nothing else in 77, but are MODIFIED in the working tree by milestone 72's in-flight build. This story appends its module to their allowlists and nothing else (`ADR-010 §2`); it should land after 72's changes to those files are committed.
- Stage 1, pure function over injected inputs, registers nothing.
