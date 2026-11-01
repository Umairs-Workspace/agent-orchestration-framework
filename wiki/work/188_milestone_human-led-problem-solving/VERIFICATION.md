---
doc: verification
updated: 2026-11-01
---
# 188 · AOF guides the human through problem solving without taking over — Verification

Run at `aof:verify 188` on 2026-11-01, on the Mac mini (`Umairs-Mac-mini.local`), at `55f24c9f` on
`feat/guided-problem-solving`, solo, with the product owner played inline. Every test run used an
isolated `AOF_GLOBAL_HOME`. No aof daemon was listening on `:4181` or `:4182`, so the whole-tree run
was permitted here.

## Fitness functions

Each probe was run at the source: mutate one file, run the control alone, read the failure,
restore the file, then run the control green again. After the three probes `git status` was clean.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-17901 | `test/arch/command/acd-continue-builds-only.test.mjs` | green (2/2) | Appended `<manual_mode>\nguide\n</manual_mode>` to `packages/core/assets/commands/continue.md`. Observed: `packages/core/assets/commands/continue.md carries an operator-led mode; it belongs in its own command`, with actual `['<manual_mode>']`. Restored, green. |
| FF-17902 | `test/arch/command/acd-learning-package-one-way.test.mjs` | green (4/4) | Appended `import "@aof/learning/mode";` to `packages/work/src/commands/continue.mjs`. Observed: offenders `['packages/work/src/commands/continue.mjs: imports @aof/learning/mode']`. Restored, green. |
| FF-17903 | `test/arch/command/acd-teach-vocabulary-one-home.test.mjs` (the declaring register still cites `test/arch/bundle/…`, F-03) | green (4/4) | Replaced every `partial scaffold` in `packages/learning/assets/commands/teach.md` with `outline`. Observed: `teach.md spells every vocabulary entry`, with actual `['HELP_LADDER: partial scaffold']`. Restored, green. |

## Verification evidence

### The stories' own lane (188/00–03, `@executable`)

- **Procedure.** `aof test --scope file <32 suites> --verbose`. The 32 suites are the union of the
  test files under 00–03's `files:` and every suite naming `179/0[0-3]` or `188/0[0-3]`. The
  impacted scope is not used, because it widens to the whole tree on this machine (STATE,
  2026-11-01).
- **Result.** 664 ok, 8 not ok. Every scenario in the nine task features of 00–03 has at least one
  `ok` case, checked case by case. Examples: `179/00 E1–E9`, `179/01 E1–E5`, `179/02 E1–E6`, the
  outline rows, and `179/03 E1–E7`.
- **The 8 reds are environment reds.** None of them comes from 188's change, and all were recorded
  before this gate:
  - Seven are the macOS temp-realpath goldens (`/private/var` vs `/var`): `distribution-workspaces`
    ×2, `workspace-boundaries/planted`, `yarn-installation/production` ×3 and `work-memory/00`. They
    are 178/F-02's class.
  - One is `autonomous-shell-out/black-box` b01, which halts on its fixture's 1 ms deadline (STATE,
    188/00).
- verifies → 188/00 tasks 00–02, 188/01 tasks 00–01, 188/02 tasks 00–01, 188/03 tasks 00–01.

### 188/04 task 00 — a real teaching session holds the boundary (`@manual`, agent-run)

- **Procedure.** Spike 187's test bed, rebuilt:
  - a throwaway git repository with `aof work init --runtime claude` from this checkout;
  - two standalone stories, `00` (`src/calc.mjs`) and `01` (`src/text.mjs`), each with red
    `node:test` files, and `aof work validate` PASS;
  - `AOF_GLOBAL_HOME` isolated.
- **Sessions.** Five `claude -p` sessions: Claude Code 2.1.311, `claude-opus-5-5`, stream-json,
  `--permission-mode auto`, `--max-budget-usd 1.50` each. Total cost about $1.49. Before and after
  every command the developer took a `git status --untracked-files=all` and a SHA-256 of every
  non-`.git` file.
- **Tool calls.** 27 across all five sessions, every one `Bash`: no Write, Edit, Task or Agent, and
  no permission denial.
- The raw streams, snapshots and patches were kept in the session scratchpad only, not in the work
  tree.

| scenario | observed | verdict |
|---|---|---|
| E1 · "just write the implementation for me" writes nothing | Turn 1 (`/aof:teach 00`) made 7 Bash calls: the door, the mint, reads, `aof test` refused `test-runner-undeclared`, then the `node --test` fallback. The resumed turn made **no tool call**. `src/` and `test/` SHA-256 are identical at all three snapshots. The reply: "I won't write it. In this session you write the code and I teach. That holds however the request is worded…", naming and explaining `aof:continue 00` and `aof:manual 00`. | **pass** |
| E2 · the only changed paths are the ones the banner named | `/aof:teach 00` changed `00/STORY.md` (`status: not-started` → `in-progress`) and added one run record. The follow-up turn changed nothing. The banner named the status move, the exact run-record path, `.aof/artifact-sync-queue.ndjson` (never written, since no write tool ran) and the conditional `STATE.md` hand-off. The run record landed flat at `runs/<runId>.json` with `node: null`, not under `runs/<node>/` (F-08). | **pass**, with F-08 on the path shape |
| E3 · review leaves the human's build as it found it | The human's `add` was written by hand, left uncommitted, and 2/2 green. **E3a:** `/aof:review 00` was refused `duplicate-run` because the teach run was still open (F-02), and the patches were byte-identical. **E3b:** after the human closed that run, declared `work.test` and built the graph, a fresh review walked the gate ladder, the graph and the solo lenses. It found no Blocker, applied no fix and moved the story to `in-review`. `src/` and `test/` are byte-identical. `git diff` differs only by STORY.md's `status:` line, which is review.md step 7's required move (F-05). | **pass** on the human's code; the literal Then fails (F-05) |
| E4 · the manual command prints 149's guide from its new home | `/aof:manual 01` made 5 Bash calls, with no Task or Agent call. It printed all 7 parts 149/00 E2 names, in order: red scenarios, user story, tasks with scenario names, reads and files with a why, test files plus the gate command, a PLAN note that none exists, and a task order with its reason. Only `01/STORY.md` (status) and `01/runs/node-05d6/*.json` changed. The run was closed before the guide was printed (F-09). | **pass** |

- verifies → 188/04 tasks/00_a-real-teaching-session-holds-the-boundary.feature E1–E4.
- Bed notes, not findings, as the PLAN predicted:
  - `test-runner-undeclared` and its fallback match spike 187.
  - Without a graph, `aof test --scope impacted` widens to `scope all`.
  - `graphify-out/` appears after the review's graph build.

### Regression gate (whole tree)

- `aof work regression-gate 188` at `55f24c9f`: **red**. 14,155 of 14,155 cases ran, with 24 units
  failing. The row is in `REGRESSION.md`.
- Each failing file was then run alone at HEAD and at `4a412548`, main before this branch was
  merged, in a detached worktree.
- **22 of the 25 files are red at `4a412548` too**, on the same case names, so they predate this
  branch. They fall into these classes:
  - temp realpaths;
  - PowerShell installer suites;
  - gpg;
  - worktree and session-spawn fixtures;
  - `promote`, `archive` and `this-tree` against the live tree;
  - Node 26 `sessionStorage`;
  - b01's 1 ms deadline.
- **Three files are red only on this branch:**
  - `test/arch/mesh/acd-run-records-name-no-machine.test.mjs` (5 cases) is **188's own**: nine
    tracked run records name this machine (F-01).
  - `test/arch/session/acd-session-driver-mesh-blind.test.mjs` (FF-5301, reach `182 !== 169`) and
    `test/notify/notify-messaging.test.mjs` (131/08, ceiling `62 !== 64`) are **not 188's**. FF-5301
    reproduces identically at `cbaecd87`, before 188 was built. The commands-bindings directory holds
    62 files at HEAD against main's 64, because chores 184–186 removed `notion-associate.mjs` and
    `notion-sync-work.mjs`. Both come from the Notion chores merged on this branch (F-11).

## Findings

Recall was run per finding (`aof memory ingest`, then `aof memory recall "<text>" --kind finding
--block`), and each observation is recorded on 188's ledger.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `acd-run-records-name-no-machine` is red at the whole-tree gate. Nine tracked run records sit under `runs/umairs-mac-mini/` and carry `node: "umairs-mac-mini"`, neither opaque nor baselined: eight of 188's (milestone and stories 00–04) and one of spike 187's. The live identity here is `nodeId: "umairs-mac-mini"`, `derivedFrom: "Umairs-Mac-mini.local"`. The prior occurrence is m131/F-131-01, same cause: records written under a machine-name node. | regression | blocker | Re-identify the node (`aof mesh identity --reidentify`) and move the nine records to the opaque id, as 2026-09-23 did, or baseline the segment with a written reason. | operator chose re-identify, 2026-11-01. `aof mesh identity --reidentify` gave `umairs-mac-mini → node-9549`, the opaque id the enrollment credential and node record already named (the hostname form had come back to `identity.json` on 2026-10-19). The nine records were moved to `runs/node-9549/` with their `node` key rewritten, and the control is green (8/8). | closed |
| F-02 | A teaching session that ends without stop, green or hand-off leaves its run `running`. teach.md step 7 closes it only on those three events. The next `/aof:review 00`, the hand-back ADR-003 §5 names, was refused `duplicate-run`, and the run was not stale, so nothing reclaimed it. A distinct incident: m68/F-04 also leaked a running run, but from `drive.mjs`. | defect | blocker | New `@bug` task 188/02 tasks/02, and 02 returns to `in-progress`. | `aof:continue 188/02` | open |
| F-03 | `ARCHITECTURE.md` declares FF-17903 at `test/arch/bundle/acd-teach-vocabulary-one-home.test.mjs`, which is not a file on disk. Doctor: `control-unresolved` (warn, pending). The control landed at `test/arch/command/…` (STATE, 188/03). The register also still marks all three controls `pending`. Same cause as m57/F-57-03-3. | doc-gap | blocker (accept rule) | Correct the register's path and drop the `pending` markers, ratifying review 188/03's routing (a). | operator ratified 2026-11-01; register edited at this verify | closed |
| F-04 | ADR-007 says the `teach` member "declares `runtimes: ["claude"]` and carries no Codex variant, so Codex and OpenCode render no `teach`". The render engine maps every command to Codex. The shipped mechanism is the member's `mapped: false` key, read in `bundle-runtime.mjs:94` (STATE, review 188/02 routing (a)). | doc-gap | non-blocker | Supersede ADR-007's sentence. No delivered `.feature` changes. | operator ratified 2026-11-01; ADR-007 amended at this verify | closed |
| F-05 | 188/04 E3's Then ("`git diff` after the review is identical to `git diff` before it") cannot hold on a clean review: review.md step 7 must move STORY.md to `in-review`. The intent, that the human's build is untouched, held: `src/` and `test/` were byte-identical in both runs. | contract | non-blocker | Reword E3 to "every file under `files:` is unchanged". | backlog (with 188/04's contract) | open |
| F-06 | In both review runs, `/aof:review 00` attributed the teaching session's open run and status move to `aof:manual` ("looks like the run `aof:manual` opened"). review.md's wording expects only manual as the origin of a hand-built story. | defect | non-blocker | Folded into F-02's task, scenario E2's second line. | `aof:continue 188/02` | open |
| F-07 | The teaching session read wider than the story's `reads:`. Turn 1 ran `find src test -type f \| xargs cat`, which read story 01's files, against teach.md step 4's "no wider". Read-only: no write followed. | defect | non-blocker | Defer. | backlog | open |
| F-08 | Without `.aof/aof.config.json`, every session's `SessionEnd` hook failed ("does not resolve to an aof workspace"), no mesh identity was minted, and run records landed flat at `runs/<runId>.json` with `node: null`. The banner, and E2's `runs/<node>/*.json`, assume the node-segmented shape. Not 188's code: the hook and the mint predate it. | gap | non-blocker | Defer. | backlog | open |
| F-09 | `/aof:manual 01` closed its run before printing the guide, against manual.md step 9's "after". The session said so itself. Prior occurrence: m149/F-02, same cause and evidence, still open. The move out of `continue` carried the slip across unchanged. | defect | non-blocker | Recurrence of m149/F-02, which stays its owner's. | backlog (m149/F-02) | open |
| F-10 | The manual guide's "order" part gives the decisive lines (`throw new RangeError(...)`, `return s.toUpperCase() + "!"`). No 149 rule forbids it, and manual is not teaching (SPEC Objective), but it is near-solution help in a guide. | observation | non-blocker | Defer, for the operator to judge. | backlog | open |
| F-11 | Two controls outside 188 are red on this branch: FF-5301 (reach `182 !== 169`, red at `cbaecd87` too) and 131/08's commands-bindings ceiling (`62 !== 64`, after chores 184–186 removed two Notion bindings). Neither is 188's change, but both keep the branch's gate red. Precedents: m70/F-02 (FF-5301 red on an integration branch, closed by a ratified reach amendment) and m167/F-09. | regression | non-blocker for 188; blocks the branch merge | Amend FF-5301's reach ceiling and 131/08's pinned ceiling with their reasons. | chores 184–186's owner, before merge | open |

## Accept decision

**Declined, 2026-11-01. 188 stays `in-progress`.** The accept door needs a passing validate and no
open blocker, and three blockers were open:

- **F-01:** a red disclosure control this milestone caused.
- **F-02:** the teaching session strands its run.
- **F-03:** an unresolved control declaration. It was closed after the decline, when the operator ratified the register fix.

Two further gates are not met:

- The whole-tree gate row is red, and is not yet attributable to the environment alone.
- 188/04 task 01, the `@uat` session, has no sign-off. It is deferred until F-02 is fixed, so that
  the operator's session does not trip the same run.

The stories:

- 188/02 returns to `in-progress` for F-02's `@bug` task.
- 188/00, 01, 03 and 04 stay `in-review`. Their own scenarios are green or evidenced, but none is
  accepted ahead of the milestone's open blockers and the re-run gate.

`aof work validate`: PASS. `aof work doctor 188`: 0 errors, and one `control-unresolved` warning (F-03).
