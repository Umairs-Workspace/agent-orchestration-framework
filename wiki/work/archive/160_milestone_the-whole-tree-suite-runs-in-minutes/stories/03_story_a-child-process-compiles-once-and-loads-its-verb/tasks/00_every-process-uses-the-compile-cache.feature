Feature: Every process uses the compile cache
  The bin and every runner process turn Node's compile cache on before the application graph loads,
  so a second process compiles nothing the first already compiled. The entry contract is unchanged.

  @executable @cli @work @work-stream
  Scenario: The bin turns the cache on before it loads the CLI
    Given the bin entry's source
    Then its first statement enables the compile cache, guarded for runtimes without it
    And the CLI module is reached only through a dynamic import after that call

  @executable @cli @work @work-stream
  Scenario: Every unit process turns the cache on before it loads a suite
    Given the test harness module that the runner and the shard entry import
    When a unit process has loaded it
    Then module.getCompileCacheDir() names a directory
    And the suite file is loaded after that

  @executable @cli @work @work-stream
  Scenario Outline: The entry contract is unchanged
    When aof is run through the bin with <argv>
    Then the output is byte-identical to a direct run of the CLI module with <argv>
    And the exit code is <code>

    Examples:
      | argv             | code |
      | --version        | 0    |
      | --help           | 0    |
      | no-such-command  | 1    |

  @executable @cli @work @work-stream
  Scenario: A runtime without the cache still starts
    Given module.enableCompileCache is absent
    When the bin starts with --version
    Then it prints the version and exits 0

  @manual @cli @work @work-stream
  Scenario: The start-up medians on the control node
    Given an idle machine
    When the default-application import and "aof --version" are each timed five times, cold cache then warm, before and after this story
    Then VERIFICATION records the four medians of each, and the warm after medians are lower than before
