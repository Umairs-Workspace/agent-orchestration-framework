@executable @cli @work @design
Feature: The board face streams what moved in a diagram — a stamp, never the records

  WHY. The architect writes review records from its own CLI process, so the open editor learns of
  them only by asking (F-170-13). A new `stamp` action answers the diagram's file identities and the
  directories that hold them; the board face watches those directories and sends one event each
  time the stamp changes. The event says what moved; the editor re-reads through the actions it
  already uses, so the records keep one reader (ADR-003).

  Background:
    Given a project with diagrams on and item 171 holding a saved diagram "ADR-003-push-stream.excalidraw" with one open note

  Rule: R4 · The stream says what moved, never the records, and only for a diagram that exists

    Scenario: the stamp names the scene, the review records and the directories to watch
      When "aof diagram scene 171 ADR-003-push-stream.excalidraw --action stamp --json" runs
      Then the answer carries a scene stamp, a review stamp and the directories to watch
      And every directory it names is inside item 171's "diagrams" folder
      And the stamp is unchanged when it runs again with nothing written

    Scenario Outline: a write changes the stamp it belongs to
      When <write>
      And the stamp is taken again
      Then the <moved> stamp has changed and the <still> stamp has not

      Examples:
        | write                                              | moved  | still  |
        | the architect responds to the open note            | review | scene  |
        | the architect proposes for the open note           | review | scene  |
        | the operator withdraws the open note               | review | scene  |
        | the diagram is saved with one more shape           | scene  | review |

    Scenario: E11 · a written proposal is one review event carrying a stamp and no proposal text
      Given a client is connected to "/api/diagram/events?ref=171&file=ADR-003-push-stream.excalidraw"
      When the architect proposes for the open note with the summary "Split the gateway"
      Then the client receives one "review" event within 2 seconds
      And the event carries the new review stamp
      And no event carries the text "Split the gateway"

    Scenario: a save is one scene event
      Given a client is connected to "/api/diagram/events?ref=171&file=ADR-003-push-stream.excalidraw"
      When the diagram is saved with one more shape
      Then the client receives one "scene" event within 2 seconds, carrying the new scene revision

    Scenario: the stream answers as an event stream that is never cached
      When a client connects to "/api/diagram/events?ref=171&file=ADR-003-push-stream.excalidraw"
      Then the response is 200 with content type "text/event-stream" and "cache-control: no-store"
      And the first event carries the current stamps

    Scenario Outline: a stream that cannot name a diagram opens nothing
      When a client connects to "<address>"
      Then the response is <status> with the code "<code>"
      And no watch is armed

      Examples:
        | example | address                                                            | status | code                       |
        | E12     | /api/diagram/events?ref=999&file=ADR-003-push-stream.excalidraw    | 404    | ref-not-found              |
        |         | /api/diagram/events?ref=171&file=..%2Fsecret.excalidraw            | 400    | diagram-scene-file-invalid |
        |         | /api/diagram/events?ref=171&file=ADR-003-push-stream.svg           | 400    | diagram-scene-file-invalid |

    Scenario: a quiet stream is kept open by a comment line
      Given a client is connected to the stream and nothing is written
      When 25 seconds pass on the face's clock
      Then the client receives a comment line and no event

    Scenario: a closed connection closes its watch
      Given a client is connected to the stream
      When the client disconnects
      Then the watch armed for that client is closed

  Rule: R3 · When the stream cannot run, the editor still updates

    Scenario: E9 · when the folder cannot be watched, the face ticks
      Given the face's watch cannot start on the diagram's folders
      And a client is connected to the stream
      When the architect responds to the open note
      Then the client receives one "review" event within 4 seconds

    Scenario: a missed watch event is caught by the safety re-stamp
      Given a client is connected to the stream and the watch reports nothing
      When the architect responds to the open note and 30 seconds pass on the face's clock
      Then the client receives one "review" event
