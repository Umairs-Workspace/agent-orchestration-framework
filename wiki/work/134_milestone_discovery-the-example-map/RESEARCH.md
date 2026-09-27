---
doc: research
---
# 134 · Discovery before formulation — Research

The one blocking unknown (STATE, "No spike"): **can a person's answer be anchored to a record the
agent did not write?** SPEC's near-miss R6 (m62) says the ADR that names the reader owes a measured
check that the reader returns the answer and its giver. This document is that measurement, taken at
refine on 2026-09-23. Every count is a command over this machine's real transcript store,
`~/.claude/projects/<project-slug>/`. The same directory name comes from
`claudeProjectsDir` (`src/work/observe.mjs:65`).

## R1 · The harness writes the answer, keyed by the question, in a record the agent never writes

An `AskUserQuestion` call leaves two lines in the session's `.jsonl`:

- an `assistant` line with a `tool_use` block (`name: "AskUserQuestion"`, `id: "toolu_…"`,
  `input.questions[]`), which the agent composed;
- a `user` line with a `tool_result` block (`tool_use_id` = that id) **and a top-level
  `toolUseResult` object `{ questions, answers }`**, which the harness wrote.
  `answers` maps each question's full text to the answer string: an option label, or the person's
  own text when they chose "Other". The line also carries `sourceToolAssistantUUID` (the asking
  line), `timestamp`, `sessionId`, `userType: "external"` and `entrypoint`
  (`claude-vscode`, `cli`, …).

Sample (session `002c890f…`, 2026-09-06): the question "…How should I build it?" was answered in
free text, "No wortrees, in this branch please…", and the answer is in `toolUseResult.answers` under
the question's exact text.

## R2 · Census: every call has a result, and a refusal is distinguishable from an answer

Over all 88 top-level transcripts that contain the tool:

| Fact | Count |
|---|---|
| `AskUserQuestion` `tool_use` blocks | 54 |
| … with a matching `tool_result` | 54 |
| … answered (`toolUseResult.answers` present) | 46 |
| … refused (`is_error: true`, `toolUseResult: "User rejected tool use"`) | 8 |
| `toolUseResult` keys seen on an answered result | `questions`, `answers` (46/46) |
| calls on a sidechain (`isSidechain: true`) | 0 |
| calls in any `<session>/subagents/*.jsonl` | 0 |

**A subagent has never asked.** Subagent transcripts name the tool in their briefs and never call
it. So the discovery beat's asking happens in the main session in both modes. That is the session
the phase's run record names (below).

## R3 · The giver: the transcript names the channel, not the person

The answering line says a human answered through the harness (`userType: "external"`) at a named
entrypoint, in a named session, at a timestamp. **It does not name which person.** On a local
session there is one person at the harness, the operator, so "the person at session X's harness" is
the most the record supports. The ADR records exactly that and claims no more.

## R4 · The join from a story to a transcript already exists: the run record's `sessionId`

A refine phase mints its run first (`aof work run-start`), and the mint writes the live session id
onto the run record. This refine's own run, `20260923T164457365Z-0000`, carries
`sessionId: bbe58357-…`, `sessionSource: "live-store"`. So a story's (or its parent milestone's) run
records name every session that refined it. No new attribution vocabulary is needed.

## R5 · The settle seam that would stamp an answer does not reach the transcript store today

`completeRun` (`src/run-store.mjs:809`) already reads a session's transcript at settle, through
`settleSpendFromTranscript` (`src/run-spend-ingest.mjs:220`), to stamp spend. Its only caller,
`transitionRunComplete` (`src/effects/run-transitions.mjs:113`), passes
`projectsDir ?? workspace?.projectRoot`. That is the **repository root**, where no transcript lives.
Measured: the three newest settled runs on 133 all carry a `sessionId` and **`spend: null`**. A
hand-run `aof work run-complete` never stamps. An answer harvest hung on this seam as it stands would
stamp nothing and report nothing wrong. That is R6's failure mode exactly, and it is why ADR-003
resolves the directory itself and owes a measured check.

## R6 · What stays outside the anchor (stated, not hidden)

- **Forgery.** An agent with a shell can append a line to a `.jsonl`. The anchor stops the failure
  aof actually has, an agent filling a gap with a plausible answer and labelling it agreed. It does
  not stop an adversary. The same trust boundary already holds for spend and `aof work observe`.
- **Retention.** Claude Code prunes old transcripts. So an answer must be copied onto the committed
  run record once, at settle. It cannot be re-read from the transcript on every check.
- **Semantics.** The record proves a person was asked about a named example and answered. It cannot
  prove the map's wording reflects the answer. That is the reviewer's job, and 135's lint.

## R7 · Baseline: misunderstood requirements and amendment rounds, before the gate ships

The origin research's §7 Q7 asks for a before-number. This section counts it on four delivered
milestones, 124, 126, 127 and 133, which hold 21 stories. The tree counted is the commit `bfb3654`
(2026-09-24). Classifying a finding is a judgement. So the rules come first, the borderline calls
are listed with the call made, and every count is a floor.

### The rules

**A misunderstood-requirement finding** is a row in a milestone's `VERIFICATION.md` findings
register that passes either test:

1. its own text says the requirement was understood differently from what was meant, for example
   two documents stating one requirement two ways; or
2. its fix changed an acceptance criterion rather than code: a task `.feature` added or changed, a
   `DESIGN.md` line the story was built to overturned, or an accepted criterion re-read at review
   close as a different statement from the one written.

A finding is counted on the story its `routed-to` cell or its text names. A finding that names no
single story (none, or more than one) is counted on its milestone's own row, and the milestone
total includes it. Not counted: a defect fixed in code with the criterion kept; a criterion whose
spelling or count was wrong while its meaning held; a technical gap ruled by an ADR; a `files:`
declaration short of the ratchets its build trips; contention reds and inherited reds.

**An amendment round** is one beat, after the story's contract was first authored, in which a task
`.feature` was added or changed or the `STORY.md` `## User story` was changed. Several changes in
one beat are one round. Refine's contract beat includes QA's Examples pass and the developer's
feasibility pass (`src/bundle/commands/refine.md`), so a correction made in that beat is authoring.

An ADR or `DESIGN.md` amendment that changed neither a feature nor the user story is listed apart
and not counted, and so is a review-close ratification with no `.feature` edited. A mechanical
rewrite is not a round: the archive move `ed9c00c`, the machine-name scrub `f76c153`, a link or
path rewrite, or a `STORY.md` edit confined to `reads:`, `files:`, `status:`, `updated:`, the
`## Tasks` ticks or `## Notes`.

### Sources, and what the count cannot reach

Read for each milestone: `VERIFICATION.md` (the register and the accept decision), `STATE.md` and
`RETROSPECTIVE.md`; for each story, `STORY.md`, `RETROSPECTIVE.md`, `OUTCOME.md` and the `tasks/`
features; plus 124's and 127's `FEEDBACK.ndjson`, 127's and 133's `DESIGN.md`, and the ADR
amendment notes the records cite. 133/02, 133/05 and 133/06 have no `RETROSPECTIVE.md`.

Git's reach, from `git log --format=%h -- wiki/work/<name> wiki/work/archive/<name>`:

| milestone | commits | what git can show |
|---|---|---|
| 124 | 3: the public-root cut `e4c8824`, the archive move `ed9c00c` and `f76c153` | Every contract was authored before the cut, so git shows no round. Rounds are read from the records. |
| 126 | 3: the same three | The same. |
| 127 | 26: the public-root cut `e4c8824` and the commits after it | 01 and 02 were authored before the cut. 03 to 05 were authored at `33abef9`, and after that only the archive commit `b0748bf` touched any `tasks/` file. `STATE.md` was compacted at accept, so the pre-accept text is read as `git show 9e6623a~1:wiki/work/127_milestone_backlog-and-archive/STATE.md`. |
| 133 | 2: `2078166`, which lands every story's contract at once, and `7a9ad6e` | `2078166` also lands 04's task 03, which was added at verify, so git cannot order a round against authoring. The records can. |

**Effect on the numbers.** A round that happened before a milestone's first reachable commit is
counted only if a record kept it. If it was folded into a squash or compacted out of `STATE.md`
with no line left in a retrospective or the register, it is not reachable and not counted. 124's
`STATE.md` says its twelve raw feedback notes graduated and were archived at accept. So 124's zero
rounds is a floor on what the records kept, not a measured absence.

**Not sources.** The `runs/` records are not read: a repeated run there is a retry (a
`runtime_offline` death, a cap, a re-drive), not a contract change. No command here reads the
local-only `.git-archive`, which holds the pre-cut history, because a clone does not have it.

**133 is counted as the tree records it at `bfb3654`.** Its `SPEC.md` still reads
`status: in-progress`, and `aof work find 133 --json` answers the same. Its `STATE.md` records it
verified and accepted on 2026-09-23, and all six stories read `done`. The SPEC is not flipped to
done because F-133-09 holds the door: the gate refuses the root until 129 and 132 are archived.
F-133-06 (the `@uat` render on GitHub) is open. 133's numbers may still grow, because a finding
raised at its door or when F-133-06 is observed lands in this register.

### Per story

"Read from" names the records that carried the number. A `0` row names what was read.

| milestone | story | misunderstood-requirement findings | amendment rounds | read from |
|---|---|---|---|---|
| 124 | 124/00 | 0 | 0 | register F-01 to F-17 (F-02, F-05 and F-07 are this story's); story retro R1 to R4; `STATE.md` |
| 124 | 124/01 | 0 | 0: the two criteria corrected at the feasibility pass were authoring | register (F-10, F-11); ADR-006 "AMENDED at the feasibility beat"; story retro R1 to R4 |
| 124 | 124/02 | 0 | 0 | register (F-08, F-09); story retro R1 to R4; `FEEDBACK.ndjson` |
| 124 | milestone | 0 | not applicable | register (F-14 and F-17 are the milestone's); `RETROSPECTIVE.md` R1 to R7 |
| 126 | 126/00 | 0 | 0: `f76c153` rewrote one `reads:` path only | register F-03 to F-06; story retro; `STATE.md` refine notes |
| 126 | 126/01 | 0 | 0: the QA point on the face's `now` went into ADR-003 §2 with no feature changed; `f76c153` changed one node name in task 00's Examples | register F-07 to F-10; story retro R1 to R4 |
| 126 | 126/02 | 0 | 0: the QA point on the stale `running` record went into ADR-001 §2 and ADR-004 §2 | register F-11 to F-15, F-21; story retro R1 |
| 126 | 126/03 | 1: F-24 | 0: the ADR-006 §4 residue was left, and the feature was unchanged | register F-24, F-32, F-33; story retro R1 |
| 126 | 126/04 | 0 | 0 | register F-26 to F-30; story retro R2 |
| 126 | 126/05 | 0 | 0 | register F-17 to F-20; story retro R1 |
| 126 | 126/06 | 0 | 0: added at verify, so its first contract; the post-hoc review F-36 to F-51 changed code, and task 00 is unchanged | register F-31, F-36 to F-51; ADR-007's seventh amendment; story retro |
| 126 | milestone | 0 | not applicable | register F-01, F-02, F-16, F-19, F-22, F-23, F-34, F-35, F-37, F-52; `RETROSPECTIVE.md` |
| 127 | 127/01 | 2: F-03, F-04 | 0: the review-close amendments F-03 and F-04 were ratified with no `.feature` edited | register F-01 to F-08; pre-accept `STATE.md` line 348; story retro R2 |
| 127 | 127/02 | 0 | 0: `c801091` changed `status:`, `updated:` and ticks only | register F-29; pre-accept `STATE.md` lines 377 to 420 |
| 127 | 127/03 | 0 | 0: `98fbd97` and `c801091` changed `files:`, `status:`, `updated:` and ticks only | `git log` of its `STORY.md` and `tasks/`; pre-accept `STATE.md` "127/03 build" |
| 127 | 127/04 | 0 | 0: the `DESIGN.md` prose corrected at accept for F-26 is listed apart; `9c272d0` and `9e6623a` changed `files:`, `status:` and ticks | register F-26, F-31 to F-33; `DESIGN.md` |
| 127 | 127/05 | 0 | 0: `8e915fd` added `files:` and a `## Notes` paragraph; the user story is unchanged | register F-15, F-28; pre-accept `STATE.md` "127/05 build" |
| 127 | milestone | 1: F-27 | not applicable | register F-27, routed to 127/02 and 127/04 |
| 133 | 133/01 | 0 | 0 | register; `STATE.md` build archive (ADR-003 §1 against FF-6604); story retro |
| 133 | 133/02 | 0 | 0 | register; `STATE.md` build archive; `OUTCOME.md` |
| 133 | 133/03 | 0 | 0: the `severityFor` ruling against ADR-006's table was made in the contract beat | register; `STATE.md` "Ratified in the contract beat"; story retro |
| 133 | 133/04 | 1: F-133-01 | 1: task 03 added at verify, tagged `@bug @finding-F-133-01 @finding-F-133-02` (one beat carrying both findings); `DESIGN.md` "Amended at verify" is listed apart | register F-133-01, 02, 04, 07; task 03's tags; `DESIGN.md`; story retro |
| 133 | 133/05 | 0 | 0 | register; `OUTCOME.md` |
| 133 | 133/06 | 0 | 0 | register F-133-05, F-133-06; `STATE.md` |
| 133 | milestone | 0 | not applicable | register F-133-03, 07, 08, 09 |

### Totals: the before-number

| milestone | stories | findings (on stories + on the milestone) | per story | amendment rounds | per story |
|---|---|---|---|---|---|
| 124 | 3 | 0 | 0.00 | 0 | 0.00 |
| 126 | 7 | 1 (1 + 0) | 0.14 | 0 | 0.00 |
| 127 | 5 | 3 (2 + 1) | 0.60 | 0 | 0.00 |
| 133 | 6 | 1 (1 + 0) | 0.17 | 1 | 0.17 |

**Across all four milestones: at least 5 misunderstood-requirement findings and at least 1
amendment round, over 21 stories (at least 0.24 findings and 0.05 rounds per story).**

These are floors. A finding or an amendment recorded in words the rules do not match is not
counted. So is anything recorded outside the register and the records listed above, and anything
the git reach above cannot show.

### Borderline calls

Findings:

- **127/F-03: counted.** The accepted criterion was re-read at review close with no `.feature`
  edited: task 03's `ideas` row said the face answers `[]` at exit 0, and the ratified reading is
  the engine's `[]`. Test 2 reads a re-read criterion as a changed one.
- **127/F-04: counted,** on the same edge: task 01's "holds no `readdir`" was re-read as "no
  item-name match of its own".
- **127/F-27: counted on the milestone row.** Three contract-wording deltas were re-read as the
  delivered behaviour, across 127/02 and 127/04, so the finding names no single story. Its "pill
  LEFT" half alone would be 127/F-26's case.
- **126/F-24: counted.** ADR-006 §4 and the delivered Examples table state one requirement (the
  seeded daemons' `cwd`) two ways. Nothing was edited, but the finding's own text says the two
  documents disagree about what was required.
- **127/F-02: not counted.** A probe's spelling failed (a duplicate binding) while its meaning
  stood. 127/F-29 is the same case.
- **127/F-28: not counted.** The loop acted before the precondition held (05 ran when 02 to 04 were
  in review, not accepted). The precondition was not misread; the loop's readiness walk ran early.
- **126/F-41: not counted.** The fix changed code (all skipped is not none) and kept the delivered
  criterion that a node with no workspaces registered is a pass.
- **126/F-03: not counted.** The contract miscounted the tree's sites (two drive sites named, three
  in the tree) while its intent, every drive site narrates, held. 126/F-04 is the same case: its
  precondition was incomplete and its claim was right.
- **127/F-26: not counted.** Non-binding `DESIGN.md` prose disagreed with the binding checklist the
  build met, and the prose was corrected.
- **124/F-14: not counted.** A technical gap (the engine's dead cap) ruled by an ADR at refine.
- **124/F-10: not counted.** ADR-006's ledger append could not be honoured as written. That is
  technical headroom, fixed by compacting the ledger.
- **The write-set class: not counted.** 124/F-06, 126/F-05, F-07, F-15, F-17 and 127/F-05, F-14
  are `files:` declarations short of the ratchets their builds tripped: a gap in the contract's
  mechanics, not in its requirement.
- **Retrospective lessons labelled `Kind: misunderstanding` (11): none counted.** Each maps to a
  register row ruled above or to a technical rule (budgets, controls, probes, import position). The
  rules read the register, not the label.
- **Build notes outside the register: not counted.** 127/03's convergence scenario contradicting
  its own Examples row, 127/03's three contract deltas and 127/05's six (beyond F-28) are recorded
  only in the pre-accept `STATE.md`. They are not register rows, which is one reason the count is
  a floor.

Amendment rounds:

- **133/04's task 03, added at verify and tagged `@bug`: counts** as one round.
- **127/01's review-close amendments F-03 and F-04, ratified with no `.feature` edited: do not
  count.** They are listed apart.
- **127/04's `DESIGN.md` prose, corrected at accept for F-26: does not count.**
- **126/01's QA point, amended into ADR-003 §2 with no `.feature` changed: does not count.** 126/02's
  point in ADR-001 §2 and ADR-004 §2 is the same case. (This story's contract Example names ADR-001
  §2 for 126/01; `STATE.md` puts 126/01's point in ADR-003 §2.)
- **`f76c153`, the machine-name scrub: does not count.** It rewrote a `reads:` path in 126/00's
  `STORY.md` and one node name in 126/01's task 00 Examples. Both are mechanical.
- **127/03's commits `98fbd97` and `c801091`, which change only `STORY.md` `files:`, `status:`,
  `updated:` and ticks: do not count.**
- **124/01's two criteria, corrected at the feasibility pass: do not count.** That pass belongs to
  the contract beat.
- **126/06, added to the milestone at verify: not a round on any story.** It is a new story's first
  contract.

### Commands (R7, 2026-09-24, from the repository root)

All are read-only. `A=wiki/work/archive`, `V` is the four `VERIFICATION.md` paths.

```sh
# stories per milestone: 3, 7, 5, 6 = 21 (each ref resolves: aof work find <ref> --json)
for m in 124 126 127 133; do aof work list $m --all | grep -c ' story '; done
# register rows: 17, 52, 33, 9
grep -c '^| F-' $V
# candidate rows by type, read one by one against the rules:
grep -c '^| F-.* | contract-wording | ' $V        # 0, 0, 6, 0
grep -c '^| F-.* | design-gap | ' $V              # 3, 11, 7, 1
# the five counted rows
grep -n '^| F-24 ' $A/126_milestone_the-declaration-is-the-unit/VERIFICATION.md
grep -n '^| F-0[34] \|^| F-27 ' $A/127_milestone_backlog-and-archive/VERIFICATION.md
grep -n '^| F-133-01 ' wiki/work/133_milestone_architecture-diagrams/VERIFICATION.md
# task features added as a fix (@bug): 1, 133/04 task 03
grep -l '@bug' $A/{124,126,127}_milestone_*/stories/*/tasks/*.feature \
  wiki/work/133_milestone_architecture-diagrams/stories/*/tasks/*.feature
# git reach (3, 3, 26, 2), and the commits touching any task feature
git log --format=%h -- wiki/work/<name> wiki/work/archive/<name> | wc -l
git log --format=%h -- "wiki/work/<name>/stories/*/tasks/*" "wiki/work/archive/<name>/stories/*/tasks/*"
#   124: ed9c00c e4c8824 · 126: f76c153 ed9c00c e4c8824 · 127: b0748bf 33abef9 e4c8824 · 133: 2078166
# 127's ratifications with no feature edited, in its pre-accept STATE: 3 lines (348, 377, 413)
git show 9e6623a~1:wiki/work/127_milestone_backlog-and-archive/STATE.md | grep -n 'no `.feature`'
# retrospective lessons labelled misunderstanding: 11
grep -rh 'Kind:\*\* misunderstanding' $A/{124,126,127}_milestone_* \
  wiki/work/133_milestone_architecture-diagrams --include=RETROSPECTIVE.md | wc -l
```

## Commands (2026-09-23)

```sh
cd ~/.claude/projects/<project-slug>
grep -l '"name":"AskUserQuestion"' *.jsonl | wc -l                  # 88
# census: node over every *.jsonl — count tool_use AskUserQuestion, match tool_result by
# tool_use_id, read toolUseResult (answers / "User rejected tool use"), isSidechain
grep -h '"name":"AskUserQuestion"' */subagents/*.jsonl | wc -l      # 0
# spend never stamped by a hand-run settle:
node -e 'r=require("./wiki/work/133_milestone_architecture-diagrams/runs/<node>/<run>.json"); console.log(r.sessionId, r.spend)'
```
