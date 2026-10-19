---
doc: verification
---
# 164 · Verification

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16401 | `test/arch/store/acd-local-change-single-predicate.test.mjs`, registered in `test/arch/store/index.mjs` (4 cases) | Resolves: `rowFingerprint`/`locallyChanged` are declared only in `packages/work/src/local-change.mjs`; every baseline reader imports it; no other module hashes a fingerprint. | Planted `function rowFingerprint(row) { return createHash("sha256")… }` in `packages/work/src/read.mjs` (detached worktree at `e7e4dc6c`): observed red — `rowFingerprint and locallyChanged are declared only in the local-change leaf`, actual gained `packages/work/src/read.mjs`. Restored; 4/4 green. |
| FF-16402 | `test/arch/store/acd-cache-answers-single-predicate.test.mjs`, registered in `test/arch/store/index.mjs` (3 cases) | Resolves: both overlay sites import `cacheAnswers` from the leaf and ask it before answering from the cache. | Renamed the `cacheAnswers(` call in `buildStreamView` (`packages/work/src/read.mjs`) to `cacheAnswersBypassed(`: observed red — `buildStreamView asks cacheAnswers before it answers from the cache`. Restored; 3/3 green. |
| FF-16403 | `test/arch/store/acd-sync-rides-the-effects-journal.test.mjs`, registered in `test/arch/store/index.mjs` (4 cases) | Resolves: only the journal's and the projection store's openers construct a database; the only database files named are `journal.sqlite` and `projection.sqlite`. | Planted `new DatabaseSync(path.join(root, "sync-marks.sqlite"))` in `packages/mesh/src/publisher.mjs`: observed red on three cases — the constructor census, `the only database files runtime source names are journal.sqlite and projection.sqlite`, and `packages/mesh/src/publisher.mjs constructs no database` (`true !== false`). Restored; 4/4 green. |
| FF-16404 | `test/arch/store/acd-store-never-writes-records.test.mjs`, registered in `test/arch/store/index.mjs` (2 cases) | Resolves: no runtime module that reads stored rows, docs or runs writes a file. | Planted a materialiser (`readWorkItemDoc(…)` then `writeFile(path.join(dir, "STORY.md"), body)`) in `packages/mesh/src/cache-read.mjs`: observed red — `a store reader that writes files could materialise a stored record onto a checkout`. Restored; 2/2 green. |
| FF-16405 | `test/arch/mesh/acd-sync-covers-every-registered-workspace.test.mjs`, registered in `test/arch/mesh/index.mjs` (4 cases) | Resolves: the launcher publishes no launch workspace directly; the tick and the start run `syncTickWorkspaces` over `resolveTickWorkspaces`. | Planted `return await publishGlobalWorkSnapshot(ws, options);` in `packages/mesh/src/launcher.mjs`: observed red — `the cwd-only publish is replaced by the sync pass, never kept beside it` (`true !== false`). Restored; 4/4 green. |

Each probe ran in a detached worktree (`git worktree add --detach`, prepared with
`scripts/prepare-worktree.mjs`), one planted defect at a time, restored with `git checkout`
before the next; the shared checkout was never mutated.

## Verification evidence

Run 2026-10-19 by `aof:verify 164` on branch `164-project-changes-reach-the-global-store`.

### Stories 00–03 · executable lanes

`AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only <32 files>` over every test file
the milestone added or changed (at the build's tree, committed as `e7e4dc6c`): 273 registered
cases, 0 failures, plus 38 native cases. Package suites, each isolated: `@aof/effects` 36 native,
`@aof/mesh` 203 + 43, `@aof/work` 404 + 117, all green. Every `@executable` scenario of the eleven
task features maps to a named case in these lanes (`164/00 E1`…`E14`, `164/01 E1`…`E10`,
`164/02 E1`…`E8`, `164/03 E1`…`E6`, plus the unnumbered rows by title).
verifies → every `@executable` task feature under `stories/00`…`03`, FF-16401…16405.

### Story 01 · task 03 (@bug, F-02) · red then green

`test/mesh/launcher/mesh-launcher-syncs-every-workspace.test.mjs` gained E9 and E10. Against the
pre-fix sources (`git stash` of the three changed `packages/mesh/src` modules) both went red —
E9 `the publish step failed and stays owed`, E10 at the step-status assertion; with the fix, 10/10
green. Importer sweep after the fix: the 49 root suites that reach the registry, the publisher or
the sync pass (562 cases) plus `@aof/mesh` (203 + 43), green apart from one case another session's
concurrent uncommitted edit to `packages/execution/src/codex-executable.mjs` turns red in the
shared checkout (not on this branch; the gate's clean worktree is the evidence).
verifies → `stories/01_story_the-desktop-app-syncs-every-workspace/tasks/03_a-torn-node-record-never-empties-membership.feature`.

### Story 00 · task 03 (@bug, F-06) · red then green

`test/store/sync-command-syncs-own-workspace.test.mjs` gained E15 and E16, which spawn the real CLI
in a real repository and a real `git worktree add` sibling of it (the fixture asserts that the
sibling's `.git` is a `gitdir: …/worktrees/…` file). With the uncommitted predicate arm stashed, E15
went red: `the worktree's edit did not reach the store`, with actual `'in-progress'`. With the arm
in place, all 6 cases pass. Live source of the finding: the store's `workspaces` row for
`9db1fd84f5895e38` had `project_root` = `<sibling>/aof-165`, and `<sibling>/aof-165/.git`
reads `gitdir: <repo>/.git/worktrees/aof-165`.
verifies → `stories/00_story_a-local-change-is-noticed-and-owed/tasks/03_a-linked-worktree-never-publishes-over-its-repository.feature`.

Live, after the fix: the sibling worktree's branch contains none of 164's code, so its sessions
reach the sync pass only through hooks that call the npm-linked bare `aof` (this checkout's code),
which now refuses the linked worktree. A command in this checkout republished the workspace from
here: all 567 rows now cite `c:/…/aof/wiki/work/…`. The desktop daemon still runs the code it
loaded at 14:34Z (payload `3e2bcd62`, from before F-06), and it syncs the root that the workspace
descriptor names, so it republished from the sibling at 19:18:29Z and 19:18:40Z (journal
`sync-pass` marks naming that root). The fixed payload is installed (`aof --version` =
`0.1.0 (payload 74a3a714+dirty…)`); the flip ends when the daemon restarts on it. That restart is
handed back: the operator's restart rule requires the tray's Quit, three automated attempts at
that menu failed (a synthetic right-click opened nothing; a keyboard-opened popup exposed no items
to UI automation or Win32), and `aof mesh desktop stop` force-terminates, which the rule forbids.

### Story 01 · task 02 · the live desktop app syncs changes made while it was off (@manual)

On the control node (node-7297), against the real `~/.aof`:

1. `node scripts/install-local.mjs --skip-ui` → `aof --version` = `0.1.0 (payload 3e2bcd62.20261019T144731)`.
2. The desktop app was already off: nothing listened on :4181/:4182, no `aof-mesh-desktop` process.
3. One baseline pass (`aof work find 06` in `aof-test-repo`) recorded 36 observations under
   node-7297 — the workspace had never been observed under 164 (164/00 E6).
4. With the app off, no `aof` command in the test-bed: `06_milestone_screen-proof/SPEC.md`
   hand-edited `not-started → in-progress`; a commit setting `07_milestone_loop-proof` to
   `in-progress` was made in a scratch clone and `git pull --ff-only`ed in (`294374b`).
5. `aof mesh desktop run` (14:34:16Z). Both daemons logged `build payload 3e2bcd62.20261019T144731`
   (`mesh ui` 14:34:37Z, `mesh serve … (node node-7297, …)` 14:34:57Z).
6. **First run: failed.** The start pass and every tick skipped `aof-test-repo` silently: the store
   held no `global_node_workspaces` row for it (nor for `aof`, two downstream projects,
   `language-tutor`, `project-earshot`, …). Cause: all three `~/.aof/mesh/nodes/*.json` NUL-filled
   since 2026-10-18 13:06Z, and each publish rewrote its workspace with no members — step 3's own
   pass emptied the test-bed's `memberNodeIds`. Logged as F-02.
7. Repair (operator-approved): corrupt files backed up to `~/.aof/mesh/backup-164-nodes-*`;
   `aof mesh identity --name node-7297` republished this node; node-2976 and node-9549 restored
   verbatim from each worker's own record (read over WSL / SSH, nothing started there); nine
   workspaces republished through `publishGlobalRegistryDescriptorsToStore` (ids checked against
   the store first; the WSL secondary checkout skipped) → each linked to all three nodes.
8. The next tick (14:56:25Z) marked `workspace-changed:52294b307214c27d:13c3ff9a…` and drained it:
   store rows `06`/`07` = `in-progress`, authored by node-7297 (taken back from the legacy
   hostname-stem stamp, 164/00 E2 live).
9. Fleet at `http://127.0.0.1:4181/?mode=fleet`: "06 · Screen proof — ◐ in-progress" and
   "07 · Loop proof — ◐ in-progress" under `aof-test-repo`.
10. `aof work doctor` in `aof-test-repo`: no `sync-failing` / `sync-behind`; every workspace
    `in sync` (`aof-test-repo — in sync; last synced 2026-10-19T14:56:25.612Z`).
11. Test-bed restored (`git reset --soft ad982b9`, both files checked out); the next tick
    re-synced both rows to `not-started` (15:47:50Z).

The scenario's step "`aof work find` … from the `aof` checkout" cannot hold as written — `find`
answers the workspace it runs in (F-03); the step now reads the global store's rows, which step 8
measured. Result: pass after F-02's repair.
verifies → `stories/01_story_the-desktop-app-syncs-every-workspace/tasks/02_the-live-app-syncs-changes-made-while-off.feature`.

### Milestone · the whole-tree regression gate

`aof work regression-gate 164`, each run from a clean detached worktree (prepared with
`scripts/prepare-worktree.mjs`, `yarn ui:build`, the private-terms config copied), with an isolated
`AOF_GLOBAL_HOME` and the session's `CLAUDE_*` variables stripped:

| run | commit | result | what it found |
|---|---|---|---|
| 1 | `e7e4dc6c` | red (24.3 min) | five pinned censuses → F-01, fixed in `645f0203` |
| 2 | `4036e782` | red (29.4 min) | `single-entry-two-mode/03`'s wall-clock proxy → F-05, fixed in `09866ad2`; `154/08 task01` ×2 failed once and passed 5/5 when re-run alone at that commit (`@aof/work-loop`, 138 + 14), so they count as load flakes, not 164 regressions |
| 3 | `43c5a45c` | green (23.4 min) | six cases failed under load and passed when re-run alone (named in the row); superseded by F-06's fix |
| 4 | `227d24b6` | red (load) | one case, `declared completion: the DIRECTIVE_COMPLETE sentinel settles after the SHORT confirmation window`, failed in the run and in its alone-retry; at the same commit it then passed 3/3 alone (`test/mesh/worker/mesh-worker-completion-detection.test.mjs`, 7/7 each), so a contention flake, not a code defect: the gate was re-run |
| 5 | `7ce469dc` | **green** (17.4 min) | no failures. `7ce469dc` is 164's line (`227d24b6` + the row-4 record); the branch differs from it only by F-07's foreign commit |

verifies → the milestone's accept door (REGRESSION.md).

No `@uat` scenario is in scope, so no human sign-off applies.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | The first regression gate (`e7e4dc6c`, REGRESSION.md row 1) went red on five pinned censuses the story lanes never selected: the work and mesh native-import allow-lists (`yarn-installation`: `local-change.mjs`, `publisher.mjs`, `projection-store.mjs`), the 61/05 event census and FF-6108's vocabulary and `appendEvent` seam set (`workspace.changed`, `publisher.mjs`), and `core-workspace`'s runtime audit of `commands/doctor.mjs` (source digest moved; the git reader unchanged). | defect | high | Blocker. Fixed inline in `645f0203`: each census taught the new name/import consciously, following m127's `stream.archived` precedent; the audit re-reviewed (same expression digest) and its source digest updated. All five suites re-ran green. Recall: the same class as m161/F-01 (a new import outside a package's allow-list) and m96/F-96-A (a milestone's own code turning shipped controls red), with different files and evidence, so a distinct incident; its audit-digest part repeats m161/F-05 (the same `doctor.mjs` runtime-audit source digest). The recurrence is RETROSPECTIVE R2. | product-owner (164) | closed |
| F-02 | Live, at the 164/01 task 02 check: every node record under `~/.aof/mesh/nodes` NUL-filled (since 2026-10-18 13:06Z), `readNodeRecords` skipped them silently, and every registry publish rewrote its workspace with no members — so the daemon tick (which syncs this node's linked workspaces) skipped nine projects. 164 made it frequent: every command now publishes its own workspace. | defect | high | Blocker. Fixed in `4036e782`: the registry publishes first and refuses over a roster with an unreadable record (`node-record-unreadable`), writing nothing; the change stays owed and every pass retries it with backoff. New `@bug` task 01/03 (E9, E10), red before the fix and green after; ADR-004 amended. The live store was repaired (evidence step 7). Recall: m126/F-50 is the same family (a degraded input reported as something it is not); no prior finding has this cause. | product-owner (164) | closed |
| F-03 | The live check's step "`aof work find` for both refs, run from the `aof` checkout, reports the new statuses", and the SPEC's "in `aof work find` from any other workspace", over-claim: `find` resolves only the workspace it runs in. | contract | medium | Non-blocker; corrected in the contract (`4036e782`): the step reads the global store's rows, the SPEC names fleet as the cross-project view. No behaviour change. Recall: prior occurrence of the class at m160/F-04 (an `@manual` step's wording not matching the delivered face); a different command, so a distinct incident. | product-owner (164) | closed |
| F-04 | The live daemon warns once per tick for each of ~57 registered workspaces whose dispatch-worktree folders are gone (`workdir-missing`) — 116 lines in the first 20 s of `mesh-serve.log`. | gap | low | Non-blocker. R2 of task 01/00 specifies a loud skip per tick, and the descriptors are stale registry data from past lanes, not a 164 defect. Recorded as an OUTCOME gap with its discharge condition. | product-owner (backlog) | open |
| F-05 | The second regression gate (`4036e782`, row 2) went red on `single-entry-two-mode/03`, which asserted `mesh relay` dispatch returns in `< 2000 ms` as a proxy for "no listener bound". Since 164 every command runs its workspace's sync pass first. Measured on this repository: a whole `aof mesh relay --json` invocation takes about 2.1 s warm at `a816d6d1` and about 3.2 s at `4036e782`; the stat walk alone takes 0.6–0.95 s over 3,176–3,277 record files, against the ~240 ms recorded at 164/00's review; a first pass into an empty store takes about 1.9 s (it publishes every row). | defect | medium | Non-blocker. The test is fixed in `09866ad2`: it observes `net.Server.prototype.listen` directly (shown to catch an `http` bind), 12/12 green. The per-command cost is ADR-002's accepted design (one stat walk per command), so it is not reverted here, but the recorded figure was wrong by about 3×. Recorded as an OUTCOME gap with its discharge condition. Recall: no prior finding with this cause. | product-owner (backlog) | open |
| F-06 | Live, at acceptance: `aof work doctor 164` warned `sync-behind` (567 of 568 records "changed"). The store's `aof` workspace rows and `project_root` pointed at `<sibling>/aof-165`, a linked `git worktree` of this repository that another session works in. It carries the same `workspaceId`, so each command run in it republished every row and the root, and each command here republished them back. 164/00's review had routed this to a later story. | defect | high | Blocker: the store answered from whichever checkout ran last, against the milestone's thesis. Fixed in the item: `meshGlobalPropagationDecision` refuses a linked worktree (`mesh-workspace-secondary-checkout`). New `@bug` task 00/03 (E15 red without the arm, `'in-progress'` reached the store; E15/E16 green with it); ADR-004 amended. Recall: no prior finding with this cause. | product-owner (164) | closed |
| F-07 | While verify ran, another session committed `c9d0a0ca` ("fix(codex): discover installations and probe App Server readiness") onto this milestone's branch through the shared checkout. It turns two whole-tree controls red that 164 does not touch: `yarn-installation` (`codex-executable.mjs` now imports `node:fs/promises`, not in the execution allow-list) and `workspace-boundaries` (two unaudited `execFile` calls in `codex-app-server.mjs`, one unaudited computed `createRequire(…).resolve`, two stale audits). | inherited | high | Non-blocker for 164 (not its code): auditing another item's new child-process calls is that item's review, so 164 neither half-fixes nor audits them. 164's gate runs on 164's own line (`227d24b6` = the branch's `74a3a714` without `c9d0a0ca`; `git diff 74a3a714 227d24b6` is exactly that commit's 8 files). The red is routed to the codex change's owner, and the branch stays red until that change audits its child processes. Recall: prior occurrence of the cause at m53/F-20 (an ungoverned commit at the head of a milestone branch), with m69/F-69-V6's triage shape (non-blocker for this item, blocker for its owner). | operator (codex change) | open |

## Accept decision

**Accepted 2026-10-19.** All four stories are done (00–03, with the `@bug` tasks 00/03 and
01/03 added at verify). `aof work validate 164` passes. `aof work doctor 164` reports no `control-unresolved` at
either severity, and FF-16401…16405 each resolve with a recorded red probe. The regression gate is
green at `7ce469dc` (REGRESSION.md row 5, scope all, sharded, 17.4 min, no failures), which is 164's
own line including F-02's and F-06's fixes. Every blocker (F-01, F-02, F-06) is closed, and F-03 is closed by a contract correction. F-04 and
F-05 stay open as non-blockers, each an OUTCOME gap with a discharge condition. F-07 is open
against the codex change that another session committed onto this branch: it is not 164's code,
and this branch's whole-tree controls stay red until that change audits its child processes. There is no `@uat` scope, so no human sign-off applies.
