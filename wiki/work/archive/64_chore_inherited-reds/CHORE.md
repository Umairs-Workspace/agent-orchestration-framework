---
type: chore
number: 64
slug: inherited-reds
title: "Green the reds that arrived on main — six arch gates and two racy tests"
status: done
owner: developer
created: 2026-08-14
updated: 2026-09-02
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
# 64 · Green the reds that arrived on main — six arch gates and two racy tests

## Intent

Seven checks are red on `main` and none of them belongs to the item that found them. Four were
surfaced (and byte-proven inherited) at `aof:verify 50`, which measured `git diff main --` over every
file the gates name **and** over the gate files themselves and got an empty diff, with none of them
dirty in the worktree. Three more were surfaced the same way at `aof:verify 65`, which re-ran the
whole fitness lane with the story's change set stashed and got an identical failure set. Neither item
fixed them inside its own contract; this chore is where they get fixed.

Leaving them red has a cost beyond the count: every future verify has to re-derive "these are not
mine" from scratch, and a genuinely new red hides in a suite that is already expected to be red —
which is exactly how three of these seven survived a whole milestone unnoticed.

## Definition of Done

- [x] `acd-graphify-backend-selection` is green — `config.memory?.backend` is read in exactly one
      code location (the memory seam). Currently **7**: `commands/init-update.mjs`, `work-init.mjs`
      (×5), `work-memory.mjs`.
- [x] `acd-memory-backend-selection` is green — the sibling gate asserting the same ADR-002
      invariant, red for the same 7 reads. Fixing the seam should close both; confirm it does rather
      than assuming.
- [x] `acd-no-new-silent-catch` is green — `src/board-worker-stream.mjs` carries 1 silent catch site
      against a shrink-only baseline of 0. Either emit a coded event on that degrade path (a
      mesh-log sink / `onWarning`, the rule's stated remedy) or justify and move the baseline.
- [x] `test/mesh-terminal-input-path.test.mjs` → "terminal-resume/worker: a resume is a REAL RUN…"
      is green. It is a TEST bug, not a source bug: line 471 calls `completionResolve()` without the
      `await waitFor(() => completionResolve != null)` guard its sibling lane at line 519 has, so it
      races. The other 17 lanes in that file are green.
- [x] `acd-work-command-route-coverage` is green (3 red cases — the bijection, the every-command-has-a-
      door clause, and the behavioural loop). `work:loops-graph`, `work:loops-show` and
      `work:loops-validate` are registered with no served `/api/work` route. Either serve the three
      routes or record them in `board-ui.mjs`'s deferral carve-out, the way `work:dispatch`,
      `run-start` and `resume` are.
- [x] `command-core-contract` → "the registry exposes exactly the known work commands" is green. The
      frozen `WORK_IDS` list omits five registered ids: `work:init-config`, `work:resume`,
      `work:loops-graph`, `work:loops-show`, `work:loops-validate`. A list that is wrong is worse than
      no list — it stops being the gate it was frozen to be.
- [x] `acd-bundle-manifest-hashes` is green — **11** shipped manifest entries no longer content-address
      their member (`.aof/templates/work/task/example.feature`, the `aof-developer`/`aof-qa` agents, and
      the `continue`/`refine`/`verify` commands in both the `.claude` and `.codex` renderings). Drift
      here means `aof work update` cannot detect drift, which is the one thing the manifest is for.
      Re-run `scripts/generate-bundle-manifest.mjs` and confirm the diff is only the hashes.
- [x] `test/mesh-worker-completion-detection.test.mjs` → *"premature-done: an `end_turn` that goes
      quiet but RESUMES…"* is green **deterministically**, not on a coin flip. **Added 2026-08-29** —
      a second racy test, same species as the box above, found because milestone 58's gate put a 30s
      ceiling on that suite's bare `await watch` expressions and the race finally reported instead of
      hanging. Diagnosis, from the source: the lane drives a VIRTUAL clock, and at
      `:255-258` it writes the final transcript record, sleeps **30ms of real time**, then advances
      the virtual clock ONCE by `IDLE + 1` and awaits. The watch polls every 5ms and resets its
      quiet-window baseline to `now()` when it observes a new mtime — so if that observing poll lands
      AFTER the single clock advance, the baseline is set to the already-advanced instant, nothing
      ever advances the clock again, and the watch cannot settle at any elapsed real time. The fix is
      the same shape as the box above: stop guessing an interval, and either wait for the observation
      before advancing or advance in a bounded loop until it settles.
- [x] `aof work validate` is green (no regression)

## Re-measured 2026-08-29, at `aof:verify 58` — SIX GATES PASS, BUT ONLY FIVE ARE ACTUALLY FIXED

This chore's premise has moved underneath it. Milestone 58's gate ran the full suite (7,048 unit
tests / 131 integration scenarios / 85 cargo) and then each of this chore's named gates focused, with
`AOF_GLOBAL_HOME` isolated. Measured, gate by gate, in the order the boxes appear:

| box | gate | 2026-08-29 |
|---|---|---|
| 1 | `acd-graphify-backend-selection` | **green** — 4/4 |
| 2 | `acd-memory-backend-selection` | **green** — 5/5 |
| 3 | `acd-no-new-silent-catch` | **green** — 2/2 |
| 4 | `mesh-terminal-input-path` → the unguarded resume lane | passes 18/18, but the RACE IS STILL PRESENT — see below |
| 5 | `acd-work-command-route-coverage` | **green** — 4/4 |
| 6 | `command-core-contract` → *the registry exposes exactly the known work commands* | **green** — 26/26 |
| 7 | `acd-bundle-manifest-hashes` | **green** — 3/3, after a regeneration described below |

**Nobody should tick a box on the strength of this table.** It records that the gates PASS today, not
that the underlying defects were fixed deliberately — and for at least two boxes the distinction is
load-bearing:

- **Box 4 is NOT fixed — the race is still there, and the green is luck.** Checked at the source
  rather than inferred from the colour. The unguarded call is `completionResolve({ outcome: "done" })`
  at **`test/mesh-terminal-input-path.test.mjs:502`**, in the lane *"69/05 task01 — a resume CONTINUES
  the parked run…"* (declared at `:434`); `completionResolve` is assigned at `:467` inside
  `watchTranscriptCompletion`, and nothing between `:467` and `:502` waits for that assignment. Its
  sibling lane *"terminal-resume/worker: a resume that PARKED needs-input…"* (`:520`) does it properly
  at `:557` — `await waitFor(() => completionResolve != null && recorder.frames.length >= 1)` — and
  again at `:568`. So the chore's diagnosis holds exactly, with the line number moved from 471 to 502
  by intervening edits. **The fix is one line**: the same `waitFor` guard before `:502`. It went green
  in four full-lane runs on 2026-08-29, which is precisely why a racy test must be read at the source —
  four greens are four coin flips that landed the same way.
- **Box 7 was re-generated, not repaired.** `scripts/generate-bundle-manifest.mjs` was re-run at 58's
  gate because five shipped loop records had their citations corrected and the manifest still carried
  the pre-correction hashes — a drift THIS session introduced, not an inherited one. The diff was five
  hash lines and nothing else. The chore's original finding (11 stale entries across templates, agents
  and commands) was already absent before that regeneration; what it was fixed by is not recorded
  anywhere, and that is worth knowing before this box is ticked.

**What to do with this chore.** Re-derive each box the way `aof:verify 50` and `aof:verify 65`
originally did — `git diff main --` over the files each gate names AND over the gate file itself — and
either tick it with that evidence or delete it as already-paid. The chore's own Intent says the cost of
leaving reds is that *"every future verify has to re-derive 'these are not mine' from scratch"*; a
chore whose boxes are all green for unrecorded reasons has exactly the same cost pointed the other way.

**An EIGHTH box was added by this re-measure, and it is the most useful thing here.** Milestone 58's
gate bounded nineteen unbounded `await watch` expressions across three suites with a 30s ceiling. On
the very next full lane, `mesh-worker-completion-detection`'s premature-done lane failed with
*"the completion watch did not settle within 30000ms — it would have hung the run"*. That race was
always there; four earlier full-lane runs passed it. What changed is that a hang became a named
failure, which is the whole argument for the ceiling and for this chore: **a suite that can hang
cannot be measured, and a racy green cannot be trusted.** Two of this chore's boxes are now racy
tests found the same way, which makes the pattern — a test resolving or advancing without waiting for
the observer to be ready — worth fixing as a class rather than twice.

**One box is worth keeping regardless of colour.** Boxes 5 and 6 are one family — three `work:loops-*`
commands registered without the registry list, the board route coverage and the shipped manifest
following them. Green gates today do not establish that the family rule is held; milestone 58 added no
new command, so the family has not been exercised since. If the fix was "the three routes were served",
that is worth confirming rather than assuming, because the next command registered is where it matters.

## Resolved 2026-09-02 — re-derived box by box, and the two races FIXED

The prior re-measure was right to refuse the table: re-derived at the source, **seven boxes were
already paid and two were not**, and the two that were not are the two the table itself flagged.
Every gate below was run focused, in one process, with a per-test `AOF_GLOBAL_HOME` — never the full
suite (`global-work-propagation` binds `:4182`, which the live control daemon holds). **69/69 green**,
and `aof work validate` PASS.

| box | gate | re-derivation | verdict |
|---|---|---|---|
| 1 | `acd-graphify-backend-selection` | `git grep` on **main**: `config.memory?.backend` has exactly ONE code read, `src/work-memory.mjs:77`; the other 8 hits are ADR comments the gate strips | already paid **on main** |
| 2 | `acd-memory-backend-selection` | same single read — the two gates agree about where the seam is, which the chore asked to confirm rather than assume | already paid **on main** |
| 3 | `acd-no-new-silent-catch` | `src/board-worker-stream.mjs` is byte-identical to main, is **absent from `BASELINE`**, and every catch in it calls `reportDegrade("board-worker-stream", …)` | already paid, by the rule's **stated remedy** (a coded degrade event) — the baseline was NOT moved |
| 4 | `mesh-terminal-input-path` → the unguarded resume lane | **FIXED HERE** — see below | fixed |
| 5 | `acd-work-command-route-coverage` | on main, `loops-show` / `loops-graph` / `loops-validate` (and `resume`, `init-config`) sit in `BOARD_DEFERRED` with their reasons written out — the recorded carve-out, not a silent pass | already paid **on main** |
| 6 | `command-core-contract` → the registry list | on main, `WORK_IDS` carries all five formerly-omitted ids | already paid **on main** |
| 7 | `acd-bundle-manifest-hashes` | re-ran `scripts/generate-bundle-manifest.mjs`: the shipped manifest came back **byte-identical** (107 entries, zero diff) | in sync — and `git log` shows 63/00, 63/02 and 63/03 each regenerating it, so the discipline is held per-story, which is what "what fixed it is not recorded" was really asking |
| 8 | `mesh-worker-completion-detection` → premature-done | **FIXED HERE** — see below | fixed |
| 9 | `aof work validate` | PASS | green |

**The family question is answered, and answered by exercise rather than by colour.** Boxes 5 and 6
worried that no command had been registered since the fix, so the family rule was untested. One has:
milestone 63 registered `work:trigger`, and the same commit added it to `WORK_IDS` **and** to
`BOARD_DEFERRED` with its deferral reason. The rule held the first time it was exercised.

### The two races — fixed, and each fix FALSIFIED rather than merely observed green

Both are the species this chore named: *a test that resolves or advances without waiting for the
observer to be ready*. Ten consecutive focused runs are ten coin flips, so each fix was checked the
other way round — force the losing interleaving and confirm the lane fails without the fix.

- **Box 4** (`test/mesh-terminal-input-path.test.mjs`) — the diagnosis held exactly, at `:502`.
  `completionResolve` is assigned inside `watchTranscriptCompletion` and nothing ordered that
  assignment before the call. Fixed with the guard its sibling lane at `:557` already had:
  `await waitFor(() => completionResolve != null)`. **Falsified:** with the assignment forced late
  (50ms) and the guard removed, the lane fails `TypeError: completionResolve is not a function` — and
  the process then **hangs** (killed at the 90s ceiling), which is the shape that makes a racy test
  worse than a red one. With the guard, same forcing, green in 0s.
- **Box 8** (`test/mesh-worker-completion-detection.test.mjs`) — the premature-done lane advanced the
  virtual clock ONCE after a guessed 30ms sleep. `tick()` sets `stableSince = now()` whenever it
  observes new mtime, so a poll landing after that single advance re-anchors the quiet stretch to the
  already-advanced instant and nothing ever moves the clock again. Replaced with a **bounded advance
  loop** (`advanceUntilSettled`), which converges in *every* interleaving because each step out-waits
  whatever baseline the last poll installed.
- **A THIRD instance of the same race, not in the chore, found by the sweep** — the `session-tree`
  lane in that same file stepped `clockMs += IDLE + 1` **before** each subagent write. The parent's
  `end_turn` is a settleable outcome throughout, and the settle test is `>=`, so a poll landing in
  that gap settles `done` while a subagent is still writing — the exact live truncation the lane
  exists to catch. Fixed by writing first and stepping `IDLE - 1`, which cannot settle in either
  interleaving while preserving the regression (2·(IDLE−1) still far exceeds one window).
  **Falsified:** with the pre-fix ordering and a 20ms window, the lane fails on `STILL-WATCHING`.
- **The premature-done fix is the one that could NOT be falsified locally, and that is recorded as a
  limit rather than glossed.** In a focused single-process run the observing poll reliably lands
  inside `await write(...)` — writeFile's own latency exceeds the 5ms poll — so the losing side needs
  the event-loop contention only a full-suite run supplies, which is precisely where milestone 58's
  30s ceiling reported it. Measured on the way: this filesystem's mtime granularity is sub-millisecond
  (deltas of 14.8 / 30.2 / 48.1 / 110.0 ms for 5/20/40/100ms gaps), so coarse timestamps are NOT what
  hides the race. The fix does not depend on reproducing the interleaving: it removes the dependency
  on it.
- **The class was swept, not just the two named instances.** Every sibling site was checked at the
  source: `completionResolve` in `test/item-lock-holder-identity.test.mjs:321,332` and
  `test/mesh-terminal-input-path.test.mjs:566,578`, and `exitLever` in
  `test/mesh-terminal-input-path.test.mjs:230` and `test/mesh-worker-withdraw-settle.test.mjs:129` —
  **all six already carry the `waitFor` guard**. No shared cross-suite helper was introduced: the two
  shapes (a null-guarded resolve, a bounded virtual-clock advance) share a name and nothing else, and
  `advanceUntilSettled` lives beside `settledOrFail` in the one suite that drives a virtual clock.

**Scope note.** Every change is in test files. Boxes 4 and 8 were diagnosed as test bugs and they are
test bugs; no production behaviour was altered to make a gate green.

## Notes

- Raised as findings **F-50-E** and **F-50-F** in
  [50/VERIFICATION.md](../50_milestone_session-launcher/VERIFICATION.md), triaged non-blocker and
  deferred here.
- The last three boxes arrived later, as **F-65-B** in
  [65/VERIFICATION.md](../65_story_concurrent-story-dispatch/VERIFICATION.md) — found because story
  65's verify re-ran the whole fitness lane and the four named surfaces, then re-ran both with its own
  change set stashed to prove the reds inherited. They are one family: three commands
  (`work:loops-*`, plus chore 51's `work:init-config` and `work:resume`) were registered without the
  registry list, the board route coverage and the shipped manifest following them. Fixing the family
  once is cheaper than fixing three gates separately.
- Run the gates focused, never via the full suite on the control node —
  `global-work-propagation.test.mjs` binds `:4182`, which the live control daemon holds. Every run
  needs `AOF_GLOBAL_HOME` set to a throwaway dir (hook-enforced).
- **The carryable lesson (2026-09-02).** Seven of these nine boxes were already paid, and the chore
  still earned its keep — because the two that were not were invisible under green gates. A gate's
  colour answers "does it pass today", never "is the defect fixed", and for a racy test the two
  answers are independent. The cheap discriminator, used on every box here, is to re-derive the
  gate's own claim from the source (`git grep` on `main`, the baseline table, a manifest
  regeneration) and — for anything timing-shaped — to **falsify** the fix by forcing the losing
  interleaving. A fix that cannot be made to fail without itself is not yet known to be a fix.
- The two backend-selection gates are one invariant with two homes. If the fix greens one and not the
  other, that difference is itself worth recording — it means the two gates disagree about where the
  seam is.

## Accept decision

**Accepted 2026-09-02** — closed on the per-type chore criterion (ADR-003), both halves together, and
nothing else: **no `.feature` was run, no behavioural-verify step applies**, because a chore carries no
acceptance scenarios by design.

1. **Checklist ticked.** All **9** boxes under `## Definition of Done` are `- [x]`; none left `- [ ]`.
2. **`aof work validate` green.** `PASS — 64 is well-formed` scoped, and `PASS — work stream is
   well-formed` unscoped — the box-9 no-regression claim checked at the stream, not just at the item.

`aof work doctor 64` reports no `control-unresolved` at either severity (the one `warn` is the
stream-wide `numbering-gap`, not this chore's). The two race fixes were confirmed **at the source**
rather than from the box: the `waitFor(() => completionResolve != null)` guard is present at
[mesh-terminal-input-path.test.mjs:507](../../../../test/mesh-terminal-input-path.test.mjs#L507) and
`advanceUntilSettled` at
[mesh-worker-completion-detection.test.mjs:51](../../../../test/mesh-worker-completion-detection.test.mjs#L51),
both landed in `3830440d`.

`OUTCOME.md` authored alongside — the chore's ticks are ACTS, and the outcome records the STATE they
made true. `CHORE.md` remains the record doc.
