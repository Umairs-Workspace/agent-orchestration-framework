---
doc: verification
updated: 2026-09-04
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 86 truly done, and what is the evidence?
  Written at aof:verify 86. Only sections with content appear (absence is information).
  Standalone story (parent: null) → this is the story's own verification record; there is no milestone
  SPEC box to tick. It carries an OUTCOME.md and a RETROSPECTIVE.md by story 80's delivered rule.
  NO @uat scenarios → no ## User sign-off section (no human was pestered).
  NO UI surface (a @cli + @docs concern, no DESIGN.md, no Route) → the design-conformance lane was not
  entered, no render was attempted at any breakpoint, and no ## Design conformance section appears.
  NO ## Fitness functions register → story 86 is standalone and declares no ARCHITECTURE.md, so it
  declares no `FF-NN` id for a citing register to resolve to. The controls it had to keep green belong
  to other milestones and are recorded in evidence, against the run that armed them.
-->
# 86 · The span vocabulary, completed — Verification

## Method

Lanes in scope: **`@executable` only**. The three task features carry **28 `@executable` scenarios**
counting each Examples row (`tasks/00` fourteen, `tasks/01` three, `tasks/02` five including the
outline's three rows), and **zero `@manual`, zero `@uat`**. No human was brought in, and no agent-run
procedure was owed — every claim this story makes is machine-checkable, which is what the three
features were shaped to be.

The suite was run **focused**, never as the whole repo lane: `global-work-propagation.test.mjs` binds
`:4182`, which this machine's live control daemon holds, so a full run on this node is a known false
signal. Selection was by `node scripts/test.mjs --only <file …>`, so the runner's own `runSuite()`
executes what the named files export. Every run carried a throwaway `AOF_GLOBAL_HOME` (hook-enforced).

Selection was scoped to the story and widened only by **who reads what this story touched**: its own
lane, the six suites that drive `nextWork` / `next.mjs` (the two functions this story changed), and the
whole `test/arch` tree — which is more than a standalone story owes, and is what surfaced finding
`D-01` below.

The story's code is **uncommitted on `loop-execution-record`** at the time of this gate. Measured
footprint: **75 insertions / 11 deletions across two `src/` files** — `src/work.mjs` (+60/-11:
`parseStorySpan` exported and widened to admit `NN/SS`, plus `inRange`'s refusal) and
`src/commands/next.mjs` (+26/-3: `skippedEntries` resolving a span to its one driver) — plus **321
lines added** to `test/work-story-span-scope.test.mjs`, which is the story's declared home and was
already registered in `scripts/test.mjs:2508`. Nothing outside the three files in `files:` was written.

## Verification evidence

### Automated — the story's own scenarios: **28 / 28 green, 0 failures, exit 0**

```
AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only test/work-story-span-scope.test.mjs
```

Every `@executable` scenario in all three features is covered, one lane per scenario or Examples row:

- **`86/00` — the refusal, 19 lanes.** `verifies → tasks/00`. Lane `span/13` runs the refusal
  outline's five rows individually and each names the shape it refuses: `44/01-03x` (a trailing
  character no admitted form has), `44/` (a story grain that then names no story), `44/01-` (a span
  missing its upper bound), `44/01-02-03` (a third bound no span carries), and `44/01–02` (**U+2013 EN
  DASH — one invisible codepoint from a legal span**). Lane `span/14` is the bare-ref scenario
  including its third `And`: `44/01` scopes to that story and **does not offer the milestone itself for
  acceptance**. Lane `span/15` is the seam scenario — `find` and `next` are driven with the same five
  shapes and neither answers with an item the other excludes. Lane `span/16` is the untouched-forms
  outline, and it carries the row that guards the refusal's width: **`44/03-01`, the descending span,
  still parses and still admits nothing** — a refusal drawn one character wider would have swallowed it.
- **`86/01` — the command face, 3 lanes.** `verifies → tasks/01`. `span/17` is the motivating symptom:
  a **finished** span with an unrelated driver held on another node answers `done` and does not name
  that driver. `span/18` is the other half — a span whose **own** driver is held still reports it and
  names the holder, so the fix narrows the report rather than silencing it. `span/19` pins the
  documented over-reporting a driver **range** keeps, which the contract explicitly declined to change.
- **`86/02` — the prompt pin, 6 lanes.** `verifies → tasks/02`. `span/20` reads the shipped
  `src/bundle/commands/continue.md` and asserts it dispatches on a story span and scopes the walk to
  it; `span/21` runs the obligations outline's three rows separately (the ref is never widened
  mid-walk, an out-of-span dependency stops the walk, the milestone status is neither moved nor
  accepted); `span/22` is the **non-vacuity** scenario — the same assertions applied to a copy of the
  prompt with the span branch cut out, expected to throw. The pin is asserted to fail, not merely to
  pass.

### Automated — the lanes that drive the two changed functions: **104 / 104 green, 0 failures, exit 0**

```
AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only \
  test/work-next.test.mjs test/work-next-ready-set.test.mjs \
  test/item-lock-next-skips-held.test.mjs test/work-spike-chore-next.test.mjs \
  test/work-story-depends.test.mjs test/work.test.mjs
```

This is the widening the change actually earns, and it was chosen by reading who calls what: `inRange`
is `nextWork`'s scope predicate and `skippedEntries` is the `next` command face's held-driver report,
so these six are every suite in `test/` that drives either. `item-lock-next-skips-held.test.mjs` is the
one that matters most — it owns the held-driver behaviour `86/01` narrowed — and it is green
**unchanged**, so the narrowing did not cost the report any of its existing claims.

### Automated — the whole `test/arch` fitness-function tree: **1711 / 1718, 7 red**

```
AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only test/arch/*.test.mjs   # (list expanded)
```

**Exactly one of the seven is this story's, and it is a control that was BUILT to go red here.** The
other six are present at HEAD with none of their subject files touched by this change set — verified by
reading each failure's own text against the diff, which is two `src/` files:

| red | subject named in its own failure text | attribution |
| --- | --- | --- |
| `acd-chore-dod-checklist` (FF-3706) | `97_chore_…/CHORE.md` carries no `## Definition of Done` | chore `97`'s own record, committed at HEAD |
| `acd-command-layer-imports-downward` ×2 | `loop-record-render.mjs → commands/loops-graph.mjs` | the 78/79/81 loop-execution-record commit |
| `acd-controls-never-execute` (FF-5905) | a seventh doctor lane module, `./work-doctor-loop-record.mjs` | story `78/03`; already scheduled by chore `106` |
| `acd-declared-writes-include-generated-siblings` (FF-7106) | `96_milestone_…/stories/01` and `/02` STORY.md | milestone `96` (`not-started`) |
| `acd-observe-snapshots-append-only` (FF-6807) | `src/commands/loop-record.mjs` | the 78/79/81 commit |
| **`acd-loop-scope-guard` (FF-5308) SCOPE-NEC-01** | **`nextWork` no longer leaks a story-shaped scope** | **this story — see `D-01`** |

Seven is the same figure chore `88` measured on 2026-09-04, with the same attribution, arrived at
independently here.

### The one red this story caused, read at the source

FF-5308's SCOPE-NEC-01 leg asserts a **live defect**: that `nextWork(workDir, "02/01")` leaks to an
earlier active milestone's ready item. It is red, and the assertion it fails carries the message the
gate's authors wrote for exactly this day:

```
AssertionError [ERR_ASSERTION]: GOOD NEWS — this red means the fix landed, not that the gate broke:
TECH_DEBT item 49 / src/work.mjs:847-860 (`inRange` falling through to `() => true`) has been FIXED,
so a story-shaped scope no longer walks out of the milestone the caller named. FOLLOW-ON: widen
LOOP_SCOPE_FORMS to whatever the single parser now admits, and retire this necessity leg.
    at necessityLeg (test/arch/acd-loop-scope-guard.test.mjs:132:10)
```

Three things make this a receipt rather than a regression, and each was checked rather than assumed:

1. **The message is not incidental.** A sibling row in the same file asserts the `GOOD_NEWS` text
   itself — that it says `has been FIXED`, names TECH_DEBT item 49, names `src/work.mjs:847-860`, names
   the follow-on, and is armed on **every** necessity assertion. That row is **green**, so the red above
   is the message its own contract requires, not a bare assertion error dressed up after the fact.
2. **It cannot be a vacuous red.** The SCOPE-MUT-01/02 row plants four non-discriminating fixtures and
   requires each to be rejected *before* the necessity claim is reached, precisely so a broken fixture
   can never report item 49 as paid. That row is **green** too.
3. **TECH_DEBT item 49 predicted it in writing**, in the tree, before this story existed: *"When it
   lands, 53's `LOOP_SCOPE_FORMS` guard (FF-5308) can widen to whatever the single parser admits — and
   FF-5308's necessity leg going RED is the signal that it did."*

### Live probe — the item scope and the control register

```
AOF_GLOBAL_HOME=$(mktemp -d) aof work doctor 86 --json
```

**2 findings, both `warn`, both pre-existing and stream-wide, neither attributable to this story:**
`numbering-gap` (a stream-level fact anchored at `wiki/work`, which counts only top-level *drivers*, so
parentless stories `84`, `85` and `86` all read as holes) and `rubric-join-unchecked` (the lane's
designed no-op notice, fired because the project config declares no rubric report *path*).

**`control-unresolved`: 0 findings, at BOTH severities** — at the item scope and stream-wide. Story 86
declares no `ARCHITECTURE.md` and therefore no control register, and nothing anywhere in the stream
declares a control that fails to resolve. Nothing was re-marked `pending` to reach that number; the
accept rule was applied by reading both severities, not by reading a marker.

**Stream-wide severity census: 0 `error`.** No finding at any scope is an `error`, so nothing here can
fail a gate.

### The acceptance bar this story set itself

`## Scope` names story `84`'s three `## Gaps` as the bar — *"this story is done when all three read
`discharged`"*. Each discharge condition was read back against the delivered code before being marked:

| gap in `84_story_story-span-ref/OUTCOME.md` | its discharge condition | what discharges it |
| --- | --- | --- |
| An unparsed scope is still silently discarded by `next` | the fall-through no longer applies to a story-shaped ref — *either* an explicit unscoped decision the caller can see, *or* `^\d+/` shapes that are not spans are refused | the **second** branch: `STORY_GRAINED_RE = /^\d+\//` in `src/work.mjs`, throwing `invalid-scope` and naming the admitted forms. Lanes `span/13` ×5, `span/15`, `span/16` |
| A span-scoped `skipped` list is driver-grained across the whole stream | `skippedEntries` resolves a span to the single driver it names, as `inRange` already does | `parseStorySpan` exported and imported into `src/commands/next.mjs`; the driver compared **numerically**, because a driver's ref may be zero-padded. Lanes `span/17`, `span/18`, `span/19` |
| The `continue.md` span branch is unguarded by any test | a prompt-contract lane asserts the branch's presence, in the shape `test/work-dispatch-lanes.test.mjs` lane `dispatch/02` uses on that same file | lanes `span/20`–`span/22` in the span's own home, including the non-vacuity lane that cuts the branch out of a copy and requires the assertions to throw |

All three now read `discharged` in `84`'s outcome, each citing `86` as the payer.

## Findings

| id | observed | type | severity | triage | routed-to | status |
| --- | --- | --- | --- | --- | --- | --- |
| D-01 | FF-5308's SCOPE-NEC-01 necessity leg (`test/arch/acd-loop-scope-guard.test.mjs:132`) is **red because this story paid the defect it measures** — it asserts that a story-shaped scope leaks out of the milestone the caller named, and it no longer does. The follow-on the leg's own message names is **owed and unbuilt**: widen `LOOP_SCOPE_FORMS` to whatever the parser now admits, and retire the leg. | follow-on owed by a designed good-news red | non-blocker | defer — it is **not story 86's to take**: `test/arch/acd-loop-scope-guard.test.mjs` and `src/work-loop.mjs` are in neither this story's `reads:` nor its `files:`, and widening `LOOP_SCOPE_FORMS` is a 53/ADR-003 act (the loop's vocabulary was frozen to `driver` + `range` **on purpose**, because `aof work loop` drives sessions) rather than a test edit. Taking it here would breach declared writes in order to make an ADR decision unrefined. | chore `111` | routed |
| D-02 | `TECH_DEBT.md` item 49 still records the `nextWork` fail-open as **open** and still cites `src/work.mjs:847-860`, both of which this story ends. Item 49's remaining half — three parsers consolidated into one home — is genuinely still open, so the item is half-stale rather than wholly so. | stale record | non-blocker | defer — raised at **review round 1** and promoted before this gate; recorded here for the register's completeness, not re-triaged | chore `109` | routed |

**No blocker finding is open.**

## Accept decision

**ACCEPTED.**

- `aof work validate 86` → **`PASS — 86 is well-formed.`**, exit 0. `aof work validate` over the whole
  stream → **`PASS — work stream is well-formed.`**
- `aof work doctor 86` → 2 `warn`, 0 `error`, **0 `control-unresolved` at either severity**.
- All **28** `@executable` scenarios across the three task features are green — 28 story-lane assertions
  and 104 assertions in the six suites that drive the two changed functions, 0 failures in either,
  exit 0 in both.
- No `@manual` scenario exists, so no agent-run procedure was owed. No `@uat` scenario exists, so no
  human sign-off was owed or sought. No UI surface exists, so no render was attempted and no designer
  or QA session was spawned.
- The three `## Gaps` in `84_story_story-span-ref/OUTCOME.md` — which this story's `## Scope` names as
  its acceptance bar — are all discharged, each read back against the delivered code above.
- **One red is left in the tree deliberately**, and it is the receipt for this story rather than a debt
  against it: FF-5308's necessity leg measures a defect this story paid, says so in its own assertion
  message, and its follow-on is routed to chore `111`. Accepting with a red that a control was written
  to produce at this exact moment is the call the control's authors asked the accepter to make;
  re-marking it, weakening it, or deleting the leg here would each be worse.
