# 160/07 · A test's child aof runs from one bundle — build plan

## Mechanism

**The recipe.** `build-sea.mjs` step 1 calls esbuild with options it spells inline (entry, platform,
format, target, externals). Lift them into an exported function that both the SEA build and the
runner call. The SEA bundle is CJS with `scripts/sea-entry.mjs` as its entry, and reaches assets
through the asset-base seam. Prefer the same entry and format for the test bundle, so a test runs
exactly what ships. If the SEA entry needs `node:sea` at load, then the shared part is the option set
and the externals, and the entry differs. Record which, and why, in a comment where the export lives.

A trial at refine bundled the CLI module as ESM (`node-pty` and `@aof/ui/vite-cli`
external, a `createRequire` banner). `aof work find 160 --json` answered byte-identically in 0.56 s
against 2.0 s from the source. That trial put the bundle in a scratch directory. Fifteen source files
read paths relative to their own module, so check that the asset-reading commands in the parity set
pass from `.tmp/`.

**The runner.** Build after planning, before `runPool`, into `.tmp/test-cli-bundle/`. Add the
variable in `spawnUnit`'s env, after `process.env`. On a build failure print the one line and carry
on. Lanes units (the integration features) spawn children too, so they get the variable as well.

**The bin.** Read the variable, check that the file exists, and dynamically import its URL. Keep the
compile-cache call first: FF-16004 pins that order. Every other path is today's dynamic import of
`../src/cli.mjs`.

## Verification step

Through the shard entry (never `aof test`, m160/02 R2): the parity set; FF-16004 with
the variable present in the parent shell; the red probe, a version string changed in the built
bundle. Then time `aof work find 160 --json` five times each way, and run `cli-face-contract`,
`work-archive-is-a-move` and the bijection suite alone with and without the variable, with the spawn
preload. The refine census gave 143, 64 and 62 child spawns and 345, 139 and 97 s of child time.

## Out of scope

- Bundling the payload install or the daemons. Production keeps the source tree.
- In-process CLI calls in tests (STATE: the next lever if the budget is still missed).
