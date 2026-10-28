@executable @cli @work @design
Feature: One headless session per open diagram takes its turns in order, ends when idle, and never bypasses permissions

  WHY. ADR-001: the architect's conversation is one headless stream-json `claude` per key, started by
  the first delivery, answering one turn at a time, ended ten minutes after its last subscriber left
  (172/00 Q1). Its launch denies anything outside an explicit tool list instead of prompting a person
  nobody can see, and never skips permissions (FF-17201). The suite runs the module against
  `stand-in-claude.mjs`, a node script that speaks stream-json and answers on a script, with the
  clock injected.

  Background:
    Given the conversations module with the stand-in claude and an injected clock

  Rule: R1 · The first delivery for an open diagram starts its one session

    Scenario: E1 · the first delivery starts a session in the project root, typed the invocation
      Given no session runs for the key "171 ADR-003-push-stream.excalidraw"
      When "/aof:diagram-review 171 ADR-003-push-stream.excalidraw r7" is delivered for "r7" with the project root as its directory
      Then the delivery answers "started"
      And one stand-in process runs, in the project root
      And it received one user message whose text is "/aof:diagram-review 171 ADR-003-push-stream.excalidraw r7"

    Scenario: E2 · two subscribers on one key share one session and one live turn
      Given two subscribers on the key "171 ADR-003-push-stream.excalidraw"
      When "r7" is delivered and the stand-in streams "The writer is another process"
      Then exactly one stand-in process runs
      And both subscribers received the same "turn", "text" and "turn-end" events for "r7"

    Scenario: E3 · another diagram gets its own session
      Given a session runs for the key "171 ADR-003-push-stream.excalidraw"
      When "r2" is delivered for the key "171 ADR-001-overlay.excalidraw"
      Then two stand-in processes run, one per key

  Rule: R2 · A session answers one turn at a time, in the order they were delivered

    Scenario: E4 · a delivery during a turn waits for the turn to end
      Given the session is answering "r7"
      When "r5" is delivered
      Then the delivery answers "queued"
      And the stand-in receives r5's message only after r7's "result" line

    Scenario: E5 · deliveries queued during one turn are answered in the order they came
      Given the session is answering "r7"
      When "r5", then "r8", then a batch review are delivered
      Then the stand-in receives them in the order "r5", "r8", batch, each after the previous turn's "result"

  Rule: R3 · An idle session ends; an ended session is not resumed

    Scenario: E6 · a session with no subscriber ends ten minutes after the last one left
      Given the session is idle with one subscriber
      When the subscriber leaves and the clock advances 10 minutes
      Then the stand-in's stdin is closed and its process tree is ended
      And an "ended" session event names the reason "idle"

    Scenario: a session one second short of the idle limit still runs
      Given the session is idle and its last subscriber left
      When the clock advances 9 minutes 59 seconds
      Then the stand-in is still running

    Scenario: E7 · a subscriber returning within ten minutes stops the idle clock
      Given the last subscriber left 4 minutes ago
      When a subscriber joins and the clock advances 20 minutes
      Then the stand-in is still running

    Scenario: a turn in flight holds the session even with no subscriber
      Given the session is answering "r7" and its last subscriber has left
      When the clock advances 15 minutes before r7's "result" line
      Then the stand-in is still running until 10 minutes after that "result" line

    Scenario: E8 · a process that exits mid-turn ends the turn as failed and the session as ended
      Given the session is answering "r7" and "r5" is queued
      When the stand-in exits with code 1
      Then a "turn-end" event for "r7" has the outcome "failed"
      And an "ended" session event names the reason "exited"
      And "r5" is not delivered to any process

    Scenario: an ended session is not resumed; the next delivery starts a fresh one
      Given the session for the key ended when its process exited
      When "r5" is delivered
      Then a new stand-in process starts without "--resume"
      And its first message is r5's invocation

  Rule: R4 · The architect can only do what the review needs

    Scenario: E9 · the launch denies what it does not allow and never skips permissions
      When a session is started for the tools "Read", "Grep", "Glob", "Write" and "Bash(aof diagram scene:*)"
      Then its arguments hold "-p", "--input-format stream-json", "--output-format stream-json", "--include-partial-messages" and "--permission-prompts none"
      And they hold "--allowedTools" followed by exactly those five tools
      And they hold none of "--dangerously-skip-permissions", "--allow-dangerously-skip-permissions" or "bypassPermissions"
      And the process is spawned with an argument vector and no shell

    Scenario: the launch carries the refine phase's model and effort, and scrubs the session-attachment keys
      Given "work.agents.session" names the model "opus" and the effort "high" for refine
      And the server's environment holds "CLAUDECODE", "CLAUDE_CODE_SSE_PORT" and "PATH"
      When a session is started
      Then its arguments hold "--model opus" and "--effort high"
      And its environment holds "PATH" and neither "CLAUDECODE" nor "CLAUDE_CODE_SSE_PORT"
      And the loop's session driver scrubs its spawn with the same predicate, imported from "session-model.mjs"
