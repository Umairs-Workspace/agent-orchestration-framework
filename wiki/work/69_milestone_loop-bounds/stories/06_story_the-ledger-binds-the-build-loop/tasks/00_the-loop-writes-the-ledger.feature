@executable @cli @work @work-stream @bug @finding-F-69-V7
Feature: The progress ledger is written by the loop that builds, not by its own test

  `src/loop-progress.mjs` resolves, validates and passes twenty-three assertions, and has **zero
  importers in `src/`**. `progressSample`, `sampleWorktreeProgress`, `progressLedgerPath` and
  `appendProgressSample` are a producer nobody calls — the milestone's own opening diagnosis,
  reproduced inside the milestone written to end it. Nothing in `src/` writes a
  `runs/<runId>.progress.ndjson` file, so at the moment an attempt starts grinding there is no
  ledger to consult, whatever the leaf can do when a test hands it two samples.

  This task wires the producer. It is the first half of F-69-V7's remedy and it changes no
  behaviour of the leaf: every measure, every key and every fault posture below is the one
  69/03 already delivered and is deliberately not re-contracted here. What is new is exclusively
  that a **production build round** takes the sample, and that the sample lands where the policy
  half of this story can read it.

  Four properties of the seam shape this contract, and all four were measured on this tree.

  **The measurement source already exists and is already in service.** `laneChanges(worktreePath)`
  reads `git status --porcelain` in the lane's own tree; `sampleWorktreeProgress` is built on it and
  adds `git diff --numstat HEAD` and `git rev-list --count`. The caller supplies a worktree path and
  a run, not a new measurement. No new process, no new store, no model call.

  **The ledger is a sibling of the run, never a key on it.** `progressLedgerPath` writes
  `<item.dir>/runs/[<node>/]<runId>.progress.ndjson`, and `readRuns` skips every entry that is not
  `*.json` on both its branches — so the file is invisible to the run reader by construction rather
  than by discipline. FF-6908 is a negative control over `src/run-store.mjs` and stays green: this
  story adds no key, no state and no transition to the run record.

  **A ledger that cannot be written must not stop a build.** The sample is an observation of the
  round, not a precondition for it. A git call that fails, a lane that has gone, a ledger directory
  that cannot be created — each degrades to a round with one sample missing, which is precisely the
  degraded state the policy half is already contracted to tolerate. A build that dies because its
  odometer broke is a worse loop than the one this milestone set out to fix.

  **A sample carries a failing count or it is not taken.** `progressSample` refuses one whose
  `failingScenarios` is absent — the delivered leaf's own contract, and unedited here. So a round
  whose failing count could not be measured appends **no sample at all**, rather than a sample
  carrying a fabricated zero that `madeProgress` would then read as a real measurement. The ledger
  is a record of the rounds that were measurable, and the policy half reads it as exactly that. A
  workspace that measures nothing therefore keeps an empty ledger and an unbounded build — dormant,
  which is honest, rather than bounded by a number nobody measured. **This repository is one of
  those workspaces today**, declaring no rubric for `work:grade` to run, which would leave the
  ledger wired and never written on the very tree that raised F-69-V7. Declaring one is in this
  task's scope, and is contracted below rather than left as a note.

  ADR-005. F-69-V7.

  Scenario: a build round driven by the loop records a progress sample
    Given the loop driving a story's build phase
    When the round completes
    Then a progress sample is recorded for that round's run
    And the sample carries the files touched, the lines changed, the commits made and the failing count
    And no model was asked whether progress was made

  Scenario: the sample measures the tree the round actually worked in
    Given a build round the loop drove in a working tree
    When its progress sample is taken
    Then the measures are read from the tree that round was driven in
    And no other tree contributes to them

  Scenario: a round whose failing count could not be measured appends no sample
    Given a build round for which no failing count could be measured
    When the round completes
    Then no sample is appended for that round
    And no sample is recorded carrying a count that was not measured
    And the round's own outcome is unaffected

  Scenario: a second round appends beside the first rather than replacing it
    Given a run with a progress sample already recorded
    When a further round of the same run completes
    Then both samples are readable in the order they were taken
    And the first is byte-identical to how it was written

  Scenario: the ledger sits beside the run it measures
    Given a run with progress samples recorded by the loop
    When the ledger written for it is located
    Then it is the run's own progress sibling under the item's runs directory
    And it carries the run id it measures

  Scenario: the run record gains nothing
    Given a story whose build rounds have been sampled by the loop
    When the run records for that story are read
    Then no sample appears among them
    And the run record's key set is unchanged

  Scenario Outline: where the ledger lands, across the run shapes the store produces
    Given a story whose build rounds were sampled by the loop on <shape>
    When the ledger written for those rounds is located
    Then it is <placement>
    And the run records read for that story still carry no sample

    Examples: a sibling of the run record, in whichever partition holds it
      | shape                                   | placement                                           |
      | a run minted with no node               | the run's progress sibling in the runs directory    |
      | a run minted carrying a node            | the run's progress sibling in that node's partition |
      | two runs on one item, one of each shape | one ledger beside each run, in its own partition    |
      | two rounds of a single run              | one ledger, holding both rounds in the order taken  |
      | two nodes' runs on the same item        | one ledger per run, never a file they share         |

  Scenario: a sample the loop cannot take degrades the round rather than failing it
    Given a build round whose progress cannot be measured
    When the round completes
    Then the round's own outcome is unaffected
    And the fault is reported rather than thrown
    And the build is not halted on the strength of the missing sample

  Scenario Outline: a measure the loop cannot read, source by source
    Given a build round driven in a lane where <source> cannot be read
    When the round completes
    Then the round's own outcome is unaffected
    And the fault is reported rather than thrown
    And the ledger holds <record> for that round

    Examples: every source of the sample, failing in turn — not one of them is a precondition for the round
      | source                             | record                                |
      | the lane's porcelain status        | a sample without the files it touched |
      | the numstat of the round's changes | no sample                             |
      | the commit count since the base    | no sample                             |
      | the ledger's own directory         | no sample                             |
      | the append to the ledger file      | no sample                             |
      | the lane's tree, which has gone    | no sample                             |

  Scenario: this repository can measure a round
    Given this workspace's own configuration
    When the rubric the grade command would run is resolved
    Then it resolves to a declared rubric rather than none
    And a build round driven here yields a failing count rather than an indeterminate grade
    And the ledger this task writes is therefore written on this tree

  Scenario: the ledger is written on the path the loop command drives
    Given the loop command driving a story to build
    When the run finishes
    Then the samples it wrote are readable from the item it drove
    And the production path that wrote them reached the progress producer

  Scenario: the commits counted are the ones the round made
    Given a build round whose maker committed its work
    When the round's progress sample is taken
    Then the commits counted are those made since the round began
    And a baseline that is not a commit is never counted from
    And a round that committed reads as having made progress

  Scenario: sampling is not a second measurement home
    Given the production path that records a progress sample
    When its sources for the sample's measures are enumerated
    Then every measure resolves through the progress producer
    And no second porcelain read, numstat parse or commit count exists on that path
    And capturing the round's own starting point is not one of those measures
