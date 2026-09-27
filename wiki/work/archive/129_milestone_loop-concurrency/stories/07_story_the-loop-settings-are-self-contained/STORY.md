---
type: story
number: 07
slug: the-loop-settings-are-self-contained
title: "The loop's settings are self-contained — work.loop.dispatch and work.loop.agents.<phase> beside the mode, each falling back to its workspace twin"
parent: 129
depends: [5]
status: done
owner: product-owner
created: 2026-09-15
updated: 2026-09-15
adrs: [ADR-001, ADR-006]
reads:
  - wiki/work/129_milestone_loop-concurrency/SPEC.md
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-001
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md#ADR-006
  - wiki/work/129_milestone_loop-concurrency/VERIFICATION.md
  - src/loop-bounds.mjs
  - src/work/dispatch.mjs
  - src/commands/dispatch.mjs
  - src/commands/drive.mjs
  - src/commands/loop.mjs
  - src/loop/wave.mjs
  - src/loop-record.mjs
  - src/work-audit/declared-bounds.mjs
  - src/bundle/commands/refine.md
  - src/bundle/commands/continue.md
  - src/bundle/commands/autonomous.md
  - test/loop/loop-bounds.test.mjs
  - test/arch/loop/acd-loop-cap-single-home.test.mjs
  - test/arch/loop/acd-loop-concurrency-single-home.test.mjs
  - test/arch/command/acd-prompt-bounds-name-their-home.test.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/work/lifecycle/work-dispatch-lanes.test.mjs
  - test/loop/loop-command-wave.test.mjs
files:
  - src/loop-bounds.mjs
  - src/commands/dispatch.mjs
  - src/commands/drive.mjs
  - src/commands/loop.mjs
  - src/loop/wave.mjs
  - src/bundle/commands/refine.md
  - src/bundle/commands/continue.md
  - src/bundle/commands/autonomous.md
  - .claude/commands/aof/refine.md
  - .claude/commands/aof/continue.md
  - .claude/commands/aof/autonomous.md
  - .codex/skills/aof-refine/SKILL.md
  - .codex/skills/aof-continue/SKILL.md
  - .codex/skills/aof-autonomous/SKILL.md
  - .opencode/commands/aof/refine.md
  - .opencode/commands/aof/continue.md
  - .opencode/commands/aof/autonomous.md
  - src/bundle/manifest.json
  - .aof/aof.lock.json
  - test/loop/loop-bounds.test.mjs
  - test/arch/loop/acd-loop-cap-single-home.test.mjs
  - test/arch/loop/acd-loop-concurrency-single-home.test.mjs
  - test/arch/command/acd-prompt-bounds-name-their-home.test.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/loop/drive-command-phase-drivers.test.mjs
  - test/work/lifecycle/work-dispatch-lanes.test.mjs
  - test/loop/loop-command-wave.test.mjs
  - test/arch/assignment/acd-dispatch-bound-single-home.test.mjs
  - wiki/work/129_milestone_loop-concurrency/ARCHITECTURE.md
schema: 1
aofVersion: 0.1.0
---
# 07 · The loop's settings are self-contained

## User story

As **the operator who configures a repository's loop**,
I want **every setting the loop honours to live under `work.loop` — the mode beside a
`dispatch.concurrency` that bounds the loop's own lanes and an `agents.<phase>.mode` per driven
phase (`refine`, `continue`), each falling back to its workspace twin (`work.dispatch.concurrency`,
`work.agents.mode`) when unset**,
so that **the loop's refine and continue phases can run in different role modes, the loop can run
fewer lanes than the machine's slot bound, and an unset key means today's behaviour byte for byte
— read from one place, `.aof/aof.config.json`, with no flag**.

What lands: three keys in the bounds home (`src/loop-bounds.mjs`; twelve keys, appended after
`work.loop.concurrency` in the order `dispatch.concurrency`, `agents.refine.mode`,
`agents.continue.mode`), each resolving its member VERBATIM and `null` for anything else — `null`
is "inherit"; `work:dispatch` gains a `bound` input that can only NARROW the pool's bound
(`min(caller, pool)`), the loop passes its resolved key when set and nothing when unset, and the
answer's `bound` is the effective one; `aof work drive refine|continue <ref>` composes `--solo` /
`--orchestrated` from `work.loop.agents.<phase>.mode` when set and nothing when unset (`verify`
never carries one); `refine.md` and `continue.md` parse `--orchestrated` as `--solo`'s twin;
`autonomous.md` names the three keys and their fallbacks; the renders, the manifest and the lock
regenerate; ADR-001 §5 and ADR-006 carry dated amendments; FF-6901's annexation leg, FF-12901's
two legs and FF-7101's key regex admit the shape with a self-check each.

## Tasks

- [x] `tasks/00_the-three-keys-join-the-home.feature` — the twelve keys in both maps, each resolver's verbatim-or-null answer, the range probe, and the three standing controls re-pointed with a self-check
- [x] `tasks/01_the-lane-bound-narrows.feature` — `work:dispatch { bound }` narrows the pool's bound and answers the effective one; the loop passes its key when set, nothing when unset; the wave narrates and records the effective bound
- [x] `tasks/02_the-drive-carries-the-phase-mode.feature` — the phase drive composes the flag from the loop key; `--orchestrated` joins the two prompts as `--solo`'s twin; the autonomous prompt names the surface; renders, manifest and lock agree

## Notes

- Raised at the `129` accept by the operator (2026-09-14): "the settings need to be
  self-contained … I want refine and continue to be independent … if `work.agents` / `work.dispatch`
  is undefined then fall back to the workspace settings". The shape was agreed 2026-09-15
  (`STATE.md`); `129/06`'s live run is re-pointed to depend on this story so it exercises the
  final surface.
- Byte-identical when unset is the contract, exactly as `sequential` is for the mode: no flag is
  appended, no `bound` is passed, no prompt text changes for a repository that sets none of the
  three keys. The fallback to the workspace twin is realised by the CONSUMER that already reads
  the twin — `work:dispatch`'s one resolution site for the pool bound, the command prompts for
  `work.agents.mode` — never by the bounds home reading a non-`work.loop.*` key (69/ADR-001).
- The loop family spells none of the three keys: it reads them through the home's resolvers, so
  FF-12901's family sweep and ADR-006's invariant ("the family never reads `work.dispatch.concurrency`")
  hold unchanged; the home's own read of `work.loop.dispatch.concurrency` is the one FF-6901 and
  FF-12901 leg 2 now distinguish from the pool's.
- A `bound` a caller passes can only narrow; a caller-supplied bound above the pool's is the pool's.
  The slot bound stays the one number for the machine (ADR-006's reason survives the amendment).
- Solo build, three lenses inline; the suites are run as `--only` sets (the story's `files:` widen
  `--scope impacted` to the whole tree, which binds `:4182` here).
- **Build delta (2026-09-15), for the review close to ratify:** a FOURTH standing control scans the
  `dispatch.concurrency` substring — 65's `acd-dispatch-bound-single-home` (whose `boundSiteOffenders`
  FF-6907 reuses) named the bounds home a second site of the pool key. It is re-pointed the same way
  as FF-6901 (the loop key's own forms erased before the pool pattern is asked; a self-check plants
  both), and the file joins `files:` — task 00's "three standing controls" is four.
