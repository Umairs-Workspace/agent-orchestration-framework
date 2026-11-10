# 165/01 · The planning skills render as a Cowork plugin — Outcome

## Delivered

### The aof Cowork plugin
`renderPlanningPlugin()` returns the `aof` plugin's file map: `.claude-plugin/plugin.json` plus `skills/shatter/SKILL.md` and `skills/explain/SKILL.md`, each the one cowork preamble followed by its command's body unchanged (FF-16502), and refine is not shipped.

### One command-to-skill mapping for codex and cowork
`commandAsSkill` takes each runtime's preamble from its mapping, and codex's mapped skills render byte-identically to their pre-165 output.

### Markdown-only without the CLI
A cowork skill probes for `aof`, skips each CLI step when it is absent and lists the skipped steps, and never commits.

### A reproducible package
`zipStored` turns a file map into a stored (uncompressed) zip whose bytes depend only on the map's contents, never its order, using only `node:` built-ins (FF-16503).

## Assumptions

- **Cowork accepts a stored zip named `.plugin`** — the upload format is Cowork's (RESEARCH R2), and 165/03's `@uat` is where an upload is first observed.
