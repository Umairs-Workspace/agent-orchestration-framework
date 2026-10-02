@executable @cli @adapter @distribution
Feature: a role can pin its own effort; an unpinned role thinks at its session's

  `work.agents.models` (role -> model) renders the `model:` line of `.claude/agents/aof-*.md`
  (`renderBundleOutputsWithConfig`, `src/work/bundle.mjs`). This task adds its twin,
  `work.agents.effort` (role -> level), which renders an `effort:` line on the same path.

  Claude Code reads an agent's `effort:` as "overrides the session effort level", and when the
  line is absent the agent inherits the session's effort (code.claude.com/docs/en/sub-agents,
  read 2026-09-28). So only a PINNED role gets the line. An unpinned role gets none and inherits
  its session's effort: `high` by default (tasks 00 and 03), or whatever `--thinking` or `/effort`
  set. Rendering `effort: high` into every agent would pin them all, and the loop's `--thinking`
  could no longer reach a subagent.

  The map stays on the role-model path and off the session path (ADR-005). FF-7006 grows to hold
  both ways: the session resolver never reads `work.agents.effort`, and the bundle never reads
  `work.agents.session`. Only the Claude runtime renders the line. The Codex and opencode agent
  renders are unchanged.

  Scenario Outline: a pinned role renders its effort; an unpinned role renders none
    Given `work.agents.effort` is `{ "aof-architect": "extra-high", "aof-qa": "medium" }`
    When the bundle is rendered for the claude runtime with that config
    Then `.claude/agents/<agent>.md`'s frontmatter <line>

    Examples:
      | agent         | line                                              |
      | aof-architect | carries `effort: xhigh`, directly after `model:`  |
      | aof-qa        | carries `effort: medium`, directly after `model:` |
      | aof-developer | carries no `effort:` line                         |

  Scenario: with no map, no rendered agent carries an effort line
    Given `work.agents.effort` is unset
    When `aof work update --dry-run --json` runs at the repo root
    Then no `.claude/agents/aof-*.md` it would write carries an `effort:` line
    And `summary` reads `updated` 0 for every agent file

  Scenario: the other runtimes' agent renders are unchanged
    Given `work.agents.effort` is `{ "aof-architect": "extra-high" }`
    When the bundle is rendered for the codex and opencode runtimes
    Then neither `aof-architect` render carries an `effort` key

  Scenario Outline: project validate checks the map as it checks the model map
    Given `work.agents.effort` is <map> and `work.agents.mode` is <mode>
    When `aof project validate --json` runs
    Then it reports <result>

    Examples:
      | map                              | mode           | result                                                     |
      | `{ "aof-qa": "extra-high" }`     | unset          | nothing                                                    |
      | `{ "aof-tester": "high" }`       | unset          | an error coded `effort-map-unknown-role` at `work.agents.effort.aof-tester` |
      | `{ "aof-qa": "turbo" }`          | unset          | an error coded `effort-map-bad-value` at `work.agents.effort.aof-qa`        |
      | `{ "aof-qa": "" }`               | unset          | an error coded `effort-map-bad-value` at `work.agents.effort.aof-qa`        |
      | `[]`                             | unset          | an error at `work.agents.effort`                           |
      | `{ "aof-qa": "high" }`           | `"solo"`       | an info coded `effort-map-inert-under-solo`                |

  Scenario: the two effort surfaces never read each other's path
    When `test/arch/session/acd-agent-model-source-map.test.mjs` FF-7006 runs
    Then it asserts `src/session-model.mjs` never reads `work.agents.effort` or `work.agents.models`
    And it asserts `src/work/bundle.mjs` reads `work.agents.effort` and never reads `work.agents.session`
    And each assertion has a red probe that plants the other path and trips it

  Scenario: the schema describes the role map
    When `schemas/aof.schema.json` is read
    Then `work.agents` declares `effort`, an object whose values are strings
    And its description says an unpinned role inherits its session's effort and the map is inert under solo
