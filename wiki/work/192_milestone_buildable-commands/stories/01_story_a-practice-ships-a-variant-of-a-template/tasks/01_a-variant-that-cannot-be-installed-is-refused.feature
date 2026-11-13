@executable @cli @assets @validate
Feature: A variant that cannot be installed is refused

  WHY. One installed path can hold one text. If two practices each replaced the same template,
  the one that won would depend on an order nobody chose, and a project would copy a form it did
  not ask for. So the update stops and says which two, and a variant of a file that does not
  exist never loads (ADR-004 §3).

  Rule: R2 · A variant that cannot be installed is refused, and nothing is written

    Scenario: E4 · two variants of one file that are both on are refused
      Given the practices "notes" and "memos", each with a variant of the story template's "EXAMPLES.md"
      And a project whose config turns both on
      When "aof work update" runs
      Then it is refused, naming both variants and the file
      And no file in the project has changed, the install manifest included

    Scenario: the same two variants are fine while only one is on
      Given the same two practices
      And a project whose config turns "notes" on and leaves "memos" off
      When "aof work update" runs
      Then the installed "EXAMPLES.md" holds the variant of "notes"

    Scenario: E5 · a variant of a file the template does not hold is refused at load
      Given a variant that names the story template's "NOTES.md"
      When the bundle is loaded
      Then the load is refused, naming the variant, the file and the contributing package

    Scenario Outline: a faulty variant is refused at load
      Given a bundle fragment in which <fault>
      When the bundle is loaded
      Then the load is refused, naming <named>

      Examples:
        | fault                                                  | named                          |
        | a variant names a template no bundle declares          | the variant and the template   |
        | a variant names a practice no bundle declares          | the variant and the practice   |
        | a variant's own file is missing                        | the variant and the file       |
        | a variant's id is already declared by another member   | the member and both packages   |
        | a variant's file name holds a path separator           | the variant and the name       |

    Scenario: a dry run of a refused update is refused too
      Given the two practices of E4, both on
      When "aof work update --dry-run" runs
      Then it is refused with the same message
