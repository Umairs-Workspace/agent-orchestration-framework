@executable @cli @adapter @distribution
Feature: The three families the filenames already declare get directories, and a move is a path plus a specifier

  `ls src/commands/*.mjs | wc -l` is 99, and 32 of those names already spell their family:
  `ls src/commands/mesh-*.mjs | wc -l` 17, `assets-*` 9, `graph-*` 6. Stripping the prefix collides
  with nothing — `ls src/commands/mesh-*.mjs | sed 's|src/commands/mesh-||' | sort | uniq -d` is
  empty for each of the three — so the directories are a rename of what the filenames already say.
  99 -> 67.

  Item 78 says the route table is unaffected because a command's route is declared, not derived from
  its path. Measured, that is true and it is not the whole diff. `grep -c '"\./commands/mesh-'
  src/command-core.mjs` is 14, `assets-` 9, `graph-` 5 — 28 specifiers in the file this story is the
  milestone's SOLE writer of (ADR-006 §2) — and resolving every relative specifier under `src/`,
  `test/`, `scripts/` and `ui/` to `src/commands/<basename>` finds 30 more importer files outside
  that file and outside the directory: `src/cli.mjs`, 27 suites, and 2 `test/support/` fixtures.

  Three crossings behave differently and each is its own failure. `src/commands/mesh-gate.mjs` is
  imported by SEVEN siblings that do not move — `doc.mjs`, `doctor.mjs`, `loop.mjs`, `resume.mjs`,
  `run-retry.mjs`, `run-start.mjs`, `tasks.mjs` — so after the move it is not an intra-directory
  leaf; it is a leaf seven flat modules reach into a directory for. `assets-apply.mjs` and
  `assets-validate.mjs` import `./validate-shared.mjs`, which stays flat. And every moved module's
  own outward specifiers gain a level: `../command-error.mjs` 11 times, `../workspace.mjs` 9,
  `../fs.mjs` 5.

  Two controls sweep this directory by FILENAME PREFIX, and they fail differently — ADR-003's
  distinction, over this story's own tree. `test/arch/acd-mesh-ui-single-data-command.test.mjs:73`
  filters `n.startsWith("mesh-")` inside a `try/catch` that sets `files = []`, then asserts
  `joiners.length <= 1`: after the move it passes over nothing, silently, forever.
  `test/arch/acd-graph-no-face-spawn.test.mjs:165` filters `/^graph-.*\.mjs$/` and is backed by
  `assert.ok(commandFiles.length >= 3, …)`: it goes red and names itself. One is the defect, one is a
  control working; both are re-pointed in this diff.

  Nothing routes off a path, which is why the move is safe rather than lucky: `src/spine/face.mjs`
  spells no `path.` at all, `deriveRouteTable(listCommands())` keys on each command's declared
  `cli.route`, and both bijection controls filter `command.id.startsWith("mesh:")` — an id, not a
  filename. 305 wiki citations across 123 documents name the moved paths (`grep -ro
  'src/commands/\(mesh\|assets\|graph\)-[a-z0-9-]*\.mjs' wiki/ | wc -l` = 225 + 21 + 59); they
  resolve through the git rename records ADR-004's resolver reads, which 119/00 lands first.

  What would quietly undo this: a sweep that keeps passing on a smaller subject set, because a
  non-recursive `readdir("src/commands")` loses 32 modules without erroring; a leaf left flat
  "because the registry does not import it"; a second copy of a moved module left behind so an
  un-rewritten specifier keeps resolving; and a route, command id or bundle target newly computed
  from a basename.

  ADR-006 §1, §2. ADR-008. FF-11905, FF-11908.

  Scenario: the registered surface is identical across the move
    Given the registry before the move
    When the three families have moved and every specifier is rewritten
    Then `listCommands()` returns the same 105 command ids in the same array order
    And each command's declared `cli.route`, `cli.spec` and flag vocabulary is unchanged
    And every registered `mesh:*`, `assets:*` and `graph:*` verb is still CLI-reachable by its route

  Scenario Outline: each family becomes its directory, prefix stripped, colliding with nothing
    Given the <count> `src/commands/<family>-*.mjs` modules
    When they move to `src/commands/<family>/` with the family prefix stripped
    Then `src/commands/<family>/` holds <count> modules
    And no two stripped names collide
    And `ls src/commands/<family>-*.mjs` matches nothing

    Examples: the three families, in the order their size justifies
      | family | count |
      | mesh   | 17    |
      | assets | 9     |
      | graph  | 6     |

  Scenario Outline: every specifier is rewritten in the direction its crossing demands
    Given the specifier <specifier> in <holder>
    When the three families have moved
    Then it reads <after>
    And it resolves to a file that exists

    Examples: the crossings, including the two an inward-only rewrite would miss
      | specifier                         | holder                                   | after                             |
      | "./commands/mesh-assign.mjs"      | src/command-core.mjs (28 such)           | "./commands/mesh/assign.mjs"      |
      | "./commands/mesh-session.mjs"     | src/cli.mjs                              | "./commands/mesh/session.mjs"     |
      | "../src/commands/graph-build.mjs" | a suite under test/ (27 such files)      | "../src/commands/graph/build.mjs" |
      | "./mesh-face-shared.mjs"          | a moved mesh module (13 such)            | "./face-shared.mjs"               |
      | "./graph-shared.mjs"              | a moved graph module (3 such)            | "./shared.mjs"                    |
      | "./mesh-identity.mjs"             | mesh-heartbeat.mjs and mesh-session.mjs  | "./identity.mjs"                  |
      | "./mesh-gate.mjs"                 | a sibling that STAYS flat (7 such)       | "./mesh/gate.mjs"                 |
      | "./validate-shared.mjs"           | assets-apply.mjs and assets-validate.mjs | "../validate-shared.mjs"          |
      | "../command-error.mjs"            | a moved module (11 such)                 | "../../command-error.mjs"         |

  Scenario: no control's subject set shrinks in silence
    Given every control that reads `src/commands/` by directory listing
    When the three families have moved
    Then each such control reaches the same 99 command modules it reached before
    And the `mesh-` sweep in `acd-mesh-ui-single-data-command` is non-empty and names what it read
    And the `graph-` sweep in `acd-graph-no-face-spawn` still satisfies its own floor of three

  Scenario: the diff is a path and a specifier, and nothing else
    Given the 32 moved modules
    When each is compared with its content before the move
    Then the only lines that differ are its own import specifiers
    And no moved module's exported names change
    And no file remains at a pre-move path, and no module exists at both paths

  Scenario: no route, id, lane or bundle target is derived from a path
    Given the registry and the CLI face after the move
    When they are examined for path-derived identifiers
    Then no command id, `cli.route`, lane membership or bundle target is computed from a basename or a directory name
    And `COMMANDS` order is a declared array order that the route table reads

  Scenario: a citation to a moved module resolves through the rename rather than stranding
    Given the 305 `src/commands/{mesh,assets,graph}-*.mjs` citations in 123 wiki documents
    When `aof work doctor` runs after the move
    Then no moved module's path is reported as an unresolvable citation
    And the recorded ceiling on unresolvable `src/` citations does not rise
