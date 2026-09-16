@executable @cli @work @validate
Feature: The lane says how much it read, and states on every run what it could not see

  A lane that found nothing and a lane that LOOKED AT NOTHING are indistinguishable in a finding
  list, and the second is the failure the audit was commissioned to catch. It has already happened
  here — a renamed fixture root turned a probe into a comparison of nothing with nothing, and it
  passed green. So every sweep declares how little would be too little, and a sweep that declares no
  floor is refused rather than defaulted: one default would make that failure indistinguishable
  everywhere at once.

  For this lane it matters twice over, because BOTH its rules are designed to under-report. The
  capability rule turns 165 program-shaped spans into 1 finding on purpose. The duplication rule sees
  roughly 1.2 KB of the graph-grounding block's 8,402 B, because the rest is paraphrase. A clean
  result from two deliberately blind rules over a corpus nobody confirmed was read is a falsehood in
  the shape of an answer.

  The remedy is not a caveat in an architecture document, where no operator is standing. The lane
  states its blindness in its own OUTPUT — the floor it applied, that a paraphrase is invisible to
  it, and that the capability rule misses an instruction in prose, a role named without bold, and any
  capability other than `Bash`. And it says so on EVERY run, clean or not: a limit quoted only into
  findings says nothing in exactly the case a reader most needs it, the run that returned none.

  A shortfall is likewise not a clean result. A population that shrank by ninety percent is the same
  failure a step earlier than a population of zero, so the comparison is `below the floor`, not
  `empty`, and it names the sweep, the root it walked, the count it got and the floor it missed.

  The milestone's whole thesis is that these rules TRAVEL — they must run in a repository that is not
  this one. That makes the lane a pure function over injected inputs and a subject root: no clock is
  read at call time, no configuration key is reached for, nothing on the inputs is mutated, and the
  corpus it is exercised against has no aof checkout behind it.

  What would quietly undo all of it: a default floor, a limit emitted only when there are findings to
  hang it on, and a clock read inside the lane — each turns an honest partial answer back into a
  confident empty one.

  ADR-001 §2. ADR-003 §4 consequences. ADR-004 §3. ADR-010 §3. FF-7701, FF-7702.

  Scenario Outline: every read record the lane returns says what was walked and what would be too little
    Given a synthetic prompt corpus
    When the prompt-layer lane runs over it
    Then each read record it returns carries <field>, and <expectation>

    Examples: the declaration a sweep cannot omit
      | field   | expectation                                                        |
      | `sweep` | it is a non-empty name a finding can cite                          |
      | `root`  | it names the directory that sweep walked                           |
      | `what`  | it describes the population in words                               |
      | `basis` | it is one of `disk`, `text` and `runtime`                          |
      | `floor` | it is a finite number greater than zero                            |
      | `count` | it is a finite number, so a clean result cannot omit how much it read |

  Scenario: the lane returns one read record for each of its two sweeps
    Given a synthetic prompt corpus
    When the prompt-layer lane runs over it
    Then two read records are returned, one for the capability sweep and one for the duplication sweep
    And no two of them carry the same `sweep` name
    And the duplication sweep's `basis` is `text`, which is what obliges it to state a limit

  Scenario Outline: an incomplete declaration is refused rather than defaulted
    Given one of this lane's sweep declarations, altered so that <alteration>
    When the sweep declarations are checked by the same validator every audit lane is checked by
    Then the check <verdict>

    Examples: the fields whose absence is a refusal, and the boundary of a usable floor
      | alteration                        | verdict                    |
      | its `id` is removed               | refuses that sweep, saying a finding could not name it |
      | its `root` is removed             | refuses that sweep, naming it |
      | its `what` is removed             | refuses that sweep, naming it |
      | its `basis` is removed            | refuses that sweep, naming it |
      | its `basis` reads `text-and-disk` | refuses that sweep, naming it |
      | its `floor` is removed            | refuses that sweep, naming it |
      | its `floor` reads 0               | refuses that sweep, naming it |
      | its `floor` reads -1              | refuses that sweep, naming it |
      | nothing is altered                | admits every sweep         |
      | its `floor` reads 1               | admits every sweep         |

  Scenario Outline: the lane states what it could not see on every run, clean or not
    Given a prompt corpus that <corpus>
    When the prompt-layer lane runs over it
    Then the lane returns <findings>
    And it returns a limit record all the same
    And that limit is renderable — it carries a non-empty question and a non-empty consequence, and every remaining key is a non-empty string or an explicit null

    Examples: a limit is not a footnote hung on a finding
      | corpus                                                | findings              |
      | carries one capability gap and one duplicated pair    | two findings          |
      | carries one capability gap and no duplication         | one finding           |
      | carries one duplicated pair and no capability gap     | one finding           |
      | carries neither                                       | no findings           |
      | holds documents whose every instruction is satisfied  | no findings           |

  Scenario Outline: the limit names each blindness the two rules were designed to have
    Given a prompt corpus carrying no finding of either kind
    When the prompt-layer lane runs over it
    Then the limits it returns state <blindness>

    Examples: what a reader learns from the output rather than from an architecture document
      | blindness                                                                          |
      | the sentence floor this run applied, as the value it used                          |
      | that a rule restated in different words is invisible to the duplication rule       |
      | that an instruction written in prose rather than a code span is not detected       |
      | that an instruction naming a role without bold is not attributed                   |
      | that a required capability other than `Bash` is not detected                       |

  Scenario Outline: a sweep that read less than its floor is a shortfall, not a clean result
    Given an audited project whose installed prompt layer holds <population>
    When the prompt-layer lane runs over it
    Then the read record for that sweep reports a count <relation> its declared floor
    And the shared floor rule applied to that record yields <shortfall>

    Examples: below the floor, at it, and above it
      | population                                     | relation      | shortfall                                                                            |
      | no prompt documents at all                     | below         | `audit-ran-on-nothing`, naming the sweep, the root it walked, the count and the floor |
      | fewer documents than the sweep's floor          | below         | `audit-ran-on-nothing`, naming the sweep, the root it walked, the count and the floor |
      | exactly as many documents as the sweep's floor  | at or above   | nothing                                                                              |
      | more documents than the sweep's floor           | at or above   | nothing                                                                              |

  Scenario: an empty corpus is never reported as a clean pass
    Given an audited project whose installed prompt layer holds no documents
    When the prompt-layer lane runs over it
    Then the lane returns no capability finding and no duplication finding
    And it returns a read record whose count is below its floor
    And it returns a limit record
    And no result is returned that carried an empty finding list and no read record beside it

  Scenario Outline: the lane is a pure function over the inputs it is handed
    Given one set of injected inputs holding a synthetic prompt corpus
    When the lane is run <case>
    Then <expectation>

    Examples: same inputs, same answer — and the inputs come back untouched
      | case                                                         | expectation                                                             |
      | twice in one process over the same inputs                    | the two results are equal, finding for finding and limit for limit      |
      | over corpus A and then over corpus B in one process          | the second result answers from B rather than repeating A                |
      | over corpus B and then over corpus A in one process          | the second result answers from A rather than repeating B                |
      | once, and the injected inputs are read afterwards            | the inputs are unchanged — no document text, sweep or routing was mutated |
      | once, and the returned findings are then modified by a caller | a second run over the same inputs returns the original findings         |

  Scenario: no clock is read — the instant arrives with the inputs
    Given a fixed instant supplied to the lane among its inputs
    When the lane is run twice with real time passing between the two calls
    Then the two results are equal

  Scenario: the lane runs against a repository that is not this one
    Given a synthetic project holding only an installed prompt layer — no aof checkout, no `src/` tree, no configuration file and no git repository beneath it
    When the prompt-layer lane runs over that project's root
    Then it returns findings, read records and a limit record for that project
    And every path it names lies beneath the root it was given
    And the same corpus placed under a different root returns the same findings, differing only in the paths they name
