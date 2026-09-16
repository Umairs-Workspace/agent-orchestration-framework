---
type: story
number: 04
slug: the-two-roots
title: "The two roots — the audit's own toolkit travels with the payload, not with the repo"
parent: 77
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-03
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-002, wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010, wiki/work/TECH_DEBT.md, src/work-audit/spawn.mjs, src/work-audit-probe.mjs, src/work-audit-drive.mjs, scripts/install-local.mjs, src/work-audit/report.mjs, test/evidence-re-run.test.mjs, test/support/source-slice.mjs, scripts/test.mjs, test/arch/acd-audit-never-imports-project-code.test.mjs, test/support/read-src-files.mjs, src/commands/audit.mjs]
files: [src/work-audit/toolkit.mjs, src/work-audit-drive.mjs, scripts/drive-control.mjs, src/work-audit/census.mjs, src/work-audit/evidence.mjs, test/arch/acd-audit-never-imports-project-code.test.mjs, test/arch/acd-evidence-oracle-is-a-message.test.mjs, test/arch/acd-audit-travels-two-roots.test.mjs, test/support/evidence-control-fixture.mjs, test/evidence-re-run.test.mjs, scripts/test.mjs]
---
# 04 · The two roots

## User story

As the first operator to run `aof work audit` in the repo ACD was built to govern,
I want the command to find its own child programs wherever aof was installed, rather than looking for them inside my project,
so that I get an audit of my instruments instead of a register-wide red that is entirely about aof's own file layout.

## Tasks

- [x] `tasks/00_the-two-roots-are-named-apart-and-neither-is-borrowed.feature` — with the roots FORCED APART every child program resolves under the toolkit root while the runner, the cited controls and the register stay under the subject root; one derivation, one home, and no program path joined onto the subject
- [x] `tasks/01_every-program-the-audit-spawns-ships-with-the-payload.feature` — every spawned program resolves under `src/` so the payload carries it, each named in one enumeration, the fixture stops planting the driver inside the subject repo — and what still blocks a strict audit elsewhere is named rather than assumed away

## Notes

- **This closes `TECH_DEBT.md` item 72 in full, and item 70's remaining enumeration hole with it.** Both family members resolve their child program against the AUDITED root today — `census.mjs:413` and `evidence.mjs:431` — so `aof work audit --strict` fails in every governed project on aof's own layout. The SUBJECT root (controls, registers, the runner) stays `repoRoot`; the TOOLKIT root is derived from `import.meta.url`.
- **Item 72's own prescribed fix is half wrong, and the measurement is why.** Deriving the toolkit root from `import.meta.url` still cannot find `scripts/drive-control.mjs`, because `scripts/` is not in the payload. So the driver MOVES to `src/work-audit-drive.mjs`, beside its exact precedent `src/work-audit-probe.mjs` — which is also what closes item 70's hole, since a program under `src/` falls inside `59/FF-5904` clause (E)'s discovery.
- **Stage 1 deliberately, though nothing depends on it** (`ADR-010 §5`). It is a bug fix with independent value and its write set intersects no other story's; putting it on the critical path would serialise a fix that has no reason to wait.
- 77's own four lanes are IMMUNE to this bug — they spawn nothing — but the command they ride is not. A travelling rule set is worthless if the command cannot run anywhere else, which is what makes this story load-bearing for `ADR-001`'s thesis rather than incidental cleanup.
