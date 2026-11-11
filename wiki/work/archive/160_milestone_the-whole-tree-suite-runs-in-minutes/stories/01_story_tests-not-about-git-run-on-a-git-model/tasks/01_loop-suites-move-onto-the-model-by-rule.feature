Feature: Loop suites move onto the model by rule
  A case runs on the model when its subject is the loop and git is reached only through the port.
  A case about git's own behaviour, or one that reaches git another way, keeps real git. A move
  changes the port, never the claim.

  @executable @cli @work @work-stream
  Scenario: The lane fixture builds a model repository with no git process
    Given the git spawns are counted
    When withLaneRepo builds its stream with git "fake"
    Then no git process was started
    And laneCtx's exec is the model's port

  @executable @cli @work @work-stream
  Scenario: The lane fixture still builds a real repository by default
    When withLaneRepo builds its stream with no git option
    Then the root holds a ".git" directory and laneCtx's exec is real git

  @executable @cli @work @work-stream
  Scenario Outline: A case keeps real git when git is its subject
    Given a case in a moved suite that asserts <subject>
    Then it runs over a real repository with exec realExec

    Examples:
      | subject                                         |
      | a lane's commits merge home on the primary      |
      | a live lane tree is reused by a second dispatch |
      | a dirty lane is refused cleanup                 |
      | residue with no .git marker is refused          |
      | the lane branch is deleted with its tree        |

  @executable @cli @work @work-stream
  Scenario: A case that reaches git outside the port fails loudly on the model
    Given a case moved onto the model whose fixture cites a file that is missing from the tree
    When it runs the real work:doctor from the registry
    Then it fails on the missing repository, naming git, rather than passing

  @executable @cli @work @work-stream
  Scenario: A real doctor over a stream that resolves on disk runs on the model
    Given a case moved onto the model whose fixture's citations all resolve
    When it runs the real work:doctor from the registry
    Then doctor answers as it does on real git, and no git process was started

  @executable @cli @work @work-stream
  Scenario: Every moved case keeps its name and its claim
    Given the moved suites before and after this story
    Then the set of case names is unchanged
    And every case is green on the model or on real git as the rule assigns it

  @manual @cli @work @work-stream
  Scenario: The moved suites' alone wall time on the control node
    Given each moved suite run alone through the shard entry with AOF_GLOBAL_HOME isolated
    When it runs before and after this story
    Then VERIFICATION records both wall times and the git calls each made
