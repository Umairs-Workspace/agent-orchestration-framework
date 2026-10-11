---
doc: verification
---
# 149 · Manual mode: continue guides the operator who builds the work themselves — Verification

## Verification evidence

### Tasks 00–03 — the story's own suites (`@executable`)

- **`node scripts/test.mjs --only` over every test file in `files:`, plus
  `test/command/application-assembly.test.mjs` and `test/bundle/core-workspace.test.mjs`**
  (`AOF_GLOBAL_HOME` isolated, 2026-10-05). 298 cases, 0 failures, exit 0. The live payload stayed
  at `0366a4fa.20261002T103106` afterwards.
  `verifies → tasks/00_a-manual-continue-hands-the-operator-a-guide.feature`,
  `tasks/01_manual-is-one-story-here-at-every-door.feature`,
  `tasks/02_aof-review-reviews-the-operators-build.feature`,
  `tasks/03_aof-code-review-is-removed.feature`
- **Importer sweep.** Every importer of the two changed source files
  (`packages/work/src/commands/continue.mjs`, `packages/knowledge/src/memory/graphify-backend.mjs`)
  was run: 21 array suites gave 180 cases with 0 failures, and `packages/work/test/reentry.test.mjs`
  (a `node:test` file) passed 3 of 3. Three controls outside 149's diff are red. They are logged as F-03.
- **Plan checks.** At the root, `aof work update --dry-run --json` reports `skip` for every continue,
  review, autonomous and assimilate-code render in all three runtimes.
  `git grep "code-review\|codeReview"` over `packages/core/assets`, `docs`, `README.md` and `.aof` prints
  no `aof:code-review` and no `codeReview`. The three remaining hits are the rename ledger, the generic
  `aof assets add skill code-review` example (PLAN.md Out of scope) and the phrase "code-review stance".

### Task 04 — a real manual story walks guide → review (`@manual`)

Run in the standing test-bed (`aof-test-repo`) against fixture story `07/00` (`double`). The fixture
was refined and red (no `aof-test-repo/src/double.mjs`, no test) and stood at `not-started`. The bundle was rendered
from this tree with `aof work update` (1 created, 4 updated, `code-review.md` deleted). Each command ran
in a fresh headless session: `claude -p` with `CLAUDE_*` stripped and stream-json captured. The tree
was already dirty, so `git status --porcelain -uall` and each entry's sha1 were snapshotted before and
after each command. The fixture was torn down afterwards, back to `not-started`.

- **R1 · `/aof:continue 07/00 --manual`.** The session made 6 Bash calls and no `Agent` call. It ran
  `aof work run-start` and `aof test --scope impacted --story 07/00` once, then closed the run `done`.
  The test-bed declares no `work.test`, so `aof test` refused (`test-runner-undeclared`). The guide said
  so and named `npm test` / `node --test test/double.test.mjs`. The guide printed every task 00 part,
  in order: the two scenarios still red, by name; the user story; the task file and its scenarios; the
  `reads:`/`files:` table with one line on why each entry matters; the test file and the gate command;
  "no PLAN.md"; and an order with its reason. It ended with `guided, 07/00 is yours to build … Next:
  aof:review 07/00`. Status delta: only `STORY.md` (`status: not-started → in-progress`) and the new
  run record, both inside the story folder. `aof work status 07/00` answered `in-progress`.
  `verifies → tasks/04_a-real-manual-story-walks-guide-review-verify.feature` (R1)
- **Operator build.** `aof-test-repo/src/double.mjs` and `test/double.test.mjs` were written by hand from the guide.
  `node --test test/double.test.mjs` passed 2 of 2.
- **R3 · `/aof:review 07/00`.** The session minted a run and ran the story's tests. It then ran the gate
  ladder: validate PASS, doctor with no admitted findings, the graph build and the blast-radius ranking.
  After that it spawned the architect and QA lenses, plus continue's craft pass. All lenses reported
  only: the architect and QA had no findings, and the craft pass found 2 Nits. With no Blocker it moved
  the story to `in-review`, closed the run `done` and named `aof:verify 07/00` next. The sha1 of both
  operator files was unchanged. The only change to `git diff` is the story's own
  `status: in-progress → in-review`, which is the scenario's next Then. `aof work status 07/00`
  answered `in-review`. Outside `git diff`, the graph build left 260 untracked `graphify-out/` files
  (F-01).
  `verifies → tasks/04_a-real-manual-story-walks-guide-review-verify.feature` (R3)

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | The `aof graph build .` that `aof:review`'s blast-radius step runs left `graphify-out/` (260 files) untracked in the test-bed. `ensureGraphifyOutGitignore` is called only by the memory backend, never by the codebase graph build. `aof:refine` reaches the same gap. | defect | low | non-blocker → backlog. It predates 149 and is not in its write set. Review fixed nothing. | operator | open |
| F-02 | The manual continue closed its run before printing the guide. The session reported the slip itself. E3 says the run is closed after the guide is printed. Nothing was lost: the run closed `done` and the guide printed in full. | defect | low | non-blocker → backlog (prompt adherence) | operator | open |
| F-03 | The importer sweep is red on three controls outside 149's diff. FF-11904 / 138/00: `test/bundle/` holds 24 against a ceiling of 23, from m150's `explain-command.test.mjs` at HEAD. FF-7106: m148/02 and m148/04 declare bundle members without `manifest.json`. FF-9603: m148/01's `PLAN.md` restates declared paths. All three were re-run red on 2026-10-05. | defect | medium | non-blocker for 149. It blocks the branch's PR gate. | m150 (FF-11904), m148 (FF-7106, FF-9603) | open |

## Accept decision

**ACCEPTED** — 2026-10-05. The story's own suites (298 cases) and the importer sweep over its changed
source are green. The plan's render and residue checks hold. Task 04's `@manual` walk passed both
rules in a real session in the test-bed. There are no `@uat` scenarios. Validate passed and no blocker
finding is open. F-03 must be cleared by m150 and m148 before this branch's PR gate goes green.
