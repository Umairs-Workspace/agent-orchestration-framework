# 198/00 · A practice's fragment can name the runtimes it is for — Outcome

## Delivered

### Runtime-scoped fragments
A fragment may declare `runtimes` (a non-empty list of capability-matrix names), and the bundle loader refuses an unknown name, an empty list, a body for a runtime the list does not name, and a missing body for a named runtime whose text carries the slot.

### Per-runtime composition of a common text
A common source is composed once per runtime, so a scoped fragment's body appears only in the renders of the runtimes it names, and with no scoped fragment on every render is byte-identical to the unscoped composition (FF-19801, FF-19802).

- **The delegation rewrite follows the per-runtime bodies** — `applyDelegationModelToResources` rewrites each runtime's `commonBodies` as well as `body`, so a non-default delegation model reaches Claude's and OpenCode's renders of a scoped text.

### Where a scoped practice lands, said by the list and the doctor
The practice list names the runtimes a scoped practice reaches, and `aof work doctor` reports `practice-no-effect` once when a practice is on but reaches none of the project's installed runtimes, and never for an unscoped practice.

### The authoring reference
`wiki/reference/practice-prose.md` states how to scope a fragment to its runtimes, within its 150-line cap.
