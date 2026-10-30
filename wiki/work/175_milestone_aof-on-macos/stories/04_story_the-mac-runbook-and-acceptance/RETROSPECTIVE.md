---
doc: retrospective
promotionFrom: 1
---
# 04 · The Mac runbook and acceptance — retrospective

## R1 · The runbook was first run end to end at verify

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Promoted to:** none

**What happened:** Three blockers lived in the runbook: no `mesh.fabric`, so `mesh serve` crash-looped and the icon flashed degraded (F-03); no `aof mesh identity`, so the fleet was empty and the board refused sessions (F-10); and no `claude` CLI on the laptop (F-07). The build had measured individual steps (the plist PATH extraction, the `env -i` probe), never the whole path from clone to fleet.

**Why:** Each step was checked on its own, and the dependencies between steps only show when they run in order.

**Lesson:** A runbook story runs its setup end to end on the target machine, or in a scratch home, before verify.

**Refs:** VERIFICATION `## Findings` F-03, F-07, F-10.
