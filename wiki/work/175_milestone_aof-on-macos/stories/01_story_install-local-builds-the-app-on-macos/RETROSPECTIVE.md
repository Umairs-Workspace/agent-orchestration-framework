---
doc: retrospective
promotionFrom: 1
---
# 01 · `install-local` builds the app on macOS — retrospective

## R1 · A clean deploy worktree needed two preparations nobody had written down

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** To deploy committed code while another session held uncommitted work in the checkout, verify installed from a detached worktree. `install-local` refused the worktree's symlinked `node_modules` ("@aof/contracts escapes") until `node scripts/prepare-worktree.mjs` ran in it. A `CARGO_TARGET_DIR` pointing at the main checkout moved the cargo output away from where the installer looks for the binary, and the target dir had to be linked instead.

**Why:** The installer assumes a fully prepared tree and cargo's default target dir. Neither assumption is stated where a deployer would meet it.

**Lesson:** Deploy from a clean worktree prepared by `scripts/prepare-worktree.mjs`, with cargo's default target dir, and say so in the deploy rules when that path becomes routine.

**Refs:** VERIFICATION `### 175/01 · the bundle and the payload on a real Mac`; this session's deploys of `c0c233d9`, `04cf7a79` and `c81c3b89`.
