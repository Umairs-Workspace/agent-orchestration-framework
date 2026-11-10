---
doc: verification
updated: 2026-10-18
---
# 163 · The operator can read the loop's open questions — Verification

## Method

`aof:verify` verified this on 2026-10-18, on `milestone/160-161` (HEAD `458a319d`), with the 163
build still uncommitted in the working tree. The story has no parent, so this document is its own
record. Every lane ran isolated (`AOF_GLOBAL_HOME=$(mktemp -d)`) through
`node scripts/test.mjs --only <files>`, and the native `node:test` files ran through `node --test`,
the way `scripts/test-workspace.mjs` runs them. There is no `@uat` scenario, so no human acceptance
step ran. There is no UI surface, so there was no design-conformance review. The story declares no
`FF-NN` of its own (it has no `ARCHITECTURE.md`), so it has no red-probe register. The controls it
touches (FF-13101, FF-13102, FF-13108, FF-16004 and the work-command bijection and route coverage)
ran in the story lane. As 141/R1 requires, verify also ran the importer sweep: every test file that
imports a module 163 changed.

## Automated lanes

| Lane | Result |
|---|---|
| story lane: `work-questions.suite`, `loop-command-questions`, the 8 arch controls named above | 100 `ok`; the only `not ok` was `reentry.test.mjs`, which is a native `node:test` file and so not registry-shaped |
| `node --test packages/work/test/reentry.test.mjs` | exit 0 · 4 tests · 4 pass |
| task 00 cases (`operator-reads-open-questions/00 …`): 12 | all `ok`, one per scenario. verifies → `tasks/00_the-operator-reads-every-open-question.feature` |
| task 01 cases (`…/01 …`): 4 | all `ok`. verifies → `tasks/01_all-widens-to-every-workspace.feature` |
| task 02 cases (`…/02 …`): 3 | all `ok`. verifies → `tasks/02_resume-points-at-the-questions.feature` |
| task 03 cases (`…/03 …`): 3 | all `ok`. verifies → `tasks/03_the-verb-ships-its-bundle-wrapper.feature` |
| importer sweep: 91 files that import a changed module, plus the bundle, run and loop pins in `files:` | 1481 `ok`, 1 `not ok`: `application/closing an application stops its owned HTTP server…`, with "The board UI build is missing at `apps\ui\dist`". That is environmental (STATE already noted the checkout has no `apps/ui/dist`). After verify built the UI, the file re-ran green on its own: 8 `ok`, exit 0 |
| `node --test` over `work-loop/test/services.test.mjs` and `core/test/application.test.mjs` | exit 0 · 8 tests · 8 pass |
| `aof work validate 163` | PASS |
| `aof work doctor 163` | no `control-unresolved` at either severity (warn-only: numbering-gap, rubric-join-unchecked, depends-edges-unchecked) |

## Verification evidence

### Task 04: the deployed verb agrees with the ask files on the control node (`@manual`)

Verify measured this at the source on 2026-10-18.

- **Install.** `node scripts/install-local.mjs --skip-ui` ran from this tree, at the operator's
  choice. The tree also carries another session's uncommitted codex edits, so those were installed
  too. Before the install, `~/.aof/bin/aof.exe --version` read `0.1.0 (payload 0366a4fa.20261002T103106)`,
  which predates 163. The first install emptied the deployed `ui/dist` (F-02). Verify built the UI
  (`node scripts/ui-build.mjs`) and installed again, which synced `ui/dist` with 3 files. The
  version then read **`0.1.0 (payload 458a319d+dirty.20261018T181706)`**, and `BUILD_ID.json`
  agrees. No restart was needed, because the verb is a CLI call.
- **Run.** From the repo root, `~/.aof/bin/aof.exe work questions --all --json` exited 0 with
  21 rows. Each row carries `ref, runId, phase, runtime, askedAt, age, workspace, state, parkedAt,
  liveness, node, question, choices, answer, resume`.
- **The store.** `~/.aof/mesh/loop-asks/` holds 91 `.json` entries. 2 of them are empty directories
  and 4 are unparseable (`{ not json`, leaked fixtures). The remaining 85 are ask files: 54
  `answered`, 2 `ANSWERED`, 23 `parked`, 2 `waiting` and 4 with no state.
- **Clause 1:** every row from this machine names, by its runId, a file whose state is waiting or
  parked. All 21 rows have `node: null`, which means they are local. Each one resolves to its file
  by `runId`, and every file reads `parked`. **0 mismatches.**
- **Clause 2:** every waiting or parked ask that is the latest for its workspace and ref has a row.
  Grouped by `workspaceId|ref`, the latest ask is open in 21 groups, and each of the 21 has its row.
  **0 missing.** The 2 `waiting` files belong to workspace `w1`, ref `03/01`, and later asks
  supersede both, the last of them `answered`. Omitting them is correct: it is E6/E7 holding
  against live data.
- **What it read.** Row `01/06` names `acme-portal` by its descriptor, with
  `liveness: stale`. The other 20 rows are parked asks from 2026-09-28 in fixture workspaces that
  have no descriptor, listed under their ids as E9 specifies (F-05).

verifies → `tasks/04_the-deployed-verb-agrees-with-disk.feature`
("the deployed verb agrees with the ask files on the control node")

## Findings

Before triage, verify recalled the stream's earlier findings for each one
(`aof work memory recall … --kind finding --block`). No candidate shares a cause and evidence with
any of them, so each is a distinct incident. The observations are recorded on 163
(`dee10ac8…`, `649bdab0…`, `c7e78657…`, `136cfba9…`).

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `aof work questions --all` reads the worker leg (the execution overlay plus `awaitsAnswer`) for the current workspace only, so a worker parked on a human in another workspace's lane is not listed. The build review raised it as Important. E12/E13 promise worker rows in this workspace, which hold, so the contract is met | enhancement | medium | non-blocker → backlog | product owner: story "`aof work questions --all` lists every workspace's worker-parked questions on this node" | open |
| F-02 | `install-local.mjs --skip-ui` claims to "reuse the existing ui/dist" but mirrors the repo's `apps/ui/dist` into the install. On a checkout with no build it printed `synced ui/dist (0 files)` and left `~/.aof/bin/ui/dist` empty, so the next desktop start would serve no board. Nothing was listening on :4181 at the time. Verify repaired the install by building the UI and installing again (3 files). This is not 163's surface | defect | medium | non-blocker → backlog | builder: the installer's `--skip-ui` keeps the installed `ui/dist` when the source has none, or refuses | open |
| F-03 | The workspace-descriptor reader lives in the verb, while the descriptor's format belongs to mesh (`global-node-registry.mjs`), as PLAN.md prescribed | design | low | accepted as designed | — | closed |
| F-04 | Question text is printed raw, control characters included, the same way the loop's own ask block prints it | defect | low | non-blocker → backlog | builder: one sanitiser shared by both printers | open |
| F-05 | The live `loop-asks/` store is mostly leaked test fixtures: 20 of the 21 `--all` rows are parked asks in fixture workspaces from 2026-09-28. It also holds 2 directories named `*.json` and 4 unparseable files. The verb lists and tolerates them correctly, but the operator's listing is mostly noise | store hygiene | low | non-blocker; the cleanup is the operator's call (a global-store write) | operator | open |

## Accept decision

**Accepted 2026-10-18.** All five tasks hold. Tasks 00–03 are green in the story lane, one case per
scenario. Task 04's `@manual` was measured on the installed payload `458a319d+dirty.20261018T181706`
against the live ask store, with 0 mismatches and 0 missing rows. The importer sweep's one red was
environmental, and it went green once the UI was built. Validate passes, doctor reports no
unresolved control, and no blocker finding is open. F-01, F-02, F-04 and F-05 go to the backlog.
