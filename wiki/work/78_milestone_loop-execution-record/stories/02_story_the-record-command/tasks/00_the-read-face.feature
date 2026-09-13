@executable @cli @work @work-stream
Feature: The read face — resolve, project, emit, touch nothing

  The bare face is a READ. It resolves the item, loads the registry, reads the item's run records,
  projects the execution model and emits it — and writes nothing. `--write` is the only door to disk,
  which is the `work:grade` idiom (`--run` as the only door to execution, 54/ADR-003 §2) chosen for
  the same reason: a face that writes by default cannot be composed by anything that only wants to
  look.

  THE `--json` CONTRACT IS THE STABLE ONE (ADR-002, `SPEC.md`, the milestone-08 spine). The rendered
  markdown is a FACE over it, never the other way round, so a consumer that needs the facts reaches
  the command and never parses the document (FF-7805).

  Scenario: the bare face emits the model and writes nothing
    Given a work item with run records
    When `aof work loop-record <ref>` runs
    Then the execution model is emitted
    And no file under the item is created or modified

  Scenario: `--json` carries the model, the coverage and the gaps
    Given a work item with run records, some carrying loop declarations
    When `aof work loop-record <ref> --json` runs
    Then the result carries the engagements, each with its cycles, ceiling state, phases, attempts and outcome
    And it carries the join coverage: runs found, runs carrying a declaration
    And it carries the three gap classes, each under its own key

  Scenario: the zero-coverage answer is a successful answer
    Given a work item whose run records carry no loop declaration
    When `aof work loop-record <ref> --json` runs
    Then it exits 0
    And the result reports the runs found and zero carrying a declaration
    And it reports no engagements

  Scenario: an item with no run records at all is still answerable
    Given a work item with no `runs/` directory
    When `aof work loop-record <ref> --json` runs
    Then it exits 0
    And the result reports zero runs found

  Scenario: a ref that does not resolve is refused, and nothing is written
    Given a ref matching no work item
    When `aof work loop-record <ref>` runs
    Then it fails with a typed error naming the unresolved ref
    And no file is created anywhere under the work directory

  Scenario: the registry is left byte-identical
    Given a fixture loop registry
    When the read face runs against it
    Then every file in the registry directory is byte-identical to before

  Scenario: the model reaches consumers through the command, never through the document
    Given a rendered `EXECUTION.md` on disk carrying execution facts
    When any consumer needs those facts
    Then it obtains them from the registered command
    And no read path in the codebase parses `EXECUTION.md` to recover them
