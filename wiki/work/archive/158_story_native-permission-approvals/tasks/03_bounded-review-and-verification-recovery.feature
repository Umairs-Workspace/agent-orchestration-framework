@cli @work @work-stream
Feature: Review failure and recovery preserve completed work

  Rule: R4 · Interrupted reviews and recovery preserve work and history

    @executable
    Scenario: E8 · A native review with no result is bounded by the phase deadline
      Given a live native review has not reported a terminal result
      When the existing phase deadline expires
      Then the phase stops with timeout and the owned native process is released
      And no review decision or successful phase is fabricated
      And review activity does not extend the deadline or start an automatic retry

    @executable
    Scenario: E9 · Disconnect does not manufacture or replay an approval
      Given a native operation may have received review before its outcome was observed
      When the native process disconnects
      Then the drive reports disconnection with unresolved review evidence marked unknown
      And no missing decision, rollback or operation result is claimed
      And a later authorized attempt establishes fresh native review without replaying a grant

    @executable
    Scenario: E11 · A fresh verification preserves the old permission failure and completed build
      Given story 07/01 has a completed build and an operator_action_required verification failure
      When the operator starts a new loop for 07/01 with verify model gpt-6-astra:high and without resume
      Then the planner starts verification with native automatic review and the selected model
      And no build or repair is started merely because the historical approval was declined
      And the old failed run and completed build records are preserved
      And successful new verification records a new run rather than rewriting the old result

    @executable
    Scenario: Bare resume retains an actionable historical-failure refusal
      Given the latest historical run failed with non-retryable operator_action_required
      When the operator invokes the existing loop resume door
      Then it preserves the failure and does not silently retry the run
      And the remedy explains a fresh loop with the same phase model after automatic-review setup
      And it does not claim that ordinary native approval requires an interactive human session

    @executable
    Scenario Outline: Lifecycle faults remain bounded while review is pending
      Given a native phase has an unresolved automatic review
      When <fault>
      Then the drive records <outcome> and performs the existing bounded cleanup
      And no pending review is interpreted as permission or phase success
      And no replacement native session or approval-answer record is created

      Examples:
        | fault                              | outcome                         |
        | the operator cancels the loop      | cancellation                    |
        | the worker owner is withdrawn      | cancellation                    |
        | the schedule deadline expires      | the existing schedule timeout   |
        | native output disconnects          | protocol disconnection          |
        | current review persistence fails   | persistence failure             |
        | final review persistence fails     | persistence failure             |
        | the native event queue overflows   | the existing queue-limit failure|
        | the turn ends before review settles| incomplete review evidence      |

    @executable
    Scenario: Restart cannot reuse persisted approval as authority
      Given a prior owner stopped with review metadata in a failed run
      When a new owner starts a fresh authorized verification
      Then the new native thread acknowledges automatic review again
      And old review identifiers and decisions are not submitted as approval responses
      And the prior attempt remains attributable to its original owner and native context

    @manual
    Scenario: Registered checks demonstrate the approval boundary and its negative probes
      Given the implementation and its registered checks are available
      When the developer runs the story's resolved impacted tests and declared fitness controls
      And temporarily removes reviewer selection or crosses a review identity in the controlled negative probes
      Then the checks fail with the expected authority or lifecycle assertion
      And the restored implementation passes those checks
      And verification records the resolved scope, commands and observed red-probe messages
      And scripted and live acceptance evidence are reported separately
