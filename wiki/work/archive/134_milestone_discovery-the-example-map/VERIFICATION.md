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
| FF-13403 | `test/arch/examples/acd-examples-off-is-today.test.mjs` | GREEN (3 ok) | replaced `    if (examplesEnabled === true && item.type === "story") {` in `packages/work/src/doctor/index.mjs` with `    if (item.type === "story") {` → `absent: no doc-over-budget names EXAMPLES.md` and `the gate off leaves the doctor's findings exactly those of a stream with no map` (deep-equal fails), 2 of 3 red (134/04 build, 2026-10-02) |
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
- **Task 03 leg B re-run 2026-10-02 — the deviation is closed.** Interactive session
  S = `ed33b986-4965-4b5f-98cb-1174699c96aa` (`claude-vscode`), repository root, bare `aof` =
  source `88ebd022+dirty` (the npm link to this checkout, 134/03's code on `main` since `0b46709`).
  `aof work run-start 134/03 --session S --json` → run `20261002T174343324Z-0006`,
  `"sessionId": "ed33b986-4965-4b5f-98cb-1174699c96aa"`, `"sessionSource": "flag"`. One
  `AskUserQuestion` call: a `134/03 Q1 · ` question the operator answered through "Other" in their
  own words, plus an untokened control question. `cd wiki` → `aof work run-complete 134/03 --outcome done`
  → `Completed run 20261002T174343324Z-0006 for 134/03 — state done.` The record on disk:
  `done ed33b986-4965-4b5f-98cb-1174699c96aa [{"token":"134/03 Q1",…,"answer":"What? Your fucking questions are hilariously bad","toolUseId":"toolu_013tjAKapMdTaQFcHmo5Kcgk","sessionId":"ed33b986-4965-4b5f-98cb-1174699c96aa","at":"2026-10-02T18:32:30.722Z","entrypoint":"claude-vscode"}] {"model":"claude-opus-5-5","effort":"high","tokens":{"input":106,"output":30843,"cacheRead":4720902,"cacheCreate":159311},"costUsd":2.47664985,"costSource":"priced","priceTable":"price-table-2026-08-v1","turns":53,"toolCalls":24,"exitReason":"final_output"}`
  (`question` elided). Exactly one record: the untokened control left none. The free-text answer is
  stamped verbatim, with the run's `sessionId` and the session's entrypoint, and the settle from
  `wiki/` stamped spend again (leg A). `collectAnswers` for `134/03` with no transcript directory,
  through the assembled application (`application.work.examples.answers`, since 142 the module is a
  factory), answers both stamped records, `question` elided:
  `[{"token":"134/03 Q1","answer":"Leave it for now","toolUseId":"toolu_01AhzTpg9kX8Xom6HrCYXfaF","sessionId":"5625226d-2c06-4958-b197-b69add9044d9","at":"2026-09-24T18:24:25.640Z","entrypoint":"claude-vscode"},{"token":"134/03 Q1","answer":"What? Your fucking questions are hilariously bad","toolUseId":"toolu_013tjAKapMdTaQFcHmo5Kcgk","sessionId":"ed33b986-4965-4b5f-98cb-1174699c96aa","at":"2026-10-02T18:32:30.722Z","entrypoint":"claude-vscode"}]`
- **Re-gated after 142 (2026-10-02).** `validate 134/03` was red: three `reads:` paths deleted in
  the 142 squash with no rename edge (`src/run-spend-ingest.mjs`, `src/work.mjs`, `src/degrade.mjs`).
  Every `reads:`/`files:` source path was repointed at its package home, then validate PASS and
  doctor clean. Focused set (`scripts/test.mjs --only`, temp `AOF_GLOBAL_HOME`/`CLAUDE_CONFIG_DIR`):
  55 cases, 0 failures, including every `134-03` case and FF-13401/FF-13404.

## 134/04 — the readiness gate

Build: inline in the operator's session `ed33b986-4965-4b5f-98cb-1174699c96aa`, run
`20261002T183736045Z-0001`, branch `134-discovery-example-map`, 2026-10-02 (a wave of one).
Near-miss recall (`doctor lane continue door example map readiness gate budget`) surfaced m69/R6
("validate and doctor were green while … the suite [was] red") and m59/R6 ("a structural rule
stated as a PATH or as SOURCE TEXT is a rule with a door"). The first is why the importer and arch
sweeps below were run, not only the story's own suites. The second is why the lane's purity is
held by a deterministic re-run as well as by its source grep.

- **Built against the post-142 layout.** The contract was refined on the pre-142 tree. The lane is
  `packages/work/src/doctor/examples.mjs` (`createDoctorExamples({ examplesEnabledFromConfig })`,
  assembled as `application.work.doctorExamples` and injected into `createWorkDoctor`), and the
  row is `packages/work/src/doctor` 10 → 11 (task 01's "src/work 45 → 46"). The test headers name
  the translation.
- **Tasks 00-03 `@executable`: GREEN.** `test/examples/doctor-examples-lane.test.mjs` 18 ok,
  `test/examples/continue-door-examples.test.mjs` 6 ok, FF-13403 3 ok (`scripts/test.mjs --only`,
  temp `AOF_GLOBAL_HOME`/`CLAUDE_CONFIG_DIR`). Package `node:test` files over the changed seams
  (`@aof/work` command-faces, doctor, domain-services, reentry, status-gate; `@aof/knowledge` and
  `@aof/work-loop` services): 32 pass.
- **Door red probe:** replacing `if (phase === "continue") await refuseOpenExamples(ctx, exact);` in
  `packages/work/src/commands/continue.mjs` with a comment turns 4 of the 6 door cases red (`the CLI
  exits non-zero`). Restored, and green again.
- **Importer sweep** (every suite under `test/` that reaches the doctor, the door or the budget,
  plus the package suites): 2636 cases, 8 not ok. Two were this build's (FF-7805 pinned
  `createWorkDoctor`'s whole argument list; 133/03 pinned the diagrams lane as the last lane). Both
  are re-pinned to their own claim, and both are green. The rest are not this build's: 63/03 task04
  (the sweep's own exported `CLAUDE_CONFIG_DIR`, green when re-run without it), FF-9603 (2), 96/02-00
  and 70/05 task02 ×2 (another session's uncommitted `143` stream), `cli-child-process` (not a
  runner suite), and `this-tree-holds-what-is-live` 00/02.
- **Arch lane** (every `test/arch/*/index.mjs`): 2110 cases, 6 not ok. One was this build's (FF-11903
  pins `buildSnapshot`'s options as ending in `renameMap = null`; the two new options now precede
  it) and it is green. FF-12905 passed when re-run alone. FF-9603 (2) is the `143` stream's.
- **Inherited reds measured, not this build's (142's restructure):** FF-11903 "the map is DERIVED"
  (`packages/contracts/src/error.mjs` ≠ `packages/core/src/command-error.mjs`) and its citation
  ceiling (347 against 55); FF-5204 (`src/run-store.mjs`, cited by a shipped loop record, no longer
  exists); `this-tree-holds-what-is-live` (122 stale reads against 117, every one under
  `archive/`). This branch lowers the live count by four (134/03's three, 134/04's one).
- **This repository's doctor** (`aof work doctor --json` from the root, gate off): 0 `example-*`
  findings and 0 `doc-over-budget` naming `EXAMPLES.md`.
- **Caught after the commit, by 134/05's sweep:** `yarn-installation/extracted kernels cannot import
  core…` was red. The work kernel's native imports are exact file-level ports, and the build added
  `node:path` to the lane and `node:path` + `node:fs/promises` to the continue door without stating
  them. Both are now stated ports in `test/bundle/yarn-installation.test.mjs`, and the suite is
  green. The importer sweep selected suites by what they name, and a tree-wide purity scan names
  none, so the `test/bundle` and `test/command` indexes were then run whole. That run found two more:
  the runtime audit's `sourceDigest` for `packages/work/src/commands/doctor.mjs` (its audited
  `execFileAsync("git", …)` expression is unchanged, so only the file digest was re-stamped, to
  `e52155fa…`, in `scripts/workspace-runtime-audit.json`), and the Plan 09 ledger's
  `registryCases` (11539 → 11604, exactly the 65 cases 134/04 and 134/05 add). The ledger lives in
  the archived `142/plans/09-test-ledger.json`, so every story that adds a case edits a delivered
  milestone's folder. That is recorded as a finding below. `test/bundle` + `test/command`: 380
  cases, 0 not ok.

## 134/05 — the discovery beat

Build: inline in the operator's session `ed33b986-4965-4b5f-98cb-1174699c96aa`, run
`20261002T194754792Z-0001`, branch `134-discovery-example-map`, 2026-10-02 (a wave of one).

- **Built against the post-142 layout.** The bundle sources are `packages/core/assets/`
  (`commands/refine.md`, `agents/aof-{product-owner,architect}.md`, `templates/story/EXAMPLES.md`,
  `manifest.json`), not `src/bundle/`. The suite's header names the translation.
- **Rendered through the one door:** `aof work update` → `1 created, 9 updated, 145 up-to-date, 0
  deleted, 0 drift-warning`, then `node scripts/generate-bundle-manifest.mjs` → `116 entries`. No
  rendered copy was hand-edited. The two `.aof/loops` copies that refine expected to be rewritten
  were already current, so they are unchanged.
- **The template parses clean:** `parseExampleMap` over the source and the installed copy reads 0
  malformed lines and `notApplicable: null`; the lifted `Not applicable:` line parses alone with a
  reason and 0 malformed lines. The installed copy is 36 lines, against the 50-line `examples`
  budget.
- **Tasks 00-04 `@executable`: GREEN.** `test/examples/refine-discovery-beat.test.mjs` 38 ok,
  including the `aof work update --dry-run --json` byte-identity of all nine rendered copies and
  the installed template (`skip`).
- **Bundle-reader sweep** (every suite that reads refine, the two briefs, the manifest, the story
  templates or the guide, plus the examples indexes): 1787 cases, 3 not ok. One was real, and it
  was 134/04's (the kernel import ports; see 134/04 above). FF-9603 (2) and 96/02-00 are the `143`
  stream's. `shared-cli.steps.mjs` is not a runner suite.

## Verification evidence

- **134/01 (`@manual @docs`), re-checked at accept, 2026-10-02.** 133 was archived after the
  contract was written, so the 133 paths in `STORY.md` `reads:`, the task's Examples and R7's
  commands were repointed at `wiki/work/archive/133_…` (`0d0b8ea9`); `validate 134/01` PASS.
  Every R7 ref (`124/00`–`02`, `126/00`–`06`, `127/01`–`05`, `133/01`–`06`) resolves through
  `aof work find`, and each milestone has its row count and a milestone row. R7's commands, re-run
  from the root, print its stated numbers: the five counted rows (126/F-24, 127/F-03, F-04, F-27,
  F-133-01), one `@bug` feature (133/04 task 03), `contract-wording` 0/0/6/0, `design-gap`
  3/11/7/1, and 11 `misunderstanding` lessons. verifies → 134/01 task 00.
- **134/02 – 134/05 (`@executable`) and FF-13401 – FF-13404, at accept.** `scripts/test.mjs --only
  test/examples/index.mjs test/arch/examples/index.mjs` (temp `AOF_GLOBAL_HOME`/`CLAUDE_CONFIG_DIR`):
  90 cases, 0 failures. verifies → 134/02 tasks 00-02, 134/03 tasks 00-02, 134/04 tasks 00-03,
  134/05 tasks 00-04.
- **The live run (ADR-007), 2026-10-02, operator's session `b32f99e5-1417-4b35-9523-5ec40c1199e2`
  (`claude-vscode`).** The operator chose a backlog story: `the-whole-tree-run-signs-off-in-minutes`,
  promoted to **144** (a map token needs a numbered ref). `work.examples.enabled` turned on for this
  repo. Run `20261002T203914159Z-0000` started on 144 with `--session`. The map
  (`144_story_…/EXAMPLES.md`, 33 lines) holds 4 rules, 9 examples, 4 business and 2 technical
  questions.
  - Before asking: `aof work doctor 144` → 4 × `error example-question-open` (Q1–Q4): the Contract
    stage stops.
  - Round 1 asked Q1–Q4 with tokens. The operator rejected all four. Three were answered by the
    story's own user story, title and Notes, and one was an engineering call put with an
    unexplained internal ("16 workers? What?"). Recorded as F-134-01.
  - Round 2 re-asked the four with their context. Answers: Q1 "No more than 15mins. There's a work
    item to optimize"; Q2 "These are shit tests, not properly isolated. These need to be logged";
    Q3 "We should be able to pass in settings"; Q4 a non-answer ("What does this have to do with
    milestone 134?"). Q1–Q3 written `answered`, and E1, E4, E9 `stated Q1`/`Q2`/`Q3`; Q4 left
    `asked`.
  - Settle: `cd wiki && aof work run-complete 144 --outcome done` → `state done`. The record's
    `brief.answers` holds 8 stamped replies, one per token per round, each with
    `sessionId b32f99e5…` and `entrypoint claude-vscode`, e.g.
    `["144 Q1","No more than 15mins. There's a work item to optimize","toolu_01GTcwgnfd24DMcy1ke2E2TV","2026-10-02T21:53:26.734Z","claude-vscode"]`.
  - After: `aof work doctor 144` → exactly one `error example-question-open`, Q4 ("still asked").
    The stated examples and answered questions are anchored and raise nothing. 144 stays at its
    Contract gate until its own refine settles Q4.
  - Verdict: the grammar, the anchor, the gate and the beat work end to end on a real story. The
    beat's question quality failed in round 1 (F-134-01, fixed in `5c0685e6`).
- **The beat fix, `5c0685e6`.** `refine.md` adds **Strike before asking** and the PO brief adds the
  same rule: drop every question the record already answers, relabel engineering choices as
  `technical`, and give each remaining question its context in the person's terms. Rendered through
  `aof work update` (6 updated) and `generate-bundle-manifest` (116 entries). Bundle-reader sweep
  (the 17 suites that read refine, the PO brief or the manifest, plus the `test/examples`,
  `test/bundle` and `test/command` indexes): 708 cases, 0 failures.

## Regression gate

Whole tree via `scripts/test-sharded.mjs` from a clean detached worktree at `0d0b8ea9`, temp
`AOF_GLOBAL_HOME` and `CLAUDE_CONFIG_DIR`, 2026-10-02: **11,604 of 11,604 registered cases**
executed in 1200 units, wall 60.0 min (another session was loading the machine), 16 workers.
8 units red, 13 load flakes. Attribution:

- **Inherited from 142's squash (red on `main`): F-134-03.** FF-11903 ×2, 119/00 task02 ×2
  (`cited-path-resolve`), FF-5204, and `this-tree-holds-what-is-live` 00/02.
- **The launch environment:** 63/03 task04 reads the gate's exported `CLAUDE_CONFIG_DIR`, as in
  134/04's sweep.
- **Contention:** `fleet-terminal-view-producer-fed`, `agent-session-driver-transcript` (53/00
  task03) and `loop-diag` (131/01). These three plus 63/03 re-run alone at `0d0b8ea9` with no
  `CLAUDE_CONFIG_DIR`: 126 cases, 0 failures.
- No red is in a file 134 changed.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-134-01 | Live run round 1: the discovery beat put four questions to the operator that the story's user story, title and Notes already answered, or that were engineering calls, with no context and an unexplained internal ("16 workers"). The operator rejected all four. | defect | major | blocker, fixed in the item | 134/05 prose, `5c0685e6` | fixed |
| F-134-02 | A stamp records any reply on a token, including a non-answer ("What sort of question is this?"). The anchor proves the person replied on that token, not that the reply answers it; whether it answers stays the map writer's judgement. | gap | minor | non-blocker: within ADR-003's stated claim (the channel replied) | OUTCOME gap; 136 | open |
| F-134-03 | 142's squash recorded no rename for modules it deleted and re-created, so `main` is red on FF-11903, 119/00 task02, FF-5204 and `this-tree-holds-what-is-live` 00/02. | defect | major | non-blocker for 134 (inherited, no 134 file) | story (operator), per STATE | open |
| F-134-04 | 13 suites go red under load and green alone. The operator's ruling (144 Q2): they are not isolated, and each is logged. `fleet-boards-branch-deleted`, `core-workspace`, `work-ui-fleet-origin-standalone`, `advertised-paths`, `work-ui-verb-rename`, `mesh-ui-global-scope`, `asset-base-seam`, `application-assembly`, `mesh-ui-cli-face`, `work-ui-board-serves-unchanged`, `session-screen-verdicts`, `bundle-asset-manifest-complete`, `framework-stops-shipping-guard`. | defect | minor | non-blocker | 144 (E4) | open |
| F-134-05 | The Plan 09 test ledger (`registryCases`) is a live ratchet stored in the archived `142/plans/09-test-ledger.json`, so every story that adds a case edits a delivered milestone. | defect | minor | non-blocker | story (operator), per STATE | open |
| F-134-06 | A backlog story cannot carry an anchored answer: the token admits only a numbered ref (`<NN>` or `<NN/SS>`), so discovery needs the story promoted first. | gap | minor | non-blocker | 136 | open |
