@executable @cli @work @work-stream
Feature: One ADR is addressable inside the one architecture document

  `ARCHITECTURE.md` reaches 3,975 lines (m53), 2,922 (m43), 2,552 (m49). In milestone 49 it was read
  78 times; in milestone 52, 46 times. A phase that needs two ADRs currently reads all of them.

  **The document is not split, and that is a decision rather than an omission.** `ARCHITECTURE.md`
  is a pinned member of four independent reader surfaces — `WORK_ITEM_ARTIFACTS`
  (`src/work-artifacts.mjs`, 5 `src/` dependents), the register's frozen file set in
  `src/declared-id.mjs` (*the fitness register lives in this file*), the controls checker
  (`src/work-doctor-controls.mjs`), and memory's ADR indexing (`src/memory/local-indexing.mjs`,
  which parses one `adr` record per `## ADR-NNN` block). Splitting it is a four-surface rewrite of
  frozen sets that would silently drop the ADR corpus to zero (ADR-006).

  What the SPEC actually asks for — *a story should read its slice* — is delivered by making a block
  **addressable** and letting the brief carry the declared ones. The parse follows the one
  `local-indexing.mjs` already proves works against these documents.

  The extractor is pure, for the same reason 70/00's compiler is: it is the thing whose output the
  ceiling governs.

  ADR-003 (the ceiling that governs the result), ADR-006. FF-7008 keeps the source one artifact.

  Scenario: a declared ADR is extracted from the single architecture document
    Given a milestone architecture document containing several ADR blocks
    When one ADR is requested by id
    Then that block is returned in full
    And no other ADR's content is included

  Scenario: a block ends where the next one begins
    Given an architecture document whose ADR blocks are adjacent
    When a block is extracted
    Then it ends at the start of the next ADR
    And it carries none of the following block's heading or body

  Scenario: an id that is not in the document resolves to nothing, not to something near it
    Given a request for an ADR id the document does not contain
    When the block is extracted
    Then nothing is returned for that id
    And no adjacent or similarly-numbered block is returned in its place

  Scenario: the extractor reads the single artifact
    Given a milestone whose architecture is one document
    When blocks are extracted
    Then they are read from that document
    And no sibling per-ADR file is read or expected

  Scenario: a story's brief carries the slices it declared
    Given a story declaring two of its milestone's ADRs
    When its brief is compiled
    Then the brief carries those two ADR blocks
    And it does not carry the milestone's other ADRs

  Scenario: a story declaring nothing gets the register, not the whole document
    Given a story that declares no ADRs
    When its brief is compiled
    Then the brief carries the milestone's fitness register
    And it does not carry the full architecture document

  Scenario: declared slices are still governed by the brief's ceiling
    Given a story declaring ADRs whose combined length exceeds the brief's ceiling
    When its brief is compiled
    Then the brief is within the ceiling
    And it states that the architecture slice was truncated
    And it names which declared ADRs were shortened or dropped

  Scenario Outline: what a request resolves to
    Given an architecture document and a request for <requested>
    When extraction runs
    Then the result is <result>

    Examples: addressing, including the cases that must not guess
      | requested                          | result                                  |
      | an id present in the document      | that block, whole                       |
      | two ids present in the document    | both blocks, in document order          |
      | an id absent from the document     | nothing for that id                     |
      | one present id and one absent id   | the present block, and the absence reported |
      | no ids at all                      | nothing, and the document is not read whole |
