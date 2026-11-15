@executable @cli @work @validate
Feature: The doctor says once that no profile is declared

  WHY. A project that turned operator-aware discovery on and declared no profile is treated as
  new to every domain: every fact is researched and every question explained, and nothing says
  why (ADR-006 §5). The doctor says it, once, and names the command that fixes it. It is a
  warning, never a refusal (ADR-003 §9), and a project that left the switch off never sees it.
  "On" below means `work.examples` is `{ enabled: true, operatorAware: true }`.

  Background:
    Given a scratch project with stories "193/01" and "193/03", and its own global home

  Rule: R3 · A project that turned it on hears once that no profile is declared

    Scenario: E7 · the switch on and no profile: one warning that names the fix
      Given operator-aware discovery is on
      And neither the project nor the global config holds "work.operator"
      When "aof work doctor 193/03 --json" runs
      Then it reports exactly one "operator-profile-undeclared" finding, at severity "warn", anchored at the work directory
      And the message says every domain is being treated as new
      And the message names "aof work init-config --operator-role"

    Scenario: E8 · once a role is declared, the warning is gone
      Given operator-aware discovery is on
      And "aof work init-config --operator-role \"B\"" has run in the project
      When "aof work doctor --json" runs
      Then it reports no "operator-profile-undeclared"

    Scenario Outline: E9 · with the switch off, there is no warning
      Given "work.examples" is <examples>
      And neither config holds "work.operator"
      When "aof work doctor --json" runs
      Then it reports no "operator-profile-undeclared"

      Examples:
        | examples                                |
        | absent                                  |
        | { enabled: false }                      |
        | { enabled: true }                       |
        | { enabled: true, operatorAware: false } |
        | { enabled: false, operatorAware: true } |

    Scenario Outline: the warning is reported once, whatever is asked
      Given operator-aware discovery is on and no profile is declared
      When "aof work doctor <scope> --json" runs
      Then "operator-profile-undeclared" is reported <times>

      Examples:
        | scope            | times |
        | with no scope    | once  |
        | 193              | once  |
        | 193/01           | once  |
        | 193/03           | once  |
        | 999, which names no item | once |

    Scenario Outline: a profile declared anywhere is a profile
      Given operator-aware discovery is on
      And <declaration>
      When "aof work doctor --json" runs
      Then "operator-profile-undeclared" is <reported>

      Examples:
        | declaration                                            | reported     |
        | the global config holds a role                         | not reported |
        | the project holds one expertise entry and no role      | not reported |
        | the project's "work.operator" is an empty object       | reported     |
        | the project's "work.operator" is a string              | reported     |

    Scenario: the warning does not stop refine's Contract stage
      Given operator-aware discovery is on and no profile is declared
      And story "193/01" has a map with no error-severity finding
      When "aof work doctor 193/01 --json" runs
      Then no finding whose code starts "example-" is at severity "error"
      And "aof work continue 193/01" is not refused for the map

    Scenario: the lane is its own check group
      When the doctor's check groups are listed
      Then the operator lane comes after the examples lane
      And "packages/specification-by-example/src/doctor-lane.mjs" names no operator code
