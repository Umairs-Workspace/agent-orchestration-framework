@cli @work @validate
Feature: the old selection is gone, with no compatibility layer

  WHY. The operator rewrote the testing approach and kept nothing for compatibility (STATE,
  operator decisions). A removed form or key that still half-worked would be the old selection
  wearing new names. So every removed flag is unknown, the removed config key is refused by name
  with its repair, and the code that read the code graph for tests is gone (ADR-008, FF-21001).

  Rule: R4 · The old selection is gone

    @executable
    Scenario Outline: E9 · each removed flag is unknown
      When I run <command>
      Then it is refused as an unknown flag, naming it
      And no runner is launched

      Examples:
        | command                                                  |
        | "aof test --scope impacted"                              |
        | "aof test --scope all"                                   |
        | "aof test test/a.test.mjs --scope file --reason probe"   |
        | "aof test --story 17/02"                                 |
        | "aof test --since HEAD~1"                                |
        | "aof test --commit HEAD --plan"                          |

    @executable
    Scenario: E10 · a config that still declares couplings is refused by name
      Given a project whose "work.test" declares "couplings"
      When I run "aof test test/a.test.mjs --reason probe"
      Then it is refused as "test-config-key-removed", naming "work.test.couplings" and saying to delete it
      And "aof project doctor --json" reports the same key as removed

    @executable
    Scenario: this repository's config carries no removed key
      Given this repository's ".aof/aof.config.json"
      Then "work.test" has no "couplings" key

    @executable
    Scenario: the test command's help names only the four forms
      When I run "aof test --help"
      Then the usage names "<suite>… --reason", "--suggest", "--failed" and "--all"
      And it names neither "--scope", "impacted", "--story", "--since", "--commit" nor "--plan"

    @executable
    Scenario: tests run with no code graph present
      Given a temporary repository with no code graph built
      When I run "aof test test/a.test.mjs --reason probe" and "aof test --suggest"
      Then both answer, and neither reads a file under "graphify-out/"

    @executable
    Scenario: the suite predicate still decides what --all and a named run count as a suite
      Given a project declaring roots "test" and suffixes ".test.mjs", excluding "test/native/**"
      Then "test/a.test.mjs" is a suite
      And "test/native/b.test.mjs" and "test/support/h.mjs" are not

    @executable @bug @finding-F-10
    Scenario: a retired control is retired in every register that declared it
      Given 72's FF-7202 and 190's FF-19003 both named the removed widens-never-narrows control
      Then no accepted item's register declares a control that does not resolve
      And each retired row says it was superseded by 210/ADR-008

    @executable @bug @finding-F-12
    Scenario: the gate's native status-gate check drives the all form
      When "packages/work/test/status-gate.test.mjs" runs under node:test
      Then its regression-gate case expects the gate to call the test command with "all: true"
      And no case expects a "scope" selection
