@executable @cli @work @work-stream
Feature: listItems walks the stream, the backlog and the archive, and a row says which

  `listItems` (`src/work.mjs:392-424`) is the seam 302 importers reach the tree through
  (`aof graph impact src/work.mjs`, 2026-09-11), and it walks exactly one root with one regex:
  `ITEM_RE` (`:69`), `/^(\d+)_(milestone|story|task|uat|spike|chore)_([a-z0-9-]+)$/`. The view
  short-circuit at `:393` (`if (Array.isArray(view?.items)) return view.items;`) is untouched by this
  story — the cache row shape is story 04's.

  Two roots are added inside that one function (ADR-001 §1). `<workDir>/backlog/**` is walked
  recursively: a directory that does NOT match the new leaf grammar is a GROUP and is descended
  into; one that matches is a LEAF and is not descended (a backlog driver has no `stories/`, ADR-005
  §4). `<workDir>/archive/` is walked flat with `ITEM_RE`, name verbatim, its milestones' `stories/`
  walked exactly as at the root. Each root is walked only when it exists — a project with neither
  is byte-identical to today, which is what every one of the eight suites that assert the frozen
  seven-key row rely on (`test/arch/work/acd-work-list-contract.test.mjs:25`,
  `test/store/cache-read-boundary-holds.test.mjs:365`, and six more by the same grep).

  The leaf grammar is a SECOND exported constant beside `ITEM_RE`, in the same file (ADR-001 §2):
  `BACKLOG_ITEM_RE = /^(milestone|story|chore|spike|uat)_([a-z0-9-]+)$/`. `task` is deliberately
  absent — a task is never a backlog driver. Compat is by construction (ADR-001 §6): neither
  `backlog` nor `archive` matches `ITEM_RE`, so a pre-127 reader ignores both roots exactly as it
  ignores `wiki/work/TECH_DEBT.md` today.

  THE THREE-ROOT FIXTURE, named here once and driven by every task in this story:

    <work>/10_milestone_alpha/SPEC.md            in-progress   + stories/00_story_alpha-one/STORY.md  not-started
    <work>/11_chore_beta/CHORE.md                not-started   depends: [05]
    <work>/backlog/chore_gamma/CHORE.md                        (group "")
    <work>/backlog/ideas/milestone_delta/SPEC.md               (group "ideas")
    <work>/backlog/ideas/later/spike_epsilon/SPIKE.md          (group "ideas/later")
    <work>/archive/05_milestone_zeta/SPEC.md     done          + stories/00_story_zeta-one/STORY.md   done
    <work>/archive/06_chore_eta/CHORE.md         done
    <work>/TECH_DEBT.md                                        (a file at the root, unmatched today)

  Every record doc in the fixture carries `schema: 1` beside its status, or `validateWork` adds a
  `schema 0 is behind the current schema 1` finding (`work.mjs:1171`) to every count task 03 states.

  What would quietly undo this: a `listBacklog` beside `listItems` (three enumerators is the disease
  ADR-001 treats); a backlog walk that opens a record doc to classify (the type is in the folder name
  so the scanner never opens a doc — SPEC §Scope); a group encoded as a frontmatter key rather than a
  path; `archive/` gaining groups (a second grouping grammar is a second scanner's worth of rules).

  ADR-001 §1, §2, §4, §6.

  Scenario: a project with neither root is byte-identical to today
    Given a work directory holding only `10_milestone_alpha` with its story and `11_chore_beta`
    When `listItems` enumerates it
    Then it returns exactly the three rows it returned before this story, in the same order
    And every row's key set is exactly `number, type, slug, name, dir, ref, parent`
    And no row carries a `backlog` key or an `archived` key

  Scenario: the backlog is walked recursively and a row names its group as a path
    Given the three-root fixture
    When `listItems` enumerates it
    Then the row for `backlog/chore_gamma` is `{ number: null, type: "chore", slug: "gamma", name: "chore_gamma", ref: "gamma", parent: null, backlog: "" }` with `dir` the leaf's absolute path
    And the row for `backlog/ideas/milestone_delta` carries `backlog: "ideas"` and `ref: "delta"`
    And the row for `backlog/ideas/later/spike_epsilon` carries `backlog: "ideas/later"`, forward-slashed on every platform
    And no row is produced for the group directories `ideas` or `ideas/later` themselves

  Scenario: a backlog leaf is never descended, and a task is never a backlog driver
    Given the three-root fixture, plus `backlog/ideas/milestone_delta/stories/00_story_stray/STORY.md` and `backlog/task_lonely/`
    When `listItems` enumerates it
    Then no row is produced for `00_story_stray`
    And no row is produced for `task_lonely`, because `task` is not in the leaf grammar
    And `task_lonely` is treated as a group and descended into, yielding nothing

  Scenario Outline: the leaf grammar decides what a directory under backlog/ is
    Given the three-root fixture, plus an empty directory `backlog/<name>/`
    When `listItems` enumerates it
    Then `<name>` is a <kind>
    And the rows it contributes are <rows>

    Examples: leaves, groups, and the near-misses the grammar refuses
      | name           | kind  | rows                                                 | why                                                                          |
      | milestone_x    | leaf  | one — `{ type: "milestone", slug: "x", ref: "x" }`   | the headline shape                                                           |
      | story_a-b      | leaf  | one — `{ type: "story", slug: "a-b", parent: null }` | a parentless story is a backlog driver (ADR-005 §3)                          |
      | uat_x          | leaf  | one — type `uat`                                     | the fifth admitted type                                                      |
      | milestone_1    | leaf  | one — slug `1`                                       | inside `[a-z0-9-]+` — but its ref is unreachable through `findWork`'s numeric branch; promote refuses it (story 02) |
      | task_x         | group | none                                                 | `task` is not in the grammar (headline)                                      |
      | Milestone_x    | group | none                                                 | the type is lowercase and the match is case-sensitive                        |
      | milestone_X    | group | none                                                 | `X` is outside `[a-z0-9-]`                                                   |
      | milestone_     | group | none                                                 | `+` needs at least one slug character                                        |
      | milestone_x_y  | group | none                                                 | `_` is not a slug character                                                  |
      | milestone-x    | group | none                                                 | the separator is `_`, not `-`                                                |
      | 10_milestone_x | group | none                                                 | a numbered name is not a leaf: `ITEM_RE` is never consulted under `backlog/` |
      | notes          | group | none                                                 | any non-matching directory is a group                                        |
      | archive        | group | none                                                 | a root name below the root is just a group                                   |

  Scenario Outline: a leaf's backlog value is its group path, verbatim and forward-slashed
    Given the three-root fixture, plus a leaf at `backlog/<path>/`
    When `listItems` enumerates it
    Then the row for it carries `backlog: "<group>"` and `ref: "<ref>"`
    And that value holds no `\` even where `path.sep` is `\`

    Examples: depth, verbatim group names, and names that look like something else
      | path                          | group          | ref     | why                                                            |
      | chore_gamma                   |                | gamma   | the top of the backlog is the empty group (headline)           |
      | ideas/later/spike_epsilon     | ideas/later    | epsilon | nested (headline)                                              |
      | a/b/c/d/uat_deep              | a/b/c/d        | deep    | depth is unbounded                                             |
      | Whatever-Case/milestone_cased | Whatever-Case  | cased   | a group name is verbatim; the grammar governs leaves only      |
      | task_lonely/milestone_inner   | task_lonely    | inner   | a non-leaf name is a group even when it looks like an item     |
      | 10_milestone_x/chore_inside   | 10_milestone_x | inside  | the same rule for a numbered-looking name                      |
      | archive/chore_x               | archive        | x       | a root name below the root is just a group                     |

  Scenario: the archive is walked with the same regex, and the location adds one flag
    Given the three-root fixture
    When `listItems` enumerates it
    Then the row for `archive/05_milestone_zeta` is `{ number: "05", type: "milestone", slug: "zeta", name: "05_milestone_zeta", ref: "05", parent: null, archived: true }` with `dir` under `archive/`
    And the row for its story is `{ number: "00", type: "story", slug: "zeta-one", ref: "05/00", parent: "05", archived: true }`
    And the row for `archive/06_chore_eta` carries `ref: "06"` and `archived: true`
    And a directory `archive/notes/` that matches neither regex yields no row and is not descended — the archive is flat

  Scenario Outline: the archive is flat, and a name ITEM_RE refuses is neither a row nor a door
    Given the three-root fixture, plus `archive/<entry>/`
    When `listItems` enumerates it
    Then that entry contributes <rows>

    Examples: what a flat archive admits, and what it silently drops
      | entry                                  | rows                                                    | why                                                             |
      | 07_uat_theta                           | one — `ref: "07"`, `archived: true`                     | any `ITEM_RE` type, name verbatim                               |
      | 08_milestone_iota/stories/00_story_one | two — `08` and `08/00` (`parent: "08"`), both archived  | a milestone's `stories/` is walked exactly as at the root       |
      | 08_chore_iota/stories/00_story_one     | one — `08` only                                         | only a milestone's `stories/` is walked, as at the root         |
      | 05_milestone_zeta/stories/typo         | none                                                    | a non-matching story folder yields nothing, as at the root      |
      | notes                                  | none                                                    | not a row, not descended — the archive has no groups (headline) |
      | ideas/06_chore_x                       | none                                                    | a group's contents are never seen                               |
      | chore_x                                | none                                                    | `BACKLOG_ITEM_RE` is never consulted under `archive/`           |
      | backlog/chore_x                        | none                                                    | a root name below the root is not a root                        |

  Scenario Outline: each root is walked only when it is a directory
    Given a work directory holding `10_milestone_alpha` with its story and `11_chore_beta`, and <state>
    When `listItems` enumerates it
    Then it returns exactly the three root rows, without throwing
    And no row carries a `backlog` key or an `archived` key

    Examples: the absent, empty and wrong-kind roots
      | state                                              | why                                                  |
      | neither `backlog` nor `archive` exists             | the headline — byte-identical to today               |
      | `backlog/` exists and is empty                     | an empty root contributes nothing                    |
      | `backlog/ideas/later/` exists with no leaf beneath | groups alone are not rows                            |
      | `archive/` exists and is empty                     | same rule for the second root                        |
      | `backlog` is a regular file                        | `readDirSafe` answers `[]`, as for any non-directory |
      | `archive` is a regular file                        | same rule                                            |

  Scenario: the walk order is the root, then the backlog, then the archive
    Given the three-root fixture
    When `listItems` enumerates it
    Then every root row precedes every backlog row, and every backlog row precedes every archived row
    And the root rows are in exactly the order the pre-story walk produced them

  Scenario: the leaf grammar has one home beside the item grammar
    Given `src/work.mjs`
    When its exports are read
    Then it exports `BACKLOG_ITEM_RE`, defined once as `/^(milestone|story|chore|spike|uat)_([a-z0-9-]+)$/`
    And `ITEM_RE` is still exported from the same file with its value unchanged
    And the two root names are spelled once in this file and exported, so no other module carries the string `"backlog"` or `"archive"` to name a root

  Scenario: a pre-127 reader ignores both roots
    Given the three-root fixture
    When the names `backlog` and `archive` are tested against `ITEM_RE`
    Then neither matches
    And a one-root walk of the fixture that admits only `ITEM_RE` directories — the pre-story rule, spelled inline in the test — yields exactly the three root rows and nothing from `backlog/` or `archive/`
    And `wiki/work/TECH_DEBT.md` at the root of this repository's own stream is, by the same rule, still not a row
