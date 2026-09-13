@executable @cli @assets @distribution
Feature: A delivered record is IMMUTABLE framework self-description — per-project values ride the `config:` pointer, and the framework/workspace split is deferred with a named trigger

  The STORY deferred one question to refine: does 53/07 deliver the move only, or the move plus the
  **framework-vs-workspace split** — shipped framework loops, consumer-declared workspace loops, and
  per-project values on a framework loop. **ADR-013 rules: move only.** This task encodes the ruling
  so the deferral is a decision on disk rather than an omission, and so the thing that makes it safe
  is asserted rather than assumed.

  Three measurements decided it.

  **(1) Per-project values are already solved, disjointly.** The `config:` pointer scheme
  (`POINTER_SCHEMES`, `src/work-loops.mjs:83`) is a CITATION: the loader validates its shape and
  never resolves it (`:207`), so a record naming `config:work.autonomous.maxAttempts` states where
  the authority lives without duplicating its value. The keystone is that its referent,
  `.aof/aof.config.json`, is measured to be in **neither** the shipped manifest's 86 entries **nor**
  the install lock's 86 `work.files` rows — so a consumer's tune can never be drift-warned, refreshed
  or clobbered by `work update`. The record ships immutable; the tunable value lives in a file the
  bundle does not manage. That is a clean seam, and it already exists.

  **(2) The demand is one field on two records naming one key.** Measured across the nine:
  `ceiling` is a `config:` pointer on exactly two records (`autonomous-cascade.md`,
  `run-resilience.md`), both naming `work.autonomous.maxAttempts`; the other seven are `none`,
  `uncapped` or absent. `owner` is `unknown` on six and `actor:product-owner` on one. A split built
  for that is a mechanism heavier than its load.

  **(3) A workspace-loop declaration has ZERO readers.** Nothing in milestone 52 or 53 consumes one —
  a full search returns only this story's own STORY.md. Shipping a merge would mean a precedence
  rule, a collision rule and a provenance field on every node, all of them speculative generality, in
  a milestone whose style is to route rather than merge (ADR-003 §4) and to add no store, no
  directory and no key (ADR-004).

  The deferral is **not** ledgered as debt, because nothing is owed: the `config:` seam is the answer
  for values, and a consumer-declared loop is a feature nobody has asked for. It carries a named
  discharge trigger instead — the first consumer needing a loop aof does not ship, or the first
  framework field wanting a per-project value the `config:` scheme cannot express. Each delivered
  record carries one prose line saying where it comes from and where tuning belongs, so an operator
  who opens one is not left to infer the rule. That line is safe to add: the census suite explicitly
  excludes prose-body scenarios as `not-black-box` (`test/work-loops-registry-census.test.mjs:1251,1322`).
  ADR-013 §1–§4.

  Scenario: the vocabulary gains nothing — no provenance, no origin, no scope
    Given the loader's admitted keys after this story
    Then `ADMITTED_KEYS` is unchanged
    And `NODE_KINDS` is still exactly `loop` and `actor`
    And `POINTER_SCHEMES` is still exactly `module`, `command` and `config`
    And `ENDPOINT_SCHEMES` is unchanged
    And no `provenance`, `origin`, `source`, `scope` or `framework` key is admitted on a record
    And 52/ADR-001 decision 3 still holds — a new node class would be a `kind:`, never a sibling directory

  Scenario: the registry has ONE source, and the loader performs no merge
    Given a repo carrying installed records
    When the registry is loaded
    Then every node comes from `.aof/loops/`
    And no second directory is read
    And no precedence rule is applied between two sources
    And no collision rule exists, because there is one source

  Scenario: a per-project value is tuned in config, never by editing a record
    Given a consumer who wants a different attempt ceiling
    When they set `work.autonomous.maxAttempts` in `.aof/aof.config.json`
    Then the shipped record is unmodified
    And `aof work update` plans `skip` for it
    And the record still cites `config:work.autonomous.maxAttempts`, which now names their value
    And nothing about the tune is at risk from a bundle refresh

  Scenario: the config file the pointer names is not managed by the bundle
    Given the shipped manifest and the install lock
    Then neither carries an entry for `.aof/aof.config.json`
    And `work update` therefore plans no action against it
    And a consumer's config edits can be neither drift-warned nor overwritten by an update
    And this is the property that lets a record be immutable without making it inflexible

  Scenario: editing a record forks it, visibly, rather than configuring it
    Given a consumer edits `ceiling` directly in an installed record
    When `aof work update` runs
    Then the record is drift-warned and left
    And the warning recurs on every subsequent update
    And the supported path is named in the record's own prose
    And this is a fork the consumer chose, not a configuration surface aof offers

  Scenario: each delivered record says where it came from and where tuning belongs
    Given each of the nine records
    Then its body carries one line naming `src/bundle/loops/<slug>.md` as its source
    And that line says it is installed by `aof work update` and should be edited in aof, not here
    And that line points per-project values at `.aof/aof.config.json` behind a `config:` pointer
    And the line is prose in the body, never frontmatter, so no admitted key changes
    And the record still loads with zero findings

  Scenario: the records describe aof, and their citations are aof's — by construction, not by accident
    Given a consumer repo whose tree does not contain `src/run-store.mjs` or `src/bundle/commands/`
    When its registry is loaded and validated
    Then validation reports no finding about the absent paths
    And the reason is recorded rather than re-asserted: the loader validates a pointer's SHAPE only and no stat call exists on the load path, so this scenario documents a standing property and is not counted as new coverage
    And this is correct rather than a silent hole: a framework loop record describes aof's machinery, whose source is not in the consumer's tree
    And the record's own prose line is what tells an operator that, rather than a check that cannot fire

  Scenario: the deferral is recorded with a trigger, not left implicit
    Given the milestone's architecture record
    Then it states that the framework-vs-workspace split is deferred
    And it names what would discharge the deferral
    And it is not entered on the debt ledger, because the `config:` seam already answers the value case and no reader exists for the declaration case

  Examples:
    | per-project need              | mechanism today                          | needs a split? |
    | attempt ceiling               | `config:work.autonomous.maxAttempts` on two records | no |
    | a different loop owner        | `owner` is `unknown` on six of nine — nothing to override yet | no |
    | a different cadence           | fixed by aof's source; changing it changes aof | no |
    | an arbiter / timescale        | `config:` pointer, unused so far          | no             |
    | a loop aof does not ship      | none — and no reader consumes one         | **the trigger** |
    | a field `config:` cannot express | none                                   | **the trigger** |

  Examples:
    | file                      | in shipped manifest? | in install lock? | can `work update` touch it? |
    | `.aof/loops/<slug>.md`    | yes                  | yes              | create / update / drift-warn / delete |
    | `.aof/templates/work/...` | yes                  | yes              | create / update / drift-warn / delete |
    | `.aof/aof.config.json`    | **no**               | **no**           | **never**                   |
    | `.aof/aof.lock.json`      | no                   | it is the lock   | rewritten by the install    |
