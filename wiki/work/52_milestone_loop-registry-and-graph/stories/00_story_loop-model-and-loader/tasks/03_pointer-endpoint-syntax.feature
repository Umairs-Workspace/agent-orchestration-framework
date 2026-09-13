@executable @cli @work @work-stream
Feature: Pointer and endpoint syntax — shape is guaranteed, resolution is never attempted

  A pointer is a DECLARED reference, and this milestone validates its SHAPE only: the scheme
  is one of three, the operand is non-empty, `module:` carries a `#symbol`, and the path is
  repo-relative with forward slashes. Nothing is opened, nothing is registered, nothing is
  read. Endpoints are the six typed URIs, split by exactly the pointer's splitting rule and
  into two resolution tiers: `loop:`/`actor:` are resolved by the LOAD ITSELF against the
  DECLARED nodes (a miss is dangling, and the finding is the loader's own), and the four
  extra-registry schemes carry `resolved: null` and are never resolved here — that is
  milestone 55's, with the provenance this milestone has no writer to stamp. ADR-003 (the
  tier boundary), ADR-004 §3 (endpoints), ADR-008 (the `Endpoint` shape), ADR-011 §1 (the
  dangling finding is the loader's lane), §5 (the empty edge list), §11/D4 (`symbol`).

  Background:
    Given a "<work.dir>/loops/" directory of records

  Scenario: the three pointer schemes parse into scheme, operand and an optional symbol
    Given a record declaring "reference: [module:src/run-store.mjs#isRetryable, command:work:next, config:work.autonomous.maxAttempts]"
    When the loops directory is loaded
    Then the first entry parses as scheme "module", operand "src/run-store.mjs", symbol "isRetryable"
    And the second parses as scheme "command", operand "work:next", with no symbol
    And the third parses as scheme "config", operand "work.autonomous.maxAttempts", with no symbol
    And no finding is reported

  Scenario: the operand is everything after the FIRST colon
    Given a record declaring "actuator: [command:work:run-retry]"
    When the loops directory is loaded
    Then the entry's operand is "work:run-retry", colon and all
    And it is not truncated at the second colon

  Scenario: a module pointer without a symbol is a bad value
    Given a record declaring "reference: [module:src/run-store.mjs]"
    When the loops directory is loaded
    Then the load reports "loop-bad-value" at severity error, naming "reference"

  Scenario: a module pointer whose path is absolute is a bad value
    Given a record declaring "reference: [module:/src/run-store.mjs#isRetryable]"
    When the loops directory is loaded
    Then the load reports "loop-bad-value" at severity error

  Scenario: a module pointer whose path uses OS separators is a bad value
    Given a record declaring "reference: [module:src\run-store.mjs#isRetryable]"
    When the loops directory is loaded
    Then the load reports "loop-bad-value" at severity error
    And the path is not silently normalised to forward slashes

  Scenario: an unknown scheme is a bad value — there is deliberately no "doc:" pointer
    Given a record declaring "reference: [doc:src/bundle/commands/continue.md]"
    When the loops directory is loaded
    Then the load reports "loop-bad-value" at severity error
    And the entry is not admitted as a prose sentinel by another name

  Scenario: an endpoint scheme is not a pointer scheme
    Given a record declaring "reference: [item:52/00]"
    When the loops directory is loaded
    Then the load reports "loop-bad-value" at severity error
    And "item" remains an endpoint scheme only

  Scenario: the six endpoint schemes parse on every one of the five edge keys
    Given "run-resilience.md" declaring "data-feed: [loop:autonomous-cascade]", "monitoring: [item:52/00]", "veto: [command:work:doctor]", "parameter-tuning: [config:work.autonomous.maxAttempts]" and "target-setting: [module:src/run-store.mjs#shouldRetry]"
    And "autonomous-cascade.md" declaring "id: loop:autonomous-cascade"
    When the loops directory is loaded
    Then every endpoint parses into a raw, a scheme and an operand
    And each endpoint's raw is the string exactly as authored

  Scenario: a module endpoint splits its symbol by exactly the rule a module pointer uses
    Given "run-resilience.md" declaring "target-setting: [module:src/run-store.mjs#shouldRetry]" and "reference: [module:src/run-store.mjs#shouldRetry]"
    When the loops directory is loaded
    Then the endpoint parses as scheme "module", operand "src/run-store.mjs", symbol "shouldRetry"
    And the field entry's pointer splits into the same scheme, operand and symbol
    And neither carries the "#" in its operand
    And the endpoint's raw is still "module:src/run-store.mjs#shouldRetry", character for character

  Scenario: an endpoint with no "#" carries no symbol at all
    Given a record declaring "data-feed: [loop:autonomous-cascade]" and "monitoring: [item:52/00, command:work:doctor, config:work.autonomous.maxAttempts]"
    When the loops directory is loaded
    Then none of those four endpoints carries a symbol
    And "symbol" is absent from each of them — never present-and-empty, never null

  # The "#symbol" split is module's alone. Carrying "#run" silently into a command operand
  # would make a later resolution pass fail while naming the wrong defect — "no such command"
  # reported for what is in fact a malformed pointer.
  Scenario: a "#" anywhere outside a module pointer or endpoint is a bad value
    Given a record declaring "actuator: [command:work:doctor#run]" and "ceiling: [config:work.autonomous.maxAttempts#max]"
    And the same record declaring "monitoring: [item:52/00#anchor]" and "data-feed: [loop:autonomous-cascade#x]"
    When the loops directory is loaded
    Then "loop-bad-value" at severity error is reported for each of the four
    And no operand carries a "#", and none of the four carries a symbol
    And no "loop-graph-dangling-endpoint" is reported for "loop:autonomous-cascade#x" — a value rejected on grammar is never taken up as an endpoint to resolve

  # AND THAT RULE IS ABOUT SCHEMES, NOT ABOUT "#". "prose:" is a sentinel prefix carrying a
  # path, not a pointer scheme, so the module-only split never reaches it — and the anchor is
  # the whole point: a prose citation says WHICH paragraph, in a milestone whose honesty rests
  # on those citations being precise. Nothing here ever resolves a "prose:" value, so an anchor
  # can never redden a gate that reads one.
  Scenario: a "#" inside a "prose:" value is admitted, and the anchor is retained verbatim
    Given a "kind: loop" record declaring "measurement: [prose:src/bundle/commands/continue.md#retry-loop]"
    And a second record declaring "ceiling: [prose:src/bundle/commands/continue.md#retry-loop]"
    When the loops directory is loaded
    Then no "loop-bad-value" is reported for "measurement"
    And the entry has kind "prose", never "pointer"
    And its path is "src/bundle/commands/continue.md#retry-loop", character for character — the anchor is part of the payload, never split off as a symbol
    And the entry carries no symbol and no scheme — a sentinel is not a pointer, and the module-only "#" rule is a rule about pointers
    And the load reports "loop-field-prose-only" at severity warn, exactly as it does for the same citation with no anchor
    And the second record still reports "loop-bad-value" for "ceiling" — the anchor changes which keys admit a prose citation not at all

  Scenario: intra-registry endpoints resolve against the DECLARED nodes
    Given "run-resilience.md" declaring "data-feed: [loop:autonomous-cascade]"
    And "autonomous-cascade.md" declaring "id: loop:autonomous-cascade"
    And "operator.md" declaring "id: actor:operator"
    When the loops directory is loaded
    Then the "loop:autonomous-cascade" endpoint has resolved: true
    And an "actor:operator" endpoint declared anywhere has resolved: true

  Scenario: an intra-registry endpoint with no declaring record is dangling
    Given "run-resilience.md" declaring "data-feed: [loop:ghost]"
    And no record declaring "id: loop:ghost"
    When the loops directory is loaded
    Then the endpoint has resolved: false
    And the load reports "loop-graph-dangling-endpoint" at severity error
    And the finding is anchored at "run-resilience.md" — the file that declared the edge

  # Reference integrity belongs to the load, not to a later pass: the load is the only
  # thing that sees the whole directory, and `resolved` is part of what it hands on.
  Scenario: the dangling finding is the load's own — no structural check has to run for it to appear
    Given "run-resilience.md" declaring "data-feed: [loop:ghost]"
    And no record declaring "id: loop:ghost"
    When the loops directory is loaded
    Then the load's own findings carry "loop-graph-dangling-endpoint" at severity error
    And they carry it with no structural check having been invoked
    And a consumer that loads and never checks still sees the finding
    And every endpoint arrives already marked with its "resolved" value — nothing downstream re-derives it from the node list

  Scenario: resolution does not depend on the order the records are read
    Given "a-loop.md" declaring "data-feed: [loop:zeta]"
    And "zeta.md" declaring "id: loop:zeta"
    When the loops directory is loaded
    Then the "loop:zeta" endpoint has resolved: true
    And no "loop-graph-dangling-endpoint" is reported for it
    And the same is true when the two files are renamed so the declaring file is read last

  Scenario: resolution is by declared id, not by filename
    Given "operator.md" declaring "id: actor:operator"
    And "run-resilience.md" declaring "data-feed: [loop:operator]"
    When the loops directory is loaded
    Then the "loop:operator" endpoint has resolved: false
    And the load reports "loop-graph-dangling-endpoint" at severity error

  # Why a node whose kind the loader could not read is KEPT: an endpoint naming it must
  # still resolve, or one authoring slip would raise a dangling finding on every record that
  # names it — errors against files that did nothing wrong.
  Scenario: an endpoint naming a node whose kind is bad or missing still resolves
    Given "sensor.md" declaring "id: loop:sensor" and "kind: anchor"
    And "run-resilience.md" declaring "data-feed: [loop:sensor]"
    When the loops directory is loaded
    Then the "loop:sensor" endpoint has resolved: true
    And no "loop-graph-dangling-endpoint" is reported for it
    And "run-resilience.md" carries no finding at all caused by "sensor.md"'s unreadable kind

  Scenario: extra-registry endpoints carry resolved: null and are never resolved
    Given a record declaring "monitoring: [item:52/00, command:work:doctor, config:work.autonomous.maxAttempts, module:src/run-store.mjs#isStale]"
    When the loops directory is loaded
    Then all four endpoints have resolved: null
    And none of them has resolved: true or resolved: false
    And no "loop-graph-dangling-endpoint" is reported for any of them

  # Declaring a relation twice states the same fact twice: there is nothing for a reader to
  # act on, so the loader deduplicates and stays silent. That is what separates a repeat from
  # an empty list, which asserts nothing at all, and from a dropped line, which asserts
  # something the machine cannot see.
  Scenario: a repeated endpoint on one edge key is deduplicated in silence
    Given "run-resilience.md" declaring "monitoring: [loop:autonomous-cascade, loop:autonomous-cascade]"
    And "autonomous-cascade.md" declaring "id: loop:autonomous-cascade"
    When the loops directory is loaded
    Then the node's "monitoring" carries exactly one endpoint
    And no finding is reported for the repetition — not a bad value, not an empty list, and no code of its own
    And the model carries no second entry any consumer could count twice

  Scenario: a repeated SELF-referential endpoint leaves exactly one edge for a later check to see
    Given "a.md" declaring "id: loop:a" and "monitoring: [loop:a, loop:a]"
    When the loops directory is loaded
    Then the node's "monitoring" carries exactly one endpoint, resolving to the declaring node itself
    And the load reports no finding for it — a self-edge is the structural checks' to report, and there is exactly one for them to see

  # AND THE ASYMMETRY IS DELIBERATE. An edge is a RELATION: declaring it twice asserts one fact
  # twice, so set semantics apply and dedup is lossless. A field list is an ENUMERATION OF
  # DISTINCT AUTHORITIES, where multiplicity and order are the author's own statement — so
  # deduping one would silently rewrite a hand-authored record and make what a reader is shown
  # differ from what the file says. A repeat there is visible in the PR diff, which is the
  # review surface this store was chosen for.
  Scenario: a repeated entry in a FIELD list is kept, never deduplicated
    Given "run-resilience.md" declaring "actuator: [command:work:run-retry, command:work:run-retry]"
    When the loops directory is loaded
    Then the node's "actuator" carries exactly two entries, each classified on its own as kind "pointer"
    And neither entry is dropped, merged or reordered — the list reads back exactly as authored
    And no finding is reported for the repetition — not a bad value, not an empty list, and no code of its own
    And the same holds for a repeat in "reference", "measurement" or "ceiling"

  Scenario: dedup is the edge lane's rule alone, and one record shows both sides of it at once
    Given "a.md" declaring "id: loop:a", "actuator: [command:work:run-retry, command:work:run-retry]" and "monitoring: [loop:a, loop:a]"
    When the loops directory is loaded
    Then the node's "actuator" carries two entries and its "monitoring" carries exactly one endpoint
    And no finding is reported for either repetition
    And nothing in the load applies the edge lane's dedup to a field, or a field's multiplicity to an edge

  # An absent edge key is a fact — "no edges of that type". An empty list is a half-written
  # line, and the two must never look the same to a reader.
  Scenario: an edge key authored with an empty list is an error, and an absent edge key is not
    Given "a.md" declaring "monitoring: []"
    And "b.md" declaring no "monitoring" key at all
    When the loops directory is loaded
    Then "a.md" reports "loop-empty-list" at severity error, naming "monitoring"
    And "a.md" carries no "monitoring" entry any consumer could read as declared-and-empty
    And "b.md" reports no finding, and its edges carry no "monitoring" key at all

  Scenario: an empty list on any of the five edge keys is the same error
    Given a record declaring "data-feed: []", "target-setting: []", "monitoring: []", "veto: []" and "parameter-tuning: []"
    When the loops directory is loaded
    Then "loop-empty-list" is reported at severity error for each of the five, naming each key
    And the node loads carrying no edges at all

  # THE NEGATIVE THAT MATTERS MOST. 52 validates syntax; 55 owns resolution, staleness and
  # the provenance that makes a "no longer resolves" verdict defensible. Each scenario below
  # is a DIFFERENTIAL: the same records loaded against two different worlds must produce
  # identical output, which is what proves nothing outside <work.dir>/loops/ was consulted.
  Scenario: a module pointer naming a file that does not exist produces NO finding
    Given a record declaring "reference: [module:src/does-not-exist.mjs#nope]"
    When the loops directory is loaded
    Then the entry parses as scheme "module", operand "src/does-not-exist.mjs", symbol "nope"
    And no finding is reported for it
    And the load is byte-identical whether or not a file exists at that path

  Scenario: a module pointer naming a symbol that is not exported produces NO finding
    Given a record declaring "reference: [module:src/work.mjs#notExportedAnywhere]"
    When the loops directory is loaded
    Then the entry parses with symbol "notExportedAnywhere"
    And no finding is reported for it
    And the load is byte-identical whether or not that symbol is exported

  Scenario: an unregistered command id and an absent config key produce NO finding
    Given a record declaring "actuator: [command:work:no-such-verb]" and "ceiling: [config:no.such.key]"
    When the loops directory is loaded
    Then both entries parse into their scheme and operand
    And no finding is reported for either
    And the load is byte-identical whether or not that command is registered and that config key is set

  Scenario: an item endpoint naming no existing work item produces NO finding
    Given a record declaring "monitoring: [item:99/99]"
    When the loops directory is loaded
    Then the endpoint has resolved: null
    And no finding is reported for it
    And the load is byte-identical whether or not item 99/99 exists in the work stream

  # raw value -> parse x resolved x finding. `resolved` applies to endpoints on the five
  # edge keys; a pointer in a field (reference/measurement/actuator/ceiling) has no
  # `resolved` at all, shown as "—". An "edge list" row is the whole authored value of an
  # edge key, not one endpoint within it.
  Examples:
    | position       | raw value as authored                | parses as                                | resolved | finding                       |
    | field entry    | module:src/run-store.mjs#isRetryable | module / src/run-store.mjs / isRetryable | —        | (none)                        |
    | field entry    | command:work:next                    | command / work:next                      | —        | (none)                        |
    | field entry    | config:work.autonomous.maxAttempts   | config / work.autonomous.maxAttempts     | —        | (none)                        |
    | field entry    | module:src/does-not-exist.mjs#nope   | module / src/does-not-exist.mjs / nope   | —        | (none — never opened)         |
    | field entry    | module:src/work.mjs#notExported      | module / src/work.mjs / notExported      | —        | (none — never opened)         |
    | field entry    | command:work:no-such-verb            | command / work:no-such-verb              | —        | (none — never registered)     |
    | field entry    | config:no.such.key                   | config / no.such.key                     | —        | (none — never read)           |
    | field entry    | module:src/run-store.mjs             | rejected — no #symbol                    | —        | loop-bad-value                |
    | field entry    | module:src/run-store.mjs#            | rejected — empty symbol                  | —        | loop-bad-value                |
    | field entry    | module:#isRetryable                  | rejected — empty operand                 | —        | loop-bad-value                |
    | field entry    | module:/src/run-store.mjs#x          | rejected — absolute path                 | —        | loop-bad-value                |
    | field entry    | module:C:/src/run-store.mjs#x        | rejected — absolute path                 | —        | loop-bad-value                |
    | field entry    | module:src\run-store.mjs#x           | rejected — OS separator                  | —        | loop-bad-value                |
    | field entry    | command:                             | rejected — empty operand                 | —        | loop-bad-value                |
    | field entry    | config:                              | rejected — empty operand                 | —        | loop-bad-value                |
    | field entry    | doc:src/bundle/commands/continue.md  | rejected — unknown scheme                | —        | loop-bad-value                |
    | field entry    | item:52/00                           | rejected — not a pointer scheme          | —        | loop-bad-value                |
    | field entry    | command:work:doctor#run              | rejected — "#" outside module:           | —        | loop-bad-value                |
    | field entry    | config:work.autonomous.max#m         | rejected — "#" outside module:           | —        | loop-bad-value                |
    | edge endpoint  | loop:autonomous-cascade (declared)   | loop / autonomous-cascade                | true     | (none)                        |
    | edge endpoint  | actor:operator (declared)            | actor / operator                         | true     | (none)                        |
    | edge endpoint  | loop:ghost (undeclared)              | loop / ghost                             | false    | loop-graph-dangling-endpoint  |
    | edge endpoint  | actor:ghost (undeclared)             | actor / ghost                            | false    | loop-graph-dangling-endpoint  |
    | edge endpoint  | loop:sensor (kind unreadable)        | loop / sensor                            | true     | (none)                        |
    | edge endpoint  | item:52/00                           | item / 52/00                             | null     | (none)                        |
    | edge endpoint  | item:99/99 (no such item)            | item / 99/99                             | null     | (none)                        |
    | edge endpoint  | command:work:doctor                  | command / work:doctor                    | null     | (none)                        |
    | edge endpoint  | config:work.autonomous.maxAttempts   | config / work.autonomous.maxAttempts     | null     | (none)                        |
    | edge endpoint  | module:src/run-store.mjs#isStale     | module / src/run-store.mjs / isStale     | null     | (none)                        |
    | edge endpoint  | module:src/run-store.mjs             | rejected — no #symbol                    | —        | loop-bad-value                |
    | edge endpoint  | node:autonomous-cascade              | rejected — unknown scheme                | —        | loop-bad-value                |
    | edge endpoint  | autonomous-cascade                   | rejected — no scheme                     | —        | loop-bad-value                |
    | edge endpoint  | loop:autonomous-cascade#x            | rejected — "#" outside module:           | —        | loop-bad-value                |
    | edge endpoint  | item:52/00#anchor                    | rejected — "#" outside module:           | —        | loop-bad-value                |
    | edge endpoint  | command:work:doctor#run              | rejected — "#" outside module:           | —        | loop-bad-value                |
    | edge list      | [loop:autonomous-cascade] (declared) | one endpoint on that key                 | true     | (none)                        |
    | edge list      | [loop:a, loop:a] (declared)          | one endpoint — deduplicated              | true     | (none — one fact twice)       |
    | edge list      | [loop:a, loop:a] (a declares it)     | one SELF-edge — deduplicated             | true     | (none — the checks' to see)   |
    | edge list      | []                                   | rejected — empty list                    | —        | loop-empty-list               |
    | edge list      | (the key is absent)                  | no such key in the model                 | —        | (none)                        |
    | field list     | [command:a, command:a]               | two entries — never deduplicated         | —        | (none — two authorities)      |
