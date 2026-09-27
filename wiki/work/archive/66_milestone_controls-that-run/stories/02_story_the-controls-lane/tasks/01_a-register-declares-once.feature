@executable @cli @work @validate
Feature: A register declares an id once, and a citation resolves to a declaration

  ACD has already written both of these checks, each scoped to exactly one register:
  `duplicate-driver-number` (`src/work-doctor.mjs:377-398`) is the duplicate-id check for work-item
  folder numbers, and `loop-graph-dangling-endpoint` (`src/work-loops.mjs:115`, `:543`) is the
  dangling-citation check for the loops registry. The gap is GENERALISATION, not invention — and
  what blocked it was the declaration form, which story 66/01 now supplies.

  THE MEASURED PRECISION. Built as the downstream milestone worded it, the check ran at 33%
  precision: 3 hits, 1 real. `D-31` was the true positive — cited five times including "ledgered as
  D-31", declared nowhere, exactly the defect that milestone had found by hand. The two false
  positives were a `STATE.md` heading discussing an id and a `**Next free id is D-37.**`
  reservation. With the declaration form applied: 35 declarations, 0 duplicates, 1 dangling, ZERO
  false positives, 346ms over a 33-item stream.

  WHY THE ID RACE MAKES THIS NECESSARY RATHER THAN NICE. The fourth collision in that milestone is
  the one that settles the mechanism: the architect EXECUTED the read-based countermeasure — read
  the register's last entry, saw `D-28`, allocated `D-29` — and collided anyway, because `D-29` had
  been allocated hours earlier by the same author in a concurrent lane. "A stale read looks exactly
  like a fresh one." The countermeasure is unsound, not weak. The prevention is the authoring rule
  shipping in story 66/03; this check is the residue-catcher that proves the rule held.

  THE POLICED UNIVERSE IS QUALIFIED CITATIONS, PLUS BARE IDS INSIDE THEIR OWN ITEM'S DOCUMENTS
  (ADR-009/D). Measured over `wiki/work`: 1,762 qualified `m?<itemRef>/<ID>` citations, of which 61
  do not resolve — mostly authoring noise such as `08/ADR-00n`, `007/ADR-008` and `1/F-2`. The
  unscoped reading would have swept in 8,250 bare `ADR-NNN` and 345 bare `FF-NN` occurrences across
  555 files. A bare id cited from another item names no addressable target, so calling it dangling
  asserts what the model cannot know; it is out of the universe, and that scoping is the difference
  between an unlandable check and a landable one. The `m` prefix is optional (ADR-008 §5): 430
  citations are written `m52/ADR-007` against 1,756 bare `52/ADR-007`, so both forms are real and
  the grammar takes `m?`.

  ADR-001 §1 freezes the register-block set at exactly two — `## Fitness functions` and
  `## Findings` — so an `ADR-NNN` heading is never a REGISTER declaration; it is nonetheless the
  target a qualified `52/ADR-007` resolves against, which is what the 61-of-1,762 measurement
  counts. A check whose first run over its own tree reports thousands has found a scoping defect in
  itself rather than a defect in the tree; the last scenario is where that is settled, and it is
  settled by measurement rather than by assertion.

  Scenario Outline: the precision matrix — what is a declaration, and what fires
    Given the line <line> placed in <placement>
    When `aof work doctor` runs
    Then it is read as <reading>
    And the finding is <finding>

    Examples: the two admitted declaration forms
      | line                                    | placement                                    | reading       | finding |
      | a table row whose first cell is `FF-01` | `## Fitness functions` in `ARCHITECTURE.md`  | a declaration | none    |
      | the heading `### F-12 · a finding`      | `## Findings` in `VERIFICATION.md`           | a declaration | none    |
      | a table row whose first cell is `**F-12**` | `## Findings` in `VERIFICATION.md`        | a declaration | none    |

    Examples: the measured false positives, dissolved by position rather than by special case
      | line                                    | placement                                    | reading       | finding |
      | `### D-17 is now LIVE, and sharper`     | a `STATE.md`, which opens no register block  | a citation    | none    |
      | `**Next free id is D-37.**`             | inside `## Fitness functions`                | a citation    | none    |
      | `- **F-28 · BLOCKER, see below**`       | inside `## Findings`                         | a citation    | none, the bullet form is grandfathered and not admitted |
      | a table row whose first cell is `FF-01` | a fenced sample quoted inside `## Fitness functions` | skipped | none    |

    Examples: duplicates within one register file
      | line                                    | placement                                    | reading       | finding |
      | `FF-01` in two rows' first cells        | one `## Fitness functions`                   | two declarations | one duplicate-id finding naming the file and both line numbers |
      | `FF-01` as a row and again as a heading | one `## Fitness functions`                   | two declarations | one duplicate-id finding, because the form does not change the id |
      | `FF-5204` in m52 and `FF-5204` in m66   | two different register files                 | two declarations | none, the id space is per register file |

    Examples: the policed universe — every qualified citation, wherever it stands
      | line                                    | placement                                    | reading       | finding |
      | `52/FF-5204`, declared in m52           | m66's `ARCHITECTURE.md`                      | a qualified citation | none |
      | `m52/FF-5204`, the same declaration     | m66's `ARCHITECTURE.md`                      | a qualified citation, the `m` prefix optional | none |
      | `52/FF-9999`, declared nowhere in m52   | m66's `ARCHITECTURE.md`                      | a qualified citation | dangling, naming the id and m52's register |
      | `m52/FF-9999`, the same miss            | m66's `ARCHITECTURE.md`                      | a qualified citation | dangling, because the prefix changes the spelling and never the target |
      | `77/FF-1` where no item 77 exists       | m66's `ARCHITECTURE.md`                      | a qualified citation | dangling, naming the unresolvable item ref rather than the id |
      | `52/ADR-007`, an ADR block in m52       | m66's `ARCHITECTURE.md`                      | a qualified citation | none, an ADR heading is a resolution target though it is no register declaration |
      | `007/ADR-008`, an item ref no work item wears | m66's prose                            | a qualified citation | dangling, and it is one of the measured 61 |

    Examples: bare ids — policed inside their own item's documents, out of the universe across items
      | line                                    | placement                                    | reading       | finding |
      | a bare `FF-6601`, declared in m66's own register | m66's `STATE.md`                    | a bare citation inside its own item  | none, it resolves against that item's register |
      | a bare `FF-6699`, declared nowhere in m66 | m66's `STATE.md`                           | a bare citation inside its own item  | dangling, because here the target is addressable |
      | a bare `FF-5204` declared only in m52   | m66's `ARCHITECTURE.md`                      | a bare cross-item citation           | none, out of the policed universe — a bare id names no addressable target |
      | a bare `ADR-004`, whichever item wrote it | m53's `STATE.md`                           | a bare cross-item citation           | none, and 8,250 such occurrences are why the universe is scoped |
      | `ledgered as D-31`, five times, declared nowhere in that item | that item's own prose   | five bare citations inside their own item | ONE dangling finding, because the collision is one fact and the fix is one act |

  Scenario: the check runs over the frozen register-block set, and needs no copy per register
    Given a stream whose fitness registers and findings registers both carry ids
    When the check runs
    Then both are checked by the same rule, from one implementation
    And a debt entry, a lesson and an ADR block are outside the frozen set, so they declare nothing here
    And admitting a third register block is an ADR-level act, not a second copy of the check

  Scenario: the two seed checks keep their own findings, and are not folded into this lane
    Given a stream carrying both a duplicate driver number and a duplicate id in one register
    When `aof work doctor` runs
    Then it reports `duplicate-driver-number` and `register-duplicate-id` as two distinct findings
    And neither seed check is re-implemented inside this lane, per `src/work-doctor-freshness.mjs:12`

  Scenario: the check reports no citation that a legal edit could not clear
    Given ACD's own stream, whose policed universe is the 1,762 qualified citations measured in this feature's preamble
    When `aof work doctor` runs over it
    Then it reports the 61 that do not resolve, and no finding is raised outside that universe
    And every finding names an id or an item ref a legal edit could declare or correct
    And 61 is small enough to enumerate in a review, which is the precision claim restated
    And a report of thousands is a scoping defect in the check rather than a defect in the tree
