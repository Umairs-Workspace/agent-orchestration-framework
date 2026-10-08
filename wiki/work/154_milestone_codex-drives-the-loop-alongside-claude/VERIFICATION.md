---
doc: verification
updated: 2026-10-08
---
# 154 · Verification

## Fitness functions

Automated readiness evidence recorded on 2026-10-08. All six controls are implemented and
registered. Eight owning cases passed, including their negative controls. The expected failures
below were observed from planted source/action/plan fixtures; production files were not edited.
This is control evidence, not live runtime or milestone acceptance.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-15401 | `test/arch/session/acd-runtime-session-boundary.test.mjs` | pass (automated) | Planted `client.send("turn/start", brief)` and `claudeProjectsDir(cwd)` in sequencing source fixtures. Both failed: `FF-15401: loop sequencing must not own vendor protocol or transcript policy`. |
| FF-15402 | `test/arch/session/acd-runtime-choice-owner.test.mjs` | pass (automated) | Planted `resolveExecution` in the loop engine and `resolveExecutionResume` in core model source fixtures. Both failed: `FF-15402: execution choices and resume policy have one owner`. |
| FF-15403 | `test/arch/session/acd-codex-permission-boundary.test.mjs` | pass (automated) | Loaded an in-memory copy of the actual adapter with permission reply changed to `accept`. Scripted transport failed: `FF-15403: native permissions are declined, never business questions`, actual accept versus expected decline. No native process or approval was launched. |
| FF-15404 | `test/arch/store/acd-codex-output-ownership.test.mjs` | pass (automated) | Removed the preflight baseline from create/update/delete action fixtures. Each reported `Codex mutation lacks a recorded preflight baseline: AGENTS.md`. The real collision fixture also refused `codex-output-conflict` on unowned review.toml despite force, preserving operator files. |
| FF-15405 | `test/arch/command/acd-bundle-runtime-variants.test.mjs` | pass (automated) | Removed `.agents/skills/aof-refine/procedure.md` from the real rendered plan. Observed `skill:aof-refine (codex) at .agents/skills/aof-refine/SKILL.md: missing declared procedure .agents/skills/aof-refine/procedure.md`. Registered unresolved-role and Claude-target negative cases also passed. |
| FF-15406 | `test/arch/session/acd-runtime-observation-facts.test.mjs` | pass (automated) | Loaded actual reducer source in memory with `costUsd: null` changed to zero. Failed: `FF-15406: missing native cost is unavailable`, `0 !== null`. Missing native turn identity separately refused attributable metadata. |

Command: `node .tmp/154-readiness-red-probes.mjs`; result: eight registered cases passed,
all six controls exercised. Captured output: `.tmp/154-readiness-red-probes.json`.
The helper observes the existing expected throws/rejections with their original matchers intact
and reports the existing ownership/reference detectors' actual findings. It uses an isolated
temporary AOF home, scripted transports and no paid assistant execution.
Code matches successful full-gate snapshot `7beccabff552c266d7dc6e6071427389056151d8`, retained
by tag `verification/154-11-build-review`: 12,466/12,466 registered cases, zero failures/flakes.
Raw gate evidence is retained at `.tmp/154-evidence/test-sharded/2026-10-08T11-43-25-992Z/`.

## Outstanding proof

- Story 02: real supported CLI protocol compatibility; installed 0.160.0 matching an allowlist is not live proof.
- Story 11: both assistants' real lifecycle, independent native review, interrupted recovery, comparable Claude execution and repeated prompt evaluations.
- Visual design remains inconclusive without a configured review URL and rendered evidence.
- No acceptance decision has been made. Automated preflight does not establish live runtime support.
