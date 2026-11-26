@cli @board
Feature: Check board access in the daemon's own environment
  Rule: R1 · The board check runs with the daemon's account and environment
    @executable
    Scenario: E1 · A signed-in terminal does not hide a daemon that cannot sign in
      Given the terminal's az is signed in and the LaunchAgent's PATH has no signed-in az
      When the operator runs "aof mesh desktop run"
      Then the preflight shows board-access FAIL for the board workspace
      And the message says sign-in failed in the daemon environment and names the LaunchAgent's PATH

    @executable
    Scenario: E2 · A refused board read is reported as board access, not sign-in
      Given the daemon environment mints a token but the account receives HTTP 403 reading the board's area
      When the preflight runs
      Then board-access shows FAIL naming the board and the refused read
      And the message does not tell the operator to sign in again

    @executable
    Scenario: E3 · A daemon that can sign in and read the board passes
      Given the daemon environment signs in and reads the board's area
      When the preflight runs
      Then board-access shows ok naming the workspace and the board manifest it read

  Rule: R2 · A project that keeps its tracking in files is never probed
    @executable
    Scenario: E4 · A file-only node skips the check without probing
      Given the node's only workspace has no work.store
      When the preflight runs
      Then board-access shows -- and no board probe is started

    @executable
    Scenario: E5 · Only the board workspace is probed
      Given the node serves one board workspace and one file workspace
      When the preflight runs
      Then exactly one board probe is started, for the board workspace
      And the board-access message names only that workspace

  Rule: The board-access verb answers for the workspace it runs in
    @executable
    Scenario Outline: The verb reports the stage that failed
      Given a workspace whose board <state>
      When "aof work board-access --json" runs in that workspace
      Then it answers <answer> and exits <exit>

      Examples:
        | state                                          | answer                                  | exit |
        | definition and adapter load and the probe passes | ok with the manifest path               | 0    |
        | adapter's probe throws azure-board-auth        | failed at sign-in with that code        | 1    |
        | adapter's probe throws an HTTP 403             | failed at board access with that status | 1    |
        | definition declares no access probe            | a skip naming the missing capability    | 0    |
        | manifest fails validation                      | failed at the definition with its key   | 1    |
        | is not selected (local file mode)              | a skip for local file mode              | 0    |

    @executable
    Scenario: No credential appears in the check's output
      Given the adapter's probe fails with a message carrying a bearer token
      When the preflight renders board-access and "aof work board-access --json" answers
      Then neither output contains the token

    @executable
    Scenario Outline: The daemon environment depends on the platform
      Given the platform is <platform> and a LaunchAgent is <registered>
      When the preflight runs board-access
      Then the probe runs <environment>

      Examples:
        | platform | registered     | environment                                             |
        | darwin   | registered     | with the LaunchAgent's PATH, HOME, USER and LOGNAME     |
        | darwin   | not registered | not at all, and board-access shows --                   |
        | win32    | not applicable | with the environment "mesh desktop run" was started in  |
        | linux    | not applicable | with the environment "mesh desktop run" was started in  |
