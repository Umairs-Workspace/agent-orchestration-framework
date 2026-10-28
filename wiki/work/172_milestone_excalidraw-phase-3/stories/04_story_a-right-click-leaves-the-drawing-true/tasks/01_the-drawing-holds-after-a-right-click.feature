@manual @ui @work @design @bug @finding-F-171-03
Feature: The drawing holds after a right-click, checked in a real browser

  WHY. Whatever task 00 finds, the editor owes a standing check that a right-click leaves the drawing
  as it was, so the skew cannot return unseen. The browser smoke carries it; the developer runs it and
  reads the screenshots, and records the result in VERIFICATION. When task 00 reproduced the skew,
  this check is red on the tree before the fix.

  Background:
    Given the browser smoke serves a copy of 171's "ADR-003-push-stream.excalidraw" as the saved draft

  Rule: R1 · After a right-click and the menu closing, the canvas draws the scene as it was

    Scenario: E1 · a right-click on empty canvas leaves every arrow whole
      When the developer right-clicks empty canvas and presses Escape
      Then the canvas screenshot after differs from the one before in under 0.5% of its pixels
      And every arrow's points equal the saved scene's

    Scenario: E2 · a right-click on a label leaves every label on its own edge
      When the developer right-clicks the "propose" edge's label and presses Escape
      Then the "propose" label's container is the architect-session → review-store edge, as saved
      And no other label's position has changed

    Scenario: E3 · a menu action that changes nothing moves nothing
      When the developer right-clicks "Review store", chooses Copy, and clicks empty canvas
      Then the canvas screenshot after differs from the one before in under 0.5% of its pixels

    Scenario: E4 · a pan and a zoom after a right-click move the drawing whole
      When the developer right-clicks empty canvas, presses Escape, pans 100 px and zooms to 110%
      Then every arrow is drawn joined to the boxes it connects, read from the screenshot
      And every label sits on its own edge

  Rule: R2 · The skew is reproduced before anything is fixed, or ruled out on the record

    Scenario: E5 · a reproduced skew turns the check red before the fix and green after
      Given task 00 reproduced the skew with one gesture
      When the developer runs the check on the tree before the fix, then after it
      Then it fails before and passes after
      And VERIFICATION records both runs under F-171-03
