@executable @cli @work @work-stream
Feature: The work family becomes `src/work/` without taking `src/work.mjs` or the five sub-family directories with it — and the three places a path really is load-bearing are found by test, not by assertion

  `ls src/work-*.mjs | wc -l` is **40** (2026-09-06), and stripping the prefix collides with nothing:
  `ls src/work-*.mjs | sed 's|src/work-||' | sort | uniq -d` is empty. With task 00's 31 the root goes
  159 → **88**, the 44.7% ADR-005 prices. **455** files carry a `work-*` import specifier and spell it
  **666** times (`grep -rlE '(from|import\()\s*"[^"]*\bwork-[a-z0-9-]+\.mjs"' src test scripts app ui | wc -l`,
  then `-rhoE | wc -l`).

  Two things do NOT move and both are graph-grounded. `src/work.mjs` has **293** dependents
  (`aof graph impact src/work.mjs`, build 2026-09-06T00:48:13.342Z) and is the one non-command module
  the registry imports; moving it would drag `src/command-core.mjs` into this story's write set, which
  ADR-006 needs kept out. The five `src/work-*/` directories were priced at **536** wiki citations
  (`grep -ro 'src/work-\(acceptor\|audit\|promote\|trigger\|tune\)/' wiki/ | wc -l`) for zero reduction
  in root modules, because item 10's metric counts root-level `.mjs` and a directory is not one.
  ADR-005 §3, §4 refuse both, and a task that moves either is wrong.

  ADR-008's claim — that a move plus an import rewrite changes nothing — is TRUE of this family only
  after three measured exceptions are handled, and each was found by grep at this refine rather than
  assumed away. (1) `src/work-loops.mjs:318` derives the package root from its OWN location with two
  `path.dirname` hops; one directory deeper that constant resolves to `src/`, and every framework loop
  record's ceiling pointer silently stops resolving. It is the only self-located constant in the
  71-module moving set (`grep -ln 'import.meta.url' src/mesh-*.mjs src/work-*.mjs` returns five files;
  four are comments or a main-module guard). (2) `src/work-audit/census.mjs:445` stores the audit's
  child program as a spawn argv string — a path that is load-bearing at RUNTIME, where a wrong one
  fails in a subprocess rather than at resolution. (3) **Five** arch controls gate their real assertion
  behind `existsSync` over a moving subject and return green having asserted nothing: four on
  `src/work-upgrade.mjs`, one on `src/work-read.mjs`. That is ADR-003's silent-carrier species, live,
  in this exact write set.

  What would quietly undo this: a glob of `src/work*` rather than the prefix `work-`, which takes
  `src/work.mjs`, `src/workspace.mjs` and `src/worker-stream-client.mjs` with it; nesting the five
  sub-family directories "while we are here"; and re-pointing a silently-skipping control by deleting
  its `existsSync` guard's subject instead of its path, which converts a silent pass into a permanent
  one.

  ADR-005 §2, §3, §4, ADR-008, ADR-003. FF-11905.

  Scenario: the family is a directory and the root reaches its measured floor
    Given task 00 has landed and `ls src/*.mjs | wc -l` reports 128
    When the 40 `src/work-*.mjs` modules are moved
    Then `src/work/` holds 40 modules
    And `ls src/*.mjs | wc -l` reports 88
    And `ls -d src/work-*/ | wc -l` still reports 5, at their original paths
    And `src/work.mjs` is still at `src/work.mjs`

  Scenario Outline: membership is the filename prefix `work-`, and the god-node is outside it
    Given the root module <module>
    When the family membership rule is applied
    Then it <verdict>

    Examples: the family, and the seven near-misses a `work*` glob would swallow
      | module                        | verdict                                              |
      | src/work-loops.mjs            | moves to src/work/loops.mjs                          |
      | src/work-read.mjs             | moves to src/work/read.mjs                           |
      | src/work-upgrade.mjs          | moves to src/work/upgrade.mjs                        |
      | src/work-audit-probe.mjs      | moves to src/work/audit-probe.mjs                    |
      | src/work-doctor.mjs           | moves to src/work/doctor.mjs                         |
      | src/work.mjs                  | stays — 293 dependents, ADR-005 §4                   |
      | src/workspace.mjs             | stays — `work-` is not its prefix                    |
      | src/worker-stream-client.mjs  | stays — `work-` is not its prefix                    |
      | src/frameworks.mjs            | stays — `work` is a substring, not a prefix          |
      | src/global-work-store.mjs     | stays — the prefix is at the front or nowhere        |
      | src/mesh-worktree.mjs         | stays out of this family — task 00 already took it   |
      | src/work-audit/census.mjs     | stays — a sub-family directory is not nested, ADR-005 §3 |

  Scenario: every dependent resolves, and no specifier of the old form survives
    Given the 455 files that carried a `work-*` import specifier
    When the family has moved and their specifiers have been rewritten
    Then a search for an import specifier of the form `work-<name>.mjs` over `src`, `test`, `scripts`, `app` and `ui` returns nothing
    And each of the 666 rewritten specifiers resolves to a file that exists
    And the specifiers inside the five `src/work-*/` directories that reached the family reach it at its new home

  Scenario: the self-located package root still names the repository, not `src/`
    Given a framework loop record whose ceiling declares a pointer the package root resolves
    When the loop registry is read after the move
    Then that pointer resolves
    And no `loop-ceiling-pointer-unresolved` finding is reported for it
    And the resolution root is derived from something other than the module's own directory depth

  Scenario: the audit's child program is still spawnable at the path that is stored for it
    Given the audit's assembled-suite probe, whose program path is stored as a spawn argument
    When `aof work audit` assembles the suite after the move
    Then the probe process starts and returns its result document
    And the run reports no missing-program failure
    And the stored program path names a file that exists

  Scenario Outline: a control gated on a moving subject FAILS or is re-pointed — it never skips
    Given the control <control>, whose real assertion is gated on <subject> existing
    When the family has moved
    Then <expected>

    Examples: the five measured silent carriers, and the one negative that proves the sweep is real
      | control                                    | subject                | expected                                                        |
      | acd-cache-read-surface-boundary            | src/work-read.mjs      | it names the seam at src/work/read.mjs and its armed leg runs    |
      | acd-upgrade-engine-blast-radius            | src/work-upgrade.mjs   | it names the engine at src/work/upgrade.mjs and its leg runs     |
      | acd-upgrade-idempotent                     | src/work-upgrade.mjs   | it names the engine at its new home and its leg runs             |
      | acd-work-item-schema-single-constant       | src/work-upgrade.mjs   | it names the engine at its new home and its leg runs             |
      | acd-reconstructed-marker-expressible       | src/work-upgrade.mjs   | it names the engine at its new home and its leg runs             |
      | acd-trigger-declaration-is-data            | src/work-trigger/      | it is untouched — the directory did not move                     |
      | any of the five, left pointing at the old path | the old path       | it fails naming the subject it could not find, and does not pass |

  Scenario: the doctor's lane roster reds on the move and is re-pointed rather than emptied
    Given the named roster of doctor lane modules, which the spine's own import specifiers are matched against
    When the family has moved and the roster has not
    Then the control fails
    And when the roster names the same seven lanes at their new specifiers the control passes
    And the control still reports that it matched seven specifiers, so it cannot pass on an empty match

  Scenario: the work command surface answers exactly as it did
    Given the registered work commands before the move
    When each is invoked after the move with the same arguments
    Then each returns the same result shape, the same coded outcomes and the same exit code
    And `aof work doctor --json` over an unchanged stream returns the same finding set
    And no command id, route or declared flag changed
