# Plan 02 — Finish service assembly and extensible CLI registration

Status: pending. Depends on [Plan 01](01-domain-ownership-PLAN.md).
Feeds [core relocation](03-core-workspace-PLAN.md) and adapter removal.

## Objective

Core must assemble the product explicitly, while each feature owns its commands and operations.
Replace the network of configured root wrappers with deliberate service construction and lifetime
management. Preserve the base installation required by `aof:continue`, `aof:verify` and other skills.

## Starting points

Inspect `src/command-core.mjs`, `src/cli.mjs`, `src/work.mjs`, configured modules under
`src/effects/`, `src/mesh/` and `src/commands/`, plus each package's contribution/factory exports.
The contracts registry and feature contributions already exist; extend and finish them rather
than introducing a second registry or a plugin framework.

## Work

- [ ] Map construction order and lifetime for configuration, stores, work/run services, effect
  journal/outbox/drain, domain transitions/reactors, mesh worker state, server and command registry.
  Distinguish process, workspace and invocation scope; identify shared singleton state explicitly.
- [ ] Design focused assembly modules owned by core. Pass narrow collaborator objects to factories;
  avoid a global service locator or a universal service bag passed to every feature.
- [ ] Replace initialization cycles with explicit composition. In particular, inspect deferred
  `meshGlobalPropagationDecision` bindings in item-lock composition and deferred registry invocation
  used by work routing. Legitimate runtime callbacks need an explicit ready-before-use contract.
- [ ] Construct domain transition factories once at their required scope and bind the correct journal,
  delivery and reconciliation services. Retain stable error identity and shared worker state.
- [ ] Finish package-owned command descriptors/contributions, including feature operations registered
  under shared namespaces. Core retains routing, common parsing/errors/output and product commands.
- [ ] Verify duplicate IDs/routes and incompatible argument/option extensions fail deterministically.
  Support explicit extension points where needed; do not silently overwrite another package's handler.
- [ ] Compose the required first-party contribution set in deterministic order. Preserve all baseline
  descriptors, aliases, defaults and validation; explain any intentional change separately.
- [ ] Supply the same invocation contract to CLI, HTTP and MCP. Keep presentation and transport policy
  out of domain operations and avoid adding per-request CLI subprocesses.
- [ ] Separate registration from startup. Help and lightweight session hooks must not start daemons,
  load native PTYs unnecessarily, contact integrations or read their credentials.

## Verification and exit

- [ ] Compare the complete command inventory and representative text/JSON/error/exit behavior with
  the baseline. The recorded 117 definitions are a comparison aid, not a substitute for descriptor parity.
- [ ] Test shared namespace contributions, collisions and declared argument/option extensions.
- [ ] Exercise assembly twice with isolated configurations to detect accidental cross-instance state;
  verify intended state sharing within one application and cleanup of owned resources.
- [ ] Exercise run start/complete/retry, assignment/reclaim, work transitions and effect replay in
  fixtures. Preserve journal ordering, idempotence, acknowledgements and retry semantics.
- [ ] Verify registry/help and session hook import closures for unwanted side effects; verify CLI,
  board and MCP invoke the same configured operation.
- [ ] No feature imports assembled core, and no unresolved initialization cycle is hidden by a
  deferred import. Assembly can move into core without depending on legacy root adapters.

Keep assembly changes reviewable by service family. Preserve temporary entry adapters until their
consumers migrate, but do not count them as the final composition design.
