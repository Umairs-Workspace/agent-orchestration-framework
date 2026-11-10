# 143 · The loop starts from the backlog, refines a whole item in one pass, and runs each phase on the model the operator chose — Outcome

## Delivered

### One loop command from backlog idea to built work, on the operator's models
`aof work loop <backlog-slug> --refine whole-item --model refine=opus:xhigh --model verify=fable:high` promotes the item, breaks it down and authors every contract in one refine session, then builds. Each phase's session runs on its own model and effort, and each run's declaration says which and from where. The parts are 143/00 (promotion), 143/01 (whole-item refine), 143/02 (the grammar) and 143/03 (the per-phase lend and record).

### The loop's run choices survive a resume together
The declaration a resume reads carries the scope's origin (`promotedFrom`), the refine scope (`refine`) and the per-phase sessions (`sessions`). `aof work loop <NN> --resume` therefore continues a promoted item at its number, in the same refine mode, on the same flag choices, with no operator input.

## Assumptions

- **The session is the only thing a model flag reaches** — `--model` sets the session aof spawns per phase. The subagents that session spawns resolve their models from `work.agents.models`, which no flag overrides (ADR-003 §7).
- **The model is passed as named** — the loop hands the model string to the session launch as given. Whether the runtime accepts it is the runtime's answer.
