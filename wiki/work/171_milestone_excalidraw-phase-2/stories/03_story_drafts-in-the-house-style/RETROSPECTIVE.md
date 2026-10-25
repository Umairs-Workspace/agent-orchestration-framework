---
doc: retrospective
promotionFrom: 1
---
# 03 · Drafts in the house style — retrospective

## R1 · The review prompt has more copies than the asset

**Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** control:71/FF-7106

**What happened:** Editing `packages/core/assets/commands/diagram-review.md` left the Codex render
unchanged: the prompt's body also lives verbatim in `packages/core/assets/variants/codex/workflow.md`,
and `aof work update` refused the hand-edited render. At the gate, FF-7106 then found the story
declared the asset without two of its tracked renders.

**Why:** A bundle member is one source with several tracked renders and, for Codex, a second copy;
the story's write set named only the files it meant to change.

**Lesson:** A story that edits a bundle member lists the manifest, the variant copies and every
tracked render in `files:`, and lets `aof work update` re-render rather than editing a render.

**Refs:** STATE `## Feedback (for retro)` (171/03); `REGRESSION.md` row at 9b5d01c1.
