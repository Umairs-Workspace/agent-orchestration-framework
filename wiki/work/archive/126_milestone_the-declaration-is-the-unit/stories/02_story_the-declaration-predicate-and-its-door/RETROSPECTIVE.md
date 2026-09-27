---
type: story
doc: retrospective
number: 02
parent: 126
slug: the-declaration-predicate-and-its-door
title: "Retrospective — the declaration predicate and its door"
created: 2026-09-09
updated: 2026-09-09
---
# 126/02 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`.

## R1 — An idiom is a property of a module's POSITION in the import graph, not of the call it makes

- **Kind:** misunderstanding · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** a delivered control, at build

**What happened.** The story's contract transplanted a working idiom: the declarations producer
"reaches the route the same deferred way, which is the idiom that keeps the ring open". That is
exactly true of `src/commands/trigger.mjs`, where it was measured. It is false of
`src/commands/mesh/identity.mjs`, which is inside the session module's static closure — and
`72/FF-7205` says so in words the contract could have been checked against: *a lazy path that awaits
the registry on the session hot path costs the same 88 modules as a static one, and satisfies a
closure walk while doing it.* Review did not catch it; a shipped gate did.

**Why.** The idiom was named by its SYNTAX — a deferred dynamic import — and the property it buys
(not joining the registry cycle, not paying the registry's cost) depends on where the importing
module sits. Two modules performing the identical call get opposite outcomes, so the contract's
sentence was under-specified rather than wrong: it named the call and not the position.

**Lesson.** When a contract carries an idiom from one module to another, name the graph position it
is being carried to and the property that position must have, not just the call. Here the two
constraints — keep the registry ring open, stay out of the session closure — are both real and are
jointly satisfied only by a THIRD module, which is why `src/mesh/declarations.mjs` exists. That
resolution is the note `126/03` needs before it reaches for the same idiom. **Refs:**
`@finding-F-11`, `ARCHITECTURE.md#ADR-005`.

## R2 — Supplying a default is what turns a reader of a config key into a second home for it

- **Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** a delivered control, at build

**What happened.** The producer read `work.autonomous.maxAttempts ?? 3` — nine characters that made
it the fifth resolution site for a bound `69/FF-6901` / `53/FF-5310` hold to four. It now reads
through `resolveAttemptCeiling`, an already-admitted resolver.

**Why.** Reading a config key looks like consumption; reading it **and** deciding what it means when
absent is resolution. The `??` is the whole of the difference, and it is easy to write without
noticing that a policy decision has just been made in a new place.

**Lesson.** `?? <default>` beside a config read is the tell. If a bound already has a named resolver,
call it; if it does not, the default belongs in one and not at the call site. **Refs:**
`@finding-F-12`.

## R3 — A byte pin and a cited-line pin are different instruments, and a new export near the top of a module trips only the second

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** the build lane

**What happened.** Adding `isRunning` near the top of `src/run-store.mjs` — nine lines — shifted five
cited export lines, which staled three delivered loop records (`58/FF-5810` cites a DEFINING LINE,
not a symbol), which moved their hashes in `src/bundle/manifest.json`, which disagreed with
`.aof/aof.lock.json`, and the installed dogfood copies under `.aof/loops/` then had to be re-synced
because `53/FF-5313` requires them byte-identical. Five repairs from one insert. The store's own
byte-pin `53/FF-5307` caught the FILE changing and said nothing about any of it.

**Why.** The two pins answer different questions. A byte pin asks *did this file change*, and
answers yes to a comment. A cited-line pin asks *is line N still the definition it was cited as*,
and answers no to anything inserted above it. Passing the first tells you nothing about the second,
and the second's failure surfaces four artifacts downstream of the edit.

**Lesson.** In a heavily-cited module, append a new export at the BOTTOM unless there is a reason not
to — the same edit costs one repair instead of five. And when a byte-pinned file must change,
the pin going green is not evidence that the content addresses held. **Refs:** `@finding-F-13`.

## R4 — Three stories, three incomplete write sets, and always the ratchets

- **Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** product-owner · **Raised by:** this accept, for the third time

**What happened.** `126/00`, `126/01` and `126/02` each declared a `files:` list that the build
necessarily exceeded, and every time in the same species: files whose subject is the change itself.
The shrink-only directory ratchet across all three; the `work:loop` schema property list twice;
here, `src/mesh/declarations.mjs` (the module `R1` forced) and the whole of `R3`'s content-address
chain.

**Why.** A refine draws a write set from what the story means to change. A ratchet, a byte pin and a
content-address chain are not changed BY the story — they are tripped by it, and which ones trip is
a property of the tree at build time rather than of the story's intent. No amount of care at refine
recovers a file the author cannot know will be touched.

**Lesson.** Measured three times out of three, this is a convention rather than an incident, and it
has a sharp edge: **the wave planner trusts `files:`**, so under a fan-out two lanes adding test
files would both have written the one budget table without either having declared it. A story that
adds a suite, adds a declaration key, or inserts an export into a cited module should declare the
ratchets its own change will trip. **Refs:** `@finding-F-05`, `@finding-F-07`, `@finding-F-15`.

## R5 — A red probe must be the SMALLEST edit that reaches the leg it is probing

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** this accept

**What happened.** `FF-12604`'s register row says to *drop the clock leg and observe the
exhausted-lineage fixture list a row*. Deleting the guard outright does red leg 3 — but at its
STRUCTURAL sub-assertion, *the ceiling comparison routes through the ONE home*, which fires on the
missing source token before the driven fixture is evaluated at all. The probe as literally written
proves the structure and never exercises the behaviour it names. Keeping the call verbatim and
neutering only its refusal reached the driven leg, and then the acceptance scenario the row names
reds by its own words.

**Why.** A control with both a structural and a driven leg over the same subject has an assertion
ordering, and the cheap structural one fires first. A deletion is the coarsest possible probe: it
removes the token AND the behaviour, so it cannot distinguish which leg is load-bearing.

**Lesson.** Write the probe so it changes exactly one thing — the behaviour, with the structure
intact — and record which leg it reddened. A probe that reds the control is not the same as a probe
that reds the claim, and only the second is evidence that the claim is guarded. This one is now
recorded in the `FF-12604` row both ways, deliberately. **Refs:** `VERIFICATION.md` `## Fitness
functions`, `FF-12604`.

## R6 — A finding that names a malformed path re-creates it for any sweep that reads prose as citations

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** this accept

**What happened.** `arch/119 FF-11903` counts unresolvable `src/` citations under `wiki/work/**`
against a shrink-only ceiling. Two of its remaining count are not citations at all: a root-level spelling of `run-status.mjs`
appears in `STATE.md`, `126/01`'s `RETROSPECTIVE.md` and `VERIFICATION.md` — all three being the text
of `F-09`, the finding that exists to say that path never existed — and `src/commands/mesh-desktop.mjs`
appears where the architect REPORTS a stale ledger citation and names the correct path on the next
line. Repairing either falsifies the finding that names it.

**Why.** The sweep's extractor cannot tell a citation from a report about a bad citation, and the
record documents are inside its walk. Recording the defect is what re-creates the defect's signature.

**Lesson.** The residue is not reducible by repair, so the remedy is the extractor or the ceiling —
and until then, `F-02`'s framing ("repair the citation, or land the module it names") over-promises
what repair can reach. When a finding must quote a malformed identifier, expect the register to
become a source of it. **Refs:** `@finding-F-16`, `@finding-F-02`, `@finding-F-09`.

## Not a lesson: the story's own agents ran clean

`observability/snapshots/2026-09-09T15-26-55-985Z/agents.json` records one stall in the whole
milestone — 27 minutes on the architect at the milestone refine beat, attributed to `126`. The two
sessions attributable to this story, the `126/02` feasibility pass (18m) and its QA examples (15m),
each ran with **zero** stalled time. There is no process lesson here, and it is recorded so that the
absence reads as measured rather than unexamined.
