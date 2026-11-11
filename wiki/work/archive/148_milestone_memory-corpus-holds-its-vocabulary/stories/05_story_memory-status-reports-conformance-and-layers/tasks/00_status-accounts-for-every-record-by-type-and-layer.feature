@executable @cli @work @memory
Feature: Memory status accounts for every record by type and by the layer that type serves, on both backends

  WHY. Each backend writes its own status split, and they disagree: graphify reports lessons and
  ADRs only, while the index holds five types (the m40/R3 near-miss, live today). The origin asks
  that status say which layer each type serves, because "lessons / adrs" does not answer "what does
  aof remember". ADR-004 puts the partition in one map beside the frozen field set and composes
  status at the seam over every record, the way brief is composed. A lesson is procedural (the
  operator's ruling, Q1).

  THE FIXTURE BELOW: a temp stream exercising every parser: milestone "39" with a RETROSPECTIVE.md
  (two lessons), an ARCHITECTURE.md (three ADRs), an OUTCOME.md (four capabilities, two gaps) and an
  AOF.md (one summary section), built under an isolated "AOF_GLOBAL_HOME" and ingested.

  Rule: R1 · Status accounts for every record, by type and by layer

    Scenario: E1 · every type is counted under its layer, and the counts sum to the record count
      When "aof work memory status --json" runs over the ingested store
      Then its "types" is {"lesson": {"count": 2, "layer": "procedural"}, "adr": {"count": 3, "layer": "semantic"}, "capability": {"count": 4, "layer": "semantic"}, "gap": {"count": 2, "layer": "semantic"}, "summary": {"count": 1, "layer": "semantic"}}
      And its "layers" is {"episodic": 0, "semantic": 10, "procedural": 2}
      And the "types" counts sum to its "recordCount" of 12

    Scenario: E2 · a record type the map does not name is counted, never dropped
      Given the store also holds 3 records of type "finding"
      When "aof work memory status --json" runs
      Then its "types" holds "finding" with count 3 and layer "unmapped"
      And its "layers" holds "unmapped": 3
      And the "types" counts sum to its "recordCount"

    Scenario: E3 · the local and graphify backends report the same partition over the same stream
      When "aof work memory status --json" runs once with backend "local" and once with backend "graphify", each after its own ingest
      Then both results carry the same "types" and the same "layers"

    Scenario: the none backend reports an empty partition
      When "aof work memory status --json" runs with backend "none"
      Then its "types" is {} and every "layers" count is 0

    Scenario: the text view keeps its first line and adds the layers
      When "aof work memory status" runs over the ingested store
      Then its first line is "memory: backend=local records=12"
      And a following line reads "layers: episodic 0 · semantic 10 · procedural 2"

    Scenario: the layer map names each layer once and each type once
      When "RECORD_TYPE_LAYERS" is read
      Then it maps "lesson" to "procedural"
      And "adr", "capability", "gap" and "summary" to "semantic"
      And no type appears under two layers
