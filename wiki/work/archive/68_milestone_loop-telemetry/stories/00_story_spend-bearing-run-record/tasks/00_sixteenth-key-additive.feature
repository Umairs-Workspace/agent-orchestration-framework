@executable @cli @work @work-stream
Feature: `spend` — the sixteenth key, appended last, where absence means not-measured

  The run record's key set is frozen and read positionally in four places on this tree, and its own
  comment block (`src/run-store.mjs:330-343`) documents a lineage of single-key extensions in which
  **absence is benign**: nine keys (19) → thirteen (20) → fourteen (26, `node`) → fifteen (348,
  `resumeAfter`, "appended LAST"). ADR-001 keeps that discipline rather than spending it: the
  sixteenth key is `spend`, ONE envelope, appended last, defaulting `null`.

  The distinction this task exists to make observable is **`null` is not `0`**. A run that ended
  before anything was ingested, a run on a runtime that reports nothing, and a fifteen-key record
  read forward are all *not measured* — and a run that genuinely cost nothing is `0`. Collapsing
  those two is how a reconstruction starts lying, and it is the same posture ADR-006 takes on an
  unattributable run and ADR-002 takes on a run with no declared phase: report the absence, never
  infer a value.

  `phase` is deliberately NOT a key here — it rides `brief.loop.phase`, delivered by milestone 53
  (ADR-002), and FF-6802 makes that single authority structural.

  ADR-001; ADR-002; ADR-004 (the three cost keys this envelope carries).

  Scenario: a newly minted run record carries `spend` as its sixteenth key
    Given a work item with no runs
    When a run is started against it
    Then the persisted record's key set is exactly the fifteen delivered keys followed by `spend`
    And `spend` is the sixteenth and last key
    And `spend` reads `null`
    And the fifteen delivered keys are unchanged in name, order and meaning

  Scenario: a fifteen-key record written before this milestone reads forward unchanged
    Given a run record on disk carrying only the fifteen delivered keys
    When the record is read
    Then the read succeeds
    And `spend` reads `null`
    And every one of the fifteen delivered values is returned verbatim

  Scenario: not-measured and measured-zero are different answers
    Given a settled run whose spend was never ingested
    And a settled run whose ingested spend totalled zero tokens at zero cost
    When both records are read
    Then the first reports `spend` as `null`
    And the second reports a `spend` envelope whose `costUsd` is `0`
    And the two are distinguishable without consulting anything outside the record

  Scenario Outline: the envelope carries exactly its declared keys and nothing else
    Given a run settled with a complete spend envelope
    When the record is read
    Then `spend` carries the key <key>
    And `spend` carries no key outside its declared set

    Examples: the declared envelope (ADR-001)
      | key         | why it is here                                                      |
      | model       | the cache key includes model; a total that mixes models is not one   |
      | effort      | the second routing dimension, reported per turn by the runtime      |
      | tokens      | the four mutually-exclusive buckets of ADR-003                      |
      | costUsd     | stamped once at settle, never recomputed (ADR-004)                  |
      | costSource  | whether the number was reported or priced (ADR-004)                 |
      | priceTable  | the version of the table used, when the cost was priced (ADR-004)   |
      | turns       | the count the loop's own iteration bounds will later be read against |
      | toolCalls   | the count that separates model generation from tool wait            |
      | exitReason  | how the run ended, recorded — not a decision procedure (ADR-008)    |

    Examples: keys that must NOT appear
      | key   | why not                                                                     |
      | phase | rides `brief.loop.phase`, delivered by milestone 53 — one authority (ADR-002) |
      | attempt | already key 4 of the delivered fifteen; not re-declared (ADR-001)          |
