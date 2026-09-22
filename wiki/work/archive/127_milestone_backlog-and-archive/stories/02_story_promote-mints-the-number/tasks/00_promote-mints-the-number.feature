@executable @cli @work @work-stream
Feature: aof work promote <slug> is the one place a number is minted

  A backlog item is born with no number (127/01: `number: null`, `ref: <slug>`, `backlog: <group>`),
  and `aof work promote <slug>` is the moment it gets one and enters the stream (ADR-003 §1-§3).
  Two places mint today — the `aof:add-*` prompts' "max NN + 1" and `appendPosition`
  (`src/work-promote/promotion.mjs:52`, reached by the two `promote-*-to-chore` faces and, since
  127/01, `migrate-folder.mjs`). After this task the only minting CODE PATH is `promote`, and every
  other minter is a caller of the same `appendPosition`.

  THE VERB. `work:promote` in `src/commands/promote.mjs`, registered in `src/command-core.mjs`
  (`cli.route: ["work", "promote"]`, usage `aof work promote <slug> [--at <P>] [--yes] [--json]`,
  flags = `INSERT_FLAGS`, so `--force` stays the alias of `--yes` it is everywhere else). The
  registry's hand-kept ledgers learn the id consciously — the command-core contract's exact
  `WORK_IDS`, the CLI bijection's per-verb case, route-coverage's deferred list, the source-directory
  budget — rather than "for free"; the bundle wrapper is task 04's.

  RESOLUTION IS `findWork`'S FREE-TEXT BRANCH, NARROWED TO EXACTLY ONE BACKLOG ROW. `findWork`
  (`src/work.mjs:953`) matches free text by SUBSTRING over `slug` and `name`, so `promote delta`
  can answer `delta`, `delta-two` and a live `14_milestone_delta-lake` at once. The verb keeps only
  the rows with `number: null`, then prefers the row whose `slug` EQUALS the argument (case-
  insensitive, trimmed); exactly one such row is the target. Zero backlog rows is
  `promote-not-found` (the message lists any live/archived rows the text matched, so "already in
  the stream" is legible), and two or more backlog rows with no exact match is `promote-ambiguous`
  naming every candidate as `<group>/<name>`; two rows whose slug both EQUAL the argument (one slug
  in two groups, or two types) are the same ambiguity. An all-digit argument never reaches the free-text
  branch — `findWork("12")` is the numbered space — so it is refused up front as
  `promote-numeric-ref`, which is also where a backlog folder named `milestone_12` (127/01's
  "unreachable slug") gets its answer: rename the folder. An empty or whitespace-only argument is
  `promote-missing-slug`, refused before `findWork` is asked (a blank substring matches every row).

  THE DEFAULT POSITION IS `appendPosition`, UNCHANGED. It answers the highest number ever minted plus
  one over live AND archived rows (127/01, ADR-003 §2 as amended by that build — a number is never
  retired) and `promote.mjs` is its fourth caller; the pad width is the stream's own (the first
  numbered top-level row's `number.length`, else 2). An append shifts nothing, raises no
  `stream.reindexed` event, and needs no `--yes`. `--at P` is task 01's.

  THE MOVE AND THE STAMP. The leaf `<workDir>/backlog/[<group>/]<type>_<slug>` is RENAMED to
  `<workDir>/<NN>_<type>_<slug>` (a rename, so a folder's runs/, tasks/ and every other file travel
  verbatim); the `backlog:` group was a path and is written nowhere (ADR-003 §3). Then `number: NN`
  is stamped into the record doc's frontmatter with the SURGICAL single-line discipline
  (41/ADR-001): when the block already carries a `number:` line (the CLI scaffold writes it bare,
  task 03) that ONE line is replaced; when it carries none (a prompt-authored doc may omit it) ONE
  line `number: NN` is inserted directly after the `type:` line, terminated with the doc's own line
  ending (a CRLF doc gets a CRLF line) — a block carrying NEITHER line has no insert point and is
  `promote-record-doc-unusable` too. Whatever value a `number:` line already
  held is replaced, never read: the folder grammar made the row a backlog row, not the doc. Nothing
  else in the frontmatter is reserialised, and the body is byte-identical except for one bounded
  prose courtesy: the FIRST
  first-level heading of the record doc — and of a `STATE.md` directly in the folder, whenever one
  is there, whatever the type — gains the stream's `# NN · ` prefix when it does not already begin
  with a number, so the promoted docs read like every numbered neighbour. No other file in the
  folder is opened. `updated:` is NOT bumped — promotion is placement, not authorship.

  EVERY REFUSAL LANDS BEFORE ANY WRITE. Resolution, the numeric-ref check, the record doc's
  frontmatter block being locatable (`promote-record-doc-unusable` — the stamp must not be able to
  fail after the rename), the destination not already existing (`promote-destination-exists`) and
  task 02's `depends:` checks all run first; a refused promote leaves the backlog leaf, its group
  and the stream byte-identical.

  THE ENVELOPE (`--json`): `{ shifted, at, space: "top-level", created: { ref, type, slug, parent:
  null, dir[, depends] }, from: { ref: <slug>, backlog: <group>, dir: <old leaf dir> } }`. `created`
  is the SAME identity echo the insert family reports (41/ADR-006) so task 03's aliases return it
  verbatim; `created.depends` is present iff the record doc carries a `depends:` line, as numbers.
  The render says `Promoted "<slug>" to <NN> (appended).` or `… (at P, shifted N item(s)).`

  THE FIXTURE is 127/01's three-root fixture (`buildThreeRootFixture`, exported by
  `test/work/stream/work-backlog-archive-enumerate.test.mjs`): live `10_milestone_alpha`
  (+ `00_story_alpha-one`) and `11_chore_beta` (`depends: [05]`); backlog `chore_gamma` (group ""),
  `ideas/milestone_delta`, `ideas/later/spike_epsilon` — each with NO `number:` line; archived
  `05_milestone_zeta` (+ story) and `06_chore_eta`. `appendPosition` over it is 12.

  What would quietly undo this: a second `appendPosition` (or a `Math.max` over numbers) anywhere
  in `src/commands/`; a promote that re-serialises the frontmatter through `parseFrontmatter`; a
  promote that COPIES the folder rather than renaming it (runs/ left behind); a mint that reads
  live rows only (archiving 11 would re-mint 11 for the next promotion).

  ADR-003 §1, §2, §3; 41/ADR-001; 41/ADR-002.

  Scenario: promoting a backlog item appends it to the stream with the next number
    Given the three-root fixture
    When `aof work promote delta --json` runs
    Then the folder `backlog/ideas/milestone_delta` no longer exists and `12_milestone_delta` exists at the stream root
    And the envelope is `{ shifted: 0, at: 12, space: "top-level", created: { ref: "12", type: "milestone", slug: "delta", parent: null, dir: <root>/12_milestone_delta }, from: { ref: "delta", backlog: "ideas", dir: <the old leaf dir> } }`
    And `created` carries no `depends` key, because the fixture's SPEC.md carries no `depends:` line
    And the record doc's frontmatter now carries exactly one `number: 12` line, directly after its `type:` line
    And every other frontmatter line and the whole body are byte-identical to the backlog doc, except the heading `# Delta` which now reads `# 12 · Delta`
    And the group directory `backlog/ideas` still exists, still holding `later/spike_epsilon`

  Scenario: the four readers agree on the promoted item
    Given the three-root fixture, after `aof work promote delta`
    When `aof work find 12 --json`, `aof work find delta --json`, `aof work validate --json`, `aof work next --json` and `aof work list --json` each run
    Then `find 12` and `find delta` both answer one row `{ ref: "12", type: "milestone", slug: "delta", status: "not-started", parent: null }` carrying neither a `number` nor a `backlog` key — the frozen live-row shape
    And `validate` reports zero findings for `12_milestone_delta` and zero findings anywhere it did not report before the promotion
    And `aof work next 12 --json` answers `state: "ready"` for `12` (a live zero-story milestone is offered for break-down), where `aof work next delta` answered nothing actionable before the promotion — a backlog row is never proposed
    And `list` shows `12` after `11` and before every remaining backlog row

  Scenario: the mint reads live and archived rows, never the backlog
    Given the three-root fixture
    When `appendPosition` is read before any promotion
    Then it answers 12 — one past the highest number over `10`, `11`, `05` and `06`; the three backlog rows move neither the highest nor the count
    When `11_chore_beta` is moved under `archive/` by hand and `aof work promote gamma` runs
    Then gamma is minted `12`, not `11` — an archived number is never re-minted

  Scenario Outline: the mint is the highest number ever minted plus one, at the stream's own width
    Given a work directory holding <rows>, plus `backlog/chore_narrow/CHORE.md`
    When `aof work promote narrow --json` runs
    Then the folder `<folder>` exists at the root and its record doc carries `number: <number>`
    And the envelope reports `created.ref: "<number>"`, `at` the same number as an integer, and `shifted: 0`

    Examples: the empty stream, the widths, the gap, the archive, and the row that is not top-level
      | rows                                                   | folder           | number | why                                                                        |
      | nothing else                                           | 00_chore_narrow  | 00     | an empty stream mints the first number at the default width                |
      | `backlog/ideas/milestone_x` and `backlog/spike_y` only | 00_chore_narrow  | 00     | backlog rows hold no number — three un-numbered rows are not three numbers |
      | `100_milestone_wide`                                   | 101_chore_narrow | 101    | the stream's own width: three digits                                       |
      | `09_milestone_last`                                    | 10_chore_narrow  | 10     | the width is two and the number grows past it unpadded                     |
      | `03_milestone_gap` and `07_milestone_last`             | 08_chore_narrow  | 08     | the highest plus one, never the count — a gap is never filled              |
      | `archive/05_milestone_zeta` only                       | 06_chore_narrow  | 06     | an archive-only stream: the archived highest and width govern              |
      | `archive/007_uat_old` only                             | 008_chore_narrow | 008    | the first numbered row is archived and three wide                          |
      | `005_milestone_a` and `10_chore_b`                     | 011_chore_narrow | 011    | the first numbered top-level row by number (`005`) sets the width          |
      | `02_milestone_alpha` with `stories/07_story_seven`     | 03_chore_narrow  | 03     | a nested story is not a top-level row: its `07` moves neither highest nor width |

  Scenario: the stamp replaces a bare number line when the doc carries one
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md` rewritten so its frontmatter carries a bare `number:` line (no value) between `type:` and `slug:`
    When `aof work promote gamma` runs
    Then that line now reads `number: 12` in the same position, and no second `number:` line was inserted

  Scenario Outline: the stamp is one line — replaced where a number line exists, inserted after type: where none does
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md`'s frontmatter rewritten as <block>
    When `aof work promote gamma` runs
    Then the result is <result>, and every byte outside that one line is unchanged

    Examples: where the one line lands, what counts as a number line, and what is not a block at all
      | block                                                                  | result                                                                 | why                                                                    |
      | `type: chore` / `number: ""` / `slug: gamma` / …                       | the line reads `number: 12` — the quotes are gone                      | a quoted empty value is still the one number line, replaced whole      |
      | `type: chore` / `number: null` / `slug: gamma` / …                     | the line reads `number: 12`                                            | a literal `null` is a number line like any other                       |
      | `type: chore` / `number: 07` / `slug: gamma` / …                       | the line reads `number: 12`                                            | a stale value is replaced, never read — the row was a backlog row      |
      | `slug: gamma` / `status: not-started` / `type: chore` / … (type third) | `number: 12` is inserted as the fourth line, directly after `type:`    | after `type:` wherever it sits, not at line 2                          |
      | `type: chore` / `numbers: [1]` / `slug: gamma` / …                     | `number: 12` is inserted after `type:`; `numbers: [1]` is untouched    | `number:` is matched as a whole key                                    |
      | `slug: gamma` / `status: not-started` / … (neither `type:` nor `number:`) | refused `promote-record-doc-unusable`; the leaf is untouched        | no insert point — the stamp must not be able to fail after the rename  |
      | a `<!-- aof-generated: bundle -->` line above the opening `---`        | refused `promote-record-doc-unusable`; the leaf is untouched           | a fence that is not line 1 is not a block (41/ADR-001)                 |
      | `---` / `type: chore` / … with no closing `---`                        | refused `promote-record-doc-unusable`; the leaf is untouched           | an unclosed block is not locatable                                     |
      | an empty file                                                          | refused `promote-record-doc-unusable`; the leaf is untouched           | the headline's "no block", at its smallest                             |

  Scenario Outline: the heading courtesy is one prefix on the first H1 of the record doc and of STATE.md, and no other file is opened
    Given the three-root fixture, with `backlog/ideas/milestone_delta/SPEC.md`'s body <body> and <companion>
    When `aof work promote delta` runs
    Then the promoted SPEC.md's body is <after>, and the companion is <companionAfter>

    Examples: what "does not already begin with a number" admits, and where the courtesy stops
      | body                        | companion                                | after                                              | companionAfter         | why                                                                        |
      | `# 07 · Delta`              | none                                     | unchanged                                          | nothing created        | already begins with a number — a stale one is the operator's to fix        |
      | `# 12 Delta`                | none                                     | unchanged                                          | nothing created        | "begins with a number" is the whole test; the ` · ` is not required        |
      | prose with no heading       | none                                     | unchanged                                          | nothing created        | the courtesy adds no heading where there is none                           |
      | `## Context` then `# Delta` | none                                     | `## Context` untouched, `# Delta` is `# 12 · Delta` | nothing created        | the FIRST first-level heading, wherever it sits                            |
      | `# Delta` then `# Appendix` | none                                     | only `# Delta` gains the prefix                    | nothing created        | one heading, once                                                          |
      | `# Delta`                   | `STATE.md` with `# Delta — State`        | `# 12 · Delta`                                     | `# 12 · Delta — State` | the milestone companion gets the same courtesy                             |
      | `# Delta`                   | `STATE.md` with `# 03 · Delta — State`   | `# 12 · Delta`                                     | unchanged              | the companion follows the same begins-with-a-number test                   |
      | `# Delta`                   | `STATE.md` with no H1                    | `# 12 · Delta`                                     | unchanged              | the same bound on the companion                                            |
      | `# Delta`                   | `notes.md` with `# Delta`                | `# 12 · Delta`                                     | byte-identical         | no other file in the folder is opened                                      |

  Scenario: a promote leaves the folder's other files exactly where they were
    Given the three-root fixture, plus `backlog/chore_gamma/runs/20260901T000000000Z-0000.json` and `backlog/chore_gamma/notes.md`
    When `aof work promote gamma` runs
    Then `12_chore_gamma/runs/20260901T000000000Z-0000.json` and `12_chore_gamma/notes.md` exist with their contents byte-identical

  Scenario: the argument must resolve to exactly one backlog row
    Given the three-root fixture, plus `backlog/chore_delta-two/CHORE.md` and a live `13_milestone_delta-lake`
    When `aof work promote delta` runs
    Then it promotes `ideas/milestone_delta` — the exact slug match wins over the substring matches
    When `aof work promote delt` runs instead
    Then it is refused with code `promote-ambiguous`, the message naming `ideas/milestone_delta` and `chore_delta-two`, and nothing on disk changed
    When `aof work promote alpha` runs
    Then it is refused with code `promote-not-found`, the message naming `10_milestone_alpha` as already in the stream
    When `aof work promote nothing-here` runs
    Then it is refused with code `promote-not-found` and the message names no candidate

  Scenario Outline: the resolution matrix — what the argument reaches, and which refusal it earns
    Given the three-root fixture, plus <extra>
    When `aof work promote <argument>` runs
    Then the result is <result>, and a refusal leaves the backlog and the stream byte-identical

    Examples: exact beats substring, case and whitespace are forgiven, and only backlog rows count
      | extra                            | argument                       | result                                                                             | why                                                                              |
      | nothing                          | DELTA                          | promotes `ideas/milestone_delta`                                                   | the match is case-insensitive                                                    |
      | nothing                          | ` delta ` (padded with spaces) | promotes `ideas/milestone_delta`                                                   | the argument is trimmed                                                          |
      | nothing                          | delt                           | promotes `ideas/milestone_delta`                                                   | one substring match is one row — an exact match is only needed to break a tie    |
      | nothing                          | eps                            | promotes `ideas/later/spike_epsilon`                                               | the group is a path, never part of the match                                     |
      | nothing                          | milestone_delta                | promotes `ideas/milestone_delta`                                                   | the folder name matches too (`findWork` reads `slug` and `name`)                 |
      | nothing                          | milestone                      | promotes `ideas/milestone_delta`                                                   | alpha and zeta match by name but are not backlog rows — one backlog row is enough |
      | nothing                          | a                              | refused `promote-ambiguous` naming `chore_gamma` and `ideas/milestone_delta`       | two backlog substring matches, neither exact                                     |
      | `backlog/notes/spike_delta`      | delta                          | refused `promote-ambiguous` naming `ideas/milestone_delta` and `notes/spike_delta` | two EXACT matches — one slug in two groups is still a tie                        |
      | `backlog/chore_delta-two`        | delta-two                      | promotes `chore_delta-two`                                                         | the needle is the whole argument; `delta` does not contain `delta-two`           |
      | `backlog/chore_x1`               | x1                             | promotes `chore_x1`                                                                | a digit inside a slug is not an all-digit argument                               |
      | a live `13_milestone_delta-lake` | delta-lake                     | refused `promote-not-found` naming `13_milestone_delta-lake` as already in the stream | a slug only a live item matches                                               |
      | nothing                          | zeta                           | refused `promote-not-found` naming `archive/05_milestone_zeta`                     | an archived row is "already in the stream" too                                   |
      | nothing                          | alpha-one                      | refused `promote-not-found` naming `alpha-one` as already in the stream            | a nested story is a live row, never a backlog leaf                               |
      | nothing                          | 10/00                          | refused `promote-not-found` naming `10/00` as already in the stream                | a story ref reaches the pair branch, which holds no backlog row                  |
      | nothing                          | ideas/delta                    | refused `promote-not-found` naming no candidate                                    | `<group>/<slug>` is not a ref — the slug alone names a leaf                      |
      | nothing                          | 007                            | refused `promote-numeric-ref`                                                      | leading zeros are still all digits                                               |
      | nothing                          | 0                              | refused `promote-numeric-ref`                                                      | the smallest numbered ref                                                        |

  Scenario: an all-digit argument is refused before the numbered space is consulted
    Given the three-root fixture, plus `backlog/milestone_12/SPEC.md`
    When `aof work promote 12` runs
    Then it is refused with code `promote-numeric-ref`, the message saying a backlog item is promoted by its slug and that an all-digit slug is unreachable — rename its folder
    And `12_milestone_12` does not exist and `backlog/milestone_12` is untouched

  Scenario: a promote whose destination already exists is refused before anything moves
    Given the three-root fixture, plus a stray FILE named `12_milestone_delta` at the root (a directory of that name would be a row `listItems` enumerates, and the mint would step past it to 13)
    When `aof work promote delta` runs
    Then it is refused with code `promote-destination-exists` naming the path, and `backlog/ideas/milestone_delta` is untouched

  Scenario: a record doc without a frontmatter block is refused before the rename
    Given the three-root fixture, with `backlog/chore_gamma/CHORE.md` replaced by a file with no `---` block
    When `aof work promote gamma` runs
    Then it is refused with code `promote-record-doc-unusable`, and `backlog/chore_gamma` is untouched at its old path

  Scenario: the CLI face carries the envelope and the refusal alike
    Given the three-root fixture
    When `aof work promote delta --json` runs as a real child process
    Then it exits 0 and stdout is the envelope above, `dir` values forward-slashed
    When `aof work promote delt --json` runs as a real child process
    Then it exits 1 and stdout is `{ ok: false, error, code: "promote-ambiguous" }` — the ONE generic face's refusal shape

  Scenario: appendPosition has one home and four callers
    Given `src/**`
    When every `appendPosition` definition and call is read
    Then it is defined once, in `src/work-promote/promotion.mjs`
    And its callers are exactly `src/commands/promote.mjs`, `src/commands/promote-finding-to-chore.mjs`, `src/commands/promote-gap-to-chore.mjs` and `src/commands/migrate-folder.mjs`
