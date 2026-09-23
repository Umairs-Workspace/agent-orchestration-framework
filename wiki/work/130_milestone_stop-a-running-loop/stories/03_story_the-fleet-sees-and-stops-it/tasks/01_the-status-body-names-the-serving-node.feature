@executable @cli @work @board
Feature: the status body names the serving node — localNodeId beside scope, null on an unconfigured machine, the projection untouched

  ADR-005 §3; pays TECH_DEBT item 18 (b). The production fleet card renders `GlobalNode` rows
  that carry no local marker, and the global envelope names no local node — so "the Stop only on
  THIS node's card" needs a fact the wire does not carry. The `/api/mesh/status` route stamps
  `localNodeId: await controlNodeId()` on the body beside `scope` — the board's own precedent
  (`board-ui.mjs` stamps `nodeId` on its envelope) and its rule: an unconfigured machine names no
  node, and then no card shows a button. `shapeGlobalStatus` (the projection) is untouched: which
  machine serves a payload is a fact about the server, not about the store. `api.ts`'s
  `FleetStatus` gains `localNodeId?: string | null`; `PresenceRecord` gains `loops?: PresenceLoop[]`.

  RULINGS (QA, 2026-09-13). The suites this extends pin the serving node's id themselves:
  `mesh-ui-assign-fixture` commits `mesh.nodeId: "control-a"`, and `mesh-ui-serve.test.mjs`'s
  `makeRepo` commits none over an isolated home (no sidecar hydrates one) — so the scenarios speak
  `control-a` and `null`, not the DESIGN's illustrative `win-host-a`. The stamp is NOT validated
  against the roster: a `localNodeId` with no matching `nodes[]` row is still stamped — locality
  is the server's fact and the roster is the registry's; the card layer resolves a mismatch to "no
  button anywhere" (task 03). The memo is read once per server life (`controlNodeId`), so a
  sidecar written AFTER the first status answer does not change a later one.

  Background:
    Given `serveMeshUi` stood up on port 0 over the published assign fixture, whose own workspace commits `mesh.nodeId: "control-a"`
    And the fixture published node records for `control-a` and `umamis-mac-mini`

  Scenario Outline: every status answer names the serving node beside its scope
    When `GET /api/mesh/status<query>` is fetched
    Then the body carries `scope` <scope> and `localNodeId` `"control-a"`
    And the body's other top-level keys are exactly today's (the projection's<extra>) plus `localNodeId`

    Examples:
      | query                  | scope      | extra                     |
      | ``                     | `"global"` | ``                        |
      | `?scope=local`         | `"local"`  | ` and `currentWorkspace`` |
      | `?repo=w1`             | `"global"` | `` — a client-side filter, ignored by the route |

  Scenario: a refused scope carries no stamp
    When `GET /api/mesh/status?scope=bogus` is fetched
    Then the response is 400 `invalid-scope` with body keys exactly `ok, error, code` — the refusal envelope gains nothing

  Scenario: the stamp is the server's, not the roster's
    Given the fixture published node records for `umamis-mac-mini` only
    When `GET /api/mesh/status` is fetched
    Then the body carries `localNodeId: "control-a"` and no `nodes[]` row whose `nodeId` is `"control-a"`

  Scenario: an unconfigured machine names no node
    Given `serveMeshUi` stood up over `mesh-ui-serve.test.mjs`'s own repo (no `mesh.nodeId`) with an isolated home that holds no identity sidecar
    When `GET /api/mesh/status` is fetched
    Then the body carries `localNodeId: null` — the key present, never absent

  Scenario: the identity is read once per server
    Given the unconfigured server above has answered one status request
    When an identity sidecar naming `"late-node"` is written into the isolated home and `GET /api/mesh/status` is fetched again
    Then the body still carries `localNodeId: null`

  Scenario: the projection is byte-identical
    When `shapeGlobalStatus` is called over the fixture's rows
    Then its answer carries no `localNodeId` key — the stamp is the route's, never the store's

  Scenario: the wire types name the two additive facts
    When `ui/src/fleet/api.ts` is read
    Then `FleetStatus` declares `localNodeId?: string | null`
    And `PresenceRecord` declares `loops?: PresenceLoop[]` with `PresenceLoop` naming the eleven keys and `stop: null | "drain" | "cancel"`

  Scenario: item 18 (b) is discharged, not deferred
    When `wiki/work/TECH_DEBT.md` is read
    Then item 18's (b) clause no longer stands as open — its entry names this story and the route line that pays it, or the clause is deleted
