# 168 · A prototype builds something fast — Outcome

## Delivered

### A prototype is the lightest work item in the stream
`prototype` is a sixth top-level item type alongside the governed five. It is numbered in the same stream as milestones, spikes and chores, but it carries no stories, tasks, `.feature`, criteria, ARCHITECTURE or VERIFICATION. Nothing schedules it or waits on it, and its whole record is `PROTOTYPE.md` and `STATE.md` (m168/00).

### One verb runs a prototype end to end, in the operator's session
`aof work prototype` and `/aof:prototype` start, continue (taking a new ask), stop and complete a prototype on the current branch. No branch, worktree, subagent, review lane, commit, run record or accept door is involved (m168/01, FF-16804).

### Every stop is a checkpoint on record
The wants keep their history (additions dated, drops struck through, never deleted). Each stop, done or abandon copies the hand-off into `## Log`, so a prototype's full state at each checkpoint can be recovered without a plan written in advance (168/ADR-004 §4).

### A prototype is visible wherever governed work is
`aof work find`, `status`, `validate`, `doctor`, `aof:explain`, `aof:add-diagram` and the board all resolve a prototype. The board shows it in the existing lanes and counts it in no milestone tally (m168/00, m168/02, m168/03).

## Gaps

### Archiving a done prototype
- **Status:** open-by-decision
- **Discharge condition:** `aof work archive` accepts a prototype at `done` or `abandoned`.
A finished prototype stays in the root of the work tree; archiving was left out of scope at refine.

### Prototypes on the fleet and the mesh
- **Status:** open-by-decision
- **Discharge condition:** a fleet row or mesh dispatch that names a prototype.
A prototype is not dispatched to a worker node and has no fleet row; it is built only in the operator's own session.
