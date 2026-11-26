---
doc: retrospective
promotionFrom: 1
---
# 04 · A node checks board access in its own daemon environment — retrospective

## R1 · A preflight probe that reaches the network had no time limit

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** reviewer · **Promoted to:** none

**What happened:** The preflight ran `aof work board-access` with no bound, so a hung sign-in or board read would have stalled `mesh desktop run`. Review round one found it, and the probe now ends at 60 seconds and reports that.

**Why:** The check was modelled on the local preflight checks, which do not wait on a provider.

**Lesson:** Bound every preflight step that waits on a sign-in or a remote read, and give the bound its own reported outcome and case.

**Refs:** STATE `## Feedback (for retro)` (209/04 review round one, Important).

## R2 · The run was minted with no session id

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The 209/04 run first minted with `sessionId: null`, because the live store had expired. It was cancelled and re-minted with `--session`, so `aof work observe` could attribute it.

**Why:** The mint fell back silently when the store could not name the session.

**Lesson:** Check the minted run's `sessionId` before building on it, and re-mint with `--session <id>` when it is null.

**Refs:** STATE `## Feedback (for retro)` (209/04 run).
