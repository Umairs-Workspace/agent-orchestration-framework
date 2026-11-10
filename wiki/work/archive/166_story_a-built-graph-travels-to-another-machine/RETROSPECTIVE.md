---
doc: retrospective
promotionFrom: 1
---
# 166 · A built graph travels to another machine — retrospective

## R1 · The plan promised a cached rebuild without timing one on the real corpus

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** PLAN.md said that carrying graphify's cache and re-keying it to the clone's line
endings would make the next `aof graph build` report `unchanged: true` with no new cache entry (E5).
Refine measured the cache's key formula byte for byte. It never timed a build. On this repo,
`graphify update <root>` re-extracts the whole corpus on every run, and graphify 0.8.44 never serves
JS/TS from its cache, so the first real build after an import took 237 s against 232 s for a full
build.

**Why:** Refine measured the shape of the artifact (keys, paths, line endings) as if that
determined the behaviour. Whether a cache shortens a build depends on how the tool consumes the
cache, and one timed build over the real corpus would have shown it.

**Lesson:** When a scenario's pass rests on a third-party tool's caching or incremental behaviour,
refine runs the tool once, timed, on the real corpus, and records the number beside the claim. A
measured format is not a measured behaviour.

**Refs:** VERIFICATION.md F-01; PLAN.md "Re-key"; m11/R4 (verify a wrapped tool against its
corpus shape at refine).

## R2 · A measured failure of the story's own scenario went to review as a note

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** The build measured E5 failing: 4m35s, with every `.mjs` re-extracted. It
recorded that in STORY.md Notes, addressed "for verify", then ticked every task and moved the story
to `in-review`. Verify ran the scenario, failed it, and had to redesign the build path inside the
item.

**Why:** The note read as a known limitation rather than a red contract. Nothing at the review gate
compares the `@manual` scenarios against what the build itself measured.

**Lesson:** A build that measures its own contract scenario failing stops there and raises it: a
blocker to the operator, or NEEDS_INPUT under the loop. It never ticks the task and never moves the
story to `in-review` carrying a note.

**Refs:** VERIFICATION.md F-01.

## R3 · The build's sweep missed census guards that scan the tree instead of importing

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** The new `graph-bundle.mjs`, `graph-export.mjs` and `graph-import.mjs` tripped two
guards that no build lane selected:
- the extracted-kernel import allow-list in `test/bundle/yarn-installation.test.mjs`
- the graph-reader allow-list in `test/arch/graph/acd-codebase-grounding-no-parse.test.mjs`

Both were red on the build as handed in. Verify's first sweep, selected by importers, missed them
too. They surfaced only when the sweep widened to every test naming the graph services.

**Why:** These guards find their subjects by scanning `packages/**/src`, not by importing the
changed module. An importer-based selection can never reach them.

**Lesson:** A story that adds a source module to an extracted package selects the tree-scanning
census suites as well as its importers: the package boundary (`yarn-installation`), the runtime
audit (`core-workspace`), and any allow-list that names files of the module's kind. It also
declares them in `files:` when the new module has to be registered there.

**Refs:** VERIFICATION.md "Importer sweep"; m161/01/R1 (same class, one package over).

## R4 · The WSL deploy failed on every run for a month, and nothing noticed

**Kind:** blocker · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** Verify's cross-machine scenario needed the WSL deploy. `scripts/deploy-wsl.sh`
had copied `$SRC/bin/aof.mjs` on every run since 142, when the workspace move took `bin/` away from
the repo root. Every deploy since then had stopped at that copy, so the WSL node was still running
the pre-142 tree. The deploy was fixed in this item (F-03).

**Why:** No test exercises the script, and its only consumer is an operator-run deploy whose failure
reads as "the WSL node is down", not as "the deploy is broken".

**Lesson:** A deploy script that copies named paths from the tree needs a check that each of those
paths exists in the tree. A repo-wide move that deletes one turns that check red in the same commit,
instead of a month later at someone else's verify.

**Refs:** VERIFICATION.md F-03; m138/02/R2 (a deploy path's first dependency is the first test of
its reinstall branch).
