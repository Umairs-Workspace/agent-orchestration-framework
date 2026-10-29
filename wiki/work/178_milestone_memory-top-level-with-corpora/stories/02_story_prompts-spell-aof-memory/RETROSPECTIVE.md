---
doc: retrospective
promotionFrom: 1
---
# 02 · Every bundle prompt, skill and doc spells aof memory — retrospective

## R1 · The refine placed a control where a frozen ceiling forbids it, and left out what a re-render writes

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** FF-17802 was declared at `test/arch/bundle/`, but FF-12405 leg 10 freezes that
directory at 23 controls, so it moved to `test/arch/memory/` at build. The regenerated
`manifest.json`, the apply journal, five drifted `.opencode` renders and ten `.agents` renders
were not in `files:` either.

**Why:** The home was chosen by subject and the ceiling was not read. The derived outputs were not
listed, because the refine counted the files it edits rather than the files the render writes.

**Lesson:** At refine, read the destination directory's budget row before you declare a control
there. For a story that re-renders the bundle, list the manifest, the journal and every tracked
render of each edited member.

**Refs:** milestone STATE `## Feedback (for retro)` (178/02's declared write set); FF-12405; FF-7106.

## R2 · A spelling change broke a control leg its own run did not select

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** `acd-work-memory-routed`'s README leg counted five `aof work memory` lines, and
02 moved the README to `aof memory`. 02's run selected the README control but not the routed
control that wraps it. The break was caught in 03's sweep.

**Why:** Lane selection follows imports, and a control that counts a spelling in a doc does not
import the doc.

**Lesson:** When a change moves a spelling, grep the controls for the old spelling and run every one
that names it, not only the controls the lane selects.

**Refs:** milestone STATE `## Feedback (for retro)` (178/02 broke a leg); 178/ADR-003.
