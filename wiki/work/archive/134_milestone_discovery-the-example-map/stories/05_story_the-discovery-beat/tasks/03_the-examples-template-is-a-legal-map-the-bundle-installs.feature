@executable @docs @work @scaffold
Feature: the EXAMPLES.md story template is a legal example map, and the bundle installs it beside PLAN.md

  WHY. ADR-001 puts the map in a sibling `EXAMPLES.md` in a closed grammar. The discovery beat
  points the PO at a template rather than restating that grammar in prose, so the template IS the
  worked form an author copies. If it did not parse clean, every map copied from it would start
  life as a doctor error. It is added under `src/bundle/templates/story/`, beside `PLAN.md`, and
  installed by `aof work update` like every other story template.

  RULINGS (QA, 2026-09-24).
  (1) NO FRONTMATTER (F-73-G, the `PLAN.md` template's precedent). The render prepends the bundle
      marker and a blank line at byte zero, and 02's grammar admits frontmatter only when fenced
      from line 1 (02/00 ruling 4), so an installed block would parse as malformed lines. This
      departs from ADR-001 §2's sample on purpose: nothing reads a map's frontmatter (04 budgets it
      by file name). An author's own map may still open with one.
  (2) Guidance lives in whole-line or block comments, which the grammar reads as nothing. Without
      frontmatter the marker is only a comment, so a copy that keeps it parses as one that drops it.
  (3) The live lines show each provenance label, each class and each question state, so the parse
      checks their spelling. `defaulted` appears only on a technical question, and `stated Q<n>`
      names an `answered` question of the template's own. A verbatim copy is stopped by doctor's
      open and unanchored errors: that is the gate working, not a template defect.
  (4) The not-applicable line is shown inside a comment, because beside rules it is
      `not-applicable-with-rules`. Its spelling is checked by parsing it alone.
  (5) The installed template, marker included, is at most 50 lines, ADR-001 §1's `examples`
      default, so a verbatim copy is not born over budget. It is measured as a line count (a final
      newline adds none), because the `examples` budget row lands in 04, after this story.

  RULINGS (developer, 2026-09-24).
  (1) "The line opening `Not applicable: `" is a line that begins with those words, unindented,
      inside a multi-line `<!--` … `-->` block. Lifting it means taking that line alone. Measured:
      a template holding every form above installs at 35 lines.

  Background:
    Given `src/bundle/templates/story/EXAMPLES.md` is read from this checkout

  Scenario: the template shows every form the grammar admits
    When the template is read
    Then it shows a rule heading, examples under it carrying each of the three provenance labels, and a `## Questions` section holding a business and a technical question
    And it shows the one-line not-applicable form

  Scenario Outline: the template's live lines hold each form, as the parser reads them — <form>
    When the installed template is parsed by `parseExampleMap`
    Then the parsed value holds <holds>

    Examples:
      | form          | holds                                                                  |
      | a rule        | at least one rule, with at least one example under it                  |
      | `proposed`    | an example whose provenance is `proposed`                              |
      | `confirmed`   | an example whose provenance is `confirmed`                             |
      | `stated Q<n>` | an example whose provenance is `stated`, naming a question the map holds as `answered` |
      | `business`    | a question of class `business`                                         |
      | `technical`   | a question of class `technical`, in the state `defaulted` with a pointer |
      | `open`        | a `business` question in the state `open`                              |
      | `asked`       | a question in the state `asked`                                        |
      | `answered`    | a question in the state `answered`                                     |
      | `defaulted`   | no `business` question in the state `defaulted`                        |

  Scenario: the not-applicable form sits in a comment, and parses when it stands alone
    When the line opening `Not applicable: ` is lifted out of its comment in the installed template
    And that one line is parsed by `parseExampleMap` as the whole text
    Then `notApplicable` reads a non-empty reason
    And it reports no malformed line

  Scenario: the template carries no frontmatter
    When the template is read
    Then no line of it is `---`

  Scenario Outline: the template parses with no malformed line — <as>
    When <text> is parsed by `parseExampleMap`
    Then it reports no malformed line
    And `notApplicable` is null

    Examples:
      | as                        | text                                                                                     |
      | as the bundle installs it | the template rendered by the bundle to `.aof/templates/work/story/EXAMPLES.md`, marker at its head |
      | as written in the source  | `src/bundle/templates/story/EXAMPLES.md`                                                 |

  Scenario: a verbatim copy of the installed template fits the map's one-screen budget
    When `.aof/templates/work/story/EXAMPLES.md` is counted
    Then it is at most 50 lines, a final newline adding none

  Scenario: the installed template is refreshed by aof work update and catalogued in the manifest
    When `.aof/templates/work/story/EXAMPLES.md` is read
    Then it is byte-identical to what `aof work update` renders from the current source
    And `src/bundle/manifest.json` lists it under the `story` template resource
