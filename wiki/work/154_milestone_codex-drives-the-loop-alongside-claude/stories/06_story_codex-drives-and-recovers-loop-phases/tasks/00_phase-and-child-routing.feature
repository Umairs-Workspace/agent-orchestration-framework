@cli @work @work-stream @executable
Feature: phase and child routing

  Rule: R1 · Assistant choice changes execution without bypassing loop gates or durable questions

    Scenario: E1 · Codex refine receives the real procedure and bounded brief
      Given a Codex loop for item "154" with a resolved execution envelope
      When its refine phase starts
      Then the launched input identifies the native refine skill, item and mode arguments
      And it contains the compiled bounded phase brief
      And the phase result proceeds to the existing loop gates
    
    Scenario Outline: Every driven door propagates the chosen runtime
      Given a Codex execution with explicit model and effort
      When "<door>" starts locally or through a child drive
      Then Codex receives the recorded phase settings and item scope
      And no Claude command, transcript directory or trust helper is required
    
      Examples:
        | door               |
        | refine             |
        | continue           |
        | independent review |
        | verify             |
        | fix                |
        | repair             |
    
    Scenario: Execution and asset variant cannot silently disagree
      Given the selected Codex procedure is missing or rendered for an incompatible profile
      When the phase preflight runs
      Then the phase refuses with the missing asset or profile named
      And no assistant starts

