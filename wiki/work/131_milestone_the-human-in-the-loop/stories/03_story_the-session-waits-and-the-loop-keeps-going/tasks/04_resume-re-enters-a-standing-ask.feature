@executable @cli @work @work-stream
Feature: --resume re-enters a run that is waiting on a human, never reclaims it, and never asks the operator twice

  ADR-004 §5, ADR-001 §4. A run whose record's last ask has `answeredAt == null` is a STANDING ASK.
  131/01 makes the stale scan skip it, so today's `--resume` would read it as live elsewhere and
  halt `lane-open-failed`. This task makes `--resume` RE-ENTER it through `awaitAnswer`, in the
  lane (at reconcile, `reconcileLanes` in `src/loop/wave.mjs`) and in the primary (the resume
  branch of `src/commands/loop.mjs`). If the ask file reads `answered`, the run is re-driven with
  the answer at once. Otherwise the wait resumes with a fresh bound counted from this invocation's
  start, and `session-needs-input` is not notified again.

  RULINGS (PO, 2026-09-23).
  (1) `awaitAnswer` gains `reenter: true`. With it, it writes no `openRunAsk` and sends no
  `session-needs-input`. It narrates the waiting row once, then waits, answers or parks exactly as
  it does on a first ask. A parked ask is re-parked by `parkRunAsk`'s re-stamp (131/01 task 04,
  ruling 7) and by `parkAsk` only when the file reads `waiting`.
  (2) The file decides between answered and waiting. A file reading `parked` is set back to
  `waiting` by `openAsk` with the record entry's `question` and `phase` and the run record's `sessionId` (ruling 8), and the ask's
  `askedAt` is re-stamped. An ABSENT file with a standing record ask is re-opened the same way. The
  record's entry is not re-opened. A re-opened file sends no notice.
  (3) THE LANE, at reconcile. A lane whose running run carries a standing ask is neither reclaimed
  nor added to `liveElsewhere`. It is handed to the wave as a RE-ENTRY: the wave reopens its lane
  slot, re-enters the wait in the lane's own tree, and on the answer spawns its child with
  `--answer`. From there it runs the same ladder, commit, merge and cleanup as any lane, and it
  counts against the lane bound.
  (4) THE PRIMARY. Before the walk resumes, every in-scope primary run carrying a standing ask is
  re-entered in `askedAt` order. An answered one is re-driven through `drivePhase` with its own
  record as `retryRecord`, settled, and the walk goes on. One that parks again halts through
  `parkedHalt`, before any new drive is minted.
  (5) The standing-ask test reads the RECORD (`asks` last entry, `answeredAt == null`). The files
  considered are `readAsks(dir, { workspaceId })` whose `ref` lies inside the loop's scope; any
  other file is not this loop's and is left alone. An in-scope ask file with no running record
  behind it, or with a settled one, is stale. It is `clearAsk`'d and
  narrated once, `Ask <runId> — stale: its run is not running; cleared.`, and never re-driven.
  (6) The record keeps its `runId` and `attempt`. No retry mint happens for a re-entered run, and
  `budgetElapsedMs` is not consulted: the wait is charged to nobody (ADR-001 §4).
  (7) The re-aimed `loop-command-reconcile` cases whose subject is the RECLAIM of a stale lane seed
  that lane with a running run that carries NO ask. The seed changes, and the assertion does not.

  RULINGS (QA, 2026-09-23). (1) CORRECTS PO ruling (2)'s wording: a record's ask entry has no
  `sessionId` (131/01 task 04's seven keys). The re-opened file takes the run record's own
  `sessionId`. (2) NARROWS PO ruling (3), for the PO to ratify: a standing ask whose run is still
  fresh by `stalenessMs`, and whose file reads `waiting` or `answered`, is still owned by a live
  loop. It is left in `liveElsewhere` as today and is not re-entered. A file reading `parked`, or a
  run gone stale, is re-entered. Otherwise two owners would both take the answer and resume one
  session twice. (3) The record behind an ask file is looked for in the primary and in the ref's
  lane worktree, so a lane's standing ask is never swept as stale. The sweep runs after the
  reclaim, so a file whose running record the reclaim settles is stale by then. (4) A file that is
  not a record, over a standing record ask, is re-opened as an absent one is, after its one
  `loop-ask-request` degrade. (5) The primary re-enters every standing ask in `askedAt` order
  before it mints the parked halt. An answered ask later in that order is still re-driven, and the
  halt names every entry that parked. A re-driven run that fails enters the retry ladder as a first
  drive would. (6) A re-entered ask that parks again at the bound sends `session-parked-unanswered`
  again (PO ruling 1). (7) The fresh bound's `invokedAt` is this invocation's own start, even when
  its `startedAt` is inherited from the declaration.

  RULINGS (PO, answering QA, 2026-09-23).
  (8) QA ruling (1) is RATIFIED. PO ruling (2) is corrected: the re-opened file takes the RUN
  record's `sessionId`, because an ask entry has none.
  (9) QA ruling (2) is RATIFIED, and it AMENDS PO ruling (3). A standing ask whose run is still
  FRESH has a live owner: another invocation is still waiting on it. That lane stays in
  `liveElsewhere` as today, and it is not re-entered. Re-entering it would put two owners on one
  ask and two `claude --resume` sessions into one worktree. Only a STALE run with a standing ask is
  re-entered.
  (10) QA ruling (3) is RATIFIED. The record behind an ask file is looked for in the primary AND
  in the lane tree for its ref, so a lane's ask is never swept as stale.
  (11) QA rulings (4) to (7) are RATIFIED.
  (12) AMENDS PO ruling (4). The primary re-drives its ANSWERED standing asks first, in
  `askedAt` order. Only then does it wait on the unanswered ones, in `askedAt` order. An earlier
  unanswered ask never holds up a later answered one. More than one standing primary ask is rare
  anyway, because a primary park halts the loop.

  RULINGS (PO, answering the developer, 2026-09-23).
  (13) AMENDS ruling (9): LIVE OWNERSHIP IS READ OFF THE RECORD, NOT THE CLOCK. The waiting owner
  beats the run, so a run parked a minute ago is still FRESH. Keyed on freshness, an answer given
  after a park and before `stalenessMs` would be stranded behind `lane-open-failed`. The rule is:
  - the last ask's `parkedAt` is non-null: the owner gave up, so the run is re-entered, fresh or
    stale;
  - `parkedAt` is null and the run is fresh: a live owner is waiting, so it stays in
    `liveElsewhere` and is not touched;
  - `parkedAt` is null and the run is stale: the owner died, so it is re-entered.
  The QA table is read under this rule, and a fresh run with a parked record ask and an `answered`
  file is re-driven.
  (14) One halt site. The primary re-entry's halts (the parked halt, and a ladder halt after a
  failing re-drive) go through the ONE pre-walk halt site the reconcile halt already uses. The
  shell's sixteen `reportLine` sites stay sixteen.
  (15) The primary re-entry runs after the stop source has started, so a stop reaches its wait. It
  still runs before the first act of the walk.
  (16) EXTENDS ruling (4). A re-entered sequential `continue` run that ends `done` goes through
  `settleStoryCycle` (grade, review and the uat gate) as a first drive would, never around it.
  (17) The re-entry loop and the stale sweep live in `src/loop/ask.mjs` (`reenterStandingAsks` and
  `sweepStaleAsks`), which the shell and the reconcile call. The stale line is narrated from there,
  so the shell's narrate count does not move for it.

  Background:
    Given scope `07` under the lane fixture, an isolated `AOF_GLOBAL_HOME`, and `notify` through an injected `fetch` spy
    And a first `runLoopBody` walk left `07/01` parked: its lane committed and unmerged, its run `running` with one parked ask for session `s-1`, and its ask file `parked`

  Scenario: an answered lane is re-driven at reconcile and finishes
    Given `aof work answer 07/01 "go ahead"` has answered the ask file
    When `runLoopBody` walks scope `07` with `resume: true`
    Then `07/01`'s child was spawned with `--run <its run> --answer <its ask file>`
    And `07/01` settled `done` under the same `runId` and attempt, merged, and was cleaned up
    And no `lane-open-failed` halt was raised, and `07/01` was never narrated `Reclaimed`

  Scenario: an unanswered lane is waited on again without a second notice
    When `runLoopBody` walks scope `07` with `resume: true` and the ask is answered 20 ms into the walk
    Then the ask file read `waiting` during the wait, and the collector holds `07/01 — waiting on you (build, `
    And `fetch` was never called for `session-needs-input`
    And `07/01` settled `done`

  Scenario: a primary run waiting on a human is re-entered before the walk
    Given the first walk parked the refine drive of `03/01` in the primary, and its ask has since been answered
    When `runLoopBody` walks scope `03` with `resume: true`
    Then `03/01`'s run was re-driven with `resumeSessionId` = its session and the answer typed, and settled `done`
    And no retry was minted for `03/01`, and the walk went on past it

  Scenario: the bound restarts at the resume
    Given the ask was made 30 hours before this invocation, and `scheduleToCloseMs` is 24 hours
    When `runLoopBody` walks with `resume: true` and a real bound
    Then the ask is not parked at the first check

  Scenario: an ask file whose run is gone is cleared, not re-driven
    Given an ask file for run `R9` whose record is settled `done`
    When `runLoopBody` walks with `resume: true`
    Then the file for `R9` is gone, the line `Ask R9 — stale: its run is not running; cleared.` was narrated once, and nothing was spawned for it

  Scenario Outline: a lane's standing ask is re-entered or left by what its run and its file say
    Given `07/01`'s run in its lane is `running` and <fresh>, its record's last ask is <ask>, and its ask file <file>
    When `runLoopBody` walks scope `07` with `resume: true`, any waited ask is answered 20 ms into its wait, and every re-drive answers `done`
    Then `07/01` <fate>
    And `fetch` was never called for `session-needs-input`

    Examples:
      | fresh | ask                       | file                         | fate                                                                                                                       |
      | stale | standing and parked       | reads `answered` `"go"`      | is re-driven at once with `--answer`, settles `done` under the same `runId` and attempt, and merges                        |
      | stale | standing and parked       | reads `parked`               | is re-entered: its file reads `waiting` with a new `askedAt` and the record's question, phase and session, then it settles `done` |
      | stale | standing and not parked   | reads `waiting`              | is re-entered, waited on, and settles `done`                                                                               |
      | stale | standing and parked       | does not exist               | is re-entered, its file re-opened `waiting` from the record, and settles `done`                                            |
      | stale | standing and parked       | holds `{ not json`           | is re-entered after one `loop-ask-request` degrade, its file re-opened `waiting`, and settles `done`                       |
      | fresh | standing and parked       | reads `parked`               | is re-entered, and settles `done`                                                                                          |
      | fresh | standing and not parked   | reads `waiting`              | is left, narrated `Lane 07/01 — live: run <its run> is still heartbeating; left.`, and never spawned                       |
      | fresh | standing and not parked   | reads `answered` `"go"`      | is left live elsewhere, its file still `answered`, and never spawned                                                       |
      | stale | answered                  | does not exist               | is reclaimed `runtime_offline` and retried as today, narrated `Reclaimed 07/01 — run <its run> (runtime_offline).`         |
      | stale | absent (`asks` is `[]`)   | does not exist               | is reclaimed `runtime_offline` and retried as today                                                                        |

  Scenario Outline: the primary re-enters every standing ask in the order they were asked, before any new drive
    Given the first walk left <standing>
    When `runLoopBody` walks scope `03` with `resume: true`
    Then <outcome>

    Examples:
      | standing                                                                                                   | outcome                                                                                                                                         |
      | `03/02` asked at 09:00 and `03/01` at 10:00, both answered                                                 | `03/02` is re-driven before `03/01`, both settle `done`, and the walk then drives its next act                                                  |
      | `03/02` asked at 09:00 and unanswered, `03/01` at 10:00 and answered, under an immediate-park `askWait`    | `03/01` is re-driven and settles `done`, and the loop halts `session-needs-input` at `03/02` with `Details.parked` naming only `03/02`, no run minted |
      | `03/01` answered, whose re-drive fails `agent_error`                                                       | `03/01`'s run settles `failed`, and `Retrying 03/01 — refine, attempt 2 of 3 (agent_error).` is narrated                                       |
      | `03/01` answered, and `04/01` answered outside the scope                                                   | only `03/01` is re-driven, and `04/01`'s file and run are byte-unchanged                                                                       |

  Scenario Outline: an ask file with no waiting run behind it is cleared, and one that is not this loop's is left
    Given an ask file for run `R9` reading <state>, for ref <ref> in <workspace>, whose run <record>
    When `runLoopBody` walks scope `07` with `resume: true`
    Then the file <file>, and `Ask R9 — stale: its run is not running; cleared.` was narrated <narrated>

    Examples:
      | state      | ref     | workspace         | record                                                            | file                                   | narrated |
      | `waiting`  | `07/01` | this workspace    | is settled `done`                                                 | is gone                                | once     |
      | `parked`   | `07/01` | this workspace    | is settled `failed`                                               | is gone                                | once     |
      | `answered` | `07/01` | this workspace    | is settled `cancelled`                                            | is gone                                | once     |
      | `waiting`  | `07/01` | this workspace    | exists in neither the primary nor any lane                        | is gone                                | once     |
      | `waiting`  | `07/02` | this workspace    | lives only in `07/02`'s lane, `running`, stale, with a standing ask | is kept, and `07/02` is re-entered   | never    |
      | `answered` | `07/01` | this workspace    | is `running`, stale, with its last ask answered                   | is gone, after the reclaim settles it  | once     |
      | `waiting`  | `08/01` | this workspace    | is settled `done`                                                 | is byte-unchanged                      | never    |
      | `waiting`  | `07/01` | another workspace | is settled `done`                                                 | is byte-unchanged                      | never    |

  Scenario Outline: the re-entered wait's bound counts from this invocation
    Given the ask was made <before> before this invocation, `scheduleToCloseMs` is 86400000, and `defaultAskWait` reads the fake clock
    When the re-entered wait's check runs <into> into the invocation, unanswered
    Then the ask <parks>

    Examples:
      | before | into                | parks                                                                                           |
      | 30 h   | 0 ms                | still waits                                                                                     |
      | 30 h   | 23 h 59 m 59.999 s  | still waits                                                                                     |
      | 30 h   | 24 h                | parks, its record's `parkedAt` re-stamped, and `session-parked-unanswered` is sent once          |
      | 1 h    | 24 h                | parks, and `session-parked-unanswered` is sent once                                              |

  Scenario Outline: a re-entered run keeps its attempt, and its budget is not consulted
    Given `07/01`'s run is at attempt <attempt> with `scheduleToCloseMs` 3600000, its lineage ran <ran> before its ask, and its ask is answered
    When `runLoopBody` walks scope `07` with `resume: true`
    Then `07/01` is re-driven under the same `runId` at attempt <attempt>, no retry is minted, and no `deadline-exhausted` halt is raised

    Examples:
      | attempt | ran    |
      | 1       | 10 min |
      | 2       | 59 min |
