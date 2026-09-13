---
type: story
doc: retrospective
number: 04
parent: 126
slug: the-installer-fixes-the-daemon-environment
title: "Retrospective — the installer fixes the daemon environment"
created: 2026-09-10
updated: 2026-09-10
---
# 126/04 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — Adding a default-seamed probe to an existing verb silently widens what every existing test of that verb reaches

- **Kind:** blocker · **Area:** testing · **Stage:** build · **Owner:** developer · **Raised by:** the builder, at build

**What happened.** `run` gained the preflight, whose default probes spawn `claude` and open the
projection store. `mesh-desktop-run.test.mjs` injected only a `spawnFn`, so from the moment the
preflight landed those suites were reaching the operator's own `~/.aof` on every invocation — and
stayed green throughout. Fixed in that suite by making every invocation carry inert probes.

**Why.** A seam that defaults to the real thing is only isolated at the call sites that inject it. An
existing suite injected what the verb needed BEFORE the change, which is exactly the set that no
longer covers it after. Nothing reds, because reaching the real machine is not itself a failure.

**Lesson.** When a verb gains a probe with a default, the change's blast radius is every existing
test of that verb, not only the new scenarios — enumerate them and re-check what each one now
touches. The general shape is the isolation lesson this repository already enforces for the test
suite (`AOF_GLOBAL_HOME`) reappearing one level down, at the seam rather than at the process.
**Refs:** `@finding-F-26`.

## R2 — The obvious control is sometimes wrong in the direction that reds a correct tree

- **Kind:** misunderstanding · **Area:** testing · **Stage:** build · **Owner:** architect · **Raised by:** the builder, at the contract beat

**What happened.** `aof-mesh-desktop` is spelled twice in `src/commands/mesh/desktop.mjs`, for two
different things: the registry VALUE name (exported as `AUTOSTART_VALUE_NAME`) and the non-Windows
PROCESS name in `desktopProcessName`. A file-wide "the value name is spelled once" assertion would
therefore assert a coincidence rather than the rule, and would go red on a correct tree the moment
either spelling moved.

**Lesson.** Assert what the rule MEANS, not the textual shadow it usually casts: `FF-12607` asserts
that the act references the exported constant and never re-spells the literal. When a literal has two
legitimate meanings in one file, an occurrence count is not a control — it is a coincidence detector.

## R3 — A "spelled once" register claim can outrun the control that carries it, and a probe is how you find out

- **Kind:** mistake · **Area:** testing · **Stage:** verify · **Owner:** product-owner · **Raised by:** this accept's red probe

**What happened.** `FF-12607`'s register row reads as though its named control asserts the
off-Windows behaviour: *"Off Windows, both `--autostart` and `--no-autostart` are asserted to return
the coded refusal `autostart-unsupported-platform` … over an injected platform, so the leg runs on
every host."* The red probe that neutered the refusal — an unreachable second `return` inside
`admitAutostartPlatform`, so nothing throws on any platform — left the control **GREEN on all five
legs** and reddened three `126/04 task02` acceptance scenarios instead.

**Why.** The control asserts the SHAPE the refusal needs (the platform is an argument, not a
`process.platform` read; the admission is exact and never case-folded) and the acceptance suite
asserts the refusal itself. Both are right; only the row's prose conflates them.

**Lesson.** The red probe is what distinguishes "the claim is enforced" from "the claim is enforced
BY THE CONTROL THE REGISTER NAMES". Write the row's `enforced by` against what the file actually
asserts, and where a claim is split between a control and its acceptance suite, say so — otherwise a
later reader deletes the acceptance scenario believing the control still holds the line.
**Refs:** `@finding-F-27`.

## R4 — Two ratchets caught this build, and the one that argued back was the more useful

- **Kind:** confirmed approach · **Area:** testing · **Stage:** build · **Owner:** architect · **Raised by:** two delivered ratchets

**What happened.** `acd-test-suite-registration` caught two `source.slice(indexOf(a), indexOf(b))`
sentinel-end cuts in the new control; recut through `test/support/source-slice.mjs`'s `functionBody`,
which also made the assertion honest — it now names each region it could not find, rather than
asserting over whichever bytes lay between two markers. `acd-source-directory-budget` demanded a
stated reason for both new files, and its `test/mesh/desktop` row said a fourth VERB would be a
product decision. Autostart is deliberately not one: two flags on `install`, because a separate verb
would be a second door to one act.

**Lesson.** A ratchet that asks for a REASON rather than forbidding the change is the one that
improves the design, because writing the reason is where the alternative gets rejected on the record.
Both of these are cheap to satisfy and neither would have been noticed by review.
