@cli @work @memory @executable
Feature: backend selection

  Rule: R1 · Memory backend choice is explicit and preserves the shared memory contract

    Scenario: E1 · Local memory works without Claude
      Given a Codex project explicitly selects local memory
      And any attempted Claude spawn is refused by the test fixture
      When a learning is ingested and recalled
      Then the shared learning id and vocabulary survive the round trip
      And no Claude process or Graphify extraction is requested
    
    Scenario Outline: Backend selection is explicit
      Given memory configuration "<config>"
      When recall or ingest is requested
      Then it uses "<behavior>"
    
      Examples:
        | config                                  | behavior                              |
        | backend none                            | established disabled-memory behavior  |
        | backend local                           | existing local memory contract        |
        | graphify with absent extraction backend | legacy Claude extraction              |
        | graphify with supported explicit backend | exactly the selected extractor       |
        | graphify with unsupported backend       | refusal naming the unsupported value  |
    
    Scenario: Extraction failure cannot silently select another backend
      Given the explicitly selected extractor is unavailable
      When an ingest is attempted
      Then the failure names the missing dependency
      And no other assistant or memory backend is started

