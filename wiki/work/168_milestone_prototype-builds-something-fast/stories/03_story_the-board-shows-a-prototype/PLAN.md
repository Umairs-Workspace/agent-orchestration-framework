# 03 · The board shows a prototype — build plan

## Mechanism

**One mapping, in the model.** `model.ts` gains `laneFor(item)`: a prototype's four words map to
`in-progress`, `not-started`, `done`, `done`; every other item answers its own status, so the
governed cards are untouched. `deriveBoard` adds `prototype` to the `otherDrivers` filter, and
`bucket` in `BoardLanes.tsx` places by `laneFor(item)` instead of reading `item.status`
directly. The tag is `d.type` for spike and chore and `prototype · <status>` for a prototype,
built in the model beside `laneFor` so the lane and the tag cannot disagree.

`WorkItem.type` admits `prototype`; `WorkStatus` widens to the four prototype words on the wire
type only. The milestone tallies already filter on `type === "story"` under a milestone and
`activeMilestones`/`blockedGates` filter milestones and uat, so they need no change — E6/E7
pin that, not new code.

**The detail panel.** `DocName` gains `PROTOTYPE` and `STATE`; `firstDocTab("prototype")`
answers `PROTOTYPE`; `tabsFor` returns `["PROTOTYPE", "STATE"]` for a prototype (no RUNS — the
verb mints no run record). On the server side the only change is one entry,
`{ name: "PROTOTYPE", file: "PROTOTYPE.md" }`, in the artifact set; `work:doc` and the derived
`WORK_ITEM_DOC_FILES` pick it up, and the manifest suite's seed count is derived from the set.

## Verification step

Run the board over an isolated tree holding milestone 168 and prototypes at each of the four
statuses (`aof mesh ui` is the operator's; in a test, the board app harness). Every prototype
card shows, in the lane above, tagged with its own word; the active-milestone count is the
milestone's alone. Open the `paused` card: the panel shows the prototype's Intent, and the
STATE tab its hand-off. A card missing from every lane means `bucket` still reads the raw status.
Then `yarn ui:build`.

## Out of scope

- A prototype lane or a new component — ADR-007 rejected both.
- Prototype diagrams on the board — `diagramFile` keeps its ADR stem grammar (ADR-006 §5).
- Fleet or mesh rows for a prototype — a prototype is never dispatched.
- The SPEC tab spike and chore cards open on today — a separate gap, not this story's.
