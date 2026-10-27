@manual @ui @work @design @bug @finding-F-171-03
Feature: The right-click skew is reproduced before anything is fixed

  WHY. F-171-03: at 171's `@uat` the drawing skewed after a right-click — arrow segments missing,
  labels stacked on one edge — until a reload, while the saved scene was clean. The verifier could
  not reproduce it with one gesture. The SPEC orders it reproduced first, so the developer drives
  every gesture over a copy of the very scene it was seen on, measures before and after, and records
  the outcome either way in the milestone's VERIFICATION under F-171-03.

  Background:
    Given the browser smoke serves a copy of 171's "ADR-003-push-stream.excalidraw" as the saved draft

  Rule: R2 · The skew is reproduced before anything is fixed, or ruled out on the record

    Scenario Outline: each gesture is measured before and after
      When the developer performs <gesture>
      Then a canvas screenshot before the gesture and one after the menu closes are compared
      And each arrow's points and each label's container in the editor are compared with the saved scene
      And the gesture, both screenshots and both comparisons are recorded in VERIFICATION

      Examples:
        | example | gesture                                                        |
        | E1      | a right-click on empty canvas, then Escape                      |
        | E2      | a right-click on the "propose" edge's label, then Escape        |
        | E3      | a right-click on "Review store", Copy, then a click on empty canvas |
        | E4      | a right-click and Escape, then a 100 px pan and a zoom to 110%  |
        |         | a right-click on an arrow's body, then Escape                   |

    Scenario: E5 · a reproduced skew is pinned to aof's layer or to the SDK
      Given one gesture reproduces the skew
      When the developer repeats it with the canvas overlay unmounted, then with the library sidebar unmounted
      Then VERIFICATION records which layer must be present for the skew to appear, or that it appears with neither

    Scenario: E6 · a skew seen nowhere is ruled out only after the panel lands
      Given no gesture reproduces the skew on the current tree
      When the developer repeats every gesture after story 01's panel has landed
      Then VERIFICATION records F-171-03 as ruled out, naming each gesture and its screenshots
