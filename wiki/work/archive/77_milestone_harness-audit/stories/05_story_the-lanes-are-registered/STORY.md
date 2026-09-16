---
type: story
number: 05
slug: the-lanes-are-registered
title: "The lanes are registered — four rules join the command, and the code space becomes derived"
parent: 77
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-03
depends: [77/00, 77/01, 77/02, 77/03]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-001, wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-008, wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010, src/work-audit/prompt-layer.mjs, src/work-audit/hook-wiring.mjs, src/work-audit/seam-liveness.mjs, src/work-audit/declared-bounds.mjs, src/work-audit/toolkit.mjs, src/work-audit/reads.mjs, src/work-doctor-controls.mjs, src/claude-settings.mjs, src/work-delegation.mjs, test/support/source-slice.mjs, scripts/test.mjs, test/arch/acd-audit-never-imports-project-code.test.mjs, test/support/read-src-files.mjs, src/work-audit/evidence.mjs, src/work-loops-checks.mjs, src/work-audit/census.mjs]
files: [src/work-audit/report.mjs, src/commands/audit.mjs, test/audit-command.test.mjs, test/arch/acd-controls-never-execute.test.mjs, test/arch/acd-audit-lane-registry-complete.test.mjs, scripts/test.mjs]
---
# 05 · The lanes are registered

## User story

As anyone running `aof work audit` after this milestone,
I want the four new rules to actually execute as part of the command, with their codes disjoint from doctor's and their read floors asserted,
so that the rules are a lint that runs in CI under `--strict`, not four modules nobody calls — which is the exact failure `seam-unwired` exists to catch, and it would be embarrassing to ship it unwired.

## Tasks

- [x] `tasks/00_four-lanes-join-the-registry-and-each-executes-as-itself.feature` — each lane executes as itself with findings attributed to it, one distinct runner per entry, a read floor and a `text`-sweep limit asserted FROM THE REGISTRY so a fifth cannot arrive without them, and no lane starting a child
- [x] `tasks/01_the-code-space-is-derived-not-enumerated.feature` — the checked code space answers the registry rather than a by-name list; disjoint from doctor's and pairwise among the audit's own lanes, with the shared read-floor code declared lane-neutral; the non-vacuity floors and 66's never-executes legs unweakened
- [x] `tasks/02_the-face-injects-what-the-family-may-not-import.feature` — the marker key, the resolved role routing, the subject root and the instant arrive at the impure boundary; the seven-code severity ladder driven row by row; `--strict` moves only the exit code, and every error leg is zero here on arrival

## Notes

- **This is the stage-2 story, and it exists because `src/work-audit/report.mjs` is contended by construction** (`ADR-010 §2`). Every lane needs both a `REPORT_LANES` entry and a ctx key, and the ctx key set is fixed at `report.mjs:646-660`. The contention is resolved by INVERSION rather than by an exception: stage 1 authors pure lane modules that register nothing, and this story registers all four. Four writers on one 703-line file was the alternative and was refused.
- **Every claim about the COMPOSED command lives here** — a lane is registered and executes as itself, its codes are disjoint from doctor's (`59/FF-5905`), its floors and limits are asserted from the registry. `ADR-010 §4` is why: no stage-1 story declares a control it cannot clear.
- **The face injects what the family may not import.** `59/FF-5904` forbids the family reaching outside `src/`, so the marker key, the resolved role routing and the subject root are supplied at the impure boundary — doctor's own arrangement, and the reason the lanes stay clock-free and pure.
- `aof work audit --strict` is expected to stay GREEN in this repo on arrival: every error leg measures 0 here today, and the one live capability gap lands at `warn` because this repo routes the product owner inline.
