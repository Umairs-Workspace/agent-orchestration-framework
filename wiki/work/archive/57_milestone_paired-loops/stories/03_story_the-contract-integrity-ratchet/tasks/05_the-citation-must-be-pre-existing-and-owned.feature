@executable @cli @work @validate @bug @finding-F-57-03-1
Feature: A discharge citation is read from the base commit and must name the owning item

  Verification of this story measured the discharge resolver clearing a real weakening against a
  header comment. A file headed `// milestone 57 / story 03 — the contract-integrity ratchet
  (ADR-004).` had a deep equality relaxed to a membership check, and the leg came back `discharged`
  with `authority: ADR-004` — against this milestone's own register. 663 of this repository's 944
  test files carry such a token, so the discharge was available to nearly every weakening the
  ratchet can see.

  Two qualifiers of ADR-004 §5 were implemented and one was not. The unimplemented one is the first:
  *the ADR id cited by the weakened artifact*. It had been read as "any ADR id anywhere in the file
  at head", which fails in both directions at once.

  It reads too late. The comment explaining a weakening is written **with** the weakening, so it
  lives at head and nowhere else. Harvesting head is therefore precisely the re-coupling ADR-004 §5
  forbids: the watcher consults the optimizer's own output. Reading the artifact **as it stood at
  the base commit** makes that structural — a comment authored during the work cannot be an input,
  because it does not exist in the text being read.

  It also reads too widely. A bare `ADR-007` is addressable only inside its own item's documents,
  and every milestone numbers its register from 001 — so a bare id resolves against whichever
  register the walk happens to reach, and the "owning item" qualifier does no work at all. A
  citation discharges only when it names the owning item.

  ADR-004 §5. FF-5705.

  Scenario: a citation added with the weakening is never read
    Given a pre-existing file whose closed-set assertion is relaxed
    And the citation appears only in a comment added in the same change
    When the ratchet runs
    Then the leg is reported as fired

  Scenario: a citation present at the base commit is read
    Given a pre-existing file that cited the owning item's ADR at the base commit
    And that file's closed-set assertion is relaxed
    When the ratchet runs
    Then the leg is reported as discharged

  Scenario: a bare ADR id does not discharge
    Given a fired leg whose artifact cites an ADR without naming an item
    When the ratchet runs
    Then the leg is reported as fired

  Scenario: a citation naming a different item does not discharge
    Given a fired leg whose artifact cites another item's ADR at the base commit
    When the ratchet runs
    Then the leg is reported as fired

  Scenario: a citation naming the owning item discharges against its register
    Given a fired leg whose artifact cites the owning item's ADR at the base commit
    When the ratchet runs
    Then the leg is reported as discharged
    And the ADR it cleared against is named without the item prefix

  Scenario: the owning item is the ancestor whose register was read
    Given a story whose register resolves at its parent milestone
    When the ratchet runs
    Then the citation must name that milestone to discharge

  Scenario: no owning item means no discharge
    Given a fired leg for which no owning register resolved
    When the ratchet runs
    Then the leg is reported as fired

  Scenario Outline: which citation spellings discharge
    Given a fired leg whose artifact cited <citation> at the base commit
    And the owning item is 57 whose register carries ADR-007
    When the ratchet runs
    Then the leg is <outcome>

    Examples: the citation names the owning item, or it does not discharge
      | citation    | outcome       |
      | 57/ADR-007  | discharged    |
      | m57/ADR-007 | discharged    |
      | ADR-007     | fired         |
      | 35/ADR-007  | fired         |
      | 57/ADR-999  | fired         |
