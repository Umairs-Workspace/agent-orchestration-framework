---
type: chore
number: 116
slug: the-command-layer-is-imported-upward-by-loop-record-render
title: "The Command Layer Is Imported Upward By Loop Record Render"
status: done
owner: product-owner
created: 2026-09-04
updated: 2026-09-04
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 116 · The Command Layer Is Imported Upward By Loop Record Render

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

Two shipped controls contradicted each other, which is why this was never a typo. 78/FF-7802
REQUIRES `src/loop-record-render.mjs` to import `KIND_SHAPES` from `./commands/loops-graph.mjs`;
m42 wave (d) FORBIDS any src-root module importing `src/commands/*`. Both are right, and neither
could hold while the shared glyph table sat inside the command — so the tree held a permanent red.

## Definition of Done

- [x] Move KIND_SHAPES out of src/commands/loops-graph.mjs into a module below commands/ (the m42 wave (d) cure: command-error.mjs, mesh-repo-marker.mjs, mesh-assignment.mjs), so src/loop-record-render.mjs stops importing upward and the commands/ cycle closes. Then acd-command-layer-imports-downward is green again on both of its claims.
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "The command layer is imported upward by loop-record-render" (`src/loop-record-render.mjs:20`)
- **Raised reviewing:** `96/04`, review round 1
- **Promotion key:** `finding:96/04:the command layer is imported upward by loop-record-render`

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->

- **Closed at 96's milestone gate, 2026-09-04.** Cured m42 wave (d)'s own way: the table moved DOWN
  into `src/loop-graph-shapes.mjs`, `commands/loops-graph.mjs` re-exports it so no existing importer
  breaks, and FF-7802 is repointed at the new home with both of its claims intact. 52/FF-5208 is
  untouched — it pins the RENDERED Mermaid bytes, not that module's source. The upward import and
  the `commands/loop-record.mjs → loop-record-render.mjs → commands/loops-graph.mjs` cycle are both
  gone. See 96 `VERIFICATION.md` F-96-E and `RETROSPECTIVE.md` R3.
