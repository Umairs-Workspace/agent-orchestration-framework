---
doc: retrospective
promotionFrom: 1
---
# 05 · The public work verbs and loop are verified against a board — retrospective

## R1 · A new suite landed in a budgeted directory without its row

**Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** product owner (verify) · **Promoted to:** none

**What happened:** 05 added `test/golden/board-workflow.test.mjs` and registered it, which took `test/golden/` to 17 counted children against a ceiling of 16. The row was not raised, and the budget suite was not in `files:`. FF-11904 went red at verify, and task04 moved the cases into `work-stream.test.mjs`.

**Why:** The story's declaration listed the product and fixture files it expected to touch, not the control that budgets the directory a new suite joins.

**Lesson:** When a story adds a file under a budgeted directory, declare `acd-source-directory-budget.test.mjs` in `files:` and run it before review. Better still, add the cases to the lane suite whose verbs they run.

**Refs:** VERIFICATION `@finding-F-02`; 209/05 task04.

## R2 · Story-scoped verify missed whole-tree controls broken by sibling stories

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product owner · **Raised by:** developer · **Promoted to:** none

**What happened:** The first verify ran `--scope file` over the declared files. It missed three reds owned by uncommitted 209 work: FF-12607 (an unpinned sixth preflight code), workspace-boundaries (stale audit stamps on `dispatch.mjs`, `loop.mjs` and `desktop-preflight.mjs`) and FF-16004 (`work find` at 764 modules). Only task04's widened run found them. At the second verify pass, the full `test/arch` sweep (558 suites, 2,835 cases) ran in minutes and was green.

**Why:** Those controls pin registries and audited call sites that several stories edit, so no single story's declared files select them.

**Lesson:** When a milestone edits a registered verb, a preflight list or an audited spawn site, include the whole `test/arch` sweep in story verify. It is cheap, and it catches what a declared-file selection cannot.

**Refs:** STATE `## Feedback (for retro)` (209/05 task04); VERIFICATION, second-pass evidence.

## R3 · The public-verb replay found five store defects the store's own story missed

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** Replaying the 150 captures over the board found five board-mode defects in 02's store: wrong defaults for a record with no title or status, board-only refusal wording, doctor flagging every published item, and `renumber` and `insert-story` failing after moving folders locally. All five were fixed in 05's build.

**Why:** 02's scenarios exercised store operations and publication directly, not the public verbs that call them. The replay that would have caught these was scheduled three stories later.

**Lesson:** A story that ships a new `WorkItemStore` should run at least a sample of the public-verb captures over it in its own build, so the conformance story confirms the store rather than repairs it.

**Refs:** STATE `## Feedback (for retro)` (209/05 replay); 205 OUTCOME.

## R4 · The live run waited a whole verify pass for an approval nobody had asked for

**Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** product owner · **Raised by:** product owner · **Promoted to:** none

**What happened:** Refine settled where the run would happen (209/05 Q1: a new test project in `umair-butt`), but not permission to create it. The first verify's provisioning was refused as an action in the operator's Azure organization, so 05 stayed open. Once asked, the operator approved in one line, and provisioning plus the run took minutes.

**Why:** Choosing a target and approving an outward-facing change to an account are different decisions, and only the first was asked.

**Lesson:** When a `@manual` scenario needs something created in the operator's own account or organization, ask for the go-ahead at refine, in the same question that picks the target, and record it in STATE.

**Refs:** VERIFICATION, 209/05 live run; STATE `## Notes & decisions in flight` (209/05 Q1).
