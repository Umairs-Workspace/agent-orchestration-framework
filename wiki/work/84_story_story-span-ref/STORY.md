---
type: story
number: 84
slug: story-span-ref
title: "A story span is a ref — it names a slice of a milestone, and never accepts it"
status: done
owner: product-owner
created: 2026-08-27
updated: 2026-08-27
depends: []
schema: 1
aofVersion: 0.1.0
reads: [src/work.mjs, src/work-ref-scope.mjs, src/work-loop.mjs, src/commands/find.mjs, src/commands/next.mjs, src/bundle/commands/continue.md, test/work-story-span-scope.test.mjs, test/arch/acd-session-driver-mesh-blind.test.mjs, test/support/story-depends-fixture.mjs]
files: [src/work.mjs, src/bundle/commands/continue.md, src/bundle/manifest.json, scripts/test.mjs, test/work-story-span-scope.test.mjs]
---
# 84 · A story span is a ref

## User story

As an operator continuing a milestone whose stories do not all want driving at once,
I want to name a slice of them — `aof:continue 44/01-03` — and have the framework drive exactly that
slice under the milestone's own dependency rules,
so that choosing to build three of six stories stops being a choice between two wrong commands, and
the framework can hold me to the boundary I named instead of quietly redrawing it.

## Why

The ref vocabulary admitted a milestone and a single story and nothing between them, so an operator
who wanted three of six stories had two options and both were wrong:

- **Type the milestone.** `aof:continue 44` continues *every* story — by design, and stated three
  times in its own prompt ("never one slice", "the exact defect this lane exists to refuse"). Correct
  behaviour, wrong scope.
- **Type each story in turn.** `44/01`, then `44/02`, then `44/03` — which loses the thing the
  milestone walk exists to provide: the dependency answer between them, the ready-set ordering, and
  the write-disjoint wave. Three serial commands, each blind to the other two.

The gap was measured, not assumed: `aof work find "44/01-03"` answered `[]` (the ref fell through to
the free-text slug branch), while `aof work next "44/01-03"` was worse — `inRange` returned
`() => true` for any shape it could not parse, so the scope was **silently discarded** and the walk
answered for the whole stream, returning an unrelated UAT session from another milestone.

The rule that makes the form safe to hand to `aof:continue` is that **a span never accepts**: the
stories outside it were never looked at, so finishing `44/01-03` on a milestone whose story 04 nobody
has built must not report "44 is ready to accept" and send an operator to `aof:verify` on unbuilt work.

## Scope

Two surfaces admit the form, and deliberately only two — the ones `aof:continue` uses:

| surface | what the span means there |
|---|---|
| `aof work find` (`findWork`) | resolve the typed ref to its story rows, in walk order |
| `aof work next` (`nextWork`) | scope the walk: this driver, these stories, no driver-grained offer |

**NOT extended, and the two reasons are not the same kind of reason:**

- `aof work loop` keeps its frozen `LOOP_SCOPE_FORMS` guard, which refuses story refs outright
  (`44/01-03` → `loop-scope-unsupported`). This one IS a design boundary: the loop drives whole
  milestones *through acceptance*, and a slice cannot be accepted. `aof:autonomous` therefore still
  takes `NN-MM` (drivers) only.
- `work-ref-scope.mjs`, the subtree-scope leaf, is untouched — and this one is **ledgered drift, not
  design.** The change and its test header framed it as a third deliberate vocabulary; the architect
  corrected that, and the correction is recorded here rather than in the frozen change set.
  **TECH_DEBT item 49** ("THREE independently-written scope parsers, and the one the loop depends on
  fails OPEN", `TECH_DEBT.md:2625`) already names `nextWork` on its consumers-to-migrate list. Story
  80/02 discharged three of four; `inRange` was left behind for a hard constraint — `src/work.mjs`
  cannot import the leaf, because the session driver's reach measures the ADR-015 §5 ceiling of **24
  exactly**, so FF-5301 reddens on the import alone. This story adds a fourth admitted form to the
  un-migrated parser. The placement was forced; the framing was wrong.

## Tasks

- [x] `tasks/00_a-span-resolves-to-the-stories-it-names.feature` — the typed ref resolves to its story
      rows in walk order, bounded by both ends and by its driver, without disturbing the existing forms.
- [x] `tasks/01_a-span-scopes-the-walk-and-never-accepts.feature` — the walk offers only in-span
      stories, keeps the milestone's own dependency answer, and makes no driver-grained offer.

## Findings

Architect: **SOUND WITH FINDINGS** — the walk is correct, and the two things easiest to get wrong (the
candidacy interaction at the suppressed offers, the deliberate non-narrowing of the sibling gate) are
right for the right reasons and pinned. QA: **GAPS** — suite green (12/12) and non-vacuous, every
`@executable` AC maps to a lane; the gaps are at the edges the contract did not reach.

No finding is a **Blocker**. Nothing below was fixed here — `aof:assimilate-code` governs a change, it
never writes one, and the change set was left exactly as committed (`830e4f9`).

| id | finding | severity | routed |
|---|---|---|---|
| F1 | `inRange` still **fails open** on every unparsed shape (`src/work.mjs`, the trailing `return () => true`) | Important | follow-up story |
| F2 | `skippedEntries` is span-blind (`src/commands/next.mjs:222-239`) | Important | follow-up story |
| F3 | Nothing pins the `continue.md` span branch — it could be deleted and the suite stays green | Important | follow-up story |
| F4 | `continue.md` difference #1 overstates what the walk answers | Nit | follow-up story |
| F5 | The reach-ceiling comment this change cites says 21; it is 24 | Nit | follow-up story |
| F6 | Two Scenario-Outline rows assert only their first `Then` | Nit | follow-up story |
| F7 | The command face and cache-first seam are untested for spans | Nit | follow-up story |
| F8 | TECH_DEBT items 49 and 27 need amending; the `work.mjs` ratchet deadlock needs a new item | Important | TECH_DEBT |

**F1 — the fail-open is pre-existing, and this change makes it more reachable.** Measured on a live
fixture, not inferred: with milestones 44 (stories 01–03) and 45 present,

| scope typed | `readySet` returned |
|---|---|
| `44/01-03` | `44/01, 44/02, 44/03` ✅ |
| `44/01` | `44/01, 44/02, 44/03, 45/00` ← walked into milestone 45 |
| `44/01-03x` | `44/01, 44/02, 44/03, 45/00` ← a one-character typo |
| `44/01–02` (en-dash) | `44/01, 44/02, 44/03, 45/00` ← any markdown/Slack autocorrect |

`inRange` returns `() => true` for anything it cannot parse, so the scope is **silently discarded** and
the walk answers for the whole stream. `findWork` answers `[]` for the same strings, so the two surfaces
disagree. This is TECH_DEBT 49's fail-open and predates the change — but the change teaches operators a
story-grained scope vocabulary that is only half-implemented, so the natural next keystroke
(`aof work next 44/01`) now hands out another milestone's work. This is the same defect class the story's
own feature narrative says it replaces, which makes leaving it un-named the worst option.

**F2 — a finished span can report held drivers it does not name.** `namedDriver` (`next.mjs:229`) is an
exact top-level ref match, which a span never satisfies, so the walk falls to the driver-grain-across-
the-stream branch. A finished `44/01-03` with an unrelated milestone 12 held elsewhere renders
`Nothing free in 44/01-03 — everything actionable is being worked elsewhere: 12 …`. Inherited from the
documented "nuisance" over-reporting for `NN-MM` ranges, but a span is strictly worse: a range may
cover many drivers, so "we cannot tell which you meant" is honest — a span **always names exactly
one**, and it sits in the parsed scope, unreachable only because the face parses scope with its own
vocabulary. Manifests only with mesh item-locks active, which is why no test caught it.

**F3 — the prompt lane is unguarded.** No test references the span form or any new `continue.md` prose:
the whole branch could be deleted and all 12 lanes plus the manifest test stay green (the hash detects
*change*, not the *claim*). `test/work-dispatch-lanes.test.mjs` lane `dispatch/02` already asserts this
same file's prose for presence *and* absence, so three of the `@manual` scenario's four `Then`s are
assertable today — tagged `@manual` because nothing asserts them, not because nothing could.

**F4** — difference #1 claims `aof work next <NN/MM-PP>` "answers with only the in-span stories". False
for the driver-blocked path, which answers `{state: "blocked", ref: "44", type: "milestone"}` — correct
(pinned by `span/10`), but a shape the prompt gives an agent no rule for.

**F5** — `src/work.mjs:942` states the ADR-015 §5 ceiling as **21**; it is **24**, saturated. Stale
before this change, newly load-bearing because the new parser's comment points readers at it.

**F6** — the no-stories-driver outline asserts its second `Then` (the control proving *suppression*
rather than an empty stream) for the uat and bare-milestone rows only. Probed true, so untested-not-broken.

**F7** — all 12 lanes bind `findWork`/`nextWork` directly; nothing drives the commands or the cache-first
seam with a span, though the Scope table promises the *commands*. Probed working end to end.

**F8 — the ledger.** Item 49's stated fix (a leaf imported by `nextWork`) is **unbuildable at HEAD**:
reach is 24 of 24, so importing *any* leaf reddens FF-5301 — it is blocked on an ADR raising that
ceiling, and `skippedEntries` is a fifth parser the item does not name. Separately `src/work.mjs` is in
a **ratchet deadlock**: `lines < 1210` demands shrinkage while reach-24 forbids the extraction that
would achieve it. Measured: 1,209 at the ratchet → 1,286 → 1,339 → **1,405** here; three consecutive
merges grew it, +196, none reported it. Item 61 records the same shape for `phase-brief.mjs`.
