---
type: story
number: 04
slug: the-frozen-set-compiled
title: "The frozen set, compiled — one hand-wired rule becomes a declaration with an enforcement boundary under it"
parent: 55
status: done
owner: product-owner
created: 2026-08-26
updated: 2026-08-27
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 04 · The frozen set, compiled

## User story

As the operator who has to trust a loop that may one day run unattended,
I want the rules the optimizer is **never** allowed to touch written down as a declaration, and
compiled into the enforcement points aof already owns,
so that a frozen rule is something that blocks rather than something an agent is asked to remember —
and so that an attempt to edit one shows up as a coded event instead of quietly succeeding.

This repo has exactly one hand-written proof that the mechanism works: a PreToolUse hook that blocks
unisolated test runs, spliced into a co-authored `.claude/settings.json`. It blocks by exiting 2 with
its reason on stderr, and every failure path inside it exits 0 rather than interfering. One rule,
hand-wired, derived from no declaration.

**And it is wrong in a way that only a declaration can fix.** Its predicate is a substring match on a
path, so it cannot tell running a file from reading one. Refining this milestone, it blocked a
read-only `grep` naming that path, and then blocked the write of `RESEARCH.md`, because the document
quotes the path in prose. A rule that cannot state its subject can only match text about its subject.

## Tasks

- [x] `tasks/00_the-declaration.feature` — the frozen set is a reviewable declaration whose members say what they protect, and a member that names no enforcement point is refused
- [x] `tasks/01_the-permissions-merge-is-surgical.feature` — an operator's permissions entries survive a compile with their values and positions intact, and aof's own are identifiable and retractable
- [x] `tasks/02_a-rule-compiles-or-refuses.feature` — a declared member that cannot reach its enforcement point is a coded refusal, never a warning and never a silent skip
- [x] `tasks/03_tampering-is-a-coded-event.feature` — an edit to a compiled frozen rule is reported as a tamper carrying the member's id, and the human's opt-out remains available and does exactly what it says

## Notes

- **The permissions merge must land BEFORE anything compiles to it, and this is the milestone's one
  real ordering constraint.** `spliceSettings` merges the settings patch by top-level spread —
  `const merged = { ...current, ...settingsPatch }` (`src/claude-settings.mjs:211`) — so a rule
  compiled into `settings.claude.permissions` would **replace the operator's entire `permissions`
  object**. This tree's live file would lose four hand-authored entries
  (`.claude/settings.json:107-124`); an installed repo would lose whatever it had. That is milestone
  43's own `writeLock` defect arriving through the module written to prevent it. ADR-004 §3.
- **The hook path is already correct and is the pattern to extend.** `mergeClaudeSettings` is a
  marker-based surgical splice: aof's entries carry `aofManaged` (`src/claude-settings.mjs:54`), an
  unmarked entry is the operator's and is never adopted or retracted (`:151-153`), retraction reaches
  every event holding an aof entry rather than only the named ones (`:216-219`), and a torn file
  refuses rather than defaulting to `{}` (`:167-180`). Copy this discipline to permissions; do not
  invent a second one.
- **The escape hatch is deliberate and survives.** Removing the ownership marker makes an entry the
  operator's, forever and totally — and the drift-warning says so in its own text. A frozen set a
  human cannot opt out of is a frozen set that owns the human, which inverts the exogenous root the
  whole arc rests on. ADR-004 §5.
- **Tamper is a promotion of a seam that exists, not a new mechanism.** `mergeClaudeSettings` already
  computes `drift[]` for every aof-marked entry whose on-disk value differs (`:240`). What the frozen
  set adds is the distinction between drift on a *preference* and drift on a *frozen rule* — the
  first is a warning, the second is a tamper with a member id.
- **The fourth enforcement point is declared and not compiled to.** The mesh worker envelope's argv
  seam (`src/agent-session-driver.mjs:689`) gets a spelling in the declaration's vocabulary so the
  mesh arc and milestone 63 have a name to use, and nothing compiles to it here. Declaring without
  compiling is `53/ADR-006`'s own honest pattern; a silent omission is not. ADR-004 §2.
- **Whether the guard's read-vs-run false positive is fixed here or ledgered is this story's call at
  build time.** What the milestone fixes is that the rule now has a declaration to be narrowed in.
  If it is ledgered, ledger it — it is a live, twice-measured defect.
- **Parallel-eligible.** `src/claude-settings.mjs` has 9 dependents of which four are production
  install doors, and no other story in this milestone writes it. `src/bundle/bundle.json` and
  `manifest.json` are append-only registration hubs shared with 55/00 — appends at different points
  are not a semantic conflict. ADR-007 §4.
