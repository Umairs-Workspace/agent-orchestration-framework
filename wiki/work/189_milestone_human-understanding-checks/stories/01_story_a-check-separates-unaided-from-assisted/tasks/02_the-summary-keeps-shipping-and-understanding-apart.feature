@executable @work @assets
Feature: the summary keeps shipping and understanding apart

  WHY. "It shipped" and "I understood it" are different claims, and a single verdict would let the
  first stand in for the second (SPEC Objective, ADR-004). So the summary has two halves, reports
  help from the build only when the session saw it, prints its own limits every time, and leaves a
  human's disagreement standing. These scenarios read `grill-me.md`'s `<summary>` region and
  `teach.md`'s `<output>` region.

  Rule: R3 · Shipping and understanding are reported apart

    Scenario: E8 · a done story with revealed answers keeps both halves
      When the `<summary>` region is read
      Then it has a Shipping half read from the story's status, with `done — accepted` among its meanings
      And it has an Understanding half with one line per check giving its kind, help, result, gap and next practice
      And it says the two halves are never merged into one verdict

    Scenario: E9 · help during the build that this session did not see is not observed
      When the `<summary>` region is read
      Then it says help during the build is reported from the rung labels a teaching session printed earlier in this session
      And it says that otherwise the summary reads `help during the build: not observed by this session`

    Scenario: E10 · a disagreement is shown beside the result, which stands
      When the `<summary>` region is read
      Then it says a human's disagreement with a result is printed beside that result
      And it says the result is not changed to settle the disagreement

    Scenario Outline: the Shipping half gives each status its meaning
      When the `<summary>` region is read
      Then it maps the status `<status>` to "<meaning>"

      Examples:
        | status      | meaning             |
        | in-progress | not reviewed        |
        | in-review   | the review was clean |
        | done        | accepted            |

    Scenario: scenario results are reported only when the human ran them
      When the `<summary>` region is read
      Then it says scenario results appear only when the human ran the tests in this session
      And it says that otherwise they read `not observed by this check`

    Scenario: the limits are printed every time
      When the `<summary>` region is read
      Then it says the unaided/assisted line is the session's instruction inside one conversation, not an enforced separation
      And it says a check that went well does not show durable learning

    Scenario: each gap comes with one next practice opportunity from the story
      When the `<summary>` region is read
      Then it says each gap names one next practice opportunity grounded in the story: a scenario to reread, an example to predict or a file to trace

    Scenario: teaching names the check as optional, after review
      When `packages/learning/assets/commands/teach.md`'s `<output>` region is read
      Then the `taught:` outcome names `aof:review <ref>` next, as before
      And it names `aof:grill-me <ref>` as an optional step, never as a gate
