@executable @bug @finding-F-14 @cli @work @work-stream
Feature: a start resolves the workspace the mesh already knows

  WHY. At the outsider check, `/loop start` was refused `loop-start-no-workspace` for a project the
  operator had just published (F-14). The start read only a hand-pinned `mesh.workspaceId`, while
  every other mesh reader asks `resolveWorkspaceId`, the one precedence (TECH_DEBT item 4): pinned
  first, then the id derived from the project's path, which is the id the publish registered. And
  the refusal named `aof mesh identity`, which never writes `mesh.workspaceId`.

  Rule: R1 · A start carries the id the mesh resolves

    Scenario: an unpinned, published project gets a start request under its derived id
      Given workspace "ws-p" at a project root with no `mesh.workspaceId` in its config
      And the mesh registers it under the id derived from that root
      When `aof work loop 22 --hand-off-start --json` runs in "ws-p"
      Then it answers ok with `requested: true`
      And the request names that derived id as its `workspaceId`, under `<meshRoot>/loop-starts/`

    Scenario: the supervisor is handed a start row for it
      Given that start request for scope "22" in "ws-p"
      When the supervisor reads its declarations
      Then exactly one fresh `--supervised` row for scope "22" is offered, at "ws-p"'s project root

    Scenario: a pinned id still wins
      Given workspace "ws-a" whose config pins `mesh.workspaceId` "a7fc47eec5f91bc0"
      When `aof work loop 22 --hand-off-start --json` runs in "ws-a"
      Then the request names "a7fc47eec5f91bc0" as its `workspaceId`

  Rule: R2 · A refusal that remains names a fix that works

    Scenario: no workspace id resolves at all
      Given a workspace with no project root and no pinned `mesh.workspaceId`
      When `aof work loop 22 --hand-off-start --json` runs
      Then it answers ok false with code "loop-start-no-workspace"
      And its message names `mesh.workspaceId` in the project's `.aof/aof.config.json`
      And it does not name `aof mesh identity`
