# 165/02 · The pinned planner is packaged for Cowork — Outcome

## Delivered

### Planner packages from the recorded commit only
`packagePlanner({ sha })` packages pm-skills only from a tree whose `HEAD` equals the 40-hex sha, cloned over HTTPS at `MARKETPLACE_REF` with `core.autocrlf=false` and `core.eol=lf`, and refuses any other tree with a named reason (FF-16504).

### A standalone package per recommended plugin
Each recommended plugin (with the optional pm-market-research on request) is its own file map carrying the repository's root `LICENSE`, and `pm-ai-shipping` is never packaged.

### No clone left behind
The live clone goes to a temporary directory that is always removed, and a caller-injected tree is never removed.

## Assumptions

- **`git` is on PATH** — the live path spawns `git` with no shell, and has no other way to clone.
