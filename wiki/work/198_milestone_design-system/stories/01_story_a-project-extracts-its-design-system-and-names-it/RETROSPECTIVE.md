---
doc: retrospective
---
# 198/01 · A Claude project extracts its design system and names it in config — Retrospective

## R1 · The fixtures assumed shapes the real type and real projects did not have

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** operator · **Promoted to:** none

- **What happened:** the first live extract (ai-workforce) failed twice: `type.families` was written as a list where the type keeps a map (F-02), and tokens were placed by Tailwind's name prefixes alone (F-03).
- **Why:** the fixtures were written from the ADRs' reading of the type, not from a real `tokens.json` or a real project's CSS.
- **Lesson:** build a verb's fixtures from a real artifact of the type (its own sample tokens) and from one real project's stylesheet before calling it done.
- **Refs:** VERIFICATION F-02, F-03.

## R2 · The command's conversation was a fixed menu for one situation

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** operator · **Promoted to:** none

- **What happened:** extract assumed a fresh project. On the portal it deleted and rebuilt systems on questions (F-04); on scattered canvases it had no way to consume them (F-06).
- **Why:** refine wrote the examples from AOF's own case only; the operator's other projects, with existing systems and canvases, were never put to the contract.
- **Lesson:** refine an operator-facing command against the operator's real projects' state, and ask in plain words what they want to end up with rather than offering a fixed menu.
- **Refs:** VERIFICATION F-04, F-06.
