Feature: The bundle answers as the source does
  The bundle is held to the source by a parity control over a fixed set of commands. A test whose
  subject is how aof loads still measures the source, and the cut is measured where the time was
  spent.

  Rule: R3 · The bundle answers exactly as the source does

    @executable @cli @work @work-stream
    Scenario Outline: E5 · each command in the parity set answers the same from the bundle and the source
      Given a temp project and a bundle built from this tree
      When "<command>" runs once through the source and once through the bundle
      Then both give the same stdout, the same stderr and the same exit code

      Examples:
        | command                       |
        | aof --version                 |
        | aof work find 160 --json      |
        | aof work init --runtime claude --json |
        | aof work validate --json      |
        | aof not-a-verb                |

    @executable @cli @work @work-stream
    Scenario: A bundle that answers one command differently is caught
      Given a bundle whose version string was changed after it was built
      When the parity set runs
      Then FF-16008 fails, naming "aof --version" and showing both answers

  Rule: R2 · Where the subject is how aof loads, the source runs

    @executable @cli @work @work-stream
    Scenario: E4 · the module-count control still counts the source
      Given a shell that carries AOF_TEST_CLI_BUNDLE naming a built bundle
      When FF-16004 starts "aof --version" to count the modules it loads
      Then the child it starts carries no AOF_TEST_CLI_BUNDLE
      And it counts 16 modules, as before

    @executable @cli @work @work-stream
    Scenario Outline: A control about the bin's own loading strips the variable
      Given the control "<control>"
      When it starts a child aof
      Then that child's environment carries no AOF_TEST_CLI_BUNDLE

      Examples:
        | control                                                     |
        | test/arch/command/acd-cli-entry-executes.test.mjs           |
        | test/arch/session/acd-session-verb-boots-no-registry.test.mjs |
        | test/arch/command/acd-single-entry-command-core.test.mjs    |

  @manual @cli @work @work-stream
  Scenario: The child start and the heaviest child-spawning suites on the control node
    Given AOF_GLOBAL_HOME isolated and a spawn-counting preload
    When "aof work find 160 --json" is timed five times from the source and from the bundle, and "cli-face-contract", "work-archive-is-a-move" and "acd-work-command-cli-bijection" are each run alone with and without AOF_TEST_CLI_BUNDLE
    Then VERIFICATION records the medians, each suite's wall time and child-aof time, and every case passes in each run
