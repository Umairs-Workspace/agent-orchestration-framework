# Plan 06 — Own tests and remove compatibility scaffolding

Status: complete; verification retains 17 inherited baseline failures and two documented
aggregate/isolated discrepancies. All 11,536 registered cases executed; migration failures
are repaired and covered by focused receipts.
Evidence: [06-BOUNDARIES.md](06-BOUNDARIES.md). Establish guards during [Plan 01](01-domain-ownership-PLAN.md); remove adapters
after [02–05](02-composition-and-cli-PLAN.md) have migrated their production consumers.

## Objective

Tests should prove the final architecture through real implementations and public APIs. Remove
temporary root forwards and configured wrappers without making source guards or test discovery vacuous.

## Work

- [x] Inventory test runners, registered cases, IDs and package test coverage before changing paths.
  Many root suites export `{ name, run }` arrays; merely importing one with `node --test` does not
  execute those cases. Use the existing harness or an explicit adapter that executes every case.
- [x] Move domain unit/contract tests into their owning packages where practical. Keep integration,
  architecture, release and shared fixture coverage at repository scope. Retain `test/arch/` unless
  a separate justified change requires a rename; the old proposed tree is not a rename requirement.
- [x] Preserve traceability IDs and ensure the aggregate runner includes all package tests. Provide
  independent package test scripts and report executed counts rather than imported suite counts.
- [x] Update source discovery to include actual workspace production roots and app/core locations.
  Exclude dependency trees, fixtures and generated copies, while retaining real configured callers.
- [x] Update static/import-closure guards to follow both factory implementations and core bindings.
  Assert nonempty coverage and use planted violations to prove the guard can still fail.
- [x] Enforce declared dependencies, explicit exports, no private sibling imports, no imports back
  into legacy root source or assembled core, and an acyclic package dependency graph. Audit dynamic
  imports, `require`, child entry paths and computed references as well as static imports.
- [x] Migrate remaining production and test consumers to public APIs or deliberate core entry points.
  Remove legacy forwards, superseded configured wrappers and compatibility launchers only after
  checking all consumers, spawned processes, source guards, documentation and distribution paths.
- [x] Keep intentional final composition in core; adapter removal does not mean removing the service
  injection needed to assemble the product. Prune obsolete exports and dependencies after usage checks.
- [x] Search for root `src/`, old `bin/`, `ui/`, and `app/desktop/` assumptions. Distinguish historical
  documentation and stable installed paths from active source dependencies before editing them.

## Verification and exit

- [x] Run each affected workspace's test script and the aggregate bridge; no suite silently vanishes
  or executes twice. Preserve fixture isolation and avoid touching real repository workflow state.
- [x] Run census, registry, child-process closure and architecture checks with both passing fixtures
  and planted forbidden dependencies/source violations.
- [x] Run CLI integration and copied-install tests after removing the final legacy entry points.
- [x] A source/dependency census shows no temporary compatibility modules or active imports to their
  old locations. Any intentionally retained external entry shim has an explicit compatibility reason.
- [x] No architectural rule passes only because its source directory was moved or emptied.

Delete adapters by consumer group, with the corresponding import and guard updates in the same
commit. Keep the pre-removal mapping in migration notes for review and rollback.

Plan 03 retained root `bin/aof.mjs` as a development forwarder into core. Plan 06 removes it
after migrating source callers to `yarn aof` or `packages/core/bin/aof.mjs`. Configured
compatibility entries are removed; deliberate core composition and the two stable installed
audit child entry paths remain. See the removal map and boundary evidence for their reasons.
