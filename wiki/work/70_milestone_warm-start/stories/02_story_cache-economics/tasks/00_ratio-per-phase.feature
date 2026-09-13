@executable @cli @work @work-stream
Feature: Cache read against cache creation, reported per phase

  Milestone 68 made the numbers true: `spend.tokens` carries four mutually-exclusive buckets —
  `input`, `output`, `cacheRead`, `cacheCreate` — refused at the write path if they overlap
  (`src/run-store.mjs`, 68/ADR-003). Nothing yet reads the two that matter for this milestone.

  The ratio `cacheRead ÷ cacheCreate` is the only signal that distinguishes a working cache flag
  from an inert one, and 70/01's flag is precisely the kind that fails silently. The operative rule
  is stated plainly in the research: *if creation stays high turn after turn, something is changing
  in your prefix.*

  **Phase comes from `brief.loop.phase`** — milestone 53's declaration, read in production at
  `src/commands/loop.mjs:396`. 68/ADR-002 ruled that there is one phase authority and this milestone
  mints no rival; the rollup is a group-by over that key, not over a new column.

  **This story adds no key to the run record.** `aof graph impact src/run-store.mjs` reports 17
  `src/` dependents; its subject `src/work-observe.mjs` reports **zero dependencies**. It reads what
  68 wrote and writes no record.

  **Absence must stay honest.** A run with no `spend` is *unmeasured*. Reporting it as a 0.0 ratio
  would make an un-instrumented run look like a cache failure and would corrupt the very
  before/after this milestone is judged by.

  ADR-008 (70 records, it does not enforce). Consumes 68/ADR-001, ADR-002 and ADR-003.

  Scenario: a phase's runs report their cache ratio
    Given runs recorded against an item, each carrying its token buckets
    When cache economics are reported for that item
    Then each phase reports its cache-read to cache-creation ratio
    And the ratio is derived from the recorded buckets rather than re-counted from a transcript

  Scenario: runs are grouped by the phase the loop declared
    Given runs minted across more than one phase of a loop
    When the report is produced
    Then each run is attributed to the phase its loop declaration names
    And no phase is inferred from the item, the command or the elapsed time

  Scenario: a run the loop did not mint reports no phase
    Given a run with no loop declaration
    When the report is produced
    Then that run's phase reads as absent
    And its spend is still reported, under no phase rather than under a guessed one

  Scenario: an unmeasured run is not a zero
    Given a run that carries no spend
    When the report is produced
    Then that run is reported as unmeasured
    And it is excluded from the ratio rather than counted as a cache miss
    And the count of unmeasured runs is visible in the report

  Scenario: a phase that created cache but never read it is reported, not hidden
    Given a phase whose runs recorded cache creation and no cache reads
    When the report is produced
    Then the phase reports a ratio of zero
    And that is distinguishable in the report from a phase with no measurement at all

  Scenario Outline: the ratio across the cases a real stream contains
    Given a phase whose runs recorded <buckets>
    When the report is produced
    Then the phase reports <reported>

    Examples: the arithmetic, and the two cases that are not arithmetic
      | buckets                                | reported                          |
      | cache reads and cache creations        | reads divided by creations        |
      | cache reads only, no creations         | a warm phase, flagged as unbounded rather than divided by zero |
      | cache creations only, no reads         | a ratio of zero                   |
      | neither bucket populated               | unmeasured                        |
      | no spend envelope at all               | unmeasured                        |

  Scenario Outline: the report answers the question the milestone is judged by
    Given a report over an item's runs
    When a reader inspects it
    Then it answers <question>

    Examples: what a before/after needs to be defensible
      | question                                                  |
      | what fraction of ingested tokens were read rather than written |
      | which phase is paying the cache-write rate                |
      | how many runs contributed no measurement at all           |
