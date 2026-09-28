@uat @cli @work @design
Feature: the operator accepts ADR-002's drawing as a faithful picture of its brief, in the console's style

  WHY A HUMAN. Whether a diagram explains a design is a judgement no check can make. DESIGN keeps
  the drawing out of the console's conformance review for that reason ("the SVG's own drawing …
  judged at story 06 against ADR-002's brief"). The operator asked for diagrams in the console's own
  style, so the operator judges whether they got it.

  RULINGS (QA, 2026-09-23).
  (1) The operator's words are recorded verbatim in `VERIFICATION.md` with the instant, and are
      never paraphrased into a pass.
  (2) A "not yet" is a finding against the drawing or the style file. It is fixed inside this story,
      because the item is open and ADR-003 §4 lets an open item re-draw and re-export. It is not a
      new ADR.
  (3) The board frame around the drawing was already judged by story 04's task 02 against DESIGN.
      This session judges the drawing itself.

  Background:
    Given task 00's evidence is recorded, and ADR-002's SVG and PNG are committed on the branch

  Scenario: the drawing shows what the brief asks for
    When the operator opens `diagrams/ADR-002-generator-seam.svg` beside ADR-002's `### Diagram` brief
    Then the operator confirms it is an architecture view whose components are the ones the brief lists
    And that its flows run config → plan → instructions → the drawn source → export → SVG → PNG → block → doctor → console
    And that the adapter boundary is the focal node, with aof's side on the left and the generator's on the right

  Scenario: the drawing is in the console's style
    When the operator views the SVG and the board's ARCHITECTURE tab side by side
    Then the operator confirms the diagram's palette, type and radius read as the console's own

  Scenario: the drawing reads outside the console
    When the operator opens the PNG, and the committed ARCHITECTURE.md on GitHub
    Then the operator confirms the PNG is legible and the SVG renders inline on GitHub
