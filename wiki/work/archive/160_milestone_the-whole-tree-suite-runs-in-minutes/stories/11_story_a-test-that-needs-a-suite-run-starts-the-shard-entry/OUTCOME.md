# 160/11 · A test that needs a suite run starts the shard entry — Outcome

## Delivered

### A test that needs one suite run starts the shard entry
`core-workspace`, `notify-channels`, `discord-bot` and `site-build`'s gate cases start `scripts/test-shard.mjs`, not `scripts/test.mjs --only`; FF-16013 holds every spawn of the registry runner under `test/` to an allowlist of one entry, `test-command-contract`'s bounded `runner()` child.

### The Pages gate runs its one suite through the shard entry
`.github/workflows/pages.yml` runs `node scripts/test-shard.mjs test/arch/loop/acd-loop-document-current.test.mjs` under a fresh `AOF_GLOBAL_HOME`.

## Gaps

### `site-build` still copies the whole runnable tree
- **Status:** open
- **Discharge condition:** `acd-loop-document-current` no longer imports the registry or walks `packages/`, so the copy can shrink to what the shard entry loads.
Copying the tree is 82 s of `site-build`'s 108 s; its two gate cases now share one copy.
