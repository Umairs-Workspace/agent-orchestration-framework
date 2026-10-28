@executable @cli @work @design
Feature: claude's stream-json output lines become conversation events in one reader

  WHY. A headless `claude` reports everything on stdout as stream-json lines (RESEARCH Q1): text
  deltas, whole assistant messages with tool uses, tool results, a `result` that ends each turn, and
  system and rate-limit lines nobody here needs. One pure reader in `conversation-session.mjs` turns
  them into the few events the board forwards (ADR-001 §1), so the session's process handling and
  the editor never parse a line themselves.

  Background:
    Given a reader for a session whose turn in flight answers request "r7"

  Rule: R2 · A session answers one turn at a time, in the order they were delivered

    Scenario: a text delta becomes a text event for the turn in flight
      When the line {"type":"stream_event","event":{"type":"content_block_delta","delta":{"type":"text_delta","text":"The writer is "}}} is read
      Then one "text" event is produced for "r7" with the text "The writer is "

    Scenario: a tool use becomes an activity event naming the tool
      When an "assistant" line holding a "tool_use" of "Bash" with the command "aof diagram scene 171 ADR-003-push-stream.excalidraw --action context --input c.json --json" is read
      Then one "activity" event is produced for "r7" naming "Bash" with the label "aof diagram scene … --action context"

    Scenario: the result line ends the turn
      When the line {"type":"result","subtype":"success","result":"Done.","permission_denials":[]} is read
      Then one "turn-end" event is produced for "r7" with the outcome "done" and no denials
      And the reader has no turn in flight

    Scenario Outline: a line the conversation does not use produces nothing
      When the line <line> is read
      Then no event is produced

      Examples:
        | line                                                                  |
        | {"type":"system","subtype":"init","session_id":"s1"}                  |
        | {"type":"system","subtype":"hook_started"}                            |
        | {"type":"rate_limit_event"}                                           |
        | {"type":"stream_event","event":{"type":"message_start"}}              |
        | {"type":"user","message":{"content":[{"type":"tool_result","content":"ok"}]}} |
        | not json at all                                                       |
        | {"type":"a-type-from-a-later-claude"}                                 |

  Rule: R4 · The architect can only do what the review needs

    Scenario: E10 · a denied tool is named on the turn's end
      When the line {"type":"result","subtype":"success","result":"Answered without it.","permission_denials":[{"tool_name":"Bash","tool_input":{"command":"git status"}}]} is read
      Then one "turn-end" event is produced for "r7" with the outcome "done"
      And it names the denied tool "Bash" with the input "git status"

    Scenario: a result that is not a success ends the turn as failed
      When the line {"type":"result","subtype":"error_during_execution","result":""} is read
      Then one "turn-end" event is produced for "r7" with the outcome "failed"
