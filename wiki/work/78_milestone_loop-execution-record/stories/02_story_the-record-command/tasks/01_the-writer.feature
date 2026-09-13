@executable @cli @work @work-stream
Feature: The writer — one door, byte-identical regeneration, and a signature that survives

  `--write` is the only path to disk, and it writes exactly one file: `EXECUTION.md` in the item's own
  folder (ADR-001). It is a READ-MODIFY-WRITE, not a truncate-and-emit, because the sign-off table
  holds the one thing in the document that no input can regenerate.

  THE TWO OBLIGATIONS ARE INDEPENDENT and both are load-bearing. Byte-identity on unchanged inputs is
  what makes a non-empty diff mean "an input changed" rather than "somebody ran the command"; that is
  the drift check ADR-010 hands to story 79 as well. Signature preservation is what makes
  regeneration safe to do — and a writer that destroyed signatures would be a writer nobody runs
  twice, which is the same as not having one.

  Scenario: `--write` creates the record in the item's own folder
    Given a work item with no `EXECUTION.md`
    When `aof work loop-record <ref> --write` runs
    Then `EXECUTION.md` exists in that item's folder
    And its contents are the rendered document for that item's execution model

  Scenario: regeneration on unchanged inputs is byte-identical
    Given an item whose `EXECUTION.md` has been written
    When `aof work loop-record <ref> --write` runs again with no input changed
    Then the file's bytes are unchanged

  Scenario: regeneration is byte-identical across separate processes
    Given an item whose `EXECUTION.md` has been written by one process
    When a fresh process writes it again with no input changed
    Then the two files are byte-identical

  Scenario: a changed input changes the file, and only where the input changed
    Given an item whose `EXECUTION.md` has been written
    And a new run record carrying a loop declaration lands for that item
    When the record is regenerated
    Then the file differs
    And the difference is confined to the facts that changed

  Scenario: a signed row survives regeneration verbatim
    Given an `EXECUTION.md` whose sign-off table carries a row signed by a human
    When the record is regenerated
    Then that row is present, byte-identical, including the name, date and verdict
    And every other line in the document has been re-derived

  Scenario: signatures survive even when the facts they signed have changed
    Given a signed sign-off row for a loop whose engagement has since gained a cycle
    When the record is regenerated
    Then the signed row is still carried forward verbatim
    And the execution facts above it show the new cycle count

  Scenario: an unsigned row is re-derived rather than preserved
    Given an `EXECUTION.md` whose sign-off table carries an unsigned row
    When the record is regenerated
    Then that row is re-derived from the model
    And no stale unsigned row survives for an engagement that no longer exists

  Scenario: nothing but the record is written
    Given an item with an existing `SPEC.md`, `STATE.md`, `VERIFICATION.md` and `runs/`
    When `aof work loop-record <ref> --write` runs
    Then only `EXECUTION.md` is created or modified
    And no file outside that item's folder is written
    And no file under the loop registry directory is written

  Scenario: a malformed existing record refuses rather than silently discarding a signature
    Given an `EXECUTION.md` whose sign-off table cannot be parsed
    When `aof work loop-record <ref> --write` runs
    Then it fails with a typed error naming the document and what could not be parsed
    And the existing file is left untouched

  Scenario: `--write` reports what it did
    Given any item
    When `aof work loop-record <ref> --write --json` runs
    Then the result names the path written
    And it reports whether the file changed
    And it reports how many signed rows were carried forward
