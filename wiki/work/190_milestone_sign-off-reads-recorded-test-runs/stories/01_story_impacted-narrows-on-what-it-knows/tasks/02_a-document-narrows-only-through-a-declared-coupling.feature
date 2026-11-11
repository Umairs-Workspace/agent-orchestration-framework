@executable @cli @work @validate
Feature: a document narrows only through a declared coupling

  WHY. A document, a prompt asset or a data file is not in the import graph, yet suites read some of
  them by path. 38 of 76 recent stories widened on one (RESEARCH Q1). A text index would be
  confidently wrong for the suites that walk a directory or a manifest. So the project declares what
  reads what, `work.test.couplings`, and an empty `suites` is the declaration that nothing does
  (ADR-003 §4). An undeclared document still widens. The declaration is read where every
  `work.test.*` key is read (FF-7201).
  The cases plant the config and the changed set.

  Rule: R3 · A document narrows only through a declared coupling

    Scenario: E7 · a coupling with no suites drops the document
      Given `work.test.couplings` holds `{ "paths": ["wiki/*.md"], "suites": [], "why": "no suite reads a wiki page" }`
      When `wiki/codex-support.md` is the changed set
      Then the scope is `impacted` and nothing is selected for it
      And it is reported with the reason `declared-coupling` and the coupling's `why`

    Scenario: E8 · a coupling with suites selects them
      Given `work.test.couplings` holds `{ "paths": ["packages/core/assets/commands/*.md"], "suites": ["test/work/lifecycle/work-test-declared.test.mjs"], "why": "the prompt regions are asserted here" }`
      When `packages/core/assets/commands/continue.md` is the changed set
      Then `test/work/lifecycle/work-test-declared.test.mjs` is selected with the reason `declared-coupling`

    Scenario: E9 · an undeclared document still widens
      Given no coupling matches `schemas/aof.schema.json`
      When it is the changed set
      Then the scope is `all`, and it is a widening with the reason `not-in-graph`

    Scenario: a code file is never placed by a coupling
      Given a coupling whose `paths` match `packages/work/src/**`
      When `packages/work/src/testing/select.mjs` is the changed set
      Then it is resolved through the graph, not the coupling

    Scenario Outline: a malformed coupling is a declaration error, never a silent narrowing
      Given `work.test.couplings` is <value>
      When `aof test --scope impacted` runs
      Then it refuses with `test-runner-declaration-invalid` naming `couplings`
      And no runner is launched

      Examples:
        | value                                                   |
        | an object rather than an array                          |
        | `[{ "paths": "wiki/*.md", "suites": [], "why": "x" }]`  |
        | `[{ "paths": ["wiki/*.md"], "suites": [] }]`            |

    Scenario: E10 · every narrowing names its cause
      Given a narrowed run with one `graph-dependent`, one `suite-itself` and one `declared-coupling` resolution
      When the run is printed with `--json`
      Then each selected suite names the changed file and the reason that chose it
      And the summary line counts the resolutions by reason
