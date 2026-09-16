@executable @cli @work @work-stream
Feature: The bound is enforced, never advertised — and the CLI's own caps stay unreachable here

  The SPEC asked for `--max-turns` and `--max-budget-usd` "where the spawn path supports them".
  Refine measured the installed binary (`claude 2.1.233`, 2026-08-21) and the answer is that the
  spawn path supports neither:

    - `claude --help` contains no `--max-turns` at all.
    - `--max-budget-usd` exists and its own help line ends *"(only works with `--print`)"*.

  Nor is `--print` available to reach it. The worker launch is forbidden from carrying
  `-p` / `--print` / `--output-format` by a shipped, currently-green fitness function — on measured
  evidence that a `-p` turn cannot pause to ask a human and reports completion indistinguishably
  from real completion. Reaching the in-process caps would mean reverting a guard this repo built
  after an incident.

  That is why the deadlines of this story's siblings are enforced out-of-process, and why this
  contract exists: to state as a rule what would otherwise be an accident of nobody having tried.
  The failure mode being engineered out is not a crash — it is a future change that adds a bound
  argv, gets it silently ignored because the flag needs a mode aof cannot use, and leaves everyone
  believing there is a budget.

  The second rule is separate and just as load-bearing: **aof does not tell the agent its budget
  and hope.** A cap the model is asked to respect is the failure this milestone is named after.
  Where the cap is SPOKEN — how review rounds are worded, findings-become-work-items — is milestone
  71's, and a prompt-layer edit here is refused on ADR-004.

  ADR-004. FF-6905 (an extension of the existing launch-argv guard).

  Scenario: no in-process bound argv is constructed for the interactive driver
    Given every module that contributes to a spawn
    When the launch argv is assembled
    Then no turn-limit argument is present
    And no budget argument is present

  Scenario: the one-shot print form stays absent
    Given a resolved worker launch
    When its argv is inspected
    Then no print flag is present
    And no non-interactive output-format flag is present

  Scenario: the enforcement holds a handle rather than passing a number
    Given an attempt with a deadline armed
    When the deadline is inspected
    Then it is held by the process that spawned the session
    And nothing about it was passed into the session's own arguments

  Scenario Outline: what the launch must and must not carry
    Given a resolved worker launch
    When its argv is inspected
    Then <argument> is <presence>

    Examples: this task owns the first three; the rest are inherited and must hold
      | argument                             | presence |
      | a turn-limit argument                | absent   |
      | a budget argument                    | absent   |
      | a one-shot print flag                | absent   |
      | a non-interactive output-format flag | absent   |
      | an appended system prompt            | present  |
      | the permission mode                  | present  |

  Scenario: the headless driver that does have a timeout is untouched
    Given the non-interactive driver that already carries a process timeout
    When its command is built
    Then it is byte-identical to before this milestone
    And its timeout is unchanged
