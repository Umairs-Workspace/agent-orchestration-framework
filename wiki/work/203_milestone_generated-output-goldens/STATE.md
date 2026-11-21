---
doc: state
---
# 203 · Every file aof generates is held to a committed baseline, and any drift shows as a reviewable diff — State

## Progress

- 2026-11-20 — Refined with `--all`, solo (run `20261120T182303148Z-0000`). ARCHITECTURE written
  (ADR-001 to ADR-007, FF-20301 to FF-20303, all `pending`). Three stories broken down, and all
  three contracts authored (13 task features: 11 `@executable`, 2 `@manual`). Each story has an
  example map and a build plan. Nothing is built.
- 2026-11-21 — `aof:continue 203`, solo (milestone run `20261121T160300065Z-0001`). 203/00, 01 and 02
  built and reviewed, all `in-review`. Owed at `aof:verify`: the milestone regression gate, the
  Windows run (02 task 03), the contract amendment (items 1 and 4 below) and sign-off of the
  `@manual` evidence (01 task 04).
- 2026-11-21 — `aof:verify 203`. The contract amendment (items 1 and 4) was ratified and the step
  definitions tightened to match. 01 task 04 was signed off. 203/00 and 203/01 were accepted, each
  with an `OUTCOME.md` and a `RETROSPECTIVE.md`. Items 2 and 4 and the `init` overwrite are logged
  as F-01 to F-03, all non-blockers deferred to the backlog. **Still owed before 203 is accepted:**
  02 task 03 on Windows (then accept 203/02), a commit, and `aof work regression-gate 203` on it
  (VERIFICATION, Accept decision).

## Notes & decisions in flight

### For the operator: first-time `init` overwrites a user's file at an aof path

Measured at refine: over a project that already holds `.claude/agents/aof-architect.md` written by
the user, `aof work init` replaces it with aof's architect, reports it as `update`, and gives no
drift warning. `update` does warn on an edit to a file aof installed. `init` does not on a file
aof never installed. The `customised` baseline (story 01, E14) holds today's behaviour, so any
change to it will show. Whether `init` should refuse or warn here is a product decision outside
this milestone's scope. It would make a reasonable backlog item.

### Default decisions taken (technical; each is in an ADR and a story's map)

- Verbs run as child processes through `spawnCliSync`, not in-process (ADR-001).
- Six normaliser rules, closed: `eol`, `temp-paths`, `instants`, `hashes`, `version`, `build-id`.
  Path separators change only inside matched temp paths and tree keys. Ordering instability is
  fixed at its source and never given a rule (ADR-002).
- A baseline is a delta from a named base, so a shared edit shows once in a PR. Every file ends
  `.golden`, under `test/golden/baselines/`, pinned `text eol=lf` (ADR-003).
- Failures print the first 20 diffs and a count of the rest. The diff is an in-repo line LCS, with
  no new package. Only `scripts/golden.mjs --update` writes, and no environment variable does
  (ADR-004).
- Eight init scenarios, not the 24-way cross product. This rests on the measured union property:
  the three single-runtime inits together hold exactly the three-runtime tree (ADR-005).
- `all-practices` turns on every practice key that exists. Learning has no key and is in every
  render. A dated correction is in the SPEC.
- Idempotence is a property of every init scenario, not a baseline. "The previous baseline" is the
  committed one, rebuilt into a real tree with real hashes (ADR-006).
- Three stories, chained 00 → 01 → 02. 02 reads 01's lane and baselines, and both register a lane
  in the same module (ADR-007).
- No ADR is diagrammed. The one flow with moving parts, the rebuild, is a three-step list.
- No security or compliance specialist ran. The harness touches only temp directories and its own
  baseline root.

### Business questions asked, and their answers

None was raised. The discovery beat ran for all three stories. Every open question in the three
maps is technical and takes the default its ADR records. One question was struck before asking
(story 01's map): whether this milestone should change the overwrite above. The SPEC answers it,
because this milestone holds what aof generates and does not change the verbs.

### Recalls recorded on this item

- `refine-architect` `22675a29-f830-4041-8813-8ea19ba32ecd`: 4 records, 3 honoured (01/R2, 01/ADR-002, 01/ADR-003).
- `refine-po` `015155dc-e15d-4397-9947-b737c8f6ff1e` (the item's title, no filter): 5 records, 2 honoured (192/02 R1, 57 F-57-M-2).

### Refine run

- Graph: `aof graph build .` timed out after 600 s (`graphify-timeout`). No graph was used, and the
  boundaries were drawn from the source (ARCHITECTURE "Measured facts"). No story writes a runtime
  module, so the coupling the graph would report is the CLI's argv.

### 203/00 build (2026-11-21, solo, run `20261121T160428419Z-0000`; milestone run `20261121T160300065Z-0001`)

- Built: the six harness modules under `test/support/golden/`, `scripts/golden.mjs`, the fixture
  verb, `golden-harness.test.mjs` (52 cases, one per scenario and outline row of the four task
  features), FF-20301/02/03 (10 cases), the `test/golden/baselines/**` LF pin, the suite's one
  import in `scripts/test.mjs`, and the budget rows (`test/golden` 2, `test/support/golden` 6,
  `test/golden/fixtures` exempt at 1, `test/arch/testing` 12 → 15).
- Tests ran BY FILE, not `aof test --scope impacted`: on this MacBook the impacted scope widens to
  the full suite (no code graph), which binds `:4182`. Story suites: 62 cases, 0 failures. Sweeps over
  `test/` and `scripts/` (every other `test/arch/testing` control, `acd-no-internal-project-names`,
  `acd-run-records-name-no-machine`, `acd-bundle-install-eol-pinned`, `repo-test-isolation-guard`):
  80 cases, 0 failures. `acd-test-suite-registration`: 7, 0 failures. **The milestone regression
  gate is still owed.**
- Red, and red at HEAD too (checked on a `git archive HEAD` copy, not assumed): FF-11904
  (`acd-source-directory-budget`) on `test/loop` 66 > 64 and `packages/foundation/src` 9 > 8. None of
  this story's rows is named. Also red at HEAD: `core-workspace` ×4 (two `/private/var` path cases;
  `workspace-boundaries` on an unaudited `execFileAsync` in `packages/work-loop/src/commands/loop.mjs`;
  the planted-edges case).
- Decisions in the build: a fixture step reads its instructions from a spec FILE, so a test changes
  what the verb writes without changing the step's argv (and so its `steps.golden`).
  `--lane-module` is repeatable, so "every lane vs one lane" has two lanes to tell apart. The
  computed `import()` for a lane module lives in `lanes.mjs`, so `scripts/golden.mjs` owes no
  runtime-audit entry. A captured entry that is neither a file nor a directory (a symlink) FAILS by
  name rather than being left out of the tree.
- Recall `899ac3bd-ba79-4a50-9c7d-cebe93f40d65` (`continue-developer`, near-miss): 5 records, 3
  honoured (178/R1, 178/03/R2, 129/04/R1: run by file, diff every red against HEAD, a story-green
  is not a tree-green), 2 irrelevant.

### 203/01 build (2026-11-21, solo, run `20261121T162141377Z-0000`)

- Built: `test/golden/work-init.lane.mjs` (ADR-005's eight scenarios, as data in the ADR's order),
  its registration in `lanes.mjs`, `work-init.test.mjs` (27 cases), and the committed baselines:
  295 `.golden` files, 2.7 MB. `default` is whole (238 project files). The others are deltas:
  `claude`, `codex` and `opencode` store their lock (plus the journal for `codex`) and list 141,
  100 and 162 removed paths. `all-practices` stores 20 files, `notion` 1, `hyperagent` 7 and
  `customised` 9. The global home is empty in every scenario. None of the baselines is git-ignored.
- The twice-run check (E15) passed on the first run, so no render needed a fix. Probe: limiting it
  to `eol` alone reds it on the lock's instants and the step records.
- Tests by file: the lane suite (27), the harness (52), FF-20301/02/03 (10) and registration (7), 96
  of 96. Sweeps that walk `test/` or tracked files (16 suites, 201 cases): one red, FF-7106 on
  milestone 198/02's `STORY.md`, which this work does not touch. `acd-source-directory-budget`:
  the same 7 HEAD reds as at 203/00, and none names a golden directory. **The milestone regression
  gate is still owed.**
- The @manual task 04 ran in a scratch worktree. Evidence is in `VERIFICATION.md` and the story's
  `evidence/`.
- Recall `4dc27ed0-66b9-4078-8990-0a1f92802559` (`continue-developer`, near-miss): 5 records, 4
  honoured, 1 irrelevant.

### For the operator: three things 203/01 found

1. **Contract amendment to ratify (203/01's own features, not yet delivered).** The example map
   did not count aof's own `.aof/` records, and three clauses are wrong by exactly them:
   - R1 outline: `removed.golden` "lists only paths under" the other runtimes' trees. Measured, it
     also lists `.aof/aof.apply-journal.json` for `claude` and `opencode` (the journal belongs to
     the Codex hooks merge), and the 17 `.aof/loops/*.md` records for `opencode` (bundle members
     declared `runtimes: ["claude", "codex"]`).
   - E5 ("18 changed files and its config") and E7 ("no file that default holds is stored
     changed"): both also store `.aof/aof.lock.json`, and `hyperagent` also stores
     `.aof/aof.apply-journal.json`. Install records list every member, so any profile that adds or
     re-gates a member changes them.
   I did not edit the features. The step definitions assert the measured truth through two named,
   closed lists in `work-init.test.mjs`: `RUNTIME_SCOPED_AOF_RECORDS`, where a case fails if an entry
   stops being needed, and `INSTALL_RECORDS`. Each is commented FLAGGED. The fix to ratify is to
   name these records in the R1 Examples table and in E5 and E7.
2. **A refine edit does not reach Codex.** Codex's refine skill renders from
   `packages/core/assets/variants/codex/workflow.md`, a hand-kept copy, so the E16 edit changed
   Claude and opencode and left Codex saying the old sentence. The golden lane now makes every
   such divergence visible in a PR. Whether the variant should follow `commands/*.md` is a product
   question. It would make a story.
3. Pre-existing, outside 203: FF-7106 is red on milestone 198/02's `STORY.md`.

### 203/02 build (2026-11-21, solo, run `20261121T164201483Z-0000`)

- Built: the rebuild (`rehash` and `rebuild` in `baseline-store.mjs`, with `fillPlaceholders` in
  `normalise.mjs`), `test/golden/work-update.lane.mjs` (`customised-update` and `upgrade`, both
  starting from a rebuilt `work-init` baseline), `work-update.test.mjs` (22 cases), and the baselines:
  7 files. `upgrade` stores only `steps.golden` and an empty `removed.golden`.
- The rebuild round-trips exactly. Rebuilt and re-normalised, `default` and `customised` equal their
  baselines. `aof work update` over either skips all 232 planned files, so every lock hash, journal
  hash and Codex hook-ownership hash is real. The upgrade's three mutations update to exactly 1
  created, 1 updated, 1 deleted and 230 skipped, and the tree ends on `default`, its lock order
  included. Probe: a corrupted file hash in `rehash` reds 9 of the 22 cases.
- Tests by file: the three golden suites, every `test/arch/testing` control and the 14 sweeps (390
  cases). Red: FF-11904 ×6 plus the 138/00 budget case (the HEAD reds on `test/loop` and
  `packages/foundation/src`; no golden directory is named), and FF-7106 (198/02, as before).
  FF-11906 was red on this work and is fixed: `test/golden/index.mjs` spread its suites on one line,
  and that control reads one spread per row. It had been red since 203/00, because 00's sweep
  excluded files matching `suite-registration`, and that pattern also excluded this control. Re-run:
  11 cases, 0 failures. **The milestone regression gate is still owed.**
- **Process lapse:** 203/02's run was minted and its near-miss recall run after the build, not
  before (`d078d5dc-ae22-4b01-918c-fdffcf36c1b0`, 4 honoured, 1 irrelevant, judged against a build
  already made). No recalled lesson would have changed it.
- Task 03 (Windows, `@manual`) is not run. It is owed on the Windows control node (VERIFICATION).

### For the operator: what 203/02 found

4. **A user's edit reorders their lock.** When `update` keeps a drift-warned file, the file's lock entry
   moves to the end of `work.files` (`createLockManifest` in `packages/core/src/lock.mjs` appends
   preserved entries after the planned ones). It is deterministic, so it is not instability, and the
   `customised-update` baseline holds it. But every user who edits one aof file gets a reorder hunk
   in their committed lock. A small story if you want it fixed. It also makes one clause wrong:
   "the stored delta is the user's two files and steps.golden" omits the lock. The step reads over
   member files through `INSTALL_RECORDS`, flagged as in 01, so it belongs in the same amendment as
   item 1.
5. The rebuild recomputes one Codex ownership kind, hook groups, by the merge's own rule: aof's
   groups are the last N of each event. Any other ownership kind (guidance, TOML entries or tables)
   is refused by name rather than guessed. No current baseline holds one.

## Feedback (for retro)

- 203/00 · declared set incomplete. `files:` omits `scripts/workspace-runtime-audit.json`: any edit
  to `scripts/test.mjs` changes its source digest, so its three `child-process` audit entries must
  be re-stamped in the same diff (done here, digest only, no new entry). `reads:` omitted
  `scripts/workspace-boundaries.mjs` and `scripts/test-harness.mjs`, both needed to learn that.
  Story 01 will hit the same thing if it touches `scripts/test.mjs` again.
- 203/00 · for story 01. `test/golden/baselines/` will be a layer of zero files (lane directories
  only), so `acd-source-directory-budget` will want an exemption for it in 01's diff. And
  ADR-001 §1 runs a step "`<verb…> --json`": the harness runs the lane's argv verbatim, so every
  init/update step must declare `--json` itself.
- 203/00 review (solo, round 1). Three confirmed findings, all fixed in the round: (1) the temp-root
  escape guard sat inside the `try`, so an escaped root would have been REMOVED rather than refused.
  It now runs before the `try`, as `bundleFixtureRoot` does. (2) A symlink in a captured tree was
  silently skipped. It now fails by name. (3) The E23 test was vacuous: `s` and `t` passed the final
  comparison whether or not they were re-derived. It now gives each its own `a.md` first, and a
  probe that drops the re-derive reds it. Recorded, not fixed (Nit): the line diff's LCS table is
  O(n·m) after peeling the common prefix and suffix, so rewriting a multi-thousand-line file
  wholesale could allocate around 100 MB.
- Every number in ARCHITECTURE was measured by running the real CLI in scratch directories, each
  with its own `AOF_GLOBAL_HOME`, on `4cac6cd8`.

- 203/01 · declared set incomplete. Registering a lane in `lanes.mjs` makes every bare
  `scripts/golden.mjs --update` run it, so 203/00's self-test went from 21 s to 115 s by running all
  eight inits per case. Fixed at 01's review close by scoping those calls with `--lane fixture`
  (only the "every lane" case stays unscoped). That edits `test/golden/golden-harness.test.mjs`,
  which 01's `files:` does not list. 01's `files:` also omits the new
  `test/golden/baselines` budget exemption, which went into the declared budget file.
- 203/01 review (solo, round 1). No Blocker. One Important was fixed at the close: the self-test
  coupling above. One contract amendment (item 1 above) and one product observation (item 2) are
  handed to the operator. E10 reads "denies, each marked aofManaged": hooks carry the marker, but a
  deny is a plain string. The step asserts aof's denies are present (Nit, recorded).

- 203/02 · declared set incomplete. The rebuild needed two writes outside `files:`:
  `test/support/golden/harness.mjs` (a scenario's starting files may be a function of the run, so
  they can come from a rebuild made with the run's own paths) and `normalise.mjs`
  (`fillPlaceholders`). The PLAN's "the harness needs no new step kind" was right about steps, but
  not about the starting files. The fill went in `normalise.mjs` because FF-20301 keeps every
  rewrite of captured content there, and `split`/`join` in the store would only have dodged the
  control.
- 203/02 review (solo, round 1). No Blocker. One Important, fixed at the close: the upgrade's
  older-text mutation found its line by its words ("Deepen a work item:"), so a refine prose edit
  would have broken the upgrade lane with an error instead of showing a diff. It now takes the last
  non-empty line. Recorded (Nit): `fillPlaceholders` writes a raw path, which would need JSON escaping
  if a `<project>` ever appeared inside a JSON file on Windows. None does today.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
