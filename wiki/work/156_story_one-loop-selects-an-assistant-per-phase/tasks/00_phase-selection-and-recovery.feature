@manual @cli @work @work-stream
Feature: One loop selects and preserves native execution per phase

  Scenario: Refine with Astra and implement with Sonnet in one loop
    Given Codex advertises gpt-6-astra with high effort
    And no assistant routing is configured
    When the operator runs aof work loop 07 --level L2 --model sonnet:high --model refine=gpt-6-astra:high
    Then refinement uses Codex and implementation and verification use Claude
    And every phase run records its own runtime, model and effort
    And review and repair use the implementation selection

  Scenario: Model ownership and capability refusals
    Given a model is unknown, ambiguous or unavailable from its native assistant
    When a new loop resolves the model choices
    Then it refuses before any phase starts with a model-specific diagnostic
    And it never falls back to another assistant
    And an unsupported effort is refused by the selected assistant's capabilities

  Scenario: Runtime flags are removed from execution commands
    When the operator supplies a runtime flag to work loop or work drive
    Then command parsing rejects the unsupported flag
    And child phase launches recover their assistant from the persisted run

  Scenario: Resume after refinement and configuration changes
    Given a mixed loop stopped after successful refinement
    When the project assistant and model settings change
    And the operator resumes the loop
    Then the recorded selections remain authoritative
    And conflicting resume flags are refused

  Scenario: Worker handoff and existing records
    Given a worker receives a pinned mixed loop plan
    When it launches the declared loop
    Then the entire phase plan reaches the child
    And both runtime asset sets are prepared when required
    And existing single-runtime envelopes retain their previous behavior

  Scenario: A lane inherits a newer version of an owned generated asset
    Given the primary has refreshed its Codex assets and recorded their hashes
    And the lane contains older assets that match its own ownership lock
    When the mixed loop prepares the lane
    Then it installs the refreshed assets and updates the lane ownership lock
    And repeated preparation succeeds without further changes
    And edited or unowned destination assets still refuse before any asset is written

  Scenario: Resume recreates a retained lane from an older branch
    Given a mixed loop retains a story branch after removing its worktree
    And the primary commits corrected generated assets and ownership records
    When resume recreates and advances the lane to the primary base
    Then native assets are prepared after the branch advancement
    And retained worker commits survive advancement
    And the reopened lane is ready for its recorded phase selection

  Scenario: Windows terminal has an older npm launcher and a compatible desktop installation
    Given PATH exposes a Codex npm launcher whose CLI profile is unsupported
    And the registered Codex desktop app has an admitted profile and advertises Astra with high effort
    When the model-only loop performs its native preflight
    Then AOF launches the compatible native executable directly without a shell
    And no PATH changes or runtime flags are required
    And an explicit executable override is never silently replaced
    And missing or incompatible installations produce actionable diagnostics

  Scenario: An existing project has stale or incomplete Codex assets
    Given a selected Codex phase has a missing procedure, incompatible procedure or missing reference
    When a loop starts, resumes or receives a worker handoff
    Then the invocation refuses before minting a phase attempt or starting a native thread
    And the diagnostic names the asset and tells the operator to run aof work update
    And phases selected for Claude do not require Codex procedures

  # Verification commands and evidence are in VERIFICATION.md.
  Scenario: Advisory graph extraction cannot spawn inside the native sandbox
    Given refinement or review attempts the code-only codebase graph build
    When Graphify cannot spawn, times out or is denied by the sandbox
    Then the assistant records the unavailable graph and its failure reason
    And it continues grounding decisions in source files without stale graph evidence
    And it does not request elevated access or install tools for the advisory graph

  Scenario: Windows Store PowerShell cannot launch in the native sandbox
    Given the first pwsh on PATH is a Windows Store executable or execution alias
    And an ordinary PowerShell is available on PATH
    When AOF launches its Codex child
    Then the child discovers the ordinary shell without changing host PATH
    And native sandbox permissions and approval refusals remain unchanged
    And a preferred ordinary pwsh or the only available shell is not removed
