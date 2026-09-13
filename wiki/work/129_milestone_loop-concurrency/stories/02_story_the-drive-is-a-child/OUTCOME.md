# 129/02 · The drive is a child — Outcome

## Delivered

### `aof work drive <phase> <ref>` takes a lent run across the process boundary
`--run <id>` joins the closed input schema, CLI flag spec and argv mapper of all three phase drivers; `managedRunId` reads it before `ctx.loopDrive.runId` (`""` is absent), and under it the command mints no record, settles nothing, carries the id as `AOF_RUN_ID` / `AOF_RUN_ITEM_DIR` into the session env, captures the session id on the parent's record when one exists, and returns `settlementContext` (`{ projectsDir, transcriptBaseline, spendBaselineAvailable }`) on the result of every real drive, lent or owned. A bare drive is byte-identical; `--dry-run` answers `{ ref, phase, command }` and starts nothing, lent or not.

### `--fix <file>` is the fix transport across the process boundary
The file is read as one JSON object in `fixTransport`'s shape before any record is minted and before any spawn; `continue` alone honours it (refine and verify ignore it as they ignore `ctx.loopDrive.fix`); the flag wins over `ctx.loopDrive.fix`; every way the file fails to yield an object is the one coded refusal `drive-fix-unreadable`.

### Under `--run`, the child's stdin is the cancel channel
`ctx.stdin ?? process.stdin` is resumed and its `end` listened for inside the same `try…finally` as the driver call; an `end` after the session is live aborts a signal the driver takes, one before it is ignored; the stream is paused once the session settles. Without `--run` stdin is never touched.

### The session driver takes a caller's `AbortSignal`
`driveInteractiveClaudeSession(brief, { signal })` — an abort while the session is live requests `{ outcome: "failed", failureReason: "cancelled" }` through the driver's own `stopForOutcome` bracket (stop-requested → tree terminate on win32 → pty-released → exit-confirmed); an abort after settle or behind an unconfirmed sentinel stop changes nothing; a signal already aborted at the spawn point never spawns and answers `processStarted: false`. The export set and direct-import set are unchanged.

### `runBounded` aborts, additively
`signal`, `graceMs` and `stdin: "pipe"` are three additive options on `src/work-audit/spawn.mjs`'s one bounded spawn; an abort ends a piped stdin, waits the grace (`DEFAULT_GRACE_MS` 20 s, or a positive safe integer), then kills; `SPAWN_OUTCOMES` is `["exited", "deadline-expired", "not-started", "aborted"]`; the first of the deadline and the abort to fire decides and exactly one kill is sent, the message naming which bound sent it; an already-aborted signal never spawns; an unknown `stdin` is a returned `not-started`. Callers passing none of the three are byte-identical, `stdio` stays `["ignore", "pipe", "pipe"]`, and no `shell` exists on any path.

### `src/loop/child-drive.mjs` spawns a lane's drive and reads exactly one document
`spawnLaneDrive({ ref, phase, runId, lane, fixFile, env, deadlineMs, signal, graceMs, spawnChild })` runs `process.execPath` through `runBounded` — under a Node runtime with `[<this tree's src/cli.mjs>, "work", "drive", …]`, under the packaged launcher (`isPackaged()`) with the verb words alone — `cwd` the lane, env the parent's plus the caller's, `stdin: "pipe"`, never a shell; the whole trimmed stdout is parsed as one JSON object and the exit is classified from it (`document` / `refused` / `died` / `timeout` / `aborted`), with the last twenty stderr lines on every answer and whatever document parsed before a kill. It mints no failure reason, touches no run record, prints nothing and imports no session driver.

### `src/loop/` exists as a declared budget exemption
`SOURCE_DIRECTORY_EXEMPTIONS` carries `src/loop` with a `why` naming the row it owes at the ninth file or with the `loop-*` root-leaf move; the family holds one member.

## Assumptions

- **The parent settles what the child hands back** — `settlementContext` and the `aborted` / `died` / `timeout` outcomes are meaningful only once a caller settles the lent run against them; today no production caller does.
- **A `--run` id is the parent's to mint** — the child heartbeats and captures the session id keyed by the id it is given and never checks that a record exists.
- **The cancel channel is a pipe the loop owns** — the stdin gate assumes the only stdin that is ended is the parent's pipe; a TTY or NUL stdin under `--run` is armed too and reads as "not a cancel" only because its `end` lands pre-liveness.
- **The vector is decided by `isPackaged()`** — a Node runtime whose `import.meta.url` cannot resolve `../cli.mjs` is not a supported host.

## Gaps

### A caller of `spawnLaneDrive`
- **Status:** open
- **Discharge condition:** `129/04`'s wave tick calls it per lane with `deadlineMs` derived from `startToCloseMs + startupGraceMs`, an abort signal from the interrupt handler, and the lane's `AOF_GLOBAL_HOME`-honouring fix file, and maps `died` → `failed / runtime_offline`, `timeout` → `failed / timeout`, `aborted` → `cancelled`.
The module is complete and unreferenced by any `src/` path; a lane drive with no `deadlineMs` today inherits the seam's 60 s default.

### A cancel that lands in the startup window
- **Status:** open
- **Discharge condition:** `129/04`'s contract (or a superseding ADR note) rules that the cancel is armed only on a piped stdin and that on a pipe every `end` is the cancel — pre-live through the driver's pre-spawn refusal, live through the bracket — and the `setImmediate` yield goes.
An `end` that arrives before `onPtyLive` is ignored by the delivered contract, so a parent cancel during the child's 150 ms–1.2 s startup spawns the session anyway and is answered by the parent's grace kill.

### The fix file's writer
- **Status:** open
- **Discharge condition:** `129/04` writes `<meshRoot>/loop-fixes/<runId>.json` in `fixTransport`'s shape under the aof home before spawning the child, and removes it after settle.
This story owns the reader alone; no path writes a fix file.

### The family boundary control
- **Status:** open
- **Discharge condition:** `129/05` lands FF-12902 with its `node:child_process` leg scoped to `src/loop/**` and its argv leg taking the packaged branch through the SEA sentinel.
`src/loop/`'s no-driver, one-spawn-seam invariant is held today by inspection and by task 03's unit rows, not by a register control.
