---
doc: state
---
# 201 · Recall hands an agent what applies — State

## Progress

- 2026-10-28 — Framed by aof:shatter from wiki/planning/PRD-memory-engine.md (addendum for spike 177); unnumbered and not started. To be broken down after promotion.
- 2026-11-17 — Promoted to 201 (appended) and refined with `--all`, solo. ARCHITECTURE written (ADR-001 to ADR-008, FF-20101 to FF-20106). Four stories broken down and all four contracts authored (17 task features). Story 03's was authored once the operator answered its Q1. Nothing is built.
- 2026-11-17 — `aof:continue 201/00-01`, solo. **201/00 built and reviewed** (run `20261117T141123887Z-0001`, attempt 1): the contract leaf `recall-pick.mjs`, the picked-block branch on the seam's one core path, the picker and the stderr line through the routed door, FF-20101 and FF-20102. All four task features green. No picker is wired yet, so the shipped block is the lexical top 5 with promoted lessons dropped (`pick-unwired`).
- 2026-11-17 — **201/01 built and reviewed** (run `20261117T155102253Z-0000`, attempt 1): the one-shot leaf `model-ask.mjs` and its stand-in, the picker composed in core's memory binding, `memory.recall.pick` in the one reader and the schema, the `recall:` line in `aof memory status`, the `memory:` line in `aof project show`, FF-20103 to FF-20105, the runtime-audit entries, and the docs. The four `@executable` task features are green. Task 04 is `@manual` and is `aof:verify`'s. **The span 201/00-01 is at the Review gate; 201/02 and 201/03 were not looked at.**
- 2026-11-17 — `aof:continue 201`, solo (milestone run `20261117T220302606Z-0002`). **201/02 built and reviewed** (run `20261117T220327721Z-0000`, attempt 1): refine's PO recall asks by the item's title with no filter, the retrospective records both of its recalls in a new step 6, the Codex variant carries the same words, and the three renders, the manifest and the lock follow. FF-20106 is in the edge control, whose roster is now eight. Tasks 00 to 02 are green. Task 03 is `@manual` and is `aof:verify`'s.
- 2026-11-18 — **201/03 built and reviewed** (run `20261117T233329348Z-0000`, attempt 1): `scripts/memory-recall-replay.mjs` replays a seeded sample of the recorded block recalls through the memory command, once with the pick off and once as shipped, has an opus judge grade every record either block showed without saying which block showed it, and writes one report with 177's columns and a direction line. Tasks 00 to 02 are green (33 cases). Task 03 is `@manual` and is `aof:verify`'s. **Every story of 201 is now at the Review gate.**

## Notes & decisions in flight

### Corrections to the SPEC, found at refine

- The SPEC says the retire-promoted filter "keeps working". No recall path filters on a lesson's
  promotion today: 153 indexes the field, and 177 measured the filter in throwaway code. Story 00
  builds it (ADR-005). The SPEC carries a dated note.
- 157/ADR-004 said the retrospective's evidence recall is not a ledger edge, and 124/FF-12405
  holds the prompt to that. The SPEC reverses it, so ADR-006 §3 supersedes that one sentence and
  story 02 replaces the control's case.

### Default decisions taken (technical; each is in an ADR and a story's map)

- The pick is a separate model call made by the recall command, not the recalling agent choosing
  from 20 cards (ADR-001). This was the decision the SPEC left to refine.
- The model is `claude` at `haiku`, one lean call per recall, with a 20 s limit (ADR-004). Measured
  today: 8 s of wall time, 856 input tokens, no transcript left behind.
- **A Codex or opencode session's recall still asks `claude`** when it resolves. That is a second
  provider for such a session. `memory.recall.pick.enabled: false` turns it off, and `aof project
  show` names what is sent (ADR-004 §7). Flagged for the operator's review.
- The pick is on when no key is set, so an existing project has nothing to adopt. It sees a new
  `recall:` line in `aof memory status`, and a stderr line at each recall on a node where `claude`
  cannot answer (ADR-004 §6).
- The ledger row keeps 153's shape. No field says whether a block was picked or degraded (ADR-006
  §1, alternatives).
- A lesson promoted to a control, a rule or a prompt is dropped, not only one promoted to a
  control, which is the SPEC's literal word (ADR-005, from 177's candidate 4).
- `--limit` on a block sets the cap; the shortlist is 20, or the cap when larger. `--all` is never
  picked (ADR-002 §5).
- The retrospective's edges are `retrospective-domain` and `retrospective-evidence`, actor
  `product-owner` (ADR-006 §3).
- No ADR is diagrammed. The one flow with moving parts (ADR-002) is a five-step list.
- No security or compliance specialist ran. The pick has no tools, and its answer is card numbers
  checked against the shortlist (ADR-004, consequences).

### Business questions asked, and their answers

- **201/03 Q1** — how a replayed block is graded. Asked 2026-11-17. **Answer: a model judge, over
  a seeded sample** (default 40 recalls). An opus judge grades each record either block showed,
  0/1/2, as 177 did. The direction holds when the shipped block shows less noise per recall and no
  fewer decision-changing records. Written into story 03's map, and its contract was authored in
  the same stop.

No other business question was raised. Every other question in the four maps is technical and
takes the default its ADR records.

### Recalls recorded on this item

- `refine-architect` `75d35e79-fc52-4601-8975-9daa98d7a3c9`: 5 records, 3 honoured.
- `refine-po` `3cb2d413-fcfc-4afa-afec-8b4bde519c1c` (`--item 201`): empty.
- `refine-po` `d51f97fd-e46f-4c27-8a9c-e184a1041509` (the same words, no item filter): 5 records,
  3 honoured. Taken because the prescribed recall was empty, which is the defect story 02 fixes.

### Refine run

- The first run of this phase was minted with no session id and cancelled. The run was re-minted
  with `--session`, so it is attributable.
- Graph: `aof graph build .` built `2026-11-17T12:49:52Z`, code only, no egress, 22,084 nodes.
  Boundaries were drawn against `aof graph impact` (ADR-008).

### 201/00 build (2026-11-17)

- **Tests ran by file, not by `--scope impacted`.** `aof test --scope impacted --story 201/00` widened
  to all 1,295 suites: the story declares `packages/knowledge/package.json`, which has no registered
  dependent. The full suite is ruled out on this machine. Evidence instead: 188 suites (every suite
  that touches the memory seam, plus the source-sweeping arch controls), then 76 after the fixes it
  found, then 19 on the final tree (test record `20261117T154904827Z-36bb6bad53aa-22074`). Every
  case named 201/00 passes. **The milestone regression gate is still owed.**
- **Reds in those runs that are not this story's**, each on a file 201/00 did not change: FF-11904
  (`test/loop` holds 66 against a ceiling of 64; `packages/foundation/src` holds 9 under an
  exemption for 8; both in the committed tree), the silent-catch baseline
  (`packages/foundation/src/fs.mjs`), FF-6905's extension (`session-driver.mjs`), the two
  codebase-grounding controls (`config-inspect.mjs`, the dispatch modules), three
  `yarn-installation` production cases and the `reindex --json` golden (macOS `/var` →
  `/private/var`; the golden passes with `TMPDIR` resolved), and one `spawnSync` timeout under load.
  None was verified on a clean checkout of HEAD.
- **Recall recorded on 201/00**: `continue-developer` `924e5651-6ad3-457a-8bf6-259d69f18390`, 5
  records, 5 honoured. It ran before any code.
- **Gate ladder**: `aof work validate 201/00` passes; `aof work doctor 201/00` exits 0 with warnings
  only. **Review** (architect, QA, craft; solo, one round): no Blocker.
- **The picker's contract, for 201/01**: `pickRecords(request, { config, ctx })` resolves to
  `{ answer, model? }` (raw text, read by the leaf) or `{ code, model? }` (a `PICK_MISS` code). The
  leaf also holds the instruction and the request's text render, because FF-20101 keeps the
  request's spelling there and 201/01 does not write the leaf.

### 201/01 build (2026-11-17)

- **The launch is not ADR-004 §2's.** Two delivered controls leave no system-prompt flag for it:
  70/FF-7004 forbids `--system-prompt` anywhere in source, and 70/FF-7005 forbids
  `--append-system-prompt` outside the loop's launch seam. So the instruction goes in on stdin,
  ahead of the request, and the launch carries neither flag. The child is also started with
  `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`: without it a real `claude` created an empty
  `~/.claude/projects/<temp dir>/memory` directory for every pick. Measured on this node
  (2.1.326, `haiku`, one two-card request):

  | launch | tokens read | cost | left a project directory |
  |---|---|---|---|
  | `--system-prompt` (ADR-004's) | 721 | $0.00023 | no |
  | `--append-system-prompt` | 3,861 | $0.00075 | yes, one per pick |
  | instruction on stdin, auto-memory off (as built) | 3,301 | $0.00054 | no |

  ADR-004 §2 needs amending to the launch as built, or FF-7004 needs an exemption for this
  one-shot call. That is the operator's to choose.
- **Real `claude`, through the CLI, on this project's index**:
  `aof memory recall 'worktree node_modules junction' --kind near-miss --block` picked 4 of the 5
  lexical records in 6 s, exit 0, empty stderr, and `~/.claude/projects` held no new directory.
  That is task 04's first scenario, observed once and not signed off. Its second scenario (the
  daemons' environment) was not run. The daemons run the payload, so they need
  `install-local` and a restart to get the pick; the typed `aof` is the checkout and has it now.
- **Tests ran by file** (the impacted run widens to the whole suite here, as for 201/00): 196
  suites, 1,857 cases (test record `20261117T175943895Z-14252d2bf9b5-5900`). All 119 cases named
  201 pass. The 20 that do not are none of this span's code, and were checked:
  - red on a clean copy of HEAD `7aa0ee11` too: FF-6905's extension, the silent-catch baseline,
    both codebase-grounding controls, FF-11904 (six cases) and 138/00's dependant, the
    workspace-boundary "planted edges" case, and FF-16004;
  - the macOS `/var` → `/private/var` difference: two `distribution-workspaces` cases, three
    `yarn-installation` cases and the `reindex --json` golden;
  - FF-9603, on 201/02's `PLAN.md`.
- **FF-16004 owes a row change.** `aof work find 160` evaluates 760 modules at HEAD against a
  ceiling of 759, and 201/00's contract leaf makes it 761. The launcher is loaded only when a pick
  is made, so 201/01 adds none. The row was left alone: it must equal the measured count, and one
  of the two modules over is not this span's to name.
- **Recall recorded on 201/01**: `continue-developer` `adb908e5-2735-4050-b104-a9c90793c3dd`, 5
  records, 4 honoured and 1 irrelevant. It ran before any code.
- **Gate ladder**: `aof work validate 201/01` passes; `aof work doctor 201/01` exits 0 with
  warnings only. **Review** (architect, QA, craft; solo, one round): no Blocker.

### 201/02 build (2026-11-17)

- **Tests ran by file** (the impacted run plans all 1,298 suites: 17 of the story's files are
  `not-in-graph` or have no registered dependent). 142 suites that read the edited prompts, the
  renders, the manifest, the lock or the memory page: 2,894 cases (test record
  `20261117T232402863Z-260ee1f54850-51220`). Every case named 201 passes. Then the edge control and
  nine neighbours after two repairs (record `20261117T232712246Z-465b35e4bc6e-26479`), and the
  recall-ledger feature by file: 26 scenarios, all green. **The milestone regression gate is
  still owed.**
- **The 16 cases that failed are none of this story's.** Checked on a clean copy of HEAD
  `2a732182`, where these are red too: the bundle descriptor and loader counts (92 against 94,
  four cases), `156 — retained … lane` (two), FF-7106 on 198/02, both codebase-grounding
  controls, FF-5810 on `runs.mjs`, FF-6608, `grade/02` on `repair.md`, FF-5307, and
  `archive-is-a-move` (macOS `/var`). One is green at HEAD and red here:
  `autonomous-shell-out/black-box`, which reads the loop's output. This story touches no loop
  module; another session's uncommitted `packages/work-loop` edits are in the checkout.
- **Two reds were this milestone's and are fixed.** FF-7106 named 201/02 (see Feedback). FF-5810
  named the `retrospective-memory-ingest` loop record: 201/00 added an import line to the memory
  seam, so `createMemory` moved from line 12 to 13. The citation and its render were corrected.
- **Re-rendering left this repository's config alone.** `.aof/aof.config.json` was compared with
  a snapshot after each of the five `aof work update` runs and was byte-identical (180/02 R1).
- **Task 03 (E9) was checked once, unsigned**: `git diff HEAD` shows no difference in the
  continue, verify and shatter commands, in their sections of the Codex variant, or in their nine
  renders. The Codex variant's hunks all fall in the refine and retrospective sections.
- **Recall recorded on 201/02**: `continue-developer` `d2d501d4-b03d-4203-800d-712be006d768`, 5
  records, 4 honoured and 1 irrelevant. It ran before any code.
- **Gate ladder**: `aof work validate 201/02` passes; `aof work doctor 201/02` exits 0 with
  warnings only. **Review** (architect, QA, craft; solo, one round): no Blocker.

### 201/03 build (2026-11-17 to 2026-11-18)

- **What the replay compares.** The lexical block is the memory command asked with
  `memory.recall.pick.enabled` set to false in the loaded config, so it is the shortlist's first five
  with promoted lessons dropped (ADR-003 §1). It is not the pre-201 block, which kept promoted
  lessons. The shipped block is the same command with the config as loaded. A degraded recall is the
  one the door would announce (`pickAnnouncement`), read from the result's `pick`, never from stderr.
- **The judge** is asked once per recall, through 201/01's `askModel`, at its own model (default
  `opus`) and its own time limit (default 120 s, since 177 measured opus at p95 23.7 s). It sees a
  pooled, seed-shuffled set of cards built with the pick's own card shape, a one-line rubric for the
  edge, and no word of which block showed what. An answer grades only when every card has 0, 1 or 2.
- **Exit codes**: 0 holds, 1 does not hold, 2 unreadable (nothing replayed, all degraded, or nothing
  graded), 3 refused before anything ran (bad arguments, the pick turned off, judge = pick model).
- **Tests ran by file.** `test/memory/recall-replay.test.mjs`: 33 cases, all green, over a scratch
  project of 60 recorded recalls across four edges, against a stand-in written into the scratch
  directory that answers picks and judge requests per scenario. Then 182 suites by file: the replay
  suite, the pick's controls and every control that sweeps source or `scripts/` (test record
  `20261118T001304360Z-25f66dc1a399-86825`): 1,165 cases. No failure names this story's files. The 25
  failures are the reds already recorded on a clean HEAD (FF-6905's extension, the silent-catch
  baseline, FF-7106 on 198/02, FF-16004, both codebase-grounding controls, FF-5810 on `runs.mjs`,
  FF-11904 on `test/loop` and `packages/foundation/src`, the workspace-boundary planted-edges case,
  the macOS `/var` cases), plus three that name another session's uncommitted loop work in
  `packages/work-loop` (an unaudited `execFileAsync` in `loop.mjs`, and the kernel-import allow-list
  for `ask.mjs`, `stop.mjs` and `wave.mjs`), and `release-fingerprint-pin` ×3, which waited on a gpg
  lock another process held. **The milestone regression gate is still owed.**
- **A real replay ran once**, as PLAN's verification step: `--sample 5 --seed 177` on this
  project, 5 picks and 5 judge calls in 91 s, `direction: holds` (noise 0.80 → 0.20 per recall,
  decision-changing 2.20 → 2.40), no recall degraded or ungraded. The ledgers' and the index's
  hashes, and the count of `~/.claude/projects` directories, were the same after it. This is not
  task 03: five recalls are not the forty the `@manual` scenario asks for, and nobody has signed it.
- **Recall recorded on 201/03**: `continue-developer` `de4c5555-4352-4a37-9794-896a11cdd9cc`, 5
  records, 4 honoured and 1 irrelevant. It ran before any code.
- **Gate ladder**: `aof work validate 201/03` passes; `aof work doctor 201/03` exits 0 with
  warnings only. **Review** (architect, QA, craft; solo, one round): no Blocker.

## Feedback (for retro)

- **201/00 task 00, scenario E6: the When does not produce the Then.** It runs a bare query miss
  (`'no record says this'`) and expects an empty shortlist. The local ranker ranks every survivor on
  a bare miss (178/01 E3 pins that), so 20 records are shortlisted and the picker is asked. The rule
  and EXAMPLES E6 say "no record in scope", which is what the test runs (`--kind no-such-kind`, and
  an empty index); the bare miss is pinned beside it as what it is. The feature was not edited. It
  needs its When amended.
- **201/00's `files:` is one short.** ADR-005 §1 has the leaf import `@aof/work/memory-vocabulary`,
  and the kernel-import allow-list for that lives in `test/bundle/yarn-installation.test.mjs`, which
  the story does not declare. The row was added there.
- **FF-9603 is red on 201/02's `PLAN.md`** (line 52 restates `wiki/memory.md`). 201/01's had the same
  defect at line 56 and was reworded. 201/02 is outside the span and was left alone; 201/03's was
  not checked, because the control stops at the first plan that fails.
- **201/01 collides with 70/FF-7004.** ADR-004's measured launch passes `--system-prompt`, and
  FF-7004 forbids that literal anywhere in source. No 201 feature or fitness function requires the
  replacement form.
- **Routed at 201/00's review close.** Fixed: the door's default stderr sink had no test; the
  shortlist had no default cap; an empty backend text was not guarded. Recorded: on a picked,
  non-empty block the graphify backend's "graph signal unavailable" line is no longer in the
  result's `text` (the non-enumerable `graphSignal` is carried, and a block never prints `text`).
- **201/01's `files:` is three short.** `test/bundle/yarn-installation.test.mjs` (the kernel-import
  allow-list row for `model-ask.mjs`), `project-show.mjs` (`aof project show`'s text render had no
  memory section, and task 03 asks for one there), and `acd-recall-pick-single-home.test.mjs`
  (201/00's control read 201/01's refusal code `invalid-memory-recall-pick` as an import of the
  leaf). `config-inspect.mjs`, which the story does declare, needed no change.
- **201/01 task 00, "a recall that needs no pick starts no process", has 201/00 E6's defect**: its
  second When is a bare query miss, which shortlists 20 records and starts the process. The test
  runs a recall with no record in scope. The feature was not edited.
- **201/01 task 01 E5's "returns within 5 seconds" is measured net of the CLI's own start.** The
  literal bound read 6 s on this machine while another project's jobs held its load average in the
  hundreds. The test takes the same command with no pick as its baseline.
- **Routed at 201/01's review close.** Fixed: a missing time limit was an instant timeout, and is
  now refused; three 180/01 expectations in `config-inspect.test.mjs` moved with the new line and
  path. Recorded: the binding's executable resolution (the stand-in variable, the shell-shim
  refusal) repeats `board-ui.mjs`'s, which this story could not edit; on Windows the temp
  directory may still be held when a timed-out child is being ended, and that is reported as a
  degrade, not retried.
- **The pick is live for every session on this machine** as soon as it is built, because the typed
  `aof` is linked to this checkout. Before the auto-memory fix, two real picks (one of them another
  session's) each left an empty directory under `~/.claude/projects`; both were removed.
- **A second session was working in this checkout** (199's verify) throughout the build. Both edit
  `config-inspect.mjs` and `scripts/workspace-runtime-audit.json`, which 201/01 also writes.
- **201/02's `files:` was three short.** FF-7106 asks an open story that declares a bundle member
  to declare every tracked render of it. Missing were the two Codex `agents/openai.yaml` files and
  `.codex/aof/workflows/workflow-contract.md`. None of the three changes in this story. They were
  added to the declaration so the control stops naming the story. This is 127/01 R3 again.
- **201/02's `PLAN.md` tripped FF-9603** with a bullet headed by a path. The bullet was reworded.
- **201/02 task 00, "a title recall finds records": the test's index holds a fourth record.** The
  scenario's index holds three records that share words with the title. With only those three, an
  unscoped recall returns all three whatever the query is, so the test would pass on any query.
  The test adds one record that shares no word, and asserts the three come first and outrank it.
  The lexical recall does return the fourth, last. The feature was not edited.
- **201/02 adds one driven scenario the contract does not have**: a retrospective with memory off
  submits both observations with `"records": []`, and the ledger takes them (E6, driven).
- **The Codex skill summary for the retrospective gained a clause.** The story's Notes say the
  variant "needs the same two edits by hand". The short `SKILL.md` text also said "recall … and
  ingest", so it now says the two recalls are recorded.
- **Routed at 201/02's review close.** Recorded: the `retrospective-memory-ingest` loop record
  cites prose by line number (`retrospective.md:28-37`, `:38-40`, `:44`, and four lines of the
  memory seam). They were already stale at HEAD, this story moved the retrospective's lines
  again, and FF-5810 checks only that a cited line is in range. Recorded: the edge control reads
  the seam's flag list in three places; the new helper was not folded into the two older legs.
- **201/03's `files:` was two short.** `test/arch/testing/acd-source-directory-budget.test.mjs`
  (the `test/memory` row, 12 → 13, for the new suite) and core's memory binding, whose comment said
  nothing but it reads `AOF_RECALL_PICK_EXECUTABLE`; the replay's judge reads it too, so one
  stand-in answers both calls in the suite. Both were added to the declaration.
  `scripts/workspace-runtime-audit.json`, which the story declares, needed no change: the script
  starts no process of its own, only through `askModel`.
- **201/03 task 00, "the lexical block is the 5 best-ranked records in scope", is true of the
  fixture and loose in general.** The replay's lexical block drops promoted lessons, and a
  `recall --all --json` ranking does not. The fixture has no promoted lesson, so the two agree there.
  The feature was not edited.
- **Routed at 201/03's review close.** Fixed: the binding's comment on the stand-in seam (above).
  Recorded: the script is a caller of `askModel` and an importer of the recall-pick leaf
  (`buildPickRequest`, `pickAnnouncement`) that FF-20101's importer list and FF-20103's caller list
  do not see, because both sweep runtime source and not `scripts/`; the reuse is deliberate (one card
  shape, one definition of an announced miss), and the lists say less than they appear to.
  Recorded: the script repeats the binding's executable resolution (the stand-in variable, the
  shell-shim refusal), the third copy after `board-ui.mjs`. Recorded: two runs in one second with one
  seed write one report path. Recorded: `wiki/memory.md` does not mention the replay; the script's
  header is its only documentation.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
