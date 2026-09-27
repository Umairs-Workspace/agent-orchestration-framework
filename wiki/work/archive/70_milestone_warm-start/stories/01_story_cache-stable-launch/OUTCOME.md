# 01 · A launch whose prefix is shareable — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The stable-prefix flag on every production launch
`resolveInteractiveDriverLaunch` builds its argv with `--exclude-dynamic-system-prompt-sections`
beside `--append-system-prompt`, so cwd, environment info, memory paths and git status ride the first
user message instead of the cached system prompt — for both spawn callers, unconditionally.

### The append form is the only system-prompt form in `src/**`
No `--system-prompt` replacement argv is constructed anywhere in the source tree, which is the
condition under which the stable-prefix flag is not silently inert.

### A session model and effort resolved per phase and passed explicitly
`src/session-model.mjs` resolves `--model` and `--effort` from `work.agents.session`
(`{ models: { <phase>: <model> }, effort: { <phase>: <level> } }`) and `src/commands/drive.mjs` hands
them to the seam, so a phase-scoped launch's cache key is a configured decision rather than whatever
the session defaulted to.

### Two model surfaces with no join between them
The render-time role map (`work.agents.models`, milestone 30) and the session path
(`work.agents.session`) are resolved by different modules and neither reads the other's path;
`SESSION_MODEL_CONFIG_PATH` is the single literal naming the session path in `src/**`.

### Absence is silence at the launch
No `work.agents.session`, no routing entry for the phase, an unknown phase name, an empty model
string, or a `work.agents.session` that is not an object all resolve to `{}` — the launch passes
neither flag and is byte-identical to the pre-story spawn.

### The one-hour prompt-cache window held by the spawn rather than by the billing mode
The launch environment carries `ENABLE_PROMPT_CACHING_1H=1`, set **after** the IDE-attachment scrub,
so the scrub cannot delete it and the window is the same on a subscription as on usage credits.

### Per-phase routing bound to the phase-scoped caller
The local drive command carries `--model`/`--effort`; the mesh worker dispatch — assignment-scoped
and carrying no phase — carries neither, while still receiving the stable-prefix flag and the
one-hour window.

### Three declared controls in service
FF-7004 (aof never replaces the system prompt, and the append form and the flag travel together),
FF-7005 (one launch seam — no module outside it assembles a `claude` argv) and FF-7006 (the two model
surfaces resolve from distinct paths) are armed, registered in the suite, and each was observed
failing against a planted violation.

## Assumptions

- **The flag works only because aof appends** — `--exclude-dynamic-system-prompt-sections` is
  documented as ignored under `--system-prompt`, so a future migration to the replacement form would
  make the milestone's headline lever inert with no error and no observable change; FF-7004 is what
  makes that migration loud rather than silent.
- **The routable phase names are the loop's three** — `refine`, `continue`, `verify`; a config keyed
  by any other name contributes nothing to the launch.
- **The configured model and effort strings are passed through unvalidated** — the resolver checks
  only that a value is a non-empty string, so whatever is configured reaches the argv and any
  rejection happens in the spawned process.
- **The one-hour window is set for every spawn at this seam** — including the mesh worker dispatch,
  which is phase-less and therefore carries no model or effort.

## Gaps

### A misconfigured `work.agents.session` is indistinguishable from an absent one
- **Status:** open
- **Discharge condition:** a config diagnostic that names a malformed `work.agents.session`, and a
  `README.md` entry naming both model surfaces.
`aof project doctor` reports `config-valid` for `work.agents.session: "opus"` (a bare string where
the routing object belongs), and the launch then carries no `--model`/`--effort`; `README.md`
documents `work.agents.models` and never names the session path. Absence-is-silence is the resolver's
declared behaviour, so no surface an operator can see distinguishes "you configured nothing" from
"you configured it wrongly".

### ADR-005 states the rule but not the path
- **Status:** open
- **Discharge condition:** ADR-005 names `work.agents.session` in the architecture record.
The architecture record says only that the two surfaces resolve from "distinct config paths"; the
literal exists in `SESSION_MODEL_CONFIG_PATH` and in FF-7006's assertion and nowhere in
`ARCHITECTURE.md`.

### What was passed is recorded, but never compared with what was reported
- **Status:** open
- **Discharge condition:** a production path compares the model and effort passed at the spawn with
  the ones the transcript reports, and reports the divergence.
`spend.model` and `spend.effort` are still read from the transcript (`src/run-spend-ingest.mjs`), and
no module compares them against the values the launch passed. The story delivers the precondition —
the passed value is now a decision rather than a default — not the comparison ADR-005 describes as
becoming possible.

### The cache saving this launch exists to produce is not measured here
- **Status:** open
- **Discharge condition:** story 70/02 lands the per-phase `cacheRead ÷ cacheCreate` ratio and a
  measured run reports it.
Every scenario this story owns asserts what the launch carries, never what the launch costs; whether
two phases actually share a cache entry is unstated by any contract it owns.
