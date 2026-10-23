# 169/02 · The Hyperagent package lives in the aof home — Outcome

## Delivered

### The Hyperagent planner package
`aof work integrations hyperagent package [--dry-run]` writes `AGENT.md` and the seven `skills/aof-*/SKILL.md` to `<aof home>/hyperagent/` (`~/.aof`, or `AOF_GLOBAL_HOME`). The files are byte-identical to the package's own. It owns that directory whole, writes nothing in the project, records no lock entry, needs no `work.integrations` block, and prints the upload steps without claiming an upload.
- **The planner files are read through the package's asset class** — the reader core injects resolves them in dev and payload installs (the package's `assets/`) and in a packaged binary (the sidecar's `bundle/packages/integration-hyperagent/`).

### A project renders `/aof:hyperplan` alone
With `work.integrations.hyperagent` present, `aof work init|update` renders `/aof:hyperplan` (Claude and OpenCode command, Codex skill) and nothing under `.hyperagent/`. A lock that recorded the earlier `.hyperagent/` render loses those files on the next update.

### The doctor reads the package where the verb writes it
`aof work integrations hyperagent doctor` reports the planner package as `missing`, `stale` (it differs from the installed aof's files) or `current`. When it is not current, a hint names the `package` verb. "ready" requires `current`.

### The fragment declares what core never renders
Hyperagent's `assets/bundle.json` carries `packageFiles`, the eight files its own verb ships, beside its one member `hyperplan`. The bundle-membership control counts them as declared.
