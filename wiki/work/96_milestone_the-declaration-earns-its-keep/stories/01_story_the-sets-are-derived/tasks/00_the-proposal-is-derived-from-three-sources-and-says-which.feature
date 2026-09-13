@executable @cli @work @planning
Feature: The read and write sets are proposed from three sources, and every proposed entry names the source that proposed it

  Story 83's read contract cut cache-creation per agent spawn from 3,082,276 to 936,394 and 874,694
  across two milestones — 69.6% and 71.6% — and landed almost entirely on the reviewers. The builder
  did not follow: `aof-developer` is 53% of milestone 63's subagent cache-creation at 2,059,059 per
  run, four and a half times a QA run. The asymmetry has a mechanism. A reviewer is handed the diff
  and the criteria, so a short `reads:` costs it little; a builder must reach whatever the work
  actually touches, so a short set is not a smaller context but an unplanned cold read at full price.

  The sets are short, repeatedly, in two independent streams: 63/R4 records write-set and
  read-set escapes across four consecutive stories, and names the fix — *"derive the sets from the
  contract's own citations, and treat a repeat species as a tooling gap rather than a lapse of
  care."* A downstream retrospective records `files:` short of the test lane three stories running.

  A proposal an author cannot audit is one they will accept wholesale, so every entry carries the
  reason it was proposed. The reasons are a CLOSED exported set, which is what makes a seventh source
  an edit with an ADR behind it rather than a string somebody passed — the same discipline
  `WIDENING_REASONS` already applies one module over.

  The graph is READ, never BUILT. A build is minutes even on the unchanged path, and a proposal that
  might cost minutes before it costs seconds is not one an author will run. Reaching the artifact goes
  through the shipped `normalizeGraph`/`computeImpact` and nowhere else. An absent or unreadable
  artifact is not an empty answer: it yields a citation-only proposal that SAYS the graph was
  unavailable, because "no coupling found" and "I could not learn the coupling" rendering identically
  is the falsehood-shaped-as-an-answer this family already refuses elsewhere.

  What would quietly undo this: a second reader of `graph.json`; a proposal that omits its reasons
  "for readability"; and treating a module the graph reports `present: false` as a module with no
  dependents, when its coupling is simply unknown.

  ADR-004 §2, §3. FF-9602.

  Scenario: the graph's coupling around a subject file is proposed, with its reason
    Given a graph in which two modules import the story's subject file and it imports one other
    When a proposal is derived for that story
    Then the two importers and the one import are proposed
    And each carries a reason naming the graph as its source

  Scenario: a citation in the milestone's own documents is proposed, with its reason
    Given a milestone whose SPEC and ADRs cite a file the graph reports no coupling for
    When a proposal is derived for a story under it
    Then that file is proposed for `reads:`
    And it carries a reason naming the citation as its source

  Scenario Outline: every proposed entry carries a reason from the closed set
    Given a proposal derived over a graph and a set of citations
    When each proposed entry is read
    Then its reason is a member of the exported reason set
    And a reason outside that set is <outcome>

    Examples: a closed vocabulary, asserted rather than trusted
      | outcome                                                    |
      | rejected, so a seventh source cannot arrive as a free string |

  Scenario Outline: an unusable graph yields a citation-only proposal that says so
    Given the graph artifact is <artifact>
    And the milestone's documents carry citations
    When a proposal is derived
    Then the citation-derived entries are proposed
    And the proposal states that graph coupling was unavailable
    And it is not reported as a complete proposal

    Examples: two ways to have no graph, one honest answer
      | artifact             |
      | absent               |
      | present but unreadable |

  Scenario: a subject file the graph does not cover is reported as unknown, never as uncoupled
    Given a graph that reports `present: false` for the story's subject file
    When a proposal is derived for that story
    Then the proposal states that the file's coupling is unknown
    And it does not report that file as having no dependents

  Scenario: the graph is read through the shipped reader and never built
    Given the module that derives a proposal
    When it is examined
    Then it reaches the graph only through the shipped normaliser and impact reader
    And it holds no second parse of a graph artifact path
    And it invokes no graph build of any form and starts no child process

  Scenario: the proposal is ordered and stable
    Given the same story, the same graph and the same citations
    When a proposal is derived twice in one process
    Then the two proposals are identical
    And a second proposal derived against a different planted graph differs from the first
