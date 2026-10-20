---
doc: verification
---
# 165 · Planning runs in Cowork — Verification

## Verification evidence

### The whole tree — `aof work regression-gate 165`

- **First gate, `36517813`: red** (`REGRESSION.md` row 1, sharded, 69.7 min). This was the first
  whole-tree run of this branch since the 165 build, which had gated only story-scoped suites in
  the sibling worktree. The deterministic reds were F-01 (165's own) and F-02 (`c9d0a0ca`). The
  timing reds were load. The control daemon held more than one core throughout (F-03), and each
  timing unit passed when re-run alone after the repair:
  - `core-workspace`: 11/11
  - `loop-diag`: 57/57
  - `agent-session-driver-transcript`: 37/37
  - `phases`: 50/50
- **Repair, `78f08231`.** A focused, isolated run over every touched control passed (337 cases).
  The one red was `core-workspace`'s `ETIMEDOUT`, which passed alone.
- **Second gate, `a9279d02`: green** (row 2, sharded, 24.0 min). It ran from the clean detached
  worktree `aof-gate-165`, because another session's promotion of 166 left this checkout dirty.
  There was one load flake, which was not isolated. Commit `d3d7b0d7` between the two gates
  carries wiki records only.

### 165/00 · The planning lock records each runtime

- **`@executable` tasks 00 and 01** pass in the whole-tree gate at `a9279d02`.
  `verifies → stories/00_story_planning-lock-records-each-runtime/tasks/00_a-second-runtime-is-recorded-beside-the-first.feature`,
  `verifies → stories/00_story_planning-lock-records-each-runtime/tasks/01_a-re-install-needs-force-for-its-own-runtime-only.feature`

### 165/01 · The planning skills render as a Cowork plugin

- **`@executable` tasks 00–02** pass in the gate at `a9279d02`.
  `verifies → stories/01_story_planning-skills-render-as-a-cowork-plugin/tasks/00_the-plugin-holds-shatter-and-explain.feature`,
  `verifies → stories/01_story_planning-skills-render-as-a-cowork-plugin/tasks/01_without-the-cli-a-skill-writes-markdown-only.feature`,
  `verifies → stories/01_story_planning-skills-render-as-a-cowork-plugin/tasks/02_the-package-is-reproducible.feature`

### 165/02 · The pinned planner is packaged for Cowork

- **`@executable` tasks 00 and 01** pass in the gate at `a9279d02`.
  `verifies → stories/02_story_pinned-planner-is-packaged-for-cowork/tasks/01_each-recommended-plugin-is-a-standalone-package.feature`
- **`@manual` "the live clone at v2.0.0 packages the recorded commit"**, re-run at verify on
  2026-10-20 on the Windows control node, at this branch's code.
  - **Procedure:** `resolveSha({})` through the live `git ls-remote`, then
    `packagePlanner({ sha, withOptional: true })` with the live clone seam. The run counted
    `aof-pm-skills-*` directories under `os.tmpdir()` before and after.
  - **Result:** `refs/tags/v2.0.0` resolved to `5042ff6169e0df49086c846f69bf7b6cdb67a6de`, and
    packaging returned `ok: true`. `packagePlanner` refuses `head-mismatch` unless the clone's
    `HEAD` equals that sha. It produced pm-execution (30 files), pm-product-discovery (21),
    pm-product-strategy (20) and pm-market-research (13), each with `LICENSE`. 0 files contain a
    CR, and the count of temporary clone directories was 0 before and 0 after.
  `verifies → stories/02_story_pinned-planner-is-packaged-for-cowork/tasks/00_packages-come-only-from-the-pinned-commit.feature`

### 165/03 · Planning init delivers Cowork

- **`@executable` tasks 00 (E1–E4) and 01** pass in the gate at `a9279d02`.
  `verifies → stories/03_story_planning-init-delivers-cowork/tasks/01_cowork-beside-claude-and-codex.feature`
- **`@uat` E5: pending** the operator's run in Cowork. Staged on 2026-10-20 in the standing
  test-bed (`aof-test-repo`):
  - `aof planning init --runtime claude --scope project` installed 3 plugins, pinned at `5042ff61…`.
  - `aof planning init --runtime cowork` then exited 0 and wrote the four packages under
    `.aof/cowork/`, which `git check-ignore` reports ignored.
  - The lock's claude entry is deep-equal to its pre-cowork value, and the cowork entry records
    `installConfirmed: false`.
  - The printed hand-over names the upload path and `/aof:shatter`, and claims no install.
  `verifies → stories/03_story_planning-init-delivers-cowork/tasks/00_cowork-packages-and-install-steps.feature` (E5 pending)

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16501 | `test/arch/planning/acd-planning-lock-isolation.test.mjs` | GREEN (gate `a9279d02`) | `writePlanningEntry` wrote `{ runtimes: { [runtime]: manifest } }`, dropping the other runtimes → "the claude entry is deep-equal after the codex init" |
| FF-16502 | `test/arch/planning/acd-cowork-skills-from-command-source.test.mjs` | GREEN | `commandAsSkill` collapsed the body's blank lines → both cases red: "shatter: the skill ends with the command body unchanged", and codex's pre-165 byte-identity |
| FF-16503 | `test/arch/planning/acd-cowork-package-deterministic.test.mjs` | GREEN | the writer's path sort removed → "order of the map does not change the bytes"; a bare `import "fs"` added → "fs is not a node: built-in" |
| FF-16504 | `test/arch/planning/acd-cowork-planner-pinned.test.mjs` | GREEN | the `head !== sha` check disabled → "no package comes from a tree whose HEAD is not the sha" red |
| FF-16505 | `test/arch/planning/acd-planning-install-commands.test.mjs` | GREEN | the cowork render item given a `claude plugin install` argv → "aof carries no argv" |
| FF-16506 | `test/arch/planning/acd-planning-cowork-install-unconfirmed.test.mjs` | GREEN | the cowork entry written with `installConfirmed: true` → both cases red, "installConfirmed is false" |

Each probe was planted alone, the control was run alone (`scripts/test.mjs --only`, isolated
`AOF_GLOBAL_HOME`), and the file was restored byte-for-byte. All six controls were then re-run
green.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | The first whole-tree gate (`36517813`) reds three controls on 165's own code, none of them in a story lane: FF-16004 (`aof work find 160` evaluated 713 modules over its ceiling of 710, because `planning-init.mjs` imported the three cowork modules statically); FF-6601 (the printed `Then connect …` hand-over line read as a second Gherkin recogniser); FF-11901 (FF-16503 spelled its own import extractor). The same cause as m164/F-01 and m135/F-135-05: pinned census controls that story lanes never select. | defect | medium | blocker → fixed at verify: the cowork modules load inside the cowork run (back to 710), the line reads `Next, connect …`, and FF-16503 uses `module-family.mjs` | 165 (verifier) | closed (`78f08231`) |
| F-02 | `c9d0a0ca` (codex discovery), committed after 164's green gate and never gated, reds three controls on this branch: an unaudited `execFile` pair in `codex-app-server.mjs` (with stale audit entries), `node:fs/promises` outside the execution kernel's allowlist, and `packages/execution/test` at 23 entries over its ceiling of 22. A distinct incident from m161/F-01: the same allowlist control, but here the cause is a commit landing after the gate. | defect | medium | blocker for this branch's gate → fixed at verify: audit re-stamped (the PowerShell entry dropped, since it now runs through the injected `run`), allowlist extended, budget row 22 → 23 with its reason | 164-branch (verifier) | closed (`78f08231`) |
| F-03 | The control daemon (`mesh serve`) held more than one core for about 17 hours, measured from its logs. The global cache held no rows for this workspace, so a polling view parsed the whole work tree about every 6 s; the sync pass failed 83 times on `event-id-conflict`; and 58 dead dispatch-worktree registrations were walked on every tick (m164/F-04 recurring). After a restart onto F-06's fix, it still measured 62% of a core. | defect | high | non-blocker for 165 (not this milestone's code, but it made the first gate unreadable) → backlog | `backlog/milestone_daemon-stays-within-a-resource-budget` | open |
