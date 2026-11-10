Feature: The gate launches its suite clean
  The gate hands its program an environment with the session's GIT, CLAUDE and AOF variables
  removed, keeping the isolated global home, so a red row is about the code.

  Rule: R1 · The gate's suite inherits none of the session's GIT, CLAUDE or AOF variables

    @executable @cli @work @work-stream
    Scenario: E1 · an inherited GIT_ASKPASS never reaches the suite
      Given the gate runs in an environment carrying GIT_ASKPASS "C:\\Code\\askpass.sh"
      When it launches the suite
      Then the launched environment has no GIT_ASKPASS

    @executable @cli @work @work-stream
    Scenario: E2 · a driven session's variables stay with the gate
      Given the gate runs with AOF_RUN_ID, AOF_RUN_ITEM_DIR and CLAUDECODE set
      When it launches the suite
      Then none of the three is in the launched environment
      And the gate's keep-alive still appends a beat for that AOF_RUN_ID

    @executable @cli @work @work-stream
    Scenario: E3 · the isolated global home is kept, and names match in any case
      Given the gate runs with AOF_GLOBAL_HOME "/tmp/gh" and "git_dir" "/x"
      When it launches the suite
      Then the launched environment has AOF_GLOBAL_HOME "/tmp/gh" and no "git_dir"

    @executable @cli @work @work-stream
    Scenario Outline: What the launch environment keeps and drops
      Given the gate runs with <name> set to "v"
      When it launches the suite
      Then <name> is <kept> in the launched environment

      Examples:
        | name                   | kept    |
        | GIT_INDEX_FILE         | absent  |
        | GIT_CONFIG_NOSYSTEM    | absent  |
        | CLAUDE_CODE_ENTRYPOINT | absent  |
        | AOF_RUN_PHASE          | absent  |
        | AOF_SEA_EMBEDDED       | absent  |
        | AOF_GLOBAL_HOME        | present |
        | PATH                   | present |
        | SystemRoot             | present |
        | TEMP                   | present |
        | VSCODE_PID             | present |

    @executable @cli @work @work-stream
    Scenario: The gate's own process environment is untouched
      Given the gate runs with GIT_ASKPASS set
      When it has launched the suite
      Then the gate's own process.env still carries GIT_ASKPASS
