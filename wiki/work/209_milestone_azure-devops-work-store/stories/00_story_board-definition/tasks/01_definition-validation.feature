@cli @work @validate
Feature: Refuse an unusable board definition before changing the board
  Rule: R2 · Only a valid definition and an explicitly selected project adapter can reach the board
    @executable
    Scenario: E3 · Duplicate YAML keys identify the invalid mapping
      Given the selected manifest repeats the same state mapping key on two lines
      When I run "aof work find 17 --json"
      Then the command fails with the duplicate key and the adapter import count is zero

    @executable
    Scenario: E4 · The selected module must resolve inside the project's real .aof directory
      Given the selected manifest refers to a symlink to a module outside .aof
      When I request the first board read
      Then the command identifies the adapter path as invalid and the module never runs

    @executable
    Scenario Outline: Reject invalid data before importing the module
      Given a project with <invalid selection>
      When I request a board read
      Then the refusal identifies <subject> and no adapter has run

      Examples:
        | invalid selection                              | subject             |
        | an unsupported work.store string               | work.store          |
        | a manifest symlink resolving outside .aof       | manifest path       |
        | a malformed YAML document                      | manifest location   |
        | an unsupported schema version                  | version             |
        | a missing required relation mapping            | missing mapping     |
        | a missing change-read binding                  | missing operation   |
        | attachment support enabled without a copy binding | attachment binding |

    @executable
    Scenario: A declared operation has no callable export
      Given a valid definition whose apply binding names a missing adapter operation
      When the selected store receives its first mutation
      Then the refusal names that operation and the board receives zero mutations
