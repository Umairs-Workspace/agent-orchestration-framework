@executable @cli @work @design
Feature: A note is a thread on its request record — the operator replies, the architect answers, every reader keeps working

  WHY. A request record holds one note and one answer, so a follow-up meant a new, unconnected note.
  A thread on the same record keeps the conversation with the note it continues — one artifact, not a
  second file to keep in step (ADR-006, 170 RETROSPECTIVE R5). `answer` keeps meaning the latest
  architect turn, so the panel, the batch review and `context` read it as before.

  Background:
    Given item 171 holds a saved diagram "ADR-006-threads.excalidraw" with the node "gateway"
    And a note "Why does this write to the database?" on "gateway", answered by the architect with "It avoids a queue hop."

  Rule: R1 · A reply continues the note, reopens it, and reaches an open session

    Scenario: E1 · a reply is the thread's third turn and reopens the note
      When the operator replies "And what about the cache?" to the note
      Then the note's thread is
        | by        | text                                 |
        | operator  | Why does this write to the database? |
        | architect | It avoids a queue hop.               |
        | operator  | And what about the cache?            |
      And the note is open
      And the batch review's open notes include it

    Scenario: E2 · a reply to a note a proposal closed reopens it and leaves the proposal alone
      Given the architect answered a second note on "gateway" with a pending proposal
      When the operator replies "Keep the old label" to that note
      Then that note is open
      And the proposal is still pending, unchanged

    Scenario Outline: a reply that cannot be recorded is refused and changes nothing
      Given <state>
      When the operator replies "<text>" to the note
      Then the reply is refused with the code "<code>"
      And the note's record is unchanged

      Examples:
        | example | state                                         | text                    | code                      |
        | E3      | the operator withdrew the note                 | One more thing          | diagram-request-decided   |
        |         | the note's record is at its size limit         | One more thing          | diagram-review-too-large  |
        |         | the note is as above                           |                         | diagram-scene-invalid     |
        |         | item 171 is done, so the diagram is read-only  | One more thing          | diagram-item-delivered    |

  Rule: R2 · The architect's answer is a turn of the thread

    Scenario: E4 · the architect's response is a turn, and the answer is that turn
      Given the operator replied "And what about the cache?" to the note
      When the architect responds "The cache is read-through; it never writes." to the note
      Then the thread's last turn is the architect's "The cache is read-through; it never writes."
      And the note's answer is "The cache is read-through; it never writes."
      And the note is answered

    Scenario: E5 · a record from before threads reads as the turns it implies
      Given a stored note record with a request and an answer and no thread
      When the note is listed and its context is read
      Then its thread is the operator's request then the architect's answer

    Scenario: E6 · the architect's context carries the whole thread, oldest first
      Given the operator replied "And what about the cache?" to the note
      When the architect reads the context for the note
      Then the context's thread holds the three turns, oldest first

    Scenario: the review command answers the latest operator turn
      When the rendered "/aof:diagram-review" command is read for Claude, OpenCode and Codex
      Then each says to read the note's thread and answer its latest operator turn
