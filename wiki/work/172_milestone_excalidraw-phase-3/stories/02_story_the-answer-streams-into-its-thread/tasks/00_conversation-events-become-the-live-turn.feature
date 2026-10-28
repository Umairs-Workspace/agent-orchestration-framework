@executable @ui @work @design
Feature: The stream's conversation events become each thread's live turn and the session's state

  WHY. The board forwards the architect's session as `conversation` events on the diagram's one
  events stream (ADR-002). What an event means for the editor — which thread grows, when a live turn
  gives way to the recorded one, what the chip says — is decided in two pure reducers, so a suite
  drives exactly what the panel draws (ADR-003 §2).

  Background:
    Given the editor holds the thread "Events route" for note "r7" of "ADR-003-push-stream.excalidraw"

  Rule: R1 · Asking delivers the question to the architect's session, and its answer streams into the new thread

    Scenario: E1 · the answer grows in its thread as its text arrives
      Given the session state is "starting"
      When a "turn" event for "r7" arrives, then "text" events "The writer is " and "another process"
      Then the "Events route" thread's live turn reads "The writer is another process"
      And the session state is "answering"

    Scenario: E3 · a delivery waiting behind another turn reads as queued
      Given the session is answering "r5"
      When a "session" event lists "r7" as queued
      Then the "Events route" thread reads "Queued — the architect is answering another note"

    Scenario: an editor that connects mid-answer starts from the snapshot
      Given the editor has no live turn
      When a "snapshot" event arrives with state "answering", turn "r7" and text "The writer is another"
      Then the "Events route" thread's live turn reads "The writer is another"
      And the session state is "answering"

    Scenario: a batch turn is never guessed onto a thread
      When a "turn" event with no request id arrives, then the "text" event "Reviewing 2 notes"
      Then no thread holds a live turn
      And the panel's header line reads "Reviewing 2 notes"

  Rule: R4 · What the architect records replaces what streamed

    Scenario: E8 · the recorded answer replaces the live turn
      Given the "Events route" thread's live turn reads "The writer is another process"
      When the records are re-read and note "r7" holds an architect turn recorded after the live turn began
      Then the thread's latest turn is the recorded answer
      And the thread has no live turn

    Scenario: E9 · a proposal replaces the live turn
      Given the "Events route" thread's live turn reads "I will relabel the edge"
      When the records are re-read and a proposal answering "r7" is pending
      Then the thread's latest turn holds the proposal
      And the thread has no live turn

    Scenario: E10 · a turn that ends with nothing recorded says the architect stopped
      Given the "Events route" thread's live turn reads "The writer is"
      When a "turn-end" event for "r7" arrives with outcome "failed"
      And the records hold no architect turn for "r7" newer than the live turn
      Then the thread reads "The architect stopped before it answered" and offers Ask again
      And note "r7" is still open

  Rule: R5 · The panel says what the architect's session is doing

    Scenario Outline: the session state follows the events
      Given the session state is "<before>"
      When <event> arrives
      Then the session state is "<after>"

      Examples:
        | example | before      | event                                           | after       |
        | E11     | not-started | a "session" event with state "starting"          | starting    |
        |         | starting    | a "text" event for "r7"                          | answering   |
        |         | answering   | a "turn-end" event for "r7" with nothing queued  | idle        |
        |         | idle        | a "session" event with state "ended"             | ended       |
        |         | answering   | a "session" event with state "ended"             | ended       |

    Scenario: E13 · a denied tool is named in the thread
      When a "turn-end" event for "r7" arrives naming the denied tool "Bash" with input "git status"
      Then the "Events route" thread shows "The architect was not allowed to run git status"
