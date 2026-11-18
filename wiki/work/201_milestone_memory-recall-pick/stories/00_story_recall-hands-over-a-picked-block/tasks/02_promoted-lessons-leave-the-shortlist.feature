@executable @cli @work @memory
Feature: Promoted lessons leave the shortlist

  WHY. A lesson that became a control, a rule or a prompt is already enforced or already loaded, so
  surfacing it again spends a place in the block on something the agent cannot miss (177, candidate
  4). 153 indexes the promotion as the lesson's status, and nothing on the recall path reads it yet
  (ADR-005). The filter runs before the shortlist is cut, so a dropped lesson frees its place.

  Background:
    Given a memory index in which 60 records match the query "worktree junction"
    And a picker stub that records the cards it is handed

  Rule: R3 · A lesson already promoted to a control, a rule or a prompt is not shortlisted

    Scenario: E10 · a promoted lesson is not a card, and the next record takes its place
      Given the best-ranked record is a lesson whose promotion is "control:171/FF-17104"
      When "aof memory recall 'worktree junction' --block" runs
      Then the picker was handed 20 cards
      And no card is that lesson
      And the record ranked 21st is card 20

    Scenario: E11 · a lesson with no promotion yet is still a card
      Given the best-ranked record is a lesson whose promotion is "none"
      And the second-ranked record is a legacy lesson with no promotion field
      When "aof memory recall 'worktree junction' --block" runs
      Then cards 1 and 2 are those two lessons

    Scenario: E12 · a caller that asks by promotion is shown the promoted lesson
      Given the best-ranked record is a lesson whose promotion is "control:171/FF-17104"
      When "aof memory recall 'worktree junction' --status control --block" runs
      Then card 1 is that lesson

    Scenario Outline: what drops a record from the shortlist, and what does not
      Given the best-ranked record is a <type> whose status is <status>
      When "aof memory recall 'worktree junction' --block" runs
      Then that record is <card>

      Examples:
        | type   | status                                            | card       |
        | lesson | "rule:.claude/rules/build-deploy-restart.md"      | not a card |
        | lesson | "prompt:packages/core/assets/commands/verify.md"  | not a card |
        | lesson | "Control:171/FF-17104"                            | not a card |
        | lesson | ""                                                | card 1     |
        | lesson | "planned: a control next milestone"               | card 1     |
        | adr    | "Accepted"                                        | card 1     |
        | gap    | "discharged"                                      | card 1     |
        | adr    | "control:171/FF-17104"                            | card 1     |

    Scenario: the filter holds when the pick misses
      Given the best-ranked record is a lesson whose promotion is "control:171/FF-17104"
      And the picker misses with "pick-timeout"
      When "aof memory recall 'worktree junction' --block" runs
      Then the block is the records ranked 2nd to 6th
