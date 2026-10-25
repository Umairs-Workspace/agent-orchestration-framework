@executable @ui @work @design
Feature: A note's thread is pinned beside the shape it names

  WHY. A question about a box is easiest to settle next to the box. Pins and their thread are
  components of the one canvas overlay, placed only through `canvas-anchor.mjs` (ADR-001); which
  notes belong to which shape, and what a pin says, is decided in a pure module the editor and its
  suite share.

  Background:
    Given a diagram holding the nodes "gateway" and "cache"

  Rule: R3 · A note's thread is read beside the shape it names

    Scenario: E7 · a note on a shape is pinned to that shape's corner
      Given a note on "gateway"
      When the editor places the note pins
      Then one pin sits at the top-right corner of "gateway"'s box
      And choosing the pin opens that note's thread beside "gateway"

    Scenario: E8 · two notes on one shape share a pin that counts them
      Given two notes on "gateway"
      When the editor places the note pins
      Then one pin sits on "gateway" showing 2
      And its thread lists both notes, oldest first

    Scenario Outline: a note with no shape on the canvas has no pin and stays in the panel
      Given a note on <target>
      When the editor places the note pins
      Then no pin is drawn for it
      And the review panel lists it

      Examples:
        | example | target                                 |
        | E9      | the whole diagram                      |
        | E10     | "gateway", which has since been deleted |
        |         | a withdrawn note on "gateway"           |

    Scenario: E11 · a note on two shapes is pinned once, to the box enclosing both
      Given one note on "gateway" and "cache"
      When the editor places the note pins
      Then one pin sits at the top-right corner of the box enclosing "gateway" and "cache"

  Rule: R4 · The pin says whether the architect is waiting on the operator

    Scenario Outline: the pin's colour follows the thread's last turn
      Given a note on "gateway" whose last turn is the <author>'s
      When the editor places the note pins
      Then the pin is drawn <colour>

      Examples:
        | example | author    | colour                        |
        | E12     | architect | in the console's primary colour |
        | E13     | operator  | muted                         |

  Rule: R1 · A reply continues the note, reopens it, and reaches an open session

    Scenario: E14 · a reply made while the architect's session runs is delivered to it
      Given the architect's session is running in the dock
      When the operator replies "And what about the cache?" in the thread of note "n7"
      Then the editor hands the surface's delivery the invocation "/aof:diagram-review 171 ADR-006-threads.excalidraw n7"

    Scenario: a reply with no session running is recorded and waits
      Given no architect session is running
      When the operator replies "And what about the cache?" in the thread
      Then the reply is recorded and nothing is delivered
