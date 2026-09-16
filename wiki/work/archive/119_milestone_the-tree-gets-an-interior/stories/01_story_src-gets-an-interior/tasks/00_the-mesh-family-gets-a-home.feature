@executable @cli @work @work-stream
Feature: The mesh family becomes `src/mesh/`, and the only other thing that changes anywhere in the tree is an import specifier

  Thirty-one root modules already spell the family in their own names, and nothing in the tree makes
  that a fact a reader can stand on. Measured 2026-09-06: `ls src/mesh-*.mjs | wc -l` is **31** of the
  **159** `ls src/*.mjs | wc -l` reports. Stripping the prefix collides with nothing —
  `ls src/mesh-*.mjs | sed 's|src/mesh-||' | sort | uniq -d` is empty — so the move is mechanical, and
  the whole of the diff is a file at a new path plus the specifier that points at it (ADR-008).

  The rewrite's size was measured rather than estimated, because it decides whether this is one act or
  a wave. **315** files carry an import specifier of a `mesh-*` module and spell it **752** times
  (`grep -rlE '(from|import\()\s*"[^"]*\bmesh-[a-z0-9-]+\.mjs"' src test scripts app ui | wc -l`, and
  the same expression with `-rhoE | wc -l`). None of them is a route, an id or a registry key — that
  claim is ADR-008's and it is proven, not asserted, in `03_every-flat-layer-is-a-row.feature`.

  The citation price is the reason this task is admitted at all: `grep -ro 'src/mesh-[a-z0-9-]*\.mjs'
  wiki/ | wc -l` is **1,500** across 293 documents, every one of them in a record no legal edit may
  touch. ADR-004's resolver landed in `119/00` and is what turns a permanent silent strand into a
  citation that still resolves. Without it this task would be refused on chore 106's arithmetic.

  What would quietly undo this: a rule matching the substring `mesh` rather than the filename prefix
  `mesh-`, which sweeps `src/board-mesh-execution.mjs` and `src/global-mesh-query.mjs` into a family
  neither belongs to; a body edit smuggled into the move, which would cost `src/mesh/worker-execution.mjs`
  the pure-move property ADR-005 records and ADR-007's split depends on; and an arch control left
  pointing at `src/mesh-*.mjs` that reads GREEN because it skips a subject it cannot find instead of
  failing on it — the silent-carrier species ADR-003 names, measured live in `01_the-work-family-gets-a-home.feature`.

  ADR-005 §1, ADR-008, ADR-004. FF-11905.

  Scenario: the family is a directory, and the root falls by exactly the family's size
    Given the tree before this task, where `ls src/*.mjs | wc -l` reports 159 and `ls src/mesh-*.mjs | wc -l` reports 31
    When the family is moved
    Then `src/mesh/` holds 31 modules
    And no `src/mesh-*.mjs` remains at the root
    And `ls src/*.mjs | wc -l` reports 128
    And every moved module's new name is its old name with the `mesh-` prefix removed

  Scenario Outline: membership is the filename PREFIX, never the substring
    Given the root module <module>
    When the family membership rule is applied
    Then it <verdict>

    Examples: the family, and the four near-misses a substring match would swallow
      | module                          | verdict                                          |
      | src/mesh-fabric.mjs             | moves to src/mesh/fabric.mjs                     |
      | src/mesh-assignment.mjs         | moves to src/mesh/assignment.mjs                 |
      | src/mesh-assignment-directive.mjs | moves to src/mesh/assignment-directive.mjs     |
      | src/mesh-worker-execution.mjs   | moves to src/mesh/worker-execution.mjs           |
      | src/mesh-worktree.mjs           | moves to src/mesh/worktree.mjs                   |
      | src/board-mesh-execution.mjs    | stays at the root — `mesh` is not its prefix     |
      | src/global-mesh-query.mjs       | stays at the root — `mesh` is not its prefix     |
      | src/board-worker-stream.mjs     | stays at the root — it is task 02's rename       |
      | src/commands/mesh-heartbeat.mjs | stays — `src/commands/` is story 119/02's         |

  Scenario: every dependent resolves, and no specifier of the old form survives anywhere
    Given the 315 files that carried a `mesh-*` import specifier
    When the family has moved and their specifiers have been rewritten
    Then a search for an import specifier of the form `mesh-<name>.mjs` over `src`, `test`, `scripts`, `app` and `ui` returns nothing
    And each of the 752 rewritten specifiers resolves to a file that exists
    And every module under `src/mesh/` loads as an entry point without a resolution error

  Scenario: the move is a move — nothing but the file's own outward specifiers differs
    Given each of the 31 modules at its old path and at its new path
    When the two are compared
    Then the only lines that differ are its own relative import specifiers, re-based one directory deeper
    And no exported name is added, removed or renamed in any of the 31
    And `src/mesh/worker-execution.mjs` differs from `src/mesh-worker-execution.mjs` in nothing else at all

  Scenario Outline: a control whose subject moved is RE-POINTED or RED — never quietly green
    Given a control under `test/arch/` whose subject is <subject>
    When the family has moved
    Then the control <outcome>

    Examples: 178 controls hold 422 non-comment `src/(mesh|work)-*.mjs` path literals, measured 2026-09-06
      | subject                                       | outcome                                                              |
      | a `src/mesh-*.mjs` path literal it reads       | names the module at `src/mesh/<name>.mjs` and still reads it          |
      | a `src/mesh-*.mjs` path literal left unchanged | fails naming the path it could not read                              |
      | a subject set filtered by a `mesh-` prefix     | is re-pointed and still reports a non-empty swept set                |
      | a subject it cannot find                       | fails — a missing subject is never a skip                            |

  Scenario: the mesh command surface answers exactly as it did
    Given the registered mesh commands before the move
    When each is invoked after the move with the same arguments
    Then each returns the same result shape, the same coded outcomes and the same exit code
    And `aof mesh status --json` and `aof mesh identity --json` are unchanged apart from live timestamps
    And no command id, route or declared flag changed
