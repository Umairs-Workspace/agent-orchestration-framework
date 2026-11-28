@executable @cli @design
Feature: "aof design-system mocks import" commits a pulled, approved canvas under the milestone's mocks/, with its runtime and provenance

  WHY. The fidelity judge reads local files only (m07/ADR-003). A canvas's boards render offline
  only beside their runtime and the system's installed tokens (RESEARCH R2). Assembling them is
  deterministic, so it is a verb and never prose (ADR-003). The README ties the baseline to the
  exact canvas version the operator approved, and to the system's link, which survives a rename
  (ADR-005 §5, ADR-006 §2). A mock never becomes a baseline without a recorded approval (ADR-002 §3).

  "The milestone" is a milestone "12" in a fixture work tree, under "AOF_GLOBAL_HOME" isolation.
  "mocks/" is its "mocks/" dir.
  "The pulled dir" holds:
  - "project/canvas.json", whose "boards" are "fleet-filter.dc.html" (1280x884) and
    "fleet-filter-390.dc.html" (390x274), in that order;
  - both boards, each loading "./support.js";
  - "project/ds/aof/tokens.json";
  - "artifact-type/dc-runtime.js".
  "The provenance flags" are:
  - "--canvas https://claude.ai/artifact/9Qm2LrT4vWx8YbN3cK7pZd --canvas-version 4"
  - "--system https://claude.ai/artifact/5M7UeXXcx16TP3vzVFNDzd --system-version 2"
  - "--approval 'run 20261126T204530509Z-0000 ask 1'"

  Rule: R4 · "mocks import" commits a pulled, approved canvas under mocks/ with its runtime and provenance, and it is self-contained

    Scenario: E11 · an approved canvas is imported with its runtime and provenance
      When "aof design-system mocks import <the pulled dir> --item 12 <the provenance flags> --json" runs
      Then mocks/ holds "canvas.json", "fleet-filter.dc.html", "fleet-filter-390.dc.html", "support.js" and "ds/aof/tokens.json"
      And "support.js" holds the bytes of "artifact-type/dc-runtime.js"
      And mocks/README.md holds the line "Canvas: https://claude.ai/artifact/9Qm2LrT4vWx8YbN3cK7pZd (version 4)"
      And the system's link and version, today's date and the approval "run 20261126T204530509Z-0000 ask 1"
      And the files the import wrote
      And the JSON answer lists each written file and the milestone's mocks/ path

    Scenario Outline: E12 · a pulled file outside the canvas's own list is refused, and nothing is written
      Given the pulled dir also holds <file>
      When the import runs with the provenance flags
      Then it is refused, naming <file> and <reason>
      And mocks/ is as it was before

      Examples:
        | file                                  | reason                                           |
        | "project/../../.aof/aof.config.json"  | that a path may not hold ".."                    |
        | "project\\fleet-filter.dc.html"       | that a path may not hold "\\"                    |
        | "/etc/passwd"                         | that a path may not start with "/"               |
        | "project/notes.md"                    | that it is not a file a canvas is imported from  |
        | "project/stray.dc.html"               | that "canvas.json" names no such board           |

    Scenario Outline: a pull that cannot render offline is refused, and nothing is written
      Given the pulled dir lacks <file>
      When the import runs with the provenance flags
      Then it is refused, naming <file>
      And mocks/ is as it was before

      Examples:
        | file                                   |
        | "project/canvas.json"                  |
        | "artifact-type/dc-runtime.js"          |
        | "project/fleet-filter-390.dc.html"     |

    Scenario: E13 · an import without an approval is refused
      When the import runs with every provenance flag but "--approval"
      Then it is refused, saying a mock becomes a baseline only once the operator has approved it
      And mocks/ is as it was before

    Scenario Outline: bad provenance is refused, and nothing is written
      When the import runs with the provenance flags, but <change>
      Then it is refused with <reason>

      Examples:
        | change                                         | reason                                         |
        | "--canvas https://example.com/x"               | that the link is not a claude.ai artifact link |
        | "--system-version ''"                          | that the system's version is empty             |
        | "--item 12/01"                                 | that mocks belong to a milestone               |
        | "--item 99"                                    | that no item "99" exists                       |

    Scenario: E14 · a re-approved canvas is re-imported whole
      Given version 4 was imported and captured, and mocks/ also holds a hand-written "PROMPT.md"
      And the pulled dir is now version 5, whose "canvas.json" names only "fleet-filter.dc.html"
      When the import runs with "--canvas-version 5" and a new approval
      Then mocks/ no longer holds "fleet-filter-390.dc.html" or "fleet-filter-390.png"
      And README.md records version 5 and the new approval, and no frame table until the next capture
      And "PROMPT.md" is unchanged

    Scenario: the import refuses to overwrite a file it did not write
      Given mocks/ holds a hand-written "README.md", with no "Canvas:" line
      When the import runs with the provenance flags
      Then it is refused, naming "mocks/README.md" and saying to move it aside
      And mocks/ is as it was before

    Scenario: importing the same version again changes nothing
      Given version 4 was imported
      When the same import runs again with "--json"
      Then it reports the import unchanged, and every file in mocks/ is byte-identical

  Rule: R4a · One canvas holds every milestone's mocks, a page each, and import takes the milestone's page alone (ADR-006 §0, amended 2026-11-27)

    Scenario: E21 · "--page" imports that page's boards alone, and capture frames only them
      Given the pulled canvas has the pages "earlier" (named "Portal") and "m12" (named "12 Fleet filter")
      And "fleet-filter.dc.html" and "fleet-filter-390.dc.html" carry "page": "m12"
      When the import runs with the provenance flags and "--page m12"
      Then mocks/canvas.json names only those two boards, in canvas order, and only the page "m12" and its notes
      And mocks/README.md holds the line "Page: m12 (12 Fleet filter)"
      And the same import again reports the import unchanged
      And "mocks capture" frames only those two boards

    Scenario: E22 · a board with no page is on the first page
      Given the pulled canvas has the pages "earlier" and "m12", and "old.dc.html" carries no "page"
      When the import runs with "--page m12" and "old.dc.html" is in the pulled dir
      Then it is refused, naming "project/old.dc.html" as on another page, and nothing is written
      When the import runs with "--page earlier"
      Then mocks/canvas.json names "old.dc.html" alone

    Scenario: E23 · a page the canvas lacks, or one with no boards, is refused
      Given the pulled canvas has the pages "earlier" and "m13", and no board on "m13"
      When the import runs with "--page m12"
      Then it is refused, saying the canvas has no page "m12" and naming "earlier" and "m13"
      When the import runs with "--page m13"
      Then it is refused, saying the canvas names no boards on the page "m13"

    Scenario: E25 · a canvas with no pages is sorted once, and only each board's page changes
      Given a pulled "canvas.json" titled "Portal Redesign" with no pages, whose boards are titled "37 · A discussion on a CRM company", "Shell — product nav" and "034 · Messaging at 390 px"
      When "aof design-system canvas pages <it> --out <file> --item 12" runs
      Then its pages are "earlier" (named "Portal Redesign", holding the unnumbered board), "m34", "m37" and "m12" (named "12 fleet-filter", empty), in that order
      And in <file> each board differs from the pulled one only by its "page", and the notes and the order are unchanged

    Scenario: E26 · a canvas that has pages is never re-sorted
      Given a pulled "canvas.json" whose only page is "earlier", and a board titled "37 · Late" with no "page"
      When "aof design-system canvas pages <it> --out <file> --item 12" runs
      Then no board is moved, and only "m12" is added
      When it runs again on <file>
      Then it reports nothing changed, and the page "m12"

    Scenario: E28 · a milestone's own page is found by the number its name starts with
      Given a pulled "canvas.json" with the pages "portal-03" named "03 · Task portal" and "directory-05" named "05 · Directory", and the stream's milestone "05"
      When "aof design-system canvas pages <it> --out <file> --item 05" runs, and again with "--item 5"
      Then each reports nothing changed, and the page "directory-05"
      Given a pulled "canvas.json" with no pages and one board titled "5 · Directory at 390"
      When "aof design-system canvas pages <it> --out <file> --item 5" runs
      Then its one page is "m05", named for the milestone's title, holding the board, and the page it reports is "m05"

    Scenario: E27 · what the pages verb refuses, writing nothing
      Then a sort that would need 41 pages is refused as over the Design type's limit of 40
      And "--item 12/01" is refused, saying a canvas page belongs to a milestone
      And an index that cannot be read is refused

  Scenario: E15 · an imported mock is self-contained, and the control proves it can fail
    Given "test/arch/ui/acd-imported-mock-self-contained.test.mjs" (FF-19805) is registered in "test/arch/ui/index.mjs"
    And it sweeps every mocks/ dir in the work tree whose README.md has a "Canvas:" line, and a fixture import
    When a board in the fixture loads "./support.js", "ds/aof/tokens.json" and "https://fonts.googleapis.com/css2?family=Inter"
    Then the control passes
    When a board in the fixture also loads "https://cdn.example.com/x.js"
    Then the control fails, naming the board and the source
    And the red probe is recorded in the milestone's VERIFICATION.md
