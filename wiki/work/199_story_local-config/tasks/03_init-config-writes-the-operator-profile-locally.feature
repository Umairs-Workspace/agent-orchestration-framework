@executable @cli @work @scaffold
Feature: init-config writes the operator profile to the local file by default

  WHY. The operator profile says who one person is and what they know. On a shared repository,
  writing it to the committed file is exactly how one person's profile became everyone's. So
  `init-config` writes it to the local file by default, and to the committed file only when asked
  with `--project` (199 Q2, answered 2026-11-17). A profile already committed by a one-person
  repository keeps working, beneath any local one.

  Background:
    Given a scratch git repository with aof initialised, and its own global home, named through "AOF_GLOBAL_HOME"

  Rule: R4 · The operator profile is written to the local file by default

    Scenario: E11 · the profile goes to a new local file, and the project file is untouched
      Given no local file exists
      When "aof work init-config --operator-role 'Product owner'" runs
      Then ".aof/aof.config.local.json" exists and its "work.operator.role" is "Product owner"
      And ".aof/aof.config.json" is byte-for-byte unchanged
      And the output names the local file as where the profile was written

    Scenario: E12 · --project writes it to the committed file
      When "aof work init-config --project --operator-role 'Product owner'" runs
      Then ".aof/aof.config.json"'s "work.operator.role" is "Product owner"
      And no local file has been created

    Scenario: E13 · a profile already committed is still read, beneath the local one
      Given the project's "work.operator" is "{ role: 'Solo dev', expertise: { mesh: expert } }"
      And no local file exists
      When the project's workspace is loaded and the operator profile is resolved
      Then the role is "Solo dev" and "mesh" is "expert"

    Scenario Outline: profile flags land in the local file, and other settings do not
      Given a local file whose "work.operator.role" is "Old"
      When <command> runs
      Then <outcome>

      Examples:
        | command                                                              | outcome                                                                                 |
        | "aof work init-config --expertise ui=new"                            | the local file's expertise holds "ui: new" and its role is still "Old"                  |
        | "aof work init-config --operator-role 'New'"                         | the local file's role is "New"                                                          |
        | "aof work init-config --operator-aware on"                           | the project's "work.examples.operatorAware" is true and the local file is unchanged     |
        | "aof work init-config --global --operator-role 'G'"                  | the global file's role is "G" and neither project nor local file has changed            |
        | "aof work init-config --project --global --operator-role 'X'"        | it is refused, saying "--project" and "--global" name different files, and nothing changed |

    Scenario: the local file it writes is kept out of git
      Given ".aof/.gitignore" holds no "aof.config.local.json" entry
      When "aof work init-config --operator-role 'Product owner'" runs
      Then ".aof/.gitignore" holds the entry "aof.config.local.json"
      And "git status --porcelain" does not list ".aof/aof.config.local.json"
