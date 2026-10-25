@executable @ui @work @board
Feature: The terminal control types a later input into its live session, once per sequence number

  WHY. The dock types its command once per session, and the session's identity does not include the
  command, so a second command on the same dock is never typed (ADR-005). One seam lets a surface type
  further input into a live session on the same raw path a keystroke takes; the once-per-sequence
  rule lives in `input-policy.mjs`, where a suite reads it without React.

  Rule: R3 · Each note is typed exactly once, in the order written

    Scenario: a later input is typed into the open session and submitted
      Given a dock terminal whose session socket is open and whose input is enabled
      When the surface hands it the later input "/aof:diagram-review 171 ADR-003-push-stream.excalidraw a1b2" with sequence 1
      Then the socket receives "/aof:diagram-review 171 ADR-003-push-stream.excalidraw a1b2" followed by a carriage return, as raw input

    Scenario: E7 · the same sequence number is never typed twice
      Given the dock terminal typed the later input with sequence 1
      When the surface re-renders and hands it sequence 1 again
      Then nothing more is sent to the socket

    Scenario: E6 · two later inputs are typed in the order handed
      Given a dock terminal whose session socket is open and whose input is enabled
      When the surface hands it sequence 1 for note "n1", then sequence 2 for note "n2"
      Then the socket receives note "n1"'s invocation before note "n2"'s

    Scenario Outline: a later input that cannot be typed is not typed, and says so
      Given a dock terminal <state>
      When the surface hands it a later input with sequence 1
      Then nothing is sent to the socket
      And the terminal answers the input as not delivered

      Examples:
        | example | state                                    |
        | E8      | whose posture accepts no input           |
        |         | whose socket has closed                  |
        |         | that has not connected yet                |

    Scenario: the mount's own first command is still typed once, unchanged
      Given a dock terminal mounted with the command "/aof:diagram-review 171 ADR-003-push-stream.excalidraw a1b2"
      When its socket opens and the session paints
      Then the command is typed exactly once

    @bug @finding-F-171-01
    Scenario Outline: the mount's command waits until the session can take it
      Given a dock terminal mounted with the command "/aof:diagram-review 171 ADR-003-push-stream.excalidraw a1b2"
      When its socket opens and the session paints <output>
      Then the command is <typed>

      Examples:
        | output                                                      | typed              |
        | its banner, before paste mode is on                          | not typed yet      |
        | a probe that turns paste mode on and off, drawing nothing    | not typed yet      |
        | its prompt, drawn after paste mode turned on                 | typed exactly once |
        | nothing that turns paste mode on, until the ready cap passes | typed exactly once |
