@manual @ui @work @design
Feature: Ask architect at the selection, seen in a real browser

  WHY. Whether an overlay sits on Excalidraw's canvas, clear of the SDK's own floating panels, and
  follows a shape on pan and zoom shows only on a drawn canvas. The smoke serves the editor and its
  screenshots are read, not only taken (170 RETROSPECTIVE R1, R6, R8). The dock's launch is observed
  as the invocation the surface receives, so no paid session runs unattended.

  Rule: R1 · A selection offers Ask architect where it sits, and nothing else

    Scenario: the action appears at a selected box and asks from there
      Given the served editor is open on a saved diagram with three boxes
      When the operator selects a box, chooses "Ask architect", types a question and presses Enter
      Then the action sat just above the box, clear of Excalidraw's own panels
      And the review panel lists the request naming that box, and the dock was handed its invocation
      And the screenshot of the action is read and matches DESIGN.md's "Ask architect at the selection" baseline

  Rule: R3 · The action stays with its selection on screen

    Scenario: the action follows the box on pan and zoom
      Given the served editor shows the action at a selected box
      When the operator pans and then zooms the canvas
      Then the action stays above the box each time
