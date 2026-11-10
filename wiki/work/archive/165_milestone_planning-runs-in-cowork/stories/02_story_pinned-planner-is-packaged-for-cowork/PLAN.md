# 165/02 · The pinned planner is packaged for Cowork — build plan

## Mechanism

`packagePlanner` has one gate and three moves.

1. **Gate:** `isFullSha(sha)`, or refuse with `reason: "sha-not-pinned"` before anything is
   spawned (E4).
2. **Obtain a tree.** If `source` is injected, use it. A test fixture is `{ dir, head }`. Live, run
   `git clone --depth 1 --branch v2.0.0 https://github.com/phuryn/pm-skills.git <tmp>` by argv,
   with no shell string, then `git -C <tmp> rev-parse HEAD`. A clone that fails refuses with
   `clone-failed`.
3. **Check:** if `head !== sha`, refuse with `head-mismatch` and name both commits (E2).
4. **Collect:** for each plugin in `recommendedPlugins({ withOptional })`, walk `<tree>/<plugin>/`
   recursively into a `relative path → Buffer` map, using `/` separators and skipping `.git`, then
   add `LICENSE` from the tree root. Refuse with `plugin-missing` if a folder or its
   `.claude-plugin/plugin.json` is absent.

Wrap steps 2–4 in `try/finally` and `rm -rf` the temporary clone in every outcome (E9, E10). An
injected `dir` is never removed, because the caller owns it.

Follow `resolveSha`'s pattern: an injection seam first, then the live spawn. Log network-boundary
lines through the injected `log`, as `executePlanningPlan` does, before the clone. The step
downloads plugin code and does not run it, so the warning should say exactly that.

## Verification step

Build a fixture tree in a temp dir: the three core folders plus `pm-market-research`,
`pm-ai-shipping` and a root `LICENSE` and `README.md`. Call `packagePlanner` with
`source: { dir, head: SHA }`, `sha: SHA` and `withOptional: true`. You should get four packages,
none named `pm-ai-shipping`, each with `LICENSE` and its own `plugin.json`, and no `README.md`
from the root. Repeat with `head` set to a different sha: you should get `head-mismatch` and no
packages. Then run the live path once by hand to confirm the clone checks against the real
`5042ff61…`. If you only exercise the injected path, the clone branch goes unproved.

## Out of scope

- Zipping and writing to `.aof/cowork/`, and the lock entry. That is 165/03.
- Resolving the tag to a sha. `resolveSha` in `planning-init.mjs` already does it, and 165/03 passes
  the result in.
- Caching the clone between runs. Each run is cheap (about 0.5 MB).

## Known traps

- On Windows `spawnSync("git", …)` needs `shell: process.platform === "win32"` in this codebase's
  idiom (see `resolveSha`). Keep the args as an array all the same.
- A shallow clone of a tag is a detached `HEAD`. `rev-parse HEAD` still gives the commit.
