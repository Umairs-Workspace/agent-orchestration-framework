@executable @cli @work @work-stream
Feature: Liveness is stamped by what the session produced, by a hook that derives nothing

  A heartbeat that a timer emits proves the timer is alive. The two 11h07m burns would have emitted
  one faithfully for eleven hours. What actually distinguishes a working run from a frozen one is
  whether new tool results are arriving — Restate's inactivity timeout means exactly that, and a
  Claude Code tool-result event is the journal entry it maps onto.

  So the producer is a `PostToolUse` hook running inside the driven session, and it is authored to
  the contract the one existing bundled hook already proved. That contract is not stylistic. Its
  clauses are each a measured incident:

    - DERIVES NO WORKSPACE IDENTITY — a cwd-derived id silently discarded 100% of the
      worker→control frames for days (TECH_DEBT item 4).
    - EXIT 0 ON EVERY PATH — `PostToolUse` cannot block, so a non-zero exit only ever shows the
      model an error about bookkeeping it never asked for.
    - EXEC FORM, NEVER SHELL FORM — the shell interpreter differs across the Windows control node,
      the Mac worker and the WSL worker, and a hook that behaves differently per node is the
      cross-machine defect class this repo keeps paying for.
    - NOTHING IMPORTED FROM `src/`, NO STORE OPENED, NO CLI BOOTED — the hook fires on every tool
      call; a cold Node boot through the CLI on each one is the cost, not the fix.

  The run it belongs to arrives in the ENVIRONMENT, set at spawn beside the attribution 68/01
  already sets there. Env is per-process and untracked, which is the point: an absolute path
  written into `.claude/settings.json` names another checkout's file the moment a `git worktree`
  inherits that tracked file, and that is a failure this repo has already paid for once.

  ADR-003. FF-6903, FF-6904 (an extension of the existing hook guard to every bundled hook body).

  Scenario: a tool result in a driven session records liveness for its run
    Given a session spawned for a known run
    And a tool result arriving in that session
    When the hook fires
    Then the run's liveness is recorded as of that moment

  Scenario: a session that was not spawned for a run does nothing
    Given a session whose environment names no run
    When the hook fires
    Then nothing is recorded
    And the hook exits successfully

  Scenario: liveness advances without changing anything else about the run
    Given a running run with a recorded liveness stamp
    When a later tool result records liveness again
    Then only the liveness stamp advances
    And the run's state and outcome are unchanged

  Scenario Outline: the hook survives every condition that would make it noisy
    Given the hook invoked <condition>
    When it runs to completion
    Then it exits successfully
    And it reports nothing to the session

    Examples: exit 0 always — the clause is the contract, not a nicety
      | condition                                  |
      | with no environment naming a run           |
      | with an environment naming an unknown run  |
      | with malformed input on standard input     |
      | with no input at all                       |
      | when the destination cannot be written     |

  Scenario: the hook is installed and drift-protected like the bundle asset it is
    Given a workspace with the bundle installed
    When the installed hooks are inspected
    Then this hook is registered on tool completion and marked as framework-managed
    And a local edit to its body is reported as drift

  Scenario: the hook body derives nothing
    Given the hook's source
    When it is inspected
    Then it imports nothing from the framework's own modules
    And it opens no store, boots no CLI and computes no workspace identity

  Scenario: the identity arrives beside the attribution already set at spawn
    Given a spawn that carries run attribution
    When the spawned environment is inspected
    Then it names the run the hook will stamp
    And the environment scrub that removes the editor-attachment vector has not removed it
