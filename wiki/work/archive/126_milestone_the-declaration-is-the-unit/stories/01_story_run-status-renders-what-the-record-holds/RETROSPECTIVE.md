---
type: story
doc: retrospective
number: 01
parent: 126
slug: run-status-renders-what-the-record-holds
title: "Retrospective — run-status renders what the record holds"
created: 2026-09-09
updated: 2026-09-09
---
# 126/01 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — Three separately-correct constraints composed into an impossibility on the live path, and only a forbidding control made it visible

- **Kind:** near-miss · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** QA, at the contract beat

**What happened.** ADR-003 ruled three things that are each right on their own: the render reads no
wall clock (§2), the `--json` document gains no key (§3), and `run()` is untouched (§4). Together
they left `aof work run-status <ref>` with **no path to an instant at all** — the elapsed and
heartbeat figures the story exists to print could not be computed anywhere the operator's own
invocation reaches. Every test would have stayed green: the render is pure and takes its `now` as an
argument, so a suite that injects one proves nothing about a caller that has none. The gap was found
while building against the contract, and closed by an amendment — `src/spine/face.mjs` supplies `now`
on the `faceCtx` it already hands every `cli.render`, read from the wall clock there and nowhere else.

**Why.** The constraints were written as prohibitions on consumers — this module may not, this
document may not — and no clause named a **producer**. A prohibition set is only satisfiable if
something is permitted to supply what the prohibitions forbid fetching, and nothing in the ADR said
what that was. `mesh:status`'s `input.now ?? new Date()` idiom looked like the precedent and was not:
there the value is consumed inside `run()`, which is exactly the seam §3 and §4 closed here.

**Lesson.** When a contract forbids a capability in the module that needs it *and* forbids carrying
it on the data that reaches it, the contract is not finished until it **names the seam that supplies
it**. Write the producer into the ADR alongside the prohibitions. And the module-literal check that
made this visible is vindicated rather than weakened by having fired: forbidding `new Date(` in
`run-status.mjs` is what surfaced the hole at the contract beat instead of at an operator's terminal.

**Refs:** `ARCHITECTURE.md#ADR-003` (AMENDED at the contract beat, 2026-09-08), `FF-12603` legs 1–3.

## R2 — A triage note that explains a red away can hide a different defect underneath it

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** this accept

**What happened.** `F-02` recorded `arch/119 FF-11903`'s unresolvable-citation red and classified
a root-level spelling of `run-status.mjs` among "forward references that resolve when their stories land — `126/01` and
`126/05`". `126/01` has now landed and it did not resolve, because it never could: the module is
`src/commands/run-status.mjs` and always was, and `ARCHITECTURE.md:563` simply names it by a path
that has never existed. Repaired at this accept (`F-09`), which takes one citation off the count.

**Why.** The triage was written once, against a plausible reading, and then *stood in for* the check.
A forward reference and a typo look identical to a citation sweep — both are a `src/` path that
resolves to nothing — and the note that distinguished them was an inference, not an observation.

**Lesson.** A finding whose triage says "this resolves when X lands" carries an obligation to
**re-check it when X lands**, and the accept of X is where that obligation falls due. An explained
red is not a discharged one; the explanation is a hypothesis with an expiry date on it.

**Refs:** `VERIFICATION.md` `@finding-F-09`, `@finding-F-02`.

## R3 — An unreachable branch was recorded and proved structurally rather than faked, and that was the right call

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** the build lane

**What happened.** Task 02 asks the `--json` document to be driven through all six of its answering
paths. One — the four-key streamed-item-row return — needs a ref `resolveItem` does **not** resolve
but `readStreamedItemRow` **does**; `resolveItem` is cache-first, so every row the fixture can plant
resolves and the call takes a different branch. The build drove the five reachable paths, wrote the
boundary into the suite in full, and let `FF-12603` leg 4 carry the sixth by reading the source and
asserting exactly one four-key return site that gains no `reportedBy` for symmetry.

**Why.** The available alternative was to plant a row and assert it as the `:50` path — a test that
names one branch and exercises another. That passes, reads as coverage, and is wrong in the one
direction a reviewer cannot see.

**Lesson.** When a branch cannot be reached from the fixtures that exist, **say so in the suite and
move the claim to an instrument that can reach it** — a structural leg over the source is honest
coverage where a mislabelled driven test is not. An acknowledged boundary costs a paragraph; a test
naming the wrong branch costs the next person's trust in every other row.

**Refs:** `VERIFICATION.md` `@finding-F-08`, `test/run/run-status-document-frozen.test.mjs:62-69`.

## R4 — Two lessons this milestone had already written were measured again one story later

- **Kind:** misunderstanding · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** this accept

**What happened.** `126/00/R3` (a story's `files:` cannot foresee the ratchets its own new files
trip) and `126/00/R7` (a `pending` marker is cleared by nobody but the accepting command) were both
written one story ago. Both recurred here unchanged: this story wrote
`test/arch/testing/acd-source-directory-budget.test.mjs` without declaring it (`F-07`), and
`FF-12603`'s register cell still read `*(pending — 126/01)*` after the control had landed green
(`F-10`).

**Why.** Both lessons were recorded as things to *remember*, and a lesson held only in a document is
re-learned by whoever did not read it. The stories were partitioned and built concurrently, so the
second lane could not have profited from the first's retro even in principle.

**Lesson.** A retro entry that recurs in the very next story is evidence the lesson needs a **step or
a check**, not a stronger sentence. Dropping a satisfied `pending` marker and declaring the ratchets
a change will trip both belong in the ceremony that runs anyway — the accept, and the refine's write
set — rather than in a document the next lane may never open. Recorded here so the milestone retro
inherits a measurement rather than a second telling.

**Refs:** `126/00/RETROSPECTIVE.md#R3`, `#R7`; `VERIFICATION.md` `@finding-F-07`, `@finding-F-10`,
`@finding-F-05`.
