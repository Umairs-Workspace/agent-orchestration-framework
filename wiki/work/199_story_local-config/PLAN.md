# 199 · Build brief

Advisory and the builder's own. The task features are the contract.

## Mechanism

One pure module in `@aof/contracts` owns the local file:
- its name;
- the allow-list;
- the filter, which splits a parsed file into the allowed subtree and one diagnostic per refused
  path;
- the per-key provenance record.

It reads no file, as `operator-profile.mjs` does not.

The layer hangs off the one seam that already layers global under project, `loadWorkspace` in
`application/bindings/work.mjs`. After global is laid under project, the local file's allowed
subtree is laid on top, block by block:
- the operator profile goes through the profile's own merge, so `role` wins whole and `expertise`
  merges per domain;
- `work.notify.channels` replaces whole, matching the project-over-global rule
  `layerNotifyChannels` already applies;
- `work.agents.session.effort` merges per phase.

Each value carries its layer, and `aof project show` reads that record for provenance.

Finding the file: in a plain checkout it sits beside the project config. In a linked worktree
(a loop lane), resolve git's common directory to the main checkout, and read the file there. A
missing file is today's behaviour. An unparseable one is an error, never a silent skip.

The validator reads the local file too. It reports refused keys as `config-local-key-not-allowed`
and an unreadable file as `config-local-unreadable`. Values inside allowed blocks go through the
blocks' existing validators (the operator profile's, effort's), with the local file's path named
in each diagnostic.

`aof-gitignore.mjs` gains the entry, so init and update add it idempotently. The work doctor gains
`config-local-tracked` via `git ls-files --error-unmatch`. `init-config` routes profile flags to the
local file unless `--project` is given. `--project` with `--global` is refused.

The render path is untouched. It reads the project file only (192/ADR-003), and no allow-listed key
reaches it.

## Verification

In a scratch repository with `AOF_GLOBAL_HOME` isolated:
1. Commit a project profile with the role "Solo dev".
2. Run `aof work init-config --operator-role "Product owner"`. `git status` stays clean,
   `aof project show --json` gives the role as "Product owner" with source `local`, and the rendered
   `.claude/commands/aof/refine.md` is byte-identical before and after.
3. Add `work.intake` to the local file. `aof project validate` refuses it.
4. Create a linked worktree. A workspace loaded from inside it resolves "Product owner".

## Not in this story

`aof messaging enable --local`. Any key beyond the three. Changing the three `readConfig` writers.
