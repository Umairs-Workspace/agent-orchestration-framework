# 03 · Promotion, insertion and moves preserve the work stream — Outcome

## Delivered

### Identity-changing verbs are operations on the selected store
Promotion, insertion, archive, renumber, prototype creation, folder migration, upgrade, and the promotion of a finding or gap to a chore each send one semantic operation to the store. The file adapter plans and applies the move, including the document home, its evidence and dependency rewrites, with the same results and refusals as before.

### The application still owns locks and events
Item locks are taken before the store applies a placement, and a refused lock never reaches the store. Journal events and effects keep their order. A renumber preview is the store's own plan and neither applies nor locks.

### Read commands do not load the move engines
The archive and renumber engines are imported only when a mutation is requested, so `aof work find` evaluates 763 modules.
