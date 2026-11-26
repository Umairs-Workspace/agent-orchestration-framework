@executable @cli @work @distribution
Feature: The practice list and the doctor say where a scoped practice lands

  WHY. A practice whose prose is for Claude alone does nothing in a project rendered only for
  Codex. Without a word from aof, the person who turns it on there sees the key accepted and the
  practice listed as on, and nothing happens. The list now names the runtimes such a practice is
  for. The doctor says once when one that is on reaches none of the project's runtimes
  (ADR-001 §5).

  "NOTES" is a scratch project initialised from a fixture bundle. That bundle declares the shipped
  practices beside a practice "notes", keyed on "work.notes.enabled", whose every fragment declares
  "runtimes": ["claude"]. The project's runtimes are the ones its lock records.

  Rule: R4 · The practice list names a scoped practice's runtimes, and the doctor says once when an on practice reaches none of the project's runtimes

    Scenario: E9 · the list names the runtimes a scoped practice is for
      When "aof work update" runs in NOTES
      Then the row for "notes" ends with "for claude"
      And the row for "discovery" reads exactly as it does today, with nothing after its key
      And in "aof work update --json", the entry for "notes" holds "runtimes": ["claude"]
      And the entry for "discovery" holds no "runtimes"

    Scenario: E10 · the doctor says once that an on practice reaches none of the project's runtimes
      Given NOTES was installed for "codex" alone
      And its config sets "work.notes.enabled" to true
      When "aof work doctor --json" runs in NOTES
      Then it reports exactly one "practice-no-effect" finding, at severity "warn"
      And its message names "notes", "claude" and "codex"
      And it says the practice's prose reaches none of the runtimes this project renders

    Scenario: E11 · a project that renders one of the practice's runtimes hears nothing
      Given NOTES was installed for "claude" and "codex"
      And its config sets "work.notes.enabled" to true
      When "aof work doctor --json" runs in NOTES
      Then it reports no "practice-no-effect" finding

    Scenario Outline: which practices the list names runtimes for
      Given the practice "notes" ships <members>
      When "aof work update --json" runs in NOTES
      Then the entry for "notes" holds <runtimes>

      Examples:
        | members                                                                 | runtimes                                |
        | one fragment for "claude" and one for "opencode"                        | "runtimes": ["claude", "opencode"]      |
        | one fragment for "opencode" and one for "claude", declared in that order | "runtimes": ["claude", "opencode"]      |
        | one Claude-only fragment and one unscoped fragment                      | no "runtimes"                           |
        | one Claude-only fragment and a template variant                         | no "runtimes"                           |

    Scenario Outline: the doctor stays quiet unless the practice is on and reaches none of the project's runtimes
      Given NOTES was installed for <installed>
      And "work.notes.enabled" is <state> in its config
      When "aof work doctor --json" runs in NOTES
      Then it reports <count> "practice-no-effect" findings

      Examples:
        | installed           | state | count |
        | "codex"             | false | 0     |
        | "codex", "opencode" | true  | 1     |
        | "opencode"          | true  | 1     |
        | "claude"            | true  | 0     |

    Scenario: the finding is told once for a scoped doctor run
      Given NOTES was installed for "codex" alone, with "work.notes.enabled" true
      When "aof work doctor <ref> --json" runs in NOTES for one of its stories
      Then it reports the "practice-no-effect" finding at most once

    Scenario: an unscoped practice is never reported as having no effect
      Given NOTES was installed for "codex" alone
      And its config sets "work.examples.enabled" to true
      When "aof work doctor --json" runs in NOTES
      Then it reports no "practice-no-effect" finding for "discovery"
