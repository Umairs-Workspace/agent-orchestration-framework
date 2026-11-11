@cli @work @work-stream
Feature: The loop prints a drive status line while a drive runs

  Rule: R3 · While a drive runs, `aof work loop` prints a status line every five minutes

    @executable
    Scenario: E9 · a long drive prints its status line
      Given loop 03 has been driving refine of 03/07 for 36 min
      And 2 of its session's subagent transcripts were written in the last five minutes
      And the drive run's last heartbeat was 5 s ago
      When the five-minute status tick fires
      Then the loop prints "03/07 — 36 min, 2 subagents active, last activity 5 s ago"

    @executable
    Scenario: E10 · a drive that finishes inside five minutes prints no status line
      Given a drive of 03/07 that finishes 4 min after it started
      When the loop runs it
      Then the loop prints only the drive's start line and its end line

    @executable
    Scenario: E11 · each wave lane prints its own status line
      Given a wave drives 01 and 02 in two lanes for 12 min
      When the loop runs the wave
      Then each lane prints one status line at 5 min and one at 10 min
      And every status line names its own lane's ref

    @executable
    Scenario Outline: the status line's count and session phrases
      Given a drive of 03/07 running for 10 min
      And <session>
      When the five-minute status tick fires
      Then the loop prints "<line>"

      Examples:
        | session                                                             | line                                                     |
        | no session id has been captured yet                                 | 03/07 — 10 min, session starting                         |
        | the session has no subagent transcripts and heartbeated 40 s ago    | 03/07 — 10 min, 0 subagents active, last activity 40 s ago |
        | 3 subagent transcripts, 1 written in the last five minutes, heartbeat 1 min ago | 03/07 — 10 min, 1 subagent active, last activity 1 min ago |
        | 2 subagent transcripts, neither written in the last five minutes, no heartbeat yet | 03/07 — 10 min, 0 subagents active, no activity yet |

    @executable
    Scenario: --quiet silences the status line
      Given loop 03 runs with --quiet
      When a drive of 03/07 runs for 12 min
      Then no status line is printed

    @executable
    Scenario: the status ticker stops when the drive settles
      Given a drive of 03/07 is running with its status ticker armed
      When the drive is cancelled, times out or finishes
      Then no status line for that drive is printed after its settle
