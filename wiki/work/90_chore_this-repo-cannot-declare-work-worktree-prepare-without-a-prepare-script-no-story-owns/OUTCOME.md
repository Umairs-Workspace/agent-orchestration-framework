# 90 · This Repo Cannot Declare Work Worktree Prepare Without A Prepare Script No Story Owns — Outcome

## Delivered

### Declared worktree preparation for this repo
`.aof/aof.config.json` declares `work.worktree.prepare` as `node scripts/prepare-worktree.mjs`
(deadline 900000 ms), so every dispatch worktree materialised here is installed by the declared step
rather than by hand, and the declaration compiles under ADR-001's no-shell rule because its program is
a real executable rather than a package-manager `.cmd` shim.
