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
- **Third gate, `83850d89`: green** (row 3, sharded, from the same clean worktree), after 165/03's
  ADR-006 amendment. Every red was a load flake that passed alone.

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

- **`@executable` tasks 00 (E1–E4) and 01** pass in the gate at `83850d89`, after the amendment below.
  `verifies → stories/03_story_planning-init-delivers-cowork/tasks/01_cowork-beside-claude-and-codex.feature`
- **Amended at verify (2026-10-20), Q4 → ADR-006.** The operator asked why the packages sat in
  each project when they are the same everywhere. 03 was reopened, its contract amended (the
  packages live once in the aof home, and the lock records them relative to it), rebuilt and
  re-reviewed. The focused set passed (405 cases), and so did the importer sweep (97 cases).
  FF-16507 is new. The Q4 answer is stamped on run `20261020T113249125Z-0002`.
- **`@uat` E5: passed**, on 2026-10-20, in the standing test-bed (`aof-test-repo`).
  - **Staging (agent).** The test-bed's lock records claude
    (`aof planning init --runtime claude --scope project`, 3 plugins pinned at `5042ff61…`).
    `aof planning init --runtime cowork --force` with the amended build exited 0 and wrote the
    four packages under the aof home's `cowork/`, printing each one's full path. The cowork
    entry records `cowork/aof.plugin` and `cowork/pm-skills/<plugin>.plugin` with
    `installConfirmed: false`.
  - **In Cowork (operator).** The four packages uploaded and were enabled on the account. A task
    already running did not see them; a new task did (F-06). `/aof:shatter` was offered, beside
    pm-execution's `write-prd` and `create-prd`. The operator wrote `PRD-text-shaping.md` (8
    sections, one blocking question) at the repo root and ran `/aof:shatter` on that path.
    Shatter wrote three drivers in `wiki/work/backlog/`, in PRD order:
    `milestone_case-conversion`, `spike_segmenter-availability` and
    `milestone_grapheme-safe-truncate-wrap`. Each has a blank `number:`,
    `origin: PRD-text-shaping.md` and `status: not-started`. Truncate-and-wrap
    `depends: [segmenter-availability]`, by slug, and its Dependencies prose names the finding it
    waits on. The spike's Question is real, its Timebox is 1d, and its Finding is empty, with no
    `stories/` and no `.feature`. Without `aof`, the skill skipped memory recall, record-recall,
    validate and promote and listed them, so the drivers stayed in the backlog. Nothing was
    committed: four new untracked files, HEAD `ad982b9` unchanged.
  - **From the Windows CLI (agent).** `aof work validate` by ref passed for all three drivers.
    The stream-wide validate reports three reds, all in test-bed retrospectives committed in
    `33f3009` before 165. `aof work promote grapheme-safe-truncate-wrap` ahead of the spike was
    refused (`promote-depends-backlog`, naming `segmenter-availability`). Promoting in order then
    minted 10 (the spike), 11 and 12, and rewrote 12's `depends` to `[10]`. `aof work next 12`
    answers `blocked`, waiting on 10. The lock's claude entry is deep-equal to its pre-cowork value.
  - **User sign-off:** the operator reported E5 as passing on everything Cowork can do, and named
    the Windows-side checks above as the sign-off condition. All of them hold.
  `verifies → stories/03_story_planning-init-delivers-cowork/tasks/00_cowork-packages-and-install-steps.feature` (E5)
- **Fixed at the close, from the E5 report:** F-04 (the cowork preamble now says a check that
  could not run is not a failed one, E12) and F-06 (the upload steps say to start a new Cowork
  task). 225 cases passed across every importer of the two changed modules.

## User sign-off

- **165/03 E5** — signed off by the operator, 2026-10-20, on the evidence above.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16501 | `test/arch/planning/acd-planning-lock-isolation.test.mjs` | GREEN (gate `a9279d02`) | `writePlanningEntry` wrote `{ runtimes: { [runtime]: manifest } }`, dropping the other runtimes → "the claude entry is deep-equal after the codex init" |
| FF-16502 | `test/arch/planning/acd-cowork-skills-from-command-source.test.mjs` | GREEN | `commandAsSkill` collapsed the body's blank lines → both cases red: "shatter: the skill ends with the command body unchanged", and codex's pre-165 byte-identity |
| FF-16503 | `test/arch/planning/acd-cowork-package-deterministic.test.mjs` | GREEN | the writer's path sort removed → "order of the map does not change the bytes"; a bare `import "fs"` added → "fs is not a node: built-in" |
| FF-16504 | `test/arch/planning/acd-cowork-planner-pinned.test.mjs` | GREEN | the `head !== sha` check disabled → "no package comes from a tree whose HEAD is not the sha" red |
| FF-16505 | `test/arch/planning/acd-planning-install-commands.test.mjs` | GREEN | the cowork render item given a `claude plugin install` argv → "aof carries no argv" |
| FF-16506 | `test/arch/planning/acd-planning-cowork-install-unconfirmed.test.mjs` | GREEN | the cowork entry written with `installConfirmed: true` → both cases red, "installConfirmed is false" |
| FF-16507 | `test/arch/planning/acd-planning-cowork-install-unconfirmed.test.mjs` | GREEN (focused, at `83850d89`) | a cowork run also writing `.aof/cowork/.gitignore` into the project → "the project holds only the lock"; the lock entry recording the bundle by `path.resolve(…)` → "C:\…\cowork\aof.plugin is relative and under cowork/" |

Each probe was planted alone, the control was run alone (`scripts/test.mjs --only`, isolated
`AOF_GLOBAL_HOME`), and the file was restored byte-for-byte. All six controls were then re-run
green.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | The first whole-tree gate (`36517813`) reds three controls on 165's own code, none of them in a story lane: FF-16004 (`aof work find 160` evaluated 713 modules over its ceiling of 710, because `planning-init.mjs` imported the three cowork modules statically); FF-6601 (the printed `Then connect …` hand-over line read as a second Gherkin recogniser); FF-11901 (FF-16503 spelled its own import extractor). The same cause as m164/F-01 and m135/F-135-05: pinned census controls that story lanes never select. | defect | medium | blocker → fixed at verify: the cowork modules load inside the cowork run (back to 710), the line reads `Next, connect …`, and FF-16503 uses `module-family.mjs` | 165 (verifier) | closed (`78f08231`) |
| F-02 | `c9d0a0ca` (codex discovery), committed after 164's green gate and never gated, reds three controls on this branch: an unaudited `execFile` pair in `codex-app-server.mjs` (with stale audit entries), `node:fs/promises` outside the execution kernel's allowlist, and `packages/execution/test` at 23 entries over its ceiling of 22. A distinct incident from m161/F-01: the same allowlist control, but here the cause is a commit landing after the gate. | defect | medium | blocker for this branch's gate → fixed at verify: audit re-stamped (the PowerShell entry dropped, since it now runs through the injected `run`), allowlist extended, budget row 22 → 23 with its reason | 164-branch (verifier) | closed (`78f08231`) |
| F-03 | The control daemon (`mesh serve`) held more than one core for about 17 hours, measured from its logs. The global cache held no rows for this workspace, so a polling view parsed the whole work tree about every 6 s; the sync pass failed 83 times on `event-id-conflict`; and 58 dead dispatch-worktree registrations were walked on every tick (m164/F-04 recurring). After a restart onto F-06's fix, it still measured 62% of a core. | defect | high | non-blocker for 165 (not this milestone's code, but it made the first gate unreadable) → backlog | `backlog/milestone_daemon-stays-within-a-resource-budget` | open |
| F-04 | At E5, the cowork preamble told every skill to skip each `aof` step when the CLI is absent, while shatter's step 6 says validate must pass before it finishes. So a Cowork run always ended in a state the skill itself calls blocking. A distinct incident from m66/F-45, which was prose promising a refusal the machinery does not make; this is two rules in one prompt that contradict each other. | defect | medium | fixed at the close: one preamble line says a check that did not run is not a failed one, so the run finishes, marks its report unvalidated and names each check to run from Claude Code or Codex. 165/03 E12 pins it. | 165 (verifier) | closed |
| F-05 | E5 handed `/aof:shatter` the PRD path, so the auto-discovery branch (no argument, one `PRD-*.md` at the root) never ran in Cowork. Shatter states the rule inline (explicit path wins, else exactly one `PRD-*.md`, never guess, otherwise stop and ask). Its citation of `packages/core/src/planning-prd.mjs` names aof's own source, which a downstream repo does not have. Related to m126/F-29: a path exercised live on one branch only. | test-gap | low | non-blocker: E5 does not state discovery, and the rule is in the skill. The next Cowork session can run `/aof:shatter` with no argument once. | recorded (STATE feedback) | open |
| F-06 | At E5, a Cowork task that was already running did not see the newly uploaded plugins; only a task started after the upload did. | enhancement | low | fixed at the close: the upload steps say to start a new Cowork task after uploading (165/03 E1) | 165 (verifier) | closed |
