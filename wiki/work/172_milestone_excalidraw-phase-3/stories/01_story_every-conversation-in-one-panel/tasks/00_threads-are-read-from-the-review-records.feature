@executable @ui @work @design
Feature: The conversation panel's threads are read from the review records in one pure model

  WHY. ADR-003 §2: the panel draws threads it does not compute. `conversation-model.mjs` turns the
  review records and the scene into threads — one per note, grouped by the shapes it names, a note
  with no shape under "Whole diagram" — with each thread's state and the proposal that answers it. It
  takes over `note-threads.mjs` (171/ADR-006's thread record and pins), so a pin and a panel card can
  never disagree about a note.

  Background:
    Given the scene of "ADR-003-push-stream.excalidraw" holds the nodes "Architect session", "Review store", "Events route" and "Editor"

  Rule: R1 · Every note on the diagram is a thread in the panel

    Scenario: E1 · notes become threads under the subjects they name
      Given an open note on "Events route", two notes on "Architect session" and one note on the whole diagram
      When the threads are read
      Then there are threads with the subjects "Events route", "Architect session" and "Whole diagram"
      And the "Architect session" thread holds both of its notes, oldest first

    Scenario: E2 · a note on a deleted shape is read under "Whole diagram" with no pin
      Given a note names the node "cache", which is no longer in the scene
      When the threads and the pins are read
      Then the note's thread has the subject "Whole diagram"
      And no pin is placed for it

    Scenario: E3 · a withdrawn note has no thread and no pin
      Given the note "r3" on "Editor" was withdrawn
      When the threads and the pins are read
      Then no thread holds "r3"
      And no pin is placed on "Editor"

    Scenario Outline: E4 · a thread's state says who has the last word
      Given a note on "Events route" whose <last>
      When the threads are read
      Then the "Events route" thread's state reads "<state>"

      Examples:
        | example | last                                            | state                     |
        | E4      | last turn is the architect's                    | Answered                  |
        | E4      | last turn is the operator's                     | Waiting for the architect |
        | E4      | request is answered by a pending proposal       | A proposal answers this   |
        |         | record predates threads and holds an answer     | Answered                  |

    Scenario: threads are listed with the most recent activity first
      Given the "Editor" note was last written at 14:05 and the "Events route" note at 14:02
      When the threads are read
      Then "Editor" is listed before "Events route"

  Rule: R4 · A proposal is decided in the thread that asked for it

    Scenario: E11 · a proposal is held by the thread whose note it answers
      Given the architect proposed relabelling the watch edge in answer to the "Events route" note
      When the threads are read
      Then the "Events route" thread holds that proposal with its summary and its changes
      And the count of pending proposals is 1

    Scenario: E12 · a rejected proposal keeps its outcome and its reason
      Given the proposal answering the "Events route" note was rejected with the reason "keep the label short"
      When the threads are read
      Then the thread's proposal reads "Rejected — keep the label short"
      And the count of pending proposals is 0
