@cli @work @board
Feature: Replay the work-verb captures over a recorded Azure board
  Rule: R1 · The accepted 205 captures behave the same over a recorded board as over files
    @executable
    Scenario: E1 · Every accepted capture keeps its output and exit over the board
      Given the four work-stream lanes and their accepted baselines
      When each case runs through the public CLI with the Azure definition selected over recorded HTTP
      Then every case that is not an archive case matches its file-lane output, exit code and stream export

    @executable
    Scenario: E2 · A status change is observed on the board and in the repository
      Given the seed is published to the recorded board
      When "aof work status 16 active" runs over the board
      Then the local record for 16 reads active and the exported stream changed
      And the recorded board holds exactly one item for 16, in the state mapped from active

    @executable
    Scenario Outline: Archiving is available only in local file mode
      When the archive capture <case> runs in <mode>
      Then it <answer>

      Examples:
        | case                    | mode            | answer                                                        |
        | single archive          | local file mode | matches its accepted baseline                                 |
        | single archive          | board mode      | refuses work-board-archive-local-only and moves no folder     |
        | bulk archive with --all | local file mode | matches its accepted baseline                                 |
        | bulk archive with --all | board mode      | refuses work-board-archive-local-only and moves no folder     |

    @executable
    Scenario: The file lanes still run as before
      When the golden index runs
      Then the four file-mode work-stream lanes run and pass alongside the board lanes

    @executable
    Scenario: The recordings carry no credentials
      When the recorded Azure responses and requests are read
      Then none contains an authorization header, a bearer token or an az access token
