@executable @cli @work @validate
Feature: A contract that does not parse is a refusal, with a named finding

  ACD defines the contract artifact and has never parsed it. `validateWork` already OPENS every
  `.feature` (`src/work.mjs:932-939`) and then runs a line scan over it for tags — so this is a
  strictness increase on a read that already happens, not a new read (finding §7 item 6).

  THE MEASURED CATCH. In the investigated downstream milestone, 33 of 37 authored contract
  `.feature` files did not parse — 189 wrapped step-continuation lines. The cure had been
  prescribed in a prior milestone's retrospective and called "one command". Nobody ran it, so that
  milestone shipped 38× the defect density of the milestone the lesson was written about. This is
  the cheapest gate in milestone 66 with the largest measured catch, and it is why story 00 shares
  nothing with the others and goes first.

  WHAT "STRUCTURAL" MEANS HERE. The parse rejects a file whose step position holds free text — a
  wrapped step continuation, or a description sentence beginning `And`/`Given`/`When`. It is not a
  style checker: it does not judge wording, ordering, scenario count or narrative prose, and a
  Feature narrative block is not a step.

  RUN TODAY, THIS GATE REPORTS ONE FILE. `53/01/tasks/04_gate-order-and-cap.feature` (18 lines),
  under an `in-progress` milestone. Every other unparseable file sits under a `done` milestone,
  grandfathered by the acceptance horizon (task 01) rather than by an exemption list.

  THE POPULATION IS FINAL, AND THE CORRECTION IS THIS MILESTONE IN MINIATURE. QA's independent scan
  of all 653 files named one file ADR-002's list did not: `27/02/tasks/02_assign-affordance.feature`
  carries three steps at file level under a comment block, with no `Scenario:` or `Background:`
  header above them (`:113-115`). The architect re-ran the detector and confirmed the catch — the
  first instrument treated a step in Feature-description state as legal, so it was an instrument
  wrong about the tree, inside the milestone about instruments wrong about the tree. The settled
  population is 14 files carrying 40 lines across 9 milestones, 13 of those files under 8 `done`
  milestones. The headline is unchanged, because the gate still reports exactly ONE file; the
  enumeration is not, which is why this contract enumerates by re-measurement rather than by
  recall.

  MILESTONE 00'S DELIVERED CONTRACT IS SUPERSEDED HERE, NOT EDITED THERE.
  `00/01/tasks/01_tag-vocabulary.feature` pins validate's treatment of a task feature as a
  tag-vocabulary check over a line scan. Every scenario it delivered stays true on every file that
  parses INSIDE the horizon, and its bytes are untouched — the new rule is recorded in THIS
  contract, the pattern set by `65/tasks/00_story-depends-becomes-data.feature`. Tests are code and
  track current behaviour; they change.

  Scenario: an unparseable contract is refused inside the horizon
    Given an `in-progress` milestone holding a task feature whose step position carries free text
    When I run `aof work validate`
    Then it reports a structural finding naming that file and line
    And the command exits non-zero

  Scenario: the finding says what is wrong, not merely that something is
    Given the same file
    When the finding is rendered in validate's numbered issue list
    Then its `problem` distinguishes a structural parse failure from a tag-vocabulary failure
    And its `path` is the feature file itself, never the story's record document
    And the line it names is the line an author edits to clear it

  Scenario Outline: the gate reports the live file and grandfathers every delivered one
    Given milestone <milestone>, whose status is <status>, holding <files> unparseable `.feature` file(s)
    When I run `aof work validate` over the whole stream
    Then it reports <reported>

    Examples: the settled picture — 14 files over 9 milestones, re-run 2026-08-15; the argument for landability is this table, and re-running the gate falsifies it
      | milestone | status      | files | reported                                        |
      | 00        | done        | 2     | nothing                                         |
      | 04        | done        | 1     | nothing                                         |
      | 27        | done        | 1     | nothing                                         |
      | 37        | done        | 3     | nothing                                         |
      | 38        | done        | 1     | nothing                                         |
      | 43        | done        | 1     | nothing                                         |
      | 49        | done        | 2     | nothing                                         |
      | 52        | done        | 2     | nothing                                         |
      | 53        | in-progress | 1     | one finding, on 01/tasks/04_gate-order-and-cap.feature |

  Scenario: a failed parse never manufactures a tag verdict it could not have reached
    Given a file that fails the structural parse
    When it is checked
    Then the structural finding is reported
    And an unknown-tag or milestone-membership finding on that file is still reported, because each is decided on a tag line by itself
    And no verification-tag-count finding is reported for that file, because that count rests on scenario boundaries the parse could not establish

  Scenario: a healthy corpus stays green
    Given `aof work validate` reports 0 findings over the whole stream today, measured 2026-08-15
    When this gate lands
    Then the only new finding anywhere under `wiki/work` is the one live file above
    And no file that parses gains a finding of any kind
    And the constructs listed in `tasks/00_one-gherkin-parser.feature` stay silent, which is where the false-positive matrix is enumerated

  Scenario Outline: the gate is scope-honest, and a scope that reaches no story is honest about that too
    Given the live unparseable file at `53/01/tasks/04_gate-order-and-cap.feature`
    When I run `aof work validate <scope>`
    Then the finding is <reported>, and the exit is <exit>

    Examples: scope semantics measured against `validateWork` on a fixture, 2026-08-15 — numeric scopes reach a story through its parent, a slug scope matches only an item's OWN slug
      | scope           | reported     | exit | why                                                              |
      | (none)          | reported     | 1    | the whole stream                                                 |
      | 53              | reported     | 1    | a numeric scope matches the story through its parent             |
      | 53/01           | reported     | 1    | the owning story named exactly                                   |
      | 53/02           | not reported | 0    | a sibling that holds no such file                                |
      | loop-engine     | reported     | 1    | the story's own slug                                             |
      | loop-artifact   | not reported | 0    | the MILESTONE's slug matches no story, and the feature check runs per story — pre-existing scope behaviour, recorded here rather than changed |
      | 99              | not reported | 0    | an unresolved scope is a filter matching nothing, never an error |
