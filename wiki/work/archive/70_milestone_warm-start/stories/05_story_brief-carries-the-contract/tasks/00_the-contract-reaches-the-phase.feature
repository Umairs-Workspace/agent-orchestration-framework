@executable @cli @work @work-stream @bug @finding-F-11
Feature: A brief carries the contract the phase must satisfy

  The milestone's headline artefact is a brief that hands a phase its context instead of pointing it
  at a tree. Measured through the real reader against this milestone's own seven stories, that brief
  hands a `continue` phase the story description and nothing else, and a `verify` phase **247
  characters** — an item ref plus a notice saying everything was dropped. The acceptance criteria
  the phase exists to satisfy never appear. Neither does the architecture that binds it.

  The cause is not a shortage of budget. Briefs land at 3,122–4,047 chars against an 8,000-char
  ceiling — **less than half the budget spent while the contract is dropped**. A task contract set
  measures 7,115–12,846 chars, and a section is retained whole or dropped whole, so the criteria can
  never fit at any ceiling this milestone would accept.

  ADR-009 rules that the ceiling stands and the drop-whole policy does not: every section declares a
  **condenser**, a pure structure-aware reduction to its highest-value form, and is offered condensed
  before it is ever sacrificed. A contract condensed to its scenario headlines measures 13% of full
  size — 12,310 chars becomes 1,555 — which is the contract in the sense that matters to a brief: it
  states what must be satisfied, in the author's own exact words, and is addressable for the detail.

  A condenser is not a promise that everything fits. Measured across all 211 stories in this work
  stream that have contracts, the headline condenser carries the contract for 191 and still
  overflows for **13** — `53/05` condenses 130,884 chars to 10,699, still past an 8,000 ceiling.
  So a bounded condenser carries what the budget holds and **states how many scenarios it left out
  and where they are read**. A count is what keeps it honest at any size; a silent prefix is the
  same lie in a smaller package.

  A phase must also be able to tell a condensed contract from a complete one. A phase that cannot
  will confidently act on a partial contract — the precise harm ADR-003 exists to prevent, arriving
  by a new route. ADR-009 §6.

  Scenario: a contract too large to ship whole is condensed rather than dropped
    Given a story whose task contracts exceed the brief's ceiling on their own
    When the brief is compiled for its build phase
    Then the brief carries the task contracts in condensed form
    And the contracts are not absent from the brief
    And the brief is still within the ceiling

  Scenario: the condensed contract names every acceptance criterion it can carry
    Given a story whose contracts are condensed to fit
    When a phase reads the contract section
    Then every scenario the condensed form can carry is named
    And each named scenario's verification tag is present
    And any scenario left out is counted, never silently omitted
    And the count is accompanied by where the full contract is read

  Scenario: a section small enough to fit whole is never condensed
    Given a story whose task contracts fit within the remaining budget
    When the brief is compiled
    Then the contracts appear in full
    And nothing in the brief describes them as condensed

  Scenario: the architecture a story declares reaches its brief
    Given a story that declares the ADRs it depends on
    When the brief is compiled
    Then the declared architecture reaches the brief
    And it is not evicted by a higher-priority section that did not fit

  Scenario: a condensed section is named as condensed, not merely shortened
    Given a brief in which one section was condensed and another was dropped
    When a phase reads the truncation notice
    Then the condensed section is identified as condensed
    And the dropped section is identified as dropped
    And the two are distinguishable from one another

  Scenario: a condensed section says where the full text lives
    Given a brief carrying a condensed section
    When a phase needs the detail the condenser removed
    Then the brief states which form survived
    And it points at where the complete text can be read

  Scenario Outline: what each section reduces to when the budget is tight
    Given a section of kind <section> that cannot be carried whole
    When the brief condenses it
    Then what survives is <retained>
    And what it drops is <dropped>

    Examples: the declared condensers — ADR-009 §2, with two sections declared non-condensable
      | section      | retained                                             | dropped                                             |
      | tasks        | feature, rule and scenario headlines with their tags | step bodies, data tables and narrative prose        |
      | architecture | each declared ADR's heading and decision paragraph   | the context and consequences around each decision   |
      | fitness      | the register's rows                                  | the instructional comment wrapping the table        |
      | objective    | the specification's objective block                  | every other block of the specification              |
      | story        | the user story block, then the notes if budget holds | frontmatter, scaffolding and the rest of the record |
      | item         | the whole ref — it has no condensed form             | nothing, at any size; it is never sacrificed        |
      | dependencies | the whole edge list — it has no condensed form       | nothing; it is sacrificed whole, lowest first       |

  Scenario Outline: a phase can answer these about its own contract
    Given a brief whose contract section was condensed
    When a reader inspects the brief alone
    Then it answers <question>

    Examples: questions a condensed contract must still answer
      | question                                                       |
      | was this section condensed, or is it the contract in full      |
      | which scenarios must be satisfied, in their author's own words |
      | which verification lane each named scenario belongs to         |
      | whether any scenario was left out of the list                  |
      | where the complete contract text can be read                   |
