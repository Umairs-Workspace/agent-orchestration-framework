Feature: Memory status counts the episodic records under their layer on both backends

  WHY. m148/ADR-004 made the layer map the one partition, and its episodic layer has held zero
  records since. 157/01 adds three episodic types; until they are mapped, status reports them as
  "unmapped". ADR-003 maps them and extends the legacy counters so their sum still equals the
  record count — the m40/R3 near-miss is a consumer partitioning by type that misses a new one.

  THE FIXTURE: a temp stream under an isolated "AOF_GLOBAL_HOME" whose milestone "39" holds a
  RETROSPECTIVE.md with 2 lessons whose Area is architecture, a VERIFICATION.md with 3 findings, a FEEDBACK.ndjson with 2 raw
  rows and 3 terminal run records, ingested.

  Rule: R1 · Status counts every episodic record once, under the episodic layer

    @executable @cli @work @memory
    Scenario: E1 · the three types are counted as episodic and every count sums
      When "aof work memory status --json" runs over the ingested store
      Then its "types" holds finding 3, feedback 2 and run 3, each with layer "episodic"
      And its "layers" is {"episodic": 8, "semantic": 0, "procedural": 2}
      And no type is reported with layer "unmapped"
      And its legacy counters "findings", "feedback" and "runs" read 3, 2 and 3
      And its legacy counters sum to its "recordCount" of 10

    @executable @cli @work @memory
    Scenario: E2 · local and graphify report the same partition
      When "aof work memory status --json" runs once with backend "local" and once with backend "graphify", each after its own ingest
      Then both carry the same "types" and the same "layers"
      And graphify's legacy "lessons" and "adrs" still read 2 and 0

    @executable @cli @work @memory
    Scenario Outline: a scope filter selects episodic records by its existing meaning
      When "aof work memory recall \"\" <flags> --all --json" runs
      Then it returns <count> records

      Examples:
        | flags                           | count |
        | --kind finding                  | 3     |
        | --kind feedback                 | 2     |
        | --kind run                      | 3     |
        | --area delivery                 | 8     |
        | --item 39 --area delivery       | 8     |
        | --item 41 --area delivery       | 0     |

    @executable @cli @work @memory
    Scenario: the none backend still reports an empty partition
      When "aof work memory status --json" runs with backend "none"
      Then its "types" is {} and every "layers" count is 0
