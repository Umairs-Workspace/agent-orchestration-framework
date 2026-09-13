---
doc: retrospective
item: 86
created: 2026-09-04
updated: 2026-09-04
---
# 86 · Retrospective

Distilled at the accept gate from the finding review round 1 promoted (chore `109`), from the two the
gate itself raised (`VERIFICATION.md` D-01, D-02), and from the one control this story was always
going to redden. The story carried **no blocker stop** and no scope change: the three tasks it was
refined with are the three it delivered.

## R1 · A control designed to go red on payment is a receipt, and the receipt must be ROUTED the moment it reds

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** whoever accepts the paying
item · **Raised by:** this gate (`D-01`).

**What happened.** FF-5308's SCOPE-NEC-01 leg asserts a *live defect* — that a story-shaped scope
leaks out of the milestone the caller named — so it goes red the day that defect is paid. The design
around it is genuinely excellent, and all of it worked: the failure carries a `GOOD NEWS` message
naming the debt item, the source line, and the follow-on; a **sibling row asserts that message's own
text**, so it cannot be trimmed to a bare assertion error; a **vacuity row** plants four
non-discriminating fixtures and requires each to be rejected *before* the necessity claim, so a broken
fixture can never report the debt as paid; and TECH_DEBT item 49 predicted the red in writing years of
commits before this story existed.

**What did not work is what happened after it went red.** Chore `88` ran on this same tree, measured
the arch suite, saw this red, correctly attributed it to *"story 86's uncommitted `inRange` change in
this checkout"*, and wrote down that *"the test's own message says the red means the fix landed and a
follow-on is owed"* — and then routed nothing. No chore, no DoD box, no `depends`. Had this gate run
the story's own lane alone, as the per-story scoping rule permits for a standalone story, the
follow-on would have survived only inside a paragraph in an unrelated chore's Notes.

**Why the good design was not enough.** Every mechanism here points *inward*, at the reader of the
failure. There is no mechanism pointing *outward*, at the stream: nothing turns "this control has
served its purpose" into a scheduled item. A red that is explained is still a red, and a tree that
already carries six of them (this one measured 1711/1718) is a tree where an explained red is
indistinguishable from an unexplained one at a glance.

**Lesson.** When a control is written to red on payment, the payer's accept gate owes it a **routed
item**, not a paragraph — and the routing is owed by the item that *caused* the red, not by whichever
later sweep happens to notice it. Naming a red's cause without scheduling its discharge converts a
designed signal into ambient noise, which is the one outcome the whole GOOD-NEWS apparatus was built
to prevent.

**Countermeasure that is not just "look harder".** The follow-on is chore `111`, and it is written to
be **refusable**: its first box is the 53/ADR-003 decision (widen `LOOP_SCOPE_FORMS`, or record why it
stays frozen), *before* either file is touched — so "we chose not to widen" is a discharge rather than
a stalled chore. A follow-on whose only shape is "do the thing" cannot be closed by deciding against
it, and then it never closes.

**Refs:** `VERIFICATION.md` D-01; chore `111`; chore `88` `## Notes`;
`test/arch/acd-loop-scope-guard.test.mjs:60` (the `GOOD_NEWS` constant) and `:132` (`necessityLeg`);
`wiki/work/TECH_DEBT.md` item 49.

## R2 · A gap cited as an acceptance bar is still discharged by hand, and nothing checks that it was

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner ·
**Raised by:** the retro step, re-reading `## Scope`.

**What happened.** This story's `## Scope` says, in terms: *"Each gap's discharge condition is the
acceptance bar — this story is done when all three read `discharged`."* At the accept gate, with all
three conditions demonstrably met and every scenario green, **all three still read `open`** in
`84_story_story-span-ref/OUTCOME.md`. They were flipped by hand here, during this gate, after
re-reading the story's own scope text.

**Why it nearly slipped.** Nothing joins the two documents. `aof work validate` does not know that
story 86's scope prose cites story 84's gaps; `aof work doctor` reports `control-unresolved` for
`ARCHITECTURE.md` registers but has no notion of an outcome gap; and the story's own `.feature` files
correctly say nothing about it, because a gap flip is a record act and not behaviour. `aof work
promote-gap` exists to turn a gap into scheduled work — there is **no discharge verb and no discharge
check** at the other end.

**Lesson.** Naming another item's artifact as your acceptance bar creates an obligation that lives in
prose in a third document, and prose obligations are discharged only if someone re-reads them at
exactly the right moment. Where a story's bar is another item's gap, the gate must re-read that gap's
*discharge condition* against the delivered code and record the reading — which is now a table in this
story's `VERIFICATION.md`, one row per gap, so the flip is evidenced rather than asserted.

**Refs:** `VERIFICATION.md` § "The acceptance bar this story set itself";
`84_story_story-span-ref/OUTCOME.md` `## Gaps` (all three now `discharged (by story 86)`);
`aof work promote-gap`.

## R3 · Listing the refused shapes' NEAREST LEGAL NEIGHBOUR in the same feature is what keeps a refusal from being drawn too wide

**Kind:** confirmed approach · **Area:** architecture · **Stage:** refine · **Owner:** product-owner ·
**Raised by:** the contract itself, and green at the gate.

**What happened.** `tasks/00` refuses five shapes, one of which is `44/01–02` — an en-dash, one
invisible U+2013 codepoint away from a legal span. In the *same* feature, the untouched-forms outline
carries `44/03-01`, the **descending** span, which parses and admits nothing. The preamble says why in
as many words: *"a refusal drawn one character too wide would swallow it."*

**Why this is the transferable bit.** A refusal is specified by what it rejects, and a list of
rejected shapes is trivially satisfiable by rejecting everything — the failure mode the story's own
prose names ("refusing every unparsed string would break slug scopes"). What actually constrains the
implementation is the *adjacent legal* shape sitting in the same document: `44/03-01` and `a slug`
make `^\d+/` the only refusal width that passes, and the implementation's `STORY_GRAINED_RE` is
narrower than "anything unparsed" for exactly that reason. Both en-dash and descending-span rows were
added during refine, after the story's own measurement table was written — the table found the bug,
and the neighbour rows are what stopped the fix over-shooting it.

**Lesson.** When writing a refusal, put its nearest legal neighbour in the same feature file as an
explicitly untouched row. The refused list alone under-determines the implementation; the neighbour is
what pins the boundary, and it costs one Examples row.

**Refs:** `tasks/00`, the refusal outline and the untouched-forms outline;
`src/work.mjs` `STORY_GRAINED_RE` and its comment (which cites the m59/R7 near-miss, where a refusal
keyed on characters would have refused legal paths).

## R4 · A third consecutive empty observability snapshot, with an UNCHANGED unattributed count

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** the observability lane ·
**Raised by:** the retro step.

**What happened.** `aof work observe 86` matched **0 agent runs across 0 sessions** and **0 run
records**, reporting **418 unattributed agent runs**. Stories `81` and `85` recorded the same shape,
and `85`'s figure — measured earlier the same day — was also **418**.

**Why the repeat is a stronger signal than either instance.** `85`'s R5 read the number as a join that
is not landing. Two more accept gates have run on this node since, and the unattributed count has not
moved by one. A join that fails would still see the *pool* grow as sessions accumulate; a pool frozen
at exactly 418 across three gates says the scan is not reaching new sessions at all — a different
defect, with a different fix, from the one `85` diagnosed.

**Lesson.** When re-observing a known-empty pipeline, record the **unattributed count** and compare it
to the last reading. Its movement, not its size, distinguishes "the join is broken" from "the scan is
not running" — and three readings of the same number is the evidence that separates them.

**Refs:** `85/RETROSPECTIVE.md` R5; `81/RETROSPECTIVE.md` R5; `aof work observe 86`;
`aof-work-observe-transcript-observability` (memory).
