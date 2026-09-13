@executable @cli @work @work-stream
Feature: A second observe run adds a snapshot — it never overwrites the first

  `observeMilestone` writes `observability/report.md` and `observability/agents.json` **in place**
  (`src/work-observe.mjs:1114-1119`), and the cost of that is already paid and unrecoverable.
  Milestone 45's retrospective cites *"477h39m span, 30m17s active, 14h39m human-blocked, one
  infra kill"*. The file it cites now reads **25m21s span, 25m21s active, 46m58s human-blocked, 0
  infra kills**. The report was regenerated over the evidence it was written from
  (`RESEARCH-agent-loop-economics.md` §5.6).

  The consequence generalises past that one milestone: every `Refs: observability/report.md` in the
  corpus is a citation to a **mutable path**, and therefore unfalsifiable. That is why the SPEC
  names self-overwriting as one of four first-class defects rather than a reporting nuisance.

  Snapshots accumulate, and that is the accepted trade (ADR-007): they are small, they are the
  evidence, and the alternative is the state that produced the ADR.

  This is the same discipline ADR-004 applies one layer down, where a settled `costUsd` is never
  recomputed either. **The framework does not rewrite its own evidence, at either layer.**

  FF-6807 pins "no write path opens an existing snapshot for truncation or rewrite" structurally,
  because "don't truncate" is exactly the kind of convention a later edit loses without noticing,
  and the loss is silent and permanent.

  ADR-007.

  Scenario: observing twice leaves the first snapshot byte-identical
    Given an item that has been observed once, with a snapshot written
    When the item is observed again with writing enabled
    Then the first snapshot's bytes are unchanged
    And a new snapshot has been written alongside it

  Scenario: each snapshot is identifiable by when it was taken
    Given an item observed several times with writing enabled
    When the item's snapshots are listed
    Then each snapshot is distinguishable by the moment it was taken
    And their order is determinable without reading their contents

  Scenario: the read path resolves the newest snapshot
    Given an item with several snapshots taken at different times
    When the item's latest observability is read
    Then the newest snapshot is returned
    And the older snapshots remain on disk unchanged

  Scenario: a citation stays valid after later runs
    Given a snapshot whose figures a retrospective has cited
    When the item is observed several more times
    Then the cited snapshot still holds the figures that were cited
    And it is still resolvable by the reference the retrospective recorded

  Scenario: a read-only observe writes nothing at all
    Given an item with an existing snapshot
    When the item is observed without writing enabled
    Then no snapshot is written
    And the existing snapshot's bytes are unchanged
