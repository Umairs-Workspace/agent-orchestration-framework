# 05 · The architect draws — Outcome

## Delivered

### One diagram step in the architect's ADR rule and refine's Decide stage
`aof-architect` and `aof:refine` each carry one passage, inside the ADR authoring they already describe. The architect judges whether an ADR needs a diagram and writes its `### Diagram` brief, then runs `aof diagram plan` and follows the answer (off, missing, or the instructions), then `aof diagram export` and pastes the block. In solo mode the main session runs the step itself.

### The prose never names the generator
No bundle document names `diagram-design`. Every rendered copy (`.claude`, `.codex`, `.opencode`) matches a fresh render, and the architect's tools are not widened to draw.
