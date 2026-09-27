@docs @work @work-stream
Feature: A build wave is partitioned by declared write sets, and an overlapping story is held rather than merged

  `readySet` IS A `depends` SET, AND `depends` SAYS NOTHING ABOUT FILES. Two stories with no
  dependency edge between them can and do target the same module. The lane already knew this and said
  so in its own words, with the measurement attached: two stories an architect had partitioned as
  independent both edited one file, ×9 and ×8 in a single milestone.

  WORKTREES SOLVED THE CORRUPTION AND LEFT THE COST. Seventeen edits to one file across two isolated
  trees is two agents doing overlapping work in ignorance of each other, a merge neither lane owns,
  and reviewers judging a file whose other half sits in a branch they cannot see — which produces
  findings correct against the tree and wrong against the merge. The worktrees stay; this partition
  reduces how often two lanes race, it does not replace the guard for when they still do.

  HOLD, DO NOT MERGE. Combining two overlapping stories into one lane doubles the lane's scope,
  defeats the sizing the stories represent, and produces a diff spanning two contracts. Serialising is
  the cheap answer: the held story runs in the next wave against a file that is now settled.

  EARLIEST IN `readySet` WINS, because that order is already deterministic and already the one the
  walk obeys. Any other tiebreak invents a priority the framework does not have.

  NO INFERENCE, AT ALL. The lane already refuses to infer concurrency from prose. An unguessed write
  set is information; a guessed one is noise that looks like information. So a story with no `files:`
  overlaps everything — it runs alone if it is first, and is held otherwise.

  AND AN UNREFINED SCAFFOLD IS UNGUESSED, NOT EMPTY. The template ships `reads: []` + `files: []`, so
  taking that at its word would let the one story nobody has scoped yet run beside every sibling —
  the precise case this partition exists to catch. Both sets empty is read as no declaration; an
  authored `reads:` with an empty `files:` is a real claim to write nothing, and parallelises.

  @executable
  Scenario: work next partitions the wave before the prompt fans out
    When work next computes a ready set
    Then it returns a write-disjoint wave in ready-set order
    And it returns the overlapping members in heldSet
    And the continue prompt obeys wave without recomputing it

  @executable
  Scenario Outline: the deterministic partition handles every write-set case
    When work next partitions <case>
    Then it applies <behaviour>

    Examples:
      | case                                     | behaviour                                          |
      | a story whose write set is disjoint      | selecting it into this wave                        |
      | a story overlapping one already selected | holding it for the next wave                       |
      | a story with no files declaration        | overlapping everything — alone if first, else held |
      | a story whose reads and files are both empty | overlapping everything — it is an unrefined scaffold |
      | a story reading something and writing nothing | selecting it into this wave                    |
      | the wave closing                         | letting the caller ask work next again              |

  @executable
  Scenario: the prompt forbids the two cheap wrong answers
    When I read the continue command's wave-consumption step
    Then it forbids inferring a write set from prose
    And it forbids merging overlapping stories into one lane

  @manual
  Scenario: a real milestone's overlapping stories are serialised instead of racing
    Given a milestone whose ready set contains two stories declaring the same file
    When aof:continue fans out the wave
    Then only the story earliest in ready-set order is dispatched
    And the held story and the overlapping path are reported before spawning
    And the held story is dispatched in the following wave

  @manual
  Scenario: the partition trades parallelism for correctness at an acceptable price
    Given milestones run before and after the partition
    When I compare edits per file, merge and fix commit share, held-story count, and wall-clock
    Then edits to a contested file concentrate in one wave rather than splitting across two
    And a routinely high held-story count is read as a refine defect, not a reason to drop the check
