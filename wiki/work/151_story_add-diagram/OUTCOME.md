# 151 · aof:add-diagram draws the architecture diagrams a refine left undrawn — Outcome

## Delivered

### `/aof:add-diagram` draws an item's undrawn ADR diagrams after refine
`/aof:add-diagram <ref> [ADR-NNN]` ships for Claude, Codex and OpenCode. With no ADR named, it lists every ADR whose `### Diagram` brief has no `diagrams/` link and draws each in turn. With an ADR named, it draws that one only, first writing its brief from the ADR's own text when it has none and the item is not done. An item with nothing undrawn gets "nothing to draw" and no file changes.

### It reuses refine's diagram step unchanged
Each ADR goes through `aof diagram plan` → the plan's `instructions` → `aof diagram export` → the session pastes the returned `block` under the brief. `enabled: false`, `available: false`, `diagram-item-delivered` and a PNG miss keep the meanings they have in refine. There is no new CLI verb, and refine is unchanged.

## Assumptions

- **The session pastes the block** — aof never edits `ARCHITECTURE.md`. A paste that misses leaves the exported files orphaned, and only `aof work doctor`'s `diagram-orphan` reports it (RETROSPECTIVE R3).
