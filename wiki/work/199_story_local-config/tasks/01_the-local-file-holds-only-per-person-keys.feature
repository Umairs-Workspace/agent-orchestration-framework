@executable @cli @work @validate
Feature: The local file holds only per-person keys

  WHY. A local file that could override any key would let one person's aof quietly behave unlike a
  teammate's. For example, discovery switched on locally would make the code run a beat that the
  committed commands do not describe. So the local file accepts an allow-list of per-person keys
  and refuses everything else (199 Q1, answered 2026-11-17). Rendered commands, which are
  committed, therefore never depend on it.

  Background:
    Given a scratch project and its own global home, named through "AOF_GLOBAL_HOME"

  Rule: R2 · The local file holds only the per-person keys `work.operator`, `work.notify.channels` and `work.agents.session.effort`

    Scenario: E6 · an allow-listed key is honoured
      Given the local file's "work.operator" is "{ role: 'Product owner' }"
      When "aof project validate --json" runs
      Then it reports no "config-local-" diagnostic

    Scenario: E7 · a team key is refused, and the refusal says where it belongs
      Given the project's "work.intake" is "backlog"
      And the local file's "work.intake" is "stream"
      When "aof project validate --json" runs
      Then it reports an error with code "config-local-key-not-allowed" at "work.intake"
      And the message says the key belongs in ".aof/aof.config.json"
      And the loaded "work.intake" is "backlog"

    Scenario: E8 · a practice key is refused, so no render or gate differs between teammates
      Given the project's "work.examples" is absent
      And the local file's "work.examples.enabled" is true
      When "aof project validate --json" runs and "aof work update" renders the bundle
      Then it reports an error with code "config-local-key-not-allowed" at "work.examples.enabled"
      And the rendered refine command is byte-for-byte the one rendered with no local file
      And the discovery gate resolves off

    Scenario Outline: the allow-list, at its edges
      Given the local file's <path> is <value>
      When "aof project validate --json" runs
      Then it reports <diagnostic>

      Examples:
        | path                               | value                     | diagnostic                                                         |
        | "work.operator.expertise"          | "{ mesh: 'expert' }"      | no "config-local-" diagnostic                                      |
        | "work.notify.channels"             | "{ discord: { channel: '42' } }" | no "config-local-" diagnostic                                      |
        | "work.agents.session.effort"       | "{ build: 'high' }"       | no "config-local-" diagnostic                                      |
        | "work.notify.webhook"              | "'https://example.test'"  | "config-local-key-not-allowed" at "work.notify.webhook"            |
        | "work.agents.session.models"       | "{ build: 'opus' }"       | "config-local-key-not-allowed" at "work.agents.session.models"     |
        | "work.agents.mode"                 | "'orchestrated'"          | "config-local-key-not-allowed" at "work.agents.mode"               |
        | "mesh.address"                     | "'127.0.0.1'"             | "config-local-key-not-allowed" at "mesh.address"                   |
        | "work.operator.expertise.mesh"     | "'guru'"                  | "operator-profile-bad-value" at "work.operator.expertise.mesh"     |

    Scenario: a refused key never reaches the loaded config
      Given the local file's "mesh.address" is "10.0.0.9" and the project's is "127.0.0.1"
      When the project's workspace is loaded
      Then "mesh.address" is "127.0.0.1"
