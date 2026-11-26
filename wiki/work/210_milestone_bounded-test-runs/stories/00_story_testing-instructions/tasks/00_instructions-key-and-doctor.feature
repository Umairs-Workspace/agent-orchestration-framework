@cli @work @validate
Feature: a project names its testing instructions, and a project without them is told how to get them

  WHY. Agents choose suites from the project's own plain words (ADR-001). That works only if the
  words exist and every project can find out that they should. The key is compiled with the rest
  of the test declaration. The doctor and `aof work update` name the gap and its repair, which is
  the adoption path for every project already on aof. The coupling, work-dir and graph-freshness
  checks existed only to stop `impacted` widening, so they leave with it (ADR-008).

  Rule: R2 · A project with no instructions file is told how to get one

    @executable
    Scenario: E4 · a declared test runner with no instructions key gets one doctor warning
      Given a project whose config declares "work.test" with no "instructions" key
      When I run "aof work doctor --json"
      Then exactly one check "test-instructions" has severity "warning"
      And its message names "/aof:map-tests"

    @executable
    Scenario: E5 · a declared instructions path that does not exist is refused when the declaration compiles
      Given a project whose "work.test.instructions" is "docs/TESTS.md" and no such file exists
      When its test declaration is compiled, as every aof test run and the gate compile it
      Then the compile is refused with code "test-instructions-missing", naming "docs/TESTS.md"
      And "aof work doctor --json" reports "test-instructions" with severity "error", naming "docs/TESTS.md"

    @executable
    Scenario: aof work update prints the same warning a project's doctor gives
      Given a project whose config declares "work.test" with no "instructions" key
      When I run "aof work update"
      Then the output carries one line starting "warning: test-instructions -"

    @executable
    Scenario Outline: the test-layout family keeps only the checks that still mean something
      Given a project with a declared "work.test" and a declared gate
      When I run "aof work doctor --json"
      Then the check <id> is <presence>

      Examples:
        | id                             | presence |
        | "test-instructions"            | present  |
        | "test-layout-suites"           | present  |
        | "test-layout-resume"           | present  |
        | "test-layout-couplings"        | absent   |
        | "test-layout-couplings-match"  | absent   |
        | "test-layout-workdir"          | absent   |
        | "test-layout-graph-fresh"      | absent   |

    @executable
    Scenario: a present instructions file is reported as ok and named
      Given a project whose "work.test.instructions" is "wiki/TESTING.md" and the file exists
      When I run "aof work doctor --json"
      Then the check "test-instructions" has severity "ok" and names "wiki/TESTING.md"

    @executable
    Scenario: E10 · E11 · this repository declares its instructions, and they cover its hazards
      Given this repository's ".aof/aof.config.json"
      Then "work.test.instructions" is "wiki/TESTING.md"
      And "wiki/TESTING.md" says a change to only "wiki/work/**" records needs no run
      And it names "test/store/global-work-propagation.test.mjs" as binding ":4182"
      And it says how to run a workspace's native "node:test" files
      And it says the whole tree is the regression gate's
