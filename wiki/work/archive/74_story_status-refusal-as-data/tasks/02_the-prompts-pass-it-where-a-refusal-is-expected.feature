@docs @work @work-stream
Feature: the prompts pass `--if-applicable` on the starting move and nowhere else

  THE DECISION THIS TASK RECORDS. The story left the choice open — *"whether the phase prompts pass
  the flag unconditionally or only where the already-started case is expected — the former is
  simpler, the latter keeps a genuinely surprising refusal visible."* **Only where it is expected.**
  Unconditional would be one rule to remember instead of two, but it would empty the same bucket the
  story exists to protect: a verb that never fails is a verb whose failures nobody reads, and
  `ref-not-found`, `invalid-status` and `no-local-checkout` all reach the agent through it.

  THE LINE IS ALREADY DRAWN IN CODE, so this is a reading of the system rather than a new
  convention. The STARTING moves are the ones something else may have made first: `STARTING_PHASES`
  is `{continue, refine}` (`src/commands/continue.mjs:148`) and the `run.started` reactor advances
  from `not-started|blocked` on any mint (`src/effects/table.mjs:73`). An agent arriving at
  "mark it started" therefore finds the item already started as the ORDINARY outcome — chore 75
  named exactly this in `continue.md`'s prose, which is the workaround this story replaces with a
  contract.

  THE JUDGEMENT MOVES ARE NOT. Nothing moves an item to `in-review` or `done` on its own; both are
  judgements that come only through this door. A refusal there means the item is not where the
  prompt believes it is — the surprising refusal that must stay loud. `assimilate-code.md` makes the
  point itself about its `done` move: *"`done` is unreachable from `not-started`, which is exactly
  the refusal that would catch a story nobody assimilated."* That guard is load-bearing and the flag
  must never be put in front of it.

  @executable
  Scenario: no judgement transition in the bundle carries the flag
    Given every command surface under `src/bundle/`
    When I sweep them for `aof work status` invocations
    Then no invocation whose target is `in-review` carries `--if-applicable`
    And no invocation whose target is `done` carries `--if-applicable`
    And every invocation whose target is `in-progress` carries it

  @manual
  Scenario: the starting moves pass the flag, in every bundle that makes one
    Given the ACD bundle as rendered into this repo
    When I read the continue, refine and assimilate-code command surfaces
    Then continue's per-story "Mark it started" step passes `--if-applicable`
    And continue's single orchestrator move of the MILESTONE passes it, a resumed run being the case it exists for
    And refine's move of the refined item passes it
    And assimilate-code's `in-progress` move passes it
    And each names, in one line, why the starting move is the one that is expected to be refused

  # This sentence IS the workaround. Leaving it beside the flag would keep teaching the habit the
  # flag removes — carry on past a non-zero exit — while the flag makes the exit zero.
  @manual
  Scenario: the prose that told an agent to ignore the refusal is replaced, not kept alongside
    Given `src/bundle/commands/refine.md`
    When I read its `<progress_tracking>` block
    Then it no longer says an already-started item's refusal is "nothing to fix"
    And the behaviour it described is carried by the flag instead
    And no other bundle instructs an agent to disregard a non-zero exit from a work verb

  @manual
  Scenario: the rendered runtimes agree with the bundle source
    Given the bundle source after this change
    When I refresh the renders and the manifest
    Then the .claude commands, the .codex skills, the bundle manifest and the install lock all agree with the source
    And `aof work update --dry-run` reports no drift
