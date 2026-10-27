---
doc: retrospective
promotionFrom: 1
---
# 174 · A built graph is shared through the project's own remote — retrospective

What building 174 taught: the transport worked first time against a real remote. What the suite
missed was how an operator turns the feature on, and the checkout it was built in was shared with
another milestone's lane.

## R1 · The switch that turns the cache on is one of the cache's own inputs

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** verifier · **Promoted to:** none

**What happened:** `graph.share` is set in `.aof/aof.config.json`, and graphify reads that file. So
on a clone where the setting is a local edit, which is how the README says to turn it on, every
build downloads the published graph, finds its inputs differ, discards it and runs the full build.
Verify measured this: 148.8 s after a 4.7 s fetch. The `@manual` scenario's own Given ("`graph.share`
set … and a clean tree" at a commit on `origin/main`) cannot be met as worded for the same reason.

**Why:** ADR-001 made the inputs digest the validator. That was right, but nobody asked whether the
enabling switch was itself an input. The fixture commits the config in its seed repo
(`test/graph/graph-share.test.mjs:57`), so every tested clone already had the setting committed, and
the stubbed graphify never reads the config anyway.

**Lesson:** When a cache is validated by a digest of its inputs, check at refine whether the setting
that turns the cache on is one of those inputs. Then write one example of the enable step as an
operator performs it: an edit, before it is committed.

**Refs:** VERIFICATION `@finding-F-03`; ARCHITECTURE ADR-001; OUTCOME gap "A shared graph after
sharing is switched on locally".

## R2 · A parentless story was built and verified in a checkout another milestone's lanes were committing into

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** operator · **Raised by:** developer · **Promoted to:** none

**What happened:** 174 was built on `milestone/172-excalidraw-phase-3`. A 172/00 commit (`6ffb285`)
landed mid-build, and 172/02 committed (`1bbdfdc`) mid-verify. Neighbour controls went red from 172's
work. 174's FF-16004 ceiling (737) conflicts with the 739 the shared tree measures. And 174 was
accepted with its whole change set uncommitted, on 172's branch.

**Why:** A parentless story with no lane of its own was started in whatever checkout was open.
Nothing tied it to a branch of its own, and the review close did not commit it.

**Lesson:** Start a parentless story in its own worktree, on a branch off `main`, and commit it at
review close. Then its lanes measure only its own change, and its acceptance names a commit.

**Refs:** VERIFICATION `@finding-F-01`, `@finding-F-02`; STATE feedback (second session, mid-build).

## R3 · The declared write set left out the ratchet files that every new command touches

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer · **Promoted to:** none

**What happened:** The build had to raise the module-count ceiling (`acd-cli-entry-executes`), the
command count (`packages/core/test/application.test.mjs`) and four rows of the directory budget. None
of those files was in the story's `files:`. `aof test --scope impacted --story 174` then widened to
the whole suite, because 20 of the declared files were new to the graph.

**Why:** The write set was drawn from `aof graph impact` over the existing graph modules. The
standing ratchets that count commands and modules have no edge to a module that does not exist yet.

**Lesson:** When a story adds a command or a module, declare the standing ratchet files in `files:`
at refine (module ceiling, command count, directory budget, CLI inventory fixture). Don't expect
impact analysis to find them.

**Refs:** STATE feedback (declared read/write set incomplete; impacted scope widened).

## R4 · A defaulted refine answer for a user-facing setting got no example, and shipped unlocked

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** qa · **Raised by:** reviewer · **Promoted to:** none

**What happened:** EXAMPLES Q7 (which remote) was settled by default as `graph.remote`, default
`origin`, and never exampled. The review flagged it as story shape. Verify showed the setting works
by fetching through a remote renamed `upstream`, but no scenario locks it.

**Why:** A defaulted answer reads as settled, so no rule was written for it, and without a rule there
is no example.

**Lesson:** A refine question settled by default still needs one example when the answer names a
setting an operator can change. "Defaulted" settles the value, not the coverage.

**Refs:** OUTCOME gap "`graph.remote` naming a remote other than `origin`"; STATE feedback (review close).
