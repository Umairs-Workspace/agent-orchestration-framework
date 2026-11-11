Feature: A store opens without rewriting a current schema
  The projection store and the effects journal create or migrate their schema when it is absent or
  old. Opening one whose schema is current only reads, so an open takes no write lock and its close
  checkpoints nothing.

  @executable @cli @work @work-stream
  Scenario Outline: Opening a store at each schema version
    Given the <store> at <version>
    When it is opened
    Then it <outcome>

    Examples:
      | store            | version                  | outcome                                              |
      | projection store | no schema                | creates its schema in one write transaction          |
      | projection store | the current version      | executes no write statement                          |
      | projection store | a newer version          | is refused as a schema newer than this build supports |
      | effects journal  | no schema                | creates its schema in one write transaction          |
      | effects journal  | the current version      | executes no write statement                          |
      | effects journal  | a newer version          | is refused as a schema newer than this build supports |

  @executable @cli @work @work-stream
  Scenario: Every open still applies the concurrency pragmas
    Given the projection store at the current version
    When it is opened
    Then the connection reports WAL and a non-zero busy_timeout

  @manual
  Scenario: The heaviest loop and lane suites on the control node
    Given the six heaviest loop and lane suites
    When each runs alone through the shard entry, before this story and after it
    Then each is green both times, and their summed time is lower after
