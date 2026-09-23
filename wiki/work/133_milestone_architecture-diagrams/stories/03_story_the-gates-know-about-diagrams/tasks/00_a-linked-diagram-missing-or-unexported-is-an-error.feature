@executable @cli @work @validate
Feature: a linked diagram that is not in the tree, or has no committed export, is an error

  WHY. SPEC: "Validate/doctor catch a linked diagram that is missing from the tree, and an ADR that
  links a diagram with no committed export." ADR-006 lands that as one doctor lane,
  `diagramsGroup`, appended to `CHECK_GROUPS` and named in FF-5905's lane roster. The link and file
  vocabulary is read only through `src/diagrams/layout.mjs` (FF-13302), so the gate and the writer
  cannot drift apart on a spelling.

  RULINGS (QA + developer, 2026-09-23). These refine ADR-006 in the beat that authors its contract.
  (1) THE LANE IS PURE, like every lane before it (`doctor-depends.mjs`: "THE LANE READS NO DISK").
      `ARCHITECTURE.md`'s text already reaches every item's snapshot as `docTexts["ARCHITECTURE.md"]`
      (66/ADR-003 §4). The one new fact is the item's `diagrams/` listing, which the engine's per-item
      enrichment in `src/work/doctor.mjs` probes with ONE `readdir` per item. A missing folder is
      `null`, not an error. The lane itself does no `readFile`, `readdir`, `stat` or `cwd`.
  (2) SEVERITY FOLLOWS THE ACCEPTANCE HORIZON. The three link codes take `severityFor(item.status)`
      from `src/acceptance-horizon.mjs`: `error` while the item is open and `warn` once it is `done`.
      A delivered item's `ARCHITECTURE.md` and `diagrams/` may no longer be edited, so an error there
      would be a permanent red no legal act can clear. This is the rule every other doctor code on
      an item's own records already follows. ADR-006's table said "error" without the horizon, and
      this contract ratifies the horizon.
  (3) What is owed is read through `resolveWorkDiagrams`. The SVG is always owed for a linked stem.
      The PNG is owed only when `formats` includes `png`. With diagrams off, `formats` still
      resolves to the default, but only the SVG is owed (ADR-006 §2).
  (4) A row this node does not hold on disk (a cache-only row reported by another node) is skipped.
      It is not reported as missing.
  (5) One finding per missing file per link, never one per scan. The message names the ADR, the
      link's line number and the missing path.

  Background:
    Given a fixture project `P` in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And `diagramsGroup` is imported from `src/work/doctor-diagrams.mjs`
    And the lane is asked over literal snapshots whose item paths name directories that do not exist, so a lane that reached the disk would fault

  Scenario Outline: each linked file must be present
    Given an open item whose `ARCHITECTURE.md` `## ADR-002` section carries the block for stem `ADR-002-seam` with formats `["svg","png"]`
    And its `diagrams/` listing is <listing>
    And `work.diagrams` resolves formats <formats>
    When `diagramsGroup` is asked
    Then the findings are <findings>

    Examples:
      | listing                                                   | formats         | findings                                                                                       |
      | `ADR-002-seam.html`, `.svg`, `.png`                       | `["svg","png"]` | none                                                                                           |
      | `ADR-002-seam.svg`, `.png`                                | `["svg","png"]` | one `diagram-link-missing` at `error` naming `diagrams/ADR-002-seam.html`                     |
      | `ADR-002-seam.html`, `.png`                               | `["svg","png"]` | one `diagram-link-missing` for the `.svg` and one `diagram-export-missing` for the `.svg`       |
      | `ADR-002-seam.html`, `.svg`                               | `["svg","png"]` | one `diagram-link-missing` for the `.png` and one `diagram-export-missing` for the `.png`       |
      | `null` (no `diagrams/` folder)                            | `["svg","png"]` | one `diagram-link-missing` for each of the three targets, and `diagram-export-missing` for the `.svg` and the `.png` |

  Scenario Outline: an export is owed even when the pasted block forgot to link it
    Given an open item whose `## ADR-002` section links only `![a](diagrams/ADR-002-seam.svg)` and `[s](diagrams/ADR-002-seam.html)`
    And its `diagrams/` listing is `ADR-002-seam.html`, `ADR-002-seam.svg`
    And `work.diagrams` resolves <resolved>
    When `diagramsGroup` is asked
    Then the findings are <findings>

    Examples:
      | resolved                                   | findings                                                       |
      | `enabled: true`, formats `["svg","png"]`   | one `diagram-export-missing` at `error` naming `ADR-002-seam.png` |
      | `enabled: true`, formats `["svg"]`         | none                                                           |
      | `enabled: false` (absent config)           | none, because only the SVG is owed while diagrams are off      |

  Scenario: a delivered item's missing export is reported, but does not gate
    Given a `done` item whose `## ADR-002` block links `diagrams/ADR-002-seam.svg`, and its listing has no `.svg`
    When `diagramsGroup` is asked
    Then it reports `diagram-link-missing` and `diagram-export-missing`, each at `warn`

  Scenario: a row this node does not hold is skipped
    Given an item that is a cache-only row, with no directory on this node
    When `diagramsGroup` is asked
    Then it reports nothing for that item

  Scenario: a finding names where to look
    Given the second example's item, whose `.html` link sits on line 41 of `ARCHITECTURE.md`
    When `diagramsGroup` is asked
    Then the `diagram-link-missing` message names `ADR-002`, line 41 and `diagrams/ADR-002-seam.html`
    And the finding carries the item's ref

  Scenario: the engine carries the lane end to end
    Given `P` holds an open milestone `07_milestone_m` whose `## ADR-002` block links `diagrams/ADR-002-seam.svg`, and `diagrams/` holds only `ADR-002-seam.html`
    When `aof work doctor 07 --json` is run in `P`
    Then its findings include `diagram-link-missing` and `diagram-export-missing` for `07`, each at `error`
    And after `ADR-002-seam.svg` and `ADR-002-seam.png` are written, and the `.png` is linked, a second run reports no `diagram-*` finding
