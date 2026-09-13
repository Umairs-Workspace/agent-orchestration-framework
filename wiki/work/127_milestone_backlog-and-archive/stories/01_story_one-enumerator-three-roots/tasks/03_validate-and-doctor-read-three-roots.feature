@executable @cli @work @validate
Feature: validate and doctor read all three roots as one stream, and each lane knows what a backlog row is

  `validateWork` (`src/work.mjs:1043`) and doctor's snapshot (`src/work/doctor.mjs:372`) both take
  `listItems`'s rows, so after task 00 they SEE the two new roots for free. What they do not yet know
  is what the rows mean, and four lanes read a number they may now not have:

    the record-doc check      `work.mjs:1152` — `!sameNum(meta.number ?? "", item.number)` reports
                              `frontmatter number "" ≠ folder "null"` on every backlog row: a backlog
                              record doc carries NO `number:` (ADR-005 §3), which is the rule, not a
                              defect. A `number:` present on one IS the defect.
    the driver graph          `work.mjs:1110` — `graph.set(Number.parseInt(item.number, 10), deps)`
                              keys a backlog driver at `NaN`. A backlog row gates nothing (SPEC) and
                              its `depends:` is validated at promotion (ADR-003 §6): it is never a
                              SOURCE of an edge here, and — having no number — never a target.
    the numbering lanes       `doctor-freshness.mjs:201` (`numbering-gap`), `doctor.mjs:704`
                              (`duplicate-driver-number`), `doctor-freshness.mjs:254` (`roadmap-folder-
                              mismatch`) — run over every NUMBERED row, live AND archived: an
                              archived row still holds its number, a backlog row is not a gap.
    the orphan lane           `doctor.mjs:541-556` + `orphanFolderGroup` `:668` — `backlog` and
                              `archive` at the root match neither regex and would be reported as
                              `orphan-folder` (warn) on every doctor run of every post-127 project.

  ADR-001 §3 adds one finding: two backlog leaves sharing a slug across the whole backlog tree are a
  collision — the `backlog-slug-duplicate` rule — `findWork` resolves a backlog ref by slug and a group
  carries no semantics, so `a/milestone_x` and `b/milestone_x` are one ref naming two folders. A backlog
  slug equal to a numbered item's slug is NOT a collision (the numbered item resolves by number
  first). `validateWork`'s findings are `{ path, problem }` and carry no `code` (`work.mjs:1046`; the
  CLI emits the bare array) — that shape is unchanged: the rule's name is the name of the rule, the
  `problem` text names the slug and every folder, and `path` is `<work>/backlog`.

  Doctor's orphan lane keeps its raw listing (task 01) and learns the tree: the two root names come
  from `src/work.mjs`'s exported constants, never a string literal of doctor's own; `archive/` is
  walked for orphans by the same rule as the root (and its milestones' `stories/` likewise).
  Under `backlog/` a non-matching directory is a group by definition, so the lane walks `backlog/**`
  for exactly the two shapes the enumerator drops SILENTLY there and an operator would want told
  about: a directory matching `ITEM_RE` at any depth (a numbered item moved into the backlog by
  hand — `aof work promote` is the door into the stream, and a numbered item is never de-numbered,
  SPEC §Out of scope) and a `stories/` directly under a leaf (a backlog driver has no stories,
  ADR-005 §4 — promote first). Both are `orphan-folder` at `warn`, each message naming the door.

  What would quietly undo this: a `Number.isFinite` filter AFTER a `parseInt` standing in for the
  guard (it swallows the `NaN` ADR-002 §4 says no site swallows); a backlog `depends:` scored as an
  unmet edge; `numbering-gap` filtered through `isLiveStreamRow` (which would report every archived
  number as missing); `"backlog"` spelled in `doctor.mjs`.

  ADR-001 §3, §4. ADR-002 §3, §4. ADR-003 §6.

  Scenario: a valid three-root stream validates clean
    Given the three-root fixture, every record doc valid and the backlog docs carrying no `number:`
    When `validateWork` runs unscoped
    Then it reports zero findings
    And `aof work validate --json` over the same fixture is an empty array

  Scenario Outline: a backlog record doc must not carry a number, and everything else about it is checked as at the root
    Given the three-root fixture, with `backlog/ideas/milestone_delta/SPEC.md` <edit>
    When `validateWork` runs
    Then it reports exactly <count> findings on that SPEC.md
    And the finding, where there is one, reads <finding>

    Examples: the one backlog-only rule, then the root rules applied unchanged
      | edit                             | count | finding                                                  | why                                                             |
      | carrying `number: 07`            | 1     | `frontmatter number "07" on a backlog item — a backlog item carries no number until 'aof work promote' mints one` | the backlog-only rule (ADR-005 §3) — the headline |
      | carrying `number:` with no value | 0     | none                                                     | a key with no value carries no number                           |
      | carrying `type: chore`           | 1     | `frontmatter type "chore" ≠ folder type "milestone"`     | the root message, verbatim                                      |
      | carrying `slug: other`           | 1     | `frontmatter slug "other" ≠ folder "delta"`              | the root message, verbatim                                      |
      | carrying `status: nonsense`      | 1     | `invalid status "nonsense"`                              | the root message, verbatim                                      |
      | with no `created`                | 1     | `missing created date`                                   | the root message, verbatim                                      |
      | with no `updated`                | 1     | `missing updated date`                                   | the root message, verbatim                                      |
      | empty                            | 1     | `missing or empty record doc (SPEC.md)`                  | the record doc is resolved by type, as at the root              |
      | valid, with no `number:`         | 0     | none                                                     | the clean case — never `frontmatter number "" ≠ folder "null"`  |

  Scenario: a backlog row is never a source or a target in the depends graph
    Given the three-root fixture, with `backlog/ideas/milestone_delta/SPEC.md` declaring `depends: [99, gamma]`
    When `validateWork` runs and the doctor depends lane runs
    Then neither reports the unresolvable `99` or the backlog slug `gamma` — the entry is a planning note validated at promotion
    And no graph key is `NaN`, proved by the cycle detector and the depends lane both completing with their existing findings over the live rows
    And `11_chore_beta` declaring `depends: [gamma]` IS reported by validate, because a numbered item cannot gate on a backlog slug

  Scenario Outline: a depends entry is scored by where its source lives, and resolves only to a number
    Given the three-root fixture, with <source> declaring `depends: <depends>`
    When `validateWork` runs
    Then it reports <finding>

    Examples: a backlog source is a note; a numbered source resolves to a numbered target, archived or live
      | source                                  | depends     | finding                                                                                                          | why                                              |
      | `backlog/ideas/milestone_delta/SPEC.md` | [99]        | nothing                                                                                                          | a backlog row is never a source (headline)       |
      | `backlog/ideas/milestone_delta/SPEC.md` | [gamma]     | nothing                                                                                                          | same rule                                        |
      | `backlog/ideas/milestone_delta/SPEC.md` | [11]        | nothing                                                                                                          | even a resolvable number is a planning note here |
      | `backlog/chore_gamma/CHORE.md`          | [delta, 05] | nothing                                                                                                          | same rule, any backlog type                      |
      | `11_chore_beta/CHORE.md`                | [05]        | nothing                                                                                                          | an archived milestone is a target (headline)     |
      | `11_chore_beta/CHORE.md`                | [06]        | nothing                                                                                                          | an archived chore is a target too                |
      | `11_chore_beta/CHORE.md`                | [gamma]     | `depends "gamma" does not resolve to a top-level item (a milestone, uat gate, spike, chore, or parentless story)` | today's message, verbatim (headline)             |
      | `11_chore_beta/CHORE.md`                | [delta]     | the same message, naming `delta`                                                                                 | a backlog milestone's slug is no different       |
      | `11_chore_beta/CHORE.md`                | [99]        | the same message, naming `99`                                                                                    | unchanged                                        |

  Scenario: an archived item resolves as a dependency target and its own docs are checked as at the root
    Given the three-root fixture, where `11_chore_beta` declares `depends: [05]`
    When `validateWork` runs
    Then `depends: [05]` resolves and no finding names it
    And `archive/05_milestone_zeta/stories/00_story_zeta-one/STORY.md` with `parent: 05` resolves its parent
    And the same STORY.md with `number: 03` is reported as `frontmatter number "03" ≠ folder "00"`, exactly as it would be at the root

  Scenario Outline: two backlog leaves sharing a slug are one collision, and a numbered sibling slug is not
    Given the three-root fixture, plus <added>
    When `validateWork` runs
    Then it reports <finding>

    Examples: the collision is a backlog-tree fact about one slug, whatever the type or group
      | added                                                          | finding                                                              | why                                                                  |
      | `backlog/later/milestone_delta/SPEC.md`                        | one finding on `backlog/` whose `problem` is `backlog slug "delta" names 2 folders (ideas/milestone_delta, later/milestone_delta) — a backlog ref is its slug, so one must be renamed` (the `backlog-slug-duplicate` rule; folders relative to `backlog/`, sorted) | the headline |
      | `backlog/later/chore_delta/CHORE.md`                           | one finding on `backlog/` whose `problem` names `delta` and both folders (the `backlog-slug-duplicate` rule) | a ref is a slug — the type plays no part                      |
      | `backlog/ideas/chore_gamma/CHORE.md`                           | one finding on `backlog/` whose `problem` names `gamma` and both folders (the `backlog-slug-duplicate` rule) | the root group and a named group collide too                  |
      | `backlog/later/milestone_delta/` and `backlog/x/spike_delta/`  | one finding on `backlog/` whose `problem` names `delta` and all three folders (the `backlog-slug-duplicate` rule) | one finding per slug, as `duplicate-driver-number` is one per number |
      | `12_milestone_delta/SPEC.md` at the root                       | no `backlog-slug-duplicate`                                          | the headline — the numbered item resolves by number first            |
      | `archive/07_chore_delta/CHORE.md`                              | no `backlog-slug-duplicate`                                          | an archived item is numbered                                         |
      | `backlog/ideas/milestone_delta-two/SPEC.md`                    | no `backlog-slug-duplicate`                                          | `delta-two` is another slug; substring matching is not identity      |

  Scenario: the numbering lanes run over every numbered row and no backlog row
    Given the three-root fixture, plus `06_spike_theta/SPIKE.md` at the root
    When `aof work doctor --json` runs
    Then `duplicate-driver-number` names `06` with both `06_chore_eta` (archived) and `06_spike_theta`
    And `numbering-gap` reports exactly `07`, `08` and `09` as missing — `05` and `06` are present because an archived row holds its number — and never names a backlog row
    And the `roadmap-folder-mismatch` lane, when a structured index is configured, counts the archived milestone `05` as a folder on disk

  Scenario Outline: the numbering lanes over each shape of stream
    Given <stream>
    When `aof work doctor --json` runs
    Then `numbering-gap`'s message contains <gap>, or the lane is silent where the row says nothing
    And `duplicate-driver-number`'s message contains <duplicate>, or the lane is silent where the row says nothing

    Examples: archived numbers are present; backlog rows are neither present nor missing
      | stream                                          | gap                                                                     | duplicate                                                                      | why                                                                     |
      | the three-root fixture                          | `number 07, 08, 09 are missing between 05 and 11`                       | nothing                                                                        | the archive's 05 and 06 anchor the low end                              |
      | the fixture without `archive/`                  | nothing                                                                 | nothing                                                                        | 10 and 11 are contiguous; backlog rows are not a gap                    |
      | the fixture plus `archive/20_chore_omega/`      | `number 07, 08, 09, 12, 13, 14, 15, 16, 17, 18, 19 are missing between 05 and 20` | nothing                                                              | an archived high number is present, so the live tail becomes the gap    |
      | the three backlog leaves alone                  | nothing                                                                 | nothing                                                                        | fewer than two numbers is no sequence, and no `NaN` is in it            |
      | the fixture plus `06_spike_theta/` at the root  | `number 07, 08, 09 are missing between 05 and 11`                       | `driver number 6 is shared by 2 top-level items (06_chore_eta, 06_spike_theta)` | the headline                                                           |
      | the fixture plus `archive/05_chore_dup/`        | `number 07, 08, 09 are missing between 05 and 11`                       | `driver number 5 is shared by 2 top-level items (05_chore_dup, 05_milestone_zeta)` | two archived rows on one number is still one number twice           |
      | the fixture plus `backlog/chore_eta/`           | `number 07, 08, 09 are missing between 05 and 11`                       | nothing                                                                        | a backlog slug equal to an archived slug is neither a number nor a collision |

  Scenario Outline: roadmap-folder-mismatch counts an archived milestone as a folder and a backlog milestone as nothing
    Given the three-root fixture, with `config.work.roadmap.index` set to <index>
    When `aof work doctor --json` runs
    Then `roadmap-folder-mismatch` reports <finding>

    Examples: the archived 05 is on disk; `delta` has no number an index could name
      | index                                     | finding                                                                        | why                                          |
      | `[{number: 5}, {number: 10}]`             | nothing                                                                        | both milestone folders are indexed; `delta` and the chores are not folders it counts |
      | `[{number: 10}]`                          | `milestone folder 05 exists on disk but the ROADMAP index omits it`            | the archive is on disk                       |
      | `[{number: 5}, {number: 10}, {number: 12}]` | `the ROADMAP index lists milestone 12 but no matching folder exists on disk` | unchanged                                    |
      | not configured                            | nothing                                                                        | the honest no-op, unchanged                  |

  Scenario: the orphan lane knows the two roots and walks the archive
    Given the three-root fixture, plus `archive/07_widget_x/`, `archive/05_milestone_zeta/stories/typo/`, `archive/notes/`, `backlog/Whatever-Case/`, `backlog/ideas/52_milestone_moved/` and `backlog/chore_gamma/stories/`
    When `aof work doctor --json` runs
    Then no `orphan-folder` finding names `backlog` or `archive`
    And `orphan-folder` names `archive/07_widget_x`, `archive/05_milestone_zeta/stories/typo` and `archive/notes`
    And `Whatever-Case` is not reported — a group
    And `orphan-folder` names `backlog/ideas/52_milestone_moved` with the message `folder "ideas/52_milestone_moved" is a numbered item under the backlog — a backlog item carries no number; 'aof work promote' is the door into the stream`
    And `orphan-folder` names `backlog/chore_gamma/stories` with the message `folder "chore_gamma/stories" — a backlog driver has no stories; promote it first`
    And `src/work/doctor.mjs` contains neither `"backlog"` nor `"archive"` as a whole quoted string literal (the bare word inside a longer message is not a path segment); both root names are imported from `src/work.mjs`
    And the snapshot's new entry lists default to empty, so the literal snapshots in `test/work/record/work-doctor-controls.test.mjs`, `test/arch/audit/acd-controls-never-execute.test.mjs` and `test/arch/work/acd-milestone-66-controls-resolve.test.mjs` pass unchanged

  Scenario Outline: the orphan lane's verdict per directory
    Given the three-root fixture, plus <directory>
    When `aof work doctor --json` runs
    Then `orphan-folder` <verdict>

    Examples: the roots, the archive under the root's rule, and the two shapes the backlog walk reports
      | directory                                     | verdict                                        | why                                                        |
      | nothing                                       | names neither `backlog` nor `archive`          | the two roots (headline)                                   |
      | `archive/07_widget_x/`                        | names `archive/07_widget_x`                    | `widget` is not a type (headline)                          |
      | `archive/notes/`                              | names `archive/notes`                          | the headline                                               |
      | `archive/chore_x/`                            | names `archive/chore_x`                        | the leaf grammar does not reach the archive                |
      | `archive/05_milestone_zeta/stories/typo/`     | names `archive/05_milestone_zeta/stories/typo` | a milestone's `stories/` is listed, as at the root         |
      | `archive/06_chore_eta/stories/typo/`          | names nothing under `06_chore_eta`             | only a milestone's `stories/` is listed, as at the root    |
      | `archive/README.md`                           | names nothing                                  | a file is never an orphan candidate, as at the root        |
      | `backlog/Whatever-Case/`                      | names nothing                                  | a group (headline)                                         |
      | `backlog/10_milestone_x/`                     | names `backlog/10_milestone_x`                 | a numbered item under the backlog — the enumerator drops it silently, so the lane says so |
      | `backlog/ideas/later/10_milestone_x/`         | names `backlog/ideas/later/10_milestone_x`     | at any depth                                               |
      | `backlog/chore_gamma/stories/00_story_stray/` | names `backlog/chore_gamma/stories`            | a leaf has no `stories/`; the leaf is otherwise not descended |
      | `backlog/ideas/notes/`                        | names nothing                                  | a group, at any depth                                      |
      | `10_milestone_alpha/stories/typo/`            | names `10_milestone_alpha/stories/typo`        | the root rule, unchanged                                   |

  Scenario Outline: doctor's and validate's scope grammar reach all three roots through the branches they already have
    Given the three-root fixture
    When `aof work doctor <scope> --json` and `aof work validate <scope> --json` run
    Then each scopes to exactly <items>, through `itemInScope` (`src/work/ref-scope.mjs`) with no new grammar

    Examples: the numeric, pair and slug branches, and a group that is no scope at all
      | scope | items                             | why                                                                |
      | delta | `delta`                           | the slug substring branch (headline)                               |
      | 05    | `05` and `05/00`                  | the numeric branch reaches an archived driver and its story        |
      | 05/00 | `05/00`                           | the pair branch                                                    |
      | gam   | `gamma`                           | a substring                                                        |
      | eta   | `11`, `05`, `05/00`, `06`         | a substring is a substring: `beta`, `zeta`, `zeta-one`, `eta`      |
      | ideas | validate: `[]` at exit 0; doctor: only the findings anchored at `<work>` itself (the stream-level `numbering-gap`), no item-anchored finding | a group is not a scope; an unresolved scope narrows the item-anchored findings to none, as today (`filterFindingsToScope`, `doctor.mjs:862`) |
