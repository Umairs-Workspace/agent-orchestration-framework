@executable @cli @work @work-stream
Feature: `costUsd` is stamped once at settle, says where it came from, and is never recomputed

  The SPEC requires "ingested cost beats inferred cost" and `costUsd` "persisted at write time and
  never recomputed". A measured fact constrains how that is honoured: **the transcript carries no
  cost.** The live JSONL inspected for ADR-003 carries the four token classes, `model` and `effort`
  — and no `costUSD` key of any kind. Authoritative USD exists only where aof does not always look:
  `claude_code.cost.usage` over OTLP (which aof deliberately does not receive — ADR-005 §2) and
  `total_cost_usd` on the headless result envelope, which is not the path aof spawns
  (`src/agent-session-driver.mjs:619-658` builds an interactive PTY).

  So ADR-004 keeps the guarantee and makes the provenance explicit instead of pretending: three
  keys, one rule. `costUsd` is a number stamped once. `costSource` says whether it was `reported`
  by the runtime or `priced` by aof from a table. `priceTable` carries the version of that table,
  so a historic number stays comparable — the table version travels *with* the number rather than
  being implied by the date someone read it.

  **A price-table correction changes what future runs are stamped with. It never rewrites a run
  that has already settled.** That is the same discipline story 68/05 applies to snapshots one
  layer up: the framework does not rewrite its own evidence. FF-6804 pins it structurally.

  ADR-004; ADR-001 (the envelope); ADR-003 (the buckets a priced cost is derived from).

  Scenario: a priced cost records the table it was priced with
    Given a run settling with ingested token buckets and no runtime-reported cost
    When the run is settled
    Then `costUsd` is a number
    And `costSource` reads `priced`
    And `priceTable` names the version of the table used

  Scenario: a reported cost beats a priced one, and says so
    Given a run settling with ingested token buckets and an authoritative cost reported by the runtime
    When the run is settled
    Then `costUsd` is the reported figure
    And `costSource` reads `reported`
    And `priceTable` reads `null`
    And no price table is consulted

  Scenario: reading a settled run returns the stamped number, whatever the table now says
    Given a run settled at a known `costUsd` under a known price table
    When the price table is later corrected
    And the settled record is read
    Then `costUsd` is unchanged from what was stamped at settle
    And `priceTable` still names the version in force at settle
    And a run settled after the correction is stamped with the new table's version

  Scenario Outline: the two provenance answers, and the shapes that are not answers
    Given a run being settled with <cost input>
    When the settle is attempted
    Then the outcome is <outcome>

    Examples: accepted
      | cost input                                        | outcome                                                    |
      | buckets only                                      | stamped `priced`, with a price-table version               |
      | buckets and a runtime-reported USD figure          | stamped `reported`, price table `null`                     |
      | a run that genuinely cost nothing                 | stamped `0` — a measured zero, not `null` (task 00)        |

    Examples: refused
      | cost input                                        | outcome                                                    |
      | `costSource` outside the closed two-member set    | refused — the vocabulary is closed                         |
      | `costSource` `priced` with no `priceTable`        | refused — a priced number without its table is not comparable |
      | `costSource` `reported` carrying a `priceTable`   | refused — nothing priced it                                |
      | a `costUsd` that is negative                      | refused — a cost is non-negative                           |
