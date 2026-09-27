@executable @cli @work @validate
Feature: `loopReady` — ONE additive key on `aof work doctor --json`, one render line, and nothing else moved

  The envelope contract. `aof work doctor --json` emits `{healthy, strict, errors, warnings,
  findings}` today (`src/commands/doctor.mjs:232-246`, RESEARCH §Q5) and gains EXACTLY ONE
  top-level key, `loopReady`, carrying ADR-007 §4's frozen shape verbatim: `{score, passed,
  applicable, clears, registry:{present, composed, error, warn}, checks:[{id, state, evidence}],
  blocking:[…]}` — seven keys, no eighth, no key renamed, no key nested differently. `clears` is
  the two-plus-one closed vocabulary `"none" | "L1" | "L2"` and **`L3` never appears in 53**
  (ADR-006 §1). `checks` is ALWAYS nine rows — the four frozen base ids of ADR-007 §5 in that
  table's order, then 52's five frozen ids in `CHECK_IDS` order (`src/work-loops-checks.mjs:59-65`)
  — present as `not-applicable` rows rather than omitted when there is no registry, which is
  52/ADR-011 §11/D2's "report absence explicitly" discipline applied one milestone later. The
  score is ADVISORY (ADR-007 §7): it emits no finding, it moves no count, and doctor's exit gate
  stays a function of the finding set alone (`doctor.mjs:248-254`) — so a repo may score 25% and
  exit 0, or score 100% and exit 1. The two ledger modes carry none of it: `--explain` and
  `--converge` return early at `doctor.mjs:96-97` and pass their envelopes through verbatim at
  `:234`, so neither gains a key and neither triggers the loop-registry read. Mechanised as
  `test/loop-ready-json-key.test.mjs` — a NEW suite reusing `test/doctor-command-core.test.mjs`'s
  harness SHAPE, that file's ONLY edit being ADR-014's one-line widening of its `doctor/00` envelope
  assertion (superseding ADR-011 §3's byte-unchanged claim): a `mkdtemp` fixture repo
  (`.aof/aof.config.json` + `wiki/work/`) driven through `loadWorkspace` +
  `invoke("work:doctor", …)` on the real registry for the shape legs, and through a spawned
  `aof work doctor` for the render, exit-code and CLI legs, all under an isolated
  `AOF_GLOBAL_HOME` — imported AND spread in `scripts/test.mjs` inside this story's own labelled
  `// milestone 53 / story 03` block, so the evidence lands with the contract rather than after it
  (ADR-011 §1, TECH_DEBT item 48).
  Every leg below phrased as "before `loopReady` existed" (`:87`, `:124`, `:125`, `:130`) is a
  RECORDED EXPECTATION, not a live before/after: checkpoint `88a91cd` already landed the key in
  `run()` and `json()`, so that baseline is no longer producible from the working tree. Each such
  leg is mechanised as a literal in the suite — the exact key list, the exact stdout line count, the
  exact exit-code table — or against a pinned git object. Mechanised as a self-comparison against
  the current build they pass vacuously, which is the one real vacuity risk in this feature.
  ADR-007 §1, §2, §4, §7; ADR-006 §1; ADR-014 (all of it — the envelope's delivered "no other
  top-level field" guarantee is NARROWED to a closed two-key set, milestone 15's `.feature` left
  untouched); 52/ADR-007 §5 and 52/ADR-011 §12.

  Scenario: `--json` gains exactly one top-level key
    Given a fixture work stream with no `loops/` directory
    When `aof work doctor --json` runs
    Then the document's top-level key set is exactly `healthy`, `strict`, `errors`, `warnings`, `findings`, `loopReady`
    And no seventh top-level key is present
    And `healthy`, `strict`, `errors` and `warnings` are still derived from `findings` alone

  Scenario: the `LoopReady` key set is exactly ADR-007 §4's frozen seven
    Given any fixture work stream
    When `aof work doctor --json` runs
    Then `loopReady`'s key set is exactly `score`, `passed`, `applicable`, `clears`, `registry`, `checks`, `blocking`
    And the set equality holds in BOTH directions — a missing key and an extra key are equally a defect
    And `registry`'s key set is exactly `present`, `composed`, `error`, `warn`
    And every element of `checks` carries the key set exactly `id`, `state`, `evidence`
    And no element of `checks` carries a `severity`, a `weight`, a `findings` array or a `count` key

  Scenario: every value is inside its declared type and closed vocabulary
    Given any fixture work stream
    When `aof work doctor --json` runs
    Then `score` is an integer between 0 and 100 inclusive — never a float, never null, never NaN
    And `passed` and `applicable` are non-negative integers with `passed` never exceeding `applicable`
    And `clears` is one of `none`, `L1`, `L2`
    And every `checks[].state` is one of `pass`, `fail`, `not-applicable`
    And every `checks[].evidence` is a non-empty string — including on a `not-applicable` row
    And `registry.present` and `registry.composed` are booleans
    And `registry.error` and `registry.warn` are non-negative integers
    And `blocking` is an array of strings, each one an `id` of some `checks` row, with no duplicates

  Scenario: `L3` never appears anywhere in the document, at any score
    Given a fixture work stream scoring 100 with every applicable check passing
    When `aof work doctor --json` runs
    Then `clears` is `L2`
    And the string `L3` appears nowhere in the `loopReady` document — not in `clears`, not in `blocking`, not in any `evidence`
    And the same holds at every other score in this feature's fixtures

  Scenario: `checks` is always nine rows, in the frozen order, registry present or absent
    Given a fixture work stream
    When `aof work doctor --json` runs
    Then `checks` has exactly 9 elements
    And their ids in order are `stream-coherent`, `cap-declared`, `memory-on`, `tasks-authored`, `grounding`, `pairing`, `reference-ownership`, `actuator-arbitration`, `timescale`
    And the first four are ADR-007 §5's table order and the last five are `CHECK_IDS`' order
    And the length and the order are identical whether or not `.aof/loops/` exists
    And no id appears twice

  Scenario: `blocking` is ordered by the same frozen check order
    Given a fixture in which `cap-declared` and `stream-coherent` both fail
    When `aof work doctor --json` runs
    Then `blocking` reads `stream-coherent` before `cap-declared` — the frozen `checks` order, never discovery order
    And no id in `blocking` names a row whose state is `not-applicable`
    And no id in `blocking` names a row whose state is `pass`

  Scenario: the human render gains exactly one line on a clean stream
    Given a fixture work stream that produces zero doctor findings
    When `aof work doctor` runs without `--json`
    Then the first line is byte-unchanged: `healthy — work stream is coherent.`
    And exactly one further line follows it
    And that line names the score as a percent, the `passed`/`applicable` fraction and the `clears` rung
    And when `blocking` is empty the line says nothing is holding the rung down
    And stdout carries exactly one more line than it did before `loopReady` existed

  Scenario: the human render gains exactly one line on a stream with findings
    Given a fixture work stream that produces three doctor findings
    When `aof work doctor` runs without `--json`
    Then the three `severity: code — message (path)` lines are byte-unchanged and in their existing order
    And exactly one further line follows them
    And that line names the blocking check ids when `blocking` is non-empty
    And no finding line is reordered, reworded or removed

  Scenario: the render line reports the denominator, so registry-absence is visible without `--json`
    Given a fixture work stream with no `loops/` directory
    When `aof work doctor` runs without `--json`
    Then the loop-ready line's fraction denominator is 4
    And on the same fixture with a `loops/` directory the denominator is 9
    And the operator can tell the two apart from the human face alone

  Scenario: `--explain` carries no `loopReady` and reads no loop registry
    Given a fixture work stream with a `loops/` directory
    When `aof work doctor --explain run-started --json` runs
    Then the document is the explain envelope, passed through verbatim
    And it carries no `loopReady` key
    And `aof work doctor --explain run-started` without `--json` emits no loop-ready line
    And `work:loops-validate` is not invoked on this path

  Scenario: `--converge` carries no `loopReady` and reads no loop registry
    Given a fixture work stream with a `loops/` directory
    When `aof work doctor --converge --json` runs
    Then the document is the converge envelope, passed through verbatim
    And it carries no `loopReady` key
    And `aof work doctor --converge` without `--json` emits no loop-ready line
    And `work:loops-validate` is not invoked on this path

  Scenario: the score is advisory — it never becomes a finding
    Given a fixture work stream scoring 25
    When `aof work doctor --json` runs
    Then no element of `findings` carries a code naming the score, the rung or any check id of `loopReady`
    And `errors` and `warnings` carry the same counts they carried before `loopReady` existed
    And the `findings` array is byte-identical to the pre-`loopReady` document's

  Scenario: the score is advisory — the exit code is a function of the findings alone
    Given the fixtures of the exit-code table below
    When `aof work doctor` runs with and without `--strict`
    Then the exit code is decided by the error/warn counts exactly as it was before `loopReady` existed
    And no score, however low, raises an exit code
    And no score, however high, lowers one

  Scenario: two fixtures with the same findings and different scores emit the same health summary
    Given fixture A declaring `work.autonomous.maxAttempts` and `memory.backend`, and fixture B declaring neither
    And both producing an identical doctor finding set
    When `aof work doctor --json` runs over each
    Then `loopReady.score` differs between them
    And `healthy`, `strict`, `errors`, `warnings` and `findings` are byte-identical between them

  Scenario: `run()`'s own return grows exactly one key, and the envelope stays CLOSED at two
    Given the real registry
    When `invoke("work:doctor", {}, ctx)` is called over a fixture
    Then the result carries `findings` exactly as before, each with the key set `code`, `severity`, `path`, `message`
    And each `finding.path` is still a raw absolute in its on-disk OS form — no relativising, no slashing
    And the result's top-level key set is exactly `findings` and `loopReady`
    And it carries no third key — the set equality holds in BOTH directions, never relaxed to "at least these"
    And the set is asserted independently of key ORDER, which neither 15/00 nor 53 ever contracted

  Scenario: the closed two-key set holds in every registry state, not just the one the legacy fixture reaches
    Given the real registry
    When `invoke("work:doctor", {}, ctx)` is called with no `loops/` directory, with one present, and with `loops` a regular file
    Then the top-level key set is exactly `findings` and `loopReady` in all three
    And `loopReady` is a present object in all three — never an assigned `undefined`, which a key-set check still counts while `--json` silently drops it
    And the registry-fault state reaches this leg too, so a swallowed exception cannot leave the key absent unnoticed

  Examples: the exit code is decided by findings, never by the score
    | loopReady.score | error findings | warn findings | --strict | exit code |
    | 100             | 0              | 0             | no       | 0         |
    | 100             | 0              | 0             | yes      | 0         |
    | 100             | 0              | 2             | no       | 0         |
    | 100             | 0              | 2             | yes      | 1         |
    | 75              | 0              | 1             | no       | 0         |
    | 75              | 0              | 1             | yes      | 1         |
    | 50              | 0              | 0             | no       | 0         |
    | 50              | 0              | 0             | yes      | 0         |
    | 25              | 0              | 0             | no       | 0         |
    | 25              | 0              | 0             | yes      | 0         |
    | 25              | 0              | 4             | no       | 0         |
    | 25              | 0              | 4             | yes      | 1         |
    | 11              | 0              | 0             | no       | 0         |
    | 11              | 0              | 0             | yes      | 0         |
    | 75              | 1              | 0             | no       | 1         |
    | 50              | 1              | 0             | yes      | 1         |
    | 0               | 3              | 0             | no       | 1         |
    | 0               | 3              | 5             | yes      | 1         |

  Examples: the closed vocabularies, exhaustively
    | field            | admitted values                        | never                                     |
    | clears           | none, L1, L2                           | L3, L0, null, "", a number                |
    | checks[].state   | pass, fail, not-applicable             | skipped, unknown, n/a, absent, null       |
    | checks[].id      | the frozen nine, in the frozen order   | any tenth id in milestone 53              |
    | registry.present | true, false                            | null, "false", absent                     |
    | registry.composed| true, false                            | null, "false", absent                     |

  Examples: the modes and what each carries
    | invocation                              | `loopReady` key | loop-ready render line | `work:loops-validate` invoked |
    | `aof work doctor --json`                | yes             | n/a — no render        | yes                           |
    | `aof work doctor`                       | n/a — no json   | yes, exactly one       | yes                           |
    | `aof work doctor 53 --json`             | yes             | n/a — no render        | yes                           |
    | `aof work doctor --strict --json`       | yes             | n/a — no render        | yes                           |
    | `aof work doctor --strict`              | n/a — no json   | yes, exactly one       | yes                           |
    | `aof work doctor --explain <event> --json` | no           | no                     | no                            |
    | `aof work doctor --explain <event>`     | no              | no                     | no                            |
    | `aof work doctor --converge --json`     | no              | no                     | no                            |
    | `aof work doctor --converge`            | no              | no                     | no                            |
