# 145 · A milestone's loop plan can be drawn — build plan

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## Mechanism

**The plan lives in the wave home.** `ready-wave.mjs` gains `planLoopWaves(workDir, milestoneRef,
{ projectRoot, bound, view })` beside `partitionReadySetByDeclaredFiles`. It does not get a new
file, because `packages/work/src` is at its exact ceiling. The replay:

1. List the items once. Build a `view` of those items plus a `meta` overlay: the driver
   `{ status: "in-progress", depends: [] }`, and every story of it `{ status: "not-started" }`.
2. Loop: `nextWork(workDir, ref, { view, throughReview: true })`. Partition its `readySet`, and
   record the wave (`waitsForLane` on members at index ≥ bound) and the held set with reasons.
   Overlay the wave members `{ status: "in-review" }` and ask again. Stop when the `readySet` is
   empty. Guard against a wave that adds nothing (a cycle), so the replay always terminates.
3. Mark `built` from each story's REAL status (in-review or done). Collect `depends:` edges among
   the milestone's stories, and add the fixed `assumption` string.

**Held reasons.** The partition records why at each `heldSet.push`: `files-overlap` with the
occupying refs, `write-set-unknown`, or `after-unknown`. It returns them under a new key, for
example `heldReasons`. `withReadyWave` in `commands/next.mjs` destructures only `wave` and
`heldSet`, so `work:next` output does not change.

**The paths.** They live in `diagrams/layout.mjs`: `EXECUTION_DIR` and
`loopDiagramPaths(itemDir, sourceExt, formats)` →
`{ dir, plan, source, svg?, png? }`. Same forward-slash, project-relative rules as
`diagramPaths`.

**The doors.** `plan.mjs` and `export.mjs` branch when the second positional is exactly `loop`,
right after the ref resolves. Everything else falls through to the delivered ADR path unchanged.
`input.adr` stays as is, and `loop` is the one admitted non-ADR value.
- Plan follows the check order in task 01. The refined test is the loop's own: every not-done
  story has at least one task. Read tasks the way `work:tasks` does.
- Export reuses the ADR path's `generator.toSvg` → write SVG → `findBrowser` →
  `rasterizeSvg`. Factor that shared tail into one local function, so the ADR and loop branches
  call it rather than repeat it.
- The core bindings inject the planner and `loopLaneBound(workspace)`, which is
  `narrowDispatchBound(dispatchConcurrencyFromConfig(ws), loopDispatchConcurrencyFromConfig(ws))`,
  plus `loopConcurrencyFromConfig`. In `assemble.mjs`, `workDispatch` is built AFTER
  `commandsDiagramPlan` today, so move the plan's assembly below it.

**The brief** is text built from the plan: one line per wave with its members, built ones
flagged, then the held members with reasons, the edges, the bound and the assumption. Ask for
columns per wave, left to right, built stories shaded, and held/waiting members visibly distinct.

**The bundle command** follows `observe.md`'s shape: `argument-hint: "<milestone ref>"` and
`allowed-tools: [Read, Write, Bash]`. Plan → stop or draw → export → report. It must never spell
the generator's name.

## Verification step

With `AOF_GLOBAL_HOME` and `CLAUDE_CONFIG_DIR` in fresh temp directories, run the declared
test files through `--only`, plus the diagram and arch-diagram indexes and every importer of the
changed modules. Then install the payload
and run `aof diagram plan 135 loop --json` from the repository root. 135's stories 01–05 must land
in waves consistent with their `depends:` and `files:`, all of them shaded built. A plan that puts
135/04 beside 135/01 is wrong: 04 `depends: [01, 02]`.

## Out of scope

- A range scope (`129-131`): 145 Q2, one item per run for now.
- A headless or `claude -p` drawing path: the operator ruled the session draws.
- Showing the diagram on the board: `execution/` is not in the artifact manifest (FF-13305), and
  this is a debugging aid.

## Known traps

- `nextWork` skips a driver whose status is `done`, and blocks one with unmet `depends:`. That is
  why the overlay on the driver is required for E10 and the milestone-depends scenario.
- A story with no `files:` held in the first wave makes every later story `after-unknown` in that
  wave only. The next wave partitions afresh, so do not carry the "unknown" flag across waves.
