---
doc: verification
---
# 169 · Hyperagent plans the work — Verification

## Verification evidence

### 169/01 · Integration packages are self-contained — the story's own lanes

Every scenario is `@executable`; the story declares no `@manual` and no `@uat` scenario and has no UI
surface, so no design-conformance review applies. Each lane ran foreground on 2026-10-23 with
`AOF_GLOBAL_HOME` isolated to a fresh temp dir, exit code and both streams read.

- **`node scripts/test.mjs --only packages/core/test/hyperagent-runtime.suite.mjs test/arch/command/acd-integration-registry-one-home.test.mjs packages/integration-hyperagent/test/hyperagent.suite.mjs`**
  — exit 0, `executed 25 cases; failures 0`, no `not ok` on either stream. Includes E1–E8 of task
  00, E1–E3 of task 01, and both task 02 E1 cases (the package seam and the `hyperagent:check` verb).
  `verifies → tasks/00_an-integration-contributes-its-own-assets.feature`,
  `tasks/01_core-names-no-integration-outside-the-registry.feature`,
  `tasks/02_check-extracts-on-windows.feature`
- **`node test/integration/cli.mjs lifecycle`** — exit 0, 60 `ok`, 0 `not ok`. Covers the CLI end of
  task 00 R2/R3: the render appears once `work.integrations.hyperagent` is present and leaves when it
  is removed, and `work init --runtime hyperagent` fails with `Unsupported runtime "hyperagent"`.
  `verifies → tasks/00_an-integration-contributes-its-own-assets.feature`

Not re-run at this verify: the other controls and suites the build edited (bundle membership,
generated stamp, declared writes, learning-edge census, session-driver mesh-blind, source-directory
budget, the bundle/delegation suites). They were green at the build's review (STATE `## Verification`)
and fall to the milestone's `aof work regression-gate 169`.

### 169/00 · Hyperagent plans the work — the story's own lanes

No UI surface, so no design-conformance review applies. Both lanes ran foreground on 2026-10-23 with
`AOF_GLOBAL_HOME` isolated to a fresh temp dir. The exit code and both streams were read.

- **`node scripts/test.mjs --only packages/core/test/hyperagent-runtime.suite.mjs test/arch/command/acd-integration-registry-one-home.test.mjs packages/integration-hyperagent/test/hyperagent.suite.mjs`**
  — exit 0, `executed 25 cases; failures 0`, no `not ok` on either stream. Covers task 00 E2/E4–E6
  (members read from the package, the seven skills plus `AGENT.md`, the execution contract) and task 01
  E2–E7 (brief determinism and refusals, the result block, check in a temporary checkout and the unsafe
  branch, doctor hints). The package's check case, red here when assimilated (F-2), is green.
  `verifies → tasks/00_hyperagent-renders-the-planning-subset.feature`,
  `tasks/01_hyperplan-delegates-and-checks.feature`
- **`node test/integration/cli.mjs lifecycle`** — exit 0, 60 `ok`, 0 `not ok`. Covers task 00
  E1/E3/E7 and task 01 E1: no `.hyperagent/` and no `hyperplan` without `work.integrations.hyperagent`.
  With the block present, `/aof:hyperplan` renders for Claude, and the skills and `AGENT.md` render
  under `.hyperagent/` with no `aof-continue` and no `aof-hyperplan` there. Removing the block removes
  both. The doctor and the brief also run through the CLI.
  `verifies → tasks/00_hyperagent-renders-the-planning-subset.feature`,
  `tasks/01_hyperplan-delegates-and-checks.feature`

**Re-pointed by 169/02 (2026-10-23).** Task 00's E2/E6 were reworded with the move (169/ADR-007): the
skills are written to the aof home by the `package` verb, not into a project. That is covered by
169/02's E1–E5 cases below. The lifecycle scenario above now asserts that no `.hyperagent/` is written.

**Pending — task 01 E8 (`@manual`, live; operator-run).** Measured 2026-10-23, after 169/02:

- `hyperagent` is registered in this repository's `.mcp.json`.
- `~/.aof/hyperagent/` holds the package.
- `aof work integrations hyperagent doctor` reads `ready`: Claude Code MCP is registered and the planner
  package is `current`. Sign-in (OAuth) is not observable from files.

The procedure:

1. Restart Claude Code, run `/mcp`, select `hyperagent` and complete the browser sign-in.
2. In Hyperagent: **Skills → Create skill → upload** each of the seven
   `~/.aof/hyperagent/skills/aof-*/SKILL.md` files. Then create the "AOF Planner" agent from
   `~/.aof/hyperagent/AGENT.md` with those skills and the GitHub integration.
3. `/aof:hyperplan plan` for one idea → draft PR. Then `aof work integrations hyperagent check <branch>`.
4. Promote the milestone it framed, `/aof:hyperplan refine <NN>` → draft PR, then `check` again.

**E8 run, half 1 of 2 (plan), 2026-10-23.** Run by this session over Hyperagent's MCP, following the
`/aof:hyperplan` steps:

- Preflight: `list_agents` returned "AOF Planner" (`cmvlcdayh00bb07adypajjzxa`), and the doctor
  reported `ready`.
- `brief plan --request "<the operator's request, verbatim>"` → `create_thread` with the message
  verbatim. Thread `cmvlcjja500cm07ad1flbrso3`.
- First reply: `status: blocked`, because the agent's GitHub integration was read-only (no branch,
  push or PR). `result` read that back with exit 1. The operator enabled write and resumed the
  thread.
- Final reply: `status: delivered`, `pr: https://github.com/Umairs-Workspace/agent-orchestration-framework/pull/18`,
  `open-questions: 5`. `result` read that back with exit 0.
- `check aof/plan/i-want-ideas-from-this-youtube-video-htt` at `39b4a552c670`: 10 files changed
  (the PRD and RESEARCH under `wiki/planning/`, three backlog milestones and two backlog spikes), and
  nothing outside the planning lane.
  - The first run reported `aof work validate` with 630 issues, every one `story reads path "…" does
    not exist` in older items (F-07). With F-07 fixed, the re-run reports `PASS`, exit 0.
  - Your index, HEAD and worktree list were unchanged both times.

Half 2 of 2 is still owed: promote the milestone the plan framed, `/aof:hyperplan refine <NN>`, then
`check` the refine branch. That needs PR #18 merged first, because the planner reads the repository
from `main`.

### 169/02 · The Hyperagent package lives in the aof home — the story's own lanes

No UI surface. Every lane ran foreground on 2026-10-23 with `AOF_GLOBAL_HOME` isolated to a fresh temp
dir. The exit code and both streams were read.

- **`node scripts/test.mjs --only` over the 22 importer files of the changed surfaces** (the package
  and core Hyperagent suites, every bundle and command arch control the change reads, work-init, the
  inventory and assembly suites, the budget, the shell-out prompt suite) — exit 0,
  `executed 334 cases; failures 0`.
  - The suite E1/E5 case (byte-identical files and a hand-over naming every path, with no upload
    claim) also asserts that the fragment's `packageFiles` equals `PACKAGE_FILES`.
  - E2/E3 (nothing in the project; a re-run removes a stray file), E4 (dry run) and E6 (five verbs,
    in the contribution and in the arch control) each have their own case.
  - The three doctor outline rows (missing / stale / current, each with or without the verb hint)
    are cases too.
  - E7 is the core suite's E4 case: an enabled project gets `/aof:hyperplan` and no `.hyperagent/`.
  - `packages/core/test/application.test.mjs` (a real `node:test` file) — `# pass 2`, `# fail 0`.
  `verifies → tasks/00_the-package-is-written-to-the-aof-home.feature`
- **`node test/integration/cli.mjs lifecycle`** — exit 0, 61 `ok`, 0 `not ok`. The new scenario runs
  the real `work integrations hyperagent package` and `--dry-run` through the CLI under the harness's
  isolated aof home. The project gets no `.hyperagent/`, and the hand-over names `Create skill`.
  `verifies → tasks/00_the-package-is-written-to-the-aof-home.feature` (E1, E2, E4, E5)
- **E8 (`@manual`), measured on this repository.** `aof work update --dry-run --json`, then
  `aof work update --json`: summary `{"created":0,"updated":0,"skipped":176,"drift-warning":0,"deleted":8}`,
  and the eight deletes are exactly `.hyperagent/AGENT.md` and the seven `.hyperagent/skills/aof-*/SKILL.md`.
  The emptied directories were removed afterwards, after a file count of 0.
  `verifies → tasks/00_the-package-is-written-to-the-aof-home.feature` (E8)
- **At the source.** `aof work integrations hyperagent package` was run against the real aof home
  (`~/.aof/hyperagent/`, absent before). Exit 0; it wrote the eight files and printed the
  upload steps. Then `aof work integrations hyperagent doctor` reported `Planner package: current`,
  with Claude Code MCP `registered as "hyperagent" (.mcp.json)`.

### 169/03 · The Hyperagent package carries one zip — the story's own lanes

Run foreground on 2026-10-23 with `AOF_GLOBAL_HOME` isolated. The exit code and both streams were read.

- **`node scripts/test.mjs --only`** over the package suite, the registry, cli-entry and
  command-layer arch controls, application assembly and bundle membership — exit 0,
  `executed 51 cases; failures 0`.
  - E1/E2: the zip holds exactly the seven `<id>/SKILL.md` entries. Each is byte-identical to the
    package's file (read back from the zip's local headers), and a second run writes the same bytes.
  - E3/E4: the steps name the zip first and every `SKILL.md` after it; the dry run names the zip and
    writes nothing.
  - E5: the two doctor rows, a missing zip reading `missing` and an older zip reading `stale`.
  `verifies → tasks/00_the-package-verb-writes-one-zip.feature`
- **`node test/integration/cli.mjs lifecycle`** — exit 0, 61 `ok`, 0 `not ok`. The package scenario's
  stdout names `aof-hyperagent-skills.zip`.
- **`node scripts/workspace-boundaries.mjs`** — `"findings": []`. The package's suite takes core's
  zip writer as a test collaborator, and the package's src imports nothing from core.
- **At the source.** `aof work integrations hyperagent package` was run against the real aof home:
  exit 0, and `~/.aof/hyperagent/aof-hyperagent-skills.zip` was written (51,575 bytes). Windows'
  own `System.IO.Compression.ZipFile` opens it and lists the seven `aof-*/SKILL.md` entries. The
  doctor reports `Planner package: current`.
- **E6 (`@manual`), the operator's run, 2026-10-23.** A trial zip with the same `<id>/SKILL.md`
  layout was uploaded through Create skill → Upload file. It was built by PowerShell
  `Compress-Archive` from the package, before the verb wrote one, so it is the same layout but not
  the same bytes. Its import thread drafted the seven skills, and the operator's Skills list then
  showed `aof-validate`, `aof-refine`, `aof-add-task`, `aof-add-story`, `aof-add-milestone`,
  `aof-shatter` and `aof-prd`, installed Oct 23, 2026.
  `verifies → tasks/00_the-package-verb-writes-one-zip.feature` (E6)

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16901 | `test/arch/command/acd-integration-registry-one-home.test.mjs` (E1, E2) | GREEN (2/2, 2026-10-23). | E2 plants `packages/core/src/work/planted.mjs` importing `@aof/integration-hyperagent/runtime` in a temp tree and runs the same scanner. Observed: the violation list is exactly `packages/core/src/work/planted.mjs imports @aof/integration-hyperagent/runtime`. |
| FF-16902 | `test/arch/command/acd-integration-registry-one-home.test.mjs` (the two FF-16902 cases; moved at the milestone verify from `hyperagent-runtime.suite.mjs`, which doctor cannot resolve as a control path) | GREEN (5/5, 2026-10-23). | Created `packages/core/assets/commands/hyperplan.md` (one line, `probe`) and re-ran the file. Observed red: `not ok - FF-16902 · core's assets hold no file an integration renders…`, actual `[ "core's assets hold commands/hyperplan.md, which @aof/integration-hyperagent renders" ]`, exit 1. File removed; nothing left behind. The case's own planted-tree twin pins the same message. |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | ADR-003 named one Notion import in `command-core.mjs` as FF-16901's exception. Measured at verify, `@aof/integration-notion` is imported from ten modules under `packages/core/src`. FF-16901 excepts the Notion package by name. | defect | low | Non-blocker. The control matches the decision's intent: Notion is the chore's to move. ADR-003 is amended with the measured ten modules (ratified at this verify). Recall: no prior finding with this cause (m72/F-72-AD, F-72-AB, F-72-A and m69/F-69-V10 are other ADR wordings). | product-owner (the Notion chore: ten modules, not one) | closed |
| F-02 | The sidecar copy of an integration's assets (`scripts/install-local.mjs`, `scripts/build-sea.mjs`) has no test of its own. Task 00 E2 covers only the reader, against a sidecar laid out by hand. | test-gap | low | Non-blocker. The writer is first exercised by the next payload install. Recorded as an OUTCOME gap. Recall: m163/F-02 and m138/F-04 are other `install-local` faults, so this is a distinct incident. | product-owner (backlog) | open |
| F-04 | The first `aof work regression-gate 169` (at `14c952a3`) was red on 11 cases that no story lane selected. Four censuses read the whole bundle and now met the appended integration members: work-init render/stamp, the command-member pin, the per-runtime refine count (matched the `aof-refine` asset) and the install roots. The 66/00 differential's pre-135 reader cannot see 169/00's tag on a `Rule:` that holds more than one scenario. The repo config put `integrations` between `intake` and `agents`. FF-16803's fixture was date-bound: its files had today's mtime against a fixed `updated: 2026-10-22` (not 169's cause, but it was red on this gate). | defect | blocker | Blocker, fixed in `510ee529` (test-side and config only, no product-code change). The second gate row at `510ee529` is green. Recall: prior occurrence m153/F-01, with the same cause (a milestone's reds appear first at the whole-tree gate because story lanes never select the censuses over the bundle). | developer (this verify) | closed |
| F-05 | `aof work doctor 169` reported two errors. ARCHITECTURE.md declared FF-16901/FF-16902 as bullets, not a register table, so both FF rows here were `register-dangling-citation`. Once the register was a table, FF-16902's control, `hyperagent-runtime.suite.mjs`, was `control-unresolved`: a `.suite.mjs` is not a path a runner sees. | defect | blocker (accept rule) | Blocker, fixed at this verify. The register is now a table. FF-16902's two invariants are an arch case in FF-16901's control file (generalised over every integration, with a planted-tree twin), and its red probe was re-run. Doctor reports no error-level finding. Recall: distinct incident. m57/F-57-03-3 cites a control that is not on disk (a different cause), and m71/F-71-A, m53/F-04 and m66/F-33 are other register faults. | developer (this verify) | closed |
| F-06 | Operator review (2026-10-23): `.hyperagent/` was rendered into every enabled project, and nothing reads it. Nothing in Hyperagent reads a repository on its own. A skill enters through Create skill: upload (JSON or Markdown file, or `.zip`), Import from GitHub, linked docs, or a chat build. Either way it lands on the account, and "importing always creates a new skill". **Corrected 2026-10-23:** this row first said there was no GitHub import. The operator's screenshot of the dialog shows one; the docs page omits it. | defect | blocker | Blocker, fixed by 169/02 (ADR-007): a `package` verb writes `~/.aof/hyperagent/` for upload, the project renders `/aof:hyperplan` alone, and the docs and doctor name the upload. Recall: distinct incident. m66/F-45 is aof's own prose promising a refusal its machinery lacks, a different cause. | developer (169/02) | closed |
| F-07 | E8's first `check` of a real plan branch reported 630 `story reads path "…" does not exist` findings, all in older items and none in the plan's files. The same tree validates clean in this checkout. `check` validates a tree extracted with `checkout-index`, which has no `.git`. Validate's `reads:` rule resolves a moved citation through `git log` renames plus the ledger, both read at the project root, so in the extracted tree every rename since the public-root cut was lost. | defect | blocker | Blocker, fixed. `validateWork` takes a `historyRoot` (default: `projectRoot`), and `check` passes the repository the branch came from. Regression: story-context E9 (a non-git tree is red alone and clean with the history root) and the package's check case (asserts `historyRoot` is the repository). Task 01 gains `@bug @finding-F-07` E9. The real re-run is `PASS`. Recall: prior occurrence m119/F-18, with the same cause (the resolver's rename map comes from `git log`, so a tree without that history cannot resolve renames). | developer (169/00) | closed |
| F-08 | The plan branch for a long request was `aof/plan/i-want-ideas-from-this-youtube-video-htt`. `planSlug` cut the slug at 40 characters, mid-word (into the URL). | defect | low | Non-blocker, fixed inline. The slug is cut at the last whole word, and one over-long word is still cut. The package suite pins both, and task 01 gains `@bug @finding-F-08` E10. PR #18's branch keeps its name. Recall: distinct incident; no prior finding on slug truncation (m138/F-19 and m130/F-23 are about slug edges of other censuses). | developer (169/00) | closed |
| F-03 | ADR-005's gate drops an integration's resources and assets. An integration's hooks and templates are not gated, and no integration ships either today. | gap | low | Non-blocker. Nothing renders ungated today. Recorded as an OUTCOME gap. Recall: m124/F-15 and m55/F-55-M-2 are other unpinned or uncounted members, so this is a distinct incident. | product-owner (backlog) | open |

## Accept decision

**ACCEPTED (169/01)** — 2026-10-23. The story's own lanes are green (25/25 cases, the lifecycle
feature 60/60). Both declared controls are green and each was seen to fail on a red probe.
`aof work validate 169/01` passes, and no blocker finding is open. Carried forward: F-02 and F-03 as
OUTCOME gaps, and the milestone's `aof work regression-gate 169`, which story 00 and the milestone
accept still need.

**ACCEPTED (169/02)** — 2026-10-23. The story's own lanes are green (334/334 cases over the 22
importer files, the lifecycle feature 61/61, `application.test.mjs` 2/2), and the command-layer arch
controls are 47/47. E8 was measured on this repository: its update deleted exactly the eight
`.hyperagent/` files. The verb and the doctor were run at the source, against the real aof home.
`aof work validate 169/02` passes, and no blocker finding is open (F-06 is closed by this story).
Carried forward: F-02's sidecar-writer gap, held in 169/01's OUTCOME (its discharge condition now names the `package` verb). The milestone's
regression gate must re-run over this change before 169 is accepted.

**ACCEPTED (169/03)** — 2026-10-23. The story's own lanes are green (51/51 cases, the lifecycle
feature 61/61), the workspace boundaries are clean, and the zip was measured at the source. E6 is the
operator's upload of a same-layout zip, and its bytes differ from the verb's, as stated above.
`aof work validate 169/03` passes, and no blocker finding is open.
