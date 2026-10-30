---
doc: verification
---
# 179 · One knowledge engine behind both memory faces — Verification

## Verification evidence

- 179/01 (2026-10-30, `AOF_GLOBAL_HOME` isolated). `packages/knowledge/test/index.mjs`: 233/233, including
  `engine.suite.mjs`'s 19. `test/arch/memory/index.mjs`: 119/119, including FF-17901's 5.
  `acd-source-directory-budget`: green. `yarn-installation`: 11 ok, 3 red, and the 3 reds are the `/var`
  vs `/private/var` realpath class that 175/VERIFICATION records for this Mac. The new `engine.mjs` pin is green.
- 179/01, the story-scoped run (`aof test --scope impacted --story 179/01`). The new files were not
  in the code graph yet (built 11:47Z), so the run widened to all 1256 suites and cannot stand as a
  verdict. It found two reds that the change caused, and both are fixed:
  - `acd-purity-is-external` (FF-11901): FF-17901's purity case banned the `import` token. It now asks
    the one-home extractor (`importSpecifiers`, `computedDynamicImports`) and is green.
  - FF-16004: `aof work find 160` evaluated 742 modules against a ceiling of 740. The two new modules
    are the binding and the port, which `assemble.mjs` now composes. The row is raised to 742 with
    179/01 named, and the control is green.

  The run's other red, `arch/53 FF-5301`, is the tmpdir-realpath class that 178/F-02 records as red
  at HEAD on this Mac. The run also printed a deadline-kill line for the runner.

- 179/02 (2026-10-30, `AOF_GLOBAL_HOME` isolated). PLAN's four checks were run by hand in a temp git
  repo with no ignore for `graphify-out`, against the pinned graphify 0.9.5 on `PATH`:
  1. `aof graph build . --json` exited 0. `git status --porcelain` was empty, and the nested ignore holds `*`.
  2. `aof graph impact src/a.mjs src/c.mjs src/missing.mjs --json`, over a fixture artifact with its
     mtime pinned, was byte-identical to the answer captured from the pre-port command at HEAD
     04cf7a79. That golden is committed in `graph-command-core.test.mjs`.
  3. With `PATH` stripped of graphify, `graph build --json` answered `graphify-missing` and created
     no `graphify-out/`.
  4. With the artifact deleted, `graph impact x --json` answered `no-graph`.

  Suites:
  - green: `test/graph/index.mjs`, `test/arch/graph/index.mjs`, `packages/knowledge/test/index.mjs`,
    `test/arch/memory/index.mjs` (120/120), the budget control, FF-16004 (raised to 744) and
    FF-11901;
  - `yarn-installation`: only the three 175-recorded realpath reds.

- 179/03 (2026-10-30, `AOF_GLOBAL_HOME` isolated). PLAN's byte check ran over the 178/01 fixture,
  one fresh ingested fixture and home per row, across all ten argv rows of task 01's outline and
  both doors.
  - The answers were captured twice before 179/03's first edit. The tree then held 01 and 02, which
    leave the memory path untouched. The two captures were identical.
  - They were captured again after the change and `diff`ed: empty.
  - The capture is committed inline in `work-memory-command.test.mjs` (`PRE_PORT_ANSWERS`). The only
    normalisation is the realpath'd index path, tokenised as `<STORE>`.

  Every file that injects a memory backend was run (22 files), and all are green except one:
  `work-memory/00`'s `--json` outline, the tmpdir-realpath red that 178/F-02 records at HEAD. It is
  red before and after this story.
  - `test/arch/memory/index.mjs`: 125/125.
  - `packages/knowledge/test/index.mjs`: 239/239.
  - FF-16004: unchanged at 744.

- 179/04 (2026-10-30, `AOF_GLOBAL_HOME` isolated). PLAN's three-reader check ran on this repository,
  over the code graph built 2026-10-30T11:47:24Z. That one artifact served both captures; no fresh
  build was taken, because a whole-tree rebuild costs minutes and adds nothing to a before/after
  comparison.
  - The three readers were captured before 179/04's first edit and again after: the in-process
    selection for 04's declared files, the derivation for 179/02, and the seam-liveness lane. The
    `diff` was empty: selection widened on the same 6 files, derivation proposed the same 321 reads,
    and seam liveness raised 0 findings with the same limits.
  - With the artifact moved aside (and restored, sha-checked), each reader answered its unavailable
    form, identical before and after: `no-graph` widenings, `absent`, and the first limit sentence.
  - The bounded sweep caught 59/FF-5904 red: the audit family's closure reached the graphify driver.
    It also caught FF-11901 red, because FF-17904 spelled its own import extractor. Both were fixed
    in-story (see STATE), and both captures were re-diffed after the fix: still identical.
  - Green after the fix:
    - test/arch indexes: `testing` 82, `grade` 152, `planning` 139, `graph` 75, `audit` 126,
      `command` 139, `memory` 125;
    - package indexes: `packages/work/test` 394, `packages/knowledge/test` 239;
    - `test/graph` 170, the work selection, derivation and seam suites, and the three `node:test`
      package files;
    - the ratchets: FF-16004 at 745, and the budget.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-17901 | `test/arch/memory/acd-knowledge-engine-port.test.mjs` | green, 6/6 (179/01, plus 179/02's code-backend case, 2026-10-30) | red, then restored to green: with `engine.mjs`'s declared-method check disabled (`if (!call) throw refuse` → `if (false) …`), a backend declaring `code: ["relations"]` with no `relations` method composed. The control failed with `backend {"code":["relations"]} was composed into a port`. The other four cases stayed green. |
| FF-17902 | `test/arch/memory/acd-memory-backend-interface.test.mjs` (amended) | green, 10/10 (179/03, 2026-10-30) | red, then restored: with `corpora: RECORD_CORPORA,` deleted from `none-backend.mjs`, five cases failed. `backendInterfaceFailures` answered `backend "none" lacks "corpora"`, the port refused with `knowledge engine: backend "none" exports no "corpora" declaration`, and memory-off recall exited 1. The file was restored byte-identical. |
| FF-17903 | `test/arch/graph/acd-graph-command-cli-bijection.test.mjs` (amended) | green, 7/7 (179/02, 2026-10-30) | red, then restored: with `import { computeImpact } from "../graph-impact.mjs";` prepended to `commands/graph-impact.mjs`, the outline case failed. `faceReadFailures` answered `packages/knowledge/src/commands/graph-impact.mjs imports the graph reader module ../graph-impact.mjs` and `packages/knowledge/src/commands/graph-impact.mjs imports computeImpact`. The file was restored byte-identical. |
| FF-17904 | `test/arch/graph/acd-code-graph-one-reader.test.mjs` | green, 4/4 (179/04, 2026-10-30) | red, then restored: with `import { readGraph } from "@aof/knowledge/graph-normalize";` prepended to `packages/work/src/testing/select.mjs`, the scan failed with `packages/work/src/testing/select.mjs:1 imports readGraph from @aof/knowledge/graph-normalize — the code graph has one reader; ask the code corpus's relations through the port (179/ADR-004)`. The file was restored byte-identical. |

## Findings
