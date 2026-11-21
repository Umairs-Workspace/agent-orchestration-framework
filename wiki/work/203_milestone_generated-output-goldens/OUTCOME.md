# 203 · Every file aof generates is held to a committed baseline — Outcome

## Delivered

### Generated output is part of the whole-tree suite

The golden suites are registered in `scripts/test.mjs` (`test/golden/index.mjs`), so every whole-tree run, the regression gate included, compares `aof work init` and `aof work update` output in ten scenarios with the 302 committed baselines under `test/golden/baselines/`. The harness, lanes and baselines are m203/00, m203/01 and m203/02's capabilities.

### A bundle or render change is reviewed as a diff of what users receive

A change to anything `aof work init` or `update` writes fails the suite with a diff per file. It is accepted by `node scripts/golden.mjs --update`, and lands in the PR as a diff of `.golden` files, as m203/01's prose-edit evidence shows.

### The baselines are platform-neutral

One committed baseline set holds on any OS, proven on whatever OS runs the suite (m203/02/one-baseline-on-any-os).

## Assumptions

- **The lanes cover two verbs** — `aof apply`, `aof init` and `aof clean` (204) and the `aof work` verbs over a stream (205) are not yet held to baselines.

## Gaps

### `manifest.json` and its fitness function
- **Status:** open-by-decision
- **Discharge condition:** the golden suite has bedded in, and the installer no longer needs `packages/core/assets/manifest.json`'s hashes to spot drift (SPEC, out of scope).
`packages/core/assets/manifest.json` and `acd-bundle-manifest-hashes` still hold hashes for 187 rendered files in one configuration, beside the golden baselines that now cover the same files.
