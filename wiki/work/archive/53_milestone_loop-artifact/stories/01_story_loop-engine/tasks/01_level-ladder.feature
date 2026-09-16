@executable @cli @work @work-stream
Feature: The level ladder — L1 and L2 admitted, L3 refused by name, and no silent downgrade

  The ladder is two frozen sets and three coded answers. `LOOP_LEVELS` is exactly
  `["L1","L2"]`; `LOCKED_LOOP_LEVELS` has exactly the key `L3`, with `unlockedBy: 55` and
  the reason 55's SPEC gives (ADR-006 §1). `--level L3` is the coded refusal
  `loop-level-locked` NAMING milestone 55, so an operator learns where the rung comes from
  rather than that it is missing; anything outside both sets is `loop-level-unknown`; an
  ABSENT level resolves to `L2`, because that is what `/aof:autonomous` means today and a
  silent downgrade to report-only would surprise every existing caller (ADR-006 §4). The
  matching is EXACT — no trim, no case fold, no coercion — one rule for the whole closed
  vocabulary, because a normalising parser is the second answer to "what level is this" and
  this milestone exists to remove second answers. So `l3` and `L3 ` are `loop-level-unknown`
  rather than locked, and the unknown refusal therefore carries BOTH lists — the two
  executable levels AND the locked keys — so the near-miss still learns the truth about L3
  without a case-folding branch anywhere near the lock (FF-5305's third leg greps for an
  executing branch keyed on `L3`; there is none, and the two frozen literals plus the
  refusal message are all that name it). Only ABSENCE inherits the default: `undefined`,
  `null` and a missing key resolve to `L2`; an empty string is a VALUE and an unknown one.
  L1 and L2 decide the SAME act, ref and phase for the same inputs — ADR-006 §3's
  report-only is a fact about what the CALLER does with a decision, not about what the
  engine decides — and the resolved level rides the decision so the two are distinguishable
  (and lands in `brief.loop.level`, ADR-004 §2, which is how 62 gates auto-apply). Refusal
  precedence is frozen too: the level is decided BEFORE the scope (ADR-006 §1), so a locked
  level with a malformed scope answers `loop-level-locked`, once. Mechanised as
  `test/work-loop-level-ladder.test.mjs`: a table-driven suite exporting `{ name, run }`
  over frozen literal fixtures — no tmpdir, no spawn, no clock — registered in
  `scripts/test.mjs` with this story (TECH_DEBT item 48). ADR-006 §1–§5, ADR-005 §3,
  ADR-004 §2.

  Scenario: `L1` and `L2` are admitted and resolve to themselves
    Given the level `L1`
    When the engine resolves the level
    Then the resolved level is `L1`
    And no refusal is decided
    And the same holds for `L2`

  Scenario: an absent level resolves to L2 — never a silent downgrade to L1
    Given an invocation with no `level` key at all
    When the engine resolves the level
    Then the resolved level is `L2`
    And it is not `L1`
    And no refusal is decided

  Scenario: `null` and `undefined` are absences and inherit the same default
    Given the level `null`, and separately the level `undefined`
    When the engine resolves each
    Then both resolve to `L2`
    And both decisions serialise identically to the decision for an absent key

  Scenario: an empty string is a value, not an absence
    Given the level `` (the empty string)
    When the engine resolves the level
    Then the decision is a refusal with code `loop-level-unknown`
    And it does not resolve to `L2` — `--level ""` is a mistake, and a default would hide it

  Scenario: `L3` is refused by name, and the refusal says who unlocks it
    Given the level `L3`
    When the engine resolves the level
    Then the decision is a refusal with code `loop-level-locked`
    And it carries `unlockedBy: 55`
    And it carries the reason `L3 requires 55's anchored measurements and enforced frozen set.`
    And no level is resolved
    And the decision carries no `ref`, no `phase` and no `drive` act — there is nothing for a caller to execute

  Scenario: the vocabulary is case-sensitive and untrimmed — `l3` is unknown, never locked-by-normalisation
    Given the level `l3`
    When the engine resolves the level
    Then the decision is a refusal with code `loop-level-unknown`
    And it is not `loop-level-locked` — nothing case-folds an input into the locked key
    And the refusal names `L3` among the locked keys, so the operator still learns why it is unavailable

  Scenario: a trailing space is not trimmed away
    Given the level `L3 ` with one trailing space
    When the engine resolves the level
    Then the decision is a refusal with code `loop-level-unknown`
    And the offending level is carried verbatim, the space included

  Scenario: an unrecognised level carries both lists
    Given the level `L4`
    When the engine resolves the level
    Then the decision is a refusal with code `loop-level-unknown`
    And it carries the executable levels `["L1","L2"]`
    And it carries the locked keys `["L3"]` with milestone 55 named
    And it carries the offending level verbatim

  Scenario: a non-string level is unknown — no coercion, no truthiness
    Given the level `2`, and separately `true`, and separately `["L2"]`
    When the engine resolves each
    Then each decision is a refusal with code `loop-level-unknown`
    And the number `2` never resolves to `L2`

  Scenario: L1 and L2 decide the SAME act for the same inputs
    Given a ready story with tasks, not done, and no phase yet driven
    When the engine decides at level `L1` and again at level `L2`
    Then both decide `drive` with phase `continue` and the same `ref`
    And the two decisions differ only in the resolved `level` they carry
    And L1's decision is not a `halt` — report-only is what the caller does with the decision, not a different decision

  Scenario: the resolved level rides every decision, so a reader can tell L1 from L2
    Given any admitted invocation
    When the engine decides
    Then the decision carries the resolved level
    And that value is exactly what `brief.loop.level` will carry (ADR-004 §2)

  Scenario: the level refusal precedes the scope refusal, and exactly one refusal is decided
    Given the level `L3` and the scope `not-a-scope`
    When the engine decides the invocation
    Then the decision is a refusal with code `loop-level-locked`
    And no `loop-scope-unsupported` is decided
    And exactly one refusal is carried

  Scenario: an unknown level also precedes the scope refusal
    Given the level `L4` and the scope `53/02`
    When the engine decides the invocation
    Then the decision is a refusal with code `loop-level-unknown`
    And no `loop-scope-unsupported` is decided

  Scenario: no input other than an explicit `L1` ever resolves to L1
    Given every input in the table below
    When the engine resolves each
    Then `L1` is resolved for exactly one of them — the literal string `L1`
    And every other input either resolves to `L2` or is refused

  Scenario: a caller that mutates a returned decision does not change the next one
    Given the level `L2`
    When the engine resolves the level, the caller deletes a key from the returned decision, and the engine resolves the same input again
    Then the second decision is complete and byte-identical to the first
    And no state is shared between two decisions

  Examples:
    | level input        | outcome  | resolved / code                          |
    | `L1`               | admitted | L1                                       |
    | `L2`               | admitted | L2                                       |
    | absent (no key)    | default  | L2                                       |
    | `undefined`        | default  | L2                                       |
    | `null`             | default  | L2                                       |
    | `L3`               | refused  | loop-level-locked — unlockedBy 55        |
    | `l1`               | refused  | loop-level-unknown                       |
    | `l2`               | refused  | loop-level-unknown                       |
    | `l3`               | refused  | loop-level-unknown — never locked        |
    | `L3 ` (trailing)   | refused  | loop-level-unknown                       |
    | ` L3` (leading)    | refused  | loop-level-unknown                       |
    | `L3\t`             | refused  | loop-level-unknown                       |
    | `L1 ` (trailing)   | refused  | loop-level-unknown — no trim             |
    | `` (empty)         | refused  | loop-level-unknown                       |
    | `   ` (spaces)     | refused  | loop-level-unknown                       |
    | `L0`               | refused  | loop-level-unknown                       |
    | `L4`               | refused  | loop-level-unknown                       |
    | `L23`              | refused  | loop-level-unknown                       |
    | `1`                | refused  | loop-level-unknown                       |
    | `2`                | refused  | loop-level-unknown                       |
    | `3`                | refused  | loop-level-unknown                       |
    | the number 1       | refused  | loop-level-unknown — no coercion         |
    | the number 2       | refused  | loop-level-unknown — no coercion         |
    | the number 3       | refused  | loop-level-unknown — no coercion         |
    | `true`             | refused  | loop-level-unknown                       |
    | `false`            | refused  | loop-level-unknown                       |
    | `["L2"]`           | refused  | loop-level-unknown                       |
    | `{ level: "L2" }`  | refused  | loop-level-unknown                       |
    | `L1,L2`            | refused  | loop-level-unknown                       |
    | `L2 L1`            | refused  | loop-level-unknown                       |

  Examples:
    | refusal            | keys carried                                                     |
    | loop-level-locked  | code, level (verbatim), unlockedBy 55, reason                    |
    | loop-level-unknown | code, level (verbatim), known ["L1","L2"], locked ["L3"] + 55    |
    | either             | no ref, no phase, no drive act — nothing for a caller to execute |
