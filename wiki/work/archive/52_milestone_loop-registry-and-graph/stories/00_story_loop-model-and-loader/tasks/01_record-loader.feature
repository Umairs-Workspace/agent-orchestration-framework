@executable @cli @work @work-stream
Feature: The record loader and the node model — one node per file, absence reported honestly

  The loader reads `<work.dir>/loops/*.md` and produces a plain-data model: one node per
  record file, each carrying `id`, `kind`, `title`, its fields, its edges and its `path`.
  A missing directory is a fact, not an error. A record that cannot be parsed is a finding,
  not an exception, and it never stops its siblings loading. The handoff is frozen —
  `{source, present, nodes, findings}`, every path a raw absolute — because it is the one
  artifact the structural checks consume. ADR-001 (the non-item store, read with
  `parseFrontmatter` and nothing else), ADR-002 (the required keys and the never-coerce
  rule), ADR-008 (`source` / `present` / `nodes`), ADR-011 §7 (the frozen model), §5 (the
  empty list and the scalar/list mirror), §11/D5 (`Node.path` is a raw absolute).

  Background:
    Given a workspace whose work directory is "<work.dir>"

  Scenario: a directory of records loads to one node per file
    Given a "<work.dir>/loops/" directory containing "run-resilience.md", "autonomous-cascade.md" and "operator.md"
    When the loops directory is loaded
    Then the load reports present: true
    And it carries exactly three nodes
    And each node's id is the one its own file declared

  Scenario: an absent loops directory is present:false with zero nodes and no finding
    Given no "<work.dir>/loops/" directory
    When the loops directory is loaded
    Then the load reports present: false
    And it carries zero nodes
    And it reports zero findings
    And it does not throw

  Scenario: an EMPTY loops directory is present:true with zero nodes — absence and emptiness are different facts
    Given a "<work.dir>/loops/" directory containing no files
    When the loops directory is loaded
    Then the load reports present: true
    And it carries zero nodes
    And it reports zero findings

  Scenario: source is the raw absolute loops directory whether or not it exists
    When the loops directory is loaded with the directory present
    Then source is the absolute "<work.dir>/loops" path in its on-disk OS-native form
    And source is never relativised by the loader
    When the loops directory is loaded with the directory absent
    Then source is still that same absolute path

  # The handoff to the structural checks. It is the one artifact this story produces and
  # the next one consumes, so its shape is asserted here rather than discovered at
  # integration.
  Scenario: the loaded model is exactly source, present, nodes and findings
    Given a "<work.dir>/loops/" directory of records producing findings of both severities
    When the loops directory is loaded
    Then the model's key set is exactly "source", "present", "nodes", "findings"
    And it carries no fifth key and omits none of the four
    And "findings" carries the load's own findings — schema, reference integrity and honesty
    And every value survives a round trip through JSON unchanged — no map, no class, no live handle

  Scenario: nodes arrive sorted by id, deterministically
    Given a "<work.dir>/loops/" directory containing "zeta.md", "autonomous-cascade.md" and "operator.md"
    When the loops directory is loaded
    Then the nodes are ordered by their declared id, lexicographically
    And the order is identical on a second load in the same process and in a fresh process
    And it does not vary with the order the directory lists its files

  # "Lexicographically" means CODE UNITS. nodes[] is the array every consumer walks and the
  # spine the findings lane is ordered on, so an order that depended on the host's locale would
  # make one machine's report differ from another's with both calling themselves conforming.
  Scenario: the id sort is on code units, never on a locale-aware collation
    Given a "<work.dir>/loops/" directory containing "Zeta.md", "runbook.md" and "run-store.md"
    When the loops directory is loaded
    Then the nodes arrive as "loop:Zeta", "loop:run-store", "loop:runbook"
    And "loop:Zeta" leads because "Z" precedes "r" by code unit — not last, where a case-folding collation would put it
    And "loop:run-store" precedes "loop:runbook" because "-" precedes "b" by code unit, whatever weight a collation gives punctuation
    And the order is unchanged under a different host locale, language or platform collation data

  Scenario: a node is exactly id, kind, title, path, fields and edges
    Given "run-resilience.md" declaring every required key and one "monitoring:" edge
    When the loops directory is loaded
    Then the node's key set is exactly "id", "kind", "title", "path", "fields", "edges"
    And "id", "kind" and "title" are readable on the node itself, and appear in no entry of "fields"
    And "edges" carries only the edge keys the record declared
    And an edge key the record did not declare is absent from "edges" — never present as an empty list

  Scenario: id must equal the scheme joined to the filename stem
    Given "run-resilience.md" declaring "kind: loop" and "id: loop:run-resilience"
    When the loops directory is loaded
    Then the node loads with no id finding
    And the node's id is "loop:run-resilience"

  Scenario: an id that does not match the filename stem is a mismatch
    Given "run-resilience.md" declaring "kind: loop" and "id: loop:run-resiliance"
    When the loops directory is loaded
    Then the load reports "loop-id-mismatch" at severity error, anchored at "run-resilience.md"

  Scenario: an id whose scheme disagrees with its kind is a mismatch
    Given "operator.md" declaring "kind: actor" and "id: loop:operator"
    When the loops directory is loaded
    Then the load reports "loop-id-mismatch" at severity error

  Scenario: a file that is not ".md" is ignored — no node, no finding
    Given a "<work.dir>/loops/" directory containing "run-resilience.md" and "notes.txt"
    When the loops directory is loaded
    Then it carries exactly one node
    And no finding names "notes.txt"

  Scenario: a subdirectory inside loops/ is not descended
    Given a "<work.dir>/loops/" directory containing "run-resilience.md" and a subdirectory "archive/" holding "old-loop.md"
    When the loops directory is loaded
    Then it carries exactly one node
    And no node's id is "loop:old-loop"
    And no finding names "old-loop.md"

  Scenario: a record with no frontmatter block is unparseable
    Given "README.md" whose content is prose with no "---" block
    When the loops directory is loaded
    Then the load reports "loop-record-unparseable" at severity error, anchored at "README.md"
    And no node is produced for that file

  Scenario: a frontmatter block that does not start at the first line is unparseable
    Given "draft.md" whose "---" block is preceded by a blank line
    When the loops directory is loaded
    Then the load reports "loop-record-unparseable" at severity error, anchored at "draft.md"
    And no node is produced for that file

  Scenario: an unparseable record does not stop its siblings loading
    Given a "<work.dir>/loops/" directory containing a valid "run-resilience.md" and an unparseable "draft.md"
    When the loops directory is loaded
    Then it carries exactly one node, for "run-resilience.md"
    And the load reports exactly one "loop-record-unparseable"

  Scenario: nodes carry path as a raw absolute, never relativised
    Given "run-resilience.md" in the loops directory
    When the loops directory is loaded
    Then the node's path is absolute
    And it is the OS-native join of source and "run-resilience.md"
    And it is not relative to the work directory, the repo root or the cwd
    And the same absolute path is what every consumer of the model receives — nothing inside the load projects it onto a face

  Scenario: the loader normalises no separator — the absolute node path and a forward-slashed operand coexist
    Given "run-resilience.md" declaring "reference: [module:src/run-store.mjs#isRetryable]"
    When the loops directory is loaded
    Then the node's path uses the running platform's own separator
    And the pointer's operand is still exactly "src/run-store.mjs", forward-slashed as authored

  Scenario: a required key absent on a loop node is a missing field
    Given "run-resilience.md" declaring "kind: loop" with no "owner" key
    When the loops directory is loaded
    Then the load reports "loop-missing-field" at severity error, naming "owner"
    And the node still loads

  # A node whose kind is missing is KEPT, carrying kind null, for the reason a node with an
  # unreadable kind is: dropping it would turn every endpoint that names it into a dangling
  # finding against records that did nothing wrong.
  Scenario: a record with no "kind" key is a missing field, and the node is kept carrying kind null
    Given "run-resilience.md" declaring "id: loop:run-resilience" and "title: Run resilience" with no "kind" key
    When the loops directory is loaded
    Then the load reports "loop-missing-field" at severity error, naming "kind"
    And the node is carried in the model, never dropped
    And its kind is null — neither "loop" nor "actor", and never defaulted to either
    And an endpoint declared elsewhere as "loop:run-resilience" still resolves to it

  # AN UNUSABLE KIND SUSPENDS EVERY KIND-DERIVED CHECK. Which keys a record must carry, and
  # which scheme its id must use, are both read OFF the kind — so with no usable kind there is
  # nothing to read them off, and checking them anyway would manufacture six findings from one
  # typo and guess which kind the author meant. The kind-INDEPENDENT checks still run:
  # admission against the union, the id STEM leg, shape, non-empty and grammar.
  Scenario: a record typo'd to an unadmitted kind reports its kind, and nothing derived from it
    Given "operator.md" declaring "id: actor:operator", "kind: anchor", "title: The operator" and "ground: exogenous", with no "owner" key
    When the loops directory is loaded
    Then the load reports "loop-bad-value" at severity error, naming "kind"
    And that is the only finding for that record — one slip, one finding, never six
    And no "loop-missing-field" is reported for "controlled", "reference", "measurement", "actuator", "cadence", "ceiling", "owner" or "optimizing"
    And nothing in the load defaults the record to "loop" in order to decide what it was required to carry
    And the node still loads carrying kind null

  Scenario: an unusable kind suspends the id's SCHEME leg and leaves its STEM leg running
    Given "sensor.md" declaring "id: loop:sensor" and "kind: anchor"
    And "gauge.md" declaring "id: loop:guage" and "kind: anchor"
    When the loops directory is loaded
    Then "sensor.md" reports "loop-bad-value" naming "kind" and no "loop-id-mismatch" — there is no readable kind for a scheme to disagree with
    And "gauge.md" reports "loop-id-mismatch" at severity error as well — the stem leg reads the filename, not the kind
    And neither node carries a second finding raised by the unreadable kind itself

  Scenario: a node with no kind at all still gets every kind-INDEPENDENT check
    Given "a-loop.md" declaring "id: loop:a-loop" and "title: A loop" with no "kind" key, and carrying "status: draft", "reference: module:a.mjs#b", "actuator: []" and "cadence: hourly"
    When the loops directory is loaded
    Then the load reports "loop-missing-field" naming "kind" — the one finding for the slip itself
    And it reports "loop-unknown-key" for "status" — admission against the union needs no kind
    And it reports "loop-expected-list" for "reference" — shape comes from the key, never from the kind
    And it reports "loop-empty-list" for "actuator"
    And it reports "loop-bad-value" for "cadence" — grammar needs no kind
    And it reports "loop-missing-field" for no key other than "kind"
    And it reports no "loop-key-not-admitted-for-kind" anywhere on that node
    And it reports no "loop-id-mismatch" — the stem leg passes, and the scheme leg is suspended

  Scenario: absence and a declared gap are never the same thing
    Given "a.md" declaring "kind: loop" with no "owner" key
    And "b.md" declaring "kind: loop" and "owner: unknown"
    When the loops directory is loaded
    Then "a.md" reports "loop-missing-field" at severity error
    And "b.md" reports "loop-owner-unknown" at severity warn
    And "b.md" reports no "loop-missing-field" for "owner"

  Scenario: an actor node needs only id, kind and title
    Given "operator.md" declaring "id: actor:operator", "kind: actor", "title: The operator" and "ground: exogenous"
    When the loops directory is loaded
    Then the node loads with zero error-severity findings
    And no "loop-missing-field" is reported for "controlled", "cadence", "ceiling", "owner" or "optimizing"

  Scenario: a list field authored as a bare scalar is an error and is NEVER coerced
    Given "run-resilience.md" declaring "reference: module:src/run-store.mjs#isRetryable"
    When the loops directory is loaded
    Then the load reports "loop-expected-list" at severity error, naming "reference"
    And the node's "reference" is not silently wrapped into a one-entry list

  # ONE AUTHORING SLIP, ONE FINDING. The indented lines are continuations of "reference",
  # not lines of their own: they are never re-scanned and never independently reported.
  Scenario: a list authored as a YAML block list is seen as a bare scalar — the grammar admits no block lists
    Given "run-resilience.md" whose "reference:" key is followed by indented "- module:src/run-store.mjs#isRetryable" lines
    When the loops directory is loaded
    Then the load reports exactly one "loop-expected-list" at severity error, naming "reference"
    And it reports zero "loop-malformed-frontmatter-line" — no indented line is reported on its own
    And the block list produces no second finding of any code
    And no entry from the indented lines appears anywhere in the node

  Scenario: a list field authored with an empty value is an error
    Given "run-resilience.md" declaring "actuator:" with nothing after the colon
    When the loops directory is loaded
    Then the load reports "loop-expected-list" at severity error, naming "actuator"

  Scenario: a scalar field authored as a list is an error and is NEVER collapsed
    Given "run-resilience.md" declaring "controlled: [run state reaching a terminal value, attempt count]"
    When the loops directory is loaded
    Then the load reports "loop-expected-scalar" at severity error, naming "controlled"
    And the node's "controlled" is not silently collapsed to its first entry
    And the same holds for "cadence", "owner" and "optimizing", and for "ground" on an actor node

  Scenario: a one-entry list where a scalar belongs is still an error
    Given "run-resilience.md" declaring "owner: [actor:product-owner]"
    When the loops directory is loaded
    Then the load reports "loop-expected-scalar" at severity error, naming "owner"
    And the node's "owner" is not unwrapped to the single entry

  # An empty inline list is a half-written line, not "nothing to declare" — the honest way
  # to say nothing is to omit the key (edges) or to declare a sentinel (ceiling).
  Scenario: an empty inline list is an error, and it is not the same error as a value that is no list at all
    Given "a.md" declaring "reference: []"
    And "b.md" declaring "reference:" with nothing after the colon
    When the loops directory is loaded
    Then "a.md" reports "loop-empty-list" at severity error, naming "reference"
    And "b.md" reports "loop-expected-list" at severity error, naming "reference"
    And neither node carries a "reference" any consumer could read as declared-and-satisfied

  Scenario: an empty machinery list is never a way to declare a loop with no machinery
    Given a "kind: loop" record declaring "reference: []", "measurement: []", "actuator: []" and "ceiling: []"
    When the loops directory is loaded
    Then "loop-empty-list" is reported at severity error for each of the four, naming each key
    And the node carries no entry under any of the four
    And no honesty-lane warn is reported in place of any of them

  # filename x kind x declared id -> outcome. Every row is one record file, otherwise valid.
  Examples:
    | filename                   | kind  | declared id                    | outcome                             |
    | run-resilience.md          | loop  | loop:run-resilience            | node loads, no id finding           |
    | mesh-assignment-reclaim.md | loop  | loop:mesh-assignment-reclaim   | node loads, no id finding           |
    | operator.md                | actor | actor:operator                 | node loads, no id finding           |
    | run-resilience.md          | loop  | loop:run-resiliance            | loop-id-mismatch (stem disagrees)   |
    | run-resilience.md          | loop  | run-resilience                 | loop-id-mismatch (no scheme)        |
    | run-resilience.md          | loop  | actor:run-resilience           | loop-id-mismatch (scheme disagrees) |
    | operator.md                | actor | loop:operator                  | loop-id-mismatch (scheme disagrees) |
    | run-resilience.md          | loop  | (key absent)                   | loop-missing-field naming "id"      |
    | run-resilience.md          | —     | loop:run-resilience            | loop-missing-field naming "kind"    |
    | notes.txt                  | n/a   | n/a                            | ignored — no node, no finding       |
    | archive/ (a directory)     | n/a   | n/a                            | ignored — not descended, no finding |
    | README.md                  | n/a   | (no --- block)                 | loop-record-unparseable, no node    |
    | draft.md                   | n/a   | (--- block after a blank line) | loop-record-unparseable, no node    |

  # key shape x value shape -> outcome. Every row is one otherwise-valid record; the shape
  # a key expects comes from the frozen schema, never from the value it was handed. Per key
  # evaluation stops at the FIRST gate that fails, so the "[]" row under "scalar" is
  # loop-expected-scalar and nothing else — the non-empty gate is never reached.
  Examples:
    | key expects | value as authored                        | outcome              |
    | list        | [module:src/run-store.mjs#isRetryable]   | loads as a list      |
    | list        | module:src/run-store.mjs#isRetryable     | loop-expected-list   |
    | list        | (empty after the colon)                  | loop-expected-list   |
    | list        | (indented "- " block lines)              | loop-expected-list   |
    | list        | []                                       | loop-empty-list      |
    | edge list   | [loop:autonomous-cascade]                | loads as one edge    |
    | edge list   | []                                       | loop-empty-list      |
    | edge list   | (key absent)                             | no edge key, no finding |
    | scalar      | actor:product-owner                      | loads as one field   |
    | scalar      | [actor:product-owner]                    | loop-expected-scalar |
    | scalar      | [run state, attempt count]               | loop-expected-scalar |
    | scalar      | []                                       | loop-expected-scalar |

  # unusable kind x the rest of the record -> what the load reports. Each row is one record.
  # The kind finding is always exactly ONE; the middle column is what SURVIVES suspension, and
  # the right column is the kind-DERIVED finding a reader might expect beside it and must
  # never see.
  Examples:
    | record as authored                                 | reported                                    | never also reported                    |
    | kind: anchor, with no "owner" key                  | loop-bad-value naming "kind"                | loop-missing-field for any control key |
    | (no "kind" key), with no "owner" key               | loop-missing-field naming "kind"            | loop-missing-field for any control key |
    | kind: anchor, in "sensor.md", id: loop:sensor      | loop-bad-value naming "kind"                | loop-id-mismatch — the scheme leg      |
    | kind: anchor, in "sensor.md", id: loop:sensr       | loop-bad-value, and loop-id-mismatch        | (nothing — the stem leg is kind-free)  |
    | kind: anchor, carrying "ground: exogenous"         | loop-bad-value naming "kind"                | loop-key-not-admitted-for-kind         |
    | kind: anchor, carrying "cadence: periodic:15s"     | loop-bad-value naming "kind"                | loop-key-not-admitted-for-kind         |
    | kind: anchor, carrying "status: draft"             | loop-bad-value, and loop-unknown-key        | (nothing — the union needs no kind)    |
    | kind: anchor, carrying "reference: module:a.mjs#b" | loop-bad-value, and loop-expected-list      | (nothing — shape comes from the key)   |
    | kind: anchor, carrying "actuator: []"              | loop-bad-value, and loop-empty-list         | (nothing — non-empty needs no kind)    |
    | kind: anchor, carrying "cadence: hourly"           | loop-bad-value for "kind" and for "cadence" | (nothing — grammar needs no kind)      |
