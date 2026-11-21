---
doc: verification
---
# 203 · Every file aof generates is held to a committed baseline — Verification

## Fitness functions

Declared at refine (2026-11-20). Each control lands with story 00, and each owes its red probe
here when it does.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-20301 | `test/arch/testing/acd-golden-normaliser-closed.test.mjs` | green (3 cases), 2026-11-21, 203/00; green again at verify | red, 2026-11-21: a seventh rule (`uuids`) in `normalise.mjs` → "a seventh rule, or a reordering, needs a superseding ADR (203/ADR-002 §6)"; a `.replaceAll` in `harness.mjs` → "captured content is rewritten in normalise.mjs and nowhere else (203/ADR-002 §1)", naming `test/support/golden/harness.mjs`. Both reverted. |
| FF-20302 | `test/arch/testing/acd-golden-baselines-written-by-the-script.test.mjs` | green (3 cases), 2026-11-21, 203/00; green again at verify | red, 2026-11-21: `test/golden/probe-writer.test.mjs` importing `baseline-writer.mjs` → "only the update script writes a baseline (203/ADR-004 §5)", importers `scripts/golden.mjs` + the probe; `if (process.env.AOF_GOLDEN_UPDATE) options.update = true` in `scripts/golden.mjs` → "a test run is turned into an update by the script's --update flag alone (203/ADR-004 §5)", naming `scripts/golden.mjs`. Both reverted. |
| FF-20303 | `test/arch/testing/acd-golden-baselines-eol-pinned.test.mjs` | green (4 cases), 2026-11-21, 203/00; green again at verify | red, 2026-11-21: the `test/golden/baselines/**` pin removed from `.gitattributes` → "…/project/.claude/agents/aof-architect.md.golden is pinned eol=lf — got {"text":"unspecified","eol":"unspecified"}"; `test/golden/baselines/init/probe/project/a.md` without the suffix → "a baseline without the suffix is read as source by every tool that walks test/ (203/ADR-003 §4)", naming `init/probe/project/a.md`. Both reverted. The `.golden` sweep has no committed baseline to sweep until 203/01. |

## @manual — agent-run evidence

### 203/01 task 04 · An intentional prose edit shows as exactly that edit (2026-11-21, developer)

Run in a scratch detached worktree of this branch carrying the uncommitted 203/00 and 203/01 work,
with `AOF_GLOBAL_HOME` isolated. The baselines were staged there, so "clean" means no unstaged
change against them. Evidence: `stories/01_story_every-init-scenario-renders-to-its-baseline/evidence/`.

- **E16 · the failure.** One sentence of `packages/core/assets/commands/refine.md` reworded ("Deepen
  a work item" → "Sharpen a work item"). The `work-init` suite failed 8 of 27 cases, every one a
  comparison. Every changed path is a render of refine: `.claude/commands/aof/refine.md` and
  `.opencode/commands/aof/refine.md` in `default`, and, through the base, in each scenario that
  renders them (`claude` and `opencode` one each; `all-practices`, `notion`, `hyperagent`,
  `customised` two each). Each diff is one hunk, holding the old and the new sentence with 3 lines of
  context. Nothing else was reported changed, added or removed (`E16-suite-failure.txt`,
  `E16-script-compare.txt`). **Observation:** `codex` matched its baseline, because Codex's refine
  skill renders from `packages/core/assets/variants/codex/workflow.md`, a separate copy that still
  says "Deepen". The lane shows this faithfully. See STATE.
- **Accepting.** `node scripts/golden.mjs --lane work-init --update` wrote 4 files, the two renders in
  `default` and the two `all-practices` stores. `git diff --stat test/golden/baselines`: 4 files,
  4 insertions, 4 deletions. Each diff is the one sentence (`E16-accept.txt`,
  `E16-accept-diffstat.txt`, `E16-accept-baselines.diff`). The suite then passed, 27 of 27.
- **Reverting.** The edit and the accepted baselines were checked out back. The suite passed, 27 of
  27, and `test/golden/baselines` had no unstaged change.

Sign-off of the `@manual` scenario stays with `aof:verify`.

**Signed off at verify (2026-11-21, product owner).** The evidence files bear out every clause of the
three scenarios: `E16-suite-failure.txt` holds 8 failures of 27, each a comparison naming only refine
renders; `E16-accept-diffstat.txt` is 4 `.golden` files, 4 insertions and 4 deletions; and
`E16-accept-baselines.diff` is four one-hunk diffs, each the one reworded sentence with 3 lines of
context. verifies → 203/01 task 04, all three scenarios.

### 203/02 task 03 · The suite is green on Windows — NOT RUN (2026-11-21)

Owed on the Windows control node. This MacBook is in no mesh. From a pull of this branch with
`core.autocrlf=true` and a fresh `AOF_GLOBAL_HOME`: run `node scripts/golden.mjs` (no `--update`),
then `git status`, then `git ls-files --eol test/golden/baselines`, recording the real `~/.aof`
mtimes before and after. Save the output under
`stories/02_story_update-changes-nothing-it-should-not/evidence/`. On macOS the same run passes all
10 scenarios, and a second `--update` writes nothing.

**Re-run at verify on macOS (2026-11-21), the macOS half only.** `node scripts/golden.mjs` with a
fresh `AOF_GLOBAL_HOME` exited 0, and all 10 scenarios (8 `work-init`, 2 `work-update`) matched their
baselines. `git status --porcelain test/golden` was the same before and after. `git check-attr eol`
on a baseline answers `lf`. All 302 files under `test/golden/baselines` end `.golden` and none holds a
CR byte. Under the real `~/.aof`, only `mesh/cost/node-6eb3.{ui,serve}.json` and
`mesh/presence/node-6eb3.json` changed mtime during the run. A 20-second sample with no run changed
the same three files and a loop log, so the live daemons wrote them, not the run. **This does not
discharge task 03:** its scenarios name the Windows checkout. `git ls-files --eol` cannot be read
here, because the baselines are uncommitted.

## Verification evidence

Run at verify, 2026-11-21, on the uncommitted branch tree. Each suite ran by file with its own
`AOF_GLOBAL_HOME=$(mktemp -d)` through `node scripts/test-shard.mjs`.

- **The three golden suites.** `golden-harness` 52/52, `work-init` 27/27, `work-update` 22/22. verifies →
  every `@executable` scenario and outline row of 203/00, 203/01 and 203/02 (traceability checked
  case-by-name at `aof:validate`: every scenario and every Examples row has its named case).
- **After the contract amendment** (Accept decision, below) the tightened step definitions re-ran:
  `work-init` 27/27, `work-update` 22/22.
- **Every `test/arch/testing` control** (14 files): 13 files green. `acd-source-directory-budget` 7 of 10
  red, every one naming `test/loop` (66 > 64) or `packages/foundation/src` (9 > 8), the reds STATE
  records as red at HEAD on a `git archive` copy. None names a golden directory.
- **`aof work validate 203`:** PASS. **`aof work loops validate`:** exit 0, 5 warns, none 203's.
  **`aof work doctor 203`:** exit 0, warns only, and no `control-unresolved` at either severity.
- **The milestone regression gate has NOT run.** `aof work regression-gate 203` needs a clean checkout,
  and every file of this milestone is uncommitted.

## Findings

Product observations the golden lanes surfaced. Each was measured during the build, and each baseline
holds today's behaviour, so any fix shows as a reviewed diff. None blocks 203: this milestone holds
what aof generates and does not change the verbs (SPEC, Scope). Recall at triage: one
`aof memory recall --kind finding` per finding, after `aof memory ingest`. No candidate shared cause
and evidence, so each is a distinct incident (recalls `d44e9a79`, `a571010b`, `3cf045c8`, recorded on 203).

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | Over a project that already holds `.claude/agents/aof-architect.md` written by the user, a first `aof work init` replaces it with aof's architect, reports it as `update`, and warns of no drift. `update` warns on an edit to a file aof installed; `init` does not warn on a file aof never installed. Held by the `customised` baseline (203/01 E14). Nearest recalled: m188/F-13, m57/F-57-01-4, both about `update`, not first-time `init`. | product gap | non-blocker | defer: whether `init` should refuse or warn is a product decision | backlog | open |
| F-02 | Codex's refine skill renders from `packages/core/assets/variants/codex/workflow.md`, a hand-kept copy, so an edit to `packages/core/assets/commands/refine.md` changes Claude Code and opencode and leaves Codex saying the old sentence (203/01 E16 evidence). Nearest recalled: m193/F-01 (Codex agent rendering under operator-aware discovery), a different cause. | product gap | non-blocker | defer: whether the variant should follow `commands/*.md` is a product question | backlog | open |
| F-03 | When `aof work update` keeps a drift-warned file, that file's lock entry moves to the end of `work.files` (`createLockManifest`, `packages/core/src/lock.mjs`, appends preserved entries after the planned ones), so a user who edits one aof file gets a reorder hunk in their committed lock. Deterministic; held by `customised-update` (203/02 task 01, as amended). Nearest recalled: m124/F-08, m129/F-62, m127/F-13, all lock-content causes, not ordering. | product gap | non-blocker | defer: a small story | backlog | open |

## Accept decision

**2026-11-21 · product owner (inline) · `aof:verify 203`.**

- **Contract amendment ratified** (STATE items 1 and 4). The features did not count aof's own `.aof/`
  records. 203/01 task 00's R1 outline gains a `records` column: `claude` and `opencode` list the
  apply journal as removed, and `opencode` also lists `.aof/loops/`. 203/01 task 01 E5 names the lock,
  and E7 names the lock and the journal. 203/02 task 01's stored delta names the lock, with the kept
  file's entry moved to the end. The step definitions already asserted the measured truth over
  member files. They now also assert the install records named by each clause, and their FLAGGED
  comments cite the amendment. Both lanes re-ran green (Verification evidence).
- **203/00 · accepted.** Every scenario green. FF-20301 to FF-20303 green, each with its recorded red
  probe. No open blocker.
- **203/01 · accepted.** Every `@executable` scenario green. Its `@manual` task 04 signed off. No open
  blocker. F-01 and F-02 are deferred non-blockers.
- **203/02 · NOT accepted, stays `in-review`.** Every `@executable` scenario is green, but `@manual`
  task 03 (the suite on Windows) has not run, and this MacBook can reach no Windows node. This is an
  owed environmental check, not developer rework, so the story is not handed back to `in-progress`.
  It is accepted once the task 03 evidence is recorded.
- **203 (milestone) · NOT accepted.** It needs 203/02 done and a recorded regression-gate row. The gate
  needs a clean checkout, and this milestone's work is uncommitted. The full-tree run will also meet
  the pre-existing `acd-source-directory-budget` reds (`test/loop`, `packages/foundation/src`) and FF-7106
  (198/02), which are not this milestone's.
