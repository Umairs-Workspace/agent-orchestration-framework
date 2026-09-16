@executable @cli @work @work-stream @bug @finding-F-69-V7
Feature: A stalled attempt is reset, a repeatedly-reset attempt escalates, and a build that has stopped reducing its failing count halts — on the production path

  `evaluateProgressPolicy` and `decideBuildProgress` decide correctly and are asked nothing.
  `src/work-loop.mjs`, the loop shell, contains no progress, stall or failing-count logic at all;
  the loop's only failure bound today is the engine cycle cap, which is a count of phases driven and
  not a statement about whether any of them moved. The two 11h07m burns were inside that cap the
  whole time.

  This is the second half of F-69-V7's remedy, and it is the same remedy shape 69/00 used to close
  F-6900: bind the decision already declared to the one path that acts, and do not edit the
  delivered features, which were all true of the leaf and none of which demanded a caller.
  `decideReviewRound` → `src/work-loop.mjs:180` → `src/commands/loop.mjs` is the worked example.

  Four facts about this seam were measured and shape what follows.

  **The two bounds are already declared and already resolvable.** `work.loop.buildNoProgressRounds`
  and `work.loop.progressMaxResets` resolve through `src/loop-bounds.mjs` with documented defaults.
  This task introduces no number and no key — ADR-001's one-home rule and FF-6901 both hold
  unchanged.

  **A resolvable pointer is not a caller, and the loop must be able to tell those apart.**
  `build-to-green.md` declares `ceiling: [config:work.loop.buildNoProgressRounds]`; FF-6902 confirms
  the pointer *resolves*, and is satisfied whether or not anything consumes it. That is exactly the
  gap F-6900 exposed on the review cap and the generalisation the milestone did not make the first
  time. The declared ceiling owes a consumer, and that owing is contracted here.

  **A reset must preserve what the attempt learned.** `evaluateProgressPolicy` returns a summary
  with the reset for a reason: an attempt discarded wholesale pays for the same rediscovery again,
  which is the cost this whole arc exists to remove. The escalation is the same discipline one step
  further — the worktree stands, the samples that justified it stay readable, and a human is asked
  rather than a fourth identical attempt being started.

  **The count comes from `work:grade`, invoked directly, and the routing stays 54/03's.** The graded
  rubric is the only producer of a failing-scenario count in the tree: `cases.failed`, from one
  bounded child process under the declared start-to-close deadline. `GATE_ORDER` already declares a
  `work:grade` rung, and `invokeGateLadder` does not walk it — wiring that rung, and the verdict→act
  routing that comes with it, is 54/03's contract and is deliberately untouched here. This task
  reads one number from a registered command and routes nothing. The ladder's own findings are not
  that number and must never be substituted for it: `work:validate` and `work:doctor` report on
  frontmatter, ADR declarations and control codes, so a story with a clean contract and twelve red
  scenarios yields zero findings — which `decideBuildProgress` would read as a finished build.

  **An unmeasurable round is not a stalled round.** The failing count is read from that gate, never
  from the maker's own account of how it did. A rubric that is unconfigured or a run that could not
  complete answers `indeterminate` — and `indeterminate` carries `cases.failed: 0`, which is the one
  trap on this path: the zero it reports is the absence of a measurement wearing the shape of one. Where no such count is available for a
  round, the bound is not consulted for it: an absent measurement must not be read as zero, must not
  be read as no-progress, and must not manufacture a halt. A loop that halts on the absence of
  evidence is the mirror image of the one that ran for eleven hours on the absence of a bound, and
  it is the more expensive of the two to debug.

  **An unmeasured round is DROPPED from the derivative, not counted either way.** It adds no stall,
  and equally it does not clear the stalls already accumulated — the bound is taken over the rounds
  that were measured, in the order they were measured. Both halves of that are deliberate. Counting
  an absent round as a stall halts a build for a flaky gate; letting it clear the run hands any
  build an escape from the bound by failing to measure, which is the 11h07m burn again by a quieter
  route. The bound is a count of non-reducing transitions between measured rounds, so `9, 9, 9`
  halts — and so, for the same two transitions, does `9, 9, —, 9`.

  **The two bounds answer different questions, and the attempt-level one is asked first.** The
  sample policy measures whether the maker is *doing* anything — files, lines, commits, in the tree
  it was given. The failing-count bound measures whether what it does is *achieving* anything. They
  resolve through the same declared key and so can both fire on one round, and the contract names
  the order rather than leaving two developers to guess it: **the sample policy is consulted first,
  and while resets remain its reset wins**; the failing-count halt is consulted when the sample
  policy says continue, and the escalation is what happens when the resets are gone. That order is
  what makes the grind signature catchable at all. `Build story 49/05` — 199 edits against 1 test
  run — shows *sample* progress on every round while its failing count never moves; a reset would
  restart it, and only the failing-count bound stops it.

  **The resets counted are this loop run's, on this item.** The count lives exactly where the review
  round count lives — per item, per loop run — and is reconstructed on `--resume` from the run's own
  persisted brief rather than recounted from scratch. A resets tally that outlives its loop run
  would escalate a fresh invocation on the strength of a previous one's history.

  ADR-001, ADR-005. F-69-V7.

  Scenario: an attempt whose samples stop moving is reset by the loop
    Given a build attempt whose consecutive no-progress samples reach the stall bound
    When the loop decides what to do next
    Then the attempt is reset
    And the reset carries the summary of what the attempt did
    And the summary is available to the attempt that follows it

  Scenario: a reset attempt keeps the work it produced
    Given an attempt the loop has reset for want of progress
    When the tree it was driven in is inspected
    Then the uncommitted work that attempt produced is untouched
    And the samples that justified the reset are readable
    And the attempt that follows it starts a fresh session rather than resuming the stuck one

  Scenario: the resets counted belong to this loop run and this item
    Given an item whose earlier loop run took resets against it
    When a fresh loop run drives that item and a round makes no progress
    Then the resets counted against it start from none
    And a resumed loop run instead recovers the resets its own lineage took

  Scenario: progress on the production path clears the accumulated stalls
    Given an attempt one sample below the stall bound
    When a round showing progress is driven
    Then the accumulated stall count returns to zero
    And the loop drives the next round

  Scenario: repeated resets escalate instead of resetting again
    Given an attempt whose resets reach the reset bound
    And a further round that made no progress
    When the loop decides what to do next
    Then the loop halts for a human rather than resetting again
    And the halt reports the resets taken and the bound they were measured against
    And the attempt's work is preserved for triage

  Scenario Outline: the loop's next move, over the rounds an attempt ran and the resets it has taken
    Given an attempt whose rounds so far are <rounds>
    And <resets> resets already taken against it
    When the loop decides what to do next
    Then the loop <outcome>

    Examples: at the declared defaults — a stall bound of two and a reset bound of two
      | rounds                            | resets | outcome               |
      | one round that moved              | 0      | drives the next round |
      | one round that did not move       | 0      | drives the next round |
      | two rounds that did not move      | 0      | resets the attempt    |
      | did not move, moved, did not move | 0      | drives the next round |
      | moved, then two that did not move | 0      | resets the attempt    |
      | two rounds that did not move      | 1      | resets the attempt    |
      | one round that did not move       | 2      | drives the next round |
      | two rounds that did not move      | 2      | halts for a human     |

  Scenario: a build that has stopped reducing its failing count halts
    Given consecutive build rounds with no reduction in the failing count reaching the declared bound
    When the loop decides what to do next
    Then the loop halts on no progress
    And the halt reports the failing count that did not move
    And the halt names the bound it was measured against

  Scenario: reaching green terminates without consulting the bound
    Given a build round that ends with no failing scenarios
    When the loop decides what to do next
    Then the loop crosses to the next phase
    And the progress bound was never consulted

  Scenario: the failing count comes from the graded rubric
    Given a build round whose failing count is read by the loop
    When the source of that count is inspected
    Then it is the graded rubric's own count of failing cases
    And the maker's own account of its progress is not among the sources
    And no gate that reports on documents contributes to it

  Scenario: an indeterminate grade is an absent count, not a count of none
    Given a build round whose grade came back indeterminate
    When the loop reads the round's failing count
    Then the count is absent
    And the zero the indeterminate grade reports is not read as a measurement

  Scenario: this task reads the grade and routes nothing
    Given the production path that reads a round's failing count
    When what it does with the grade is inspected
    Then it takes the failing count and nothing else
    And the gate ladder's rungs are unchanged by this task

  Scenario: a round with no measurable failing count neither halts nor counts as a stall
    Given a build round for which no failing count could be measured
    When the loop decides what to do next
    Then the build is not halted for that round
    And the round does not add to the consecutive no-progress count
    And the absent measurement is not recorded as a count of zero

  Scenario Outline: what the loop will and will not read as a round's failing count
    Given a build round that produced <produced>
    When the loop reads the round's failing count
    Then the count it reads is <count>

    Examples: a count is a gate's measurement or it is absent — never an account of the round by its own maker
      | produced                                      | count      |
      | a gate result carrying a failing count        | that count |
      | a gate result carrying no failing scenarios   | zero       |
      | a gate that could not be run                  | absent     |
      | a gate result whose count is malformed        | absent     |
      | the maker's report of how many tests it fixed | absent     |
      | prose naming a number of failures             | absent     |
      | nothing at all                                | absent     |

  Scenario Outline: the failing counts a build measured, and what the loop does next
    Given a build whose measured failing counts across rounds were <sequence>
    When the loop decides what to do next
    Then the loop <outcome>

    Examples: at the declared default bound of two, the sample policy having admitted each round, where — is a round whose count was absent
      | sequence   | outcome                   |
      | 9, 12      | drives the next round     |
      | 4, 4, 4    | halts on no progress      |
      | 9, 9, 8    | drives the next round     |
      | 9, —, 9    | drives the next round     |
      | 9, 9, —    | drives the next round     |
      | 9, 9, —, 9 | halts on no progress      |
      | —, —, —    | drives the next round     |
      | 9, 9, 0    | crosses to the next phase |
      | —, 0       | crosses to the next phase |

  Scenario: the engine's remaining cycles do not survive a no-progress halt
    Given a build that has stopped reducing its failing count
    And an engine cap with cycles still remaining
    When the loop decides what to do next
    Then it halts on no progress
    And the bound the halt reports is the progress bound, not the engine cap

  Scenario: a workspace that declares its own bounds changes what the loop does
    Given a workspace declaring a build no-progress bound higher than the default
    And a build that has consumed exactly the default number of no-progress rounds
    When the loop decides what to do next
    Then the build continues
    And the same build under the default configuration would have halted

  Scenario: the bounds reach the loop from their declared home, once
    Given the production path that resets a stalled attempt and halts a build for want of progress
    When its sources for the two declared bounds are enumerated
    Then each value resolves through the declared bounds home
    And the stall bound and the no-progress bound are the one declared key, not two
    And no literal bound appears anywhere on that path

  Scenario: the declared ceiling has a consumer, not merely a resolvable pointer
    Given every framework loop record that declares a config ceiling
    When the production consumers of each bound those ceilings point at are resolved
    Then each has at least one production reader outside the module that declares it
    And a ceiling whose pointer resolves but whose bound nothing reads names itself as unconsumed

  Scenario: the halt is reachable from the command that drives the loop
    Given the loop command driving a story whose build has stopped reducing its failing count
    When the run finishes
    Then the reported stop is the no-progress stop
    And the stop is a member of the loop's declared stop vocabulary
    And the decision that produced it consulted the progress authority

  Scenario: the escalation's detail survives to the reported line
    Given the loop escalating an attempt whose resets are exhausted
    When the halt is reported
    Then the line carries the resets taken, the bound they were measured against and the summary
    And the stop is attributed from its code rather than from rendered prose

  Scenario: the stop vocabulary and every literal that pins it stay in step
    Given the loop's declared stop vocabulary
    When the frozen literals that assert its membership are resolved
    Then every one of them declares the same set in the same order
    And a stop added to the vocabulary without widening them all fails the check
