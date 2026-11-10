Feature: Declared decision edges capture their actual recall observations

  Rule: R1 · Each declared decision-recall edge records its own completed observation

    @manual @docs @work @memory
    Scenario: E1 · Refine preserves two distinct role observations
      Given a disposable item whose architect and PO each recall once during refine
      When each role records the decision its own recall informed
      Then the item ledger contains two distinct recall ids with the actual queries and returned identities
      And each returned identity has that role's explicit honoured, departed or irrelevant verdict
      And the architect recall retains its area filter and the PO recall retains its item filter
      And the human recall prose cites the observation it explains

    @manual @docs @work @memory
    Scenario: E2 · An empty developer recall is still recorded
      Given a disposable story whose continue developer recall returns an empty block
      When the developer records the build decision
      Then the story ledger contains one empty recall observation attributed to the developer
      And the query retains the existing near-miss filter
      And no automatic honoured verdict or extra retrieval is invented

    @manual @docs @planning @memory
    Scenario: E3 · Shatter captures once before the cut and assigns one ledger owner
      Given a PRD session recalls once before partitioning into three backlog drivers
      When the drivers are framed and the PO records its decisions
      Then the first driver in PRD order owns exactly one recall observation
      And each other driver's recall prose cites that observation owner
      And the ledger preserves the original unscoped query and returned records
      And no per-driver replay of the original recall is counted

    @executable @docs @work @memory
    Scenario Outline: Shipped instructions bind the complete capture protocol at every edge
      Given the authored and rendered procedure for "<edge>"
      When the registered edge control checks its executable command forms and decision ordering
      Then it verifies actual-result retention, explicit per-record verdicts and one record-recall submission
      And it verifies empty-result handling and the existing retrieval filters
      And removing that edge's capture obligation makes the control fail naming the edge

      Examples:
        | edge               |
        | shatter-po         |
        | refine-architect   |
        | refine-po          |
        | continue-developer |

    @manual @docs @planning @memory
    Scenario: Shatter without a created driver does not invent an item ledger
      Given shatter has retained its recall but stops before creating any driver
      When it reports its incomplete framing result
      Then it reports no completed ledger capture
      And it creates no placeholder work item or sibling recall store

    @executable @docs @adapter @memory
    Scenario: Runtime output and manifest reflect the authored protocol
      Given the four amended bundle procedures
      When the normal renderer creates Claude, Codex and existing OpenCode outputs in isolation
      Then each rendered procedure contains its runtime's valid capture invocation
      And the shipped manifest and regenerated owned files agree with the renderer
      And removing capture from one render is detected by FF-15303

    @manual @docs @assets @memory
    Scenario: Existing operator modifications survive owned-output regeneration
      Given the checkout has recorded pre-existing changes to refine procedures and lock state
      When the builder regenerates the owned workflow outputs through the normal tool
      Then those prior changes are preserved or a genuine ownership collision is reported
      And no force-adopt or hand-edit of a generated procedure is used to clear the collision
