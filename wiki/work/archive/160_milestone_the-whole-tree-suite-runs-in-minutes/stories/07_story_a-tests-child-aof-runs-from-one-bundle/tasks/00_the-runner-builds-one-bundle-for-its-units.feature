Feature: The runner builds one bundle for its units
  The sharded runner builds one bundle of the CLI before its pool starts, from the release's own
  recipe, and every child aof a unit starts loads it. A failed build costs speed, never correctness,
  and says so.

  Rule: R1 · In the whole-tree gate, a test's child aof runs the bundle built at the start of that run

    @executable @cli @work @work-stream
    Scenario: E1 · a child aof in a sharded run gets the bundle's answer
      Given a sharded run whose bundle built
      When a unit's test spawns "aof work find 160 --json" through the bin
      Then the bin loaded the bundle named by AOF_TEST_CLI_BUNDLE, not "packages/core/src/cli.mjs"
      And the answer is the one the source gives

    @executable @cli @work @work-stream
    Scenario: E2 · a failed build runs the source and says so
      Given a sharded run whose bundle build fails with "Could not resolve ./missing.mjs"
      When the run starts its pool
      Then it prints "# cli bundle unavailable: Could not resolve ./missing.mjs" once
      And no unit is given AOF_TEST_CLI_BUNDLE, and every case still runs

    @executable @cli @work @work-stream
    Scenario: E3 · a focused run sets no bundle
      Given a focused run of one suite through the shard entry
      When its test spawns the bin
      Then AOF_TEST_CLI_BUNDLE is not set, and the bin loaded "packages/core/src/cli.mjs"

    @executable @cli @work @work-stream
    Scenario: The bundle is built once per run, before the pool
      Given a sharded run of 40 units on 16 workers
      When the run completes
      Then the bundle was built exactly once, before the first unit started
      And every unit received the same AOF_TEST_CLI_BUNDLE path

    @executable @cli @work @work-stream
    Scenario Outline: The bin loads the bundle only when the variable names a file
      Given AOF_TEST_CLI_BUNDLE <setting>
      When "aof --version" runs
      Then the bin loaded <entry>, and the command answered as it does today

      Examples:
        | setting                                   | entry                          |
        | names the run's built bundle              | that bundle                    |
        | is unset                                  | "packages/core/src/cli.mjs"    |
        | is the empty string                       | "packages/core/src/cli.mjs"    |
        | names a path that does not exist          | "packages/core/src/cli.mjs"    |

    @executable @cli @work @work-stream
    Scenario: The test bundle and the release bundle share one recipe
      Given "scripts/build-sea.mjs" and the runner's bundle step
      When their esbuild options are read
      Then the runner takes them from the export in "scripts/build-sea.mjs" and spells none of its own

    @executable @cli @work @work-stream
    Scenario: The gate's clean environment still drops the variable, and the runner sets it after
      Given a gate launch from a shell that carries AOF_TEST_CLI_BUNDLE=/stale/bundle.mjs
      When the gate launches the sharded runner
      Then the runner's own environment carries no AOF_TEST_CLI_BUNDLE
      And its units carry the path of the bundle the runner built
