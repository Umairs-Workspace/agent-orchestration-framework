@executable @cli @work @work-stream
Feature: Snapshots from the old miner are marked as derived by it — and their numbers are left alone

  There are `observability/` snapshots on disk today whose numbers were produced by the miner this
  milestone repairs: double-counting attribution (18 of 143 rows in two reports), a toolchain
  classifier that reported zero where the true figure was non-zero, and an in-place write that had
  already regenerated at least one of them over the evidence a retrospective cited.

  A reader cannot tell those apart from a snapshot written after this milestone, and nothing on the
  file says which miner produced it. So they are **marked**: a header stating they were derived by
  the pre-68 miner and are subject to those defects.

  **They are marked, not migrated, and the reason is not laziness.** Retro-fitting history is
  explicitly out of the milestone's scope, and rewriting the very files whose rewriting is the
  defect would be self-refuting — it would destroy the second copy of the evidence in the act of
  labelling the first as untrustworthy. The numbers stay exactly as they are. What changes is that
  a reader is told what produced them (ADR-007).

  The old snapshot's numbers are not recomputed, not corrected, and not deleted. A wrong number
  with its provenance stated is evidence; a wrong number silently replaced is not.

  ADR-007; ADR-005 and ADR-006 (the defects the header names).

  Scenario: an existing snapshot gains a header naming what produced it
    Given an `observability/` snapshot written before this milestone
    When it is marked
    Then it carries a header stating it was derived by the pre-68 miner
    And the header names the defects that miner is subject to

  Scenario: the marked snapshot's figures are untouched
    Given an existing snapshot carrying known figures
    When it is marked
    Then every figure it reported is unchanged
    And no figure was recomputed, corrected or removed

  Scenario: a snapshot written after this milestone carries no such header
    Given an item observed after this milestone
    When its new snapshot is read
    Then it carries no pre-68 derivation header
    And it is distinguishable from a marked snapshot without reading its figures

  Scenario: marking is not repeated on a snapshot already marked
    Given a snapshot that has already been marked
    When marking runs again
    Then the snapshot carries exactly one derivation header
    And its figures are still unchanged

  Scenario Outline: what the header tells a reader
    Given a marked pre-68 snapshot
    When its header is read
    Then it states <fact>

    Examples: the provenance a reader needs
      | fact                                                                 |
      | that the snapshot was produced by the miner in use before this milestone |
      | that its attribution may count one agent run against two items       |
      | that its toolchain figures may read zero where the true figure is not |
      | that it may itself have been written over an earlier snapshot        |
