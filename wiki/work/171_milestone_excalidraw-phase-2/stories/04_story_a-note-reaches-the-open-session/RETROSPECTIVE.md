---
doc: retrospective
promotionFrom: 1
---
# 04 · A note reaches the open session — retrospective

## R1 · The control had no room for its seam, and refine named only the freeze

**Kind:** misunderstanding · **Area:** code · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** `TerminalControl.tsx` sat at its 840-line ratchet with zero headroom, which refine
did not see; the later-input seam was paid for by extracting the command's typing into
`input-policy.mjs`. That extraction is where F-171-01 later had to be fixed — the readiness and the
paste rule the dock lacked.

**Why:** Refine checked the FF-5307 freeze but not the file's line ratchet, and treated "type into the
session" as new behaviour rather than as the session driver's existing rule.

**Lesson:** Refine reads a file's ratchets as well as its freezes, and a story that types into a live
TUI cites the driver's typing rule as a `reads:` entry.

**Refs:** STATE `## Feedback (for retro)` (171/04); VERIFICATION `@finding-F-171-01`; 171/R1.
