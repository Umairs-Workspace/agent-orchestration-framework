@executable @cli @work @work-stream
Feature: A story declares the ADRs that bind it

  The SPEC assumes this key already exists — *"Story frontmatter already declares which ADRs a story
  needs; a story should read its slice."* Measured at refine, it does not: across **201**
  `STORY.md` files the frontmatter key set is exactly
  `{type, number, slug, title, parent, status, owner, created, updated, schema, aofVersion}` plus
  `depends` (32 files) and `origin` (1). **Zero** carry `adrs:`, and no `adr`-shaped key exists
  anywhere under `wiki/work/`.

  So the declaration is **introduced** here, exactly as `depends:` was: optional, additive, and
  benign when absent. That last property is what lets 201 existing stories keep validating
  untouched, and it is the same forward-reading discipline the run record's key lineage follows
  (68/ADR-001 — absence is benign).

  **Absent means today's behaviour**, not "no constraints": a story that declares nothing is bound
  by its milestone's register as it is now, and its brief carries the register rather than a slice.
  Silence must never read as an exemption from the architecture.

  ADR-006. Task 01 makes the declared ids addressable; FF-7008 keeps the source one artifact.

  Scenario: a story declares the ADRs it is bound by
    Given a story whose frontmatter declares a list of ADR ids
    When the story is read
    Then those ids are available as the story's declared ADRs
    And they are read in the order the story declared them

  Scenario: a story that declares nothing is still bound by its milestone
    Given a story whose frontmatter carries no ADR declaration
    When the story is read
    Then its declared ADR list is empty
    And the story is treated as bound by its milestone's register, exactly as today

  Scenario: the key is optional across the existing stream
    Given every story already in the work stream
    When the stream is validated
    Then no story is reported as invalid for omitting the declaration

  Scenario: a declaration that names an id the milestone does not have is surfaced
    Given a story declaring an ADR id absent from its milestone's architecture
    When the item is checked
    Then the unresolved declaration is reported
    And the story is not silently treated as having declared nothing

  Scenario: a standalone story declares nothing that would not resolve
    Given a story with no parent milestone
    And an ADR declaration on that story
    When the item is checked
    Then the unresolvable declaration is reported rather than resolved against an unrelated item

  Scenario Outline: declaration shapes
    Given a story whose declaration is <declared>
    When the story is read
    Then the outcome is <outcome>

    Examples: the same tolerance the delivered `depends` key is held to
      | declared                        | outcome                                        |
      | a list of one id                | that id, declared                              |
      | a list of several ids           | those ids, in declaration order                |
      | an empty list                   | no declared ids, treated as absent             |
      | the key omitted entirely        | no declared ids, treated as absent             |
      | a duplicate id listed twice     | the id once, declaration order preserved       |
      | not a list at all               | reported as malformed rather than partly read  |
