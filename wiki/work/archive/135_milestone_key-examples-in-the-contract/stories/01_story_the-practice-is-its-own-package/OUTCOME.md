# 01 · The practice is its own package — Outcome

## Delivered

### Specification by example lives in `@aof/specification-by-example`
The example map grammar (`map`), the answer reader (`answers`), the examples doctor lane (`doctor-lane`), the continue door's check (`build-door`) and the story probe (`story-probe`) are the package's five exports. It depends on `@aof/contracts` and `@aof/work` alone, and core composes it into the work stream when `work.examples.enabled` is on.

### `@aof/work` offers seams that never name the practice
`createWorkDoctor` takes a `storyProbe`, `budgetRows` and `extensionGroups`, and `createPhaseDoorCommands` takes a `beforeBuild` list of checks run at the continue door. No `@aof/work` source imports the package, lists it in its manifest or spells `EXAMPLES.md` (FF-13501).

## Assumptions

- **The switch, the refusal code and every doctor code are unchanged** — every 134 suite passes from the package with only its imports moved.
