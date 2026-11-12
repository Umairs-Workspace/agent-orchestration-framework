@executable @cli @work @scaffold
Feature: A project overrides the machine-wide default, key by key

  WHY. An operator is one person across projects, so the profile has a default for the whole
  machine in `~/.aof/aof.config.json`; and they can be expert in one project's domain and new to
  another's, so a project corrects what differs (ADR-003 §4). The merge has one home, and every
  reader, code or session, gets the same answer (ADR-003 §5, §6).

  Background:
    Given a fixture project with its own global home, named through "AOF_GLOBAL_HOME"
    And the global config's "work.operator" holds the role "A" and the expertise "fraud: expert" and "tenancy-law: new"

  Rule: R2 · A project's statement overrides the machine-wide one, key by key

    Scenario: E4 · a project corrects one level and keeps the rest
      Given the project's "work.operator" holds only the expertise "tenancy-law: working"
      When the project's workspace is loaded and the profile is resolved from its config
      Then the role is "A"
      And "fraud" is "expert" and "tenancy-law" is "working"

    Scenario: E5 · a project states its own role and keeps the machine's levels
      Given the project's "work.operator" holds only the role "B"
      When the project's workspace is loaded and the profile is resolved from its config
      Then the role is "B"
      And "fraud" is "expert" and "tenancy-law" is "new"

    Scenario: E6 · project show answers the resolved profile and where each value came from
      Given the project's "work.operator" holds only the expertise "tenancy-law: working"
      When "aof project show --json" runs in the project
      Then "operator.declared" is true
      And "operator.role" is "A" with "operator.roleSource" "global"
      And "operator.expertise" lists "fraud" at "expert" from "global" and "tenancy-law" at "working" from "project"

    Scenario Outline: each key is merged on its own
      Given the project's "work.operator" is <project>
      When the profile is resolved for the project
      Then the role is <role> and the levels are <levels>

      Examples:
        | project                                   | role | levels                                      |
        | absent                                    | "A"  | fraud expert, tenancy-law new               |
        | an empty object                           | "A"  | fraud expert, tenancy-law new               |
        | the role "B" and "fraud: new"             | "B"  | fraud new, tenancy-law new                  |
        | the expertise "credit-risk: working"      | "A"  | fraud expert, tenancy-law new, credit-risk working |
        | an empty expertise map                    | "A"  | fraud expert, tenancy-law new               |

    Scenario: a project with no global file resolves from its own block alone
      Given the global home holds no config
      And the project's "work.operator" holds the role "B"
      When "aof project show --json" runs in the project
      Then "operator.role" is "B" with "operator.roleSource" "project"

    Scenario: an unreadable global file never breaks a project
      Given the global config is not valid JSON
      And the project's "work.operator" holds the role "B"
      When the project's workspace is loaded
      Then it loads, and the resolved role is "B"

    Scenario: the merge is in memory and is never written back
      Given the project's "work.operator" holds only the expertise "tenancy-law: working"
      When the project's workspace is loaded and "aof project show --json" runs
      Then the project's config file is byte-for-byte what it was
      And the global config file is byte-for-byte what it was

    Scenario: project show names the profile in its text face
      When "aof project show" runs in the project
      Then one line says whether an operator profile is declared and how many domains it lists
