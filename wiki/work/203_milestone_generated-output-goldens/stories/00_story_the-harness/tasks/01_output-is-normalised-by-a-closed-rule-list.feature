@executable @cli @assets @scaffold
Feature: Output is normalised by a closed rule list

  WHY. One baseline has to hold on macOS, Windows and Linux, and on every run. Some values are
  meant to differ: an instant, a temp path, a content hash, the version. Those are normalised.
  Anything else that differs is a defect in the render, fixed where it is rendered. A rule that
  hid it would be a green suite over an unstable product (ADR-002).

  Background:
    Given a scenario whose temp project is "<root>/project" and whose temp home is "<root>/home"

  Rule: R2 · Six rules normalise what is meant to vary, and nothing else

    Scenario: the rules are six, in a fixed order
      When the normaliser's rule list is read
      Then its ids are "eol", "temp-paths", "instants", "hashes", "version" and "build-id", in that order

    Scenario Outline: each rule rewrites what it names
      Given a captured file holding <input>
      When the file is normalised
      Then it holds <output>

      Examples:
        | example | input                                                         | output                                    |
        | E6      | "generatedAt": "2026-11-20T18:24:42.679Z"                     | "generatedAt": "<timestamp>"              |
        |         | 2026-11-20T18:24:42Z                                          | <timestamp>                               |
        |         | the project path, then "/.claude/settings.json"               | <project>/.claude/settings.json           |
        |         | the home path, then "/mesh/nodes"                             | <home>/mesh/nodes                         |
        | E7      | the project path with "\\" separators, JSON-escaped           | <project>, with "/" after it              |
        | E8      | the project path's realpath form, then "/a.md"                | <project>/a.md                            |
        | E9      | sha256: and 64 hex digits                                     | sha256:<hash>                             |
        |         | the running aof's version in "version": "…"                   | "version": "<version>"                    |
        |         | the running build's id, where one is set                      | <build-id>                                |

    Scenario Outline: E10 · what no rule names is left exactly as it was
      Given a captured file holding <input>
      When the file is normalised
      Then it is byte-for-byte unchanged

      Examples:
        | example | input                                          |
        | E10     | a prose line holding "matches \d+\\.md"        |
        | E10     | "10.1.0", where the running version is "0.1.0" |
        |         | "sha256:abc"                                   |
        |         | "2026-11-20", a date with no time              |
        |         | a Windows path that is not the temp root       |

    Scenario: E11 · line endings are normalised in every captured file
      Given a captured file holding "a\r\nb\r\n" and its baseline holding "a\nb\n"
      When the scenario is compared
      Then the file is not reported as changed

    Scenario: step envelopes are normalised by the same rules
      Given a step whose envelope holds the project path and an instant
      When the step records are normalised
      Then the envelope holds "<project>" and "<timestamp>" in their places

    Scenario: E12 · a file that is not valid UTF-8 fails by name
      Given a captured file "bin/blob" holding bytes that are not valid UTF-8
      When the scenario is normalised
      Then the scenario fails naming "project/bin/blob"
      And nothing is compared
