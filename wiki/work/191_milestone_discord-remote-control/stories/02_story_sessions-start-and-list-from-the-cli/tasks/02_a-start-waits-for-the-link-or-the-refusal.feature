@executable @cli @work @work-stream
Feature: a start waits for the link or the refusal, and never lies

  WHY. The phone needs either a link to tap or the name to look for. A start whose worker refused
  must say so, and a start with no link yet must not be reported as failed (ADR-003 §3–§4).

  Background:
    Given a fake loopback relay the verb subscribes to and pushes into
    And the control "node-6eb3" with local workspace "aof"

  Scenario: the link inside an OSC-8 sequence is found
    Given `mesh:session-start` is run for project "aof" with waitMs 45000
    When the relay carries terminal frames for the session containing "\u001b]8;;https://claude.ai/code/session_01AbC-x_9\u001b\\"
    Then the verb answers link "https://claude.ai/code/session_01AbC-x_9"

  Scenario: the subscription opens before the push and always closes
    Given `mesh:session-start` is run for project "aof" with waitMs 45000
    When the verb runs to any answer
    Then the relay subscription was opened before the spawn envelope was pushed
    And the subscription is closed after the answer

  Scenario: frames for another session are ignored
    Given `mesh:session-start` is run for project "aof" with waitMs 45000
    When the relay carries a link in terminal frames for a different session id
    Then the verb does not answer with that link

  Scenario: the scan is bounded
    Given `mesh:session-start` is run for project "aof" with waitMs 45000
    When 70 KiB of output with no link pass for the session
    Then the verb stops scanning after 64 KiB and answers "no-link" when the wait ends

  Rule: R1 · A start names the node and the project, and either the link or where to look

    Scenario: E1 · the link appears within the wait
      Given `aof mesh session start aof --wait 45000 --json` is run
      When the session's output carries "https://claude.ai/code/session_01AbC-x_9" after 6 s
      Then it answers outcome "started", node "node-6eb3", project "aof" and that link

    Scenario: E2 · no link within the wait is not a failure
      Given `aof mesh session start aof --wait 45000 --json` is run for session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10"
      When 45 s pass with output but no link
      Then it answers outcome "no-link" with name "aof-0b9e6c1e" and no link
      And the session is not ended

    Scenario: E3 · with no wait the verb answers at once
      When `aof mesh session start aof --json` is run
      Then it answers after the push without subscribing, with the session id and name and no link

  Rule: R2 · A start that cannot land says why, in the route's words

    Scenario: E5 · the worker's refusal is answered with its code
      Given `aof mesh session start aof --node wsl-2 --wait 45000 --json` is run
      When the relay carries a `session-spawn-ack` for the session with ok false and code "session-repo-unavailable"
      Then it answers outcome "refused" with code "session-repo-unavailable"
