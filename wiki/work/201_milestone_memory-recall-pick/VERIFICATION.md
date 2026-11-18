---
doc: verification
---
# 201 · Recall hands an agent what applies — Verification

## Verification evidence

All four stories reached the Review gate built and reviewed (STATE `## Progress`). Their work was
committed as `28d07e22` before verify began; F-02's fix followed it. No scenario is tagged `@uat`.

### Milestone gate — the whole tree

- **`aof work regression-gate 201`** ran on a clean detached worktree at `28d07e22`, with
  `node_modules` relinked rather than installed and `AOF_GLOBAL_HOME` isolated. Wall time 75.8 min,
  14,967 of 15,077 cases, 8 workers. Result **red**: 64 cases in 43 files (`REGRESSION.md` row 1).
- **Attribution.** Every one of the 43 files was re-run alone in two clean copies of the same
  kind, one at the parent `2a732182` and one at `28d07e22`. 58 cases are red at both. One case was
  red at `28d07e22` only: FF-11901, which is F-02. One case is red at both but worse at `28d07e22`:
  FF-16004, 761 modules against 760 (F-03). Every other common red has the same message apart from
  temp names and timings. Seven gate reds were green when their file ran alone (pool contention).
  Three `work-ui-fleet-origin/01` cases were red alone and green in the pool, at both commits.
- **After F-02's fix**, `test/arch/audit/acd-purity-is-external.test.mjs` (12 cases),
  `acd-recall-pick-is-injected.test.mjs` (3) and `acd-recall-pick-single-home.test.mjs` (2) are
  green in the clean copy.

### 201/01 — task 04, on a real node

- **E3, in a terminal.** Took a listing of `~/.claude/projects`, then ran
  `aof memory recall 'worktree node_modules junction' --kind near-miss --block`. It exited 0 in
  5.6 s with 5 record lines and an empty stderr, and `~/.claude/projects` held no new directory
  afterwards. The same recall under a config with `memory.recall.pick.enabled: false` returned a
  different fifth line (m178/R1 instead of m143/03/R1), so the block was picked by the model and
  was not the lexical top 5. `aof memory status` reads `recall: pick haiku, 20 s (default) · claude
  resolves`.
  `verifies → stories/01_story_the-pick-is-a-model-call-a-project-can-see-and-set/tasks/04_on-a-real-node-the-block-is-picked.feature`
- **The daemons' environment.** Ran the same recall under `env -i` with the LaunchAgent plist's
  `PATH`, plus `HOME`, `USER` and `LOGNAME`, as the deploy rules prescribe. `aof` and `claude`
  resolved (`~/.local/bin/claude`). Exit 0, the same picked block, and an empty stderr.
  `verifies → stories/01_story_the-pick-is-a-model-call-a-project-can-see-and-set/tasks/04_on-a-real-node-the-block-is-picked.feature`

### 201/02 — task 03, the untouched edges

- **E9.** `git diff 2a732182 28d07e22` over the 18 continue, verify and shatter files (the bundle
  sources in `packages/core/assets/commands/`, the `.claude`, `.opencode` and `.agents/skills`
  renders, and the Hyperagent shatter skill) is empty. Every hunk in
  `packages/core/assets/variants/codex/workflow.md` falls inside the `# refine` section (lines
  3826–4212) or the `# retrospective` section (4391–4541). None is in `# continue`, `# verify` or
  the shatter contract.
  `verifies → stories/02_story_every-recall-leaves-a-record-and-the-po-asks-by-title/tasks/03_the-untouched-edges-render-as-they-did.feature`

### 201/03 — task 03, this project's ledgers

- **E12.** `node scripts/memory-recall-replay.mjs --sample 40 --seed 177` ran from the project root
  on 2026-11-18 (07:59–08:06Z) against the real `claude`, with the pick at haiku and the judge at
  opus. It replayed 40 of the 327 recorded recalls and exited 0 with `direction: holds`. Degraded:
  0. Ungraded: 0. The report's overall row:

  | edge | graded | ungraded | lexical strong | shipped strong | lexical relevant | shipped relevant | lexical noise | shipped noise | lexical strong hit | shipped strong hit |
  |---|---|---|---|---|---|---|---|---|---|---|
  | overall | 40 | 0 | 1.95 | 2.15 | 3.25 | 3.27 | 1.75 | 0.38 | 40/40 | 39/40 |

  The shipped block showed 3.65 records per recall against the lexical block's 5.00. The one
  recall that lost its strong hit is F-01.
  `verifies → stories/03_story_the-recorded-recalls-replay-against-the-shipped-block/tasks/03_on-this-projects-ledgers-the-direction-holds.feature`

## Fitness functions

Each probe was planted in the real source of a clean copy at `28d07e22`, run against the control,
then restored. Every control was green before its probe.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-20101 | `test/arch/memory/acd-recall-pick-single-home.test.mjs` | GREEN (after F-02's fix) | Added `import { buildPickRequest } from "./recall-pick.mjs";` to `local-retrieval.mjs`. Two cases red: "packages/knowledge/src/memory/local-retrieval.mjs imports the recall-pick leaf: no ranker, port or backend may know the pick (ADR-002 §2)", plus the same import named as one only the seam, its door and core's binding may make (ADR-002 §1, ADR-004 §4). |
| FF-20102 | `test/arch/memory/acd-recall-pick-is-injected.test.mjs` | GREEN (after F-02's fix) | Added `import { spawn } from "node:child_process";` to `recall-pick.mjs`: "packages/knowledge/src/memory/recall-pick.mjs imports node:child_process: knowledge starts no process for the pick (ADR-002 §3)". Re-probed after F-02's fix moved the detector onto the shared extractor: the same message. |
| FF-20103 | `test/arch/memory/acd-recall-pick-launch.test.mjs` | GREEN | Put `"--bare"` before `"--tools"` in `model-ask.mjs`'s argv. Two cases red, one reading "no --bare, no bypass and no system-prompt flag among the flags: [\"--output-format\",\"--bare\",\"--tools\",…]". |
| FF-20104 | `test/arch/memory/acd-memory-config-one-reader.test.mjs` | GREEN | Appended `export const probePick = (config) => config.memory.recall.pick;` to core's `project-show.mjs` binding: "only packages/knowledge/src/memory-config.mjs reads corpora/sources/graphify/backends/graph/recall off a memory object", naming `project-show.mjs` line 98. |
| FF-20105 | `test/arch/memory/acd-memory-node-schema.test.mjs` | GREEN | Added a `probe` string property under the schema's `memory.recall.pick`: "recall.pick's property names are not the reader's keys" and "the reader refuses the schema's key probe". |
| FF-20106 | `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` | GREEN | Deleted the evidence recall's `aof memory record-recall` line from `packages/core/assets/commands/retrospective.md`. Nine cases red, among them "retrospective-evidence's capture protocol is whole in packages/core/assets/commands/retrospective.md" and the manifest-hash leg for `.claude/commands/aof/retrospective.md`. |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | In the E12 replay, recall 15 (continue-developer, "memory record field index version bump frontmatter origin resolve path") lost its strong hit. The pick dropped `05/lesson/R4`, the only record the judge graded 2, and handed over `23/lesson/R3` and `41/lesson/R4`, both graded 0, in its place. The shipped block held a strong record in 39 of 40 recalls, against 40 of 40 for the lexical block. The direction still holds: strong records per recall rose from 1.95 to 2.15. | enhancement | low | Non-blocker: one recall in 40, and the milestone's claim is a direction, not a per-recall guarantee. Input for the next change to the pick's instruction, measured by the same replay. Recall found no prior occurrence (m128/F-128-G and m72/F-72-AR are other causes), so this is a distinct incident. | product-owner (backlog) | open |
| F-02 | The whole-tree gate at `28d07e22` showed FF-11901 red on 201's own controls. `acd-recall-pick-is-injected.test.mjs:35` and `acd-recall-pick-single-home.test.mjs:124` each spelled their own import-specifier regex, instead of reading `importSpecifiers` from `test/support/module-family.mjs`. No story lane selects FF-11901. | defect | medium | Blocker, fixed at verify. Test-only: both controls now read the shared extractor. FF-11901 and both controls are green, and FF-20102's red probe fires with the same message. Prior occurrence: m138/F-13, the same cause and evidence, also fixed at its door. | aof:verify | fixed |
| F-03 | FF-16004: `aof work find 160` evaluates 761 modules against a ceiling of 759. The control is already red at the parent `2a732182`, at 760. 201's +1 is `packages/knowledge/src/memory/recall-pick.mjs`, which core's memory binding imports statically, so it is on every CLI path. `model-ask.mjs` is already deferred. | defect | low | Non-blocker: the control was red before 201, and deferring the leaf would leave it red at 760. The discharge is the FF-16004 owner's: find the parent's +1, then defer, or raise the ceiling with a reason for each module, as m172/F-172-04 did. Prior occurrences of the class: m172/F-172-04 and m165/F-01. | product-owner (backlog) | open |
