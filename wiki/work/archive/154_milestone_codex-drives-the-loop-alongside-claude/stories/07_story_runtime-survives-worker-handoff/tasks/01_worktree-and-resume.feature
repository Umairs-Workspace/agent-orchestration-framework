@cli @work @work-stream @executable
Feature: worktree and resume

  Rule: R1 · A handoff executes only where the recorded runtime and required assets are available

    Scenario: A prepared worktree contains the selected native assets
      Given generated Codex files are ignored by Git and both assistants are installed
      When a Codex lane worktree is prepared
      Then its required native skills, agents, guidance and owned configuration are available
      And references resolve inside the lane's workspace
      And unrelated user credentials or trust grants are not copied
    
    Scenario Outline: Worker lifecycle retains ownership across interruptions
      Given an active Codex assignment with a native thread
      When "<event>" occurs
      Then the controller observes "<outcome>"
    
      Examples:
        | event                         | outcome                                   |
        | worker reconnects             | same run and native thread attribution    |
        | assignment is resumed         | recorded Codex settings preserved         |
        | operator stops the lane       | Codex interruption and bounded cleanup    |
        | required skill is absent      | preflight refusal before phase execution  |
        | native session no longer exists | explicit unavailable-session handling   |
    
    Scenario: Claude worktree preparation keeps its current behavior
      Given a legacy Claude assignment without an execution envelope
      When its worktree is prepared and launched
      Then the existing Claude generated files and trust behavior remain available

