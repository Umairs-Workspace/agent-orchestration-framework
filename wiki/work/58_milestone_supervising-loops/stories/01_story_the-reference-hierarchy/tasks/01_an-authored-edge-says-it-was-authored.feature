@manual @docs @assets @validate
Feature: An authored edge says, in its own record, that it was authored

  Five of the seven ownership edges this registry now carries could not be found anywhere in the
  repository — they were decided. Two were read off artifacts that already existed. Once installed,
  both kinds are the same key in the same frontmatter and are indistinguishable, unless the record
  that declares the edge says which it is.

  What changes is that each record declaring an edge this milestone decided states in its own body
  that the edge is a design act and what judgment it rests on, and each record declaring an edge the
  repository already stated names the artifact it was read from. The one reference that no cycle
  revises — a rule the code fixes — is carried by an anchor grounded on that rule, so its authority
  is a thing that resolves rather than a sentence written into a loop record to fill the gap.

  The restraint is the one this registry has held since it shipped: a citation the repository does
  not supply is never manufactured. An edge with no evidence is declared as a decision, in the open,
  where the reader meets the claim.

  ADR-001 §2, §3, §4. FF-5806.

  Scenario: an edge this milestone decided declares itself decided
    Given the shipped records that declare an ownership edge authored by this milestone
    When each is read
    Then it states in its own body that the edge is this milestone's judgment and not a citation

  Scenario: an edge read off an existing artifact names that artifact
    Given the shipped records that declare an ownership edge the repository already stated
    When each is read
    Then it names the artifact the edge was read from

  Scenario: the two kinds are told apart by reading
    Given any shipped record declaring an ownership edge
    When it is read on its own
    Then whether the edge was authored or discovered is answerable without opening another file

  Scenario: the reference no cycle revises is carried by an anchor
    Given the loop whose reference is a rule the code fixes
    When the node setting its reference is read
    Then it is an anchor grounded on a rule the optimizer is not permitted to touch

  Scenario: the anchor's authority resolves
    Given the anchor that grounds that reference
    When the authority it observes is resolved
    Then it names something that exists in the system

  Scenario: no authority introduced by this story fails to resolve
    Given every record this story creates or edits
    When each authority it names is resolved
    Then every one of them resolves

  Scenario: no authored edge is dressed as a discovered one
    Given the shipped records that declare an ownership edge authored by this milestone
    When each is read
    Then none of them offers a citation for the relation it decided

  Scenario Outline: every ownership edge in the registry, and how it arrived
    Given the registry as it ships
    When the record declaring the edge from <owner> to <loop> is read
    Then it says the edge was <how> and names <authority>

    Examples: seven edges — two the repository already stated, five this milestone decided, and each says which it is where it is declared
      | owner                       | loop                             | how        | authority                                                                 |
      | actor:operator              | loop:autonomous-cascade          | discovered | the operator's own range argument, threaded to the cascade's scope        |
      | actor:product-owner         | loop:verify-triage-accept        | discovered | the triage step the verify command assigns to the product owner          |
      | loop:autonomous-cascade     | loop:build-to-green              | authored   | the cascade selects the item whose contract the build drives to green    |
      | loop:autonomous-cascade     | loop:review-fix-rereview         | authored   | the cascade selects the item whose contract and ADRs the review judges   |
      | anchor:run-lifecycle-policy | loop:run-resilience              | authored   | the closed transition and retry rules the code fixes                     |
      | actor:operator              | loop:mesh-assignment-reclaim     | authored   | two configuration keys nothing but a hand edit changes                   |
      | actor:operator              | loop:retrospective-memory-ingest | authored   | a governance judgment with no declared revising cycle                    |
