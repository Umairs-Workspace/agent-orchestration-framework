@cli @work @work-stream
Feature: Starting work delegates approval to the native reviewer

  Rule: R1 · Starting the loop or graph delegates native approval handling

    @executable
    Scenario: E1 · An approved test operation continues without asking the operator again
      Given a launched verification selects gpt-6-astra with high effort
      And its native session requests permission for a sandbox-blocked test subprocess
      When the native automatic reviewer approves that operation
      Then the operation continues in the same native session and turn
      And the phase continues until its native result is received
      And no operator question or approval-answer record is created
      And approval alone does not settle the phase as done

    @executable
    Scenario: E4 · Launch authorization selects automatic review and preserves execution choices
      Given the native session has a configured workspace-write sandbox
      When a loop starts a Codex phase with gpt-6-astra and high effort
      Then the native thread request selects the automatic reviewer and an eligible on-request policy
      And the effective native acknowledgement is checked before phase tools run
      And the thread and turn retain the selected model and effort
      And the configured sandbox and writable roots remain unchanged
      And the user's configuration and trust files are unchanged

    @executable
    Scenario: E5 · Native permission-scope review needs no second scope-consent question
      Given the operator has launched work requiring a native permission-scope request
      When the native reviewer grants the requested access for its native lifetime
      Then work continues under that native grant without a once-versus-turn question
      And AOF neither extends the grant nor sends a second approval response
      And an ordinary business answer cannot change the grant

    @executable
    Scenario Outline: Admitted profiles acknowledge delegation before new or resumed work
      Given Codex version <version> supplies its version-specific protocol fixture
      When AOF <operation> the native thread for a driven phase
      Then the request selects native automatic review
      And a matching effective reviewer and policy permit turn execution
      And the phase brief identifies the authorized work without claiming unrestricted authority

      Examples:
        | version         | operation |
        | 0.160.0         | starts    |
        | 0.160.0         | resumes   |
        | 0.162.0-alpha.2  | starts    |
        | 0.162.0-alpha.2  | resumes   |

    @executable
    Scenario Outline: Unavailable automatic review cannot silently become another permission mode
      Given the native setup returns <condition>
      When AOF establishes the driven phase
      Then it reports an explicit automatic-review capability or policy failure
      And no phase tool executes
      And no user-approval prompt, unconditional grant or provider fallback is introduced
      And the native process is released within the existing cleanup bound

      Examples:
        | condition                              |
        | unsupported admitted profile fields    |
        | reviewer selection rejected by policy  |
        | effective reviewer is user             |
        | effective reviewer is absent           |
        | effective approval policy is never     |
        | malformed thread acknowledgement       |

    @executable
    Scenario: Claude retains its existing automatic approval behavior
      Given the same work is selected to run with Claude
      When the existing Claude phase driver launches or resumes it
      Then its existing automatic permission mode and model choices are unchanged
      And no Codex reviewer options or new approval prompts reach the Claude launch
