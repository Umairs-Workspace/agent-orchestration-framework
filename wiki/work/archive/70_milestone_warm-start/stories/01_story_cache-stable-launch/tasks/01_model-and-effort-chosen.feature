@executable @cli @work @work-stream
Feature: The phase session's model and effort are chosen, not inherited

  The prompt cache key includes **model and effort level**. aof's spawn passes neither — no
  `--model`, no `--effort`, no flags at all (`src/agent-session-driver.mjs:634`) — so its cache key
  is whatever the session happened to default to. A prefix that is shared only when two machines
  happen to default alike is not shared on purpose.

  Both flags are verified present on the installed binary (`claude 2.1.233`): `--model <model>`,
  `--effort <level>`.

  **There is a trap in the phrase "per-role model", and this task avoids it.** Two surfaces both
  legitimately called "the model" already exist:

  - the **role** model — milestone 30 (`done`) ships `work.agents.models`, a `role -> model` map
    merged onto the bundle resource before render so the rendered agent's `model:` frontmatter line
    carries it (`src/work-bundle.mjs:238-272`). That governs Task subagents inside a session, it
    works, and this task does not touch it;
  - the **session** model — the argv of the `claude` process aof itself spawns. That is what "no
    model reaches the spawn" actually means, and it is this task's whole subject.

  They resolve from distinct config paths and neither reads the other's — one map answering two
  questions is the authority split 48/ADR-003 rules against. Because every aof phase is a separate
  process, switching the session model costs nothing cache-wise: routing is free here in a way it is
  not for a single long session.

  ADR-005. FF-7006 (an extension of the existing role-model source-map guard) keeps them apart.

  **Scope — per-phase routing binds the PHASE-SCOPED caller only.** Per-phase session model/effort
  resolves wherever a **phase** is in scope. The spawn seam has two production callers: the local
  **drive command** (`src/commands/drive.mjs`, phase-scoped by construction — one of
  `refine`/`continue`/`verify`) and the **mesh worker dispatch** (`src/mesh-worker-execution.mjs`,
  assignment-scoped and phase-less by its own source). Every "phase" scenario below is the
  phase-scoped (drive) caller; the mesh assignment path carries no phase, so per-phase routing does
  not map onto it and its spawn carries no `--model`/`--effort` — an intended, explicit boundary
  (ADR-005), not an under-delivery. The mesh launch still carries the stable-prefix flag (task 00)
  and the 1-hour cache TTL (task 02), which are unconditional at the seam.

  Scenario: the spawn states which model it wants
    Given a phase with a configured session model
    When the phase-scoped launch is resolved
    Then the argv names that model explicitly
    And the model is not left to the session default

  Scenario: the spawn states which effort it wants
    Given a phase with a configured session effort
    When the phase-scoped launch is resolved
    Then the argv names that effort explicitly
    And the effort is not left to the session default

  Scenario: an unconfigured phase launches exactly as it does today
    Given a phase with no session model or effort configured
    When the phase-scoped launch is resolved
    Then neither flag is passed
    And the launch is byte-identical to today's

  Scenario: the two model surfaces do not read each other
    Given a project configuring both a role model map and a session model
    When each is resolved
    Then the role model resolves from its own config path
    And the session model resolves from its own config path
    And neither resolver reads the other's path

  Scenario: what was chosen is what the record reports
    Given a phase spawned with an explicit model and effort
    When the run settles and its spend is ingested
    Then the recorded model is the one that was passed
    And the recorded effort is the one that was passed

  Scenario Outline: resolving the session model per phase
    Given a project whose configuration supplies <configured>
    When the <phase> phase is launched
    Then the argv carries <passed>

    Examples: routing is per phase, and absence is silence rather than a guess
      | configured                        | phase    | passed                     |
      | a model for every phase           | continue | that phase's model         |
      | a model for one phase only        | verify   | nothing, for the others    |
      | a model for one phase only        | refine   | nothing, for the others    |
      | no per-phase configuration at all | continue | neither flag               |
      | an effort but no model            | continue | the effort only            |

  Scenario Outline: configuration that cannot be honoured
    Given a session model configuration that is <input>
    When the phase-scoped launch is resolved
    Then the outcome is <outcome>

    Examples: a spawn must not be blocked by a bad routing entry it can simply not apply
      | input                        | outcome                                              |
      | a known phase and a model    | the model is passed                                  |
      | a phase name that is not one | that entry is not applied and the launch proceeds     |
      | an empty model string        | no model flag is passed                              |
      | not an object at all         | no routing is applied and the launch proceeds        |
