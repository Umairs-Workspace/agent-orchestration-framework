@cli @work @work-stream
Feature: Native automatic review reaches every driven execution surface

  Rule: R2 · Foreground and unattended execution use the same delegated authority

    @executable
    Scenario: E6 · An unattended worker continues after native approval without a human answer
      Given an authorized worker verification is running without an attached operator terminal
      When its native permission review starts and is approved
      Then the worker keeps the native operation alive until its normal result
      And the owning run reports waiting-for-permission only while reviews are pending
      And the run remains running and its heartbeat advances during review
      And CLI, dashboard and Discord receive no request to approve the operation
      And no replacement run or business-question resume is started

    @executable
    Scenario: E7 · Equal review identifiers in separate worker lanes do not cross outcomes
      Given worker A and worker B each have a native review with id review-7
      And their run, session and turn identities are distinct
      When A reports approved while B remains inProgress
      Then only A's review becomes approved in A's owning run
      And B remains waiting for its own native result
      And neither lane receives an approval response manufactured by AOF

    @executable
    Scenario Outline: Launch paths inherit approval handling without another opt-in
      Given the operator has authorized work through <entry>
      When a Codex phase starts through that registered execution path
      Then its native thread acknowledges automatic review
      And native approval proceeds without an additional permission flag or answer
      And the original run, checkout and phase model remain attributable

      Examples:
        | entry                         |
        | foreground loop               |
        | detached loop launch           |
        | graph-dispatched child phase   |
        | worker single-phase assignment |
        | worker whole-loop assignment   |
        | resumed native phase           |
        | selected repair role           |

    @executable
    Scenario: Two reviews in one turn remain independently pending
      Given two native callbacks belong to the same parent command item
      And their review ids are review-7 and review-8
      When review-7 completes while review-8 remains pending
      Then the run still reports waiting-for-permission for review-8
      And review-7's terminal status is not copied to review-8
      And cancellation and unrelated native events remain responsive

    @uat
    Scenario: E12 · Windows Astra verification proceeds through real automatic review
      Given a Windows story has a completed build and a reproducible sandbox-blocked Node test subprocess
      And the operator launches verification with gpt-6-astra and high effort
      When the real native automatic reviewer approves that subprocess
      Then the native operation runs and verification continues without another permission question
      And the evidence identifies the CLI version, run, native session, turn and review
      And the native test result and subsequent verification are observed
      And the completed build is not rebuilt and the selected model is unchanged
      And scripted replies or tests executed only by an external host tool do not satisfy this acceptance
