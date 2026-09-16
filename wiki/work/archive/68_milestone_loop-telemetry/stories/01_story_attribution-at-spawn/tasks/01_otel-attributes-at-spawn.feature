@executable @cli @work @work-stream
Feature: OTel resource attributes are set at spawn — and aof stands up nothing to receive them

  Claude Code emits, natively over OTLP, the exact measurements aof reconstructs: cost in USD
  attributed by model and query source, tokens split across the four classes, and active time
  decomposed into waiting-on-model and waiting-on-human. Attribution for all of it is a **resource
  attribute set at spawn** rather than a text match after the fact.

  Setting those attributes costs an environment assignment, so aof sets them: a project that runs
  its own collector gets correctly-attributed telemetry for free.

  **And aof builds no receiver — the boundary is deliberate and load-bearing.** A hosted
  observability stack is explicitly out of the milestone's scope, and a receiver would put a daemon
  dependency between aof and its own numbers. More decisively (ADR-005): the emitter only covers
  sessions aof spawns, and the 125-agent corpus behind every figure in the research is
  overwhelmingly Task subagents inside sessions an operator started in their own terminal — which
  aof never spawned and whose environment it cannot set. An OTel-only design would measure the path
  aof uses least. **Every figure this milestone produces must therefore be correct with no
  collector running anywhere**, which is what the last scenario pins.

  FF-6808 makes "no OTLP receiver" structural. The spawn env is already scrubbed of the
  IDE-attachment vector after a measured live failure (`src/agent-session-driver.mjs:641-647`);
  this addition must survive that scrub rather than be deleted by it.

  ADR-005 §2; ADR-008 (the same spawn seam is milestone 70's for model/effort and the cache flags).

  Scenario: a spawned session carries the attributes that identify its work
    Given a run started against a work item
    When the session is spawned
    Then its environment carries the resource attributes identifying the run, the item and the machine
    And telemetry emission is enabled in that environment

  Scenario: the attributes survive the IDE-attachment scrub
    Given a spawn environment inherited from a shell that carries the IDE-attachment variables
    When the session is spawned
    Then the IDE-attachment variables are still removed exactly as they are today
    And the resource attributes are present in the spawned environment

  Scenario Outline: what each attribute identifies
    Given a run spawned for a work item
    When the session's environment is inspected
    Then it carries an attribute identifying <fact>

    Examples: the attribution set
      | fact                                  |
      | the run                               |
      | the story, when the item is a story   |
      | the milestone                         |
      | the phase the loop declared           |
      | the machine                           |
      | the worktree                          |

  Scenario: a run with no declared phase reports no phase, rather than a guessed one
    Given a run not minted by the loop shell, carrying no declared phase
    When the session is spawned
    Then no phase attribute is fabricated
    And the remaining attributes are present unchanged

  Scenario: every figure this milestone produces is correct with no collector running
    Given no OTLP collector is reachable from this machine
    When a run is spawned, settles, and is reported on
    Then the run's spend, attribution and per-phase reporting are complete
    And nothing in the run path waited on, retried against, or failed because of a collector
