# 165/03 · Planning init delivers Cowork — build plan

## Mechanism

`initPlanning` gains a cowork branch. Every other runtime's path stays exactly as it is.

1. **Validate first.** Accept `cowork` as a runtime. If `runtime === "cowork"` and the caller
   *gave* a scope (`options.scope !== undefined`, which is how the CLI face's `argv` signals it),
   refuse with nothing written (E8, Q1). The default `project` scope is never applied to cowork.
2. **Guard** through 165/00's per-runtime reader, exactly as for claude and codex.
3. **Plan.** `planPlanningInstall({ runtime: "cowork" })` returns one
   `{ kind: "render", plugin: "aof", path }` item and one `{ kind: "package", plugin, path }`
   item per recommended plugin, with no `argv` and no `command`. The dry-run lists those paths and
   the upload steps, and returns before any sha resolution, clone or write (E2).
4. **Build in memory.** Call `resolveSha`, then the existing 40-hex gate, then 165/02's
   `packagePlanner` (refused → the honesty-gate return, nothing written: E3), then 165/01's
   `renderPlanningPlugin`, then `zipStored` for each.
5. **Write.** Write `.aof/cowork/.gitignore` (`*`, Q2) and each `.plugin`, then the lock entry
   through 165/00's writer. The entry is m02's schema plus `plugins[].package` and
   `cowork: { bundle, skills, installConfirmed: false }` (E4).

The CLI face (`commands/planning-init.mjs`) gets `cowork` in its usage and `--runtime`
description. `render()` gets a cowork branch that prints the upload steps and says the install
is not confirmed. `json()` adds `packages` (relative paths) and keeps every existing key. The
`cli.mjs` example line names cowork.

## Verification step

In a temp repo with a seeded claude entry, run the registered command with
`AOF_PLANNING_SHA=<fixture>` and the planner source injected. You should find five files under
`.aof/cowork/`, `git check-ignore` true for each `.plugin`, and a lock where `runtimes.claude` is
unchanged and `runtimes.cowork.cowork.installConfirmed === false`. Grep the stdout for
`Installed`: it must not match. Then run `--runtime cowork --scope user`: you should get exit 1,
and the tree should be byte-identical to before. If the run spawns `claude`, the plan leaked an
argv, and FF-16505 turns red.

## Out of scope

- Confirming the install. aof can't see Cowork, so `installConfirmed` stays `false` for good.
- An aof MCP server, cowork for `aof work init`, and org marketplaces (SPEC out-of-scope).
- The root `.gitignore`. aof writes only `.aof/cowork/.gitignore`.

## Known traps

- `initPlanning` currently defaults `scope` before validating it, so read `options.scope` before
  that line or the explicit-versus-default distinction is lost.
- The existing honesty gate returns `installFailed`. Reuse that shape for a refused
  `packagePlanner`, so the CLI's refusal mapping (exit 1) applies unchanged.
