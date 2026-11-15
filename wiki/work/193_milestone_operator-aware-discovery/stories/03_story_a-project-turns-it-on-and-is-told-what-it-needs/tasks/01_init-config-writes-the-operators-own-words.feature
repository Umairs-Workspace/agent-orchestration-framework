@executable @cli @work @scaffold
Feature: `aof work init-config` writes the operator's own words

  WHY. The config has one writer, and a profile nobody can set without hand-editing JSON is a
  profile nobody sets (ADR-006 §4). Unlike the tag vocabulary, which fills a hole, a profile flag
  replaces what it names: the operator is correcting a statement about themselves. `--global`
  writes the machine-wide default. A value the validator would refuse is refused before any file
  is written. The profile is written whether or not the switch is on: it is the operator's
  statement, and a project may turn the switch on later.

  Background:
    Given a scratch project and its own global home, named through "AOF_GLOBAL_HOME"

  Rule: R2 · A flag replaces what it names, and leaves the rest

    Scenario: E4 · one level is corrected and the rest is left alone
      Given the project's profile holds the role "B" and the expertise "fraud: new" and "tenancy-law: expert"
      When "aof work init-config --expertise fraud=working --json" runs
      Then the project's expertise is "fraud: working" and "tenancy-law: expert"
      And the role is still "B"
      And every other key of the config is unchanged

    Scenario: E5 · the machine-wide default is written to the global file only
      When "aof work init-config --global --operator-role \"A\" --json" runs in the project
      Then the global config's "work.operator.role" is "A"
      And the project's config file is byte-for-byte what it was
      And "aof assets validate --global" accepts the global config

    Scenario: E6 · a level outside the three is refused before anything is written
      When "aof work init-config --expertise fraud=guru --json" runs
      Then it is refused with code "operator-profile-bad-value", naming the three levels
      And neither config file has changed

    Scenario: a role is stored exactly as it was given
      When "aof work init-config --operator-role \"I build the software for a fraud team. I am not a fraud analyst.\" --json" runs
      Then the project's "work.operator.role" is that text, character for character
      And the result says the profile was written to the project

    Scenario: a run with no profile flag leaves the profile alone
      Given the project's profile holds the role "B"
      When "aof work init-config --layers @cli --json" runs
      Then the role is still "B"
      And the result says the profile was not written

    Scenario Outline: what the profile flags accept
      When "aof work init-config <flags> --json" runs
      Then it <outcome>

      Examples:
        | flags                                         | outcome                                                    |
        | --expertise fraud=expert,tenancy-law=new      | writes both levels                                         |
        | --expertise fraud=expert --operator-role "B"  | writes the level and the role                              |
        | --expertise fraud                             | is refused "operator-profile-bad-value" and writes nothing |
        | --expertise Fraud=expert                      | is refused "operator-profile-bad-value" and writes nothing |
        | --expertise fraud=expert,fraud=new            | is refused "operator-profile-bad-value" and writes nothing |
        | --operator-role ""                            | is refused "operator-profile-bad-value" and writes nothing |
        | --operator-role with 501 characters           | is refused "operator-profile-bad-value" and writes nothing |
        | --global --layers @cli                        | is refused, saying "--global" writes the profile only      |
        | --operator-aware on --operator-role "B", with discovery on | turns the switch on and writes the role       |
        | --global with no profile flag                 | is refused, saying "--global" writes the profile only      |

    Scenario: the global flag creates a valid file where there is none
      Given the global home holds no config
      When "aof work init-config --global --expertise fraud=expert --json" runs
      Then the global config exists, holds "fraud: expert", and "aof assets validate --global" accepts it

    Scenario: what the verb wrote is what the resolver reads
      When "aof work init-config --operator-role \"B\" --expertise fraud=working" runs, then "aof project show --json"
      Then "operator.role" is "B" from "project" and "fraud" is "working" from "project"

    Scenario: the verb's usage names the four flags
      When the usage of "aof work init-config" is read
      Then it names "--operator-aware", "--operator-role", "--expertise" and "--global"
