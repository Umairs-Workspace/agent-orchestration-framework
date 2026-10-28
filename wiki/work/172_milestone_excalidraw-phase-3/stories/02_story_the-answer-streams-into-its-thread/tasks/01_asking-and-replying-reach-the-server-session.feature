@executable @ui @work @design
Feature: Asking and replying reach the architect's session on the server, and the diagram surface opens no terminal

  WHY. F-171-04: every question opened or typed into a visible terminal dock. The editor now hands
  each delivery to the board's conversation route by request id (ADR-002 §1), in one pure decision
  per action, and the diagram surface renders no dock at all (ADR-003 §4).

  Background:
    Given the editor is open on "ADR-003-push-stream.excalidraw" of item 171

  Rule: R1 · Asking delivers the question to the architect's session, and its answer streams into the new thread

    Scenario: E1 · asking posts the new note's request id and opens no terminal
      Given no note is waiting
      When the operator asks "Why does the route re-stamp?" about "Events route" and it is recorded as "r7"
      Then the editor posts {"requestId":"r7"} to the conversation route
      And the diagram surface renders no terminal

    Scenario: E2 · asking with notes waiting posts the question, then one batch review
      Given the notes "r1" and "r2" are waiting
      When the operator asks "Why does the route re-stamp?" and it is recorded as "r7"
      Then the editor posts {"requestId":"r7"}, then {}

  Rule: R2 · A reply continues the thread, and the next answer streams the same way

    Scenario: E4 · a reply posts its note's request id
      When the operator replies "And if the watch cannot start?" in the thread of "r7"
      Then the reply is recorded on "r7"
      And the editor posts {"requestId":"r7"} to the conversation route

    Scenario: E5 · a reply with no session running still posts, and the server starts one
      Given the session state is "ended"
      When the operator replies "And if the watch cannot start?" in the thread of "r7"
      Then the editor posts {"requestId":"r7"} to the conversation route

  Rule: R3 · Saving a note sends nothing; reviewing the waiting notes sends them all

    Scenario: E6 · Save as note posts nothing
      When the operator saves the note "Should a hidden tab stop the stream?" on "Editor"
      Then the note is recorded
      And nothing is posted to the conversation route

    Scenario: E7 · reviewing the waiting notes posts one batch review
      Given the notes "r1" and "r2" are waiting
      When the operator chooses "Review with the architect"
      Then the editor posts {} to the conversation route once

    Scenario Outline: each action delivers exactly what it names
      When the operator <action>
      Then the editor posts <posted>

      Examples:
        | example | action                                              | posted                         |
        |         | requests a first draft recorded as "r9", no note waiting | {"requestId":"r9"}       |
        |         | chooses Ask again in the thread of "r7"              | {"requestId":"r7"}             |
        |         | withdraws the waiting note "r1"                      | nothing                        |

  Rule: R5 · The panel says what the architect's session is doing

    Scenario: E12 · an unavailable session shows the command to run instead
      Given the conversation route answers 503 "architect-session-unavailable"
      When the operator asks "Why does the route re-stamp?" and it is recorded as "r7"
      Then the session state is "unavailable"
      And the panel shows "/aof:diagram-review 171 ADR-003-push-stream.excalidraw" with Copy
      And note "r7" is still open
