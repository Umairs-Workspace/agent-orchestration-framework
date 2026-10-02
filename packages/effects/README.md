# @aof/effects

Journal storage, reactor registration, effect execution, and at-least-once delivery over supplied
runtime services. The package has no imports, file-location policy, application reactor vocabulary,
or process-global instance. Creating its factories performs no storage or network work.

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

`@aof/effects/journal` exports `createEffectsJournal`, the schema version, and step statuses.
Supply `mintEventId(timestamp)` and the diagnostic sink; call `initializeJournal({ db, databasePath })`
with an opened SQLite connection supporting `exec` and `prepare`. The returned operations own the
schema, atomic event/step append, replay conflicts, pending-step selection, updates, and diagnostic
reads. Initialization closes the supplied connection if schema setup fails. The caller owns runtime
loading and directory creation; a successful journal handle owns closing its connection.

`@aof/effects/registry` exports `createReactorRegistry`, `EVENT_NOT_DECLARED`, and
`UndeclaredEventError`. Pass ordered `{ name, events }` contributions and `{ reportDegrade,
isKnownLocus? }`. Each event maps to an array of `{ key, locus, apply, applies? }` reactors. Groups
may contribute to the same event; array/contribution order determines cascade order. Duplicate
event/key pairs fail with both owners named. The optional locus validator is synchronous.
The result exposes `table`, `effectsFor`, `knownEvents`, `ownerOf`, and `applicableReactors`.
Undeclared events are refused; a declared event with no applicable consequences remains valid.

The adapters under `src/effects/` supply runtime loading, file paths, application reactors,
diagnostics, and local/control/integration policy. Dispatch/outbox composition is initialized on
first use while the legacy table and domain transitions still form an import cycle. Application
reactors currently register as one explicit contribution; splitting the handlers into domain-owned
contributions is the next step. Run/assignment-specific journal queries remain outside this package.
The schema version, on-disk format, event vocabulary, and default database location are unchanged.

Run `yarn workspace @aof/effects test`. The root command contract suite also runs the package
tests. Real journal durability and mesh delivery remain covered by the root integration suites.

`journal-open` provides `createJournalOpener({ effectsJournalPath, importSqliteRuntime, storage })` and event IDs; path policy remains in core. `stores` provides classification queries over declarations supplied by the application, while `store-metadata` declares journal tables. Domain-specific event queries are outside this package.
