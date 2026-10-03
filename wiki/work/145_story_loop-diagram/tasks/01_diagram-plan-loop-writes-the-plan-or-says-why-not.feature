@executable @cli @work @design
Feature: "aof diagram plan <ref> loop" writes the plan, or says why not

  WHY. A loop diagram is drawn by the same engine as an ADR diagram (the operator's ruling: one
  engine for every diagram). So the loop diagram takes the same door, `aof diagram plan`, with
  `loop` in place of the ADR id, and the same generator answers: off, generator missing, or the
  drawing instructions. What differs is the brief and the place. The brief is built from the wave
  plan (task 00), not read from an ADR. Everything goes under the item's `execution/` folder, whose
  place and file names have one home: the diagram layout module (FF-13302 extended).

  Unlike the ADR plan, this one writes one file: `execution/loop-plan.json`, the plan itself. It is
  aof's own data, so it is written even when the drawing step cannot run (145 Q3). It is never
  written when the request stops first. A re-run overwrites it, and aof never commits it (145 Q4).

  THE CHECK ORDER: ref → item type → concurrency mode → refined → write the plan → diagrams off →
  generator → instructions. Every stop before "write the plan" leaves the tree as it was.

  THE FIXTURE BELOW: a project with `work.diagrams` on, `work.loop.concurrency: "refine_first"`
  and the generator registered under a fixture home, and milestone 7 with stories 01 and 02, each
  with one task. Driven through the real CLI with AOF_GLOBAL_HOME and the home in fresh temporary
  directories, every exit code read unpiped.

  Rule: R1 · A plan is drawn only for a refined milestone the loop would plan upfront

    Scenario: E1 · a refined milestone under refine_first gets its plan and the drawing instructions
      When "aof diagram plan 7 loop --json" is run
      Then it exits 0
      And "wiki/work/07_milestone_m/execution/loop-plan.json" exists and holds the wave plan for 7
      And the answer carries "enabled: true", "available: true" and the generator's id
      And its "paths" name "execution/loop-plan.json", "execution/loop.html", "execution/loop.svg" and "execution/loop.png" under the milestone
      And its "brief" lists every wave with its stories, the held stories with their reasons, the built stories and the lane bound
      And its "instructions" name the skill's path, the brief and "execution/loop.html" as the one file to write

    Scenario: E2 · a project that does not refine upfront is stopped by name
      Given "work.loop.concurrency" is unset
      When "aof diagram plan 7 loop --json" is run
      Then the answer carries the code "loop-not-refine-first"
      And its message names "work.loop.concurrency" and "refine_first"
      And no "execution" folder exists under the milestone

    Scenario: E3 · a milestone with an unrefined story is stopped, naming the story
      Given story 7/02 has no tasks
      When "aof diagram plan 7 loop --json" is run
      Then the answer carries the code "loop-not-refined"
      And its message names "7/02" and "aof:refine 7/02"
      And no "execution" folder exists under the milestone

    Scenario: a milestone that is not broken down is stopped as not refined
      Given milestone 7 has no stories
      When "aof diagram plan 7 loop --json" is run
      Then the answer carries the code "loop-not-refined"
      And its message says 7 has no stories and names "aof:refine 7"
      And no "execution" folder exists under the milestone

    Scenario Outline: E11 · an item that is not a milestone has no waves to draw
      Given the stream holds <item>
      When "aof diagram plan <ref> loop --json" is run
      Then the answer carries the code "loop-not-a-milestone"
      And its message says a single item runs in one lane
      And no "execution" folder exists under the item

      Examples:
        | item                          | ref  |
        | standalone story 08           | 08   |
        | chore 09                      | 09   |
        | story 7/01 inside milestone 7 | 7/01 |

  Scenario: a done story without tasks does not stop the plan
    Given story 7/02 is "done" and has no tasks
    When "aof diagram plan 7 loop --json" is run
    Then it exits 0
    And "execution/loop-plan.json" exists under the milestone

  Scenario Outline: the plan is written even when the drawing step cannot run
    Given <condition>
    When "aof diagram plan 7 loop --json" is run
    Then it exits 0 and the answer carries <answer>
    And "execution/loop-plan.json" exists under the milestone
    And no "execution/loop.html" exists

    Examples:
      | condition                                     | answer                                              |
      | "work.diagrams" is unset                      | "enabled: false" and a reason naming work.diagrams  |
      | "work.diagrams.generator" is "off"            | "enabled: false" and a reason naming the generator  |
      | the generator is not installed under the home | "available: false" and the code "diagram-generator-missing" |

  Scenario: a re-run replaces the plan and touches nothing else
    Given "aof diagram plan 7 loop" has run once
    And 7/02 then declares "depends: [01]"
    When "aof diagram plan 7 loop --json" is run again
    Then "execution/loop-plan.json" holds 7/02 in wave 2
    And git status lists no path outside the milestone's "execution" folder

  Scenario: the ADR plan answers exactly as before
    When "aof diagram plan 7 ADR-002 --slug seam --json" is run
    Then the answer is the one 133 delivered, and no "execution" folder exists

  Scenario: an unknown subject is refused as the ADR id it is not
    When "aof diagram plan 7 loops --json" is run
    Then it is refused with the code "diagram-adr-invalid"
