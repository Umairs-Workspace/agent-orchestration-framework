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
- **Task 03 (`@manual`): RUN 2026-09-24** by the operator's interactive session
  S = `5625226d-2c06-4958-b197-b69add9044d9` in the repository root, after the lane merged home
  (`0b46709`) and `install-local --skip-ui` (`aof --version` → `0.1.0 (payload 0b46709+dirty.20260924T192210)`).
  Procedure in `STATE.md` (`## 134/03 task 03`). Pasted from the commands' output:

  - A. hand-run settle stamps spend — PASS. `run-complete` from `wiki/`; record
    `stories/03_story_the-answer-is-read-from-the-harness/runs/node-7297/20260924T182254780Z-0003.json`:
    `5625226d-2c06-4958-b197-b69add9044d9 {"model":"claude-opus-5-5","effort":"unknown","tokens":{"input":532,"output":202473,"cacheRead":42113234,"cacheCreate":2002652},"costUsd":23.1826062,"costSource":"priced","priceTable":"price-table-2026-08-v1","turns":266,"toolCalls":116,"exitReason":"final_output"}`
  - B. tokened answer stamped — PASS, one deviation. Run `20260924T182308565Z-0004`; the second,
    untokened question left no record. `brief.answers` and `collectAnswers` (no transcript
    directory) both answer exactly this one record:
    `{"token":"134/03 Q1","answer":"Leave it for now","toolUseId":"toolu_01AhzTpg9kX8Xom6HrCYXfaF","sessionId":"5625226d-2c06-4958-b197-b69add9044d9","at":"2026-09-24T18:24:25.640Z","entrypoint":"claude-vscode"}`
    (`question` elided). Deviation: the operator picked an offered option rather than "Other", so
    `answer` is the option's label verbatim, not free text.
  - C. refused question — PASS. Run `20260924T182500633Z-0005`; the `134/03 Q2 · ` call was
    rejected. `brief.answers` holds no `134/03 Q2` — it holds only the session's earlier
    `134/03 Q1` record, re-read because the reader scans the whole session transcript:
    `20260924T182500633Z-0005 done [{"token":"134/03 Q1",…,"answer":"Leave it for now",…}]`
