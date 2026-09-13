@executable @cli @work @validate
Feature: Schema and honesty findings — two severities, one envelope, nothing enforced

  The loader reports; it never enforces. A schema violation — a missing required key, a bad
  value, a scalar where a list belongs, a list where a scalar belongs, an empty list, an
  unknown key, a key admitted only for the other kind, a frontmatter line that never became
  a key, an id/filename mismatch, an unparseable record — and a dangling intra-registry
  endpoint are all `severity: error`. A DECLARED gap — `owner: unknown`, `cadence: unknown`,
  `ceiling: unknown`, `ceiling: uncapped`, a prose-only field — is `severity: warn`: a claim
  a human made and a reviewer saw, never a blocker and never silently equal to a filled
  field. Every finding is exactly `{code, severity, path, message}` with `path` a raw
  absolute, and every code is a member of the LOADER's own frozen set — schema, reference
  integrity, honesty — never a structural check's. ADR-002 (validate's treatment), ADR-007
  §1–2 (the envelope), ADR-011 §1 (the lane-scoped code set), §6 (`loop-ceiling-unknown`).

  Background:
    Given a "<work.dir>/loops/" directory of records

  Scenario: schema and reference-integrity violations are reported at severity error
    Given records violating each schema rule in turn
    When the loops directory is loaded
    Then "loop-record-unparseable", "loop-missing-field", "loop-bad-value", "loop-expected-list", "loop-expected-scalar", "loop-empty-list", "loop-unknown-key", "loop-key-not-admitted-for-kind", "loop-malformed-frontmatter-line", "loop-id-mismatch" and "loop-graph-dangling-endpoint" are each reported at severity error
    And none of them is ever reported at severity warn

  Scenario: declared gaps are reported at severity warn
    Given a record declaring "owner: unknown", "cadence: unknown", "ceiling: unknown" and a prose-only "measurement"
    And a second record declaring "ceiling: uncapped"
    When the loops directory is loaded
    Then "loop-owner-unknown", "loop-cadence-unknown", "loop-ceiling-unknown", "loop-ceiling-uncapped" and "loop-field-prose-only" are each reported at severity warn
    And none of them is ever reported at severity error

  Scenario: a declared gap never blocks
    Given a directory of records whose only findings are the five honesty-lane warns
    When the loops directory is loaded
    Then every record still loads as a node
    And no error-severity finding is reported
    And the load does not throw, abort or omit a node on account of a warn

  Scenario: a declared gap is never silently equal to a filled field
    Given "filled.md" declaring "owner: actor:product-owner" and "ceiling: [config:work.autonomous.maxAttempts]"
    And "gapped.md" declaring "owner: unknown" and "ceiling: uncapped"
    When the loops directory is loaded
    Then "gapped.md" carries a warn naming each declared gap
    And "filled.md" carries no honesty-lane finding at all
    And the two nodes' fields differ in kind, so the difference survives into the model as well as into the findings

  Scenario: every finding is exactly the four-key envelope
    Given a directory engineered to produce findings of both severities
    When the loops directory is loaded
    Then every finding's key set is exactly "code", "severity", "path", "message"
    And no finding carries a fifth key
    And no finding omits one of the four
    And every "severity" is either "warn" or "error", and nothing else

  Scenario: every finding path is a raw absolute, never relativised
    Given a record producing a finding
    When the loops directory is loaded
    Then the finding's path is absolute
    And it is in its on-disk OS-native form
    And it has not been made relative to the work directory, the repo root or the cwd

  Scenario: a per-node finding is anchored at the node's own file
    Given "a.md" declaring "owner: unknown" and "b.md" declaring "owner: unknown"
    When the loops directory is loaded
    Then one warn is anchored at the absolute path of "a.md"
    And the other at the absolute path of "b.md"
    And neither is anchored at the loops directory

  Scenario: every emitted code is a member of the loader's frozen set
    Given any directory of records, valid or invalid
    When the loops directory is loaded
    Then every emitted code is one of "loop-record-unparseable", "loop-missing-field", "loop-bad-value", "loop-expected-list", "loop-expected-scalar", "loop-empty-list", "loop-unknown-key", "loop-key-not-admitted-for-kind", "loop-malformed-frontmatter-line", "loop-id-mismatch", "loop-graph-dangling-endpoint", "loop-owner-unknown", "loop-cadence-unknown", "loop-ceiling-unknown", "loop-ceiling-uncapped" or "loop-field-prose-only"
    And no other code is ever emitted
    And no structural-check code — "loop-graph-ungrounded-component", "loop-unpaired-optimizer", "loop-self-referential-edge" or any of their siblings — is ever emitted by a load

  # An unreachable code is as much a defect as an unfrozen one.
  Scenario: every code the loader may emit is reachable
    Given a directory of records engineered to trip each of the sixteen codes at least once
    When the loops directory is loaded
    Then all sixteen codes appear in the findings
    And the union of emitted codes equals the loader's permitted set exactly

  # Reference integrity is reported by the load itself, alongside schema and honesty — a
  # consumer that only loads sees all three lanes and needs no check to have run.
  Scenario: the load's own findings carry all three of its lanes
    Given "run-resilience.md" declaring "data-feed: [loop:ghost]", "owner: unknown" and "status: draft"
    And no record declaring "id: loop:ghost"
    When the loops directory is loaded
    Then the load's findings carry "loop-unknown-key", "loop-graph-dangling-endpoint" and "loop-owner-unknown"
    And no structural check has been run to produce any of the three
    And all three arrive with the model, not from a later pass

  # THE ONE-SLIP-ONE-FINDING RULE. Per key, evaluation stops at the FIRST gate that fails
  # and emits exactly that one finding: admitted at all -> admitted for this kind -> shape ->
  # non-empty -> grammar. A reader counting findings is counting authoring slips, not gates.
  Scenario: a key that fails a gate is reported once, and the gates behind it are never reached
    Given "a.md" declaring "controlled: []"
    And "b.md" declaring "kind: loop" and "ground: []"
    And "c.md" declaring "status: []"
    And "d.md" declaring "reference: module:a.mjs#b"
    When the loops directory is loaded
    Then "a.md" reports "loop-expected-scalar" for "controlled" and no "loop-empty-list"
    And "b.md" reports "loop-key-not-admitted-for-kind" for "ground" and no "loop-expected-scalar", no "loop-empty-list" and no "loop-bad-value"
    And "c.md" reports "loop-unknown-key" for "status" and no shape, empty-list or bad-value finding for it
    And "d.md" reports "loop-expected-list" for "reference" and no "loop-bad-value"
    And no key anywhere in the load carries two schema-lane findings

  # Six independent slips on one record. The kind is valid here on purpose, so every
  # assertion below turns on exactly one rule.
  Scenario: one record with several violations reports one finding per violation
    Given a "kind: loop" record declaring "cadence: hourly", "reference: module:a.mjs#b", "status: draft", "controlled: [a, b]", "actuator: []" and no "owner" key
    When the loops directory is loaded
    Then "loop-bad-value" is reported for "cadence"
    And "loop-expected-list" is reported for "reference"
    And "loop-unknown-key" is reported for "status"
    And "loop-expected-scalar" is reported for "controlled"
    And "loop-empty-list" is reported for "actuator"
    And "loop-missing-field" is reported for "owner"
    And each of the six keys carries exactly one finding
    And the load does not stop at the first violation

  Scenario: findings are deterministic across runs
    Given a fixed directory of records
    When the loops directory is loaded twice in the same process
    Then the two findings lists are byte-identical, in the same order
    When the same directory is loaded again in a fresh process
    Then that findings list is byte-identical to the first two

  # Order is part of the contract, not an accident of the directory walk: a consumer diffing
  # two loads is diffing content, never sequence. This story fixes the LOADER lane's order;
  # placing that lane in front of the structural checks' is the command's to compose.
  Scenario: the loader's findings arrive in a frozen order — by node id, then by schema key order
    Given "a-loop.md" and "z-loop.md" each declaring an unknown key and a bad value
    When the loops directory is loaded
    Then every finding anchored at "a-loop.md" precedes every finding anchored at "z-loop.md"
    And within one node the findings follow the frozen schema's key order — the identity keys, then the control keys, then the edge keys
    And two findings on one key — one per dangling endpoint of a single edge key — keep the order in which the load emitted them
    And the order does not vary with the order the directory lists its files, in this process or a fresh one

  # THE TWO PLACELESS FINDINGS. The rule above orders findings by node id and then by schema
  # key order — but two of the sixteen codes have neither coordinate. "loop-record-unparseable"
  # names a file that produced no node, so it has no id; "loop-malformed-frontmatter-line"
  # names a line that became no key, so it has no key-order position. Both are present in the
  # every-code fixture above, so without a rule for each, two conforming loaders emit the same
  # findings in a different order and the byte-identity asserted here cannot hold.
  Scenario: an unparseable record's finding comes first in the whole lane, ordered by path
    Given an otherwise valid "alpha.md" carrying the unknown key "status: draft"
    And "README.md" whose content is prose with no "---" block
    And "draft.md" whose "---" block is preceded by a blank line
    When the loops directory is loaded
    Then both "loop-record-unparseable" findings precede every other finding of the load
    And the two are ordered by their own path — "README.md" before "draft.md"
    And neither sits inside any node's findings — a file that produced no node has no id to be ordered by
    And "alpha.md"'s own finding follows both, though its path sorts between them — the unparseable lane is prior to node ordering, never merged into it

  Scenario: a malformed frontmatter line precedes its own node's key-bearing findings, by line number
    Given an otherwise valid "kind: loop" record "a-loop.md" carrying "target setting: [loop:x]" on line 4, "controlled: [a, b]" on line 5, "veto/constraint: [loop:y]" on line 6 and "cadence: hourly" on line 7
    And "z-loop.md" carrying the top-level line "owner actor:product-owner"
    When the loops directory is loaded
    Then "a-loop.md"'s two "loop-malformed-frontmatter-line" findings precede every key-bearing finding of that node
    And the two are ordered by line number — the line-4 finding before the line-6 one
    And the line-6 finding still precedes the "controlled" finding whose key was declared on line 5 — line order governs within the malformed-line block, never across it
    And the key-bearing findings then follow in the frozen schema's key order — "controlled" before "cadence"
    And "z-loop.md"'s malformed-line finding stays inside "z-loop.md"'s own block, never at the front of the lane beside an unparseable record's

  # Within one key the order is the order the entries were AUTHORED — the only order a reader
  # can check against the file in front of them. It is stable precisely because a field list is
  # never deduplicated and never reordered.
  Scenario: within one key, the findings follow the order the offending entries were declared
    Given "a.md" declaring "reference: [module:src/run-store.mjs, doc:src/x.md, item:52/00]"
    When the loops directory is loaded
    Then three "loop-bad-value" findings are reported for "reference"
    And they arrive in the authored order — the "module:" entry, then the "doc:" entry, then the "item:" entry
    And they are not ordered by their raw text, which would put the "doc:" entry first
    And that order is identical on a second load and in a fresh process

  # DETERMINISM'S LAST LEG. Every comparison that fixes this order is on code units — never a
  # locale-aware collation, whose treatment of case and of "-" varies with the locale and with
  # the platform's own collation data. A lane that sorts one way here and another way on the
  # next machine is the worst failure this gate can have, because both runs look green.
  Scenario: every comparison that fixes the order is code-unit lexicographic
    Given "README.md" and "draft.md", both unparseable
    And an otherwise valid "run-store.md" declaring "id: loop:run-store" and carrying an unknown key
    And an otherwise valid "runbook.md" declaring "id: loop:runbook" and carrying an unknown key
    When the loops directory is loaded
    Then the two unparseable findings are ordered "README.md" then "draft.md" — "R" precedes "d" by code unit, where a collation folds the case and puts "draft.md" first
    And the two nodes' blocks are ordered "loop:run-store" then "loop:runbook" — "-" precedes "b" by code unit, whatever weight a collation gives punctuation
    And no comparison anywhere in the load is made by a locale-aware collation
    And the whole findings list is byte-identical under a different host locale, language or platform collation data

  # THE TOTAL ORDER, rank by rank — one code at rank 1, one at rank 2, the other fourteen at
  # rank 3. Every code the loader may emit therefore has a defined position, which is what
  # makes the every-code fixture above orderable and its report reproducible byte for byte.
  Examples:
    | rank | what is emitted at this rank                                    | ordered within the rank by                               |
    | 1    | every "loop-record-unparseable" in the load                     | path, code unit by code unit                             |
    | 2    | then per node in id order — that node's malformed-line findings | line number, ascending                                   |
    | 3    | then that same node's key-bearing findings                      | schema key order, then declared-entry order within a key |
    | —    | the five structural checks' findings                            | not this lane — the command composes them after it       |

  Scenario: a finding never varies with wall-clock time
    Given a fixed directory of records
    When the loops directory is loaded at two different wall-clock times
    Then the two findings lists are byte-identical
    And no finding carries a timestamp, a duration or a run identifier

  # record content -> code x severity. Each row is one record, otherwise valid.
  Examples:
    | record content                                       | code                            | severity |
    | prose with no "---" block                            | loop-record-unparseable         | error    |
    | kind: loop with no "owner" key                       | loop-missing-field              | error    |
    | kind: loop with no "title" key                       | loop-missing-field              | error    |
    | kind: sensor                                         | loop-bad-value                  | error    |
    | cadence: event:per-sprint                            | loop-bad-value                  | error    |
    | reference: module:src/run-store.mjs#isRetryable      | loop-expected-list              | error    |
    | controlled: [run state, attempt count]               | loop-expected-scalar            | error    |
    | reference: []                                        | loop-empty-list                 | error    |
    | monitoring: []                                       | loop-empty-list                 | error    |
    | status: not-started                                  | loop-unknown-key                | error    |
    | ground: exogenous (on a kind: loop record)           | loop-key-not-admitted-for-kind  | error    |
    | cadence: periodic:15s (on a kind: actor record)      | loop-key-not-admitted-for-kind  | error    |
    | veto/constraint: [loop:autonomous-cascade]           | loop-malformed-frontmatter-line | error    |
    | an indented "  - module:a.mjs#b" continuation line   | (no finding — a continuation)   | —        |
    | id: loop:other (in run-resilience.md)                | loop-id-mismatch                | error    |
    | data-feed: [loop:ghost] with no declaring record     | loop-graph-dangling-endpoint    | error    |
    | owner: unknown                                       | loop-owner-unknown              | warn     |
    | cadence: unknown                                     | loop-cadence-unknown            | warn     |
    | ceiling: unknown                                     | loop-ceiling-unknown            | warn     |
    | ceiling: uncapped                                    | loop-ceiling-uncapped           | warn     |
    | measurement: [prose:src/bundle/commands/continue.md] | loop-field-prose-only           | warn     |
    | owner: actor:product-owner                           | (no finding)                    | —        |
    | ceiling: none                                        | (no finding)                    | —        |
    | data-feed: [item:52/00]                              | (no finding)                    | —        |
    | reference: [module:src/does-not-exist.mjs#nope]      | (no finding)                    | —        |

  # The precedence ladder, row by row: one authored key, the gate it fails, the ONE finding
  # it produces, and the finding a reader might expect but must never see beside it.
  Examples:
    | key as authored                           | gate that fails          | the one finding                | never also reported                   |
    | status: []                                | 1 admitted at all        | loop-unknown-key               | loop-expected-list, loop-empty-list   |
    | ground: [] (on a kind: loop record)       | 2 admitted for this kind | loop-key-not-admitted-for-kind | loop-expected-scalar, loop-empty-list |
    | ground: measured (on a kind: loop record) | 2 admitted for this kind | loop-key-not-admitted-for-kind | loop-bad-value                        |
    | controlled: []                            | 3 shape                  | loop-expected-scalar           | loop-empty-list                       |
    | reference: module:a.mjs#b                 | 3 shape                  | loop-expected-list             | loop-bad-value                        |
    | reference: []                             | 4 non-empty              | loop-empty-list                | loop-bad-value                        |
    | monitoring: []                            | 4 non-empty              | loop-empty-list                | loop-graph-dangling-endpoint          |
    | cadence: hourly                           | 5 grammar                | loop-bad-value                 | (nothing — gate 5 is the last)        |
    | ceiling: unknown                          | (every gate passes)      | loop-ceiling-unknown (warn)    | any error-severity finding            |
