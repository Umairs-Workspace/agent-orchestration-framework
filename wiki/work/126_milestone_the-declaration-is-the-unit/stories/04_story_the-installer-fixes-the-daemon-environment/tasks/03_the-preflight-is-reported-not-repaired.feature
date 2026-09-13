@executable @cli @distribution @adapter
Feature: The preflight is reported, not repaired — three checks by code, reported by both install and run, repairing nothing on any path

  The daemon environment is fixed at install rather than fought at run time, and the three things
  that have burned runs are each checkable without spending a token. `claude auth status` prints
  JSON to STDOUT by DEFAULT and exits 0 (measured 2026-09-08 on the control node: `{"loggedIn":
  true, "authMethod": "claude.ai", "subscriptionType": "max", …}`; `--text` prints `Login method:
  Claude Max account`) — the probe for the failure the Mac worker's SSH-spawned daemon hit and the
  WSL notes in `CLAUDE.md` exist to prevent. The installed payload's build is `readBuildInfo`
  (`src/build-info.mjs:89-107`) → `{ mode, buildId, installedAt }`, where `mode` is `source` /
  `payload` / `embedded` and `buildId` is null when the stamp is absent or unreadable. Each
  workspace registered to this node comes from `resolveNodeWorkspaces(nodeId)`
  (`src/mesh/presence.mjs:191-240`) — which answers `ok: false` when it cannot enumerate, and lists
  a `skipped` entry with a reason (`no-descriptor`, `workdir-missing`, `not-a-directory`) rather
  than silently dropping one — and whether a workspace carries its own pinned identity is
  `config.mesh.workspaceId`, precedence step 2 of `src/workspace-identity.mjs:11-17`: TECH_DEBT item
  4 stated as a check, its fix at the spawn being 126/02's.

  THREE READS THIS CHECK MUST NOT MAKE, each measured at this beat, each a false green or a write:

  · NOT `resolveWorkspaceId`. It answers the id, not whether one is pinned — an unpinned workspace
    falls through to the path derivation (`:37`) and comes back with an id, so every workspace reads
    as pinned. The check reads the KEY (`:33-34`'s `config?.mesh?.workspaceId`).
  · NOT `loadWorkspace`. It merges the MACHINE-WIDE global mesh config over the workspace's own
    (`readGlobalMeshConfig`, `src/work.mjs`), so a `mesh.workspaceId` that is not this workspace's
    reads as this workspace's; and it carries the one sanctioned load-time identity WRITE —
    `healIdentitySidecar` → `deriveNodeId({ sidecarPath })` → `persistNodeId` → `writeSidecarPatch`
    — whose target, when the global identity home holds no nodeId, is the LEGACY sidecar under the
    workspace's OWN `.aof`. That is a write under a project root, which the last scenario forbids.
    The workspace's own config is `workspacePaths(projectRoot).configPath`
    (`src/workspace.mjs:5-9`) — `<projectRoot>/.aof/aof.config.json`, read directly, with no walk up
    to an ancestor's config.
  · NOT `deriveNodeId` with a `sidecarPath`. This node's id is read, never minted: `readSidecar`
    (`src/node-identity.mjs:60-66`) over `globalMeshPaths({ env }).identityPath`
    (`src/workspace.mjs:29`). No identity ⇒ nothing to enumerate against, which lands in the same
    "could not be enumerated" fail rather than in a mint.

  A probe that cannot answer reports `fail` naming the cause. It never reports `pass`, because the
  cost of this preflight being wrong is a silent green in front of a night of dead runs. Two disk
  touches on these paths are pre-existing and belong to the readers, not to this preflight: opening
  the projection store (`src/global-work-store.mjs:115-149` — `mkdir` of the mesh work root,
  creating `projection.sqlite` and its WAL siblings, then `migrateSchema`) and the throttled JSONL
  line `reportDegrade` (`src/degrade.mjs:28-43`) appends to `degrade.log` when a stamp is corrupt.
  Both land under the GLOBAL mesh home and never under a project root, which is what makes the last
  scenario's line assertable rather than aspirational. What the preflight must never do is REPAIR.

  It rides the SUCCESS answer only: `preflight` is an ORDERED list of three `{ code, status,
  message }` entries on the result, so a verb that refuses carries its `{ ok, error, code }`
  envelope unchanged and no probe is spawned behind a refusal.

  What would quietly undo this: a preflight that runs `claude -p` (a token-spending probe, and a
  spawned session from an installer); a check that pins a workspace id "while it is here"; a
  preflight on `install` only, so the verb an operator actually runs at relaunch says nothing; a
  failed check that blocks the install instead of reporting; and an unreadable probe reported green.

  ADR-007 §4. TECH_DEBT 4. FF-12607.

  Scenario: the three checks are named by code, in one order, on both faces
    Given injected probes for `claude` resolution and auth status, the installed build, and the node's workspaces
    When the preflight runs
    Then it reports exactly three checks, in the order `claude-authenticated`, `payload-build`, `workspace-identity-pinned`
    And each carries a code, a status of `pass` or `fail`, and a one-sentence message
    And the `--json` envelope carries them under `preflight` as an ordered list of three, in that same order

  Scenario Outline: each check over each condition — and a probe that cannot answer is a fail
    Given <condition>
    When the preflight runs
    Then `<check>` reports <status>
    And its message names <names>

    Examples: claude-authenticated — the probe is `claude auth status`; its JSON is parsed from STDOUT, and a non-zero exit is quoted from STDERR
      | check                | condition                                                | status | names                                        |
      | claude-authenticated | `claude` does not resolve — the runner answers a fault    | fail   | that `claude` is not on this account's PATH  |
      | claude-authenticated | it exits 0 reporting `"loggedIn": true` on stdout        | pass   | the `authMethod` it reported                 |
      | claude-authenticated | it exits 0 reporting `"loggedIn": false` on stdout       | fail   | that this account is logged out              |
      | claude-authenticated | it exits non-zero                                        | fail   | the exit code and what it printed on stderr  |
      | claude-authenticated | it exits 0 with stdout that does not parse               | fail   | that the auth status could not be read       |

    Examples: payload-build — read the way the deploy rules already read it
      | check         | condition                                       | status | names                                             |
      | payload-build | mode `payload` with a build id                  | pass   | the mode and the build id                         |
      | payload-build | mode `payload`, the stamp absent or unreadable  | fail   | that this install carries no build stamp          |
      | payload-build | mode `embedded`                                 | fail   | that the launcher ran its compiled-in bundle      |
      | payload-build | mode `source` with a git build id               | pass   | the mode and the id, as a checkout                |
      | payload-build | mode `source` with no id                        | fail   | that the running build could not be named         |

    Examples: workspace-identity-pinned — item 4 stated as a check, never as a repair
      | check                     | condition                                                     | status | names                                        |
      | workspace-identity-pinned | every registered workspace pins its own `mesh.workspaceId`    | pass   | how many workspaces were checked             |
      | workspace-identity-pinned | two registered, one pinned and one not                        | fail   | the unpinned workspace's project root        |
      | workspace-identity-pinned | a registered workspace's own config cannot be read            | fail   | that root, and that its config was unreadable |
      | workspace-identity-pinned | the resolver lists one under `skipped` with `no-descriptor`   | fail   | the workspace id and the skip reason         |
      | workspace-identity-pinned | the resolver answers `ok: false`, or this node has no identity to enumerate against | fail   | that this node's workspaces could not be enumerated |
      | workspace-identity-pinned | the resolver answers `ok: true` with no workspaces at all     | pass   | that no workspace is registered to this node |

  Scenario: an unauthenticated claude is a fail, not a crash and not a repair
    Given a `claude` that resolves and whose auth status reports not logged in
    When the preflight runs
    Then `claude-authenticated` is `fail` and names the auth state
    And the only `claude` invocation was `auth status` — no session is spawned and no token is spent
    And no login is attempted

  Scenario: an unpinned workspace is named
    Given two registered workspaces, one with `mesh.workspaceId` pinned in its own `.aof/aof.config.json` and one without
    When the preflight runs
    Then `workspace-identity-pinned` is `fail`
    And its message names the unpinned workspace's project root
    And the pinned answer came from that workspace's own config file, never from a machine-wide one merged over it
    And neither workspace's config is written

  Scenario: both install and run report it, identically
    Given the same injected probes
    When `aof mesh desktop install` runs and then `aof mesh desktop run` runs
    Then both renders carry the same three check lines
    And both `--json` envelopes carry the same `preflight` list
    And a failing check does not refuse either verb

  Scenario: a verb that refuses carries its refusal envelope unchanged
    Given the same injected probes and no app artifact
    When `aof mesh desktop install --json` runs
    Then stdout is one envelope with `ok: false` and code `app-artifact-missing`
    And it carries no `preflight` key — a refusal envelope is `{ ok, error, code }` as it was
    And no probe was invoked behind the refusal — no `claude` was spawned and no store was opened

  Scenario: the preflight repairs nothing
    Given probes that fail every check
    When the preflight runs from either verb
    Then no workspace config is created or written and no `mesh.workspaceId` is pinned
    And no registry runner is invoked and no build stamp is written
    And no node identity is minted or healed
    And nothing is written under any workspace's project root
