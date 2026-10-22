# 167/07 · An idle tick walks nothing — build plan

## Mechanism

The seam is `statWorkTree` in `discovery.mjs`, the one walk every tick site already reaches.

1. **The watch set.** `createWorkTreeWatches({ watch = fs.watch, now = Date.now, safetyMs =
   300_000, meter, reportDegrade })` installs one process-level registry and returns
   `{ retain(workDirs), close(), held() }`. `retain` arms `watch(dir, { recursive: true })` for
   each new resolved dir, and closes the ones not named. A dir whose `watch` threw, or whose
   watcher emitted `error`, goes into a `failed` set: it is degraded once
   (`work-tree-watch-unavailable`) and never re-armed in this process.
2. **The gate.** At the top of `statWorkTree`, look up the resolved dir. If it is watched, not
   dirty, has a complete `last` walk, and that walk is younger than `safetyMs`, return `last`.
   If a walk is in flight, await it. Otherwise clear `dirty`, walk, and store the result as
   `last` only when it is complete, with `walkedAt = now()`. Count `stat-walk` with
   `{ code: unwatched | first | changed | safety }` whenever a registry exists, including for an
   unwatched dir. The existing `statFile` test seam bypasses the gate.
3. **Dirty.** The listener ignores a file name whose extension is neither `.md` nor `.feature`.
   Anything else, including a null file name or a bare folder name, sets `dirty`.
4. **The launcher.** With `options.workTreeWatch` set, `startLauncher` creates the set (with
   `processCostMeter` and the launcher's `reportDegrade`). `syncTickWorkspaces` collects the work
   dir of every entry it did not skip as non-propagating, held entries included. When the
   registry read was `ok`, the tick calls `retain` on that list after the pass. `stop()` calls
   `close()`. `mesh serve` passes `workTreeWatch: true`, and nothing else does.
5. **The cause.** `stat-walk` is appended to `COST_CAUSES` (and to the foundation README's list).

Tests drive the gate with an injected `watch` (an EventEmitter with `close`) and clock, in
`discovery.test.mjs`. E8, E9, E11, E12, E13 and stop go in the launcher suite, with the same
injected `watch` passed through `options.workTreeWatch`'s config object. E1 and E2 are proven at
the launcher, counting `stat-walk` over the tick.

## Verification step

The story's suites, alone, with an isolated home. Then the soak in the container
(`node scripts/test-docker.mjs --only test/mesh/budget/daemon-budget-soak.test.mjs`): E1 green,
`serve` idle under 2%, and status's top causes free of `stat-walk` after warm-up. The red probe for
FF-16706 is a `readdir(x, { recursive: true })` planted in `launcher.mjs`.

## Out of scope

- Watching in `mesh ui` (board polls; ADR-009's alternatives).
- The Mac and WSL workers' own behaviour (SPEC). The code runs there, and the safety walk bounds a
  missed event to 5 minutes.
