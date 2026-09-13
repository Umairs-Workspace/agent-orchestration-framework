@executable @cli @work @validate @bug @finding-F-52-04-H
Feature: The record suite — the loader driven over records on disk, decided where the gates cannot see

  `test/work-loops-record.test.mjs`, registered in `scripts/test.mjs`. It mechanises the record-facing
  half of 52/00: `01_record-loader` (32 scenarios), `00_frozen-vocabulary` (26) and
  `04_schema-and-honesty-findings` (19) — 77 scenarios, of which roughly 49 are this suite's to decide.
  The subject is always the exported `loadLoops(workDir)` driven over a temp `<work.dir>/loops/`
  materialised by `test/support/loop-registry-fixture.mjs`; never a private parser, never a source read.

  WHAT THIS SUITE DOES NOT DO, and why the list is long. FF-5203 already set-equals all thirteen
  exported vocabularies against the ADR literals and pins the per-record finding-code arrays of the
  precedence ladder over a 17-record fixture; FF-5209 already owns the 24-code lane/severity table with
  every code reachable, the four-key envelope, OS-native absoluteness, the ternary `path` rule and the
  loader's complete literal total-order oracle. Re-asserting any of them here is the duplicated
  invariant this story's acceptance forbids — two homes for one rule. What is left is precisely what
  those gates' fixtures **cannot discriminate**, and each such scenario names the discriminator its
  fixture must carry. That is the whole design of this suite: it is the complement of the nine gates,
  not a second copy of them.

  ADR-002 (declared gaps), ADR-011 §2–§5 and §7 (typed fields, kind-scoped keys, dropped lines, empty
  lists, the normalised model), ADR-013 §1–§4 (the total order, `kind`-suspension, no dedup).

  Background:
    Given a temp workspace whose "<work.dir>/loops/" holds records materialised by the fixture helper
    And every base fixture carries at least one "kind: actor" record

  Scenario: an absent registry and an empty one are two answers, never one
    Given one workspace with no "loops/" directory
    And a second whose "loops/" holds no files
    When each is loaded
    Then the first reports present false and the second reports present true
    And both report zero nodes and zero findings
    And both report a "source" naming the directory that would hold the registry
    And the two answers differ in "present" alone — a loader returning a constant fails this case

  Scenario: the model handed back is plain, round-trippable data with the frozen key set
    Given a directory producing findings of both severities
    When the directory is loaded
    Then the model's key set is exactly "source", "present", "nodes", "findings"
    And re-parsing the model's JSON serialisation deep-equals the model
    And each node's key set is exactly "id", "kind", "title", "path", "fields", "edges"

  Scenario: node order is code-unit lexicographic, on a fixture where a collation would disagree
    Given records "Zeta.md", "runbook.md" and "run-store.md"
    When the directory is loaded
    Then the ids arrive "loop:Zeta", "loop:run-store", "loop:runbook"
    And that order is unchanged in a fresh process
    And a case-folding collation would order them differently, so the case decides the rule rather than restating it

  Scenario: the directory walk takes the flat markdown files and nothing else
    Given "run-resilience.md", a "notes.txt" and a nested "archive/old-loop.md"
    When the directory is loaded
    Then exactly one node is reported
    And no finding names "notes.txt" or "old-loop.md"
    And no node carries the id "loop:old-loop"

  Scenario: an unparseable record costs its own node and no sibling's
    Given a valid "run-resilience.md", a "README.md" holding prose with no "---" block, and a "draft.md" whose "---" block follows a blank line
    When the directory is loaded
    Then two "loop-record-unparseable" findings are reported
    And exactly one node is reported
    And the valid record's own fields and edges are unaffected

  Scenario: an unusable kind suspends the scheme leg of the id rule and not the stem leg
    Given "sensor.md" declaring "id: loop:sensor" and "kind: anchor"
    And "gauge.md" declaring "id: loop:guage" and "kind: anchor"
    When the directory is loaded
    Then "sensor.md" reports "loop-bad-value" for "kind" and no "loop-id-mismatch"
    And "gauge.md" reports both — the stem leg is decidable without a kind, the scheme leg is not

  Scenario: a record whose kind is unusable is admitted against the union, not against a kind
    Given one record declaring "kind: anchor", a "ground:" key, a "cadence:" key and "status: draft"
    When the directory is loaded
    Then one "loop-bad-value" is reported for "kind"
    And "status" is still reported "loop-unknown-key"
    And neither "ground" nor "cadence" is reported "loop-key-not-admitted-for-kind"

  Scenario: the top-level line scanner reports the dropped line once and invents no key
    Given a record carrying the top-level line "veto/constraint: [loop:x]" and two indented "  - module:…" continuation lines
    When the directory is loaded
    Then exactly one "loop-malformed-frontmatter-line" is reported, quoting the top-level line
    And neither indented line produces a finding
    And no "veto" edge is invented from the dropped line

  Scenario: the scanner's skip rules are exercised by a fixture that would otherwise fail them
    Given a record whose frontmatter holds a blank line and a "# evidence: RESEARCH §Q1.5" comment above a real key
    When the directory is loaded
    Then no "loop-malformed-frontmatter-line" is reported
    And no error-severity finding is reported
    And the keys declared below the comment still parse into fields

  Scenario: one authoring slip yields one finding, at the first gate it fails
    Given one record per row of the precedence table below
    When the directory is loaded
    Then each key carries exactly the code of the first gate it fails
    And the code a reader might expect beside it is absent
    And no key anywhere in the load carries two schema-lane findings

  Scenario: several independent slips on one record are reported independently
    Given a "kind: loop" record declaring "cadence: hourly", a scalar "reference", "status: draft", "controlled: [a, b]", "actuator: []" and no "owner" key
    When the directory is loaded
    Then six findings are reported, one per key
    And the load does not stop at the first violation

  Scenario: a missing key and a declared gap are different facts
    Given "a.md" declaring no "owner" key and "b.md" declaring "owner: unknown"
    When the directory is loaded
    Then "a.md" reports "loop-missing-field" at error
    And "b.md" reports "loop-owner-unknown" at warn and no missing-field for "owner"
    And "b.md" still loads as a node

  # THE NEAR MISS FF-5209's ORDER ORACLE CANNOT SEE. Its fixture pairs "a-unparseable.md" with
  # "z-unparseable.md", which sort identically under code units and under a case-folding collation.
  Scenario: the unparseable lane leads the whole load, ordered by path on a case-discriminating pair
    Given "README.md" and "draft.md", both unparseable, and a valid "alpha.md" carrying an unknown key
    When the directory is loaded
    Then both unparseable findings precede every other finding of the load
    And they are ordered "README.md" then "draft.md" — a case-folding collation would reverse them
    And "alpha.md"'s own finding follows both, though its path sorts between them

  # THE SECOND NEAR MISS. FF-5209's within-key pair is "bad:first"/"bad:second", whose authored order
  # and raw-text order agree — so its fixture cannot tell the two rules apart.
  Scenario: within one key the findings follow the authored order, on entries whose raw text disagrees
    Given "a.md" declaring "reference: [module:src/run-store.mjs, doc:src/x.md, item:52/00]"
    When the directory is loaded
    Then three "loop-bad-value" findings are reported for "reference"
    And they arrive module, then doc, then item — the authored order
    And raw-text ordering would put the doc entry first, so the case decides the rule

  # THE THIRD NEAR MISS. FF-5209 calls `loadLoops` once per test, so the in-process repeat — the leg
  # that catches a per-call mutation of module state — is asserted by nothing today.
  Scenario: determinism holds across a repeat in one process as well as across processes
    Given one fixed directory of records
    When it is loaded twice in the same process
    Then the two findings lists are byte-identical, in the same order
    And a fresh-process load is byte-identical to both

  Scenario: a load leaves the exported vocabularies exactly as they were
    Given the eleven exported vocabulary sets captured before any load
    When a record carrying an unadmitted key is loaded, and a mutation of a captured set is attempted
    Then each captured set is unchanged after the load
    And a later load classifies the attempted token exactly as the first load did

  Scenario: the suite drives the public loader and its fixtures are non-vacuous
    Given every case in this suite
    When the suite runs
    Then every subject is the exported "loadLoops", never a module-private function
    And every base fixture resolves at least one node whose kind is "actor"
    And no case asserts an absent registry without asserting a populated one beside it

  # THE PRECEDENCE LADDER — one authored key, the gate it fails, the ONE finding, and the finding a
  # reader might expect but must never see beside it. FF-5203 pins these codes per record; this suite
  # decides the NEGATIVE half — that the gates behind the failing one were never reached.
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

  # THE SUITE'S OWN CASE TABLE. Each row names the covered feature, the fixture the case needs, and the
  # observation that decides it. A row whose observation could pass over a loader that read nothing is
  # not a row — hence the paired absent/populated and before/after cases.
  Examples:
    | covered feature                | fixture the case needs                                                                | deciding observation                                                                                          |
    | 01_record-loader               | (i) no "loops/"  (ii) "loops/" holding no files                                       | present false vs true; both zero nodes and zero findings; the two differ in "present" ALONE                    |
    | 01_record-loader               | a directory producing findings of both severities                                     | model key set exactly {source, present, nodes, findings}; the JSON round-trip deep-equals the model            |
    | 01_record-loader               | "Zeta.md", "runbook.md", "run-store.md"                                               | ids in code-unit order, unchanged in a fresh process, where a collation would reorder them                     |
    | 01_record-loader               | "run-resilience.md" + "notes.txt" + "archive/old-loop.md"                              | exactly one node; no finding names either non-record; no "loop:old-loop" anywhere                              |
    | 01_record-loader               | valid record + "README.md" (no "---") + "draft.md" ("---" after a blank)               | two unparseable findings, one node, the valid record's fields and edges intact                                 |
    | 01_record-loader               | "sensor.md" id-scheme-mismatched + "gauge.md" id-stem-mismatched, both "kind: anchor"   | scheme leg suspended on the first; stem leg still fires on the second                                          |
    | 01_record-loader               | one record per row of the precedence table above                                       | exactly the first failing gate's code per key; the expected neighbour absent; no key carries two schema findings |
    | 00_frozen-vocabulary           | "kind: anchor" + "ground:" + "cadence:" + "status: draft" on one record                | one bad-value for "kind"; "status" still unknown-key; NO not-admitted-for-kind for either admitted key         |
    | 00_frozen-vocabulary           | a top-level "veto/constraint:" line plus two indented "  - module:…" continuations      | exactly ONE malformed-line finding quoting the top-level line; zero for either continuation; no "veto" edge     |
    | 00_frozen-vocabulary           | a blank line and a "#" comment inside the block, above a real key                       | zero malformed-line findings, zero errors, and the keys below the comment still parse                          |
    | 00_frozen-vocabulary           | the eleven sets captured, then a load carrying an unadmitted key, then a mutation try   | each captured set deep-equal after both; a later load classifies the token identically                         |
    | 04_schema-and-honesty-findings | "a.md" with no "owner" key; "b.md" with "owner: unknown"                                | error missing-field vs warn owner-unknown; the gapped record still loads as a node                             |
    | 04_schema-and-honesty-findings | a "kind: loop" record with six independent slips across six keys                        | six findings, one per key; the load does not stop at the first                                                 |
    | 04_schema-and-honesty-findings | "README.md" + "draft.md" unparseable, plus a valid "alpha.md" with an unknown key       | both unparseable findings lead the lane, ordered "R" before "d" by code unit; alpha's follows both              |
    | 04_schema-and-honesty-findings | "a.md" declaring "reference: [module:…, doc:…, item:52/00]"                             | three bad-value findings in AUTHORED order, which raw-text order would reorder to doc first                    |
    | 04_schema-and-honesty-findings | one fixed directory, loaded twice in-process and once in a fresh process                | all three findings lists byte-identical — the in-process repeat is the leg nothing owns today                  |
