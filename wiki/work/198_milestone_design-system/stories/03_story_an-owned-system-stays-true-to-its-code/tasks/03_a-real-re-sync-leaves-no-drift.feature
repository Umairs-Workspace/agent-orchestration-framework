@manual @cli @design
Feature: A real re-sync at a milestone's accept carries a code change to an owned system, keeps what the page owns, and leaves no drift

  WHY. The Artifact calls are the session's (ADR-003), so only a real run proves that verify's
  re-sync publishes what the merge wrote, that the type keeps usage notes and page edits, and that
  the system read back afterwards checks clean.

  Run it on a probe, never on the operator's own system. The probe is a copy of the "AOF" system
  that 198/01's task 05 published, titled "AOF re-sync probe". A scratch worktree names it with
  "work.ui.designSystem" = {"enabled": true, "artifact": "<the probe's link>", "mode": "owned",
  "source": ["apps/ui/src/index.css"]}. The milestone accepted is a scratch milestone made for the
  run, its stories done, and it is archived after the run, together with the probe. Record each
  scenario's evidence in this milestone's VERIFICATION.md.

  Rule: R3 · Accepting a milestone re-syncs an owned system from the code, and drift that survives the re-sync is a finding

    Scenario: a code change reaches the probe, and nothing drifts after
      Given the scratch worktree changes "--color-primary" in index.css, adds "--color-warning" and removes one colour token the probe holds
      And the scratch milestone's DESIGN.md names all three under "## Design-system changes"
      And a usage note on "color-primary" was edited on the probe's page before the run
      When "/aof:verify <the scratch milestone>" reaches the re-sync
      Then the first check reports the three changes, and no finding is logged for them
      And VERIFICATION.md records the probe's link, its version, and the removed token before the probe is published
      And the probe's next version holds the new "color-primary" with the edited usage note, and "color-warning", and not the removed token
      And the second check exits 0, and VERIFICATION.md records the new version

    Scenario: an accept with nothing to carry publishes nothing
      Given the scratch worktree's code matches the probe, and "## Design-system changes" reads "None."
      When the scratch milestone's verify reaches the re-sync
      Then the probe's version is the same before and after
      And VERIFICATION.md records the probe as in sync at that version

    Scenario: a changed component is carried from the milestone's mocks
      Given "## Design-system changes" names one component the probe holds, and the scratch milestone's mocks/ shows its new state
      When the scratch milestone's verify reaches the re-sync
      Then the probe's next version holds that component's README and preview updated to the new state

    Scenario: drift that survives the re-sync is a finding
      Given the probe's page is set to "editing" other than "code" for this check, and a token value is edited on the page between the publish and the read-back
      When the second check runs
      Then it reports that token as changed, and verify logs a finding with the check's report

  Rule: R4 · Nothing else re-syncs a system: not a reference system, not a story's accept, not the practice off, not another runtime

    Scenario: a reference system is read and never written
      Given the scratch worktree's config names the probe with "mode": "reference" and no "source"
      When the scratch milestone's verify runs, with a token changed in the code
      Then the probe's version is the same before and after

    Scenario: a story's accept does not touch the system
      When "/aof:verify" accepts one of the scratch milestone's stories with a token changed in the code
      Then the probe's version is the same before and after, and the story's record holds no re-sync

    Scenario: a title shared by two systems stops verify
      Given the config names the probe by "name": "AOF re-sync probe", and a second Design System of that title exists for this check
      When the scratch milestone's verify reaches the re-sync
      Then it stops before any publish, naming "AOF re-sync probe" and both titles and links
