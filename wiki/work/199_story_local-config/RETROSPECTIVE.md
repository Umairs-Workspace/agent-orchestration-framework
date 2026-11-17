---
doc: retrospective
promotionFrom: 1
---
# 199 · Each person keeps their own settings in an uncommitted local config — retrospective

## R1 · An audited file was edited, and a red that was already expected hid the new offenders

**Kind:** mistake (recurring) · **Area:** process (delivery) · **Stage:** build · **Owner:** developer · **Raised by:** product-owner · **Recurs:** 193/02/R1 · **Promoted to:** none

**What happened:** 199 edited `config-inspect.mjs` without re-stamping its three entries in
`scripts/workspace-runtime-audit.json`. 199 also added a `git ls-files` probe to `work/doctor.mjs`
with no audit entry. `workspace-boundaries/all actual owners are scanned…` was already red on three
mesh entries that 3562430f had left stale, so four new offenders landed in a case everyone expected
to be red. Verify found them only by diffing the case's message at 3562430f against 5d1ac698.

**Why:** 193/02/R1's lesson, to run the boundary check whenever an audited file is touched, stayed
a lesson and was never made a prevention, so it recurred the next time `config-inspect.mjs`
changed. A red that is already expected also hides anything new: a name-level comparison
("this case was red before") cannot tell an unchanged red from a deepened one.

**Lesson:** Before a build, grep the audit for the story's `files:`, and plan the re-stamp and
any new entry into the story. When a case was already red, judge it by its message against the
baseline commit, never by its name. Fix a cheap pre-existing red in a shared control, such as a
re-stamp, rather than living with it, because while it stays red it hides every later offender.

**Refs:** `@finding-F-03`, `tasks/04_the-runtime-audit-covers-every-child-process-199-touched.feature`, `m161/F-05`

## R2 · A contradicting Examples row was worked around in the test instead of restated

**Kind:** misunderstanding · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** In task 01, the edges outline expected the refusal at
`work.agents.session.models`. E8 and the rule refuse at the leaf written. The developer saw the
contradiction and recorded it as feedback, then loosened the assertion to read "at" as "at or
within", so a row known to be wrong reached verify with a looser test.

**Why:** A contract is locked at build, and flagging a tension felt like enough. A loosened test,
though, accepts both readings, so the row's error was never surfaced as a failure anyone had to
decide.

**Lesson:** When a row contradicts its own rule, raise the row as a contract question and keep the
test exact, so it fails on the wrong row until the row is restated. Never widen an assertion to
admit both readings.

**Refs:** `@finding-F-01`, `tasks/01_the-local-file-holds-only-per-person-keys.feature`

## R3 · The declared files: missed every control that pins a count about the touched files

**Kind:** near-miss · **Area:** process (delivery) · **Stage:** refine · **Owner:** product-owner · **Raised by:** developer · **Promoted to:** none

**What happened:** `files:` was short by fifteen paths at build. They included four arch tests
whose ceilings or pins moved by exactly the new leaf (the contracts budget, FF-16004's module
count, FF-5905, the lane order), the command inventory, three messaging refusals and the runtime
audit. It also named a test file that was never created, because its directory was at budget.

**Why:** Refine declared the modules the change was about, not the controls that measure those
modules. Every new leaf moves a count somewhere, and those counts live in arch tests that name
the modules indirectly.

**Lesson:** At refine, grep `test/arch` and the runtime audit for each declared source path and its
directory, and declare every control that pins a count or digest about them. Check a planned new
test file against its directory's budget before naming it.

**Refs:** `@finding-F-02`, `m127/F-05`, `m119/F-30`
