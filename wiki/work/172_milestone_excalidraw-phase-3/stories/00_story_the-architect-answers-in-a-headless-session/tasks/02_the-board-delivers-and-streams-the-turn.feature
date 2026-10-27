@executable @cli @work @board
Feature: The board delivers a request to the architect's session and streams its turn on the diagram's events stream

  WHY. ADR-002: the editor names a request id; the board asks `diagram:scene --action session` what to
  type and which tools to allow, hands it to the `conversations` port, and forwards the session's
  events on the diagram's one events stream, opening with a snapshot so a late editor catches up.
  The face still imports nothing of `@aof/diagrams` (FF-17101), and the invocation and tool list have
  one home (FF-17202). The suite drives the board API with a recording port and the real scene
  command over a fixture project.

  Background:
    Given a board over a fixture project whose item 171 holds "ADR-003-push-stream.excalidraw" with the open note "r7"

  Rule: R1 · The first delivery for an open diagram starts its one session

    Scenario: E1 · a posted request id is delivered as the review invocation, in the project root
      When the editor posts {"requestId":"r7"} to "/api/diagram/conversation?ref=171&file=ADR-003-push-stream.excalidraw"
      Then the port is handed "/aof:diagram-review 171 ADR-003-push-stream.excalidraw r7" for "r7"
      And the tools "Read", "Grep", "Glob", "Write" and "Bash(aof diagram scene:*)"
      And the project root as the directory, keyed by ref "171" and file "ADR-003-push-stream.excalidraw"
      And the answer carries the port's outcome

    Scenario: an empty body delivers the batch review
      When the editor posts {} to the conversation route
      Then the port is handed "/aof:diagram-review 171 ADR-003-push-stream.excalidraw" with no request id

    Scenario: a cross-origin post is refused before the body is read
      When a post arrives from another origin
      Then it is refused as every board write is, and nothing is handed to the port

    Scenario: E2 · each connected editor receives the session's events for its diagram only
      Given two editors are connected to the events stream of "ADR-003-push-stream.excalidraw" and one to "ADR-001-overlay.excalidraw"
      When the port emits a "text" event for "ADR-003-push-stream.excalidraw"
      Then both "ADR-003-push-stream.excalidraw" streams carry it as a "conversation" event
      And the "ADR-001-overlay.excalidraw" stream does not

  Rule: R5 · An editor that connects mid-answer catches up

    Scenario: E11 · the first conversation event of a connection is the snapshot
      Given the port's session for the diagram is answering "r7" with 300 characters written
      When an editor connects to the events stream
      Then its first "conversation" event carries the state "answering", the request "r7" and those 300 characters

    Scenario: a closed connection stops forwarding and leaves the port
      Given an editor connected to the events stream
      When the connection closes
      Then the port has no subscriber from that connection

  Rule: R6 · The board refuses what it cannot deliver

    Scenario: E12 · a request id the diagram does not hold is refused
      When the editor posts {"requestId":"r99"}
      Then the answer is a refusal naming the unknown request
      And nothing is handed to the port

    Scenario: E13 · with no session to launch the post answers unavailable
      Given the board was composed with no conversations port
      When the editor posts {"requestId":"r7"}
      Then the answer is 503 "architect-session-unavailable" with the reason
      And note "r7" is still open

  Rule: R4 · The architect can only do what the review needs

    Scenario: the invocation and the tools are spelled in one module
      When the arch test FF-17202 reads every source file under "packages" and "apps"
      Then "/aof:diagram-review" and the tool list are spelled only in "packages/diagrams/src/review-session.mjs"
      And a planted second spelling in another module is reported

    Scenario: the conversation route keeps the face free of the diagrams package
      When the arch test FF-17101 reads the board face's diagram routes
      Then the conversation route imports nothing of "@aof/diagrams" and invokes only "diagram:scene"
