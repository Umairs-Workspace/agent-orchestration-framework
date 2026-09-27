@executable @cli @work @validate
Feature: a link under the wrong ADR is an error, an unlinked diagram file is a warning, and an item with no diagrams reports nothing

  WHY. ADR-003 names a diagram by the ADR it belongs to (`ADR-NNN-<slug>`), and ADRs are immutable,
  so a diagram pasted under the wrong ADR puts one decision's picture on another. ADR-006 makes that
  an error (`diagram-adr-mismatch`). A file in `diagrams/` that no link names is most likely a
  leftover from an iteration inside the authoring beat, so it is a warning (`diagram-orphan`), never
  a gate. Most items have no diagrams at all. For them the lane must be silent, or it becomes the
  wall of inherited noise nobody reads.

  RULINGS (QA, 2026-09-23).
  (1) `diagram-adr-mismatch` takes `severityFor(item.status)`, like the other link codes (task 00,
      ruling 2). `diagram-orphan` is `warn` on every status.
  (2) A link above the first `## ADR-NNN` heading (`adr: null` from `parseDiagramLinks`) is a
      mismatch: it sits under no ADR, so it cannot be the ADR its stem names.
  (3) A file is an orphan when its STEM is named by no link. The exports of a linked stem are never
      orphans, even when the block did not link them all, because the export check (task 00)
      already speaks for them. A file whose name does not match the stem grammar at all is also an
      orphan.
  (4) The lane's codes are disjoint from every other lane's, and the lane module is named in
      `DOCTOR_LANE_MODULES` (`test/arch/audit/acd-controls-never-execute.test.mjs`) in this change.
  (5) The `src/work` row of the source-directory budget rises 43 → 44 in this change, with its
      reason naming this lane.

  Background:
    Given a fixture project `P` in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And `diagramsGroup` is imported from `src/work/doctor-diagrams.mjs`, and asked over literal snapshots of open items unless an example says otherwise

  Scenario Outline: a link's stem must name the ADR it sits under
    Given an `ARCHITECTURE.md` where <placement>
    And the `diagrams/` listing holds every file the link names, with its exports
    When `diagramsGroup` is asked
    Then the findings are <findings>

    Examples:
      | placement                                                                          | findings                                                                         |
      | `![a](diagrams/ADR-002-seam.svg)` sits in `## ADR-002`                             | none                                                                             |
      | `![a](diagrams/ADR-003-seam.svg)` sits in `## ADR-002`                             | one `diagram-adr-mismatch` at `error`, naming `ADR-002`, `ADR-003-seam` and the line |
      | `![a](diagrams/ADR-002-seam.svg)` sits above the first `## ADR` heading            | one `diagram-adr-mismatch` at `error`, saying the link sits under no ADR          |
      | `![a](diagrams/ADR-003-seam.svg)` sits in `## ADR-002` of a `done` item             | one `diagram-adr-mismatch` at `warn`                                              |

  Scenario Outline: an unlinked file is a warning
    Given an `ARCHITECTURE.md` whose `## ADR-002` block links stem `ADR-002-seam` (`.svg`, `.html`, `.png`)
    And the `diagrams/` listing is `ADR-002-seam.html`, `ADR-002-seam.svg`, `ADR-002-seam.png` plus <extra>
    When `diagramsGroup` is asked
    Then the findings are <findings>

    Examples:
      | extra                          | findings                                                          |
      | nothing                        | none                                                              |
      | `ADR-002-seam-v1.html`         | one `diagram-orphan` at `warn` naming `ADR-002-seam-v1.html`       |
      | `ADR-004-other.svg`            | one `diagram-orphan` at `warn` naming `ADR-004-other.svg`          |
      | `notes.txt`                    | one `diagram-orphan` at `warn` naming `notes.txt`                  |

  Scenario: an unlinked export of a linked stem is not an orphan
    Given an `## ADR-002` block that links only `diagrams/ADR-002-seam.svg`
    And the listing is `ADR-002-seam.html`, `ADR-002-seam.svg`, `ADR-002-seam.png`
    When `diagramsGroup` is asked
    Then no `diagram-orphan` is reported

  Scenario: an orphan is a warning even on an open item
    Given an open item with no links and a listing of `ADR-001-x.svg`
    When `diagramsGroup` is asked
    Then it reports one `diagram-orphan` at `warn`

  Scenario Outline: an item with no diagrams reports nothing
    Given an item whose <state>
    When `diagramsGroup` is asked
    Then it reports no finding

    Examples:
      | state                                                                          |
      | snapshot carries no `ARCHITECTURE.md` text and a `null` listing                |
      | `ARCHITECTURE.md` has ten ADRs, no `diagrams/` link, and a `null` listing       |
      | `ARCHITECTURE.md` links only `../SPEC.md` and `mocks/board.png`                 |

  Scenario: this repository's own stream carries no diagram finding
    Given this checkout's `wiki/work`, whose only diagram is the one story 06 draws, if it has landed
    When `aof work doctor --json` is run from the repository root
    Then no finding's code starts with `diagram-`

  Scenario: the lane is registered where the roster says lanes are registered
    When `CHECK_GROUPS` in `src/work/doctor.mjs` is read
    Then `diagramsGroup` is its last entry
    And `DOCTOR_LANE_MODULES` names `./doctor-diagrams.mjs`
    And no code `diagramsGroup` can emit is emitted by any other lane
