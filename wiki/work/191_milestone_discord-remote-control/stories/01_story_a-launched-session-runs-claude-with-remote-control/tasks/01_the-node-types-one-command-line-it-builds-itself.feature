@executable @cli @work @work-stream
Feature: the node types one command line it builds itself

  WHY. The launcher keeps the board's idiom: open the operator's shell, then type the command into
  it (50/ADR-007, `mesh:terminal-resume`). The line is built on the node, from a UUID and a name in a
  closed character class, so no value needs quoting in any shell (ADR-002 §2–§3).

  Scenario: the handler types the line once, before the ok ack
    Given an injected PTY factory recording writes and acks in order
    When a session-spawn frame with launch "claude-remote-control" is handled on darwin
    Then the PTY receives exactly one write, the darwin line
    And that write precedes the ok `session-spawn-ack`
    And the PTY was opened 200 columns wide

  Scenario: a bare-shell spawn types nothing and keeps 80 columns
    When a session-spawn frame with no launch is handled
    Then the PTY receives no write
    And the PTY was opened 80 columns by 24 rows

  Scenario: a launch whose line cannot be built refuses and leaves nothing behind
    When a session-spawn frame with launch "claude-remote-control" and session id "not-a-uuid" is handled
    Then a `session-spawn-failed` ack is sent
    And no PTY is left open and no session record is written

  Scenario: FF-19102 · the only spawn-time bytes come from launchCommandLine
    When `test/arch/session/acd-launched-session-from-discord.test.mjs` runs
    Then it fails if `session-spawn-handler.mjs` writes to a PTY at spawn from any value but `launchCommandLine`'s answer
    And it fails if `SESSION_LAUNCHES` holds any value but "claude-remote-control"

  Rule: R1 · A session started this way is Claude with Remote Control, never a shell

    Scenario: E1 · on macOS the node types an exec of claude with Remote Control
      When `launchCommandLine("claude-remote-control", { sessionId: "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10", name: "aof-0b9e6c1e", platform: "darwin" })` is called
      Then it answers "exec claude --remote-control aof-0b9e6c1e --session-id 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10\n"

    Scenario: E2 · on Windows the node types claude and closes the shell after it
      When `launchCommandLine("claude-remote-control", { sessionId: "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10", name: "aof-0b9e6c1e", platform: "win32" })` is called
      Then it answers "claude --remote-control aof-0b9e6c1e --session-id 0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10 & exit\r\n"

    Scenario: on Linux the line is the POSIX one
      When `launchCommandLine` is called as in E1 with platform "linux"
      Then it answers the same line as E1

    Scenario Outline: it refuses anything it cannot type safely
      When `launchCommandLine` is called with launch <launch>, session id <id> and name <name>
      Then it answers null

      Examples:
        | launch                  | id                                     | name            |
        | "claude-remote-control" | "not-a-uuid"                           | "aof-0b9e6c1e"  |
        | "claude-remote-control" | "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" | "aof; rm -rf ~" |
        | "claude-remote-control" | "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" | ""              |
        | "bash"                  | "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10" | "aof-0b9e6c1e"  |

  Rule: R3 · The session's name can be read from its record

    Scenario: E5 · characters outside the class become dashes
      Given a workspace whose name is "my project!"
      When the handler derives the session name for session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10"
      Then the name is "my-project--0b9e6c1e"

    Scenario: E6 · a long folder name is clipped to 64 and keeps the id
      Given a workspace whose name is 90 characters of "a"
      When the handler derives the session name for session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10"
      Then the name is 64 characters long and ends "-0b9e6c1e"

    Scenario: a plain folder name is kept as it is
      Given a workspace whose name is "aof"
      When the handler derives the session name for session "0b9e6c1e-3f0a-4d8e-9c55-2a7d1f3e8b10"
      Then the name is "aof-0b9e6c1e"
