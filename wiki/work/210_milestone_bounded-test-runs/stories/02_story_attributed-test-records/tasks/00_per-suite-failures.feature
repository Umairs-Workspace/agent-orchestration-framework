@cli @work @validate
Feature: each failure carries the suite that held it

  WHY. A fix round reruns the failing suites, and a red can answer a narrower question, only when
  each failure names its suite (ADR-002, ADR-004). The light entry already prints a
  `# file <path> <seconds> <executed>` line as each suite's cases finish, so the TAP reader can
  attribute each case to the suite it came from without a second report. A failure that cannot be
  attributed is kept, marked unknown, and never guessed.

  Rule: R1 · Each failure carries the suite that held it

    @executable
    Scenario: E1 · a failure in the second of two suites names the second suite
      Given light-entry TAP output for "test/a.test.mjs" with 2 passing cases
      And then for "test/b.test.mjs" with 1 passing case and 1 failing case "b fails"
      When the output is normalised
      Then the failure "b fails" carries file "test/b.test.mjs"

    @executable
    Scenario: E2 · a crash before any file line leaves the failure unattributed
      Given TAP output whose only failure is printed before any "# file" line
      When the output is normalised
      Then that failure carries file null

    @executable
    Scenario Outline: attribution follows the file lines, in order
      Given light-entry TAP output where <layout>
      When the output is normalised
      Then the failures carry <files>

      Examples:
        | layout                                                                 | files                                         |
        | "a" fails 1 case and "b" fails 1 case                                  | "test/a.test.mjs" and "test/b.test.mjs"       |
        | "a" fails 2 cases and "b" passes                                       | "test/a.test.mjs" twice                       |
        | a failing case follows the last "# file" line                          | null for that case                            |
        | one suite fails its import and prints its file line with 0 executed    | that suite's file for the load failure        |

    @executable
    Scenario: output from a runner that prints no file lines is unchanged apart from a null file
      Given plain TAP output with 1 failing case and no "# file" lines
      When the output is normalised
      Then the cases, statuses and failure messages are what they were before this change
      And the failure carries file null
