@executable @cli @work @scaffold
Feature: The operator states a role and a level per domain

  WHY. How a fact is handled depends on what the operator knows, and that differs by domain
  (SPEC Scope, third bullet). The profile is one closed block, `work.operator`, with a free-text
  role and a level per domain (ADR-003 §1). A mistyped block is diagnosed, and the resolver still
  answers, in the direction that explains more rather than less (ADR-003 §2).

  Background:
    Given a fixture project with its own empty global home, named through "AOF_GLOBAL_HOME"

  Rule: R1 · The operator states a role and a level per domain

    Scenario: E1 · a role and two levels validate clean and resolve as written
      Given the project's "work.operator" holds the role "I run the build for a lettings agency. I am a developer, not a property manager."
      And its expertise is "property-management: working" and "tenancy-law: new"
      When "aof project validate" runs and the profile is resolved
      Then validation reports no "operator-profile-" diagnostic
      And the profile is declared, with that role and those two levels

    Scenario: E2 · a level outside the three is refused, and resolves as new
      Given the project's "work.operator.expertise" holds "tenancy-law: beginner"
      When "aof project validate" runs and the profile is resolved
      Then validation reports "operator-profile-bad-value" at "work.operator.expertise.tenancy-law", naming the three levels
      And the resolved level of "tenancy-law" is "new"

    Scenario: E3 · a misspelt key is refused, not ignored
      Given the project's "work.operator" holds only the key "rol"
      When "aof project validate" runs
      Then it reports "operator-profile-unknown-key" at "work.operator.rol", naming the keys "role" and "expertise"

    Scenario: the levels are three words, exported once
      When the levels are read from "@aof/contracts/operator-profile"
      Then they are exactly "expert", "working" and "new", frozen

    Scenario Outline: what the validator admits
      Given the project's "work.operator" is <block>
      When "aof project validate" runs
      Then it reports <diagnostic>

      Examples:
        | block                                              | diagnostic                                                   |
        | absent                                             | no "operator-profile-" diagnostic                            |
        | an empty object                                    | no "operator-profile-" diagnostic                            |
        | a role only                                        | no "operator-profile-" diagnostic                            |
        | an expertise map only                              | no "operator-profile-" diagnostic                            |
        | a string                                           | "operator-profile-bad-value" at "work.operator"              |
        | an array                                           | "operator-profile-bad-value" at "work.operator"              |
        | a role of 0 characters                             | "operator-profile-bad-value" at "work.operator.role"         |
        | a role of 500 characters                           | no "operator-profile-" diagnostic                            |
        | a role of 501 characters                           | "operator-profile-bad-value" at "work.operator.role"         |
        | a role that is a number                            | "operator-profile-bad-value" at "work.operator.role"         |
        | an expertise that is a list                        | "operator-profile-bad-value" at "work.operator.expertise"    |
        | expertise with the domain "Tenancy Law"            | "operator-profile-bad-value" at "work.operator.expertise"    |
        | expertise with the domain "tenancy_law"            | "operator-profile-bad-value" at "work.operator.expertise"    |
        | expertise with the domain "tenancy-law" at "Expert" | "operator-profile-bad-value" at "work.operator.expertise.tenancy-law" |

    Scenario Outline: the resolver never throws, and reads a bad value the safe way
      Given a config whose "work.operator" is <block>
      When the profile is resolved
      Then it answers <profile>

      Examples:
        | block                                   | profile                                      |
        | a string                                | undeclared, with no role and no level        |
        | a role that is a number                 | no role                                      |
        | expertise "fraud: expert, law: guru"    | "fraud" at "expert" and "law" at "new"       |
        | expertise that is a list                | no level                                     |

    Scenario: the schema describes the block the validator admits
      When "schemas/aof.schema.json" is read
      Then "work.operator" is a closed object with a string "role" of at most 500 characters and an "expertise" map whose values are the three levels
      And its description says a machine-wide default may sit in the global config and a project overrides it

    Scenario: the global file is held to the same rules
      Given the global config's "work.operator.expertise" holds "fraud: guru"
      When "aof assets validate --global" runs
      Then it reports "operator-profile-bad-value" at "work.operator.expertise.fraud"
