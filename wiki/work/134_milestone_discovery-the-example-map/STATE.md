---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 134 · Discovery before formulation — State

## Progress

- [x] Refined 2026-09-23 (solo): RESEARCH.md (the anchor measured), ARCHITECTURE.md (ADR-001 to
  ADR-007, FF-13401 to FF-13404 pending, one diagram for ADR-003), five stories broken down.
- [ ] Story contracts: each story's `tasks/` at its own refine.
  - [x] 01 refined 2026-09-24 (orchestrated: PO inline, `aof-qa` Examples, `aof-developer`
    feasibility): one `@manual @docs` task, `reads:` widened to the 21 stories' records, `PLAN.md`.
  - [x] 02 refined 2026-09-24 (orchestrated: PO inline, `aof-qa` Examples, `aof-developer`
    feasibility): three `@executable` tasks (grammar, queries + token, config gate), `PLAN.md`.
    Rulings taken in the contract: question fields read by position and fail closed both ways
    (class → `business`, state → `open`); 13 frozen `MALFORMED_REASONS`; `EXAMPLES_DOC` is the one
    spelling of the file name; an unknown `work.examples` key is `examples-gate-unknown-key`.
    FF-13402 admits `src/declared-id.mjs` (the retrospective `## R<n>` heading) by name. The
    milestone `VERIFICATION.md` is in 02's `files:` for its red probe; 03 and 04 land controls
    too and do not declare it yet, so their refine owes the same entry.
  - [x] 03 refined 2026-09-24 (orchestrated: PO inline, `aof-developer` feasibility first,
    then `aof-qa` Examples): three `@executable` tasks (reader + FF-13401, stamp + collect,
    settle directory + FF-13404) and one operator-gated `@manual` (R6 at the source), `PLAN.md`.
    Rulings taken in the contract: the stamp rides `brief.answers` (FF-6908 freezes the sixteen
    top-level keys; `carriedBrief` drops it on retry); a read with no tokened answer writes
    nothing. Feasibility found a withheld-spend hazard: with a resolved default directory,
    `completeRun` would charge a resumed run with the whole transcript's cost. So
    `transitionRunComplete` takes `spendSettled`, the two driven settles (`src/loop/cycle.mjs`,
    `src/commands/drive.mjs`) pass it, and both joined 03's `files:`. FF-13404 is narrowed in
    the contract (the default applies only when a workspace is named). FF-5307's run-store pin
    re-pins in 03. The R6 probe runs on 134/03 itself, not on a throwaway story, because a story
    inserted under 134 would be picked up by a loop cascading it. `VERIFICATION.md` and
    `STATE.md` are in 03's `files:`.
  - [x] 04 refined 2026-09-24 (orchestrated: PO inline, `aof-qa` Examples, `aof-developer`
    feasibility): four `@executable` tasks (the lane, the probe + `examples` budget row, the
    continue door, FF-13403), `PLAN.md`. Rulings taken in the contract: the three error codes
    take the acceptance horizon (warn once `done`); codes are `EXAMPLE_LANE_CODES`, never
    `*_FINDING_CODES` (FF-12402); the door refuses on ANY error finding, malformed included,
    as `examples-question-open` with `detail.findings`, before the overlay read, and only for
    `continue`; `projectsDir` is a new `doctorWork`/`buildSnapshot` option, resolved by the doctor
    command. Two deltas ratified in the contract, not the ADR: ADR-005 names "four codes" and §4
    "either error code", but the lane has five codes, three of them errors; and `src/work` is
    45 → 46, because 137's `digest-template.mjs` took 44 → 45 at 130's gate.
    `VERIFICATION.md` is in 04's `files:`. 03's `PLAN.md` is red on FF-9603 (one path per plan);
    04's was fixed at feasibility.
  - [x] 05 refined 2026-09-24 (orchestrated: PO inline, `aof-qa` Examples, `aof-developer`
    feasibility): five `@executable @docs` tasks (refine's beat, the `--autonomous` stop, the two
    briefs, the template, the guide), `PLAN.md` (FF-9603 clean). Rulings taken in the contract:
    the `EXAMPLES.md` template carries NO frontmatter (F-73-G: the render's byte-zero marker would
    make it malformed), a deliberate departure from ADR-001 §2's sample; guidance and the
    `Not applicable:` line sit in one comment, the live lines are a full legal map, and the
    installed copy is at most 50 lines (sketched at 35). The Contract stop is by severity (a warn
    does not stop). Each token form is taught with one worked question that 02's `readMapToken`
    reads back. A refused `AskUserQuestion` counts as a deferral. The headline-Scenario sentence
    moves below the beat. The suite imports nothing from 04. Feasibility widened `files:` for
    FF-7106 (the story template directory's other two installed copies) and for the two
    `.aof/loops` copies stale since 130, which `aof work update` rewrites.

## Notes & decisions in flight

- **Framed 2026-09-23** by `aof:shatter` from
  `wiki/planning/research/RESEARCH-specification-by-example.md`, the first of three drivers
  (134 discovery → 135 formulation → 136 loop-driven questions). The operator chose the three-way cut.
- **No spike.** The one unknown that could gate this milestone is whether a person's answer can be
  anchored to a record the agent did not write. It is settled inside this milestone's own refine
  (researcher + ADR), not as a top-level driver.
- **What the ARCHITECTURE must settle, in order:** (1) where the map lives and its budget; (2) the
  provenance anchor (which harness-written record, and how it is read and checked); (3) who
  classifies business versus technical; (4) the doctor finding ids and severities; (5) the config
  key's shape and its off-path guarantee.
- **The anchor is real, and so is a trap next to it** (RESEARCH R1 to R5). The harness writes
  `toolUseResult.answers` keyed by the question (46 answered and 8 refused of 54 calls, 0 from a
  subagent). But the settle seam passes the repository root as the transcript directory, so a
  hand-run `run-complete` has never stamped spend. Story 03 fixes the seam for both, and owes a
  measured check at the source (near-miss R6).
- **The giver is the channel, not a named person.** The record says "the person at session X's
  harness". ADR-003 claims no more than that.
- **Doctor at refine close:** `verification-register-missing` (error) and four `control-unresolved`
  (warn, `pending`) until the stories land FF-13401 to FF-13404 and record their red probes in a
  VERIFICATION.md. This is expected; validate passes.
- **01's feasibility, measured at its refine (2026-09-24).** Git cannot count amendment rounds: no
  task `.feature` of 124/126/127/133 changed after first commit except the `f76c153` scrub; 124
  and 126 arrived squash-merged at the public-root cut. Rounds are read from the records, and 124
  and 126 are floors. `.git-archive` is local-only, so no R7 command may depend on it. `reads:`
  admits files only (validate reads each entry), so the stories' records are listed one by one.
  126/F-35 and 127/F-27 have shifted register cells; R7 classifies from the prose.
- **Open: the origin research is untracked.** `wiki/planning/research/RESEARCH-specification-by-example.md`
  is cited by 01's contract against the committed tree and must be committed with this milestone.
- **`ruled` rejected** (ADR-001 §3): an ADR is agent-written, so a business rule decided by one
  is the smuggled default this milestone exists to stop.

## 134/03 task 03 — the anchor measured at the source (operator procedure, pending)

The build lane (loop run `20260924T141559728Z-0001`, worktree `dispatch-134-03`) cannot run these:
every leg needs an interactive session no shell is driving, the answer leg needs a person, and no
`134/03` run may be `running`, which is true only once the build run has settled. **Precondition,
measured 2026-09-24:** bare `aof` on this machine is the npm link to the MAIN checkout
(`C:\Program Files\nodejs\node_modules\aof -> C:\Source\umair\aof`), so the 134/03 code reaches it
only when this lane is merged home. So: (0) merge the lane, then from the main checkout run
`node scripts/install-local.mjs --skip-ui` and check `aof --version` names the new payload build.
S is the id of your interactive session opened in the repository root: the name of the newest
`.jsonl` in `~/.claude/projects/C--Source-umair-aof`. Paste the commands' own output; never
paraphrase. Evidence lands in `VERIFICATION.md` under `134/03 task 03`.

**A. A hand-run settle stamps spend from this machine's transcript store.**
1. `aof work run-start 134/03 --session S --json` from the interactive session in the repository
   root. Check the envelope carries that `sessionId`.
2. `cd wiki` and run `aof work run-complete 134/03 --outcome done` from there (a subdirectory).
3. Print the run record: `node -e "const r=require('<run file>');console.log(r.sessionId, JSON.stringify(r.spend))"`.

- Then the `spend` of the run record on disk is not null, and its `turns` are more than 0 — paste:
  `______`
- And the run record's path and its `spend` — paste: `______`

**B. A person's answer to a tokened question is stamped with its session and entrypoint.**
1. `aof work run-start 134/03 --session S --json` from the interactive session.
2. In that session, have the agent ask ONE `AskUserQuestion` question whose text opens with
   `134/03 Q1 · ` and answer it in your own words through "Other".
3. In the same session, have it ask a second question with no token, and answer it.
4. `aof work run-complete 134/03 --outcome done` in that session.
5. From the repository root:
   `node --input-type=module -e "const { collectAnswers } = await import('./src/work-examples/answers.mjs'); console.log(JSON.stringify(await collectAnswers({ ref: '134/03', dir: 'wiki/work/134_milestone_discovery-the-example-map/stories/03_story_the-answer-is-read-from-the-harness' }), null, 2))"`

- Then the `brief.answers` of the run record on disk holds exactly one record, for `134/03 Q1` —
  paste: `______`
- And its `answer` is your own words, its `sessionId` is the run's `sessionId`, and its
  `entrypoint` is the session's entrypoint — paste: `______`
- And `collectAnswers` for `134/03`, called with no transcript directory, returns that record —
  paste: `______`

**C. A refused question leaves no record.**
1. `aof work run-start 134/03 --session S --json` from the interactive session (a second run).
2. In that session, refuse one `AskUserQuestion` call whose question opens with `134/03 Q2 · `.
3. `aof work run-complete 134/03 --outcome done` in that session.

- Then the `brief.answers` of the run record on disk holds no record for `134/03 Q2` — paste:
  `______`

Until these slots are filled, 134/03 stays `in-progress` (task 03's contract).

## Feedback (for retro)

- **134/03's finished build was reclaimed as `runtime_offline` and retried (2026-09-24).** Run
  `20260924T141559728Z-0001`'s session built tasks 00-02, reviewed them and handed back for the
  operator at 15:45 local, yet the run was reclaimed at 16:22 and re-minted as attempt 2/3
  (`…-0002`). That retry re-verified at the source (focused set 62 ok, validate and doctor clean)
  and changed nothing. An operator-gated hand-back costs a retry attempt, and the third one is
  the last.

- **134/03 review (solo, loop cycle, 2026-09-24): no Blocker.** Structural, behavioural and craft
  lenses taken in turn in this session, against the task features and ADR-003. One recorded Nit:
  a settle now reads the session's transcript tree twice, once for spend and once for answers;
  harmless at settle time, and a shared read would couple the two producers.
- **134/03's declared write set was incomplete.** FF-5810 checks that shipped loop records cite
  each export's own line, and two records cite `isStale` (run store) and `transitionRunReclaimed`
  (the transition seam) by line. `src/bundle/loops/{mesh-assignment-reclaim,run-resilience}.md`
  and their `.aof/loops/` copies were re-cited outside `files:`. Lane commits drop `.aof/`, so the
  installed copies need committing by hand (or `aof work update`). A story that edits the run store
  or the transition seam owes those records in `files:`.
- **The first arch sweep caught three reds the story's focused set could not** (FF-5810, FF-5504's
  "the run store never spells `transcript`", FF-5301's sink reach). All were fixed in the build.
  The focused `--only` set alone would have passed.

- **134/02 review (solo, loop cycle 2, 2026-09-24): no Blocker.** Two recorded Nits, both fail
  closed and loud rather than silent: a BOM-prefixed `EXAMPLES.md` does not read its frontmatter
  (`lines[0] === "---"`), so each frontmatter line reports `unknown-line`; and trailing whitespace
  after an example's provenance bracket reads `bad-provenance`.
- **`--scope impacted --story 134/02` ran the whole suite.** `scripts/test.mjs` is in `files:` (the
  two index registrations), so the impacted set widens to everything, concurrently with another
  lane's full run. Founding a test family should not cost a full suite; the focused
  `--only` set was the real check.
- **FF-9603 (2) is red on 03's `PLAN.md`** (`path-enumeration`, `scripts/install-local.mjs` @47).
  It predates this lane (it is in cycle 2's grade baseline) and is 03's to fix.
- **Loop cycle 3 re-dispatched `continue` on 134/02 while it was already `in-review`** (run
  `-0002` closed `done`). This worktree's own `aof work next 134 --through-review` does not offer
  it. Nothing was rebuilt: the story's files are unchanged 847efde..83b4d46, the focused suites
  are green, and validate and doctor are clean. A wasted session: the wave should skip `in-review`.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off: one real story through discovery, interactive

## Feedback (for retro)

- 134/01 gate red at rung 1 (aof work validate 134/01): STORY.md reads: names wiki/planning/research/RESEARCH-specification-by-example.md, which is untracked in the main checkout and absent from every branch, so a dispatch worktree cannot resolve it (05's reads: has the same entry). STATE's open item says it must be committed with this milestone; doing so is outside 01's one-document write set. The R7 section is written and its commands reproduce every number. — Raised by: developer   Refs: 134/01
- 134/01 contract Examples imprecise, flagged not changed: (1) the amendment-edge row '126/00 | the machine-name scrub f76c153 rewriting a task .feature' - f76c153 rewrote a reads: path in 126/00's STORY.md and a node name in 126/01's task 00 feature, not a 126/00 feature; (2) the row '126/01 | a QA point amended into ADR-001 §2' - STATE puts 126/01's QA point (the face's now) in ADR-003 §2; ADR-001 §2 and ADR-004 §2 took 126/02's point. Neither changes a call: none of these is a round. R7 states both facts. — Raised by: developer   Refs: 134/01
- 134/01 re-drive (run 20260924T153024112Z-0004, solo): the rung-1 red above cleared once `9dc2397` committed the origin research; validate and doctor both pass. The solo review walked all ten scenarios against R7 unchanged, re-ran every R7 command (each prints its stated number) and re-classified a random register sample with the same calls. Nit, recorded: R7's commands block leaves `$V` defined in prose and two git lines with a `<name>` placeholder, so a reader must substitute before running them. — Raised by: developer   Refs: 134/01
