@cli @adapter @work-stream @manual
Feature: live profile proof

  Rule: R1 · Codex completion requires a valid phase result from a supported protocol

    Scenario: Real candidate profile proves lifecycle capabilities
      Given an installed Codex CLI and already authorized access in an isolated fixture
      When create, resume, stop, native-question availability and usage probes run
      Then verification records the exact CLI version and protocol profile
      And it records the actual native identity, request and terminal shapes observed
      And a question fallback is exercised if the native question tool is unavailable
      And only successfully probed capabilities are marked supported
    
    Scenario: Unavailable live access leaves compatibility unproven
      Given no authorized supported CLI can complete the probes
      When the profile proof is attempted
      Then the missing prerequisite and attempted procedure are recorded
      And the story is not reported accepted
      And no authentication or funding mode is substituted

