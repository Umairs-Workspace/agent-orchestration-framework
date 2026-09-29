# Plan 01 — Finish domain ownership

Status: in progress. Depends on the current baseline. Feeds [Plan 02](02-composition-and-cli-PLAN.md).

## Objective

Finish extracting domain behavior before moving the remaining application into core. Avoid turning
`packages/core` into a new home for the same monolith. Existing extracted implementations, including
domain transitions and graph MCP, need integration and cleanup rather than another extraction.

## Remaining source inventory

These are concrete starting points, not instructions to move whole directories blindly.

| Current source | Intended decision |
| --- | --- |
| `src/cache-read.mjs`, `src/cache-provenance.mjs` | Split projection access from domain-neutral provenance contracts; mesh owns distributed cache behavior and work receives a reader port. |
| `src/artifact-sync.mjs`, `src/board-mesh-execution.mjs` | Mesh owns artifact propagation and execution projection policy; server receives the composed board projection. |
| `src/node-identity.mjs` | Assign node identity behavior to mesh; retain only genuinely shared path primitives below it. |
| `src/commands/resync.mjs` | Mesh owns the distributed resync operation and contributes its existing route under `work`. Namespace spelling does not dictate package ownership. |
| `src/phase-brief.mjs`, `src/phase-brief-read.mjs` | Separate compilation from configured reads; place work-specific briefing with work and inject application services. |
| `src/work-examples/`, `src/story-contract-derive.mjs`, remaining `src/work/` implementations | Classify discovery, contracts and work policy into work; installation/rendering and assembly remain core. |
| `src/diagrams/`, remaining `src/commands/` | Classify each operation by domain; distinguish graph modeling, export/tool execution, product setup and transport entry points. Record the chosen API before moving mixed modules. |
| `src/effects/stores.mjs` and configured journal/outbox/table/dispatch modules | Keep generic mechanics in effects, domain metadata with its owner and aggregate registration in core. The seven transition implementations are already extracted. |
| Configuration, render plan, adapters, bundle loading, CLI and project setup | Core-owned unless an identifiable domain operation can be split out. Do not move these to foundation merely to avoid a dependency. |

## Work

- [ ] Inventory every remaining root production module as implementation, configured adapter,
  compatibility forward, executable child entry or asset. Include dynamic imports and spawned paths.
  Record owner, consumers, public API and disposition in a small ownership ledger in this folder.
- [x] Capture current focused failures and command descriptors before changing ownership. Distinguish
  source-path assumptions from behavioral regressions and unrelated existing failures.
- [x] Complete the mesh cache/artifact/overlay/resync group. Preserve cache-first fallback, provenance,
  publication authority, offline refusals and the distinction between requesting and completing resync.
- [ ] Complete work briefing/discovery/contract services and remaining feature commands. Inspect mixed
  migration, delegation and diagram operations individually; document any justified core retention.
- [ ] Add explicit exports and direct dependency declarations. Remove implementation imports through
  old root forwards when an owning package API is available.
- [ ] Keep only temporary adapters needed by current consumers, with their removal assigned to Plan 06.
  Update relevant package READMEs, command contributions and architecture source readers in each batch.

## Verification and exit

- [ ] Compare legacy and package APIs, including error classes, constants and configured behavior.
  Exercise package factories with explicit services and the configured application in fixtures.
- [ ] Run affected cache/store, mesh assignment, work briefing, command and architecture suites through
  the real project runner. Test direct public imports in a copied installation, not just the checkout.
- [ ] Check command descriptor/order parity and shared CLI/server invocation for moved commands.
- [ ] Run immutable linking and the supply-chain audit when manifests change.
- [ ] Every remaining substantial root implementation is either deliberately core-owned or tracked
  with a concrete destination and follow-up; finish those follow-ups before declaring this plan done.

Commit by domain group. Revert a failing extraction together with its consumers/exports; persistent
state formats must remain unchanged throughout.
