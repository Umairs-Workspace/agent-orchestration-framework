# 129/01 · The mode and the engine decide — Outcome

## Delivered

### `work.loop.concurrency` resolves in the bounds home as a mode
`src/loop-bounds.mjs` exports `LOOP_CONCURRENCY_MODES` (frozen `["sequential", "refine_first"]`), `DEFAULT_LOOP_CONCURRENCY` (`"sequential"`), `resolveLoopConcurrency` (a member verbatim, anything else the default, never a throw) and `loopConcurrencyFromConfig`; the key is the ninth member of BOTH `LOOP_BOUND_CONFIG_RESOLVERS` and `LOOP_BOUND_VALUE_RESOLVERS`, `rangeProbe` admits exactly the two modes, `stepProbe` refuses every step on it as `outside-declared-range`, and `loopBoundsFromConfig` is unchanged at eight keys.

### A loop record citing the mode as a ceiling carries a bound with no number
`configBound` in `src/loop-record.mjs` passes every resolver answer through `positiveIntegerOrNull`, so `ceiling: [config:work.loop.concurrency]` loads without a `loop-ceiling*` finding and projects `state: "bounded"`, `bound: null`, `comparison: null`.

### The engine routes an `in-review` story to the gate on status
`decideLoopPhase` reads `next.status` verbatim; an `in-review` story with tasks answers `{ act: "gate", ref, command: "work:validate" }` whatever `lastPhase`, `cycle` or the UAT count say, a story with no tasks still refines, a supplied `gate` still routes on its findings, and every other status decides exactly as before.

### Under `refine_first` the engine names the refine phase from two additive inputs
`concurrency` and `unrefined` ride `decideLoopPhase` and `decideLoop` unchanged in key set; under `"refine_first"` a non-empty `unrefined` answers `drive refine <unrefined[0]>` at cycle 1 ahead of every head state and type, any other `concurrency` ignores `unrefined`, a malformed `unrefined` is empty, and a through-review `{ state: "done" }` stays `{ act: "done" }`.

### The wave decision is pure and bound-free
`decideWave({ wave, heldSet, live, setAside })` in `src/work/loop.mjs` answers a frozen `{ dispatch, hold }` — the wave in its own order minus live minus set-aside, the held set minus live — reading members as refs or `{ ref }` objects and memories as arrays or `Set`s, with no bound input, no configuration read, no mutation, and `null` for any malformed wave, held set or memory.

### Three lane stops are the closed stop set's last three members
`LOOP_STOPS` is fifteen members, ending `lane-open-failed`, `lane-merge-refused`, `lane-merge-conflict`; `LOOP_REFUSALS` is unchanged at six; `acd-loop-probe-contract`'s literal and every other `LOOP_STOPS` pin (`FF-6306`, `FF-12404` leg 5, `63/03`) name the same fifteen. `src/work/loop.mjs` still imports nothing.

## Assumptions

- **The shell honours a fresh `gate` act** — the routing capability delivers a re-drive-free restart only once `src/commands/loop.mjs` runs validate + doctor + the recorded grade on a fresh `gate`; until then it halts `unmapped-item-type` / `unexpected-engine-act` on that answer (fail-loud).
- **The shell supplies `concurrency` and `unrefined`** — the refine-phase decision is reached only when `nextDecision` passes the resolved mode and the in-scope unrefined refs (in stream order, minus the walk's set-aside); neither is passed today.
- **`wave` and `heldSet` are read off a `work:next --through-review` answer** — the wave decision assumes a disjoint partition and does not dedupe or reconcile the two lists.

## Gaps

### The shell's admission of a fresh `gate` act
- **Status:** open
- **Discharge condition:** `129/04` lands the handler in `src/commands/loop.mjs` that runs validate + doctor, reads the recorded grade, and crosses to `verify` on clean or re-drives `continue` on findings.
The engine answers `gate` for an `in-review` story with tasks under every mode; no shell path yet consumes that answer from a fresh decision, so a loop whose head is such a story halts.

### Producers of `concurrency` and `unrefined`
- **Status:** open
- **Discharge condition:** `129/04`'s `nextDecision` passes `loopConcurrencyFromConfig(workspace)` and the computed `unrefined` (minus set-aside) into `decideLoop`.
Two additive engine inputs exist with no caller supplying them; `sequential` behaviour is byte-identical without them.

### Producers of the three lane stops
- **Status:** open
- **Discharge condition:** `129/04`'s wave tick halts `lane-open-failed` (dispatch `at-capacity` with no live lane of this loop), `lane-merge-refused` and `lane-merge-conflict` with lane / branch / base / tip / files in `reportLine`'s details.
Three stop ids are members of the closed set and are pinned by every literal; no `halt(...)` in `src/` emits them yet.
