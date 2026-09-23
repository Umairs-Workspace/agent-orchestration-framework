@executable @cli @work @distribution
Feature: the fitness function — no tracked run record names a machine, and the ratchet only shrinks

  WHAT IS ACTUALLY TRUE TODAY, measured 2026-09-22 on branch `127-129`. The tracked tree carries
  189 run records under two node segments — the control node's placeholder (184; moved to its opaque `node-7297` on 2026-09-23) and `umamis-mac-mini` (5) — and
  both are the POST-SCRUB placeholder forms left by the public-repo move, not live machine names.
  The live hostname appears in exactly one place on disk: `132/runs/<hostname-id>/`, created by this
  story's OWN refine run a few minutes before this contract was authored, and untracked. So the
  disclosure 127/F-12 records is not sitting in the tree — it is one lane commit away, every time,
  and the loop's lane commit runs `--no-verify` by design (127/R7, routed to 129), so the
  pre-commit hook is not what stands between it and the remote.

  AND THE PRIVATE-TERMS GUARD DOES NOT COVER IT. `test/arch/work/acd-no-internal-project-names`
  was run in isolation at refine and is GREEN with those 189 records tracked, because its term
  list (`.aof/private-terms.json`, gitignored, seeded per machine) names downstream PROJECTS, not
  the operator's machine. That guard is therefore not a safety net here and must not be made into
  one: widening it to cover a hostname would put a machine name into a control whose whole design
  is to keep names out of the repo. This is a SEPARATE control, and the two stay separate.

  THE RULING. A tracked `runs/<node>/` segment, and the `node` key of every tracked run record,
  must be an OPAQUE id (`isOpaqueNodeId`'s shapes, task 01) or carry an entry in this guard's
  BASELINE with a written reason. The baseline is seeded with exactly the two segments above and
  is SHRINK-ONLY — the ratchet discipline `acd-no-internal-project-names` and the TECH_DEBT ledger
  both use: an addition is a visible, reviewable act, and a removal needs no ceremony. An
  operator-PINNED name (`aof mesh identity --name aof-wsl`) is not opaque and is not special-cased
  — it takes a baseline entry, because a guard cannot tell a name an operator chose from a name a
  machine supplied, and the entry is exactly where that judgement gets recorded.

  RULINGS (QA, 2026-09-22). (1) The subject is `git ls-files`, not the working tree — the rule is
  about what is PUBLISHED, matching the sibling guard's own reasoning. (2) The baseline counts
  FILES per segment, so a segment may not grow; a new record under `umamis-mac-mini` fails even though
  the segment is listed. (3) Flat, un-partitioned records (181 tracked today, `runs/<runId>.json`
  with no node segment) are out of subject for the PATH rule and in subject for the RECORD rule —
  their `node` key is usually `null`, which is not a machine name and passes. (4) The guard
  carries its own non-vacuity self-check, planting a hostname-shaped segment and asserting it
  fires — the shape `acd-no-internal-project-names` uses, and the reason its own self-check
  exists. (5) It lands at `test/arch/mesh/acd-run-records-name-no-machine.test.mjs`, registered in
  `test/arch/mesh/index.mjs`, so a runner sees it.

  Background:
    Given the guard module at `test/arch/mesh/acd-run-records-name-no-machine.test.mjs`
    And `BASELINE` maps `umamis-mac-mini` → 5, with a written reason
    And the scan reads `git ls-files` from the repo root

  Scenario: the tree is at its baseline today — the guard is green as authored
    When the guard scans the tracked tree
    Then every `runs/<node>/` segment it finds is opaque or listed in `BASELINE`
    And no listed segment carries more files than its recorded count
    And the guard passes

  Scenario Outline: a segment that is not opaque and not baselined fails
    Given a tracked run record at `wiki/work/99_milestone_x/runs/<segment>/20260922T000000000Z-0000.json`
    When the guard scans the tracked tree
    Then it <verdict>
    And a failure message names the segment and the file

    Examples:
      | segment           | verdict                                  |
      | `node-7f3a`       | passes — the opaque form                 |
      | `node-7f3a9c21`   | passes — the widened opaque form         |
      | `win-host-a`      | fails — a machine name, unlisted         |
      | `umamis-mac-mini` | fails — listed, but over its count of 5  |
      | `aof-wsl`         | fails — an operator-pinned name needs an entry |
      | `WORKSTATION-01`  | fails — a machine name, unlisted         |

  Scenario: the record's own node key is in subject, not only its path
    Given a tracked run record whose PATH segment is `node-7f3a` but whose `node` key reads `"win-host-a"`
    When the guard scans the tracked tree
    Then it fails, naming the record and its `node` value
    And the message distinguishes the record rule from the path rule

  Scenario Outline: a flat record is out of subject for the path rule and in subject for the record rule
    Given a tracked run record at `wiki/work/99_milestone_x/runs/20260922T000000000Z-0000.json` whose `node` reads <node>
    When the guard scans the tracked tree
    Then it <verdict>

    Examples:
      | node           | verdict                        |
      | `null`         | passes — no node was recorded  |
      | `"node-7f3a"`  | passes — opaque                |
      | `"win-host-a"` | fails — a machine name         |

  Scenario: the ratchet only shrinks
    Given the tracked tree carries 1 file under `umamis-mac-mini`, four fewer than its baseline of 5
    When the guard scans the tracked tree
    Then it passes — a segment below its recorded count is always fine
    And the guard states the slack so the baseline can be tightened in a later pass

  Scenario: the baseline never rots
    When the guard checks each `BASELINE` entry against the tracked tree
    Then every listed segment still exists and still carries at least one tracked record
    And a listed segment that has disappeared fails, naming it — a stale entry is removed, never left

  Scenario: the self-check — the scan is non-vacuous and fires on a planted name
    Given the scan is run against a fixture tree holding one record under `runs/some-machine-name/`
    Then the guard reports that record
    And running the same scan against a fixture tree holding only `runs/node-7f3a/` reports nothing
    And the scan visited a non-zero number of tracked files in both runs

  Scenario: the private-terms guard gains no exemption and no new term
    When `test/arch/work/acd-no-internal-project-names.test.mjs` is read
    Then its `EXEMPT` set and its `BASELINE` map are unchanged by this story
    And this story adds no entry to `.aof/private-terms.json`
    And the two guards name each other in a comment, so a later reader does not merge them
