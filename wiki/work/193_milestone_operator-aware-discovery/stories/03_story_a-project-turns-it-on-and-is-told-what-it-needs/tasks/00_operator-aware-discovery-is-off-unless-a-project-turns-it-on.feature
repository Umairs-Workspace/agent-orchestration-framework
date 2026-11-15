@executable @cli @work @scaffold
Feature: Operator-aware discovery is off unless a project turns it on

  WHY. Not every project needs facts looked up and questions explained: where the operator is the
  domain expert, that is cost with no benefit. So the practice is opt-in, behind one key in the
  project's config, `work.examples.operatorAware` (ADR-006 §1). It means nothing without
  discovery, it has no machine-wide form because rendered commands are committed, and turning it
  on is one command that says at once what is still missing (ADR-006 §4, §5).

  Background:
    Given a scratch project and its own global home, named through "AOF_GLOBAL_HOME"

  Rule: R1 · Operator-aware discovery is off unless a project turns it on

    Scenario: E1 · with the key absent, the switch is off
      Given "work.examples" is "{ enabled: true }"
      When the switch is resolved, and "aof project validate" and "aof work doctor --json" run
      Then the switch resolves off
      And validation reports no "examples-" diagnostic
      And the doctor reports no "operator-profile-undeclared"

    Scenario: E2 · one command turns it on and says what is still missing
      Given "work.examples" is "{ enabled: true }" and no profile is declared anywhere
      When "aof work init-config --operator-aware on" runs
      Then "work.examples.operatorAware" is true and every other key is unchanged
      And the output says no operator profile is declared and names "aof work init-config --operator-role"
      And the output says to run "aof work update" to render it

    Scenario: E3 · it cannot be turned on without discovery
      Given "work.examples" is absent
      When "aof work init-config --operator-aware on --json" runs
      Then it is refused with code "examples-operator-aware-without-discovery", naming "work.examples.enabled"
      And no file has changed

    Scenario Outline: only the boolean true, beside discovery, turns it on
      Given "work.examples" is <examples>
      When the switch is resolved and "aof project validate" runs
      Then the switch resolves <resolved>
      And validation reports <diagnostic>

      Examples:
        | examples                                   | resolved | diagnostic                                                            |
        | absent                                     | off      | no "examples-" diagnostic                                             |
        | { enabled: true }                          | off      | no "examples-" diagnostic                                             |
        | { enabled: true, operatorAware: false }    | off      | no "examples-" diagnostic                                             |
        | { enabled: true, operatorAware: true }     | on       | no "examples-" diagnostic                                             |
        | { enabled: true, operatorAware: "true" }   | off      | "examples-gate-bad-value" at "work.examples.operatorAware"            |
        | { enabled: true, operatorAware: 1 }        | off      | "examples-gate-bad-value" at "work.examples.operatorAware"            |
        | { enabled: false, operatorAware: true }    | off      | "examples-operator-aware-without-discovery" at "work.examples.operatorAware" |
        | { operatorAware: true }                    | off      | "examples-operator-aware-without-discovery" at "work.examples.operatorAware" |
        | { enabled: true, operatorAwar: true }      | off      | "examples-gate-unknown-key" at "work.examples.operatorAwar"           |

    Scenario: the switch is the project's alone
      Given the global config's "work.examples" is "{ enabled: true, operatorAware: true }"
      And the project's "work.examples" is "{ enabled: true }"
      When the project's workspace is loaded and the switch is resolved from its config
      Then the switch resolves off

    Scenario: the switch has no machine-wide flag
      When "aof work init-config --global --operator-aware on --json" runs
      Then it is refused, saying the switch is set per project
      And neither config file has changed

    Scenario: it can be turned off again, and the profile stays
      Given the switch is on and the project's profile holds the role "B"
      When "aof work init-config --operator-aware off" runs
      Then "work.examples.operatorAware" is false
      And the role is still "B"

    Scenario: turning it on with a profile already declared says nothing is missing
      Given "work.examples" is "{ enabled: true }" and the global config holds a role
      When "aof work init-config --operator-aware on" runs
      Then the output names no "operator-profile-undeclared"

    Scenario: the schema describes the key
      When "schemas/aof.schema.json" is read
      Then "work.examples" admits a boolean "operatorAware"
      And its description says it is off by default, needs "enabled", and is read from the project's config only

    Scenario: the switch gates no code path of the map
      Given a story whose map uses "domain", "policy" and "researched F1", with "F1" sourced
      When "aof work doctor --json" runs with the switch off, then with it on
      Then the "example-" findings are the same both times
