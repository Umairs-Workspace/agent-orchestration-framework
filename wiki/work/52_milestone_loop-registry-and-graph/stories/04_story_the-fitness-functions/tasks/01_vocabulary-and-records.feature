@executable @cli @work @validate
Feature: The closed vocabulary and the parsing records — exact set equality, and no aspirational loop

  FF-5203 (`test/arch/acd-loop-vocabulary-closed.test.mjs`) asserts every vocabulary constant
  the two lanes export by EXACT SET EQUALITY against the ADR literal — ELEVEN on the loader
  (the ten of ADR-011 plus `FIELD_KINDS`, ADR-012 §2/B4) and TWO on the checks module, which
  lane-scopes its own vocabulary exactly as ADR-011 §1 lane-scopes the codes: its eight codes
  and the five `summary.checks` ids (ADR-012 §2/B2). The first loader set is KIND-SCOPED: what
  a `kind: loop` node admits and what a `kind: actor` node admits are different sets, so
  `ground:` on a loop and a control field on an actor are both errors with a name of their own.
  Equality, not containment, is the point: a superset passes a "contains" check, so a quietly
  added member — a sixth edge key, a fourth pointer scheme, a `doc:` scheme ADR-003 refused —
  would slip through unnoticed. Equality fails on an addition AND on a removal, which is the
  only form that closes the set. The five check ids are asserted the same way and out of their
  own module: 53 keys on them, so they are a consumed contract. Closure has a second half —
  ADR-012 §3/C4's precedence ladder — because a set is only closed if a token outside it
  produces exactly ONE named finding rather than a cascade.
  FF-5204 (`test/arch/acd-loop-records-parse.test.mjs`) then turns the vocabulary on the REAL
  registry: every record under `<work.dir>/loops/` loads with zero error-severity findings, no
  `kind: loop` node declares `unknown` or an empty list for its machinery — which is what makes
  ADR-010's "every declared loop is a loop that actually runs today" structural rather than a
  convention — and every pointer a record cites is resolved ONCE, test-side, in the DECLARED-HERE
  form ADR-012 §7/G2 pins and ADR-013 §3 NARROWS, so a fabricated or merely-importing citation
  dies at the diff rather than at 55. The narrowing is the whole lesson of the round: export
  syntax is not evidence of definition in ANY of its three forms, so a local `export { … }`
  manifest is admitted only alongside a declaration of that same symbol in that same file.
  ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-010, ADR-011, ADR-012, ADR-013.

  Scenario: every exported vocabulary set equals its ADR literal exactly
    Given the ELEVEN vocabulary constants exported by `src/work-loops.mjs` and the TWO exported by `src/work-loops-checks.mjs`
    When each is compared against its ADR literal set
    Then each comparison is set EQUALITY, not containment
    And each set's member count matches the Examples table below
    And every set named in the table is actually exported — a missing export fails the gate
    And the eleventh loader constant is `FIELD_KINDS` — the field-kind set is an EXPORT, not an internal literal (ADR-012 §2/B4)
    And the kind-scoped constant occupies two rows of that table, one per kind, so eleven loader constants are asserted across twelve rows
    And each lane's vocabulary is imported from its OWN module — neither lane re-exports the other's, which is what keeps ADR-011 §1 true of the vocabulary as well as of the codes

  Scenario: an added member fails the gate
    Given the edge-key set widened with a sixth key `escalation`
    When the gate compares it against ADR-004's five
    Then the gate fails, naming the extra member
    And a superset would have passed a containment check — which is the weakness being closed

  Scenario: a removed member fails the gate
    Given the pointer-scheme set with `config` dropped
    When the gate compares it against ADR-003's three
    Then the gate fails, naming the missing member
    And the same holds for dropping `veto` from the edge keys or `per-phase` from the triggers

  Scenario: the admitted key set is compared per kind, not globally
    Given the kind-scoped admitted-key constant exported by `src/work-loops.mjs`
    When the entry for `kind: loop` and the entry for `kind: actor` are each compared against ADR-011 §3
    Then each is set-EQUAL to its own row in the Examples table below
    And the two sets differ — `ground` is admitted on an actor and on no loop, the EIGHT control fields on a loop and on no actor
    And a single global union in place of the two sets fails the gate

  Scenario: the check-id vocabulary equals the five frozen ids
    Given the frozen `summary.checks` id set exported alongside the five checks by `src/work-loops-checks.mjs`
    When it is compared against ADR-011 §12
    Then it is set-EQUAL to `grounding`, `pairing`, `reference-ownership`, `actuator-arbitration`, `timescale`
    And it holds exactly five members, one per SPEC check
    And a sixth id, a renamed id or a dropped id fails the gate — 53's score reads these keys
    And the checks module exports TWO frozen vocabularies — these five ids and its own eight codes — so the loader is never asked what the checks are called (ADR-012 §2/B2)
    And an id set exported by the loader instead fails the gate, whatever its members — the home is part of the contract

  Scenario: the exported sets are literals, never widened by the data
    Given a fixture record declaring an edge key `escalation` and a pointer scheme `doc:`
    When the loader reads it
    Then the exported vocabulary sets are byte-identical to what they were before the read
    And the record's out-of-vocabulary tokens produce findings rather than joining the sets

  Scenario: an out-of-vocabulary edge key produces loop-unknown-key
    Given a fixture record carrying `escalation: [loop:b]`
    When the loader reads it
    Then a finding with code `loop-unknown-key` is emitted at severity `error`
    And the finding's path is that record's own file

  Scenario: a key outside the schema and the five edge keys produces loop-unknown-key
    Given a fixture record carrying `depends: [50]`
    When the loader reads it
    Then a finding with code `loop-unknown-key` is emitted at severity `error`
    And `depends` is never resolved as an item edge — the two graphs stay separate

  Scenario: an admitted key on the wrong kind produces loop-key-not-admitted-for-kind
    Given a fixture record with `kind: loop` carrying `ground: exogenous`
    When the loader reads it
    Then a finding with code `loop-key-not-admitted-for-kind` is emitted at severity `error`
    And it is NOT `loop-unknown-key` — the key is in the vocabulary, it is on the wrong kind
    And a `kind: actor` record carrying `controlled:`, `cadence:` or `actuator:` fails the same way
    And `ground: exogenous` on a `kind: actor` node produces no finding
    And `ground: process-exit` on an actor node produces `loop-bad-value` — 55 widens the enum, not 52

  Scenario: a frontmatter line the parser drops produces loop-malformed-frontmatter-line
    Given a fixture record whose frontmatter carries the SPEC's own phrasing `veto/constraint: [loop:b]`
    When the loader reads it
    Then a finding with code `loop-malformed-frontmatter-line` is emitted at severity `error`
    And the finding quotes the dropped line, so the author can see what was ignored
    And the line yields no edge and no key — it is reported, never silently absorbed
    And a blank line and a `#` comment line inside the block produce no finding

  Scenario: an unknown pointer scheme produces loop-bad-value
    Given a fixture record carrying `reference: [doc:src/bundle/commands/continue.md]`
    When the loader reads it
    Then a finding with code `loop-bad-value` is emitted at severity `error`
    And `doc:` is admitted by no set — ADR-003 refused it by name

  Scenario: a malformed pointer of an admitted scheme produces loop-bad-value
    Given a fixture record carrying `reference: [module:src/run-store.mjs]` with no `#symbol`
    When the loader reads it
    Then a finding with code `loop-bad-value` is emitted at severity `error`
    And an absolute or backslash-separated `module:` path fails the same way
    And a `#` in any NON-`module:` pointer or endpoint fails the same way — the symbol split is `module:`-only (ADR-012 §4/D3)

  Scenario: an unlisted event trigger produces loop-bad-value
    Given a fixture record carrying `cadence: event:per-eclipse`
    When the loader reads it
    Then a finding with code `loop-bad-value` is emitted at severity `error`
    And each of `event:per-item`, `event:per-phase`, `event:per-milestone` and `event:per-run-start` produces none

  Scenario: a list field authored as a bare scalar produces loop-expected-list
    Given a fixture record carrying `actuator: command:work:run-retry` with no brackets
    When the loader reads it
    Then a finding with code `loop-expected-list` is emitted at severity `error`
    And the value is NOT coerced into a one-element list

  Scenario: a scalar field authored as a list produces loop-expected-scalar
    Given a fixture record carrying `controlled: [a, b]`
    When the loader reads it
    Then a finding with code `loop-expected-scalar` is emitted at severity `error`
    And `cadence`, `owner`, `optimizing` and `ground` authored as lists fail the same way
    And the first element is NOT taken as the value

  Scenario: an empty list is a schema error, on a machinery key and on an edge key alike
    Given a fixture record carrying `reference: []`
    When the loader reads it
    Then a finding with code `loop-empty-list` is emitted at severity `error`
    And `measurement: []`, `actuator: []` and `ceiling: []` fail the same way
    And `monitoring: []` fails the same way — an absent key is how a record says "no edges of that type"
    And an empty list is never read as a satisfied requirement

  Scenario: at most one finding per key, chosen by the precedence ladder
    Given a fixture record carrying `controlled: []` — a list where the schema fixes a scalar, and empty besides
    When the loader reads it
    Then exactly ONE finding is emitted for that key, with code `loop-expected-scalar`
    And no `loop-empty-list` accompanies it — evaluation stops at the first failing gate (ADR-012 §3/C4)
    And `ground:` on a `kind: loop` node emits `loop-key-not-admitted-for-kind` and never reaches the value gate
    And an unadmitted key emits `loop-unknown-key` and nothing else, whatever its shape or its value
    And the ladder's order is asserted, not merely its outcome: unknown-key, then not-admitted-for-kind, then shape, then empty-list, then bad-value

  Scenario: an id that does not match its filename produces loop-id-mismatch
    Given a fixture file `beta.md` declaring `id: loop:alpha`
    When the loader reads it
    Then a finding with code `loop-id-mismatch` is emitted at severity `error`
    And `id: actor:beta` in `beta.md` with `kind: loop` fails too — the scheme must match `kind`

  Scenario: an absent required key produces loop-missing-field, never a silent unknown
    Given a fixture record with `kind: loop` and no `actuator:` key at all
    When the loader reads it
    Then a finding with code `loop-missing-field` is emitted at severity `error`
    And the field is NOT treated as `unknown` — absence and a declared gap are different states

  Scenario: the real records under the work directory load with zero error findings
    Given the real `<work.dir>/loops/` directory in this repository
    When the real loader runs over it
    Then no finding of severity `error` is emitted at all, from any loader lane
    And the error-severity codes that could have fired are exactly the ten schema-lane names plus `loop-graph-dangling-endpoint`
    And every intra-registry endpoint every record declares resolves to a declaring record

  Scenario: the real-record sweep is non-vacuous
    Given the same real load
    Then the loader resolved at least one `kind: loop` node
    And at least one `kind: actor` node
    And an empty or absent directory fails this gate rather than passing silently

  Scenario: no real kind loop node declares unknown or an empty list for its machinery
    Given every `kind: loop` node the real loader resolved
    When each node's `controlled`, `reference`, `measurement` and `actuator` are read
    Then every value is a pointer in one of the three schemes or a `prose:` path
    And no value is `unknown` — an aspirational loop cannot be declared
    And no value is `uncapped` or `none` either, which are `ceiling`-only sentinels
    And no list is empty — an empty machinery list is the same evasion by another spelling

  Scenario: unknown stays admitted where the ADR admits it, and every declared gap is visible
    Given every real node's `owner`, `cadence` and `ceiling`
    When each is read
    Then `unknown` is accepted on all three and produces a warn, never an error
    And the warn is `loop-owner-unknown`, `loop-cadence-unknown` or `loop-ceiling-unknown` respectively
    And no declared `unknown` on any of the three is silent — the honesty lane has no quiet member
    And `uncapped` on `ceiling` produces `loop-ceiling-uncapped` at warn, and `none` produces no finding
    And `uncapped` on `cadence` produces `loop-bad-value` — the rate axis stays clean

  Scenario: every real record's id equals its scheme and filename stem
    Given every record file under the real `<work.dir>/loops/`
    When each `id` is compared with its filename stem and its `kind`
    Then `id` equals `<scheme>:<stem>` for every record
    And the scheme matches the node's `kind` for every record

  Scenario: a field's shape is fixed by its key, never by the data it carries
    Given every node the real loader resolved
    When each `fields` entry is read
    Then `reference`, `measurement`, `actuator` and `ceiling` are arrays of fields on every node that declares them
    And `ceiling: uncapped` is a one-element array, not a bare field — a consumer never branches on array-ness
    And `controlled`, `cadence`, `owner`, `optimizing` and `ground` are single fields on every node that declares them
    And `id`, `kind` and `title` appear nowhere in `fields` — they are node-level scalars

  Scenario: every field carries a kind, and the typed kinds arrive normalised
    Given every field on every node the real loader resolved
    When each field's `kind` is read
    Then `kind` is present on every field without exception
    And `kind` is one of the eleven frozen kinds — pointer, prose, phrase, unknown, uncapped, none, periodic, event, ref, flag, enum
    And a `periodic:` cadence carries a resolved millisecond value, never a raw string for a consumer to parse
    And an `event:` cadence carries one of the four frozen triggers
    And `owner` is a `ref` or the `unknown` sentinel, `optimizing` a `flag`, `ground` an `enum`
    And a `phrase` kind appears only on `controlled` — `title` is a node-level string and not a `Field` at all (ADR-012 §4/D1)

  Scenario: every command pointer in every real record names a registered command id
    Given every `command:` pointer declared by any real record
    When each operand is looked up in the command registry
    Then each is a registered id
    And `command:work:memory-ingest` is not registered, so a record citing it fails the gate
    And a CLI surface reachable only through a legacy `src/cli.mjs` ladder branch is not a registered id

  Scenario: every module pointer in every real record names a file that DECLARES the symbol
    Given every `module:<path>#<symbol>` pointer declared by any real record
    When each path is resolved against the repository and read
    Then the file exists
    And the symbol is admitted on exactly TWO branches and on no third (ADR-013 §3)
    And branch one is a direct definition form — `export`, optionally `async`, then `function`, `const`, `let` or `class`, then the symbol on a word boundary
    And the `async` alternative is load-bearing, not decorative — the pinned ingest actuator `module:src/work-memory.mjs#runMemory` is an `export async function`, so a form without it would reject the very pointer ADR-012 §6/F2 authorised
    And branch two is a local `export { … }` manifest carrying that symbol with NO `from` clause, AND a declaration of that same symbol — optionally `async`, then `function`, `const`, `let` or `class` — in the SAME file
    And the declaration half of branch two is NOT optional — a bare manifest admits nothing, because export syntax is not evidence of definition in any of its three forms
    And `export { X } from "./other.mjs"` and `export * from "./other.mjs"` are REJECTED outright — a re-export names the importer, not the definer
    And a module that merely imports the symbol does NOT satisfy the gate, whichever form re-exports it
    And a pointer at an import site fails, which is the whole class ADR-011 §13 was written to kill

  Scenario: the declared-here test discriminates on the three measured sites
    Given the two-branch admission test as the gate implements it
    When it is run against the three sites in this repository that decide it
    Then `src/terminal-providers.mjs` ADMITS `CliProvider` — a bare `export { CliProvider }` manifest at `:96`, with `class CliProvider` declared at `:55`
    And `src/command-core.mjs` REJECTS `loadWorkspace` — its manifest at `:293` carries no `from`, but the symbol is IMPORTED at `:27` and declared nowhere in the file
    And `src/graphify.mjs` REJECTS every one of the four symbols its manifest re-exports at `:43` — all four are imported at `:41` from `./graph-normalize.mjs`
    And admitting a manifest on the absent `from` clause ALONE would pass both rejected sites, letting a record cite `module:src/graphify.mjs#readGraph` — a module that merely re-exports the symbol — straight through the gate built to stop exactly that (ADR-011 §13/F1)
    And these three sites are asserted as FIXTURES of the gate, so a later re-widening of the form reddens the gate here rather than surviving to a record review
    And the fixtures are asserted by OUTCOME, not by line number — a site that moves still discriminates, and a site whose export form changes is expected to change its verdict

  Examples:
    | exported constant                       | ADR source   | asserted set (exact equality)                                                                                                     | count |
    | admitted keys (kind-scoped) — loop      | ADR-011 §3   | id, kind, title, controlled, reference, measurement, actuator, cadence, ceiling, owner, optimizing + the five edge keys            | 16    |
    | admitted keys (kind-scoped) — actor     | ADR-011 §3   | id, kind, title, ground + the five edge keys                                                                                      | 9     |
    | node kinds                              | ADR-002      | loop, actor                                                                                                                       | 2     |
    | edge keys                               | ADR-004 §1   | data-feed, target-setting, monitoring, veto, parameter-tuning                                                                     | 5     |
    | pointer schemes                         | ADR-003      | module, command, config                                                                                                           | 3     |
    | endpoint schemes                        | ADR-004 §3   | loop, actor, item, command, config, module                                                                                        | 6     |
    | sentinel tokens                         | ADR-002 + ADR-013 §5 | unknown, uncapped, none, prose:                                                                                              | 4     |
    | cadence kinds                           | ADR-006 §1   | periodic:, event:, unknown                                                                                                        | 3     |
    | event triggers                          | ADR-006 §1   | per-item, per-phase, per-milestone, per-run-start                                                                                 | 4     |
    | periodic units                          | ADR-006 §1   | ms, s, m, h, d                                                                                                                    | 5     |
    | ground values                           | ADR-005 §1   | exogenous                                                                                                                         | 1     |
    | field kinds — FIELD_KINDS               | ADR-011 §2   | pointer, prose, phrase, unknown, uncapped, none, periodic, event, ref, flag, enum                                                  | 11    |
    | check ids — src/work-loops-checks.mjs   | ADR-011 §12  | grounding, pairing, reference-ownership, actuator-arbitration, timescale                                                          | 5     |
    | check codes — src/work-loops-checks.mjs | ADR-011 §1   | the checks lane's own codes, enumerated one per row in FF-5209's table — asserted here only for count and home                     | 8     |
