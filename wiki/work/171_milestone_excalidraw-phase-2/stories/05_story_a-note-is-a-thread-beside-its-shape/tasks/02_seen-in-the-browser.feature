@manual @ui @work @design
Feature: Threads beside their shapes, seen in a real browser

  WHY. A pin on a corner and a popover beside a box exist only on a drawn canvas. The smoke stands in
  for the architect with the real CLI calls; its screenshots are read, not only taken (170
  RETROSPECTIVE R1, R6, R8).

  Rule: R3 · A note's thread is read beside the shape it names

    Scenario: a thread is read and answered beside its shape
      Given the served editor is open on a saved diagram with a note on one box, answered by the stand-in architect
      When the operator chooses the box's pin, reads the answer and replies
      Then the thread opens beside the box, the reply is its third turn, and the box stays visible
      And the screenshot is read and matches DESIGN.md's "Note pins and their thread" baseline

    Scenario: the pin follows its shape on pan and zoom
      Given the served editor shows a pin on a box
      When the operator pans and zooms the canvas
      Then the pin stays on the box's top-right corner
