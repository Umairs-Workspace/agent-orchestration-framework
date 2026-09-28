# @aof/work

Private workspace for work-domain behavior. Its first extracted surface is
`@aof/work/effects`: `createWorkEffects(getServices)` contributes status advancement,
bounded rollback, run-reference remapping, and ruling evidence to the effects registry.

Registration is inert. Handlers await the supplied service provider when invoked;
the package imports neither core nor a journal singleton. Core currently supplies
the disk item reader/writers, run-record writer, and acceptor writer from `src/`.
Those implementations have not yet migrated. The CLI remains part of core.

Run `yarn workspace @aof/work test` for the package tests.
