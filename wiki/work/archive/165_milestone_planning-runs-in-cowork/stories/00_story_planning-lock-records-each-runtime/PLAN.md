# 165/00 · The planning lock records each runtime — build plan

## Mechanism

`initPlanning` in `planning-init.mjs` already reads the unified lock and merge-writes only the
`planning` key, and that is the seam. It changes in two places.

Add one exported reader, `planningEntries(lock)`, that returns a runtime-keyed map: `{}` when
there is no section, `section.runtimes` when the new shape is present, and
`{ [section.runtime]: section }` for a pre-165 flat section. The re-run guard and the writer both
go through it, and nothing else in the module reads `lock.planning` directly.

- **Guard:** refuse when `planningEntries(lock)[runtime]` exists and `--force` is absent. Name the
  runtime in the message, and keep the `--force` hint.
- **Write:** `{ ...lock, planning: { runtimes: { ...planningEntries(lock), [runtime]: manifest } } }`.
  Other entries pass through as the same object, so they stay deep-equal by construction.

`result.manifest` stays the entry that was just written, so the CLI face and its `--json` shape
are unchanged.

## Verification step

Seed a temp repo's lock with a flat claude section plus `files`/`work` sections, then run
`initPlanning({ runtime: "codex", sha: FIXTURE, simulateInstall: true })`. Read the lock back:
`planning.runtimes.claude` deep-equals the seeded flat object, `planning.runtimes.codex.codex.pluginsInstalled`
is `false`, and `files`/`work` are byte-identical. Then run claude again with no `--force`: it
returns `guarded: true` and the lock's bytes are unchanged. If the guard still keys on the
section existing, the codex run would come back guarded, so a green run proves the guard moved.

## Out of scope

- The `cowork` runtime and its entry fields — that is 165/03.
- Migrating locks on disk in place. A flat section is rewritten only when a planning init writes.
- A `planning status` or uninstall verb — nothing asks for one.

## Known traps

- `aof planning init` with no `--runtime` means claude. E3 and E5 rely on that default.
- `acd-unified-lock-sections` asserts `lock.planning.source` after a claude init. Switch it to the
  reader rather than weakening the assertion.
