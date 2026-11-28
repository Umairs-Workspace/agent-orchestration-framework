---
type: milestone
number: 210
slug: bounded-test-runs
title: "Bounded test runs — the agent picks the suites from the project's own words, a fix reruns only what failed and what it touched, and the whole tree runs at the gate"
status: done
owner: product-owner
created: 2026-11-26
updated: 2026-11-28
schema: 1
aofVersion: 0.1.0
depends: [72, 190, 197]
---
# 210 · Bounded test runs

## Objective

An agent never loops on the whole suite again. On 2026-11-26 an Opus session ran all ~16,000 cases
repeatedly. It ran the whole tree, fixed the failures, then ran the whole tree again to make sure
the fixes had broken nothing else. The new failures led to more fixes and another whole-tree run,
and so on.

Two things drive that loop:

- **The current selection almost never narrows.** `aof test --scope impacted` widened to all 1,314
  suites on 8 of the last 8 commits, including a commit that changed only one `wiki/work` record. A
  single file the code graph cannot place widens the whole run.
- **The skills give the agent no cheaper way to check its fixes.** They forbid naming suite files,
  and they say a story-scoped green does not prove the tree. So the agent proves the tree itself,
  after every fix.

This milestone REWRITES the testing approach. Nothing of the current selection model is kept for
compatibility. After it, testing works in three stages:

- **Choosing what to run.** The agent picks the suites, guided by the project's own plain-words
  testing instructions and by a fresh import scan.
- **Checking a fix.** A fix round reruns the cases that failed plus every suite that imports a file
  the fix changed. That answers both "did I fix it?" and "did my fix break a neighbour?".
- **Checking the whole tree.** That happens at the regression gate, at most twice per milestone.
  Every other path is refused by the tool, not left to the agent's judgement.

An outsider can verify it on this repo in four ways:

- A story's runs, fix rounds included, never execute the whole suite.
- Each fix round executes tens of suites, not 1,314.
- A failure that also fails on a clean HEAD is labelled pre-existing.
- A fix loop that makes no progress stops and hands over instead of continuing.

## Scope

In scope:
- **A project testing-instructions file** (e.g. `wiki/TESTING.md`), named in config. Every skill
  that tests reads it at its test step: continue, review, verify, manual/teach and repair, in both
  the Claude Code and Codex renders. It says in plain words:
  - which areas map to which suites;
  - which changes need no tests (records, docs);
  - how to run what the array runner does not, such as native `node:test` files;
  - this machine's hazards (`:4182` held by the live daemon, the slow `recall-replay`);
  - that the whole tree is the gate's job.

  This repo authors its own instructions file. `aof:map-tests` becomes "draft the instructions file
  from this repo", and the doctor points a project with none at it.
- **A named run with a reason.** `aof test <suite files…> --reason "<why>"` runs exactly the suites
  it is given and records the run: files, content hash, result and reason. The sign-off doors read
  that record. A repeat on unchanged content is answered from the record, so concurrent review
  lanes share one run.
- **A suggestion, not a verdict.** `aof test --suggest` lists the suites that import the changed
  files. It comes from a fresh scan of test imports on every call, with no dependency on a built
  code graph. It is input to the agent's choice, and the agent decides.
- **A fix round.** `aof test --failed` reruns the failed cases from the last recorded red run, plus
  every suite that imports a file changed since that run. A red summary ends by printing that exact
  command.
- **The whole suite is the gate's alone.** `aof test --all` refuses inside story work (build,
  review, fix and repair) and points at `--failed` or at a named run. The whole tree runs at most
  twice per milestone: the gate, and one confirming run after the gate's reds are fixed. New reds
  from the confirming run go back to `--failed` rounds. A confirming run that is still red stops
  and hands over.
- **Pre-existing reds are labelled.** A failing case that also fails on a clean HEAD is marked
  pre-existing, not the story's to fix. That stops loops that chase environment flakes.
- **A no-progress stop.** The record follows the failure set across fix rounds. When the set is not
  shrinking after about three rounds, or a fix makes new suites fail, the tool stops and hands over:
  a blocker in STATE, or a question to the operator.
- **The skills' wording.** The "never name suite files" rule and its "`--scope file` wearing prose"
  framing are replaced by: read the instructions, pick the suites, state why. After a fix, check
  what the fix changed; the gate checks the tree.
- **Removal, with no compatibility layer.** The following go, with their controls and tests:
  - the `impacted` scope and its `--story`, `--since` and `--commit` variants;
  - the four widening reasons and the self-check that polices them;
  - `work.test.couplings` and the doctor's coupling and layout nags;
  - the "no selection by judgement, no flag" rule (72/ADR-002), which is superseded rather than
    amended.

  The suite predicate (`roots`, `suffixes`, `exclude`) stays only as far as `--all` and the gate
  need it. Config keys that are removed are removed, not deprecated.

Out of scope:
- **The regression gate's own whole-tree run and sharding.** The gate stays the tree's check.
- **The code graph (graphify) for anything other than tests.** `graph impact` and seam liveness are
  untouched, and tests simply stop depending on it.
- **Making native `node:test` files selectable by the array runner.** The instructions file says how
  to run them.

## Stories

- [x] `00_story_testing-instructions` — A project tells its agents how to test, in its own words.
- [x] `01_story_importer-scan` — A change is matched to the suites that import or name it, from a fresh scan.
- [x] `02_story_attributed-test-records` — A test record says why it ran, where it ran, and which suite each failure came from.
- [x] `03_story_gate-runs-twice` — A milestone's whole tree runs at most twice, then hands over.
- [x] `04_story_named-test-runs` — An agent runs the suites it names and states why, and the whole tree is refused inside story work.
- [x] `05_story_bounded-fix-rounds` — A fix round reruns what failed and what the fix touched, skips pre-existing reds, and stops when it stops converging.

Waves: 00, 01, 02 and 03 are independent. 04 composes 00–02. 05 composes 04 and reads 03's gate
records.

## Dependencies

- 72 — the inner loop: `aof test`, the run record and the selection rule this supersedes.
- 190 — tested once per change: the run record, record reuse and the sign-off doors, which must read
  a named run honestly.
- 197 — narrowed impacted selection to extracted graph edges; the path this removes from testing.
