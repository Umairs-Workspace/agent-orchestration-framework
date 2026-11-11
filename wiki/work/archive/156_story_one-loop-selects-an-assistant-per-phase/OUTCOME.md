# 156 · One loop selects an assistant per phase — Outcome

## Delivered

### Model-only phase routing
`aof work loop` and `aof work drive` take models and efforts per phase (`--model [PHASE=]MODEL[:EFFORT]`) and infer each phase's assistant from the model; no runtime flag exists on either command.

### One pinned mixed plan per loop
A loop records one execution plan naming each phase's runtime, model and effort; refine, continue and verify run on their own assistants in one command, and review and repair inherit the continue selection.

### Recovery keeps the recorded selection
Resume, retry, lane reopen and worker handoff run each phase on its recorded assistant, model and effort, refusing conflicting flags and never rewriting a recorded failure.

### Pre-launch refusals
An unknown, ambiguous or unavailable model, an unsupported effort, or a missing/incompatible Codex asset is refused before any phase run is minted, naming the cause and remedy, with no fallback to another assistant.

### Neutral phase settings in the editor
The configuration editor saves per-phase models and efforts without assistant selectors and preserves unrelated settings.

## Assumptions

- **Admitted Codex installation** — a Codex CLI profile on the admitted list (0.160.0 or 0.162.0-alpha.2) must be on PATH or registered as the Windows desktop app.
- **Current native assets** — a project's generated Codex assets must be current (`aof work update`) before a Codex phase can launch.
