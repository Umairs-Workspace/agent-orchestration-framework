@executable @cli @work @validate
Feature: One table sees every flat layer at a ceiling equal to its measured count, and the claim that no path is load-bearing is proven by a probe rather than repeated

  Three ledger entries ask for a count ratchet and each names a different directory; item 78 names why
  three would fail — the fastest-growing flat directory is the one no single entry can see. Measured
  2026-09-06, after this story's own moves: `src/` root **88** (`ls src/*.mjs | wc -l`, 159 before),
  `src/commands/` **99** (`ls -p src/commands/ | grep -v / | wc -l`), `test/` **590** direct children
  of which 589 end `.test.mjs` (`ls -p test/ | grep -v / | wc -l`), `test/arch/` **433** before this
  story's two new controls (`ls -p test/arch/ | grep -v / | wc -l`). The table lands with the first
  cut and counts the files that land with it, because a ratchet authored after the growth it questions
  ratifies that growth.

  The table's blind spot is the reason its second leg exists. Under `src/` and `test/` there are
  **21** flat directories after this story (`ls -d src/*/ test/*/`, plus the two roots, plus the two
  this story creates), and four of them are rows. A table naming four of twenty-one passes silently on
  seventeen, which is the vacuity the model control this one is built on already closed one toolchain
  over — so every flat directory is a row or a declared exemption, and neither list may be silent.

  FF-11905's half is the harder claim and the one this milestone cannot verify by outcome. A green
  suite after a move proves the move broke nothing the suites cover; it does not prove that nothing
  derived behaviour from a path. Measured today, the positive property holds and is checkable:
  `grep -n 'basename\|dirname\|path.parse' src/command-core.mjs src/spine/face.mjs` returns nothing,
  the route table is built from each command's declared `cli.route`, and `COMMANDS` is an array
  literal of imported bindings that no listing produces. `aof --help` is assembled from exactly those
  declarations, which makes it a byte-identical black-box witness across all four moves.

  One subject is added here rather than inherited, because this story measured it and no register row
  reaches it: a module that derives a repository or package root by counting directory hops from its
  OWN location is a path that IS load-bearing, and moving that module one directory deeper changes an
  answer silently. `src/work-loops.mjs:318` is the live instance and task 01 fixes it; this control is
  what stops the next one arriving unseen.

  What would quietly undo this: a ceiling set one above the delivered count "so the next story is not
  blocked", which is exactly the diff-not-conversation this instrument exists to prevent; an exemption
  list that grows a member instead of a row whenever a layer becomes inconvenient; a red probe that
  `mkdir`s into the real tree, which races every other suite reading it and leaves the plant behind on
  a crash; and a probe fed to a locally re-implemented detector, so the shipped one is never once
  driven to a violation.

  ADR-009, ADR-008, ADR-003 §2, ADR-003 §4. FF-11904, FF-11905.

  Scenario Outline: every flat layer under `src/` and `test/` is a row or a declared exemption
    Given the flat directory <layer>
    When the table is compared with the tree in both directions
    Then <disposition>

    Examples: the twenty-one, and the entry each one owes
      | layer                          | disposition                                                              |
      | src/ (root-level `.mjs`)       | a row, ceiling 88 — the count this story delivers                        |
      | src/commands/                  | a row, ceiling 99                                                        |
      | test/                          | a row, at the count measured on the day the table lands                  |
      | test/arch/                     | a row, at that day's count INCLUDING this story's own two controls       |
      | src/mesh/                      | a row or a declared exemption; as a row, 31                              |
      | src/work/                      | a row or a declared exemption; as a row, 40                              |
      | test/support/                  | a row or a declared exemption — 66 files, the largest unentered layer     |
      | src/bundle/                    | an entry that states which children it counts, since it has subdirectories |
      | the other 13 `src/` directories | a row or a declared exemption carrying its own reason                    |
      | a flat directory added later with no entry | the sweep fails, naming the directory and its count           |
      | a row naming a directory that no longer exists | the sweep fails — a missing subject is never a skip        |

  Scenario Outline: the counting rule is declared once and produces both the ceiling and the sweep
    Given the candidate <entry> under a budgeted layer
    When the layer is counted
    Then it <counted>

    Examples: the boundary cases a ceiling and a sweep must answer identically
      | entry                                   | counted                                                    |
      | a root-level `.mjs` file under `src/`   | counts toward the `src/` row                               |
      | a subdirectory of `src/`                | does not count toward the `src/` row                       |
      | a file inside `src/mesh/`               | counts toward `src/mesh/`, never toward the `src/` row     |
      | `test/installer-shell.mjs`              | counts or not by the declared rule, and the ceiling was produced by that same rule |
      | a `*.test.mjs` direct child of `test/`  | counts toward the `test/` row                              |
      | a subdirectory of `test/`               | does not count toward the `test/` row                      |
      | a direct child of `src/commands/`       | counts toward `src/commands/`                              |

  Scenario: the ceiling equals the delivered count, in every row, with no allowance
    Given the table on the day it lands
    When each row's ceiling is compared with its measured count
    Then no ceiling exceeds its measured count
    And each row declares its own allowance and every allowance is zero
    And each row carries a stated reason naming what the next growth should do instead of adding a sibling
    And a row whose ceiling is set one above its measured count fails the control

  Scenario: a new sibling in a budgeted layer fails, and it fails on the shipped detector
    Given a synthesized listing of the real tree plus one added file in a budgeted layer
    When the shipped detector is handed that listing
    Then it reports a violation naming the directory, the measured count and the ceiling
    And the same detector handed the unmodified listing in the same lane reports none
    And no directory or file was created on disk to produce the violation

  Scenario: the sweep says how much it saw, so a rename reds a row rather than emptying it
    Given the table and a tree in which a budgeted directory has been renamed
    When the sweep runs
    Then it fails naming the budgeted subject it could not find
    And on the real tree it reports the number of files it counted and the number of layers it saw
    And a sweep that cannot read a layer fails rather than reporting that layer clean

  Scenario: a layer that shrinks must lower its row
    Given a budgeted layer whose measured count has fallen below its ceiling
    When the sweep runs
    Then it fails, naming the row and the freed slots
    And lowering the row to the new measured count clears it
    And raising a row above its measured count never clears anything

  Scenario: the registered surface is read from the registry, and no path reaches an identifier
    Given the command registry and the CLI face
    When their sources are examined
    Then neither derives a route, a command id, a registry key, a lane membership, a bundle target or a registry ordering from a filename or a directory name
    And the route table is built from each command's declared route words
    And the registered order is a declared array order, not a directory listing
    And the registered set, its routes and its declared flags are read from the registry rather than from any path

  Scenario: no module derives a repository or package root by counting hops from its own location
    Given every module under `src/mesh/` and `src/work/`
    When their sources are examined
    Then none resolves a repository or package root from its own module location by directory-hop arithmetic
    And a module that needs one obtains it from a seam that does not change with the module's depth
    And the control names the module and the constant when it finds one

  Scenario: the red probes fire on the shipped detectors
    Given a route synthesized from a file's base name in the face, and a module deriving its root by hops from its own location
    When each is handed to the shipped detector that owns it
    Then each reports a violation naming the file and the derivation
    And the unmodified sources handed to the same detectors in the same lane report none
    And neither probe writes to the real tree

  Scenario: the black-box witness is unchanged across all four moves
    Given `aof --help` captured before this story's first move
    When it is captured again after the last one
    Then the two are byte-identical
    And the registered command ids, their routes and their declared flags are identical
    And no command's exit code or coded outcome changed
