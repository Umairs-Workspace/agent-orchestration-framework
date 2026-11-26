@cli @work @validate
Feature: a named run runs exactly what it names, and records why

  WHY. The agent chooses the suites from the project's instructions, and says why (ADR-001,
  ADR-002). The tool runs exactly that choice through the light entry, refuses a choice that is
  not a suite or has no reason, and records the reason beside the result. A repeat on unchanged
  content is answered from the record, so the review lanes share one run. The cases drive
  `runTest` against a temporary git repository with an injected runner, and the CLI face once.

  Rule: R1 · A named run runs exactly what it names, and says why

    @executable
    Scenario: E1 · one named suite runs through the light entry, and its reason is recorded
      Given a temporary repository whose declared suites include "test/a.test.mjs" and "test/b.test.mjs"
      When I run "aof test test/a.test.mjs --reason \"record.mjs changed\" --json"
      Then the runner is launched once with the selection program and "test/a.test.mjs" only
      And the record written has mode "named", reason "record.mjs changed" and selection "test/a.test.mjs"

    @executable
    Scenario Outline: a named run that cannot be honoured is refused, and runs nothing
      When I run <command>
      Then it is refused as <code>, naming <named>
      And no runner is launched

      Examples:
        | command                                                          | code                   | named                         |
        | "aof test test/a.test.mjs"                                       | "test-reason-missing"  | "--reason"                    |
        | "aof test test/a.test.mjs --reason \"  \""                        | "test-reason-missing"  | "--reason"                    |
        | "aof test src/record.mjs --reason probe"                         | "test-not-a-suite"     | "src/record.mjs"              |
        | "aof test test/missing.test.mjs --reason probe"                  | "test-not-a-suite"     | "test/missing.test.mjs"       |
        | "aof test test/a.test.mjs --all --reason probe"                  | "test-form-conflict"   | "--all"                       |
        | "aof test --suggest --failed"                                    | "test-form-conflict"   | "--suggest" and "--failed"    |
        | "aof test"                                                       | "test-form-missing"    | the four forms                |

    @executable
    Scenario: E4 · three lanes asking the same named run on unchanged content share one launch
      Given a temporary repository with unchanged content
      When three callers ask "aof test test/a.test.mjs test/b.test.mjs --reason <their own>" at once
      Then the runner is launched once
      And the other two answers say "answered from the run of" that run's instant, with its result

    @executable
    Scenario: a lane asking about part of a green run is answered from it
      Given a green named run over "test/a.test.mjs" and "test/b.test.mjs" on this content
      When I run "aof test test/b.test.mjs --reason \"review lane\" --json"
      Then no runner is launched and the answer is green from that run

    @executable
    Scenario: the summary line states the form, the suites and the reason it ran for
      When a named run over 2 suites goes green
      Then the summary line names "named", "2 suites" and the reason

  Rule: R2 · The suggestion lists, and runs nothing

    @executable
    Scenario: E5 · --suggest lists the suites a working-tree change reaches, and launches nothing
      Given a temporary repository where "test/a.test.mjs" imports "src/record.mjs" and "test/b.test.mjs" names it
      And "src/record.mjs" has an uncommitted change
      When I run "aof test --suggest --json"
      Then the answer lists "test/a.test.mjs" as "imports" and "test/b.test.mjs" as "names"
      And no runner is launched and no record is written

    @executable
    Scenario: --suggest with nothing changed says so
      Given a temporary repository with a clean working tree
      When I run "aof test --suggest"
      Then the answer says nothing has changed and lists no suite
