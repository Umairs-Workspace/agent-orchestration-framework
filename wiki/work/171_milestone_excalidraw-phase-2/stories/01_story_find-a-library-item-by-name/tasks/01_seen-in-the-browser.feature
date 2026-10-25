@manual @ui @work @design
Feature: Library search, seen in a real browser

  WHY. Excalidraw draws the sidebar and the canvas; whether a tab sits beside the Library panel, a
  click lands at the centre of the view and a drag lands where it is dropped can only be seen in a
  browser. The smoke runs the served editor in Chrome; its screenshots are read, not only taken
  (170 RETROSPECTIVE R1, R6, R8). The check uses a library of at least 30 items, so filtering is
  visible.

  Rule: R1 · Typing filters the items by item name or library name, ignoring case

    Scenario: the Find tab sits beside the Library tab and filters as the operator types
      Given the served editor is open on a saved diagram, with a 30-item library in the global home
      When the operator opens the sidebar's Find tab and types "kin"
      Then only the items whose item or library name contains "kin" are shown, each with its preview, name and library
      And the screenshot of the tab is read and matches DESIGN.md's "Find in libraries" baseline

  Rule: R3 · An item found by search is inserted exactly as one from the Library panel

    Scenario: a clicked result lands at the centre of the view and saves as a library node
      Given the served editor is open on a saved diagram, with a 30-item library in the global home
      When the operator clicks a found item and saves
      Then the item is drawn at the centre of the visible canvas
      And the Mermaid view reads a "%% aof:lib" line naming that library and item

    Scenario: a dragged result lands where it is dropped
      Given the served editor is open on a saved diagram, with a 30-item library in the global home
      When the operator drags a found item to the lower-left quarter of the canvas and saves
      Then the item is drawn where it was dropped
      And the Mermaid view reads a "%% aof:lib" line naming that library and item
