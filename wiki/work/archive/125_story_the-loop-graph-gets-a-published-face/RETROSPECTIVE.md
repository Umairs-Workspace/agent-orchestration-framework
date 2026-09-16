---
doc: retrospective
updated: 2026-09-13
---
<!--
  Story RETROSPECTIVE.md — the lessons from HOW this story was built and gated, not what it
  delivered (that is OUTCOME.md) and not what was found (that is VERIFICATION.md, referenced here
  and never restated). One `R<n>` per lesson, appended, never renumbered.
-->
# 125 · The loop graph gets a published face — Retrospective

<!--
  Inputs: STATE.md `## Feedback (for retro)` (one architect note, 2026-09-12), the findings
  register in VERIFICATION.md (F-125-A), the STORY.md notes the build and review appended, and
  the observability snapshot `observability/snapshots/2026-09-13T21-03-08-878Z/report.md`
  (session eb595bba, which drove this story's build and review AND story 128's — the per-agent
  rows are attributed by task name, and only 125's are read here). Observability is git-ignored;
  the snapshot path is cited so the numbers can be re-derived, not so they can be read from git.
-->

## R1 — a directory can be frozen by a control, and the budget table does not say so

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** refine (files: declaration)
- **Raised by:** architect, 2026-09-12 (`STATE.md` feedback; `FEEDBACK.ndjson` fb8b75c6)

**What happened.** Refine placed both of this story's arch controls under `test/arch/bundle/`.
124/02's FF-12405 leg 10 freezes that directory's parity controls at 23 with a ceiling that may
only fall, so the build reddened the moment the files landed and had to re-home them —
`acd-readme-names-what-ships` to `test/arch/command/`, `acd-site-is-projected-not-copied` to
`test/arch/loop/`. The wrong home cost five edits before the move (`arch/bundle/…` ×5 in the
developer's hot-file row). **Refs:** `STORY.md` *Two controls re-homed at build*; the
`test/arch/bundle`, `test/arch/command`, `test/arch/loop` rows of
`test/arch/testing/acd-source-directory-budget.test.mjs`.

**Why.** The budget table is the surface refine reads to place a file, and its rows say a
ceiling may be RAISED with a reason. A freeze declared by another milestone's fitness function is
a second constraint over the same directory that the table did not carry until this story's
build wrote it into the row's `why`.

**Lesson.** Place by SUBJECT first — a control on the route table is a `command` control, a
control sharing its predicate with `acd-loop-document-current` is a `loop` control — and check
BOTH the budget row and any freeze control naming the directory before writing `files:`. The
budget row now records the freeze; the next refine reads it there.

## R2 — Jekyll is two processors, and "published as authored" had named one

- **Kind:** near-miss · **Area:** contract · **Stage:** build · **Owner:** the build, at review
- **Raised by:** the review round, 2026-09-12 (`STORY.md` *The Liquid guard*)

**What happened.** Refine settled that Mermaid does not render itself on Pages and designed the
layout's promotion for it. It did not settle that Liquid runs over every page body before
kramdown: the Mermaid hexagon nodes at `wiki/work/loops.md:47-49` are `{{ … }}`, which Liquid
consumes, and Jekyll 3 on the Pages image has no `render_with_liquid` to switch it off. The build
wraps every staged body in `{% raw %}…{% endraw %}`, and task 01's *published as authored* clause —
which had admitted only front matter and provenance as the bytes the build may add — was amended
at review to name the guard as the third and last. **Refs:** `tasks/01` scenario *an authored page
is published as authored*; VERIFICATION evidence row *the build as the workflow runs it*.

**Why.** The refine question was "what does GitHub render that Jekyll does not?" (Mermaid). The
symmetric question — "what does Jekyll process that GitHub does not?" (Liquid) — was not asked,
and the source document happened to contain the one syntax Liquid eats.

**Lesson.** When publishing arbitrary committed Markdown through a static-site generator, list
every processor in its pipeline and ask of each what it ADDS and what it REMOVES; a clause that
enumerates "the only bytes the build adds" must be written against that list, not against the
renderer alone. A contract clause amended at review is the honest outcome here — the alternative
was a green suite over a page missing three nodes.

## R3 — an `@uat` whose `Given` is an owner action outside the repository

- **Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** the verify gate
- **Raised by:** the product owner, 2026-09-13 (`@finding-F-125-A`)

**What happened.** Both `@uat` scenarios rest on the repository's Pages source being set to
GitHub Actions and one deploy from `main` — neither of which the story, the branch or any agent
can perform. At the first gate both were measured absent at the source (`gh api /pages` → 404;
`pages.yml` not on `main`), the accept was held rather than taken on the green `@executable` lane,
and the README's Pages URL — already in the tree — 404ed. The same day the tree became the public
repository's root, Pages was enabled, the push deployed, and the operator signed both against the
live site. **Refs:** `@finding-F-125-A`; VERIFICATION `## User sign-off`; `PLAN.md` *The
verification step* ("the live site is the one thing no test can assert").

**Why.** The story shipped a claim about an external system's state (a URL) that no control in
the repository can check — task 02's control resolves commands, not addresses — and the
precondition that makes the claim true is a repository setting, not a file. The plan named it;
the gate had to be able to HOLD on it rather than write it up as pending and accept.

**Lesson.** For a story that publishes to an environment: measure the `@uat` preconditions at the
source before anything is spawned, put the decision (hold / accept with an open finding / do it
now) to the operator, and treat a hold as a single deferred close — retrospective and outcome
land with the accept, not before it. A README claim that only an external fetch can check is
checked by fetching it, at the gate, and recorded as such.

## R4 — the build finished and then waited four and a half hours for its own fix round

- **Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** the coordinating session
- **Raised by:** `aof work observe 125`, 2026-09-13 (snapshot cited in the header)

**What happened.** The developer agent reached *Build complete* at 2026-09-12 18:47Z and sat idle
**4h25m** until the coordinator's *Story 125 fix round* message arrived. The story's calendar span
was 5h22m against 2h16m of real active time; the session's dead air (main thread quiet, nothing
driving, no human asked) totalled 1h48m, its waits for a human 47m. **Refs:**
`observability/snapshots/2026-09-13T21-03-08-878Z/report.md` §Stalls, §Lost time.

**Why.** The main session drove two stories' builds and reviews in one sitting; while it turned
to 128, 125's finished builder held an open session with nothing to do and nothing watching it.
The stall is the known class — a finished or dropped agent with no watchdog — and it is the
wall-clock cost of that class made concrete on one story.

**Lesson.** A builder that reports *Build complete* should be closed or handed its next round in
the same beat; an agent left open between review and fix is idle spend with a session attached.
The durable fix is the stall watchdog the loop still lacks; until it lands, the coordinator's
rule is: finish the round or end the session, never park it.

## R5 — a dependency discovered mid-build has no `depends:` home

- **Kind:** misunderstanding · **Area:** process · **Stage:** build · **Owner:** the work-stream model
- **Raised by:** the build, 2026-09-12 (`STORY.md` *Raised 128; accept it first*)

**What happened.** Task 02's control found `aof work memory` — five true README lines — absent
from `deriveRouteTable`, an unrouted ladder door left by 42. Story 128 was raised to route it, and
this story's control could only go green with 128's code in the tree. The dependency could not be
declared: 125 was already `in-progress` when 128 existed, and `aof work doctor` refuses working
ahead of an unmet `depends:` edge. It was recorded as a note and enforced by accepting order — 128
first, 125 after. **Refs:** `STORY.md` notes; 128's `OUTCOME.md` *125's README control, green*.

**Why.** `depends:` is a scheduling edge evaluated before a story starts; it has no form for
"discovered while building, needed before accepting". The doctor's refusal is correct for the case
the edge was designed for and unhelpful for this one.

**Lesson.** When a control reveals a defect in another item's territory, raise the item and record
the accept-order constraint in the story's notes, as here — and note that the stream model has no
edge kind for it. The honest state is "green only with N in the tree", written where the verify
gate reads it.
