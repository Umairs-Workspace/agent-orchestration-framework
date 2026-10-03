@executable @cli @work @work-stream
Feature: The wave plan is replayed from the loop's own rules

  WHY. Under refine_first the loop builds a milestone in waves: every `work:next --through-review`
  answer is partitioned by the stories' declared `files:` into a wave and a held set. The plan has
  to come from those same two functions, `nextWork` and `partitionReadySetByDeclaredFiles`, never
  from a second copy of the readiness or collision rules. The replay runs `nextWork` over a `view`
  overlay: every story starts not-started, the milestone's own `depends:` count as met, and each
  wave's members are marked in-review before the next ask. It repeats until nothing is ready. A
  story's real status only decides whether it is shaded as built (145 Q1: the whole milestone,
  with built work shown as built).

  The plan admits the loop's own lane bound: `work:dispatch`'s pool bound, narrowed by
  `work.loop.dispatch.concurrency`. It states its one simplification in its own output: the live
  loop asks again as each lane finishes, so the waves are the order if every lane in a wave
  finishes together.

  THE FIXTURE BELOW: milestone 7 with stories 01, 02 and 03, each with tasks, and the lane bound 3
  unless a scenario says otherwise.

  Rule: R2 · Stories that cannot collide share a wave; the rest wait

    Scenario: E4 · two stories writing different files share wave 1
      Given 7/01 declares "files: [src/a.mjs]" and 7/02 declares "files: [src/b.mjs]"
      And neither declares "depends:"
      When the wave plan for 7 is computed
      Then wave 1 holds "7/01" and "7/02" in stream order

    Scenario: E5 · a story whose files overlap an earlier one waits a wave, and says why
      Given 7/01 declares "files: [src/a.mjs]" and 7/02 declares "files: [src/]"
      When the wave plan for 7 is computed
      Then wave 1 holds "7/01"
      And wave 2 holds "7/02"
      And in wave 1 "7/02" is held with reason "files-overlap", naming "7/01"

    Scenario: E6 · a story that depends on another builds in the wave after it
      Given 7/02 declares "depends: [01]"
      And their declared files do not overlap
      When the wave plan for 7 is computed
      Then wave 1 holds "7/01" and wave 2 holds "7/02"
      And the plan's edges hold "7/01 -> 7/02"

    Scenario Outline: the held reason comes from the partition, not from the plan
      Given <setup>
      When the wave plan for 7 is computed
      Then "7/02" is held in wave 1 with reason "<reason>"

      Examples:
        | setup                                                                  | reason             |
        | 7/01 declares "files: [src/]" and 7/02 declares "files: [src/x.mjs]"   | files-overlap      |
        | 7/01 declares "files: [src/a.mjs]" and 7/02 declares no "files:"       | write-set-unknown  |
        | 7/01 declares no "files:" and 7/02 declares "files: [src/b.mjs]"        | after-unknown      |

    Scenario: "work:next" answers the same wave and held set as before
      Given 7/01 declares "files: [src/]" and 7/02 declares "files: [src/x.mjs]"
      When "aof work next 7 --through-review --json" is run
      Then its "wave" and "heldSet" hold the same refs, with the same keys, as before this story
      And the held reasons ride only the partition's own new return key

  Rule: R3 · The plan says what it cannot know

    Scenario: E7 · a wave larger than the lane bound marks the members past it as waiting for a lane
      Given the lane bound is 2
      And 7/01, 7/02 and 7/03 each declare files that do not overlap
      When the wave plan for 7 is computed
      Then wave 1 holds "7/01", "7/02" and "7/03"
      And "7/03" is marked "waitsForLane"
      And the plan records the lane bound 2

    Scenario: E8 · a story with no declared files runs alone and holds the rest
      Given 7/01 declares no "files:"
      When the wave plan for 7 is computed
      Then wave 1 holds "7/01" alone
      And every other story in wave 1's ask is held with reason "after-unknown"

    Scenario: the plan states that its waves assume each wave finishes together
      When the wave plan for 7 is computed
      Then the plan carries an "assumption" naming that the live loop asks again as each lane finishes

  Rule: R4 · The plan is the whole milestone, with built stories shown as built

    Scenario: E9 · a story already in review keeps its place in the plan, shaded as built
      Given 7/01 is "in-review" and 7/02 is "not-started"
      And their declared files do not overlap
      When the wave plan for 7 is computed
      Then wave 1 holds "7/01" and "7/02"
      And "7/01" is marked built with status "in-review"
      And "7/02" is not marked built

    Scenario: E10 · a finished milestone still plans every story
      Given 7, 7/01 and 7/02 are all "done"
      When the wave plan for 7 is computed
      Then every story of 7 appears in exactly one wave
      And every story is marked built

    Scenario: the plan reads nothing outside the milestone's own decision
      Given milestone 7 declares "depends: [06]" and 06 is "not-started"
      When the wave plan for 7 is computed
      Then the plan still holds every story of 7
      And no file in the work tree has changed
