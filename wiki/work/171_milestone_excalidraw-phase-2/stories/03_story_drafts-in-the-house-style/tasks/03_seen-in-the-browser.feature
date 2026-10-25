@manual @ui @work @design
Feature: The house style, seen in a real browser

  WHY. Whether a first draft looks like the console only shows on a canvas; the converter and the
  SDK, not the server, draw it. The smoke stands in for the architect with the real CLI calls, and
  its screenshots are read (170 RETROSPECTIVE R1, R6, R8).

  Rule: R2 · A node the architect adds without a style is filled in with the house style

    Scenario: an accepted first draft is drawn in the house style
      Given the served editor is open on an empty diagram in a project whose style guide is this repository's
      When the stand-in architect proposes a first draft with no style lines and the operator accepts it
      Then every box is drawn with a paper fill and an ink stroke, and its label in ink
      And the screenshot is read and the labels fit their boxes

  Rule: R3 · A shape the operator draws by hand starts in the house style

    Scenario: a rectangle drawn by hand starts in the house style
      Given the served editor is open on the same diagram
      When the operator draws a rectangle and saves
      Then the saved rectangle's stroke is "#1b1f27", its background "#f3f5f7" and its fill solid
