@executable @cli @work @validate
Feature: a finished gate run answers a later whole-tree question

  WHY. A UAT session sweeps the whole tree, which on unchanged content is the run the milestone gate
  just made (SPEC Scope). The gate therefore writes its finished run as an ADR-001 record of scope
  `all`, through 190/00's one writer. A later `aof test --scope all` on that content and environment
  is answered from it (ADR-005 §4). The gate itself never answers from a record, because its run is
  the accept door's evidence (§4, 96/ADR-008).
  The cases drive the gate with a fake sharded runner and then `runTest` against the same temp repo.

  Rule: R2 · A finished gate run answers a later whole-tree question

    Scenario Outline: a finished gate run is recorded, a not-finished one is not answerable
      Given a clean checkout on content K
      When `aof work regression-gate 190` ends <how>
      Then a test record of scope `all` on K is written with the result `<result>`
      And `aof test --scope all` on K afterwards launches the runner <launches>

      Examples:
        | example | how            | result       | launches |
        | E5      | green          | green        | 0 times  |
        |         | red            | red          | 0 times  |
        |         | not finished   | not-finished | once     |

    Scenario: E6 · the gate always runs
      Given a green test record of scope `all` on content K
      When `aof work regression-gate 190` runs on content K
      Then the sharded runner is launched
      And a row is appended for this run

    Scenario: a record from the gate carries what a UAT reader needs
      Given the gate finished green on content K
      When its test record is read
      Then it names the scope `all`, an empty widening list, `gate: true`, and the row's instant
