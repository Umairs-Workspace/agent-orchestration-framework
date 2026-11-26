# 00 · A project selects a validated board definition — Outcome

## Delivered

### A workspace can select a project-owned board definition
`work.store` accepts `{"manifest": "<path under .aof/>"}` beside an omitted value and `"files"`. Each workspace binds its own lazy board store, which loads its definition and adapter on its first operation. Project discovery and the file store import no adapter.

### A board definition is validated before any project code runs
A version 1 YAML definition, published as `schemas/work-board.schema.json`, is parsed as data with duplicate keys refused. An invalid mapping, a manifest or module that resolves outside the project's real `.aof/` directory, and a declared operation with no callable export are each named before the module is imported or any board write is made.

### Board operations cross one typed binding
The store dispatches `readItems`, `readChanges` and `applyChanges`, and the optional `accessProbe` and `attachments` capabilities, by the operation names the definition declares. IDs, cursors, guarded changes and refusals cross unchanged. A board that omits both optional capabilities still satisfies the tracking contract.

### Provider detail stays in the project adapter
FF-20901 fails a provider import, a provider URL or value, or an `az` invocation anywhere in AOF's runtime source outside `.aof/boards/`.

## Assumptions

- **The adapter is trusted project code**: it runs with the process's authority. Validation checks the definition's shape and the module's exports, never what the module does.
