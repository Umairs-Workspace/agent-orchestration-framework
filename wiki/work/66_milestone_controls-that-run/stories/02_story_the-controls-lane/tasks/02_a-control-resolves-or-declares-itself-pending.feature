@executable @cli @work @validate
Feature: A declared control resolves to a path a runner can see, or declares itself pending

  THE LARGEST MEASURED DEFECT IN THE FINDING, AND IT IS ACD'S OWN. ACD invented the fitness-function
  concept, told architects to author guards during refine — before the subject exists — and gave
  them nowhere to run. So projects invent a docs folder. Of 15 guards staged inside one milestone's
  documentation tree: 5 landed byte-identical, 8 CHANGED ON CONTACT WITH A RUNNER (one grew +124%),
  2 never landed at all. The failure correlates with COMPLIANCE — "the projects following ACD's
  advice most closely are the ones hitting the hole" — a design hole, not indiscipline.

  ACD'S OWN FAILURE MODE IS DIFFERENT, AND MEASURED. No staging folder exists under `wiki/` — zero
  `*.test.*`/`*.spec.*` files. ACD's version is the citation that never resolved: its
  `ARCHITECTURE.md` registers cite 215 distinct `test/arch/…` paths, 183 resolve, and 32 DO NOT.
  Thirteen are in the in-flight m53, the legitimate declared-ahead-of-subject state; 20 sit across
  seven `done` milestones (22, 23, 24, 26, 27, 36, 49). At least two of those are honest —
  `acd-sync-root-set` and `acd-claim-relay-independent` were retired with their eliminated subjects
  (TECH_DEBT item 5) — so they are permanent, the horizon alone cannot carry them, a baseline can.

  "A RUNNER CAN SEE IT" IS NOT A GLOB IN THIS REPO. Both runners register suites by explicit import
  plus spread, and of 287 suites in `test/arch/` exactly one — `work-content-free-discovery` — is
  named by only one of the two. A glob wrong in the safe direction is still a gate that is wrong.

  PENDING IS ACD'S XFAIL, AND IT IS A TOKEN RATHER THAN A POSITION (ADR-009/B). Every common runner
  has `test.fails`/`xfail`; ACD has none, so a guard authored ahead of its subject cannot say so
  honestly. ADR-004 §3's "after the cited path" was written for the bullet shape; a table row
  carries the same token in any cell of the declaration's own entry — one rule, one meaning, two
  carriers. Milestone 66's register now writes the literal `**(pending — 66/0N)**` on all nine of
  its citations, and the marker is INADMISSIBLE at `done`, which makes it a discharge not a park.

  THE TWO LEGS, STATED ONCE SO THE TABLE BELOW IS DERIVABLE RATHER THAN ILLUSTRATIVE. Leg A fails
  if no file sits at the cited path, reporting `control-unresolved`; a pending marker downgrades
  that finding to `warn` inside the horizon without silencing it. Leg B reports
  `control-unregistered` when a runner list is configured and no runner names the file, and
  `control-runner-unchecked` — warn, always, ONCE per item — when none is configured at all. Leg
  B's `control-unregistered` is SUPPRESSED once leg A has failed, because a file that is not there
  cannot be registered and the fix is one act; the no-op still reports, since it reports that a leg
  did not run rather than a violation. A marker standing on a control that has since landed is a
  DECLARED NO-OP rather than a ninth code (ADR-009/J): resolution answers what the marker claims.

  Scenario Outline: the two-leg truth table, exhaustive over path, runner, pending and status
    Given a declared control whose file <path>, in a project whose runner list <runner>
    And a declaration that is <pending> marked pending, under an item whose status is <status>
    When `aof work doctor` runs
    Then the findings for that control are exactly <findings>

    Examples: the file exists
      | path    | runner              | pending | status | findings                                          |
      | exists  | names it            | not     | open   | none                                              |
      | exists  | names it            | not     | done   | none                                              |
      | exists  | names it            | is      | open   | none, a stale marker is a declared no-op rather than a ninth code |
      | exists  | names it            | is      | done   | none, a stale marker is a declared no-op rather than a ninth code |
      | exists  | does not name it    | not     | open   | control-unregistered at error                     |
      | exists  | does not name it    | not     | done   | control-unregistered at warn                      |
      | exists  | does not name it    | is      | open   | control-unregistered at error, the marker claims an absence the resolution disproves |
      | exists  | does not name it    | is      | done   | control-unregistered at warn, for the same reason |
      | exists  | is not configured   | not     | open   | control-runner-unchecked at warn                  |
      | exists  | is not configured   | not     | done   | control-runner-unchecked at warn                  |
      | exists  | is not configured   | is      | open   | control-runner-unchecked at warn                  |
      | exists  | is not configured   | is      | done   | control-runner-unchecked at warn                  |

    Examples: the file is missing
      | path    | runner              | pending | status | findings                                          |
      | missing | names it            | not     | open   | control-unresolved at error, the runner names a file that is not there |
      | missing | names it            | not     | done   | control-unresolved at warn                        |
      | missing | names it            | is      | open   | control-unresolved at warn                        |
      | missing | names it            | is      | done   | control-unresolved at warn                        |
      | missing | does not name it    | not     | open   | control-unresolved at error, unregistered suppressed |
      | missing | does not name it    | not     | done   | control-unresolved at warn, unregistered suppressed |
      | missing | does not name it    | is      | open   | control-unresolved at warn, unregistered suppressed |
      | missing | does not name it    | is      | done   | control-unresolved at warn, unregistered suppressed |
      | missing | is not configured   | not     | open   | control-unresolved at error and control-runner-unchecked at warn |
      | missing | is not configured   | not     | done   | control-unresolved at warn and control-runner-unchecked at warn |
      | missing | is not configured   | is      | open   | control-unresolved at warn and control-runner-unchecked at warn |
      | missing | is not configured   | is      | done   | control-unresolved at warn and control-runner-unchecked at warn |

  Scenario Outline: the marker is a token in the declaration's own entry, never a position in it
    Given a declaration whose entry carries <shape>
    When the check reads it
    Then the declaration is <reading>

    Examples: one rule, two carriers — ADR-004 §3's bullet and the table row this register uses
      | shape                                                                | reading                                                          |
      | the token directly after the cited path, the bullet shape            | pending                                                          |
      | the token later in the same cell, after the runner-and-probe prose   | pending, position inside the cell decides nothing                |
      | the token in another cell of the same row, such as the invariant     | pending, the row is the entry                                    |
      | the literal `**(pending — 66/0N)**` this register writes today       | pending, emphasis and the story ref are part of no rule          |
      | the token in a neighbouring row's cell only                          | not pending, an entry is one declaration and never its neighbour |
      | the word inside a fenced sample quoted in the block                  | not pending, a fence marks nothing, as it declares nothing       |
      | no token anywhere in the entry                                       | not pending, so a missing file is an error inside the horizon    |

  Scenario: the honest no-op is reported once per item, not once per declared control
    Given a milestone declaring eight controls in a project with no configured runner list
    When `aof work doctor` runs
    Then exactly one `control-runner-unchecked` finding is reported for that milestone
    And it names the missing configuration key rather than any one control

  Scenario Outline: what counts as a cited control path, over the shapes this tree actually uses
    Given a fitness declaration whose enforced-by cell carries <cell>
    When the check reads it
    Then it is treated as <reading>

    Examples: shapes measured across ACD's own registers, 2026-08-15
      | cell                                                       | reading                                                      |
      | a path inside backticks, surrounded by prose in the same cell | one control citation, probed by leg A                     |
      | a path written relative to the register, as `../../../test/arch/x.test.mjs` (84 today) | one control citation, resolved repo-relative |
      | a path carrying a markdown line anchor, as `x.test.mjs#L241` (58 today) | one control citation, the anchor dropped before the probe |
      | a path carrying a line suffix, as `x.test.mjs:151` (39 today) | one control citation, the suffix dropped before the probe |
      | a family reference containing a wildcard, as `test/arch/acd-notion-*.test.mjs` (28 today) | not a control citation, so never reported |
      | a truncated prefix in prose, as `test/arch/acd-` (4 today)  | not a control citation, so never reported                    |
      | two paths in one cell, as FF-6607 carries today             | two control citations, and the declaration resolves only when both do |
      | a path in a cell of any column other than enforced-by       | not a control citation, so `src/work-doctor.mjs:411-426` is never probed |
      | no path anywhere in the cell                                | control-unresolved, because there is no path a runner could see |

  Scenario Outline: the staging prohibition keys on the name, and the retirement convention survives
    Given the file <file>
    When the check runs
    Then it is <verdict>

    Examples: measured against the 32 `.mjs` files under `wiki/work` today
      | file                                                            | verdict                                                     |
      | `wiki/work/66_.../tasks/thing.test.mjs`                          | reported as a staged control                                |
      | `wiki/work/66_.../reference/thing.spec.ts`                       | reported, because `reference/` alone admits nothing         |
      | `wiki/work/66_.../reference/thing.test.js`                       | reported, because the name is still inside a runner's glob  |
      | `wiki/work/35_.../reference/retired-dispatch-tests/acd-lease-write-scope.mjs` | admitted, renamed out of every glob (29 such files) |
      | `wiki/work/05_milestone_work-memory/spike/memory-spike.mjs`      | admitted, the name was never test-shaped                    |
      | `test/arch/acd-no-staged-control.test.mjs`                       | admitted, the prohibition is scoped to the work directory   |
      | a `.feature` file anywhere under the work directory              | admitted, a contract is not a control                       |

  Scenario: the grandfathered citations are a named list keyed by item and path
    Given the 20 unresolved `test/arch/…` citations across seven `done` milestones
    When the check runs
    Then each is carried as a baseline entry naming its milestone, its path and whether the subject was retired or never landed
    And one path cited by both m23 and m26 is two entries, so 20 entries carry 19 distinct paths
    And a twenty-first unresolved citation under a `done` milestone is reported
    And the baseline is a list rather than a count, so it is reviewed by re-measuring it

  Scenario: a pending control is admitted mid-flight and refused at the accept transition
    Given a milestone in progress declaring a pending control whose file has not landed
    When `aof work doctor` runs
    Then the control is reported at warn, so the milestone is not blocked from proceeding
    And the transition of that milestone to `done` is refused while the marker stands
    And the refusal is raised while the item is still open, so no error is ever emitted against an immutable record

  Scenario: this milestone's own register is the first subject, measured rather than asserted
    Given milestone 66's `## Fitness functions` register, whose nine `test/arch/…` citations each carry the pending token
    When the shipped recogniser parses it and both legs run
    Then all nine are reported at warn, so the lane's first run over its own register fires no error
    And a row added to that register with no file and no token is reported at error on the next run
