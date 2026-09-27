# 129 · Loop concurrency — Outcome

<!--
  Authored at the milestone accept. States what is true AT THE MILESTONE LEVEL that no single
  story's outcome states alone; where a story states a capability whole, it is CITED as
  m129/SS/<capability> rather than repeated — the index unions every item's records, so a restated
  capability is one fact written twice.
-->

## Delivered

### `aof work loop` drives a milestone in concurrent worktree lanes, and the unit of concurrency is a worktree
Set `work.loop.concurrency: "refine_first"` and a loop over a milestone refines every story serially in the primary, then fans each write-disjoint wave into one dispatch worktree per member, then verifies serially — the three-phase shape of `m129/01`, executed by the wave tick of `m129/04`, over the lane verbs of `m129/03` and the child drive of `m129/02`. Unset, the shell is byte-identical to the sequential loop that preceded it. The milestone's own framing defect is closed by construction: no two sessions share a checkout, so a story's grade, its run record and its progress sample are its lane's alone.

### The loop ALWAYS owns the fan-out; `work.agents.mode` governs only what a lane's session spawns
The SPEC proposed that `orchestrated` drive a milestone-level `/aof:continue` and `solo` drive lanes; ADR-001 §5 departed and the PO ratified it (`STATE.md`, 2026-09-12). There is therefore ONE home for fan-out and merge-back — code, not prompt prose — and this repository, which is `orchestrated`, reached the SPEC's verifiable outcome without flipping a single story session to solo. An orchestrated-milestone drive stays addable later as an additive mode value; nothing shipped forbids it.

### The tree that commits the change owns the record, and the primary learns of it at the merge
A lane mints its story's run against a ref resolved IN the lane, settles it there, grades there, commits there and merges home; the primary's story `runs/` is empty until that merge and then answers the lane's own `runId`. One wave run per epoch lives on the milestone ref in the primary and carries the loop's liveness, so the supervisor sees exactly one declaration however many lanes are open (`m129/04`, held by FF-12903 and FF-12907).

### Merge-back is the mesh's one verb, pointed the other way
`advanceBranchToBase` merges a lane home — fast-forward when it can, a real `--no-ff` merge otherwise, a coded refusal and a named halt on a conflict or a dirty tree, and never a rebase, a force-push or a reset (`m129/03`, held by FF-12904). Lanes merge serially in completion order, and the next wave is cut from the merged HEAD.

### The configuration surface is self-contained under `work.loop`, and the operator signed it off
`work.loop.concurrency`, `work.loop.dispatch.concurrency` and `work.loop.agents.<phase>.mode` live in the one bounds home, each falling back to its workspace twin, the lane bound able only to NARROW the pool's (`m129/07`). This surface exists because the operator held the milestone door at the 05 accept to specify it, and 07 was scoped, built and accepted against that specification.

### The concurrency was driven for real on this control node, three times
`m129/06` is the measurement, not a claim: two lanes open and two sessions driving at once, each lane's record carrying the wave's `loopRunId`, one baseline per wave excluding the base's inherited reds, serial merges, every lane cleaned up, a named exit, one loop process across a 5.5-hour run. Four live-measurement gaps remain open there with discharge conditions.

### Seven structural controls hold the shape, each observed red on the leg it names
FF-12901 through FF-12907 (`m129/05`) are the milestone's standing guarantee: one home for the mode, no second concurrency number, no session driver or `node-pty` inside the loop family, the wave read from `work:next` and never recomputed, the lane's records and grade taken in the lane, lanes as children of one declaration, and merge-home never discarding. Every one was made red on its declared leg and restored byte-identical; the probes are in `VERIFICATION.md` § Fitness functions.

## Assumptions

- **A lane is local** — a wave member runs in a dispatch worktree on the control node; dispatching one to a mesh worker is the assignment path and is unchanged by this milestone.
- **The wave partition is read, never recomputed** — `work:next --through-review` owns it (71/ADR-006), and the loop family imports neither `ready-wave.mjs` nor `story-contract.mjs`.
- **Lane environments are not primary environments** — five arch cases are red at every lane base and green in the primary; the per-base baseline excludes them correctly, which also means a lane grade can never see one of them regress (`F-66`).
- **The operator's concurrent edits stay out of a lane's grade** — that is the point of grading in the lane, and it is why a primary-tree grade was refused at ADR-001 §5.

## Gaps

### A conflict drill performed against a live loop
- **Status:** open
- **Discharge condition:** the drill of `m129/06`'s `OUTCOME.md` § Gaps, performed once on a live two-member wave.
The merge-conflict halt is held by a real-git fixture, by FF-12904 and by a live `--resume` over already-merged lanes; nobody has yet forced the conflict in a running loop.

### An interleaved-concurrent mode
- **Status:** open
- **Discharge condition:** a measured case where a story's build informs a sibling's refine enough to pay for the contract churn.
ADR-001 §6 deferred it deliberately: `refine_first` locks every contract before any lane opens. The mode value is additive when it is wanted.

### A loop shell that survives its own sequential rung
- **Status:** open
- **Discharge condition:** the post-build sequential drive runs as a child too, or the PTY kill is skipped after a successful tree kill.
ADR-004 §1 chose the child for the LANE on the strength of three loop deaths; `F-64` shows the same juncture still live on the sequential rung, which this milestone did not change.

### A halted wave run that does not read as a failure
- **Status:** open
- **Discharge condition:** a wave run settled on a `session-needs-input` halt carries the halt's own outcome, or the wave run is exempt from the run-failed status reactors.
`F-68`: a halt settles the wave run `failed / agent_error`, and 20/ADR-005's rollback reactor then moves the TARGET MILESTONE from `in-progress` back to `not-started` — observed on 130 at the 2026-09-21 run.

### `src/loop/`'s four existing leaves
- **Status:** open
- **Discharge condition:** `loop-argv`, `loop-bounds`, `loop-record` and `loop-progress` move into `src/loop/`.
Named out of scope by the SPEC and by ADR-008 §2: the family was born here as a budget exemption for its three new modules, and re-pointing the four standing leaves is its own item.
