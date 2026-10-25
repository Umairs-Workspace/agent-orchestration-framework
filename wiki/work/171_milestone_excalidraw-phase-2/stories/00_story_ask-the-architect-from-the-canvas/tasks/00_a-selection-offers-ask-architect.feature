@executable @ui @work @design
Feature: A selected shape offers Ask architect where it sits, positioned through one anchor module

  WHY. The only way to ask about a shape was the bar below the canvas (F-170-11), so the operator
  left the shape to find the bar. Excalidraw 0.18 has no context-menu or selection-toolbar API, so
  the editor draws one overlay above the canvas and places it through `canvas-anchor.mjs` (ADR-001).
  The operator ruled that the canvas offers only Ask architect; notes are added through the bar
  (171/00 Q1).

  Background:
    Given a saved diagram holding the box "gateway" at x 400, y 300, 160 wide and 80 high, and the box "cache" at x 640, y 300, 120 wide and 80 high
    And the canvas viewport is 1200 by 800 at scroll 0, 0 and zoom 1

  Rule: R1 · A selection offers Ask architect where it sits, and nothing else

    Scenario: E1 · a selected shape offers Ask architect above it, and no Add note
      When the operator selects "gateway"
      Then the overlay holds one "Ask architect" action, centred above "gateway"'s box, 8 px clear of it
      And the overlay holds no "Add note" action

    Scenario: E2 · two selected shapes share one action over the box enclosing both
      When the operator selects "gateway" and "cache"
      Then the overlay holds one action, centred above the box from x 400 to x 760

    Scenario Outline: no action is drawn when there is nothing to ask about here
      Given <state>
      When the overlay is drawn
      Then the overlay holds no action

      Examples:
        | example | state                                                     |
        |         | nothing is selected                                       |
        | E4      | the diagram is read-only and "gateway" is selected        |
        |         | the operator is mid-drag of "gateway"                     |

    Scenario: E3 · with nothing selected, the bar still offers Add note and Ask architect
      Given nothing is selected
      Then the bar below the canvas offers "Add note" and "Ask architect"

  Rule: R2 · Asking from the canvas is the same ask as from the bar

    Scenario: E5 · a question asked at the selection is recorded and launched as the bar's ask is
      Given the operator selected "gateway" and opened the action's question field
      When the operator types "Why does this write to the database directly?" and presses Enter
      Then a request naming "gateway" with that text is recorded
      And the architect is launched with "/aof:diagram-review 171 ADR-001-overlay.excalidraw <request id>"
      And the bar's Ask architect, given the same selection and text, records and launches the same

    Scenario: E6 · an unsaved canvas is saved before the ask is recorded
      Given the canvas holds an unsaved shape and "gateway" is selected
      When the operator asks "Why?" at the selection
      Then the draft is saved first
      And the request is recorded against the revision that save answered

    Scenario: E7 · Escape closes the field and asks nothing
      Given the operator selected "gateway" and opened the action's question field
      When the operator presses Escape
      Then nothing is recorded and nothing is launched
      And the "Ask architect" action is shown again

    Scenario: an empty question cannot be asked
      Given the operator selected "gateway" and opened the action's question field
      Then the field's Ask button is disabled until the question has text

  Rule: R3 · The action stays with its selection on screen

    Scenario Outline: the anchor follows scroll, zoom and the canvas edge
      Given "gateway" is selected
      When the canvas is at scroll <scrollX>, <scrollY> and zoom <zoom>
      Then the action is <where>

      Examples:
        | example | scrollX | scrollY | zoom | where                                              |
        | E8      | -200    | 0       | 1    | 200 px further left than at scroll 0, 0            |
        |         | 0       | 0       | 2    | centred above "gateway"'s box drawn at twice size  |
        | E9      | 0       | -296    | 1    | below "gateway"'s box, because there is no room above |
        | E10     | -2000   | 0       | 1    | not drawn, because "gateway" is out of view        |
        |         | -500    | 0       | 1    | kept inside the canvas's left edge                 |
