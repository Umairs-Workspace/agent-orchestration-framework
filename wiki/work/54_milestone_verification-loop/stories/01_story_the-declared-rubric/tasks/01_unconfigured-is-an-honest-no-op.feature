@executable @cli @work @validate
Feature: Unconfigured is an honest no-op — it says so, it is never a pass, and the loop is unchanged

  Almost every repo that installs aof will have no `work.rubric` on the day it installs it. What
  happens to those repos is the whole no-regression rule, and there are exactly two ways to get it
  wrong: read the silence as `pass` (and ship a green that nothing paid for), or read it as a
  failure (and halt every loop in a repo that never asked for a grader). Neither is what happens.
  **No `work.rubric` ⇒ `verdict: "indeterminate"`, code `rubric-unconfigured`, the key named, and
  the loop proceeds byte-for-byte as it does today.**

  It is `m26/ADR-001`'s rule (*"an unconfigured-mesh install is byte-identical to today"*) and
  `66/ADR-004`'s honest no-op: the leg does not run **and says so**. The message idiom is
  `roadmap-folder-mismatch`'s, verbatim — the dormant lane at `work-doctor-freshness.mjs:9-11` that
  is *"an honest NO-OP until … is configured (`config.work.roadmap`)"*, naming the key that would
  activate it rather than emitting nothing and rather than emitting an alarm.

  **This is a DIFFERENT assertion from 54/00's, and the difference is the point.** 54/00's
  `00_the-frozen-vocabularies` proves the pure compiler, handed the observation "no rubric", yields
  the code and the verdict — a leaf, no config, no disk. **This proves the command over a real
  repository**: it reads that repo's actual configuration, decides there is nothing to run, and
  **spawns nothing**. A grader that produced the right record while still launching a process would
  pass 54/00 and fail here.

  **The distinction this task defends most is against `00_the-rubric-is-declared`'s ruling (1).**
  *Undeclared* proceeds; *declared and unusable* halts. They are adjacent inputs with opposite loop
  consequences, so the pair is asserted here side by side rather than left to be inferred from two
  files.

  **What is NOT provable at this story, stated so a reviewer does not read a gap as a defect.**
  `work:grade` does not enter `GATE_ORDER` until **54/02**, so "the loop proceeds exactly as today"
  is here evidenced the way ADR-002 §3 asks for it — the three shipped loop suites
  (`test/loop-command-{gate,sequencing,stops}.test.mjs`) staying green **unedited**. `m08/R2` warns
  that "green verbatim" and "guarantee preserved" are different claims; here they coincide, because
  at this story nothing has been inserted into the loop at all. The gate's own no-op is FF-5404's
  and 54/02's.

  ADR-002 §3; ADR-004 §4; ADR-007 §3.

  Scenario: a repository that declares no rubric is told so, by name
    Given a project with no `work.rubric` key at all
    When the rubric is graded with `--run`
    Then the verdict reads `indeterminate`
    And the codes contain `rubric-unconfigured`
    And the message names `work.rubric` as the key to set
    And the message does not read as a failure of the project's tests

  Scenario: nothing is launched, because there was nothing to launch
    Given a project with no `work.rubric` key at all
    When the rubric is graded with `--run`
    Then no process was launched
    And `runner` reads null
    And `report` reads null
    And the observed case counts each read zero rather than being absent

  Scenario Outline: no absent-rubric path anywhere yields a pass
    Given a project with no `work.rubric` key at all
    When <invocation>
    Then the verdict reads `indeterminate`
    And the verdict does not read `pass`
    And the verdict does not read `fail`

    Examples: every door into the grade
      | invocation                                                  |
      | the rubric is graded with `--run`                           |
      | the plan is read without `--run`                            |
      | the grade is requested for a story rather than a milestone  |
      | the grade is requested twice in succession                  |

  Scenario: undeclared proceeds, declared-and-unusable halts — the adjacent pair, side by side
    Given a project with no `work.rubric` key at all
    And a second project whose `work.rubric` is present but carries no usable `command`
    When each is graded with `--run`
    Then the first reports `rubric-unconfigured` and the loop's stop conditions are not met by it
    And the second reports `runner-spawn-failed` and does meet the `grade-indeterminate` stop
    And the two records are distinguishable by their code alone, without reading their messages

  Scenario: the shipped loop behaves as it did, and the evidence is the suites themselves
    Given a project with no `work.rubric` key at all
    When the loop is run over an item in that project
    Then the acts it takes are the acts it took before the grade existed
    And `test/loop-command-gate.test.mjs`, `test/loop-command-sequencing.test.mjs` and `test/loop-command-stops.test.mjs` are green
    And none of those three suites was edited to make them green

  Scenario: an honest no-op is not a silent one
    Given a project with no `work.rubric` key at all
    When the grade record is read
    Then it states that no rubric was declared
    And it states which key would declare one
    And a reader can distinguish it from a rubric that ran and found nothing to report
