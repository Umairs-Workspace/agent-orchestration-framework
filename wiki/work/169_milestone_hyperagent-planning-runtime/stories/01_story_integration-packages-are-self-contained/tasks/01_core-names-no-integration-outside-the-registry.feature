@executable @cli @assets
Feature: Core names no integration package outside the registry

  WHY. An integration that core imports from its lowest layers cannot be moved, removed or
  replaced without editing core. One registry module is the only place core may name one.

  Rule: R1 · Only the registry imports an integration package

    Scenario: E1 · the tree passes today
      When every module under "packages/core/src" is scanned for "@aof/integration-" imports
      Then the only importer is "packages/core/src/integrations.mjs", plus the one named Notion exception

    Scenario: E2 · a planted import fails the control
      Given a core module that imports "@aof/integration-hyperagent/runtime"
      When the control runs
      Then it fails naming that module

  Rule: R2 · Hyperagent's verbs come through the registry

    Scenario: E3 · the four hyperagent verbs are registered from the contribution
      When the application's command list is assembled
      Then "hyperagent:brief", "hyperagent:result", "hyperagent:check" and "hyperagent:doctor" are present, contributed by "@aof/integration-hyperagent"
