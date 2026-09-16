---
type: story
number: 04
slug: the-tuners-face
title: "The tuner's face — one registered read command that invokes 61's acceptor and writes nothing"
parent: 62
status: done
owner: product-owner
created: 2026-08-31
updated: 2026-09-01
depends: [62/00, 62/01, 62/02, 62/03, 62/05]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-001, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-002, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-004, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-005, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-008, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-009, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-010, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-012, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-013, wiki/work/62_milestone_self-improvement-loop/ARCHITECTURE.md#ADR-014, wiki/work/53_milestone_loop-artifact/ARCHITECTURE.md#ADR-006, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-010, src/command-core.mjs, src/commands/acceptor.mjs, src/commands/audit.mjs, src/commands/observe.mjs, src/commands/loop.mjs, src/command-error.mjs, src/work.mjs, src/work-ref-scope.mjs, src/work-loops.mjs, src/memory/local-indexing.mjs, src/work-doctor-controls.mjs, src/work-acceptor/admissibility.mjs, src/work-tune/corpus.mjs, src/work-tune/formation.mjs, src/work-tune/proposal.mjs, src/work-tune/provenance.mjs, src/work-tune/distance.mjs, wiki/work/62_milestone_self-improvement-loop/stories/00_story_the-corpus-and-its-floor/STORY.md, wiki/work/62_milestone_self-improvement-loop/stories/01_story_the-proposal-its-lane-and-its-patch/STORY.md, wiki/work/62_milestone_self-improvement-loop/stories/02_story_provenance-that-resolves/STORY.md, wiki/work/62_milestone_self-improvement-loop/stories/03_story_the-distance-to-a-live-proposal/STORY.md, test/arch/acd-work-command-cli-bijection.test.mjs, test/arch/acd-work-command-route-coverage.test.mjs, test/arch/acd-strict-is-two-policies.test.mjs, test/arch/acd-loop-l1-read-only.test.mjs, scripts/test.mjs, wiki/work/TECH_DEBT.md]
files: [src/commands/tune.mjs, src/command-core.mjs, src/work-loops.mjs, src/work-tune/corpus.mjs, src/work-tune/proposal.mjs, test/arch/acd-tune-carries-no-second-rule.test.mjs, test/arch/acd-tune-writes-nothing.test.mjs, test/arch/acd-tune-is-non-vacuous-over-this-repo.test.mjs, test/command-core-contract.test.mjs, test/arch/acd-work-command-cli-bijection.test.mjs, test/arch/acd-work-command-route-coverage.test.mjs, test/tune-command.test.mjs, test/tune-corpus.test.mjs, test/tune-proposal.test.mjs, scripts/test.mjs]
---
# 04 · The tuner's face

## User story

As anyone who runs `aof work tune`,
I want one registered command whose bare face is a read and whose verdict on a tunable knob is the
acceptor's own,
so that the half of the loop that generates changes can never quietly become the half that decides
them.

There is a seam waiting for this story and it has been waiting since 61 shipped. `acceptorCommand.input`
already declares `proposals: { type: "array", items: { type: "object" } }`, and `reportOne` already
reads a proposal's key, step, arms, epoch and provenance — but the CLI adapter maps only `--commit`, so
**no path exists today by which a proposal reaches the acceptor at all**. A declared input with no
producer is a species this repository has measured twice. This story is the producer, and the route is
the registry: `invoke("work:acceptor", { proposals }, ctx)`, behind the deferred dynamic import that
`src/commands/loop.mjs` established so the registry ring is not closed at module scope.

That choice is the whole answer to "62 may not carry a weaker acceptance rule". The face does not score
proposals, does not threshold them, and does not order them by anything that decides an outcome; it
hands the tunable ones to 61 and renders what comes back — verdict, evidence, refusals, distance —
verbatim. If the registry cannot answer, the lane reports a construction failure rather than falling
back to a locally computed verdict, because the fallback *is* the second rule.

And the command writes nothing. Not "writes only under a flag" — no write path exists to be flagged,
which is why there is no `--dry-run` either: a flag that withholds a wet path implies one exists. Auto-
apply is not here for a structural reason rather than a cautious one: it is an L3 act, 53 locked L3 with
a control asserting no module under `src/` carries an executing branch keyed on it, and the only route
from a proposal to a committed harness change stays the explicit `aof work acceptor --commit <key>` that
61 already ships. SPEC's "auto-apply strictly through 61's acceptor" is satisfied by 62 owning no apply
code at all.

This story is also the one that touches the shared registry, so it is the milestone's sole writer of
`src/command-core.mjs` and of the two contended bijection/route-coverage controls. `tune` joins
`acceptor`, `audit` and `grade` in the board-deferred set for their reason: a served route would let a
page load walk the whole work tree, the run store and the transcript index.

## Tasks

- [x] `tasks/00_one-registered-read-command.feature` — `aof work tune [scope] [--json]` is reachable on both faces, renders one object, and exits on whether it could run rather than on what it found
- [x] `tasks/01_the-tunable-verdict-is-the-acceptors.feature` — a tunable-lane proposal is handed to `work:acceptor` and its verdict, evidence and refusals are rendered as they arrive
- [x] `tasks/02_no-verdict-is-computed-when-the-acceptor-cannot-answer.feature` — an acceptor that cannot be reached yields a construction failure rather than a locally derived verdict, and exits non-zero because the command's own machinery failed
- [x] `tasks/03_the-command-writes-nothing.feature` — a full run over a tree leaves every file and every byte unchanged, and no config, journal or event is touched
- [x] `tasks/04_the-report-leads-with-the-distance.feature` — the surface's headline is what stands between the proposals and a commit, and no proposal is rendered without one

## Notes

- **The route is the registry, deferred** (`ARCHITECTURE.md#ADR-002` §1). `src/commands/loop.mjs`'s
  dynamic-import idiom is the admitted shape; a static import of `command-core` closes the TDZ ring
  TECH_DEBT item 26 measured, and this story's control probes a fresh-process import as its first
  ratchet on that item.
- **No edit to 61's modules** (`ARCHITECTURE.md#ADR-002` §2). Neither `src/commands/acceptor.mjs` nor
  anything under `src/work-acceptor/` is in this story's `files:`.
- **The exit code is two-sided** (`ARCHITECTURE.md#ADR-012` §7). Every refusal, finding, demotion,
  below-floor candidate and empty result exits 0 — no findings gate arrives by the back door — while an
  unreachable `work:acceptor` is a failed run: reported in `--json` as `acceptor-unreachable`, then
  exit non-zero. `work:acceptor` sits in the same `COMMANDS` array, so unreachable means broken.
- **The face supplies `ctx.workspace.config` and nothing more** (`#ADR-012` §4), the way
  `src/commands/audit.mjs:147` and `src/commands/grade.mjs:306` already do. Resolving which accessor
  reads which target stays in `proposal.mjs`; a target→accessor table in the face would be the routing
  table ADR-003 refuses for lanes.
- **The workspace narrowing is paid for by a NO-CARRY-BACK leg** (`#ADR-014` §2): run twice over one
  tree, and nothing accumulates between the runs, inside the tree or outside it. Without it,
  `#ADR-013` §8's restatement would be a weakening rather than a correction.
- **No writes, no `--strict`, no `--dry-run`, no board route** (`ARCHITECTURE.md#ADR-005`,
  `#ADR-009` §5, §6). 59/FF-5911 already closes the strict set across the registry; the byte-level
  read-only proof follows 53/FF-5306's idiom, because a static grep cannot see where a path resolves.
- **Sole writer of the registry and of the two contended controls** (`ARCHITECTURE.md#ADR-010` §2).
  In `scripts/test.mjs` every story appends one labelled import block and one labelled spread block
  and edits nothing else; this story additionally verifies the whole milestone's suites are spread,
  not merely imported.
- **Three controls land with this story** — `FF-6201`, `FF-6207` and `FF-6208`.
- **`FF-6208` is the milestone's acceptance condition made checkable** (`#ADR-013` §7). Four stage-1
  controls each carried a fragment of "does this pass say anything about this repository"; those legs
  moved here, whole, so no stage-1 story lands a control it cannot clear and a reviewer reads the claim
  in one place.
- **The face INJECTS the applier resolver** (`#ADR-013` §2), a `resolveCommand` bound to
  `getCommand`, because the static-import ban on `command-core` is family-wide — a leaf closes the
  registry ring exactly as well as the face does, measured.
- **`test/command-core-contract.test.mjs` must be edited** (`#ADR-013` §5): `WORK_IDS` (`:51`) is a
  hand-kept census asserted at `:310` as *"exactly the known work ids, no more, no fewer"*, so
  registering `work:tune` reddens it. It is the one non-derived registration edit; everything else a
  new command touches is registry-derived.
- **`reads:` is DELIBERATELY INCOMPLETE at refine and must be completed at this story's Three Amigos
  pass.** The four modules this face composes — `src/work-tune/{corpus,proposal,provenance,distance}.mjs`
  — do not exist yet, and a `reads:` entry naming a path that is not on disk fails `aof work validate`.
  The four sibling `STORY.md` files stand in their place today so the contract still points at where
  each leaf is specified. Add the four module paths the moment stage 1 lands: 61/R6 measured that short
  read contracts are load-bearing, and this one is short on purpose and only until then.
- **Stage 2** — the only convergence point; depends on all four stage-1 stories.
