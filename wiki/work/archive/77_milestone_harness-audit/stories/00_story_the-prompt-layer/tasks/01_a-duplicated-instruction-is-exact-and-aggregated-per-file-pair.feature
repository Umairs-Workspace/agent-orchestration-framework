@executable @cli @work @validate
Feature: One rule copied into two documents is one finding about that pair of documents, carrying the bytes it costs

  A rule stated in four places is a rule that goes stale in three of them. The graph-grounding block
  is the measured case: **four logical copies totalling 8,402 B** across three render targets, and
  when one is edited the others keep instructing agents with the superseded version.

  The obvious detector finds none of them. Exact duplicate BLOCKS over those four copies — 2,217 /
  1,204 / 3,472 / 1,509 bytes — returns **zero**, because they are paraphrases rather than copies.
  The tempting repair is a similarity threshold, and it is refused: a threshold is a model inside a
  command specified to have none, and the number that decides truth is un-reviewable.

  So the unit is smaller than the block. Paraphrases share long verbatim SENTENCES even when their
  blocks differ — measured: *"Graphify extraction replaces the single project graph; never target a
  package or `src` subtree, because doing so evicts every file outside that subtree."* is
  byte-identical in `refine.md:136-137` and `code-review.md:47-49`. Exact matching at sentence
  granularity is deterministic, has no threshold that decides truth, and a reviewer can check it by
  reading two lines.

  Findings are aggregated per FILE PAIR because of what the corpus actually holds. Measured over 33
  prompt documents at a 120-character floor: **21 duplicated sentence groups, 5,242 redundant bytes,
  18 file pairs** — top pair `continue.md ↔ verify.md` at 2,131 B, then `aof-architect.md ↔
  aof-qa.md` at 787 B. Twenty-one findings is a lint nobody reads. Eighteen pairs ranked by bytes is
  a list somebody acts on, and the aggregate is a number a retrospective can plot.

  The floor is a gradient, not a detail: **21 groups at 120 characters, 12 at 200, and 0 at 300.** A
  number that decides the entire output that steeply must not be a literal buried at a comparison
  site — it is declared once, and the value the run actually used is reported in the run's own
  output, so a reader of a clean result can tell how much of the corpus the floor hid.

  Normalisation is whitespace collapsed per paragraph, which is what makes reflow invisible: the same
  sentence wrapped to 100 columns in one document and 120 in another is the same sentence, and a rule
  that could not see that would report zero over a corpus whose documents are hand-wrapped.

  The corpus is the prompt layer **as installed in the audited repo**, discovered through the runtime
  local roots and the resource-kind plurals the model already declares. Never a second spelling of
  `.claude/agents`, and never `src/bundle/**` — the bundle source exists only in this checkout, and
  what runs is what is installed. This repository's installed copies already drift from its bundle,
  which is precisely why the distinction is not academic.

  This rule reports at `warn` and never reddens a strict run. Eighteen pairs arrive on day one; a
  rule that fails eighteen builds on arrival is a rule that gets disabled, and its value was never
  the first eighteen — it is the nineteenth.

  ADR-004 §1, §2, §3, §4. ADR-008 §4. FF-7702.

  Scenario: one sentence, byte-identical in two documents, is one finding about that pair
    Given two documents in the installed prompt layer carrying the same sentence, byte-identical and longer than the declared floor
    When the prompt-layer lane runs over that corpus
    Then one `audit-instruction-duplicated` finding is returned
    And it names both documents
    And it reports the redundant byte total those documents share
    And it carries the duplicated sentence

  Scenario Outline: the match is exact over the normalised sentence, and the floor is a boundary
    Given two documents in the installed prompt layer, each carrying <case>
    When the prompt-layer lane runs over that corpus
    Then <outcome>

    Examples: what exact matching at the declared floor admits and refuses
      | case                                                                        | outcome                                    |
      | a byte-identical sentence one byte longer than the declared floor           | one finding is returned for that file pair |
      | a byte-identical sentence exactly the declared floor in length              | one finding is returned for that file pair |
      | a byte-identical sentence one byte shorter than the declared floor          | no finding is returned                     |
      | the same sentence, wrapped to a different line width in each document       | one finding is returned for that file pair |
      | the same sentence, indented differently in each document                    | one finding is returned for that file pair |
      | the same sentence, followed by a different number of spaces in each         | one finding is returned for that file pair |
      | the same rule stated in different words in each document                    | no finding is returned                     |
      | the same sentence with a single word changed in the second document         | no finding is returned                     |
      | the same sentence with different emphasis markers in the second document    | no finding is returned                     |

  Scenario: four paraphrased copies of one rule are invisible to this detector, and that is the design
    Given four documents each stating one rule in different words, sharing no sentence between them
    When the prompt-layer lane runs over that corpus
    Then no `audit-instruction-duplicated` finding is returned
    And a limit record is returned all the same, saying a paraphrase is invisible to this rule
    And adding one byte-identical sentence above the floor to two of those documents returns one finding for that pair

  Scenario: a sentence repeated inside one document is not a pair
    Given one document carrying the same sentence twice, above the declared floor, and no other document carrying it
    When the prompt-layer lane runs over that corpus
    Then no `audit-instruction-duplicated` finding is returned
    And moving the second copy into a second document returns one finding naming both documents

  Scenario: findings are one per file pair, ranked by the bytes they cost
    Given three documents in which A and B share four sentences totalling 900 bytes above the floor
    And A and C share one sentence of 200 bytes above the floor
    When the prompt-layer lane runs over that corpus
    Then two `audit-instruction-duplicated` findings are returned, not five
    And the finding naming A and B reports 900 redundant bytes
    And the finding naming A and C reports 200 redundant bytes
    And the finding reporting the larger byte total is returned before the other

  Scenario: the run reports the floor it used, including when it found nothing
    Given a prompt corpus carrying no duplicated sentence at all
    When the prompt-layer lane runs over that corpus
    Then no `audit-instruction-duplicated` finding is returned
    And the run's output states the sentence floor this run applied, as the value it used
    And that floor is greater than zero
    And the same corpus run with a higher floor supplied reports the higher value and returns no finding

  Scenario Outline: the byte total ranks a finding and never changes its severity
    Given a corpus in which the duplicated sentences amount to <redundancy>
    When the prompt-layer lane runs over that corpus
    Then every `audit-instruction-duplicated` finding returned is at `warn`
    And none is returned at `error`

    Examples: the shapes this rule meets, from one sentence to the corpus it arrives on
      | redundancy                                        |
      | one sentence at the floor, in one file pair       |
      | four sentences totalling 900 bytes, in one pair   |
      | 5,242 bytes across 18 file pairs                  |

  Scenario Outline: the corpus is the installed prompt layer, discovered through the declared runtimes and resource kinds
    Given an audited project whose documents sit at <location>
    And two of those documents carry one byte-identical sentence above the floor
    When the prompt-layer lane runs over that project
    Then <outcome>

    Examples: what the sweep reaches, and what it deliberately does not
      | location                                                  | outcome                                    |
      | the Claude runtime's local root, under the agents kind     | one finding is returned for that file pair |
      | the Claude runtime's local root, under the commands kind   | one finding is returned for that file pair |
      | the Claude runtime's local root, under the rules kind      | one finding is returned for that file pair |
      | the Claude runtime's local root, under the skills kind     | one finding is returned for that file pair |
      | the Codex runtime's local root, under the agents kind      | one finding is returned for that file pair |
      | the OpenCode runtime's local root, under the commands kind | one finding is returned for that file pair |
      | a `src/bundle/agents` directory in the same project        | no finding is returned                     |
      | a `docs/` directory of ordinary project markdown           | no finding is returned                     |

  Scenario: an audited project whose installed layer drifts from its own bundle is judged on what is installed
    Given a project holding both an installed prompt layer and a `src/bundle` copy of it
    And a byte-identical sentence above the floor appears in two documents of the bundle copy only
    When the prompt-layer lane runs over that project
    Then no `audit-instruction-duplicated` finding is returned
    And the same sentence appearing in two installed documents returns one finding naming the installed paths
