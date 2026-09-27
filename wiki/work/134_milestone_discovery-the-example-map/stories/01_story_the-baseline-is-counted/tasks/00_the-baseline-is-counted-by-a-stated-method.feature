@manual @docs @planning @work-stream
Feature: The baseline is counted by a stated method, per story, on four delivered milestones

  In order to have a before-number the live run and any later measurement compare against,
  this milestone's RESEARCH.md must carry a `## R7 · Baseline` section that counts, per story of
  milestones 124, 126, 127 and 133, the review findings caused by a misunderstood requirement and
  the rounds in which a contract was amended after it was authored — by a rule and commands another
  reader can repeat (origin research §7 Q7; ADR-007).

  A documentation deliverable: the scenarios are run by a reader against the committed section and
  this tree, never against a test runner. The classification is a judgement, so the section states
  its rule, its borderline calls and that its counts are floors — the origin research's §8 form.
  The Examples pin the rule's edges on real findings; they are not the count.

  Background:
    Given the section `## R7 · Baseline` in `wiki/work/134_milestone_discovery-the-example-map/RESEARCH.md`

  Scenario Outline: every story of <milestone> has a row, and no story is silently missing
    When the per-story table's rows for <milestone> are read beside `aof work list <milestone> --all` and the story folders under `<folder>`
    Then there are <stories> story rows, <refs>, each a ref `aof work find <ref> --json` resolves
    And there is one milestone-level row for <milestone>, reading `0` with its sources named when no finding lands there
    And each row gives the milestone, the story ref, the misunderstood-requirement findings as a count with their finding ids, and the amendment rounds as a count with where each round is recorded
    And a story with nothing to count reads `0` with its sources named, never a blank cell

    Examples:
      | milestone | folder                                                                | stories | refs             |
      | 124       | wiki/work/archive/124_milestone_the-edges-aof-does-not-draw/stories  | 3       | 124/00 to 124/02 |
      | 126       | wiki/work/archive/126_milestone_the-declaration-is-the-unit/stories  | 7       | 126/00 to 126/06 |
      | 127       | wiki/work/archive/127_milestone_backlog-and-archive/stories          | 5       | 127/01 to 127/05 |
      | 133       | wiki/work/133_milestone_architecture-diagrams/stories                | 6       | 133/01 to 133/06 |

  Scenario: the classification rule comes before the numbers it produces
    When the section is read from its heading down
    Then the rule for a misunderstood-requirement finding is stated before the first table: the finding's own text says the requirement was understood differently from what was meant, or its fix changed an acceptance criterion rather than code
    And the rule for an amendment round is stated beside it: one beat, after the story's contract was first authored, in which a task `.feature` was added or changed or the `STORY.md` user story was changed
    And it says an ADR or DESIGN amendment that changed neither is listed apart and not counted, and a mechanical rewrite is not a round
    And the borderline cases met during the count are listed, each with the call made and why

  Scenario Outline: the rule's key examples are classified as the rule reads — <finding>
    Given the finding <finding>, owned by <owner> and typed `<type>` in its milestone's `VERIFICATION.md`
    When the section's tables and its borderline list are read
    Then <finding> is <call> as a misunderstood-requirement finding on <owner>'s row
    And it <listed> among the borderline calls, and the call turns on <edge>

    Examples:
      | finding   | owner  | type             | call        | listed | edge                                                                         |
      | F-133-01  | 133/04 | design-gap       | counted     | is not | the operator overturned the DESIGN line the story was built to               |
      | 127/F-03  | 127/01 | contract-wording | counted     | is     | the accepted criterion was re-read at review close, with no `.feature` edited |
      | 126/F-24  | 126/03 | design-gap       | counted     | is     | ADR-006 §4 and the delivered Examples table state one requirement two ways   |
      | 127/F-02  | 127/01 | contract-wording | not counted | is     | a probe's spelling failed while its meaning stood                            |
      | 127/F-28  | 127/05 | contract-wording | not counted | is     | the loop acted before the precondition held; the precondition was not misread |
      | 126/F-41  | 126/06 | defect           | not counted | is     | the fix changed code and kept the delivered criterion                         |
      | 126/F-03  | 126/00 | defect           | not counted | is     | the contract miscounted the tree's sites while its intent held               |
      | 127/F-26  | 127/04 | design-gap       | not counted | is     | non-binding DESIGN prose disagreed with the binding checklist the build met  |
      | 124/F-14  | 124    | design-gap       | not counted | is     | a technical gap ruled by an ADR at refine                                    |
      | 124/F-05  | 124/00 | defect           | not counted | is not | a plain defect fixed in code                                                 |
      | 124/F-17  | 124    | defect           | not counted | is not | spawn contention that went green in isolation                                |

  Scenario Outline: the amendment rule's edges — <story>
    Given <story>'s record of <event>
    When the section's amendment column for <story> is read
    Then <event> <counts> as an amendment round there

    Examples:
      | story  | event                                                                      | counts      |
      | 133/04 | task 03 added at verify, tagged `@bug @finding-F-133-01`                   | counts      |
      | 127/01 | the review-close amendments 127/F-03 and 127/F-04, ratified with no `.feature` edited | does not count |
      | 127/04 | the `DESIGN.md` prose corrected at accept for 127/F-26                     | does not count |
      | 126/01 | a QA point amended into ADR-001 §2 while no `.feature` changed             | does not count |
      | 126/00 | the machine-name scrub `f76c153` rewriting a task `.feature`               | does not count |
      | 127/03 | commits changing only its `STORY.md` `reads:`, `files:` and `status:`      | does not count |

  Scenario: a finding that names no single story is counted at the milestone, not dropped
    Given a milestone finding whose cause is a misunderstood requirement but which names no one story
    When the section is read
    Then it is counted on a milestone-level row with its finding id, and the milestone total includes it

  Scenario: the before-number is stated as a floor, per milestone and across all four
    When the section's totals are read
    Then each milestone has a total of misunderstood-requirement findings and of amendment rounds, and a per-story rate
    And one line gives the before-number across all four milestones over its denominator of 21 stories
    And the section says the counts are floors: a finding or an amendment recorded in words the rule does not match is not counted

  Scenario Outline: a source the count cannot reach is named, never read as zero — <milestone>
    When the section's method is read beside `git log --format=%h -- wiki/work/<name> wiki/work/archive/<name>`
    Then it names each source the count read (the milestone and story records it lists) and each it could not
    And it says git reaches <milestone>'s contracts only through <commits>, so rounds are read from the records and any round folded into a squash or compacted out of `STATE.md` is not reachable
    And it says the `runs/` records are not a source, because a repeated run there is a retry, not a contract change
    And no command depends on the local-only `.git-archive`, which a clone does not hold
    And any gap in reach is stated with its effect on the numbers, never folded into a zero

    Examples:
      | milestone | name                                   | commits                                                                  |
      | 124       | 124_milestone_the-edges-aof-does-not-draw | the public-root cut `e4c8824`, the archive move `ed9c00c` and `f76c153` |
      | 126       | 126_milestone_the-declaration-is-the-unit | the public-root cut `e4c8824`, the archive move `ed9c00c` and `f76c153` |
      | 127       | 127_milestone_backlog-and-archive         | the public-root cut `e4c8824` and the commits after it, its pre-accept STATE read as `git show 9e6623a~1:` |
      | 133       | 133_milestone_architecture-diagrams       | `2078166`, which lands every story's contract at once, and `7a9ad6e`    |

  Scenario: 133 is counted as the tree records it, though its SPEC still reads in-progress
    Given `wiki/work/133_milestone_architecture-diagrams/SPEC.md` reads `status: in-progress` while its `STATE.md` records it verified and accepted on 2026-09-23
    When the section's method is read
    Then it says 133 is counted as of the commit it names: all six stories accepted and the milestone verified, the SPEC not flipped to done while F-133-09 holds the door, and F-133-06 open
    And it says 133's numbers may still grow

  Scenario: another reader repeats the count from the section alone
    Given the section's commands block, run from the repository root on the committed tree
    When a reader runs each command in it
    Then each command is read-only and prints the number or the list the section reports beside it
    And applying the stated rules to the listed findings and the listed record lines reproduces every per-story count

  Scenario: the story writes one document and nothing else
    When `git status` is read after the section is written
    Then the only changed path this story owns is `wiki/work/134_milestone_discovery-the-example-map/RESEARCH.md`
    And R7 sits after R6 and before `## Commands`, and R1 to R6 and `## Commands` read as they did before
