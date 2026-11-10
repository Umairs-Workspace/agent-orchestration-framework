Feature: A child aof loads a pinned closure
  A child aof loads the modules its verb uses, and the number it loads can only go down. The cut is
  made where a profile shows the cost, and every verb still does what it did.

  @executable @cli @work @work-stream
  Scenario Outline: A child's module count stays within its ceiling
    Given a resolve hook that counts every module a process evaluates
    When a child runs "aof <argv>" from the repository root
    Then it evaluates no more modules than the ceiling pinned for "<argv>"

    Examples:
      | argv           |
      | --version      |
      | work find 160  |

  @executable @cli @work @work-stream
  Scenario: A ceiling equals its measured count
    Given each pinned ceiling and the count measured when it was pinned
    Then every ceiling equals its count, and its row says which story lowered it
    And a count below its ceiling fails until the ceiling is lowered to match

  @executable @cli @work @work-stream
  Scenario: Version answers without loading the command surface
    When a child runs "aof --version"
    Then none of the evaluated modules is the command core or a command module

  @executable @cli @work @work-stream
  Scenario: Every verb still reaches its command after the cut
    Given every route the CLI face contract lists
    When each is asked for its help through the bin
    Then each answers its own help and exits 0, as before this story

  @manual @cli @work @work-stream
  Scenario: The profile that chose the cut
    When "aof --version" and "aof work find 160" are profiled with the resolve hook before the cut
    Then VERIFICATION records the ten slowest module loads of each and which of them the cut deferred
