@cli @planning @distribution
Feature: The package verb writes one zip of the seven skills

  WHY. Hyperagent's Create skill dialog takes a .zip, and its agent drafts one skill per folder inside
  it. One file to upload beats seven.

  @executable
  Rule: R1 · The zip holds each skill at <id>/SKILL.md, and is the same bytes every time

    Scenario: E1 · the package verb writes the zip beside the loose files
      When "aof work integrations hyperagent package" runs
      Then "hyperagent/aof-hyperagent-skills.zip" is written under the aof home, holding "<id>/SKILL.md" for each of the seven planning skills, byte-identical to the package's own files, and nothing else

    Scenario: E2 · the same package gives the same zip bytes
      When "aof work integrations hyperagent package" runs twice
      Then both runs write byte-identical zips

    Scenario: E3 · the hand-over leads with the zip and keeps the loose files as the fallback
      When "aof work integrations hyperagent package" runs
      Then the upload steps name the zip by its full path first, and name each "SKILL.md" as the one-at-a-time fallback

    Scenario: E4 · a dry run names the zip and writes nothing
      When "aof work integrations hyperagent package --dry-run" runs
      Then the zip's path is printed among the paths, and nothing is written

  @executable
  Rule: R2 · The doctor reads the zip with the rest of the package

    Scenario Outline: the doctor reports the zip's state
      Given the aof home's package with its zip <state>
      When "aof work integrations hyperagent doctor" runs
      Then it reports the package as "<report>"

      Examples:
        | example | state                        | report  |
        | E5      | absent                       | missing |
        |         | holding an older skill's text | stale   |

  @manual
  Rule: R3 · Hyperagent turns the zip into the seven skills

    Scenario: E6 · one upload yields the seven aof skills
      Given the zip uploaded through Hyperagent's Create skill → Upload file
      When its import thread finishes and the drafts are saved
      Then the account holds the seven "aof-*" skills
