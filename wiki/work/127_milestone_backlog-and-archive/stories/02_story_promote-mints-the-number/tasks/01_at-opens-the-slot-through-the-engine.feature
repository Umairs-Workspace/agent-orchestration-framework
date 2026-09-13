@executable @cli @work @work-stream
Feature: promote --at P opens the slot through the existing engine, then moves the folder into it

  `--at P` is what `insert-*` was (SPEC §Objective): the operator names a position, every live
  top-level item at or above it shifts up by one, and the promoted folder lands in the slot. The
  shift is the EXISTING reindex engine reached through the EXISTING transition seam
  (`transitionStreamReindexed`, `src/effects/stream-transitions.mjs` — the lock guard in front,
  `reindexForInsert` as the fact, `stream.reindexed` with its remap as the event); this story adds
  no engine, no second slot-open, and no second event (ADR-003 §3, FF-12703). The one thing promote
  computes for itself is the archived-number check below — an enumeration of live top-level `n >= P`
  through `isLiveStreamRow` over `listItems`, the same predicate `selectAffected` reads, plus one —
  and it decides only whether to refuse; the count and the shift go through the helper and the seam.
  `promote.mjs` never
  imports `src/work/reindex.mjs`: the count it gates on comes through `insert-shared.mjs`'s exported
  gate helper (task 03), and the slot-open through the seam — so `reindex.mjs`'s src importers stay
  exactly `{ insert-shared.mjs, effects/stream-transitions.mjs }`.

  THE GATE IS THE INSERT GATE, VERBATIM. `work.insert.confirmThreshold` (default 5), the same
  `insert-confirm-required` code, the same message shape naming the count, `error.shifted` and
  `error.detail.shifted` on the error, `--yes` / `--force` to pass it. One gate, one code — the
  CLI-envelope suite that pins the shape (`work-insert-cli-confirm-envelope.test.mjs`) keeps
  passing through the alias unchanged. The gate is consulted ONLY when `--at` is given: an append
  opens no slot, so no count is taken and a `confirmThreshold` of `0` (which makes the delivered
  gate refuse every insert without `--yes`) leaves an append untouched. `--at` is parsed by the
  insert family's own `parsePosition` (`Number.parseInt`), so `2.5` reads as 2 exactly as it does
  for `insert-milestone`; `--at` with an omitted value, a negative or a non-numeric is
  `promote-invalid-at`.

  WHAT `--at P` MAY NOT DO: LAND ON, OR SHIFT ONTO, AN ARCHIVED NUMBER. The engine shifts LIVE rows
  only (127/01, `selectAffected`), so archived numbers stand still — and a promotion that writes a
  number an archived driver holds would put two folders on one number, in two roots. The numbers a
  promotion WRITES are `P` itself and `n + 1` for every live top-level `n >= P`; if any of them is
  held by an archived top-level row, the promotion is refused as `promote-number-archived`, naming
  EVERY colliding number and its archived folder (`error.detail.collisions` in-process — the CLI face
  flattens `detail` to top-level keys of the `--json` refusal — in ascending number order),
  BEFORE the lock, the gate and any rename. (This discharges 127/01's open gap "promote --at over an
  archived number".)

  THE SHIFT REWRITES REFERENCES IN ALL THREE ROOTS — DECIDED HERE, NOT INHERITED BY ACCIDENT.
  `rewriteReferences` re-lists through `listItems`, which since 127/01 walks the backlog and the
  archive, so a top-level shift rewrites a `depends:` entry naming a shifted number wherever the doc
  sits: a live driver, an archived driver (its edge still names the right item, and validate still
  checks it), a backlog driver (its planning note still names the right item), and — the case the
  alias depends on — the backlog leaf being promoted, whose own `depends:` is rewritten BEFORE it
  moves. The nested `parent:` rewrite likewise reaches an archived milestone's stories. Numbers
  that did not shift are byte-identical; `number:` lines outside the shift set are never touched.
  A rewritten entry keeps its own quoting, spacing and zero-pad width (`"10"` → `"11"`, `010` →
  `011`), and the body is never read — `depends:` and `parent:` are the two references.
  This is the second half of 127/01's gap, answered: yes, in every root.

  ORDER OF OPERATIONS, so a refusal is always clean: resolve → numeric-ref → record doc usable →
  destination free → depends (task 02) → archived-number → gate → [seam: lock → shift → event] →
  rename → stamp. Everything before the seam is a pure read.

  THE FIXTURE is task 00's three-root fixture: live 10, 11; archived 05, 06; the width is 2.

  What would quietly undo this: a `countShiftedByInsert` or `reindexForInsert` import in
  `promote.mjs`; a promote-specific confirm code; a shift computed by promote's own arithmetic; a
  collision check that looks only at `P` and not at the shifted numbers; a `rewriteReferences`
  that filters through `isLiveStreamRow` (an archived `depends:` would then dangle).

  ADR-003 §3, §4; ADR-002 §2; 41/ADR-004; 41/ADR-006; m42 wave (d) leg d4.

  Scenario: --at P shifts every live item at or above P and lands the folder in the slot
    Given the three-root fixture
    When `aof work promote delta --at 10 --json` runs
    Then `10_milestone_delta` exists at the root, `10_milestone_alpha` is now `11_milestone_alpha` (its story still `stories/00_story_alpha-one`, `parent: 11`) and `11_chore_beta` is now `12_chore_beta`
    And the envelope reports `{ shifted: 2, at: 10, space: "top-level", created: { ref: "10", … } }`
    And `aof work validate` reports no findings it did not report before
    And `aof work find 11 --json` answers alpha and `find 11/00` answers alpha-one — the cascade the remap carried

  Scenario: the shift raises the one existing event with its remap
    Given the three-root fixture, with the effects journal enabled for the run
    When `aof work promote delta --at 10` runs
    Then exactly one `stream.reindexed` event was appended, carrying `remap: [{ from: "11", to: "12" }, { from: "10", to: "11" }, { from: "10/00", to: "11/00" }]` in the engine's descending order, `at: 10`, `space: "top-level"`, `shifted: 2`
    And no event of any other name was appended for the promotion itself

  Scenario: an append raises no event
    Given the three-root fixture, with the effects journal enabled for the run
    When `aof work promote delta` runs (no `--at`)
    Then no `stream.reindexed` event was appended, and the envelope reports `shifted: 0`

  Scenario: --at beyond the tail shifts nothing and is not an error
    Given the three-root fixture
    When `aof work promote delta --at 20` runs
    Then `20_milestone_delta` exists, `shifted` is 0, and 10 and 11 are untouched

  Scenario: the confirm gate is the insert gate
    Given the three-root fixture, with `work.insert.confirmThreshold: 2` in the config
    When `aof work promote delta --at 10` runs without `--yes`
    Then it is refused with code `insert-confirm-required`, the message naming `2`, `error.shifted` = 2 and `error.detail.shifted` = 2
    And nothing on disk changed — 10, 11 and the backlog leaf are all at their old paths
    When `aof work promote delta --at 10 --yes` runs
    Then it proceeds exactly as the headline
    When `aof work promote gamma --at 10 --force` runs on a fresh copy
    Then it proceeds too, shifting 2 at the threshold of 2 — `--force` is the alias of `--yes` here as everywhere

  Scenario: a below-threshold shift needs no confirmation
    Given the three-root fixture, with the default threshold
    When `aof work promote delta --at 11` runs without `--yes`
    Then it proceeds, `shifted` is 1 (beta 11 → 12), and alpha is untouched

  Scenario Outline: the gate fires at the threshold and never before, and the archived check comes first
    Given the three-root fixture, plus <extra>, with `work.insert.confirmThreshold: <threshold>`
    When `aof work promote delta <flags>` runs
    Then the result is <result>

    Examples: at, below and above the threshold, with and without the bypass
      | extra           | threshold | flags           | result                                                 | why                                                                     |
      | nothing         | 1         | --at 11         | refused `insert-confirm-required`, `error.shifted` = 1 | at the threshold refuses — the comparison is at-or-above                |
      | nothing         | 1         | --at 12         | proceeds, `shifted: 0`                                 | one below                                                               |
      | nothing         | 1         | (none)          | proceeds, `shifted: 0`                                 | an append never meets the gate                                          |
      | nothing         | 2         | --at 11         | proceeds, `shifted: 1`                                 | one below                                                               |
      | nothing         | 2         | --at 10 --force | proceeds, `shifted: 2`                                 | `--force` passes a shift AT the threshold — the alias exercised, not merely accepted |
      | nothing         | 5         | --at 10         | proceeds, `shifted: 2`                                 | the default threshold: two is below five                                |
      | live 12, 13, 14 | absent    | --at 10         | refused `insert-confirm-required` naming 5             | the default is 5, and five live rows at or above 10 meet it             |
      | live 12, 13, 14 | absent    | --at 11         | proceeds, `shifted: 4`                                 | one below the default                                                   |
      | live 12, 13, 14 | absent    | --at 10 --yes   | proceeds, `shifted: 5`                                 | the bypass                                                              |
      | nothing         | 1         | --at 5          | refused `promote-number-archived`, not the gate        | the archived check precedes the gate                                    |
      | nothing         | 1         | --at 5 --yes    | refused `promote-number-archived`                      | `--yes` passes the gate, never the archive                              |
      | nothing         | 0         | --at 20         | refused `insert-confirm-required`, `error.shifted` = 0 | the delivered gate at 0 refuses every slot-open without `--yes`         |
      | nothing         | 0         | (none)          | proceeds, `shifted: 0`                                 | an append takes no count, so a threshold of 0 cannot touch it           |

  Scenario: landing on an archived number is refused before anything moves
    Given the three-root fixture
    When `aof work promote delta --at 5` runs
    Then it is refused with code `promote-number-archived`, the message naming `05` and `archive/05_milestone_zeta`
    And the backlog leaf, the stream and the archive are byte-identical to before

  Scenario: shifting a live item onto an archived number is refused too
    Given the three-root fixture, plus a live `04_chore_theta`
    When `aof work promote delta --at 4` runs
    Then it is refused with code `promote-number-archived`, the message naming `05` (theta's post-shift number) and `archive/05_milestone_zeta`
    When `aof work promote delta --at 7` runs instead
    Then it proceeds — 07 is free, and 10 and 11 shift to 11 and 12 without touching 05 or 06

  Scenario Outline: the archived-number check is over every number the promotion writes — P, and n + 1 for every live n >= P
    Given a work directory holding live top-level drivers <live> and archived top-level drivers <archived>, plus `backlog/chore_x/CHORE.md`
    When `aof work promote x <at> --yes` runs
    Then the result is <result>

    Examples: landing on, shifting onto, jumping over, and the archive above the tail
      | live   | archived   | at      | result                                                                   | why                                                                          |
      | 10, 11 | 05, 06     | --at 6  | refused `promote-number-archived` naming `06` and `archive/06_chore_eta` | P itself is written; no live row needs to shift for it to collide            |
      | 10, 11 | 05, 06     | --at 4  | `04_chore_x`, `shifted: 2`, 10 and 11 now 11 and 12                      | the writes are 4, 11, 12 — 05 and 06 sit inside the range, unmoved and uncounted |
      | 03, 04 | 05, 06     | --at 3  | refused `promote-number-archived` naming `05`                            | a two-step cascade (3 → 4 → 5) still lands on the archive                    |
      | 04     | 06         | --at 4  | `04_chore_x`, `shifted: 1`, the live 04 now 05                           | the +1 lands one short of the archive — two steps away is not a collision    |
      | 10, 11 | 05, 06, 12 | --at 10 | refused `promote-number-archived` naming `12`                            | the tail's +1 lands on an archived number ABOVE the live tail                |
      | 10, 11 | 05, 06, 12 | (none)  | `13_chore_x`, `shifted: 0`                                               | an append never collides — the mint is one past the archive too              |
      | 10, 11 | 05, 06     | --at 12 | `12_chore_x`, `shifted: 0`                                               | P equal to the append answer shifts nothing                                  |
      | none   | 05, 06     | --at 5  | refused `promote-number-archived` naming `05`                            | with no live row to shift, P is the whole check                              |
      | none   | 05, 06     | --at 7  | `07_chore_x`, `shifted: 0`                                               | a free number above an archive-only stream                                   |
      | 10, 11 | 05, 06     | --at 0  | `00_chore_x`, `shifted: 2`                                               | zero is a position, not a refusal                                            |

  Scenario: a shift rewrites the depends of a backlog leaf before it moves
    Given the three-root fixture, with `backlog/ideas/milestone_delta/SPEC.md` carrying `depends: [10]`
    When `aof work promote delta --at 10` runs
    Then `10_milestone_delta/SPEC.md` carries `depends: [11]` — it still names alpha, which moved
    And the envelope's `created.depends` is `[11]`

  Scenario: a shift rewrites references in the archive and in the rest of the backlog
    Given the three-root fixture, with `archive/06_chore_eta/CHORE.md` carrying `depends: [10]` and `backlog/chore_gamma/CHORE.md` carrying `depends: [11, 05]`
    When `aof work promote delta --at 10` runs
    Then `archive/06_chore_eta/CHORE.md` carries `depends: [11]` and its `number: 06` line is untouched
    And `backlog/chore_gamma/CHORE.md` carries `depends: [12, 05]` — the shifted entry rewritten, the archived entry byte-identical
    And `11_chore_beta` (now `12_chore_beta`) still carries `depends: [05]`

  Scenario Outline: the rewrite reaches every root, touches only the entries that shifted, and keeps each entry's own format
    Given the three-root fixture, with <doc> carrying `<line>`
    When `aof work promote delta --at 10` runs (10 → 11, 11 → 12)
    Then that doc, at its new path where it moved, carries `<after>` and is otherwise byte-identical

    Examples: three roots, two reference kinds, and the format each entry keeps
      | doc                                                            | line                       | after                  | why                                                                      |
      | `11_chore_beta/CHORE.md`                                       | `depends: [10]`            | `depends: [11]`        | a shifted live doc's own edge to another shifted item                    |
      | `11_chore_beta/CHORE.md`                                       | `depends: [010]`           | `depends: [011]`       | a leading zero keeps its original width                                  |
      | `archive/06_chore_eta/CHORE.md`                                | `depends: ["10"]`          | `depends: ["11"]`      | an archived doc is reached, and its quotes are kept                      |
      | `backlog/chore_gamma/CHORE.md`                                 | `depends: [ 10 , 05 ]`     | `depends: [ 11 , 05 ]` | spacing is kept per entry; the archived entry is untouched               |
      | `backlog/chore_gamma/CHORE.md`                                 | `depends: [9, 10]`         | `depends: [9, 11]`     | an entry below P is byte-identical                                       |
      | `backlog/ideas/later/spike_epsilon/SPIKE.md`                   | `depends: [11]`            | `depends: [12]`        | a leaf two groups deep is reached too                                    |
      | `10_milestone_alpha/stories/00_story_alpha-one/STORY.md`       | `parent: "10"`             | `parent: "11"`         | the nested parent rewrite keeps the quotes                               |
      | `archive/05_milestone_zeta/stories/00_story_zeta-one/STORY.md` | `parent: 05`               | `parent: 05`           | an archived story's parent did not shift                                 |
      | `backlog/chore_gamma/CHORE.md`                                 | a bare `number:`           | a bare `number:`       | a `number:` line outside the shift set is never touched                  |
      | `10_milestone_alpha/SPEC.md`                                   | body prose `see 10 and 11` | unchanged              | the body is never read — `depends:` and `parent:` are the two references |

  Scenario: a held item in the shift range refuses the promotion through the lock the seam already has
    Given the three-root fixture, with item `11` held by an active lease
    When `aof work promote delta --at 10` runs
    Then it is refused with the item-lock's own code naming the holder of `11`, and nothing moved

  Scenario Outline: an unusable --at is refused before any read of the stream
    Given the three-root fixture
    When `aof work promote delta --at <at>` runs
    Then it is refused with code `promote-invalid-at` and nothing changed

    Examples:
      | at   | why                                                       |
      | ""   | `--at=""` (or `at: ""` in-process) is not an append; a trailing bare `--at` on the real CLI is the face's own `missing-flag-value`, before the verb runs |
      | -1   | a position is non-negative                                |
      | ten  | `parseInt` answers NaN                                     |
      | 1e1  | `parseInt` stops at `e` and answers 1 — accepted as 1, NOT refused: listed here so the lenient parser is a decision, not a surprise |
