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

  Scenario: E15 · an imported mock is self-contained, and the control proves it can fail
    Given "test/arch/ui/acd-imported-mock-self-contained.test.mjs" (FF-19805) is registered in "test/arch/ui/index.mjs"
    And it sweeps every mocks/ dir in the work tree whose README.md has a "Canvas:" line, and a fixture import
    When a board in the fixture loads "./support.js", "ds/aof/tokens.json" and "https://fonts.googleapis.com/css2?family=Inter"
    Then the control passes
    When a board in the fixture also loads "https://cdn.example.com/x.js"
    Then the control fails, naming the board and the source
    And the red probe is recorded in the milestone's VERIFICATION.md
