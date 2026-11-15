@executable @cli @work @distribution
Feature: Update lists the optional practices

  WHY. A practice that is off leaves no trace in a project's commands, so a project could never
  learn it exists. The update is the one command every project on aof runs, and it now says what
  could be turned on, whether it is, and how (ADR-007). It is the adoption path for every
  practice that ships prose.

  "NEW" is a scratch project initialised from the shipped bundle with neither key in its config.
  The shipped bundle declares two practices: "discovery", keyed on "work.examples.enabled", and
  "build-brief", keyed on "work.plan.enabled".

  Rule: R1 · `aof work update` lists each optional practice, whether it is on, and the key that turns it on

    Scenario: E1 · this checkout sees both of its practices on
      When "aof work update --dry-run" runs in this checkout
      Then its output lists "discovery" as on, with "work.examples.enabled"
      And it lists "build-brief" as on, with "work.plan.enabled"

    Scenario: E2 · a new project sees what it could turn on, and how
      When "aof work update" runs in NEW
      Then its output lists "discovery" and "build-brief" as off, each with its key and a one-line summary
      And the line above the list says to set every key to true in ".aof/aof.config.json" and then run "aof work update"

    Scenario: E3 · the list is in the JSON output
      When "aof work update --json" runs in NEW
      Then "practices" holds one entry for "discovery" and one for "build-brief"
      And each entry holds its "id", "title", "summary", "keys" and "on", with "on" false

    Scenario: the list follows the project's config
      Given NEW's config sets "work.examples.enabled" to true
      When "aof work update" runs
      Then "discovery" is listed as on and "build-brief" as off

    Scenario Outline: the list and the render agree on what is on
      Given NEW's config sets "work.examples.enabled" to <value>
      When "aof work update" runs
      Then "discovery" is listed as <listed>
      And NEW's refine command <holds> the discovery beat

      Examples:
        | value   | listed | holds         |
        | true    | on     | holds         |
        | false   | off    | does not hold |
        | "true"  | off    | does not hold |
        | 1       | off    | does not hold |

    Scenario: a key set for the whole machine is not listed as on
      Given the machine-wide config sets "work.examples.enabled" to true
      And NEW's config does not name it
      When "aof work update" runs in NEW
      Then "discovery" is listed as off

    Scenario: a practice with two keys lists both
      Given a fixture practice keyed on "work.notes.enabled" and "work.notes.strict"
      When the update's output is rendered for a project with the first key on
      Then the practice is listed as off, with "work.notes.enabled + work.notes.strict"

    Scenario: the practices are listed in the order they are declared
      When "aof work update" runs in NEW
      Then core's practices come first, then each practice package's, in registry order

    Scenario: the list comes after the summary and before any warning
      Given NEW has a test layout the update warns about
      When "aof work update" runs
      Then the "Updated ACD" line comes first, then the list, then the warning

    Scenario: a bundle that declares no practice prints no list
      Given a fixture bundle with no practice
      When the update's output is rendered
      Then it holds no "Optional practices" line

    Scenario: a project that was never initialised is told to initialise, and nothing else
      When "aof work update" runs in an empty directory
      Then it says to run "aof work init" first
      And it prints no list

    Scenario: init does not print the list
      When "aof work init" runs in an empty directory
      Then its output holds no "Optional practices" line

    Scenario: the reference says where a project sees its practices
      When "wiki/reference/practice-prose.md" is read
      Then it says "aof work update" lists each practice, whether it is on and its keys
      And it says "aof work doctor" reports a key changed since the last update
