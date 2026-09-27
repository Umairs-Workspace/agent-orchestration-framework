---
type: story
doc: retrospective
number: 03
parent: 129
slug: the-lane-commits-and-merges-home
title: "Retrospective — the lane commits and merges home"
created: 2026-09-13
updated: 2026-09-13
---
# 129/03 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`. The run was not clean
— one Blocker at review round 1 (all three lenses, the same finding), fixed in item; a QA delta round;
two build runs, because the host slept under the first (loop death #4, bracketed in the milestone
`STATE.md` — the run store's `runtime_offline` reclaim and the retry worked exactly as designed, at the
price of a second $50 session); and a real grind
(`observability/snapshots/2026-09-13T10-39-51-388Z/report.md`: 5 agents, 1h26m real active, the
developer 31% on the toolchain with `worktree.mjs` edited ten times).

## R1 — An option that narrows a multi-verb operation narrows EVERY verb in it, and the review probes with dirt outside the scope

- **Kind:** mistake · **Area:** code / contract · **Stage:** build → review · **Owner:** developer / Three Amigos · **Raised by:** architect, QA and craft (one Blocker, three lenses)

**What happened.** `paths` made the stage `git add -- <paths>` and left the commit as `git commit`,
which takes the whole index — so an operator's pre-staged `M  README.md` outside the scope rode into
a mesh-authored commit, and the touched-paths door that should have refused it by name had nothing
left to refuse. The fix scoped the check and the commit too (`diff --cached -- <paths>`,
`commit -- <paths>`), then met git's second rule — a pathspec commit takes WORKING-TREE contents —
and had to carry `:(exclude).aof` on the door that can reach `.aof`.

**Why.** The contract's Examples for `paths` carried unstaged dirt in another directory and never a
pre-STAGED entry outside the scope; the build satisfied every row. Scoping is a property of the whole
sequence, and the one row that would have caught the gap is the one an operator's live desk produces
every day.

**Lesson.** When a story adds a scope to an operation made of several verbs, the contract carries one
Examples row per verb with the SAME out-of-scope dirt (unstaged, staged, untracked), and the build
reads each git verb's own pathspec semantics before assuming they agree. Refs: `F-28`, task 00
ruling (1), ADR-002 §2.

## R2 — Two git listings intersected at different granularities manufacture a throw where a returned refusal was promised

- **Kind:** mistake · **Area:** code · **Stage:** build → review · **Owner:** developer · **Raised by:** all three lenses

**What happened.** `touched-paths` intersected the file-level three-dot diff with plain
`status --porcelain`, which collapses a wholly-untracked directory to one `?? dir/` line. The
intersection was empty, git's own "would be overwritten" refusal fired at the ff/merge door, and the
verb THREW `gate-propagation-failed` instead of returning `dirty-worktree` with `files`.

**Why.** Both listings were correct on their own; the rule "compute it first so the refusal is
returned" holds only when both sides name the same thing, and porcelain's default is directory-level
for untracked entries.

**Lesson.** An intersection between two git listings is taken at ONE granularity
(`--untracked-files=all`, and `core.quotePath=false` so names compare as themselves), and the
"returned, never thrown" promise is tested by planting exactly the shape git collapses. Refs: `F-29`.

## R3 — A feasibility note is a measurement claim, and so is an ADR's line estimate

- **Kind:** misunderstanding · **Area:** contract / architecture · **Stage:** refine · **Owner:** product-owner / architect · **Raised by:** architect (at review), the accept (the sizes)

**What happened.** The STORY Note ruling `worktree.mjs` out as the resolver's home said its closure
"must gain no `work.mjs` edge" — but the module already imported `loadWorkspace` from `work.mjs`
(HEAD:47) — and it conflated the sink's pinned reach (71) with the driver's (24). `dispatch.mjs` is
still the right home, on ownership grounds (it owns `resolveDispatchLane`), so the outcome held while
the reason did not. Separately, ADR-008 estimated `worktree.mjs` at ~1,030 and `dispatch.mjs` at ~700;
they landed at 1,194 and 790, over half of the growth being the rulings' own documentation.

**Why.** Both sentences were written from the shape of the graph rather than from a grep of it, and
a wrong reason that yields a right answer is exactly the kind that survives review.

**Lesson.** A contract sentence of the form "X must gain no edge to Y" carries the command that
measured X has none today; an ADR's size estimate is labelled an estimate or measured after the
first build. The home of a moved function is argued from ownership first, closure second. Refs:
`F-46`, `F-43`, item 83's own rule ("a number in an ADR is a measurement claim").

## R4 — "Green unchanged" on a reach control is a claim about a pinned number, and a re-export moves the pin

- **Kind:** near-miss · **Area:** contract · **Stage:** refine · **Owner:** Three Amigos · **Raised by:** developer (at build)

**What happened.** Task 00 required `acd-session-driver-mesh-blind` "green unchanged" while also
requiring `worker-execution.mjs` to re-export `resolveRefInWorktree` from `../work/dispatch.mjs`. The
re-export necessarily puts `work/dispatch.mjs` and its `launcher-lock.mjs` leaf into the sink's
static closure: 71 → 73. The two clauses could not both hold; the pin was re-measured, the driver's
own reach (24) confirmed unchanged, and the two controls joined `files:` at the build.

**Why.** The contract treated the reach pin as a property of the driver when it is a property of the
sink's whole closure, and a re-export is an import.

**Lesson.** At refine, every re-export or import a story adds is checked against the reach controls
that pin the importing module's closure, and a pin that must move is written into the contract with
its new value and the control into `files:` — never "green unchanged" over a number the story
changes by construction. Refs: `F-34`, task 00, `acd-session-driver-mesh-blind`.

## R5 — A ruling about the operator's live primary is measured on a primary-shaped tree, not reasoned from the worker's

- **Kind:** mistake · **Area:** contract / code · **Stage:** refine → review · **Owner:** Three Amigos / developer · **Raised by:** QA and craft (two findings, one cause)

**What happened.** Ruling (1) said "the `.aof` reset still runs" under `paths` — in the live primary
that reset unstaged an operator's OWN staged `.aof/aof.config.json` outside the scope, a file the
loop was told to leave alone. And `dispatchLaneBase` read the primary's line off the MAIN worktree,
which is wrong the moment the primary is itself a linked worktree — this repository's own
gate-in-a-worktree flow.

**Why.** Every prior caller of these verbs was a worker's tree: clean, nobody's desk, the main
checkout. The loop's primary is the opposite on every axis, and the rulings were carried over from
the case they were written for.

**Lesson.** A verb that will run in the operator's primary gets its Examples on a fixture shaped
like one — operator dirt inside and outside the scope, staged and unstaged, and a primary that is a
linked worktree — before the ruling is locked. Refs: `F-36`, `F-30`, ADR-002 §2, ADR-008 §7(d).

## R6 — A negative assertion must be able to fail, and a double that receives nothing needs no repository

- **Kind:** near-miss · **Area:** test-shape · **Stage:** build · **Owner:** developer · **Raised by:** craft, QA

**What happened.** The traversal row proved "constructs no path" with
`existsSync(worktree/../../etc) === false` — true whatever the resolver did. The three unknown-policy
rows built a real repository to hand a recording double that, by the row's own assertion, receives no
invocation. Both were closed at the accept: the traversal row now PLANTS a milestone-shaped directory
exactly where a joined path would land, so the null answer can fail; the policy rows run over a bare
temp directory.

**Why.** A row written from the scenario's wording ("constructs no path") reached for the nearest
observable rather than for the thing that would be true if the implementation were wrong; the fixture
was the suite's default, not the row's need.

**Lesson.** For every negative claim, write the row that would go red under the naive implementation
(plant what the claim denies); and a row whose subject is "no call was made" uses the cheapest fixture
that lets the call be observed. Refs: `F-40`, `F-41`.

## R7 — A non-module in `files:` widens `--scope impacted` to the whole suite

- **Kind:** near-miss · **Area:** process / tooling · **Stage:** build · **Owner:** developer / `aof test` · **Raised by:** developer

**What happened.** `aof test --scope impacted --story 129/03` resolved to `all` — the forbidden whole
run on this machine — because `.gitattributes` is in `files:` and is not a graph node. The developer
saw the resolution and ran the terminator as `--scope file` over the named suites instead.

**Why.** The impacted resolver reads "a declared file with no graph presence" as "unknown blast
radius" and widens to everything; the same shape the impacted-scope memory names for brand-new
files. For a `.gitattributes` line the honest blast radius is the suites that read it.

**Lesson.** Until the runner changes, a story whose `files:` names a non-module briefs its build to
run `--scope file` over the declared suites; the runner should widen a non-module to NOTHING (or to
the suites that cite it), never to `all`. Refs: `F-47`.
