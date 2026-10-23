---
doc: retrospective
promotionFrom: 1
---
# 169/00 · Hyperagent plans the work — retrospective

## R1 · A contribution that can carry verbs but not assets splits every integration in two

**Kind:** mistake · **Area:** architecture · **Stage:** build (assimilate) · **Owner:** architect · **Raised by:** operator (review) · **Promoted to:** none

**What happened:** The Hyperagent integration shipped as two halves. Its four CLI verbs live in
`packages/integration-hyperagent`. Its prompts (`hyperplan`, `aof-prd`, `AGENT.md`, the six planning
variants and a Codex section) live in `packages/core/assets/`. For its runtime row, `model.mjs`
imports the package. STATE recorded "the package owns code, not prompts" as a decision, and the
operator rejected it on review.

**Why:** The contribution object (`createXContribution`) was the only way a package could plug
into core, and it can carry CLI verbs only. The bundle loader reads core's own `bundle.json`
through core's asset root, and `RUNTIMES`/`CAPABILITIES` are fixed tables. The build took the
paths that already existed instead of widening the seam.

**Lesson:** When a feature does not fit the existing seam, widen the seam in the same item rather
than splitting the feature across owners. "Where does this live?" should have one answer: the
package. A STATE decision that records a workaround for a missing seam is a finding, not a
decision.

**Refs:** STORY.md F-1; ../../SPEC.md Scope (self-contained integration packages).

## R2 · A Windows-only defect shipped because the branch was built and tested in a POSIX sandbox

**Kind:** mistake (defect) · **Area:** code (platform) · **Stage:** build (assimilate) · **Owner:** developer · **Raised by:** QA (assimilate) · **Promoted to:** none

**What happened:** `check.mjs` builds `checkout-index --prefix=` from `path.join(...) + path.sep`.
On Windows the prefix ends in `\`, git splits leading directories on `/` only, and the extraction
fails. The package suite's own check case is red on this machine (79/80). The branch's
Verification section listed its reds as environmental, but the sandbox could not have shown this
one.

**Why:** The branch was written by Hyperagent in a Linux sandbox, and nothing ran it on Windows
before review.

**Lesson:** A path handed to git as text uses forward slashes. Run a remote agent's branch on the
operator's platform before calling its reds environmental.

**Refs:** STORY.md F-2; packages/integration-hyperagent/src/check.mjs:57.

## R3 · The live plan run found the defect every green fixture hid

**Kind:** mistake (defect) · **Area:** code (integration) · **Stage:** verify · **Owner:** developer · **Raised by:** verifier (E8) · **Promoted to:** none

**What happened:** `check` was green in every suite, yet the first real plan branch (draft PR #18)
checked red on 630 `reads:` findings. The verb validates a tree extracted with `checkout-index`,
which has no `.git`. Validate resolves a moved citation through `git log` renames, so every rename
since the public-root cut was lost (169 F-07). The suite's fixture repository had no renamed
citations, so it could not show this.

**Why:** The fixture held a fresh stream. The real stream carries hundreds of delivered stories
whose `reads:` name moved files, and only the real one exercises the history-dependent rule.

**Lesson:** A verb that runs validate somewhere other than the checkout must hand over everything
validate reads at the project root: the files, and also the git history. Accept a planning
integration on a run over the real stream, not over a fixture alone.

**Refs:** ../../VERIFICATION.md F-07; packages/integration-hyperagent/src/check.mjs; packages/work/src/commands/validate.mjs.
