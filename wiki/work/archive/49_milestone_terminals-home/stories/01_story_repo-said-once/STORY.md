---
type: story
number: 01
slug: repo-said-once
title: "One repo, said once — the current-work line deduplicates and counts, in the JS formatter and the Rust view-model and the fixture that gives the cross-language gate teeth, in ONE commit"
parent: 49
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-13
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 01 · One repo, said once

## User story

As the operator scanning the fleet's node cards,
I want a node running two sessions in one repo to say that **once, with a count**,
so that the line tells me how much is happening rather than making me count repeated words.

Today two live sessions in the same repo render that repo **twice** on the node's current-work line.
That was invisible until milestone 48 made a session individually addressable — before it, a second
session in one repo could not exist as a distinct record at all.

This is milestone 48's own routed gap, and its discharge condition names this milestone in terms:
*"milestone 49 decides the rule in its DESIGN and lands it in the JS formatter and the Rust view-model
in one commit."* [DESIGN §The `(session)` line — the dedupe rule, RULED](../../DESIGN.md) decides it;
this story lands it.

## Tasks

- [x] `tasks/00_the-line-deduplicates-and-counts.feature` — `@executable` green (9 lanes, all Examples
      rows); its `@uat @design` scenario is **open, awaiting human sign-off**
- [x] `tasks/01_both-surfaces-say-the-same-words.feature` — `@executable` green (12 arch lanes);
      `@manual` passes 3 of 4 clauses, clause 3 **pending the commit**

## Notes

**Order.** Depends on nothing and nothing depends on it. It is the **only** story touching Rust and the
**only** one touching `ui/src/fleet/runs.mjs`. It could ship first or last. **Parallel-eligible.**

**The rule, from [DESIGN](../../DESIGN.md) — the designer's call, not the builder's.** Deduplicate **and
count**: `working · demo ×2 (session)`; `working · aof, demo ×2 (session)`. Group on the **raw** repo
string — no trim, no case-fold — sort the *distinct* repos by the plain codepoint comparison
`ui/src/fleet/runs.mjs` already uses, and the multiplication sign is **U+00D7**, not the letter `x`.
DESIGN records what it rejected and why: bare dedupe under-counts the very sessions m48 made
addressable; one line per session breaks the card row's measured width floor; repo+assistant names a
tool and still duplicates.

**Governing ADR: [ADR-010](../../ARCHITECTURE.md) — and the reason this is ONE commit is not tidiness.**
Four things move together:

1. the JS formatter, `fleetCurrentWorkLines` ([runs.mjs](../../../../../../ui/src/fleet/runs.mjs), ← 7);
2. the Rust view-model, `app/desktop/crates/core/src/{status.rs,view_model.rs}`;
3. the local JS pin, `test/mesh-fleet-session-subsumption-render.test.mjs` row 6 — whose own comment
   says the rule is milestone 49's to decide;
4. **a fifth captured fixture** exercising two sessions in one repo.

**(4) is the one that is easy to skip and is the whole point.** Research measured that **no current
captured fixture exercises the same-repo case**, so `crossSurfaceDriftViolations`
([acd-captured-producer-fixture.test.mjs](../../../../../../test/arch/acd-captured-producer-fixture.test.mjs))
— the gate everyone assumes is holding the two languages together — **cannot see this change at all**.
The guaranteed-red gate on a JS-only edit is the plain JS pin, which is not cross-language. Land (1)–(3)
without (4) and the two implementations are free to diverge on this branch forever, with a green
cross-language gate saying they agree.

**PO ruling — the JS pin is REPLACED BY ANOTHER RULE, never deleted.** Row 6 currently asserts the
duplicate-rendering behaviour. It must be rewritten to assert the *new* rule, not removed to make the
suite pass. A pin deleted by the diff it was written to catch is the failure mode this codebase has
caught more than once.

**Non-vacuity is part of the deliverable.** ADR-010 requires `acd-captured-producer-fixture` to gain an
assertion that a duplicate-repo fixture **exists** — otherwise a future fixture re-capture could quietly
drop it and the gate would go back to being blind while reading green.

**Related, measured, and deliberately NOT fixed here:** the architect found the JS and Rust
implementations already diverge on a branch `crossSurfaceDriftViolations` structurally cannot see,
because it compares source text rather than behaviour. That is filed as a TECH_DEBT item
([ARCHITECTURE §Codebase health finding 5](../../ARCHITECTURE.md)), not absorbed — this story fixes the
duplicate-repo rule and adds the fixture the rule needs; it does not re-found the cross-language gate.
