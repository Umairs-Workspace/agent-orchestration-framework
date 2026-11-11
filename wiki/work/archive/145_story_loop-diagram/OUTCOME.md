# 145 · A milestone's loop plan can be drawn — Outcome

## Delivered

### The loop's wave plan, replayed
`planLoopWaves` in `packages/work/src/ready-wave.mjs` replays a milestone through `nextWork`
(`throughReview`) and `partitionReadySetByDeclaredFiles`. The result is waves with members, held
members and their reasons (`files-overlap`, `write-set-unknown`, `after-unknown`), `depends:` edges,
the lane bound, `waitsForLane` marks, built flags from each story's real status, and one stated
assumption.

### `aof diagram plan <ref> loop`
The command writes `execution/loop-plan.json` for a refined milestone under
`work.loop.concurrency: refine_first` and answers the diagram engine's drawing instructions. It
refuses with `loop-not-a-milestone`, `loop-not-refine-first` or `loop-not-refined`, writing nothing.

### `aof diagram export <ref> loop`
The command writes `execution/loop.png` from the drawn `execution/loop.html` through the generator's
`toSvg` and the rasterizer, and keeps no SVG.

### `/aof:loop-diagram`
A bundle command (claude, codex, opencode) that plans, stops on any refusal, draws `loop.html` in the
operator's session through the engine's skill, then exports. Built stories are drawn in the diagram
style guide's green `done` role.

## Assumptions

- **Waves are the order only if every lane in a wave finishes together** — the live loop asks again
  as each lane finishes, and the plan states this in its `assumption` field.
- **A browser is findable for the PNG** — without one, the export writes nothing and exits non-zero,
  and `loop.html` is the only picture.

## Gaps

### The loop diagram on the board
- **Status:** open
- **Discharge condition:** the board shows an item's `execution/loop.html` or `loop.png`
`execution/` is not in the artifact manifest (FF-13305), so the diagram is reachable on disk only.

### A range scope
- **Status:** open
- **Discharge condition:** `aof diagram plan` accepts a range like `129-131` and plans stories from
  different milestones into shared waves
One milestone is planned per run (145 Q2).
