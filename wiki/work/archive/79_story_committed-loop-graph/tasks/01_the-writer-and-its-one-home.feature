@executable @cli @work @work-stream
Feature: The writer — one door to disk, one derived home, and bytes that do not move on their own

  The bare face is a READ: it loads the registry, composes the document and emits it, touching no
  disk. `--write` is the only door to the filesystem. This is the `work:grade` idiom (`--run` as the
  only door to execution, 54/ADR-003 §2) and 78/ADR-002 chose it for the reason that applies here too:
  a face that writes by default cannot be composed by anything that only wants to look.

  THE HOME IS ONE DERIVED LOCATION, NOT AN ARGUMENT. The document lands at the root of the configured
  work directory, beside the only two other tracked non-item files there — `ROADMAP.md` and
  `TECH_DEBT.md`. That root is the repository's established home for a committed, repo-wide document,
  and doctor already treats a file there as neither an item-folder candidate nor an orphan
  (`src/work-doctor.mjs:401`). The path is derived from `work.dir`, never hardcoded.

  IT IS EMPHATICALLY NOT UNDER THE REGISTRY. Since 53/07 the registry lives in `.aof/loops/` and ships
  in the bundle — a generated document there would be overwritten by the next `aof work update`, and
  52/FF-5201 forbids writing under the registry directory outright. The artefact is a sibling of the
  registry, not a member of it.

  THIS WRITER IS A TRUNCATE-AND-EMIT, and that is the one place it is SIMPLER than 78's. There is no
  human signature anywhere in this document, so nothing has to be read back and carried forward. The
  read-modify-write discipline 78/ADR-002 owns is inherited only where it applies: byte-identity on
  unchanged inputs.

  Scenario: the bare face emits the document and writes nothing
    Given a loop registry
    When the command runs without `--write`
    Then the composed document is emitted
    And no file is created or modified anywhere in the repository

  Scenario: `--write` creates the document at the derived path
    Given a project with no committed loop document
    When the command runs with `--write`
    Then the document exists at the root of the configured work directory
    And its contents are the composed document for the current registry

  Scenario: the path follows the configured work directory
    Given a project whose configured work directory is not the default
    When the command runs with `--write`
    Then the document lands at the root of THAT directory
    And no file is written at the default location

  Scenario: there is no way to redirect the write to an arbitrary path
    Given the command's declared input contract
    Then it accepts no caller-supplied output path
    And the only door to disk is `--write`

  Scenario: regeneration on an unchanged registry is byte-identical
    Given a written loop document
    When the command runs with `--write` again with no registry record changed
    Then the file's bytes are unchanged

  Scenario: regeneration is byte-identical across separate processes
    Given a loop document written by one process
    When a fresh process writes it again with no registry record changed
    Then the two files are byte-identical

  Scenario Outline: a registry change moves the bytes, and the reader can see what moved
    Given a written loop document
    And the registry changes by <registry change>
    When the document is regenerated
    Then the file differs
    And the difference shows <visible in the diff>

    Examples: the registry edits that must become visible
      | registry change                            | visible in the diff                          |
      | a new record declaring a new node           | the new node, and the raised node count      |
      | a new edge between two declared nodes       | the new edge, and the raised edge count      |
      | a record's ceiling moving off `uncapped`    | the changed record's own line                |
      | a record's title changing                   | that node's label inside the fenced block    |
      | a record removed                            | the node gone, and the lowered counts        |
      | an edge pointing at an id nothing declares  | the raised finding totals                    |

  Scenario: the write scope is exactly one file
    Given a project with a committed registry, existing work items and an existing roadmap
    When the command runs with `--write`
    Then only the loop document is created or modified
    And no file under the loop registry directory is written
    And no file inside any work item folder is written

  Scenario: the registry is left byte-identical by both faces
    Given a fixture loop registry
    When the bare face and then the `--write` face both run against it
    Then every file in the registry directory is byte-identical to before

  Scenario: an absent registry is written honestly rather than refused
    Given a project with no loop registry directory
    When the command runs with `--write`
    Then it exits 0
    And the document states that no registry is declared and where it was looked for

  Scenario: `--write` reports what it did
    Given any project
    When the command runs with `--write --json`
    Then the result names the path written
    And it reports whether the file's bytes changed
    And it carries the same counts the document states

  Scenario: a write that cannot complete leaves the previous document intact
    Given a written loop document
    When a write fails part-way
    Then the existing document is left with its previous bytes
    And no partial or temporary file is left beside it
