@executable @cli @assets @work-stream
Feature: The framework's own anchors, declared from evidence and no further

  The taxonomy is a vocabulary until something is said in it. This declares the framework's own
  anchors — the ones aof can defend against its own code — and delivers them the way the registry is
  delivered: as bundle members with a single source, installed into the workspace, so that the
  registry a consumer runs is the registry aof ships.

  The discipline is the one the day-one registry set, and it matters more here because milestone 55
  puts an autonomy rung behind the result. Declaring an anchor edge to every loop would turn the
  groundedness report green in an afternoon and make it worthless in the same afternoon. A
  fabricated anchor is the same failure as a fabricated owner, one milestone later and with more
  riding on it. What the evidence supports gets declared; what it does not gets reported as absent.

  ADR-001, ADR-006. FF-5501.

  Scenario: the anchors ship from one source and are installed, not hand-written downstream
    Given a workspace that has installed the bundle
    When its registry is compared with the framework's source records
    Then the installed anchors match the source
    And the installed copies are marked as framework-owned rather than workspace-authored

  Scenario: every declared anchor names an authority that exists
    Given the framework's own anchor records
    When each anchor's declared authority is resolved against this repository
    Then every one of them resolves

  Scenario: an anchor's prose body cites the evidence for its edges
    Given the framework's own anchor records
    When each is read
    Then each declared edge has a citation in the record's body

  Scenario: loops with no defensible anchor are left unanchored and reported
    Given the framework's own registry after the day-one anchors are declared
    When the groundedness report is produced
    Then the loops with no anchor are named
    And no anchor edge exists that the record's body does not defend

  Scenario: installing the anchors does not disturb a consumer's own records
    Given a workspace carrying its own loop records beside the framework's
    When the bundle is updated
    Then the framework's anchors are refreshed
    And the workspace's own records are left exactly as they were
