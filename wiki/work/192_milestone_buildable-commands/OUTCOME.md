# 192 · Commands are built at render from a core body and the fragments of the practices a project has turned on — Outcome

## Delivered

### A practice is an extension of the rendered commands, from its own package
A practice package adds prose to a command or role brief, replaces a template, and names the keys that turn it on, all through its own `assets/bundle.json`, with no edit to core's sources (m192/00, m192/01).

### What a project is given follows its own config, and it is told when the two disagree
A project's rendered commands, briefs and templates hold the prose of exactly the practices its `.aof/aof.config.json` turns on; `aof work update` lists every practice it could turn on, and `aof work doctor` reports a key changed since the last render (m192/02, m192/03).

### The refine command is shorter where a practice is off
With neither discovery nor the build brief on, the rendered refine command is 104 lines shorter than with both on, and holds no sentence about the example map or the build plan.

## Assumptions

- **Fragments come from aof's own packages** — the practices registry in `packages/core/src/practices.mjs` is the only way a fragment is contributed; no project or third party supplies one.
- **A committed render is refreshed by `aof work update`** — a project that changes a key and does not update keeps its old commands, and only the doctor says so.

## Gaps

### Gated prose in `continue.md` and `verify.md`
- **Status:** open-by-decision
- **Discharge condition:** a milestone measures the gated share of those commands and moves it to fragments, as 192/02 did for refine and the role briefs.
`continue.md` and `verify.md` still carry practice prose that only some projects use; the SPEC left them out of the first move.

### A fragment contributed by an integration is gated by its practice's keys alone
- **Status:** open-by-decision
- **Discharge condition:** the first integration package that ships a fragment, at whose refine the fragment's gate is also tied to `work.integrations.<id>`.
No integration ships a fragment today, so a fragment's render does not ask whether its integration is enabled (STATE, 192/00 review close).

### The practice list fits a 120-column terminal
- **Status:** open
- **Discharge condition:** `backlog/chore_practice-list-fits-the-terminal` is done.
Carried by m192/03's own outcome (F-04); listed here so the milestone's open gaps are in one place.
