@executable @cli @work @distribution
Feature: a legacy hostname-derived id is recognised as legitimate, and re-identification is a deliberate act

  THE HAZARD THIS TASK EXISTS FOR. `healIdentitySidecar` (`src/work.mjs`) re-derives a sidecar's
  id when EITHER the recorded derivation host no longer matches this machine (trigger 1, the
  copied-`.aof` symptom) OR the stored id is no longer a valid derivation of its own recorded host
  under CURRENT rules (trigger 2, `staleFormat`, detected via `isDerivationOf` — F-3302's
  `.local`-strip self-migration). Task 00 changes the current rules. So on the very next load
  after task 00 lands, EVERY existing node — this one, the Mac worker, the WSL node — would read
  `staleFormat: true` and silently re-identify itself, because `win-host-a` is no longer a
  derivation `deriveNodeId` could produce. `loadWorkspace` runs the heal, and every daemon, board
  face and CLI door loads through it.

  WHY THAT MUST NOT HAPPEN BY ITSELF. `nodeId` is a durable key beyond this repo's run records:
  `src/mesh/registry.mjs` resolves an enrollment credential TO a nodeId and denies a revoked one,
  assignments and presence records are keyed by it, and the fleet roster is joined on it. A mesh
  that re-identifies itself during a daemon start — with no operator act, mid-soak — orphans
  those, and the failure surfaces far from its cause. F-3302's self-migration was safe precisely
  because it moved an id to the value the SAME rules would now produce for the same host; this
  change moves it to a value with no relationship to the old one.

  THE RULING. `isDerivationOf` gains a LEGACY arm: the bare sanitized stem and the
  collision-suffixed `<stem>-<installHash(salt)>` form stay RECOGNISED as valid derivations of
  their recorded host, so `staleFormat` reads false and the heal leaves them alone. The predicate
  therefore answers "could this id have been derived for this host, under these rules or the ones
  before them" — which is exactly the question the heal asks it. A SECOND, narrower predicate
  answers the new question "is this id safe to commit": `isOpaqueNodeId(nodeId, salt)`, true only
  for the `node-<hash>` forms task 00 produces. Re-identification happens through ONE explicit
  edge, `aof mesh identity --reidentify`, which reports what it changed and what that invalidates.

  RULINGS (QA, 2026-09-22). (1) The legacy arm is recognition, not derivation: no code path
  PRODUCES a stem-shaped id any more (task 00's last scenario is the sweep). (2) `--reidentify`
  re-derives from the sidecar's OWN salt, so the id it lands on is the same one task 00 would have
  derived on a fresh install — the migration is deterministic and re-runnable to the same answer.
  (3) It is REFUSED on a pinned sidecar (`pinned: true`): an operator who typed a name owns it,
  and `--name` is the way to change one. (4) It REPORTS rather than repairs the fleet-side
  consequences — the old node record, the enrollment credential and any assignment keyed by the
  old id are named in the envelope so the operator can act; silently re-enrolling a node is not
  this story's business. (5) Old `runs/<hostname>/` directories are READ, never moved: `readRuns`
  unions one level of node subdirs by directory NAME, whatever it is, so history keeps resolving
  with no migration at all — asserted here, and `src/run-store.mjs` is not edited.

  Background:
    Given an isolated aof home `H` (a fresh `AOF_GLOBAL_HOME`) and a fixture checkout `C`
    And `SALT` is `"2d4c74e4-66e3-4c7a-bd88-b199d8f81b7f"` and `HASH` is `installHash(SALT)`
    And a legacy sidecar `L` reading `{ salt: SALT, nodeId: "win-host-a", derivedFrom: "Win-Host-A" }`

  Scenario Outline: isDerivationOf recognises the legacy forms, so the heal has no trigger
    When `isDerivationOf(<nodeId>, <host>, SALT)` is asked
    Then it answers <answer>

    Examples:
      | nodeId                 | host                | answer | why                                    |
      | `"win-host-a"`         | `"Win-Host-A"`      | true   | the legacy bare stem                   |
      | `"win-host-a-<HASH>"`  | `"Win-Host-A"`      | true   | the legacy collision-suffixed form     |
      | `"umamis-mac-mini"`    | `"Umamis-Mac-mini.local"` | true | the `.local` strip, still recognised |
      | `"node-<HASH>"`        | `"Win-Host-A"`      | true   | the form task 00 now derives           |
      | `"node-<HASH>"`        | `""`                | true   | the empty-stem form, unchanged         |
      | `"win-host-a"`         | `"umamis-mac-mini"` | false  | a stem that is not THIS host's         |
      | `"node-beef"`          | `"Win-Host-A"`      | false  | an opaque id for a different salt      |
      | `"win-host-a-local"`   | `"Win-Host-A.local"`| false  | the pre-strip form F-3302 retired      |

  Scenario: isOpaqueNodeId is the narrow question — is this id safe to commit
    When `isOpaqueNodeId(<nodeId>, SALT)` is asked for each of `"node-<HASH>"`, the widened `node-<HASH8>`, `"win-host-a"`, `"win-host-a-<HASH>"`, `"aof-wsl"` and `"node-beef"`
    Then it answers true for `"node-<HASH>"` and the widened form only
    And it answers false for every id containing a machine stem
    And it is a PURE predicate over `(nodeId, salt)` — it reads no hostname, no clock and no filesystem

  Scenario: a legacy sidecar survives a load untouched — no silent re-identification
    Given `L` is the sidecar and the current machine's hostname is `"Win-Host-A"`
    When `healIdentitySidecar({ sidecar: L, hostname: "Win-Host-A", sidecarPath })` is awaited
    Then it answers a sidecar whose `nodeId` is still `"win-host-a"`
    And the persisted bytes at `sidecarPath` are unchanged
    And `deriveNodeId` was not called

  Scenario: trigger 1 still fires — a copied .aof on a different machine still heals
    Given `L` is the sidecar and the current machine's hostname is `"umamis-mac-mini"`
    When `healIdentitySidecar({ sidecar: L, hostname: "umamis-mac-mini", sidecarPath })` is awaited
    Then it answers a sidecar whose `nodeId` is `node-<HASH>` — the opaque form, from the sidecar's OWN salt
    And its `derivedFrom` is `"umamis-mac-mini"`
    And the answer's `nodeId` does not contain `umamis-mac-mini`

  Scenario: --reidentify is the one deliberate edge, and it reports what it invalidates
    Given a workspace loaded against `H` whose sidecar is `L`, enrolled with a credential resolving to `"win-host-a"`
    When `aof mesh identity --reidentify --json` is run
    Then the envelope reads `{ from: "win-host-a", to: "node-<HASH>" }`
    And the sidecar at `sidecarPath` now reads `nodeId: "node-<HASH>"` with `derivedFrom` the current hostname
    And the envelope names the enrollment credential and the stale node record keyed by `"win-host-a"` as invalidated by the move
    And running it a second time answers `{ from: "node-<HASH>", to: "node-<HASH>" }` and changes no bytes — deterministic from the salt

  Scenario: --reidentify refuses a pinned id
    Given a sidecar reading `{ salt: SALT, nodeId: "aof-wsl", pinned: true }`
    When `aof mesh identity --reidentify --json` is run
    Then it fails, coded `"identity-pinned"`, naming `--name` as the way to change a pinned id
    And the sidecar's bytes are unchanged

  Scenario: history keeps resolving — an old runs/<hostname>/ folder reads with no migration
    Given an item whose `runs/` dir holds `win-host-a/20260917T101112000Z-0001.json` and `node-<HASH>/20260922T205439255Z-0000.json`
    When `readRuns(item)` is awaited
    Then it answers both records, ascending by `runId`
    And each record's `node` key reads as it was written — `"win-host-a"` and `"node-<HASH>"`
    And `src/run-store.mjs` is not in this story's write set: the union is by directory NAME and already tolerates either
