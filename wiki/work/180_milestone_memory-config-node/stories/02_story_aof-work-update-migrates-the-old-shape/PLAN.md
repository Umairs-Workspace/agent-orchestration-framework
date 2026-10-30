# Build brief

## Mechanism

`updateWork` gains one step. It runs after `ensureWorkDirGitFiles`, before the lock rewrite, and on
the dry-run path too, where it computes but does not write.
1. If `.aof/aof.config.json` does not exist, skip the step. `readConfig` answers `{}` for an absent
   file, so check existence first, or the write would create a config.
2. Otherwise reuse the config `updateWork` already read for the work dir. A parse failure has
   already failed the update there, as it does today.
3. Call `rewriteLegacyMemoryConfig(config)`.
4. When `moves` is non-empty and this is not a dry run, `writeConfig(configPath, result.config)`.
5. Return `memoryConfig: { moves, conflicts, written }` in the envelope.

The rewrite function already produces ADR-006's key order and leaves conflicted pairs alone, so this
step adds no shape logic.

The `work:update` render prints one line per move (`memory: graph.share → memory.graph.share`) and
one per conflict (`memory: graph and memory.graph both set — left as written; choose one`). It
prints nothing when both are empty, so a current project's update output is unchanged.

`initConfig` already writes only `memory.backend` through `applyDefaultBackendSelection`. Pin it
with an init-config case that reads back the whole memory node. `180/02 Q1` was answered `local`,
so `DEFAULT_MEMORY_BACKEND` becomes `"local"`. The init command asset's description and its step
sentence change with it, and so do the three `graphify` assertions in `work-init-config.test.mjs`.
Re-render the asset's tracked copies with `aof work update` from this repository.

Watch for:
- `writeConfig` reserializes the whole document. "Byte for byte" for foreign sections holds for a
  2-space JSON file, which is what aof writes. Assert per-section `JSON.stringify` equality, not a
  whole-file diff.
- No move means no `writeConfig` call. Assert the mtime, because a rewrite of identical bytes would
  hide that bug.

## Verification

Under an isolated `AOF_GLOBAL_HOME`, run `work-update.suite.mjs` and `test/work/work-init-config.test.mjs`
through their arrays, plus `acd-no-clobber-without-force`. End-to-end: copy E1's config into an
initialised temp project, then run `aof work update --dry-run`, then `aof work update`, then
`aof project doctor`. Read the file. The doctor shows no `memory-config-legacy` warning.

## Out of scope

The reader and its warnings (story 01). The editor's save (story 03). Removing the legacy read
(TECH_DEBT).
