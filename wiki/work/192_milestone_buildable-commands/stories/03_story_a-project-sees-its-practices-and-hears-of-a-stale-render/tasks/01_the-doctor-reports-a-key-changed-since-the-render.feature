@executable @cli @work @validate
Feature: The doctor reports a key changed since the render

  WHY. Rendered commands are committed files, so turning a key on changes nothing until the
  update runs. An operator who turns discovery on and forgets would see refine write contracts
  with no example map, and no check would notice, because the examples lane judges only a map
  that exists. So each render records what it was built with, and the work doctor compares
  (ADR-006).

  "OFF" is a scratch project initialised from the shipped bundle with neither key, then updated.
  "ON" is the same with "work.examples.enabled" true, then updated. The doctor is run as
  "aof work doctor --json".

  Rule: R2 · A key changed since the commands were rendered is reported by the work doctor, naming the key and the commands

    Scenario: E4 · a practice turned on and not yet rendered is an error
      Given OFF's config now sets "work.examples.enabled" to true, and no update has run
      When the doctor runs in OFF
      Then it reports exactly one "practice-render-stale" finding, with severity "error"
      And its message names "work.examples.enabled"
      And it names the refine command and the product-owner, architect and QA briefs
      And it ends "Run `aof work update`."

    Scenario: E5 · the update clears it
      Given the project of E4
      When "aof work update" runs, and then the doctor
      Then the doctor reports no "practice-render-stale" finding

    Scenario: E6 · a practice turned off and still rendered is a warning
      Given ON's config no longer names "work.examples.enabled", and no update has run
      When the doctor runs in ON
      Then it reports exactly one "practice-render-stale" finding, with severity "warn"
      And its message says the commands still hold the practice's prose, and names the key

    Scenario Outline: each practice is judged by itself
      Given OFF's config now sets <keys> to true, and no update has run
      When the doctor runs in OFF
      Then it reports <count> "practice-render-stale" findings, naming <named>

      Examples:
        | keys                                             | count | named                                         |
        | "work.plan.enabled"                              | 1     | "work.plan.enabled" and the refine command    |
        | "work.examples.enabled" and "work.plan.enabled"  | 2     | each key, in its own finding                  |

    Scenario Outline: a value that does not turn a key on is not a change
      Given OFF's config now sets "work.examples.enabled" to <value>
      When the doctor runs in OFF
      Then it reports no "practice-render-stale" finding

      Examples:
        | value   |
        | false   |
        | "true"  |
        | 1       |

    Scenario: a key set for the whole machine is not a change
      Given the machine-wide config sets "work.examples.enabled" to true
      And OFF's config does not name it
      When the doctor runs in OFF
      Then it reports no "practice-render-stale" finding

    Scenario: the finding is reported once, whatever the scope
      Given the project of E4, with two milestones in its stream
      When the doctor runs for the whole stream, and then for one milestone
      Then each run reports the finding exactly once

    Scenario: a dry run neither records nor clears
      Given the project of E4
      When "aof work update --dry-run" runs, and then the doctor
      Then the lock's record is unchanged
      And the doctor still reports the finding

    Scenario: each render records what it was built with
      When ".aof/aof.lock.json" is read in OFF and in ON
      Then the "work" section of each holds "practices", with one boolean for every declared practice
      And OFF's are all false, and ON's is true for "discovery" alone

    Scenario: a project freshly initialised has a record and nothing to report
      When "aof work init" runs in an empty directory, and then the doctor
      Then the lock's "work" section holds "practices"
      And the doctor reports no "practice-render-stale" and no "practice-render-unrecorded" finding

    Scenario: a practice with two keys names both
      Given a fixture practice keyed on "work.notes.enabled" and "work.notes.strict", rendered off
      And the project's config now sets both to true
      When the lane judges the project
      Then its one finding names both keys
