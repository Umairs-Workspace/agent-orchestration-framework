@cli @planning
Feature: Planning init writes the Cowork packages and says how to install them

  WHY. Cowork has no plugin CLI, so aof cannot install anything there. The most honest thing it can
  do is write the aof planning plugin and the pinned planner as uploadable files and say exactly how
  to install them. A run that fails part-way writes nothing, and aof records the install as
  unconfirmed because it cannot see Cowork.

  Background:
    Given a target repo whose lock records a claude planning entry
    And the marketplace commit sha is resolved from a fixture so no network is touched
    And the planner source is a fixture tree at that commit

  Rule: R1 · One command writes the packages, says how to install them, and never claims the install happened

    @executable
    Scenario: E1 · a cowork run writes the plugin and the planner packages
      When I run "aof planning init --runtime cowork"
      Then the command exits 0
      And these files exist:
        | path                                          |
        | .aof/cowork/aof-planning.plugin               |
        | .aof/cowork/pm-skills/pm-execution.plugin     |
        | .aof/cowork/pm-skills/pm-product-discovery.plugin |
        | .aof/cowork/pm-skills/pm-product-strategy.plugin  |
      And the output tells the user to upload each of those files under "Customize › Plugins › Add › Upload plugin"
      And the output tells the user to connect the repo folder in Cowork and run "/aof-planning:shatter"

    @executable
    Scenario: E2 · a cowork dry-run previews and touches nothing
      When I run "aof planning init --runtime cowork --dry-run"
      Then the command exits 0
      And the output lists the four package paths and the upload steps
      And no file exists under ".aof/cowork/"
      And the lock file is byte-for-byte what it was
      And no process was spawned and no network was touched

    @executable
    Scenario: E3 · a failed planner clone writes nothing
      Given the planner clone fails
      When I run "aof planning init --runtime cowork"
      Then the command exits non-zero
      And no file exists under ".aof/cowork/"
      And the lock records no planning entry for "cowork"

    @executable
    Scenario: E4 · the install is recorded as unconfirmed, and never claimed
      When I run "aof planning init --runtime cowork"
      Then the lock's planning entry for "cowork" has "cowork.installConfirmed" equal to false
      And the lock's planning entry for "cowork" has "sha" equal to the fixture sha
      And the output says the Cowork install is not confirmed
      And no output line says the plugins were installed

    @executable
    Scenario: the optional planner plugin follows --with-optional
      When I run "aof planning init --runtime cowork --with-optional"
      Then the file ".aof/cowork/pm-skills/pm-market-research.plugin" exists
      And no file named "pm-ai-shipping.plugin" exists under ".aof/cowork/"

  # The SPEC's outsider check. It needs the Claude desktop app, a Cowork session and a real repo,
  # so the operator runs it at verify and records the evidence in VERIFICATION.md.
  @uat
  Scenario: E5 · from Cowork, a PRD shatters into the work tree the CLI validates
    Given "aof planning init --runtime cowork" has run in a repo whose lock already records claude
    And every package under ".aof/cowork/" is uploaded in Cowork, and the repo folder is connected
    When the operator writes a PRD with the planner in Cowork and runs "/aof-planning:shatter"
    Then the shattered drivers' record docs land under "wiki/work/backlog/"
    And "aof work validate" run from the Windows CLI passes over them
    And the lock's claude entry is unchanged
