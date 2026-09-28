# @aof/effects

Effect execution, at-least-once delivery, and acknowledgement handling over supplied journal
operations. The runtime package has no imports, filesystem access, application registry, or
process-global instance. Creating a dispatcher or outbox performs no storage or network work.

`@aof/effects/dispatch` exports `createEffectsDispatcher` and `EFFECT_MAX_ATTEMPTS`.
The factory accepts:

- `effects`: the event-name → reactor-list table. Reactors supply `key`, `locus`, and `apply`.
- `loci`: the locations this composition can reach by default.
- `pendingSteps(journal, options)` and `markStep(journal, eventId, key, update)`: synchronous
  journal operations. Pending-step selection enforces ordering, scope, limits, and retry ceilings.
- `reportDegrade(code, error, extra?)`: a best-effort diagnostic sink that must not throw.

It returns `drainEffects(options)` and `runEffectsEphemeral(name, payload, options)`. Per-call
reactors, reachability, context, and timing retain the existing API behavior. A failed reactor
records a retryable failure and does not prevent sibling consequences from running. Event-scoped
drains report remote steps as deferred; recovery sweeps request only reachable steps from storage.

`@aof/effects/outbox` exports `createEffectsOutbox`. It receives the journal operations and
diagnostic sink above, plus:

- `readStep(journal, eventId, reactorKey)`: returns a row with `status`, or no row.
- `isRemoteStep(step, loci)`: the owner's eligibility policy for this transport.

It returns `remoteSteps`, `drainOutbox`, and `applyEffectAck`. Sending never settles a step or
consumes its retry budget. Acknowledgements distinguish successful application, terminal refusal,
retryable infrastructure failure, and failed execution; settled steps ignore duplicate receipts.

The existing adapters under `src/effects/` supply SQLite journal access, application reactors,
diagnostics, and local/control/integration policy. Their composition is initialized on first use
to preserve loading behavior while the legacy reactor table and transition modules still form
an import cycle. The journal schema, default database location, and domain transitions remain
owned by their existing modules. Extracting storage and separating reactor registration are later
migration steps; this package does not import those modules back through a compatibility path.

Run `yarn workspace @aof/effects test`. The root command contract suite also runs the package
tests. Real journal durability and mesh delivery remain covered by the root integration suites.
