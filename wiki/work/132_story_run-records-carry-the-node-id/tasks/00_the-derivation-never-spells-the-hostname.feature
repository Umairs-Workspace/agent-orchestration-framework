@executable @cli @work @distribution
Feature: the node-id derivation never spells the machine's hostname

  THE DECISION (refine, 2026-09-22 — the fork 132's own Notes deferred here). Measured at the
  source on the control node: `~/.aof/mesh/identity.json` reads
  `{ nodeId: "<hostname-id>", derivedFrom: "<hostname>" }`, and `aof mesh identity --json` answers
  the same id. So `config.mesh.nodeId` IS the sanitized hostname, and the run store — which
  already takes `node` as INJECTED DATA from the command layer (`run-start.mjs`, the ADR-004
  config gate) and is basis-neutral by construction — writes it faithfully. Re-pointing the run
  store at "the node id" would therefore change NOTHING: the id is the hostname. The disclosure
  is born in `deriveNodeId` rule (2), not in the store, so the cut is made here, once, at the
  derivation.

  WHAT CHANGES. Rule (2) — "else the sanitized hostname stem" — is retired. Every DERIVED id is
  the opaque `node-<installHash(salt)>` form that rule (3) already produces for an empty stem, so
  the empty-stem case stops being a special case and becomes the only case. Rule (1) is untouched:
  an operator-set or previously-persisted `config.mesh.nodeId` still wins VERBATIM, so
  `aof mesh identity --name aof-wsl` keeps pinning exactly what the operator typed and the WSL
  node keeps its chosen name. `sanitizeHostname` keeps its job — sanitizing an OPERATOR-SUPPLIED
  name (`identity.mjs`, the `--name` path) and answering the legacy-format question (task 01) —
  but no caller turns a machine's hostname into an id any more.

  WHAT THE SALT BUYS, and why rule (4) goes with rule (2). The collision suffix existed because
  two installs could share a hostname — the measured driver being a WSL2 guest that INHERITS its
  Windows host's machine name (the `/etc/wsl.conf` `hostname = aof-wsl` pin is the belt to this
  braces). `installHash` is derived from the per-install `salt`, a `randomUUID()` minted on first
  derivation, so two installs on one machine already differ in the opaque form and the collision
  arm has nothing left to resolve. It is kept only as a WIDENING: a `takenIds` collision widens
  the hash rather than reaching for the hostname, so the escape hatch never reintroduces the
  disclosure it was removed for.

  RULINGS (QA, 2026-09-22). (1) `installHash` is unchanged — 4 hex chars of sha256 over the salt;
  the opaque id is exactly `node-` + that, so the shape is `/^node-[0-9a-f]{4}$/` and the widened
  form is `/^node-[0-9a-f]{8}$/`. (2) The derivation is asked for a hostname it must IGNORE, not
  one it is not given: every scenario passes a real, non-empty hostname and asserts the id does
  not contain its stem. (3) `derivedFrom` is still persisted — it records the hostname the
  derivation RAN ON, which is what task 01's legacy discriminator and task 02's join key read; it
  lives in the git-ignored per-install sidecar and reaches no commit. (4) `deriveNodeId` stays
  white-box/injectable (`{ config, hostname, salt, takenIds, sidecarPath }`) and reads no clock,
  no `os.hostname()` and no config file of its own.

  Background:
    Given `src/node-identity.mjs` is imported directly (the unit, no workspace load)
    And `SALT` is `"2d4c74e4-66e3-4c7a-bd88-b199d8f81b7f"` and `HASH` is `installHash(SALT)`
    And `sidecarPath` is a path inside a fresh temp dir unless a scenario says otherwise

  Scenario Outline: a derived id is the opaque form, whatever the machine is called
    When `deriveNodeId({ config: {}, hostname: <hostname>, salt: SALT, sidecarPath })` is awaited
    Then it answers `node-<HASH>`
    And the answer matches `/^node-[0-9a-f]{4}$/`
    And the answer does not contain `<stem>` — the sanitized stem appears nowhere in the id

    Examples:
      | hostname                | stem              |
      | `"Win-Host-A"`          | `win-host-a`      |
      | `"umamis-mac-mini"`     | `umamis-mac-mini` |
      | `"Umamis-Mac-mini.local"` | `umamis-mac-mini` |
      | `"aof-wsl"`             | `aof-wsl`         |
      | `"WORKSTATION-01"`      | `workstation-01`  |
      | `"a"`                   | `a`               |

  Scenario Outline: the hostname changes nothing — one salt, one id
    Given `deriveNodeId` is awaited once with hostname `<first>` and `SALT`, against its own sidecar
    When it is awaited again with hostname `<second>` and the SAME `SALT`, against a FRESH sidecar
    Then both answers are `node-<HASH>` — the id is a function of the salt alone

    Examples:
      | first          | second              |
      | `"Win-Host-A"` | `"Win-Host-A"`      |
      | `"Win-Host-A"` | `"umamis-mac-mini"` |
      | `"Win-Host-A"` | `""`                |

  Scenario: two installs on one machine differ, so the collision arm has nothing to resolve
    Given `SALT_A` and `SALT_B` are two distinct `randomUUID()` values
    When `deriveNodeId` is awaited with the SAME hostname `"Win-Host-A"` for each salt
    Then the two answers differ
    And neither answer contains `win-host-a`
    And `takenIds` was empty in both calls — the ids did not collide to begin with

  Scenario: a collision widens the hash, and never reaches for the hostname
    Given `takenIds` is `["node-<HASH>"]` — the opaque id is already claimed by a different install
    When `deriveNodeId({ config: {}, hostname: "Win-Host-A", salt: SALT, takenIds, sidecarPath })` is awaited
    Then the answer is not `node-<HASH>`
    And it matches `/^node-[0-9a-f]{8}$/` — the SAME hash, widened, deterministic from the salt
    And it does not contain `win-host-a`
    And awaiting the same call again answers the same id — the widening is stable, not random

  Scenario Outline: a pinned id still wins verbatim — the operator's escape hatch is untouched
    Given `config` is `{ mesh: { nodeId: <pinned> } }`
    When `deriveNodeId({ config, hostname: "Win-Host-A", salt: SALT, sidecarPath })` is awaited
    Then it answers exactly `<pinned>` — unsanitized, un-re-derived
    And nothing was written to `sidecarPath` — rule (5) persists only what it DERIVED

    Examples:
      | pinned          |
      | `"aof-wsl"`     |
      | `"node-beef"`   |
      | `"win-host-a"`  |

  Scenario: the derivation persists the opaque id and the host it ran on, to the sidecar only
    Given a fresh temp dir holding no sidecar, and a fixture checkout `C` as the working directory
    When `deriveNodeId({ config: {}, hostname: "Win-Host-A", salt: SALT, sidecarPath })` is awaited
    Then the sidecar at `sidecarPath` reads `{ salt: SALT, nodeId: "node-<HASH>", derivedFrom: "Win-Host-A" }`
    And a recursive listing of `C` after the call deep-equals the listing before it — no committed file was touched
    And awaiting the identical call a second time leaves the sidecar's bytes unchanged

  Scenario: no module under src/ turns a machine hostname into a node id
    When every module under `src/` is read with its comments stripped
    Then `sanitizeHostname` is called on a value derived from `os.hostname()` in no module
    And the only `src/` callers of `sanitizeHostname` are `src/node-identity.mjs` (the legacy discriminator, task 01) and `src/commands/mesh/identity.mjs` (the `--name` path, sanitizing an OPERATOR-supplied name)
    And `src/node-identity.mjs` contains no expression that assigns a sanitized hostname stem to the derived id
