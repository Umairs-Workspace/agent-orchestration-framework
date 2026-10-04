---
doc: verification
updated: 2026-10-03
---
# 144 · The whole-tree test run signs off in minutes — Verification

## Method

Verified 2026-10-03 by `aof:verify` on `134-discovery-example-map`. The story is parentless, so this
is its own record. The build arrived uncommitted. Verify committed it as `93041c82` so a clean
worktree could stand on it, and committed its own two repairs as `c7ab1773`. The suite was scoped to
the story: the test files in `files:` plus every suite that imports a module 144 changed, run
isolated (`AOF_GLOBAL_HOME=$(mktemp -d)`) through `node scripts/test.mjs --only`. The workspace's
native `node:test` files ran through `node --test`. There is no `@uat` scenario, no UI surface and
no `ARCHITECTURE.md` (no `FF-NN` of its own). The `@manual` scenario is the real gate itself, run
twice from a clean detached worktree (`../aof-gate-144`, `prepare-worktree.mjs` + `ui-build.mjs`),
with the `CLAUDE*` variables stripped and the global home isolated.

## Automated lanes

| Lane | Result |
|---|---|
| `scripts/test.mjs --only` over 18 suites (`files:` + importers of the changed seams: FF-9606 `acd-gate-result-is-evidence`, the loop-suite registration holding FF-5311, the declared-program speller, the cli bijection, route coverage, `core-workspace`, `yarn-installation`, `application-assembly`, `command-core-contract`, `test-command-contract`, …) | `# executed 205 cases; failures 0` |
| native `node --test` over `status-gate`, `testing` (`@aof/work`) and `application` (`aof`) | 8 / 8 pass |
| task 00 cases (`144-00 …`): 7 in `regression-gate`, 2 in `work-toolchain-declaration` | all `ok` — verifies → `tasks/00_the-gate-runs-the-declared-whole-tree-program-with-the-operators-settings.feature` |
| task 01 cases (`144-01 …`): 4 in `regression-gate`, 5 in `test-sharded-report` | all `ok` — verifies → `tasks/01_a-lost-or-failing-case-is-red-and-a-case-that-is-not-isolated-is-logged.feature` |
| task 02 `@executable` cases (`144-02 …`): 6 in `regression-gate`, 1 in `test-sharded-report` | all `ok` — verifies → `tasks/02_the-run-says-where-its-time-went-and-measures-itself-against-the-budget.feature` |
| after F-01/F-02: FF-11904's budget suite, both PLAN-ban suites, `core-workspace` | `# executed 41 cases`; only red is a PLAN.md in another lane's uncommitted 143 folder, not in any 144 commit |
| `aof work validate 144` | PASS |
| `aof work doctor 144` | no `control-unresolved` at either severity |

## Verification evidence

### Task 02 — the real gate over this repository (`@manual`)

Both runs are `aof work regression-gate 144` (the worktree's own `packages/core/bin/aof.mjs`), from a
clean detached worktree, and both rows are in this folder's `REGRESSION.md`.

| | Run 1 — `93041c82` (the build) | Run 2 — `c7ab1773` (with F-01/F-02) |
|---|---|---|
| program launched | `node scripts/test-sharded.mjs` (16 workers) | same |
| runner's accounting | `11629 of 11629 registered cases executed in 1245 units` | `11629 of 11629 … in 1230 units` |
| wall time (row detail) | `sharded · 31.0 min · over budget (15 min)` | `sharded · 26.6 min · over budget (15 min)` |
| summed | 425.6 min | 375.6 min |
| red cases | 16: 8 inherited (below) + 8 of 144's (F-01, F-02) | 8, all inherited |
| not isolated | 6: `130/01 stop-request/02`, `69/05 task00`, `task04/38-06 (F-38.06d)`, `(F-38.06e)`, `(F-38.06e, needs-input)`, `audit-spawn/03` | 4: `task04/38-06 (F-38.06d)`, `(F-38.06e)`, `(F-38.06e, needs-input)`, `130/01 stop-request/02` |
| slowest file | `loop-command-wave` 3725 s / 49 cases | `loop-command-wave` 3520 s / 49 cases |
| row | `red` (`all`) | `red` (`all`) |

The row's detail is composed as the contract says: failing cases, then `not isolated: …`, then the
run line, joined by ` · `. After the verdict the gate printed the `# slowest files` block unchanged
and `Logs: .tmp/test-sharded/<run>`. The overrun is logged, not fixed, as Q1/Q4 settled.

**The inherited 8 are red at the parent `924ab1e1` with identical messages**, re-run there over the
same 8 suites (`# executed 84 cases; failures 8`): `this-tree-holds-what-is-live` 00/02 ×3
(stale-reads 122 against a ratchet of 117, and `134` done but still at the root), FF-11903 ×2
(348 unresolved citations against 55), `119/00 task02` ×2 and FF-5204 (`src/run-store.mjs`). Those
are m134/F-134-03's (142's squash), plus the root-held 134, which awaits the operator's
`aof work archive 134`. No 144 file is in any of them.

verifies → `tasks/02_the-run-says-where-its-time-went-and-measures-itself-against-the-budget.feature`

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | The new `test/testing/test-sharded-report.test.mjs` put `test/testing/` at 8 children against FF-11904's ceiling of 7. Six cases went red (FF-11904 ×5, 138/00 task01), all on that one row. The suite was outside `files:`, so the story lane stayed green | blast radius | blocker | fix in item | verify | fixed — row raised 7 -> 8 with its reason (a case on the registration suite the row names); file added to `files:`; green in run 2 |
| F-02 | 144's `PLAN.md` restated declared paths (`path-list` @28, `path-enumeration` @29, @36), which reddened FF-9603 and 96/02-00 | defect | blocker | fix in item | verify | fixed — the three lines now name the runner, its report module and the serial runner by role; green in run 2 |
| F-03 | The real gate runs 26.6–31.0 min on 16 workers, over the 15-minute budget. `loop-command-wave` alone sums to about 3,500 s | gap | minor | non-blocker (Q1: logged, not met; Q4: another item) | backlog | open |
| F-04 | Every whole-tree gate is red on 8 inherited cases (m134/F-134-03, plus 134 held at the root) | defect | major | non-blocker for 144 (red at the parent, no 144 file) | m134/F-134-03; `aof work archive 134` (operator) | open |

m134/F-134-04 is the not-isolated register this story was routed to (144 E4). The gate now names
each such case on the row. The repairs stay with their owners.

## Accept decision

**Accepted 2026-10-03.** All three tasks are green in the story-scoped lane. The `@manual` real gate
ran twice from a clean worktree: no case lost (11,629 of 11,629), mode and wall time recorded on the
row, and the overrun and not-isolated cases copied above. The two reds 144 introduced (F-01, F-02)
were fixed and cleared in run 2. The 8 reds left are inherited, red at the parent, and routed to
F-134-03. Validate passes, doctor reports no unresolved control, and no blocker is open.
