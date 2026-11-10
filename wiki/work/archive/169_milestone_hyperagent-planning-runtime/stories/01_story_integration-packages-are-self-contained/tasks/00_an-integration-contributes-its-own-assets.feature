@executable @cli @assets @distribution
Feature: An integration contributes its own bundle members, and they render only where it is enabled

  WHY. An integration's prompts belong to its package. Core must render them exactly where they
  were asked for while holding none of them, in a dev checkout, a payload install and a packaged
  binary alike.

  Rule: R1 · An integration's own members render from its package

    Scenario: E1 · Hyperagent's members are read from the package's assets
      Given the hyperagent integration registered with its own "assets/bundle.json"
      When the bundle descriptor is read
      Then "hyperplan", "hyperagent-planner-instructions" and the seven Hyperagent skills are members whose text comes from "packages/integration-hyperagent/assets"

    Scenario: E2 · a packaged binary reads them from the sidecar
      Given a packaged install whose sidecar holds "bundle/packages/integration-hyperagent/"
      When the bundle descriptor is read
      Then the same members resolve from the sidecar

    Scenario: E3 · a contributed member id that core already declares is refused at load
      Given a contributed fragment whose member id is "refine"
      When the bundle descriptor is read
      Then loading fails naming the member and the package

  Rule: R2 · An integration's members render only for a project that enables it

    Scenario Outline: the integration's files follow the work.integrations switch
      Given a project whose config <switch>
      When "aof work init" runs
      Then "/aof:hyperplan" and ".hyperagent/" are <outcome>

      Examples:
        | example | switch                                         | outcome     |
        | E4      | has no "work.integrations.hyperagent" block    | not written |
        |         | has "work.integrations.hyperagent": {}         | written     |

    Scenario: E5 · turning the integration off removes its files on the next update
      Given a project initialised with "work.integrations.hyperagent" present
      When the block is removed and "aof work update" runs
      Then "/aof:hyperplan" and ".hyperagent/" are removed as aof-managed files

  Rule: R3 · Hyperagent is not a runtime

    Scenario: E6 · the model knows exactly the three runtimes
      When the model's runtime table is read
      Then its runtimes are "claude", "codex" and "opencode"

    Scenario: E7 · naming hyperagent as a runtime is refused
      When "aof work init --runtime hyperagent" runs
      Then it fails naming "hyperagent" as an unknown runtime

  Rule: R4 · Core holds nothing only an integration renders

    Scenario: E8 · core's assets hold no Hyperagent file
      When "packages/core/assets" is listed
      Then it holds no hyperplan command, no Hyperagent skill, no planner instructions and no Hyperagent variant file
