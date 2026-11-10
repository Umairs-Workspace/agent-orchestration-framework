@executable @cli @work @validate
Feature: a commit's selection is replayed without running anything

  WHY. `/aof:map-tests` proves a declaration by asking what recent commits would have selected,
  before and after. Nothing could select without running, and a replay through a run would cost a
  whole-tree run per widened commit. `--plan` stops after the selection. It launches nothing, writes
  no record and is answered from none (FF-19001 unchanged). `--commit <rev>` is the changed-set
  source a replay needs: exactly the files that commit changed against its first parent. Like
  `--story` and `--since`, it is exclusive of the other sources (ADR-008 §2).
  The cases build a scratch git repo with known commits, a planted graph artifact and a stub runner
  that records whether it was launched.

  Rule: R2 · A commit's selection can be replayed without running anything

    Scenario: E10 · a planned selection launches nothing and writes no record
      Given a commit that changed one source file whose dependents in the graph are two suites
      When `aof test --scope impacted --commit <that commit> --plan --json` runs
      Then the result names those two suites with the reason `graph-dependent`
      And the stub runner was not launched
      And the test record store holds no new record
      And the result says it is a plan

    Scenario: a planned selection that widens says why
      Given a commit that changed `schemas/aof.schema.json` and no coupling matches it
      When `aof test --scope impacted --commit <that commit> --plan --json` runs
      Then the scope is `all` with the widening reason `not-in-graph` naming that file
      And the stub runner was not launched

    Scenario: a plan is not answered from a record
      Given a green record already exists for the working tree at scope `impacted`
      When `aof test --scope impacted --plan` runs
      Then the selection is computed and printed, and the result does not say it was answered from a record

    Scenario Outline: E11 · one changed-set source per run
      When `aof test --scope impacted --plan --commit HEAD <other>` runs
      Then it refuses with the one-source code, naming both flags
      And no runner is launched

      Examples:
        | example | other              |
        | E11     | `--story 190/04`   |
        |         | `--since HEAD~3`   |

    Scenario: E12 · a past commit's selection is never run
      When `aof test --scope impacted --commit HEAD~1` runs without `--plan`
      Then it refuses, saying a run is always of the working tree and `--commit` needs `--plan`
      And no runner is launched

    Scenario: E13 · a merge commit is diffed against its first parent
      Given a merge commit whose first parent lacks `src/a.mjs` and whose second parent added it
      When `aof test --scope impacted --commit <the merge> --plan --json` runs
      Then the changed set is the diff against the first parent and holds `src/a.mjs`

    Scenario: an unknown revision is refused by name
      When `aof test --scope impacted --commit no-such-rev --plan` runs
      Then it refuses naming `no-such-rev` as unresolvable

    Scenario: the human summary of a plan
      Given the commit of E10
      When `aof test --scope impacted --commit <that commit> --plan` runs without `--json`
      Then the summary line starts `plan:`, counts the selected suites against the whole suite, and says nothing ran
