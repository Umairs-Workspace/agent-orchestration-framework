@manual @ui @work @design
Feature: Pushed review records, seen in a real browser

  WHY. An EventSource, a served route and a canvas replaced in place meet only in a browser. The
  smoke serves a throwaway project with the real `aof work ui` and stands in for the architect with
  the real CLI calls `/aof:diagram-review` makes, so no paid session runs unattended (170
  RETROSPECTIVE R3). Screenshots are read, not only taken.

  Rule: R1 · What the architect writes appears in the open editor without a reload

    Scenario: an answer and a proposal appear without a reload
      Given the served editor is open on a saved diagram with one open note
      When the stand-in architect runs "--action respond" for the note, then "--action propose" for a second note
      Then the panel shows the answer and the pending proposal, each within 2 seconds of its write
      And the page was not reloaded

  Rule: R2 · The canvas follows a draft saved elsewhere, without losing unsaved work

    Scenario: a draft saved in a second window reaches a clean canvas, and is offered to a dirty one
      Given the served editor is open in two windows on the same saved diagram
      When the second window adds a shape and saves
      Then the first window's canvas shows the new shape without a reload
      When the first window draws an unsaved shape and the second window saves again
      Then the first window keeps its unsaved shape and shows the "changed elsewhere" line
      And the screenshot of that line is read and matches DESIGN.md's "The draft changed elsewhere" checklist
