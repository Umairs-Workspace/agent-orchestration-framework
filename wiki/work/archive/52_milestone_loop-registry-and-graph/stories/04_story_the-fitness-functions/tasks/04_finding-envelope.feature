@executable @cli @work @validate
Feature: The finding envelope and the live code set — no unfrozen code, and no dead one

  FF-5209 (`test/arch/acd-loop-finding-envelope.test.mjs`) pins the shape — exactly
  `{code, severity, path, message}`, `severity ∈ {warn, error}`, `path` a non-empty raw
  absolute — and then does the load-bearing thing: it drives the loader and every check over a
  fixture engineered to fire every code and asserts the union of emitted codes EQUALS the
  frozen set. The frozen set is no longer one array in one module. ADR-011 §1 lane-scopes it:
  the loader exports its own 16 codes, the checks their own 8, this gate imports BOTH, and it
  asserts the union is exactly the 24 AND that the two arrays are DISJOINT. Disjointness is
  what makes lane-scoping single-sourcing rather than duplication — every code has exactly one
  home, and neither module imports the other (FF-5205 holds that edge, in both directions).
  Both directions of the union matter, and the second is why this gate exists. An emitted code
  outside the set is an unfrozen contract 53 and 55 would key on. A set member no fixture can
  make fire is a DEAD BRANCH OF THE GATE — and this repository has already paid for that:
  `wiki/work/TECH_DEBT.md` item 5, "Part of the fitness gate is dead", 10 of 700 arch-tests
  failing before any change, verdict "the gate reads green-ish while not running". Detecting an
  unreachable code is the whole point, not a bonus. The gate holds one more thing ADR-012
  §3/C6 froze and ADR-013 §1 COMPLETED: the ORDER of the combined `Finding[]` — loader lane
  first, then the five checks in `summary.checks` order — without which no byte-identity claim
  in this milestone is assertable at all. Completed matters here more than anywhere: two of the
  16 loader codes carry NEITHER coordinate the earlier rule sorted by — `loop-record-unparseable`
  yields no node and so no `id`, `loop-malformed-frontmatter-line` yields no key and so no
  key-order position — and this gate's fixture, engineered to fire EVERY code, necessarily
  contains both. They are placeless in exactly the run whose bytes are asserted, so the order is
  total here or it is not asserted at all. Every comparison behind it is code-unit lexicographic
  (ADR-013 §1): a determinism gate that passes on one machine and fails on another is the worst
  failure available to it. ADR-002, ADR-007, ADR-011, ADR-012, ADR-013.
  The Examples table below carries ONE ROW PER CODE, and the table's completeness is itself
  the assertion: the row set equals the frozen set, so a code added to the set without a row
  is a code with no fixture, which is exactly the dead branch the gate refuses. The "lane"
  column records which module exports the code; because the union is asserted over the loader
  and every check together and the lanes are asserted disjoint, a code that moves between them
  cannot weaken the gate and cannot acquire a second home.

  Scenario: every finding the loader emits is exactly the four keys
    Given the fixture registry directory engineered to fire every code
    When the loader runs over it
    Then every finding's key set is exactly code, severity, path, message — no more, no fewer
    And no finding carries an extra `detail`, `hint`, `node` or `problem` key
    And the loader emitted at least one finding, so the sweep is non-vacuous

  Scenario: every finding every check emits is exactly the four keys
    Given the model the loader produced from that fixture
    When every exported check runs over it
    Then every finding's key set is exactly code, severity, path, message
    And every exported check was invoked, so no check is silently skipped

  Scenario: severity is one of exactly two literals
    Given every finding from the loader and every check over the fixture
    When each `severity` is read
    Then each is `warn` or `error`
    And no finding carries `info`, `ok`, `debug` or `null`
    And both literals actually occur — the fixture fires at least one of each

  Scenario: every path is a raw absolute in OS-native form
    Given every finding from the loader and every check over the fixture
    When each `path` is read
    Then `path.isAbsolute(path)` is true
    And `path` is a non-empty string on every finding without exception
    And the path is not relativised against the project root inside the command
    And on Windows the path carries backslashes — the command did not forward-slash it

  Scenario: a per-node finding is anchored at that node's own file
    Given a fixture record that fires a schema-lane finding
    When the loader runs
    Then that finding's `path` is that record's own `.md` file
    And two records firing the same code produce two findings with different paths

  Scenario: a whole-graph finding is anchored at the loops directory
    Given a fixture whose graph fires an ungrounded-component finding
    When the checks run
    Then that finding's `path` is the `<work.dir>/loops/` directory itself
    And it is not anchored at an arbitrary member node's file

  Scenario: a per-edge finding is anchored at the declaring node's file
    Given a fixture whose graph fires a timescale finding and a self-referential-edge finding
    When the checks run
    Then each finding's `path` is the file of the node that DECLARED the edge, never the endpoint's
    And neither finding omits `path` — an edge finding is anchored, not pathless
    And the declaring file is unambiguous, because an edge is declared at one end only

  Scenario: every message is a non-empty string
    Given every finding from the loader and every check over the fixture
    When each `message` is read
    Then each is a non-empty string
    And no consumer contract in this milestone keys on a message — only on `code`

  Scenario: the frozen code set is the union of two lane-scoped arrays
    Given the code array exported by `src/work-loops.mjs` and the code array exported by `src/work-loops-checks.mjs`
    When both are imported and unioned
    Then the loader's array holds exactly 16 codes and the checks' array exactly 8
    And the union is set-EQUAL to the twenty-four codes in the Examples table below
    And each comparison is equality, not containment
    And the checks module exports TWO frozen vocabularies — this code array and the five check ids (ADR-012 §2/B2) — so the gate imports the codes BY NAME, never by position

  Scenario: the two lane arrays are disjoint
    Given the same two exported arrays
    When their intersection is taken
    Then it is empty — no code has two homes
    And a code exported by both modules fails the gate, naming it
    And a code silently moved from one lane to the other still passes, because the union and the disjointness are what is asserted

  Scenario: the union of emitted codes equals the exported frozen set
    Given the fixture engineered to fire every code
    When the loader and every check have run over it
    Then the union of every emitted `code` is set-EQUAL to the union of the two exported arrays
    And the assertion is equality, in both directions, not containment either way

  Scenario: the combined finding list is emitted in the frozen order
    Given the loader and the five checks run over the fixture engineered to fire every code
    When their findings are concatenated the way the command concatenates them
    Then the LOADER lane comes first, and every one of its 16 codes holds a defined position (ADR-012 §3/C6, completed by ADR-013 §1)
    And every `loop-record-unparseable` LEADS the lane, sorted by `path` — no node exists, so it is a fact about the DIRECTORY, prior to any node ordering
    And the remainder follows per node in `id` order
    And within one node, its `loop-malformed-frontmatter-line` findings come FIRST, by LINE NUMBER ascending — raw-text facts precede any key-level interpretation of the same record, in the order a human reads the file
    And that node's key-bearing findings follow, in the frozen schema's key order
    And WITHIN one key, the offending entries hold DECLARED-ENTRY order — stable given the edge dedup of ADR-012 §3/C2 and the no-dedup rule for field lists of ADR-013 §4
    And the five checks follow, in `summary.checks` order — grounding, pairing, reference-ownership, actuator-arbitration, timescale
    And each check's own findings are sorted by `(path, code, message)`
    And the serialised list is BYTE-IDENTICAL on a repeated run and in a fresh process
    And EVERY string comparison behind that order is code-unit lexicographic — plain `<`/`>` on strings, never `localeCompare`, `Intl.Collator` or any locale collation (ADR-013 §1)
    And the `path`s, the node `id`s and the `(path, code, message)` tuples are each compared that way, without exception
    And the fixture carries the pairs locale collation reorders — `-` against `.`, and case against case — so a collating implementation reddens the gate here rather than on somebody else's machine
    And shuffling the fixture directory's read order changes nothing, so the order is a contract rather than an artefact of the directory walk
    And an unordered concatenation fails the gate even when the finding SET is right (ADR-012 §3/C6)

  Scenario: the two placeless codes are ordered by the same fixture whose bytes are asserted
    Given the every-code fixture, which by construction fires both `loop-record-unparseable` and `loop-malformed-frontmatter-line`
    When the combined list is read
    Then a `loop-record-unparseable` whose `path` sorts LAST still precedes every finding of the first node — the lane position decides the group, and the path only orders within it
    And two unparseable records appear between themselves in `path` order
    And a node's malformed-line findings precede that node's key-bearing findings even when the malformed line sits BELOW the offending key in the file — the line number orders within the group, never across it
    And a malformed line in one record never interleaves with another node's findings, so the report still reads file by file
    And an implementation sorting either placeless code by `path` alone, mixed into the node ordering, fails the gate — that was the rejected alternative, and it is unreadable rather than merely different
    And two otherwise-conforming implementations differing on either rule emit different bytes, which is why both rules are asserted here and not left to the concatenation site

  Scenario: an emitted code outside the frozen set fails the gate
    Given a check emitting a finding with code `loop-graph-suspicious`
    When the union is compared against the frozen set
    Then the gate fails, naming the unfrozen code
    And it fails even though the finding's envelope shape is otherwise correct

  Scenario: a frozen-set member no check can emit fails the gate
    Given a code added to either lane's array that no branch of the loader or any check emits
    When the union is compared against the frozen set
    Then the gate fails, naming the unreachable code
    And it fails identically when a live code's emitting branch is deleted while the array keeps the code
    And this is the direct guard against a gate that reads green while part of it never runs

  Scenario: every code's severity lane matches the frozen set
    Given every finding emitted over the fixture
    When each finding's code and severity are paired
    Then each pairing matches the severity in the Examples table below
    And every code the checks lane exports is emitted at `warn`
    And no code is ever emitted at two different severities

  Scenario: the fixture drives the real loader over a real directory
    Given the fixture registry materialised as `.md` files on disk
    When the loader runs over that directory
    Then `loop-record-unparseable` is reachable — it is a file-level code no literal model can fire
    And `loop-malformed-frontmatter-line` is reachable — it is a raw-text code no parsed model can fire
    And the fixture is removed afterwards, leaving the real work directory untouched

  Scenario: every arch-test in this milestone is exported under the key the harness invokes
    Given the nine arch-test files of FF-5201 through FF-5209
    When each module's exported test array is read
    Then every entry carries `name` and `run`
    And no entry carries `fn` — a test exported under a key the harness never reads is a test that never runs
    And each file's exported array is non-empty
    And this is the same failure as an unreachable code, one layer up: the gate reads green while part of it never runs

  Scenario: all nine arch-tests are registered in the full runner
    Given the nine new `test/arch/acd-loop-*.test.mjs` suites
    When `scripts/test.mjs`'s explicit imports and test array are read
    Then each suite is imported exactly once in a separately labelled milestone-52 block
    And each imported `archTests` array is spread exactly once into the runner
    And `scripts/test-unit.mjs` is unchanged — registration has one home
    And the repository-wide suite-registration fitness function reports no new orphan

  Examples:
    | finding code                       | severity | lane                                    | fixture condition that fires it                                                  |
    | loop-record-unparseable            | error    | loader — schema                         | a `.md` in loops/ with no frontmatter block at all                               |
    | loop-missing-field                 | error    | loader — schema                         | a `kind: loop` record with no `actuator:` key                                    |
    | loop-bad-value                     | error    | loader — schema                         | `cadence: event:per-eclipse` — a trigger outside the closed four                  |
    | loop-expected-list                 | error    | loader — schema                         | `actuator: command:work:run-retry` authored as a bare scalar                     |
    | loop-expected-scalar               | error    | loader — schema                         | `controlled: [a, b]` — a list where the schema fixes a scalar                    |
    | loop-empty-list                    | error    | loader — schema                         | `reference: []`; an empty edge list such as `monitoring: []` fires it too        |
    | loop-unknown-key                   | error    | loader — schema                         | a record carrying `depends: [50]`                                                |
    | loop-key-not-admitted-for-kind     | error    | loader — schema                         | `ground: exogenous` on a `kind: loop` record                                     |
    | loop-malformed-frontmatter-line    | error    | loader — schema                         | a `veto/constraint: [loop:b]` line the parser drops without a key                |
    | loop-id-mismatch                   | error    | loader — schema                         | `id: loop:alpha` in a file named `beta.md`                                       |
    | loop-graph-dangling-endpoint       | error    | loader — reference integrity            | `data-feed: [loop:absent]` with no record declaring `loop:absent`                |
    | loop-owner-unknown                 | warn     | loader — honesty                        | `owner: unknown`                                                                 |
    | loop-cadence-unknown               | warn     | loader — honesty                        | `cadence: unknown`                                                               |
    | loop-ceiling-unknown               | warn     | loader — honesty                        | `ceiling: unknown`                                                               |
    | loop-ceiling-uncapped              | warn     | loader — honesty                        | `ceiling: uncapped`                                                              |
    | loop-field-prose-only              | warn     | loader — honesty                        | `measurement: [prose:src/bundle/commands/continue.md]`                           |
    | loop-graph-ungrounded-component    | warn     | checks — grounding                      | a mutual pair unreachable forward from any `ground:`-bearing node                |
    | loop-graph-grounded-exogenous-only | warn     | checks — grounding                      | a component reachable from `actor:operator` carrying `ground: exogenous`         |
    | loop-unpaired-optimizer            | warn     | checks — pairing                        | a loop with `optimizing: true` and no inbound `monitoring` edge from another node |
    | loop-unowned-reference             | warn     | checks — reference-ownership            | a `kind: loop` node with no inbound `target-setting` edge from another node      |
    | loop-self-referential-edge         | warn     | checks — pairing (a `monitoring` self-edge) · reference-ownership (a `target-setting` self-edge), ADR-012 §2/B1 | a node declaring `monitoring:` or `target-setting:` to its own id |
    | loop-shared-actuator-unarbitrated  | warn     | checks — actuator-arbitration           | two loops sharing an identical `actuator` entry, and no third node the check accepts as an arbiter |
    | loop-timescale-inversion           | warn     | checks — timescale                      | `periodic:10s` --target-setting--> `periodic:5s`, a directed ratio of 2           |
    | loop-timescale-not-comparable      | warn     | checks — timescale                      | `event:per-item` --target-setting--> `periodic:15s`, both registry-present loops |
