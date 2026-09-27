@executable @cli @work @validate @bug @finding-F-52-04-H
Feature: The value suite — what one authored value becomes, and the syntax-only promise proved differentially

  `test/work-loops-value.test.mjs`, registered in `scripts/test.mjs`. It mechanises the value-facing
  half of 52/00: `02_field-value-grammar` (25 scenarios) and `03_pointer-endpoint-syntax` (29) — 54
  scenarios, and almost none of them is pre-decided by the nine gates. This is the largest genuinely
  uncovered surface in the milestone. The subject is always a loaded model's `fields[key]` (a Field) or
  `edges[key]` (an Endpoint), reached through the exported `loadLoops`; never a private value parser.

  THE TWO CLAIMS THAT CARRY THE MILESTONE. First, **the honesty envelope**: a declared gap and a filled
  field differ in `kind`, so a reader separates them without reading `raw` — the property ADR-002 exists
  for. Second, **ADR-003's syntax-only promise**: 52 validates the SHAPE of a pointer and resolves
  nothing outside `<work.dir>/loops/`. A suite that only counts findings cannot prove the second, because
  "no finding" is what a resolver that happened to succeed would also produce. It is proved
  DIFFERENTIALLY — load a registry citing referents that do not exist, create them, load again, and
  assert the two loads are byte-identical. Nothing was consulted, so nothing could change.

  ONE CLAIM MIGRATES IN. `04_timescale-comparability`'s *"duration units resolve and compare across ms,
  s, m, h and d"* is a LOADER claim mis-homed in a check feature: FF-5206 builds `{kind:"periodic", ms}`
  literally and never resolves a unit, so the ladder is decided by nothing. It is decided here, and the
  coverage ledger records the migration against its originating feature.

  ADR-002, ADR-003, ADR-011 §2 (the five typed kinds), §4, §7 (normalisation), ADR-013 §4 (no dedup of
  field lists), §5 ("#" admitted inside a "prose:" value).

  Background:
    Given a temp workspace whose "<work.dir>/loops/" holds records materialised by the fixture helper

  Scenario: the six gap-and-authority kinds are six distinct values
    Given one record per token — a module pointer, a "prose:" value, "unknown", "uncapped", "none" and a free phrase
    When the directory is loaded
    Then the fields' kinds are pointer, prose, unknown, uncapped, none and phrase
    And the six are distinct values, not one nullable one
    And every field carries a key, a raw and a kind, none of them null

  Scenario: a declared gap is separable from a filled field by kind alone
    Given "a.md" declaring "owner: actor:product-owner" and "b.md" declaring "owner: unknown"
    When the directory is loaded
    Then the two owner fields differ in kind
    And a reader of kind alone separates them without reading raw

  Scenario: the five typed kinds each carry their own payload
    Given records declaring "cadence: periodic:15s", "cadence: event:per-item", "owner: actor:product-owner", "optimizing: true" and, on an actor, "ground: exogenous"
    When the directory is loaded
    Then the periodic cadence carries a numeric millisecond value
    And the event cadence carries its trigger
    And the owner carries a scheme and an operand
    And "optimizing" carries a boolean, not the string "true"
    And the actor's ground carries its enumerated value
    And none of the five is reported as a gap kind

  # THE MIGRATED CLAIM. FF-5206 never resolves a unit; nothing else does either.
  Scenario: every duration unit resolves to milliseconds
    Given five records declaring "periodic:250ms", "periodic:15s", "periodic:15m", "periodic:2h" and "periodic:1d"
    When the directory is loaded
    Then the millisecond values are 250, 15000, 900000, 7200000 and 86400000
    And each field's raw is still the authored string

  Scenario: a field's shape is fixed by its key, never by the data authored into it
    Given "ceiling: uncapped" on one record and "ceiling: [config:work.autonomous.maxAttempts]" on another
    And a record declaring all five scalar-shaped keys
    When the directory is loaded
    Then "ceiling" is a one-entry list on both records
    And "controlled", "cadence", "owner", "optimizing" and "ground" are single fields on every node

  Scenario: a sentinel is admitted where its key admits it and is a bad value everywhere else
    Given "unknown" declared on "owner", "cadence" and "ceiling", and again on "controlled", "reference", "measurement" and "actuator"
    And "uncapped" declared on "ceiling" and again on "cadence"
    When the directory is loaded
    Then each admitted placement yields its gap kind and its own warn code
    And each unadmitted placement yields "loop-bad-value" at error

  Scenario: prose-only is a claim about the whole list, and each entry is classified on its own
    Given "actuator: [command:work:run-retry, prose:…]" on one record and "actuator: [prose:…]" on another
    When the directory is loaded
    Then the mixed list reports no "loop-field-prose-only"
    And the all-prose list reports the warn
    And no entry's kind was decided by its siblings

  Scenario: an empty list is an error, and never a declared gap
    Given "a.md" declaring "actuator: []" and "b.md" declaring "actuator: [prose:…]"
    When the directory is loaded
    Then "a.md" reports "loop-empty-list" at error and no honesty warn
    And "b.md" reports the honesty warn and no error

  Scenario: a pointer splits at its FIRST colon, so a command operand keeps its own
    Given "reference: [module:src/run-store.mjs#isRetryable, command:work:next, config:work.autonomous.maxAttempts]"
    And a second record declaring "actuator: [command:work:run-retry]"
    When the directory is loaded
    Then each pointer's scheme and operand split at the first colon
    And "command:work:run-retry" keeps the operand "work:run-retry", colon and all

  Scenario: only a module pointer may carry a symbol
    Given "command:work:doctor#run", "config:work.max#max", "item:52/00#anchor" and a "data-feed: [loop:x#y]"
    When the directory is loaded
    Then each is reported "loop-bad-value"
    And no operand anywhere carries a "#"
    And the rejected "loop:" value produces no dangling-endpoint finding — a value that failed the grammar was never an endpoint

  Scenario: a "prose:" value is a sentinel, not a pointer, and keeps its text verbatim
    Given "measurement: [prose:src/bundle/commands/continue.md#retry-loop]"
    And, on another record, "ceiling: [prose:src/x.md#retry-loop]"
    When the directory is loaded
    Then the prose entry keeps the anchor verbatim in its text
    And it carries no symbol and no scheme
    And it reports "loop-field-prose-only" at warn
    And the ceiling placement is still "loop-bad-value"

  Scenario: intra-registry endpoints resolve against the registry and nothing else
    Given a declared "loop:autonomous-cascade", an undeclared "loop:ghost", a "loop:sensor" whose record's kind is unreadable, and a declared "actor:operator"
    When the directory is loaded
    Then the declared endpoints resolve true
    And "loop:ghost" resolves false and reports "loop-graph-dangling-endpoint" anchored at the DECLARING record's file
    And the unreadable-kind record's endpoint resolves true — it is declared

  Scenario: an extra-registry endpoint is unresolved, by identity and never by coercion
    Given "monitoring: [item:52/00, command:work:doctor, config:work.max, module:src/x.mjs#isStale]"
    When the directory is loaded
    Then each endpoint's resolved value is null, asserted by identity
    And none is true, none is false
    And no dangling-endpoint finding is reported for any of them

  # THE DIFFERENTIAL. This is the only shape of assertion that can prove a negative about resolution.
  Scenario: the load consults nothing outside the loops directory
    Given a record citing "module:src/does-not-exist.mjs#nope", "module:src/work.mjs#notExported", "command:work:no-such-verb", "config:no.such.key" and "item:99/99"
    When the directory is loaded, the cited referents are then created, and the directory is loaded again
    Then neither load reports a finding for any of the five
    And the two loads are byte-identical
    And the identity of the two loads is what proves nothing outside the loops directory was read

  Scenario: a field list keeps its duplicates and an edge list collapses them
    Given one record declaring "actuator: [command:a, command:a]" and "monitoring: [loop:a, loop:a]"
    When the directory is loaded
    Then "actuator" keeps two entries, in the authored order
    And "monitoring" carries one endpoint
    And neither reports a finding

  Scenario: an empty edge key and an absent one are different facts
    Given "a.md" declaring "monitoring: []" and "b.md" declaring no "monitoring" key
    When the directory is loaded
    Then "a.md" reports "loop-empty-list" and exposes no monitoring a consumer could read as declared-and-empty
    And "b.md" reports no finding and carries no "monitoring" key at all

  Scenario: the suite drives the loaded model and its negatives carry positive controls
    Given every case in this suite
    When the suite runs
    Then every subject is a Field or an Endpoint of a model returned by "loadLoops"
    And every case asserting that no finding is reported names, in the same case, the authored value that DOES report one
    And every three-valued resolution is asserted by identity against true, false or null, never by truthiness

  # THE SUITE'S CASE TABLE. Columns are the discriminating axes: the covered feature, the record content
  # that makes the case, and the observation that decides it.
  Examples:
    | covered feature            | fixture the case needs                                                                              | deciding observation                                                                                        |
    | 02_field-value-grammar     | one record per gap/authority token — module, prose, unknown, uncapped, none, a phrase                | six DISTINCT kinds; every field carries key, raw and kind, none null                                        |
    | 02_field-value-grammar     | "a.md" owner filled, "b.md" owner "unknown"                                                          | the two differ in KIND — the honesty envelope, readable without touching raw                                |
    | 02_field-value-grammar     | periodic, event, owner-ref, optimizing flag, actor ground                                            | ms is a number, trigger a token, ref a scheme+operand, flag a boolean, ground an enum; none is a gap kind    |
    | 02_field-value-grammar     | five records: periodic 250ms / 15s / 15m / 2h / 1d                                                    | 250 / 15000 / 900000 / 7200000 / 86400000 exactly, each raw preserved — the ladder FF-5206 never resolves    |
    | 02_field-value-grammar     | "ceiling: uncapped" beside "ceiling: [config:…]"; one record declaring all five scalar keys          | "ceiling" a one-entry LIST in both; the five scalar keys single Fields on every node                        |
    | 02_field-value-grammar     | each sentinel on an admitting key and on a non-admitting one                                          | gap kind + own warn where admitted; "loop-bad-value" at error everywhere else                               |
    | 02_field-value-grammar     | "[command:…, prose:…]" beside "[prose:…]"                                                             | mixed → NO prose-only warn; all-prose → warn; each entry classified alone                                   |
    | 02_field-value-grammar     | "actuator: []" beside "actuator: [prose:…]"                                                           | empty-list at ERROR with no honesty warn; prose-only at WARN with no error                                  |
    | 03_pointer-endpoint-syntax | "[module:…#sym, command:work:next, config:work.autonomous.maxAttempts]" and "[command:work:run-retry]" | split at the FIRST colon; "work:run-retry" survives as one operand                                           |
    | 03_pointer-endpoint-syntax | "#" on command, config, item and a "loop:" endpoint                                                   | bad-value for each; no operand carries "#"; the rejected "loop:" value raises NO dangling finding            |
    | 03_pointer-endpoint-syntax | "measurement: [prose:…#anchor]" and "ceiling: [prose:…#anchor]"                                       | anchor kept verbatim, no symbol, no scheme, prose-only warn; the ceiling placement still bad-value           |
    | 03_pointer-endpoint-syntax | a declared loop, an undeclared "loop:ghost", an unreadable-kind record, a declared actor              | true / false + dangling anchored at the DECLARING file / true / true                                        |
    | 03_pointer-endpoint-syntax | "monitoring: [item:…, command:…, config:…, module:…#sym]"                                             | all four resolved === null by IDENTITY, never true, never false; no dangling finding                        |
    | 03_pointer-endpoint-syntax | five non-existent referents, loaded, created, loaded again                                            | zero findings in both loads AND the two loads byte-identical — the syntax-only promise, proved              |
    | 03_pointer-endpoint-syntax | one record with a duplicated field entry and a duplicated edge endpoint                               | field keeps TWO in authored order; edge collapses to ONE; no finding for either                             |
    | 03_pointer-endpoint-syntax | "monitoring: []" beside a record declaring no "monitoring" key                                        | empty-list finding and no readable declared-and-empty key; vs no finding and no key at all                   |
