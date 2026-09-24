---
doc: verification
---
# 134 · Discovery before formulation — Verification

## Fitness functions

Each probe was run at the source: mutate one file, run the control, read the failure, restore the
file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13401 | `test/arch/examples/acd-example-answer-one-reader.test.mjs` | GREEN (4 ok) | appended `export const probeAnswerReader = (entry) => entry.toolUseResult;` to `src/config-inspect.mjs` → `the harness's answer has one reader`, actual `['src/config-inspect.mjs', 'src/work-examples/answers.mjs']` (134/03 build, 2026-09-24) |
| FF-13402 | `test/arch/examples/acd-example-map-single-home.test.mjs` | GREEN (3 ok) | appended `export const probeLabel = (line) => line.endsWith("[confirmed]");` to `src/config-inspect.mjs` → `src/config-inspect.mjs: spells a bracketed provenance label` (134/02 build, 2026-09-24) |
| FF-13403 | `test/arch/examples/acd-examples-off-is-today.test.mjs` | pending (134/04) | — |
| FF-13404 | `test/arch/examples/acd-settle-reads-the-transcript-store.test.mjs` | GREEN (3 ok) | replaced `projectsDir: settleProjectsDir({ projectsDir, workspace, env, home }),` in `src/effects/run-transitions.mjs` with `projectsDir: projectsDir ?? workspace?.projectRoot ?? undefined,` → `transitionRunComplete takes a transcript directory from workspace.projectRoot` and `completeRun's directory is not the resolved one` (134/03 build, 2026-09-24) |

## 134/03 — the answer is read from the harness

Build: loop run `20260924T141559728Z-0001`, worktree `dispatch-134-03`, solo, 2026-09-24.
Near-miss recall (`transcript settle spend answers AskUserQuestion run record`): empty block.

- **Tasks 00-02 `@executable`: GREEN.** `test/examples/example-answers.test.mjs` 11 ok; the spend
  suite's new case `run-spend-ingest/134-03 02 a hand-run settle now stamps spend …` ok. Focused
  set (`scripts/test.mjs --only`, `AOF_GLOBAL_HOME` and `CLAUDE_CONFIG_DIR` temp): 168 ok, 0 not ok,
  after an earlier 303 ok over the loop, drive, warm-fix, run and assignment suites.
- **Arch lane (every `test/arch/*/index.mjs`): 2035 ok, 5 not ok** before the fixes below. Two are
  in this run's grade baseline (FF-11903, FF-9603 (2)). Three were this build's and are fixed:
  FF-5810 (two shipped loop records cite `isStale` and `transitionRunReclaimed` by line; re-cited in
  `src/bundle/loops/` and `.aof/loops/`), FF-5504 (the run store may never spell `transcript`;
  the degrade reason is `session-unreadable`), FF-5301 (a static `run-store → work-examples/map.mjs`
  edge took the mesh sink's reach to 77; the token reader is imported lazily inside
  `recordAnswers`, and the reach stays 76).
- **FF-5307 re-pinned** in the open: `src/run-store.mjs` at `94adc0e2…`, comment naming 134/03.
- **Task 03 (`@manual`): PENDING — operator.** Procedure and paste slots are in `STATE.md`
  (`## 134/03 task 03`). Evidence lands here, pasted from the commands' output:

  - A. hand-run settle stamps spend — run record path and `spend`: `______`
  - B. tokened answer stamped — `brief.answers`: `______`; `collectAnswers`: `______`
  - C. refused question — `brief.answers` holds no `134/03 Q2`: `______`
