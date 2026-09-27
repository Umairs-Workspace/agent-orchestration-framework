---
type: story
number: 132
slug: run-records-carry-the-node-id
title: "Run records carry the node id, not the node name — a machine name never reaches source control"
depends: []
status: done
owner: product-owner
created: 2026-09-17
updated: 2026-09-23
reads:
  - wiki/work/132_story_run-records-carry-the-node-id/PLAN.md
  - src/run-store.mjs
  - src/commands/run-start.mjs
  - src/commands/run-status.mjs
  - src/commands/mesh/gate.mjs
  - src/mesh/presence.mjs
  - src/mesh/registry.mjs
  - src/mesh/worker-execution.mjs
  - src/workspace.mjs
  - src/fs.mjs
  - test/run/run-node-partition.test.mjs
  - test/arch/work/acd-no-internal-project-names.test.mjs
  - .claude/rules/build-deploy-restart.md
files:
  - src/node-identity.mjs
  - src/work.mjs
  - src/mesh/fabric.mjs
  - src/commands/mesh/identity.mjs
  - src/commands/mesh/join.mjs
  - src/mesh/relay.mjs
  - src/global-work-store.mjs
  - test/session/self-heal-hostname-mismatch.test.mjs
  - test/session/identity-sidecar-persist.test.mjs
  - test/mesh/identity/mesh-node-identity.test.mjs
  - test/mesh/identity/global-node-identity.test.mjs
  - test/mesh/identity/mesh-identity-cli-face.test.mjs
  - test/mesh/identity/mesh-identity-status-commands.test.mjs
  - test/mesh/identity/index.mjs
  - test/mesh/mesh-fabric-seam.test.mjs
  - test/mesh/mesh-direct-fabric.test.mjs
  - test/work/backcompat-migrate-doctor.test.mjs
  - test/arch/mesh/acd-run-records-name-no-machine.test.mjs
  - test/arch/mesh/index.mjs
  - test/arch/work/acd-no-internal-project-names.test.mjs
  - src/global-node-registry.mjs
  - ui/src/fleet/scope.mjs
  - ui/src/fleet/scope.d.mts
  - ui/src/fleet/api.ts
  - ui/src/fleet/Fleet.tsx
  - app/desktop/crates/core/src/status.rs
  - app/desktop/crates/core/src/view_model.rs
  - app/desktop/crates/app/src/main.rs
  - app/desktop/ui/app.js
  - app/desktop/ui/styles.css
  - test/ui/fleet-scope.test.mjs
  - test/mesh/mesh-workspace-workdir-absolute.test.mjs
  - test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 132 · Run records carry the node id, not the node name

## User story

As **an operator whose work tree is a public repository**,
I want **every run record — its `node` field and the `runs/<node>/` folder it sits in — to name
the node by a stable id that was never derived from the machine's hostname**,
so that **a lane commit can carry its run records into source control without disclosing a
machine name**, and a record still resolves to the node that wrote it after a hostname changes.

Measured 2026-09-17 (127/VERIFICATION `F-12`): twelve run records and six `runs/<node>/` folders
on the `127-129` branch carried the control node's hostname, written by the loop's lane commits
(`git commit --no-verify`, headless by design), and were scrubbed by hand (`20582a8`).

## What refine measured, and the decision it forced

The captured story said "the run store is the one writer still spelling the hostname". That is
not what the code does. `src/run-store.mjs` is basis-neutral: it takes `node` as INJECTED DATA
from the command layer, which passes `config.mesh.nodeId`. The disclosure is that **the id IS the
hostname** — `~/.aof/mesh/identity.json` reads `nodeId: "<hostname-id>"`, `derivedFrom: "<hostname>"`,
because `deriveNodeId` rule (2) is "else the sanitized hostname stem". Re-pointing the store at
"the node id" would change nothing.

**Decision (operator, 2026-09-22): one id, made opaque.** Rule (2) is retired — every derived id
becomes the `node-<installHash(salt)>` form rule (3) already produced for an empty stem. A pinned
id still wins verbatim. There is no second identifier: 806 `nodeId` references across 40 modules
stay exactly as they are, reading one id that is now safe to commit.

Two consequences the tasks exist to control. **(a)** The fabric peer→nodeId join reads the id AS IF
it were a machine name (`byHost.set(nodeId.toLowerCase(), …)`, and F-3302's `.local` strip exists
only to feed it), so it must be re-seeded from a declared `hostname` on the node record — which
lives in `~/.aof` and reaches no commit. **(b)** `healIdentitySidecar` would read every existing
node as stale-format on the next load and silently re-identify a live mesh mid-soak, orphaning
enrollment credentials keyed by the old id; so legacy ids stay RECOGNISED, and re-identification
becomes one deliberate edge.

Two further measurements corrected the framing. The tracked tree carries **no live hostname**: its
189 node-partitioned records sat under the control node's placeholder segment (184; moved to `node-7297` on 2026-09-23) and `umamis-mac-mini` (5), both post-scrub
placeholders. The only live-hostname folder on disk is `132/runs/<hostname-id>/`, written by this
story's own refine run and untracked — the disclosure is always one lane commit away, never
resident. And `acd-no-internal-project-names` is **green** with all of it tracked, because its term
list names downstream projects, not the operator's machine: it is not a safety net here, and is not
to be made into one.

## Tasks

- [x] `tasks/00_the-derivation-never-spells-the-hostname.feature` — rule (2) retired; every derived id is `node-<installHash(salt)>`; a pinned id still wins verbatim; a collision widens the hash instead of reaching for the hostname; no `src/` module turns `os.hostname()` into an id
- [x] `tasks/01_a-legacy-id-is-never-silently-rehomed.feature` — `isDerivationOf` keeps recognising the legacy stem forms so the self-heal has no trigger; `isOpaqueNodeId` answers the narrow commit-safety question; `aof mesh identity --reidentify` is the one deliberate edge and reports what it invalidates; old `runs/<hostname>/` folders still read unchanged
- [x] `tasks/02_the-node-record-carries-the-join-key.feature` — `hostname` as an additive key beside `host` (the dial address); `resolvePeers` seeds its index from it and the id-as-host seed is removed; an unjoined peer is still surfaced; the record reaches no checkout
- [x] `tasks/03_no-run-record-names-a-machine.feature` — the fitness function at `test/arch/mesh/acd-run-records-name-no-machine.test.mjs`: a tracked segment and a record's `node` key are opaque or baselined, the baseline shrinks only, it self-checks for vacuity, and the private-terms guard gains no exemption
- [x] `tasks/04_a-real-run-on-this-node-names-no-machine.feature` — `@manual`: after a deploy and an operator restart, re-identify this node, mint a real run, and read at the source that the folder, the `node` key, the run-status union and the fleet join all hold
- [x] `tasks/05_a-rename-reports-what-it-strands.feature` — `@bug` F-2 (from verify): a `--name` that moves an existing id answers the re-identification envelope, naming what the old id keyed through ONE scan shared with `--reidentify`; it repairs nothing; a first pin or a repeat stays the bare node record
- [x] `tasks/06_the-fleet-names-a-node-by-its-machine.feature` — `@bug` F-5 (after accept): the registry sync keeps the record's `hostname`, and both fleet faces title a node with it while the opaque id stays the identity beside it

## Notes

- Captured at 127's accept as the operator's next story; it depends on nothing in flight.
- The loop's `--no-verify` lane commit is a second guard gap (127/RETROSPECTIVE R7, routed to
  129) and is not this story's — this story removes the disclosure at its source.
- **The Mac worker and the WSL node are an operator step, not this story's.** Both carry
  hostname-derived ids and both need `--reidentify` plus a restart; neither may be driven from
  here (an SSH-spawned Mac daemon has no login session and burns runs). Task 04 records them as
  outstanding rather than assuming a fleet-wide migration.
- The codebase graph was **not** available at refine: `aof graph build .` timed out at 120s, and
  the artifact on disk is from 2026-09-13. Boundaries here were drawn from reading the source, and
  the contract-derive proposal (340 reads, 327 of them `work.mjs` dependents) was treated as noise.
