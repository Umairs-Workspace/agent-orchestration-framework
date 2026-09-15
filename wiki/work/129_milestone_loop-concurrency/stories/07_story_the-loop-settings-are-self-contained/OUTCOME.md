# 129/07 · The loop's settings are self-contained — Outcome

## Delivered

### The loop's settings live under `work.loop`, each falling back to its workspace twin
`.aof/aof.config.json` → `work.loop` carries the mode (`concurrency`), the loop's own lane bound (`dispatch.concurrency`) and the role mode of each driven phase (`agents.refine.mode`, `agents.continue.mode`); every one is read from the file and never passed as a flag, and a repository that sets none of the three new keys runs byte for byte as before — no flag composed, no `bound` passed, no prompt text changed.

### The bounds home holds twelve keys, the three new ones answering null when unset
`src/loop-bounds.mjs` exports `resolveLoopDispatchConcurrency` (a positive integer verbatim, else `null`), `resolveLoopAgentMode` (`solo` | `orchestrated` verbatim, else `null`), `LOOP_AGENT_MODES`, the config-shaped `loopDispatchConcurrencyFromConfig` / `loopAgentRefineModeFromConfig` / `loopAgentContinueModeFromConfig`, and `loopAgentModeFromConfig(workspace, phase)` over `LOOP_AGENT_MODE_RESOLVERS` (`refine`, `continue`; any other phase answers `null`). Both resolver maps carry `work.loop.dispatch.concurrency`, `work.loop.agents.refine.mode`, `work.loop.agents.continue.mode` after `work.loop.concurrency`, in that order; the range probe admits exactly the members; `loopBoundsFromConfig` (the deadline policy) is the eight of HEAD. The home reads no non-`work.loop.*` key.

### The lane bound narrows the pool's, never widens it
`work:dispatch` takes `bound` (schema `{ type: "number" }`); `narrowDispatchBound(pool, requested)` in `src/work/dispatch.mjs` answers `min(requested, pool)` for a positive integer and the pool's bound for anything else, and every face of the answer (`list`, `refs`, `ref`, `sweep`, `cleanup`) carries the EFFECTIVE bound. `work.dispatch.concurrency` stays the one number for the machine, read by `src/work/dispatch.mjs` alone. The shell (`src/commands/loop.mjs`) resolves `work.loop.dispatch.concurrency` once through the home and hands it to the wave as `bounds.laneBound`; the wave passes it as `bound` on its `--list` read and its `{ refs }` ask when it is a number, and nothing when it is `null`; the narration `Wave N — dispatching … (bound B)` and the wave run's `brief.wave.bound` carry the effective bound. Under a lane bound of 1 a two-member wave runs its lanes one at a time.

### The phase drive carries the phase's role mode; `--orchestrated` is `--solo`'s twin
`aof work drive refine|continue <ref>` composes `/aof:<phase> <ref> --solo` or `… --orchestrated` from `work.loop.agents.<phase>.mode` (`phaseCommand(phase, ref, mode)`, `PHASE_MODE_FLAGS`), and `/aof:<phase> <ref>` when the key is unset; `verify` never carries a flag; `--dry-run` shows the composed command, and the real CLI composes the same one. `refine.md` and `continue.md` parse `--orchestrated` as the override in the other direction (a solo `work.agents.mode` to orchestrated for one run), refuse the two flags together before any role runs, and name `work.loop.agents.<command>.mode` with its fallback to `work.agents.mode`; `autonomous.md` names the three keys and their workspace twins beside `work.loop.concurrency`. The nine renders, `src/bundle/manifest.json` and `.aof/aof.lock.json` agree with the source.

### The standing controls admit the shape and tell the two dispatch keys apart
FF-6901's annexation leg reds a `work?.dispatch?.concurrency` read in the home and admits `loopConfig(workspace)?.dispatch?.concurrency`; FF-12901 leg 1 pins twelve keys, leg 2 finds exactly one pool read (`src/work/dispatch.mjs`) and exactly one loop-key read (`src/loop-bounds.mjs`) and names a second reader of either, and its family sweep reads a dotted key whole; FF-7101's key regex reads `work.loop.agents.refine.mode` whole. Each carries a self-check plant.

## Assumptions

- **A lane reads the loop's settings from the config at its base commit** — a lane's workspace is loaded from the lane tree (`loadWorkspace(open.worktree)`), so `work.loop.*` reaches a lane's child drive only once `.aof/aof.config.json` is committed on the branch the lane is cut from (ADR-008 §7's precondition, unchanged).
- **The fallback to the twin is the consumer's read** — `work:dispatch` narrows the pool's bound it already resolves; the command prompts read `work.agents.mode` themselves when no flag is composed. The bounds home and the drive never read a twin.
- **A caller of `work:dispatch` other than the loop may pass `bound`** — the narrowing is a property of the verb, not of the loop; no other caller does today.

## Gaps

### A silent fallback on a mis-spelled value
- **Status:** open
- **Discharge condition:** a warning (or a doctor finding) names a `work.loop.*` value that resolves to its default/`null` because it is not a member.
`resolveLoopAgentMode("Solo")` and `resolveLoopDispatchConcurrency("2")` answer `null` and the loop runs as if the key were unset, by ADR-001 §1's range-probe design; nothing is printed. Named as a separate decision at 129/07's scoping (2026-09-15) and not taken there.
