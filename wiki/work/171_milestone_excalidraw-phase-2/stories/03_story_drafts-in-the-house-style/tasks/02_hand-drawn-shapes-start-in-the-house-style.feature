@executable @ui @work @design
Feature: A shape the operator draws by hand starts in the house style

  WHY. The operator ruled on 2026-10-24 that shapes drawn by hand also start in the house style, so
  a diagram does not mix the architect's coloured nodes with black, unfilled hand-drawn ones. The
  `read` answer carries the palette, and the editor sets the canvas's defaults for a new shape from
  it (ADR-004). Excalidraw keeps one default stroke colour for every element.

  Rule: R3 · A shape the operator draws by hand starts in the house style

    Scenario: E9 · the canvas's defaults come from the palette
      Given the diagram's read answer carries the palette paper "#f3f5f7" and ink "#1b1f27"
      When the editor's canvas defaults are computed
      Then the default stroke colour is "#1b1f27"
      And the default background colour is "#f3f5f7"
      And the default fill style is "solid"

    @cli
    Scenario: the read answer carries the palette
      Given a project whose style guide gives paper "#f3f5f7" and ink "#1b1f27"
      When "aof diagram scene 171 ADR-004-house-style.excalidraw --json" reads the diagram
      Then the answer's palette gives paper "#f3f5f7" and ink "#1b1f27"

    Scenario: E10 · a stored scene's own colours are never overridden by the defaults
      Given the saved scene holds a rectangle with stroke "#e03131"
      When the editor opens it with the palette's canvas defaults
      Then the rectangle's stroke is "#e03131"

    Scenario: E11 · with no palette the canvas keeps Excalidraw's own defaults
      Given the diagram's read answer carries no palette
      When the editor's canvas defaults are computed
      Then no default colour is set, and Excalidraw's own apply
