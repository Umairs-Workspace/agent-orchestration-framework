@executable @assets @distribution
Feature: aof:teach ships from @aof/learning, for Claude Code only

  WHY. The prompt is teaching's behaviour, so it lives in the package (SPEC Objective). It reaches
  the bundle through `packages/core/src/practices.mjs`, the one core module that names a practice
  package whose members the bundle appends (ADR-004 §4). No config switch gates it. The spike proved
  the boundary on Claude Code only, so the member renders there only (ADR-007).

  Scenario: the practices registry names the learning package
    When `packages/core/src/practices.mjs` is read
    Then it exports a frozen `PRACTICES` whose one entry is `@aof/learning`'s contribution
    And that contribution's `assets.package` is `@aof/learning`

  Scenario: the teach member is appended for Claude only, with no integration gate
    When `readDescriptor()` runs
    Then its members include `teach`, a `command` with runtimes `claude` only, namespace `aof`, and no Codex variant
    And the `teach` member carries no `integration` key
    And it is rendered for a project whose config has no `work.integrations` block

  Scenario: no other runtime renders teach
    When `aof work update --dry-run --json` runs at the repository root
    Then `.claude/commands/aof/teach.md` is reported `skip`
    And no `.agents/skills/aof-teach/` or `.opencode/commands/aof/teach.md` path is planned

  Scenario: a practice member whose id is already declared is refused at load
    Given a practice contribution whose fragment declares a member `continue`
    When `readDescriptor` runs with it
    Then it throws naming `continue` and the contributing package

  Scenario: the packaged binary carries the learning assets
    When `generatePackageAssetManifest` in `scripts/sea-asset-manifest.mjs` runs
    Then it lists `@aof/learning` with sidecar `packages/learning` and every file under its `assets/`

  Scenario: the README says where teaching runs
    When `README.md`'s command table is read
    Then it lists `/aof:teach` as supported and tested on Claude Code only
    And it says Codex and OpenCode render no teach command
