Feature: Every memory verb dispatches through the port, and both doors answer the same bytes they answer today

  WHY. Prompts paste `recall --block` output, hooks parse `recall --json` as an array, and the
  retrospective loop calls the seam in process. The refactor is proven by none of those moving.
  The seam now reaches its backend only through the port: recall and recurrence through `recall`,
  ingest and reindex through `ingest("work")`, status through `status("work")`. `record-recall` still
  resolves no backend at all (153/ADR-001; 179/ADR-003).

  THE FIXTURE: a temp project under an isolated "AOF_GLOBAL_HOME" with `memory.backend: local` and a
  work stream holding milestone "39", with one ARCHITECTURE.md ADR titled "pin line endings" and one
  RETROSPECTIVE.md near-miss lesson. It is ingested once before each scenario unless the scenario
  says otherwise. "The pre-port answer" is the stdout, stderr and exit code captured for the same
  argv on the commit before this story, committed inline in the suite as a golden answer. A field
  that carries the wall clock or a temp path is compared after the normalisation
  `work-memory-command.test.mjs` already applies to it, and after nothing else.

  @executable @cli @adapter @memory
  Scenario Outline: each verb answers its pre-port bytes through both doors
    When "<door> <argv>" runs
    Then stdout, stderr and the exit code equal the pre-port answer for "<argv>"

    Examples:
      | door            | argv                                                   |
      | aof memory      | recall "pin line endings" --block                      |
      | aof memory      | recall "pin line endings" --json                       |
      | aof memory      | recall "pin line endings" --kind near-miss --json      |
      | aof memory      | recall "no-such-term-xyzzy" --kind no-such-kind --block |
      | aof memory      | recurrence "line endings drift" --json                 |
      | aof memory      | status --json                                          |
      | aof memory      | reindex 39 --json                                      |
      | aof memory      | ingest --json                                          |
      | aof work memory | recall "pin line endings" --block                      |
      | aof work memory | status --json                                          |

  @executable @cli @adapter @memory
  Scenario Outline: each verb reaches the backend through the port's verb, never directly
    Given an in-process seam whose resolved backend records each method it receives and declares the shared record corpora
    And the port the seam composes records each verb it is asked
    When the seam runs "<argv>"
    Then the port was asked "<port verb>"
    And the backend received "<backend method>"

    Examples:
      | argv                         | port verb        | backend method      |
      | recall "x"                   | recall           | recall              |
      | recurrence "x"               | recall           | recall              |
      | ingest                       | ingest of "work" | reindex with null   |
      | reindex 39                   | ingest of "work" | reindex with "39"   |
      | status                       | status of "work" | status, then recall |

  @executable @cli @adapter @memory
  Scenario: record-recall resolves no backend and composes no port
    Given an in-process seam whose backend resolver records being called
    When the seam runs "record-recall 39 --input obs.json"
    Then the backend resolver was never called
    And no port was composed

  @executable @cli @adapter @memory
  Scenario: help and an unknown verb still resolve nothing
    Given an in-process seam whose backend resolver records being called
    When the seam runs "reindex -h" and then "frobnicate"
    Then the backend resolver was never called
    And no index file was written

  @executable @cli @adapter @memory
  Scenario: every recalled record's source still resolves to a path and line in the stream
    When "aof memory recall \"pin line endings\" --json" runs
    Then every record's "source" is "<path>:<line>" naming a file under the work stream
    And no record carries a field the parser leaves did not produce
