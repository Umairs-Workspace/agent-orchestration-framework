---
type: chore
number: 67
slug: core-commands-standalone
title: "The three core commands stand alone — continue owns its walk, autonomous is deprecated"
status: done
owner: product-owner
created: 2026-08-16
updated: 2026-08-16
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
# 67 · The three core commands stand alone — continue owns its walk, autonomous is deprecated

## Intent

`refine`, `continue` and `verify` are ACD's three core commands — one phase each, none delegating to
another. Today `continue` breaks that: for a milestone ref it hands off to `/aof:autonomous`, which
makes the walk's one implementation live in the *sequencer* rather than in the core command that owns
build+review. `autonomous` is literally those three commands run in order, and it is **deprecated** —
loop engineering (the `53`/`57`–`63` loop stream) replaces it. Invert the relationship before that
lands: `continue` owns its own build+review walk and calls no command; `autonomous` becomes a thin
sequencer over the three cores and is marked deprecated.

## Definition of Done

- [x] `src/bundle/commands/continue.md` implements the milestone walk **itself** — no
      `/aof:autonomous` invocation, and `SlashCommand` removed from its `allowed-tools`
- [x] `continue` is scoped to **build + review only**: an unrefined item is a stop (pointing at
      `aof:refine`), and accepting/record-doc authorship stays with `aof:verify`
- [x] The concurrent ready-set walk (`aof work next --json` → `readySet`, `aof work dispatch` per
      lane, bounded by `--list --json`'s `bound`) lives in `continue.md`, not in the sequencer
- [x] `src/bundle/commands/autonomous.md` is a **thin sequencer** — it calls `refine`, `continue` and
      `verify` per item and carries no fourth copy of the walk
- [x] `autonomous.md` is marked **DEPRECATED** in its `description` and body, naming loop engineering
      as its replacement and what an operator should run instead
- [x] Every other bundle file that tells a reader `continue` delegates to `autonomous` is corrected
      (`refine.md`, the agent prompts, `README`/docs — grep `autonomous` across `src/bundle/**`)
- [x] `src/bundle/manifest.json` regenerated; `acd-bundle-manifest-hashes` and
      `acd-bundle-membership` green
- [x] `aof work validate` is green (no regression)

The last box is ticked on the **chore-scoped** gate — `aof work validate 67` → `PASS`, exit 0, which
is what `aof:verify` reads for a chore. The whole-stream run is red for one **pre-existing, unrelated**
reason (milestone 53's unparseable feature, proven identical against a clean HEAD worktree); see Notes.
The sixth box needed no change to `refine.md` — every `autonomous` hit there is its own unrelated
`--autonomous` flag, and nothing in it claims `continue` delegates.

## Notes

**Why a chore and not a story.** No new behaviour ships and there is no observable contract to
author — this is a re-homing of prose that already exists, plus a deprecation marker. Milestone 66's
own ADR-003 rule applies in reverse: when the deliverable of a piece of work is *a control*, it cannot
be a chore. Here the deliverable is neither a control nor a behaviour; it is where a rule lives.

**One home, and the direction of the edge.** This is the same inversion 66/02 made when the controls
lane became a true leaf and the spine imported *it*: the phase that owns the work owns its
implementation, and the driver above it becomes thin. Duplicating the walk into `continue` while
leaving a copy in `autonomous` would be the defect (`TECH_DEBT.md` item 0 — nothing has one home), so
the check is that after this chore the walk appears **once** across `src/bundle/**`.

**The deprecation is a marker, not a removal.** `autonomous.md` keeps working — this session drove
milestone 66 through it — and nothing in the stream depends on it disappearing. Loop engineering
replaces it when it lands; until then a deprecated command that still runs is better than a gap.

**Raised at the build review, deliberately NOT built here.** Both review lanes returned FAIL on the
first build and their confirmed findings were applied; these survived triage as out of scope. Each is
a real defect or gap — recorded so the next reader inherits the finding rather than rediscovering it:

- **The board's primary Continue door points at the deprecated command.** `src/commands/continue.mjs`
  `resolveDirectivePhase` rewrites a *milestone* `continue` into the `autonomous` directive, and it
  feeds **both** call sites — the remote dispatch *and* the local one, which returns
  `command: "/aof:autonomous <ref>"`. The board's Continue button routes through it, so clicking
  Continue on a milestone in an interactive local session types the command this chore just
  deprecated, and the walk just re-homed into `continue.md` is unreachable from the board. The
  *remote* rewrite is defensible for now (a headless worker has no operator to run `verify` after a
  hand-back, and `autonomous` is still the only unattended driver): narrow the rewrite to the remote
  branch and let the local one keep `continue`. Retire the remote rewrite when loop engineering lands.
  Same for `src/mesh-assignment-directive.mjs` — every mesh worker assignment runs the deprecated
  command today.
- **The run lifecycle lives only in the deprecated sequencer.** `continue.md` opens by telling the
  operator to run `aof work resume` and resume retryable runs, but `run-start`/`run-complete`/
  `run-retry` appear in no bundle command except `autonomous.md`. Before this chore a milestone
  continue inherited that lifecycle through the delegation; now a crash mid-walk leaves nothing for
  the sweep continue itself instructs. It must land in `continue.md` or in the runtime.
- **`continue` has no branch for `chore` / `spike` / `uat` refs** — it dispatches on `milestone`,
  `story`, `task` only, so `/aof:continue 67` (this item) falls through every branch. Pre-existing,
  not a regression, but the delegation used to absorb it. Mirror `refine.md`'s refuse/redirect.
- **Nothing guards the invariant this chore establishes.** No test reads `allowed-tools` at all. The
  delegation edge existed until today and will drift back the moment it is convenient: an arch-test
  asserting the three cores carry no `SlashCommand`, and that no command body contains a `/aof:<cmd>`
  invocation unless its own `allowed-tools` grants `SlashCommand`, is the ratchet.
- **`autonomous.md` still tells the reader to pass `--solo` to `/aof:verify`**, which takes no such
  flag. Pre-existing; either drop it from the list or give `verify.md` the flag.
- **This repo's own installed renders are stale** — `.claude/commands/aof/continue.md` and
  `.codex/skills/aof-continue/SKILL.md` still ship the delegating text (already stale through m65,
  before this chore). An agent invoking `/aof:continue` *in this repo* gets the old command until
  `aof work update` runs.
- **`aof work validate` is not green stream-wide, for an unrelated reason.**
  `53/01/tasks/04_gate-order-and-cap.feature:20` is narrative prose in step position, so it does not
  parse under 66's stricter Gherkin parser. Committed at `2666c0b`, untouched here, proven identical
  against a clean HEAD worktree. The chore-scoped gate `aof work validate 67` — the one `aof:verify`
  actually reads for a chore — is PASS. Route the 53 fix to that milestone.

**Prompted by this session.** Milestone 66 was accepted without `aof:verify` ever being invoked: the
close was improvised inline, silently skipping `OUTCOME.md`, `memory ingest` and the STATE
compaction. A command read and believed rather than executed is exactly the defect milestone 66 exists
to refuse (`66/RETROSPECTIVE.md` **R4** — a rule frozen where nobody executes it does not exist).
Clean command boundaries do not fix that on their own — the enforcement has to sit on the write, not
on a command an agent chooses to call — but a `continue` that quietly swallows refine and verify is
what made the omission invisible. Recorded here so the follow-on (a PreToolUse/pre-commit/CI guard on
the accept transition) is not mistaken for this chore's job.
