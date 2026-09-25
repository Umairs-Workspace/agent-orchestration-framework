@executable @cli @work @validate
Feature: each control goes red on contact — the named mutation reds exactly that control with the message the register names, and the probe is recorded

  ARCHITECTURE `## Fitness functions` (each row's `Red probe:` and `Non-vacuous:` clauses),
  VERIFICATION `## Fitness functions`. A guard whose passing state is "found nothing" is
  indistinguishable from a broken one by every signal except a red probe. For each control the
  named mutation is applied to a scratch copy of the subject (never committed), the control is run,
  it reds with a message carrying the register's clause and NO case of another id in the three
  files reds on it, the mutation is reverted, and the probe — what was changed, the message
  observed — is written into the `VERIFICATION.md` register row in place of its `—`, so
  `aof work doctor 130` reports no `verification-missing-red-probe` and, with the files on disk,
  no `control-unresolved`.

  RULINGS (QA, 2026-09-13): (1) the register names each probe's MUTATION and the invariant clause
  it breaks, never an assertion string — so `reds on` below quotes the register's clause, the
  builder's assertion message must contain those words, and VERIFICATION's `red probe` cell pastes
  the observed message so it matches the register by text. (2) PLAN.md's probe list
  (`"loop-stops"` in `src/commands/loop.mjs`, `stoppedSet.has` dropped from the engine, …) is
  advisory; the register's probes are the rows, one per probe. (3) A non-vacuity probe mutates the
  CONTROL's own needle or root in scratch — the only way to make a sweep find nothing — and reds
  on the register's `Non-vacuous:` clause; a control with no such clause anchors on its
  `exactly N` count. (4) A standing control OUTSIDE the three files that also reds on a probe
  (e.g. `acd-mesh-ui-no-core-import` on FF-13003's route probe) is recorded beside it, not a fault.

  Background:
    Given the delivered tree with the three arch files landed, under an isolated `AOF_GLOBAL_HOME`
    And each probe is applied in a scratch worktree or reverted with `git checkout -- <file>` before the next

  Scenario Outline: the named mutation reds exactly its control
    Given <mutation>
    When `node scripts/test.mjs --only test/arch/loop/<file>` runs
    Then a case named `arch/130 <id>` FAILS with a message containing <reds on>
    And no case of another id in the three files reds on it
    And after the mutation is reverted the case passes again

    Examples:
      | id       | file                                          | mutation                                                                                                                         | reds on                                                                                                                     |
      | FF-13001 | `acd-loop-stop-request-single-home.test.mjs`  | `path.join(globalMeshPaths().meshRoot, "loop-stops", id)` spelled in `src/mesh/declarations.mjs`                                 | "appear only in src/loop/stop-request.mjs" or "no path.join( whose arguments name meshRoot beside a loop literal", naming `src/mesh/declarations.mjs` |
      | FF-13001 | `acd-loop-stop-request-single-home.test.mjs`  | non-vacuity: the control's resolved-specifier needle for `stop-request.mjs` misspelled in scratch so zero importers resolve       | "the sweep finds the module and at least four importers"                                                                    |
      | FF-13003 | `acd-loop-stop-request-single-home.test.mjs`  | `cli.launch` made to ignore `stop` — `options.dryRun === true ? null : body`                                                     | "cli.launch's predicate names options.stop"                                                                                 |
      | FF-13003 | `acd-loop-stop-request-single-home.test.mjs`  | the declaration read re-implemented inside the `/api/mesh/loop-stop` route (`readLoopDeclaration` + `requestLoopStop` in `ui-serve.mjs`, `stopLoop` no longer imported) | "stopLoop is defined in src/loop/stop.mjs and imported by exactly src/commands/loop.mjs and src/mesh/ui-serve.mjs" |
      | FF-13002 | `acd-loop-stop-settles-the-run.test.mjs`      | the early `return` re-inserted before `settleDriven` in the post-drive block (the `:1833` shape)                                 | "reaches a settleDriven( call before any return in the enclosing block"                                                     |
      | FF-13002 | `acd-loop-stop-settles-the-run.test.mjs`      | non-vacuity: the control's `await drivePhase(` needle misspelled in scratch so zero sites are found                               | "there are exactly three drive sites"                                                                                       |
      | FF-13004 | `acd-loop-stop-settles-the-run.test.mjs`      | the `stopped` argument dropped from the producer's `decideSupervisedDeclarations` call in `src/mesh/declarations.mjs`            | "a honoured request for that loopRunId answers no row" and "passes stopped to the engine"                                   |
      | FF-13005 | `acd-loop-stop-reaches-every-face.test.mjs`   | the launcher's `readActiveLoops(` call removed from `src/mesh/launcher.mjs`                                                       | "every src/** module that calls readActiveRuns( also calls readActiveLoops(", naming `launcher.mjs`                         |
      | FF-13005 | `acd-loop-stop-reaches-every-face.test.mjs`   | non-vacuity: the control's `readActiveRuns(` needle misspelled in scratch so the sweep finds zero callers                         | "the sweep must find both"                                                                                                  |
      | FF-13006 | `acd-loop-stop-reaches-every-face.test.mjs`   | `loopStopAffordance` rendering the button for every node — the `node.nodeId === localNodeId` guard dropped                       | "button: null for node.nodeId !== localNodeId"                                                                              |
      | FF-13006 | `acd-loop-stop-reaches-every-face.test.mjs`   | the `fetch("/api/mesh/loop-stop"` removed from `api.ts` — zero in `ui/src/fleet/**` (the exactly-one anchor is the non-vacuity)  | "exactly one fetch("/api/mesh/loop-stop" (in api.ts)"                                                                       |
      | FF-13007 | `acd-loop-stop-reaches-every-face.test.mjs`   | the argv formed in `supervisor.rs` — a `"--stop"` literal pushed in the spawn instead of `stop_argv(child)`                       | "supervisor.rs spells no "--stop" literal"                                                                                  |

  Scenario: a probe that leaves its control green is a vacuous guard, not a pass
    Given a mutation above applied and the control still green
    Then the control is a finding against this story and is reworked here until the probe reds; its register row keeps its `—` and the story does not close on it
    And a sweep observed walking zero modules and passing is the same finding, whatever its assertion says

  Scenario: the register records every probe and doctor is clean
    When every probe above has been run and reverted
    Then `wiki/work/130_milestone_stop-a-running-loop/VERIFICATION.md`'s fitness register carries, for each of the seven ids, a `red probe` cell naming the mutation and the observed message — no `—` and no template placeholder remains
    And `aof work doctor 130` reports no `verification-missing-red-probe` and no `control-unresolved`
    And `git status --short` shows no modified subject file — every mutation was reverted

  Scenario: the cargo half's probe is recorded too
    Given story 04's `supervision.rs` tests
    When `stop_step`'s `Kill` arm is mutated to `Wait` in scratch and `cargo test --manifest-path app/desktop/Cargo.toml` runs
    Then the `stop_step` case fails naming `Kill`, and the FF-13007 row records both the node leg's and the cargo half's probes
