@executable @cli @work @work-stream
Feature: The field-value grammar and its sentinels — a declared gap differs in KIND, not in raw

  Every field reaches a consumer as `Field = { key, raw, kind, <payload> }` with `kind`
  ALWAYS present. This is the milestone's honesty keystone: `unknown` (no evidence was
  found), `uncapped` (evidence was found, and it is that no bound exists), `none` (the body
  terminates by construction) and `prose:<path>` (the only authority is a paragraph, and it
  lives HERE) are first-class, mutually distinct DECLARED values — and each is admitted on
  a named subset of keys and nowhere else. A consumer reading `kind` can never mistake a
  declared gap for a filled field. The five TYPED kinds — `periodic`, `event`, `ref`,
  `flag`, `enum` — arrive already normalised, so no consumer ever parses a value string.
  And the SHAPE of a field is fixed by its key from the frozen schema, never by the data it
  was handed. ADR-002 (the locked node contract and its admission rules), ADR-006 (the
  cadence grammar), ADR-007 §1–2 (the two severities), ADR-011 §2 (the typed kinds and the
  key-shaped `fields` map), §5 (the empty list), §6 (`ceiling: unknown`).

  Background:
    Given a "<work.dir>/loops/" directory of records

  Scenario: every field carries key, raw and kind, and kind is never absent
    Given a valid "kind: loop" record with every required key filled
    When the loops directory is loaded
    Then every field of the node carries a "key", a "raw" and a "kind"
    And no field's "kind" is absent, empty or null

  Scenario: raw is the value exactly as authored
    Given a record declaring "controlled: run state reaching a terminal value"
    When the loops directory is loaded
    Then the field's raw is "run state reaching a terminal value", character for character
    And raw is never rewritten, trimmed of meaning, or replaced by a resolved form

  Scenario: pointer is present only when kind is pointer
    Given a record declaring "reference: [module:src/run-store.mjs#isRetryable]" and "owner: unknown"
    When the loops directory is loaded
    Then the reference entry has kind "pointer" and carries a pointer of scheme "module"
    And the owner field has kind "unknown" and carries no pointer

  # THE LOAD-BEARING SCENARIO OF THE STORY.
  Scenario: a declared gap and a filled field differ in kind, not merely in raw
    Given "a.md" declaring "owner: actor:product-owner"
    And "b.md" declaring "owner: unknown"
    When the loops directory is loaded
    Then the two owner fields differ in "kind"
    And "b.md"'s owner kind is "unknown"
    And "a.md"'s owner kind is not "unknown"
    And a consumer that reads only "kind" can tell the two apart without inspecting "raw"

  Scenario: the six authority-and-gap kinds are distinguished, and every gap kind names the gap it declares
    Given a directory declaring, across records, "module:src/run-store.mjs#isRetryable", "prose:src/bundle/commands/continue.md", "unknown", "uncapped", "none" and a free-text phrase
    When the loops directory is loaded
    Then the kinds reported are "pointer", "prose", "unknown", "uncapped", "none" and "phrase" respectively
    And no two of them share a kind

  # The five typed kinds are what keeps a consumer out of the parsing business: the value
  # arrives interpreted, and its kind is never one of the four gap kinds.
  Scenario: the five typed kinds each carry their own payload
    Given "a.md" declaring "kind: loop", "cadence: periodic:15s", "owner: actor:product-owner" and "optimizing: true"
    And "b.md" declaring "kind: loop" and "cadence: event:per-item"
    And "operator.md" declaring "kind: actor" and "ground: exogenous"
    When the loops directory is loaded
    Then "a.md"'s cadence has kind "periodic" and carries ms 15000
    And "b.md"'s cadence has kind "event" and carries trigger "per-item"
    And "a.md"'s owner has kind "ref", scheme "actor" and operand "product-owner"
    And "a.md"'s optimizing has kind "flag" and carries the boolean true
    And "operator.md"'s ground has kind "enum" and carries the value "exogenous"
    And none of the five is "pointer", "prose", "phrase", "unknown", "uncapped" or "none"

  Scenario: cadence arrives normalised — a consumer is never handed a duration to parse
    Given records declaring "cadence: periodic:250ms", "cadence: periodic:15s", "cadence: periodic:15m", "cadence: periodic:2h" and "cadence: periodic:1d"
    When the loops directory is loaded
    Then the five cadences carry ms 250, 15000, 900000, 7200000 and 86400000 respectively
    And each ms is a number, not a string
    And each field's raw is still the string exactly as authored
    And no consumer is handed "periodic:15s" as the value to interpret

  Scenario: an event cadence names its trigger and carries no duration
    Given a record declaring "cadence: event:per-milestone"
    When the loops directory is loaded
    Then the cadence has kind "event" and trigger "per-milestone"
    And it carries no ms, and no duration of any other name
    And nothing in the load converts a trigger into a duration

  # The shape of fields[key] comes from the frozen schema, so a consumer never branches on
  # what it was handed.
  Scenario: the shape of a field is fixed by its key, never by its data
    Given "a.md" declaring "reference: [module:src/run-store.mjs#isRetryable]" and "ceiling: uncapped"
    When the loops directory is loaded
    Then "reference" is a list of fields, with one entry
    And "ceiling" is also a list of fields, with one entry
    And "measurement" and "actuator" are lists wherever they are declared
    And no consumer has to ask whether a value arrived as a list

  Scenario: a sentinel on ceiling still arrives inside a list
    Given "a.md" declaring "ceiling: uncapped"
    And "b.md" declaring "ceiling: none"
    And "c.md" declaring "ceiling: unknown"
    When the loops directory is loaded
    Then each node's "ceiling" is a one-entry list
    And the single entry's kind is "uncapped", "none" and "unknown" respectively
    And no node's "ceiling" is a bare field beside another node's list

  Scenario: the scalar keys are never wrapped in a list
    Given a "kind: loop" record declaring "controlled", "cadence", "owner" and "optimizing"
    And a "kind: actor" record declaring "ground"
    When the loops directory is loaded
    Then each of those five is a single field, not a list
    And none of them is wrapped into a one-entry list to match its list-shaped siblings

  Scenario: id, kind and title are node-level and never appear among the fields
    Given a valid "kind: loop" record with every required key filled
    When the loops directory is loaded
    Then the node's fields carry no entry named "id", "kind" or "title"
    And the node's own id, kind and title are readable without going through fields

  Scenario: "unknown" is admitted on owner, cadence and ceiling
    Given a "kind: loop" record declaring "owner: unknown", "cadence: unknown" and "ceiling: unknown"
    When the loops directory is loaded
    Then the owner and cadence fields have kind "unknown", and the ceiling's single entry has kind "unknown"
    And no "loop-bad-value" is reported for any of them
    And each reports its own honesty warn — "loop-owner-unknown", "loop-cadence-unknown" and "loop-ceiling-unknown"

  Scenario: "unknown" anywhere else is a bad value — an aspirational loop cannot be declared
    Given a "kind: loop" record declaring "controlled: unknown"
    When the loops directory is loaded
    Then the load reports "loop-bad-value" at severity error, naming "controlled"
    And the same holds for "reference", "measurement" and "actuator"

  Scenario: "uncapped" and "none" are admitted only on ceiling, and they mean opposite things
    Given "a.md" declaring "ceiling: uncapped"
    And "b.md" declaring "ceiling: none"
    When the loops directory is loaded
    Then "a.md"'s ceiling entry has kind "uncapped" and reports "loop-ceiling-uncapped" at severity warn
    And "b.md"'s ceiling entry has kind "none" and reports no finding
    And the two kinds are different — a loop with no bound is never conflated with a body that terminates by construction

  Scenario: "uncapped" on any key other than ceiling is a bad value
    Given a record declaring "cadence: uncapped"
    When the loops directory is loaded
    Then the load reports "loop-bad-value" at severity error, naming "cadence"

  # A ceiling nobody has established is a declared gap like any other, and it warns like
  # its siblings — otherwise a reader could not tell "we do not know" from "there provably
  # is none".
  Scenario: "ceiling: unknown" is a declared gap and warns like its siblings
    Given a "kind: loop" record declaring "ceiling: unknown"
    When the loops directory is loaded
    Then the ceiling's single entry has kind "unknown"
    And the load reports "loop-ceiling-unknown" at severity warn, naming "ceiling"
    And it is never reported at severity error, and it never blocks the node from loading

  Scenario: the three ceiling sentinels are told apart by kind AND by code
    Given "a.md" declaring "ceiling: unknown"
    And "b.md" declaring "ceiling: uncapped"
    And "c.md" declaring "ceiling: none"
    When the loops directory is loaded
    Then "a.md" reports "loop-ceiling-unknown" and "b.md" reports "loop-ceiling-uncapped"
    And "c.md" reports no ceiling finding at all
    And no two of the three carry the same kind
    And a consumer reading only the findings can still tell all three apart

  # "phrase" is a FIELD kind, and "controlled" is the only key that admits it. A title is a
  # bare node-level string like id and kind — it carries no kind, so it is not a Field and
  # the phrase admission never applies to it.
  Scenario: a free-text phrase is admitted on controlled, and on no other key
    Given a record declaring "controlled: run state reaching a terminal value" and "title: Run resilience"
    When the loops directory is loaded
    Then the controlled field has kind "phrase"
    And "controlled" is the only key on which a free-text phrase is admitted
    And the title reaches the consumer as the node's own bare string — not an entry in fields, and carrying no kind at all
    And no finding is reported for either

  Scenario: a free-text phrase on a machinery field is a bad value
    Given a record declaring "reference: [the transition table in run-store]"
    When the loops directory is loaded
    Then the load reports "loop-bad-value" at severity error, naming "reference"
    And the entry is not admitted as a weak pointer

  Scenario: a field whose authority is only a paragraph is a warn, not an error
    Given a "kind: loop" record declaring "measurement: [prose:src/bundle/commands/continue.md]"
    When the loops directory is loaded
    Then the entry has kind "prose"
    And the load reports "loop-field-prose-only" at severity warn, naming "measurement"
    And the node still loads with no error-severity finding for that field

  Scenario: each entry of a list field is classified on its own
    Given a "kind: loop" record declaring "actuator: [command:work:run-retry, prose:src/bundle/commands/continue.md]"
    When the loops directory is loaded
    Then the first entry has kind "pointer"
    And the second entry has kind "prose"
    And no entry is classified by the field's other entries

  # "loop-field-prose-only" is read literally: the code fires when a field's authority is
  # ENTIRELY paragraph-level, which is the number ADR-003 says makes the registry's honesty
  # measurable ("how much of it is still paragraph-backed"). A field carrying at least one
  # machine-readable pointer is not prose-only.
  Scenario: a field mixing a pointer and a prose entry is not prose-only
    Given a "kind: loop" record declaring "actuator: [command:work:run-retry, prose:src/bundle/commands/continue.md]"
    When the loops directory is loaded
    Then no "loop-field-prose-only" is reported for "actuator"

  # An empty list declares nothing at all, so it can never stand in for a declared gap —
  # that is the hole "no declared loop is aspirational" exists to close.
  Scenario: an empty list is not a way to declare a gap
    Given "a.md" declaring "actuator: []"
    And "b.md" declaring "actuator: [prose:src/bundle/commands/continue.md]"
    When the loops directory is loaded
    Then "a.md" reports "loop-empty-list" at severity error, naming "actuator"
    And "a.md" carries no honesty-lane warn for "actuator" — an empty list is a slip, not a claim a human made
    And "b.md" reports "loop-field-prose-only" at severity warn and no error for that field

  # A filled, typed value (a resolvable cadence, a named owner, an optimizing claim) is not
  # a declared gap, and the honesty contract is that it can never be read as one — whatever
  # kind the loader assigns it, that kind is none of the four gap kinds.
  Scenario: a filled typed value never carries a gap kind
    Given a "kind: loop" record declaring "cadence: periodic:15s", "owner: actor:product-owner" and "optimizing: false"
    When the loops directory is loaded
    Then those three fields carry the kinds "periodic", "ref" and "flag" respectively
    And none of those kinds is "unknown", "uncapped", "none" or "prose"
    And no honesty-lane finding is reported for any of them

  # field key x raw value -> Field.kind x finding. The kind column names the kind and, in
  # brackets, the payload that kind carries. `n/a` means the value is rejected, so no
  # admitted kind is claimed for it. For `reference` / `measurement` / `actuator` /
  # `ceiling` the kind shown is the kind of the ENTRY — the field itself is always a list.
  # Per key, evaluation stops at the FIRST gate that fails: a scalar key handed "[]" is
  # loop-expected-scalar and nothing else, never also loop-empty-list.
  Examples:
    | field       | raw value as authored                              | Field.kind               | finding                        | severity |
    | title       | Run resilience — runs driven to a terminal state    | (no Field — bare string) | (none)                         | —        |
    | controlled  | run state reaching a terminal value                 | phrase                   | (none)                         | —        |
    | controlled  | module:src/run-store.mjs#LEGAL_TRANSITIONS          | pointer                  | (none)                         | —        |
    | controlled  | prose:src/bundle/commands/continue.md               | prose                    | loop-field-prose-only          | warn     |
    | controlled  | unknown                                             | n/a                      | loop-bad-value                 | error    |
    | controlled  | uncapped                                            | n/a                      | loop-bad-value                 | error    |
    | controlled  | none                                                | n/a                      | loop-bad-value                 | error    |
    | controlled  | [run state reaching a terminal value]               | n/a                      | loop-expected-scalar           | error    |
    | controlled  | [module:a.mjs#x, module:b.mjs#y]                    | n/a                      | loop-expected-scalar           | error    |
    | controlled  | []                                                  | n/a                      | loop-expected-scalar           | error    |
    | reference   | [command:work:next]                                 | pointer                  | (none)                         | —        |
    | reference   | [prose:src/bundle/commands/continue.md]             | prose                    | loop-field-prose-only          | warn     |
    | reference   | [module:a.mjs#x, prose:b.md]                        | pointer, prose           | (none)                         | —        |
    | reference   | [unknown]                                           | n/a                      | loop-bad-value                 | error    |
    | reference   | [the transition table in run-store]                 | n/a                      | loop-bad-value                 | error    |
    | reference   | module:src/run-store.mjs#isRetryable                | n/a                      | loop-expected-list             | error    |
    | reference   | []                                                  | n/a                      | loop-empty-list                | error    |
    | measurement | [module:src/run-store.mjs#isStale]                  | pointer                  | (none)                         | —        |
    | measurement | [prose:src/bundle/commands/continue.md]             | prose                    | loop-field-prose-only          | warn     |
    | measurement | [prose:src/bundle/commands/continue.md#retry-loop]  | prose (anchor kept)      | loop-field-prose-only          | warn     |
    | measurement | unknown                                             | n/a                      | loop-bad-value                 | error    |
    | measurement | []                                                  | n/a                      | loop-empty-list                | error    |
    | actuator    | [command:work:run-retry, command:work:run-complete] | pointer                  | (none)                         | —        |
    | actuator    | [prose:src/bundle/commands/continue.md]             | prose                    | loop-field-prose-only          | warn     |
    | actuator    | unknown                                             | n/a                      | loop-bad-value                 | error    |
    | actuator    | []                                                  | n/a                      | loop-empty-list                | error    |
    | cadence     | periodic:250ms                                      | periodic (ms 250)        | (none)                         | —        |
    | cadence     | periodic:15s                                        | periodic (ms 15000)      | (none)                         | —        |
    | cadence     | periodic:90s                                        | periodic (ms 90000)      | (none)                         | —        |
    | cadence     | periodic:15m                                        | periodic (ms 900000)     | (none)                         | —        |
    | cadence     | periodic:2h                                         | periodic (ms 7200000)    | (none)                         | —        |
    | cadence     | periodic:1d                                         | periodic (ms 86400000)   | (none)                         | —        |
    | cadence     | event:per-item                                      | event (per-item)         | (none)                         | —        |
    | cadence     | event:per-phase                                     | event (per-phase)        | (none)                         | —        |
    | cadence     | event:per-milestone                                 | event (per-milestone)    | (none)                         | —        |
    | cadence     | event:per-run-start                                 | event (per-run-start)    | (none)                         | —        |
    | cadence     | unknown                                             | unknown                  | loop-cadence-unknown           | warn     |
    | cadence     | uncapped                                            | n/a                      | loop-bad-value                 | error    |
    | cadence     | none                                                | n/a                      | loop-bad-value                 | error    |
    | cadence     | event:per-sprint                                    | n/a                      | loop-bad-value                 | error    |
    | cadence     | periodic:15                                         | n/a                      | loop-bad-value                 | error    |
    | cadence     | periodic:2w                                         | n/a                      | loop-bad-value                 | error    |
    | cadence     | hourly                                              | n/a                      | loop-bad-value                 | error    |
    | cadence     | prose:src/mesh-sync-cadence.mjs                     | n/a                      | loop-bad-value                 | error    |
    | cadence     | (empty after the colon)                             | n/a                      | loop-bad-value                 | error    |
    | cadence     | [periodic:15s]                                      | n/a                      | loop-expected-scalar           | error    |
    | cadence     | []                                                  | n/a                      | loop-expected-scalar           | error    |
    | ceiling     | [config:work.autonomous.maxAttempts]                | pointer                  | (none)                         | —        |
    | ceiling     | [config:work.autonomous.maxAttempts, module:src/run-store.mjs#shouldRetry] | pointer | (none)      | —        |
    | ceiling     | uncapped                                            | uncapped (one-entry list)| loop-ceiling-uncapped          | warn     |
    | ceiling     | none                                                | none (one-entry list)    | (none)                         | —        |
    | ceiling     | unknown                                             | unknown (one-entry list) | loop-ceiling-unknown           | warn     |
    | ceiling     | []                                                  | n/a                      | loop-empty-list                | error    |
    | ceiling     | [uncapped]                                          | n/a                      | loop-bad-value                 | error    |
    | ceiling     | [prose:src/bundle/commands/continue.md]             | n/a                      | loop-bad-value                 | error    |
    | ceiling     | 3                                                   | n/a                      | loop-bad-value                 | error    |
    | owner       | actor:product-owner                                 | ref (actor / product-owner) | (none)                      | —        |
    | owner       | unknown                                             | unknown                  | loop-owner-unknown             | warn     |
    | owner       | loop:autonomous-cascade                             | n/a                      | loop-bad-value                 | error    |
    | owner       | prose:src/bundle/commands/verify.md                 | n/a                      | loop-bad-value                 | error    |
    | owner       | uncapped                                            | n/a                      | loop-bad-value                 | error    |
    | owner       | the product owner                                   | n/a                      | loop-bad-value                 | error    |
    | owner       | (empty after the colon)                             | n/a                      | loop-bad-value                 | error    |
    | owner       | [actor:product-owner]                               | n/a                      | loop-expected-scalar           | error    |
    | owner       | []                                                  | n/a                      | loop-expected-scalar           | error    |
    | optimizing  | true                                                | flag (value true)        | (none)                         | —        |
    | optimizing  | false                                               | flag (value false)       | (none)                         | —        |
    | optimizing  | unknown                                             | n/a                      | loop-bad-value                 | error    |
    | optimizing  | yes                                                 | n/a                      | loop-bad-value                 | error    |
    | optimizing  | [true]                                              | n/a                      | loop-expected-scalar           | error    |
    | optimizing  | []                                                  | n/a                      | loop-expected-scalar           | error    |
    | ground      | exogenous (on a kind: actor node)                   | enum (value exogenous)   | (none)                         | —        |
    | ground      | measured (on a kind: actor node)                    | n/a                      | loop-bad-value                 | error    |
    | ground      | [exogenous] (on a kind: actor node)                 | n/a                      | loop-expected-scalar           | error    |
    | ground      | [] (on a kind: actor node)                          | n/a                      | loop-expected-scalar           | error    |
    | ground      | exogenous (on a kind: loop node)                    | n/a                      | loop-key-not-admitted-for-kind | error    |
