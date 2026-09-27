---
type: milestone
number: 77
slug: harness-audit
doc: retrospective
created: 2026-09-03
updated: 2026-09-03
schema: 1
aofVersion: 0.1.0
---
# 77 · Retrospective

Six stories, sixteen contracts, 150 `@executable` scenarios, no Blocker surviving a story's own
review round — and the milestone was still **refused once at its own gate**. That shape is the
retrospective: the build was clean *within every story's scope*, and both blockers that stopped the
accept were invisible from inside any of those scopes. A milestone whose thesis is *"a measurement
layer cannot audit itself"* spent its gate proving that about its own instruments, twice.

## R1 — Research over an IN-FLIGHT sibling's subject was stale before it was read

**Kind:** near-miss · **Area:** process · **Stage:** refine · **Owner:** researcher · **Raised by:** the architecture pass

**What happened.** `RESEARCH.md` landed with its most load-bearing measurement already false. It
counted **three live duplicate hook pairs** in this repository — the entire evidence base for the
`hook-duplicated` rule's shape and for whether the merge itself should be repaired. By the
architecture pass there were **zero**: milestone 72's story 03 had deleted all three by hand,
mid-session, between the research pass and the decision point.

**Why.** The research subject was a sibling milestone's *in-flight* work. Research treats its
measurements as facts about a tree; a tree another lane is editing is not a fact, it is a snapshot.

**Lesson.** A measurement over a subject a concurrent lane is changing must be **re-measured at the
decision point**, not cited from the research doc. The cost of not doing so here was almost a rule
built for `n = 3` when `n = 0` — which is what moved the merge repair out of 77 entirely and into
`TECH_DEBT` item 90, with the trigger that re-opens it.

**Refs:** 77/STATE "Decisions taken at refine"; `ARCHITECTURE.md#ADR-005`; `TECH_DEBT` item 90.

## R2 — "From the document's own frontmatter" is ambiguous when the corpus holds three renderings of that document

**Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** developer · **Raised by:** the build itself (no test caught it)

**What happened.** The capability rule reads an agent's grant from its `tools:` frontmatter. The
grant map was keyed by **agent id alone** — and this repository installs every agent three times
(`.claude`, `.codex`, `.opencode`). Those three are not the same document: `.claude` carries
`tools: … Bash …`, Codex carries no `tools:` key at all, and OpenCode expresses the grant as a
`permission:` block. Whichever rendering sorted last decided the grant for all three, so a `.claude`
instruction was being answered by an OpenCode file. It produced three false findings against the
architect before the key was scoped per runtime.

**Why.** `ADR-003 §5` forbade a *mirrored list* — a second document declaring a grant. This was the
same defect one indirection along: not a second list, but one list read from the wrong copy.

**Lesson.** When a corpus holds N renderings of one logical document, "the document's own
frontmatter" names N documents. Say **which** one, in the key. And note what did *not* catch this: no
control did — it was found by reading the output. The general form is that a rule keyed on identity
needs its identity to include the axis the corpus varies along.

**Refs:** `ARCHITECTURE.md#ADR-003 §5`; `VERIFICATION.md` `@finding-D-01`; `src/work-audit/prompt-layer.mjs` `grantKey()`.

## R3 — A story's `reads:` naming a path the story RELOCATES is unsatisfiable the moment the story succeeds

**Kind:** near-miss · **Area:** contract · **Stage:** refine · **Owner:** product owner · **Raised by:** `aof work validate 77/04`

**What happened.** 77/04's contract declared `reads: scripts/drive-control.mjs` — the very file the
story exists to move to `src/work-audit-drive.mjs`. `aof work validate 77/04` refused on it, before
any reviewer was spawned.

**Why.** A `reads:` set is authored against the tree as it stands at refine, and a relocation story's
subject stops existing at that path precisely when the story works.

**Lesson.** For a story that moves or renames a file, the `reads:` entry must name the **destination**
(or the story is self-refuting on success). Recorded as much for the gate as for the mistake: this is
the ladder catching a contract defect at the cheapest possible point, and it should be read as the
gate earning its place rather than as friction.

**Refs:** 77/STATE 77/04 close; `src/commands/validate.mjs:87`.

## R4 — The `reads:` set is authored before the builder knows which precedent it will need

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product owner · **Raised by:** 77/03's build

**What happened.** 77/03 genuinely required five files outside its declared `reads:` — the immediate
family precedent for a pure lane's shape and its sweep registry (`seam-liveness.mjs` + two suites),
the module where a read record becomes `audit-ran-on-nothing` (`report.mjs`), the existing lanes'
floors (`work-loops-checks.mjs`), and the one home for a parsed model over records on disk
(`test/support/loop-registry-fixture.mjs`).

**Why.** Refine can name what a story *changes*. What it must *read to know how the family does this*
is discovered by building it — and the closest precedent is rarely obvious until the builder is
inside the problem.

**Lesson.** Treat an incomplete `reads:` as expected rather than as a contract failure, and repair the
set at the close so the next story in the family inherits the map. This is different from R3: R3 is a
declaration that was *wrong*; this is one that was *incomplete by construction*.

**Refs:** `VERIFICATION.md` `@finding-D-05`; 77/STATE 77/03 close.

## R5 — Moving a file between directories changes which censuses it belongs to, and no story-scoped suite can show that

**Kind:** blocker · **Area:** architecture · **Stage:** verify · **Owner:** developer · **Raised by:** the milestone gate (`B-01`)

**What happened.** 77/04 moved `scripts/drive-control.mjs` → `src/work-audit-drive.mjs`, for good
reasons that the ADR states well: the payload copies `src/` and carries no `scripts/`, so the driver
had to move to where the copy goes. It carried with it a pre-existing best-effort `rmSync` cleanup
`catch {}` — untouched, unremarkable, and **outside** `arch/m42-item-3`'s census for as long as it sat
under `scripts/`. Under `src/` it is a NEW silent catch against a baseline of zero, and the milestone
gate red on it. 77/04's own suite was green throughout and always would have been.

**Why.** The census is defined by **location**, and a move is a change of location that reads as a
change of nothing. Every story-scoped signal was correct; the population the story belonged to had
changed underneath all of them.

**Lesson.** A story that **relocates** a file must enumerate the location-scoped gates on both sides
of the move — `src/**` censuses in particular — because the file's contents did not change and no
diff-shaped review will show one. Generalised: *a move is an edit to every rule that quantifies over a
directory.* The repair itself was one line, and it is the in-policy one — emit a coded event on
stderr rather than swallow, because the ban's own header says it is now "an outright ban everywhere
else" and a `BASELINE` entry would have weakened a ratchet to avoid writing a line.

**Refs:** `VERIFICATION.md` `@finding-B-01`; `ARCHITECTURE.md#ADR-002 §2`; `src/work-audit-drive.mjs:190`.

## R6 — Running the fitness tier THROUGH the tool the tier tests produced three false reds

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product owner · **Raised by:** the gate's own re-run

**What happened.** The gate ran the whole tier as `aof work grade 77 --run`. Ten of 1649 cases red.
**Three of the ten were the harness measuring itself**: `work:grade` sets a re-entrancy stamp before
spawning its runner, and the suites `arch/54 FF-5409` and both `arch/FF-5405` cases assert the
behaviour of exactly that stamp and spawn. They saw an already-stamped environment and reported the
refusal they exist to prove. All three re-ran GREEN when the same tier was invoked directly as
`node scripts/test-rubric.mjs`.

**Why.** `work:grade`'s child inherits the grade environment, and the tier contains the tests of
`work:grade`. The instrument was inside its own subject.

**Lesson.** Run the tier by **its own runner** at the gate, not through the command whose behaviour
the tier asserts — or budget a triage pass to separate instrument artifacts from defects. Thirty
percent of the first run's reds were noise, and noise at a gate is expensive twice: once to
investigate, and once because it trains a reader to discount the next red. This is the milestone's
own SPEC thesis (*"a measurement layer cannot audit itself"*) arriving as an operational rule about
how to run a gate.

**Refs:** `VERIFICATION.md` tier evidence row; `scripts/test-rubric.mjs` header.

## R7 — "Zero false positives across all 226 modules" is a fact about a corpus on a date, not a property of a rule

**Kind:** blocker · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Raised by:** the milestone gate (`B-02`)

**What happened.** FF-6601 (milestone 66) forbids a second Gherkin recogniser under `src/`. Its shape
3 counts a keyword string inside an object or array literal as a keyword table, and its header records
the widening as *"measured, widening it to `{` costs 0 false positives across all 226 modules"*. 77's
`audit-instruction-duplicated` finding message contains the clause *"**When** one is edited…"* inside
an object literal. It is the 227th module and the widening's first false positive — on a shape the
gate's **own header** says is exempt: *"a bare keyword string that is neither tested nor emitted as a
document — a UI label or an error message — is NEITHER, on purpose."*

**Why.** The measurement was taken over the tree that existed when the rule was written, and it was
recorded as if it bounded the rule's future behaviour. It bounded its behaviour on that tree.

**Lesson.** A false-positive count over a corpus is evidence a rule is *currently* tolerable, never
evidence it is *correct*; when the rule's stated intent and its implementation disagree, the count is
measuring the tree's luck rather than the rule. Record such measurements with their date and corpus
size so the first counter-example is legible as one — which is what `D-11` now carries. 77 closed the
blocker the cheap way (reword its own message) and deliberately did **not** narrow another
milestone's control at its own accept gate; the next module writing a Gherkin keyword into a message
string will hit this again.

**Refs:** `VERIFICATION.md` `@finding-B-02`, `@finding-D-11`; `test/arch/acd-feature-parser-single-home.test.mjs` header.

## R8 — Two of five fixture rows passed for the wrong reason, because the fixture was written against a belief about the loader

**Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** 77/03's own review

**What happened.** A `ceiling:` pointer in a loop record is authored as a **list**. A bare
`ceiling: config:work.loop.reviewRounds` never becomes a pointer entry at all — it is `loop-bad-value`
— so a fixture written that way drives the lane's **absent-ceiling** path while appearing to drive its
**pointer** path. Both first drafts of the pointer rows in `work-audit-declared-bounds.test.mjs` were
wrong this way, and two of five rows passed for the wrong reason.

**Why.** The fixture was authored against the shape the *reader* expects, not against what the
*loader* actually produces. Green, on the wrong path, is indistinguishable from green.

**Lesson.** A fixture feeding a parsed model must be validated **through the loader** before the
assertions on top of it mean anything — the same species as this repository's `node --test` silent
false pass, one layer down. Where a fixture must be hand-shaped (the empty-key row is), write the
reason beside it.

**Refs:** 77/STATE 77/03 close; `test/work-audit-declared-bounds.test.mjs`.

## R9 — The retrospective's telemetry input was empty, and the empty table is not "no agent time"

**Kind:** misunderstanding · **Area:** process · **Stage:** verify · **Owner:** product owner · **Raised by:** `aof work observe 77 --write`

**What happened.** The close's observability snapshot attributed **0 of 418** agent runs to this
milestone: zero run records, zero active time, an empty agent table, and 418 unattributed sessions.
Six stories were built and reviewed in one day, so the true numbers are not zero.

**Why.** The transcript↔run-record match found nothing to join against. That gap is milestone **68**'s
subject and is explicitly out of 77's scope (*"Audit reads static facts; 68 fixes the numbers"*).

**Lesson.** Recorded so the next reader of `observability/` does not read an empty table as a cheap
milestone. Until 68 lands, a retro's spend and stall lessons have **no input**, and their absence here
is a missing instrument rather than a clean run — exactly the distinction (`"found nothing"` vs
`"looked at nothing"`) that this milestone's own lane floors exist to keep apart.

**Refs:** `observability/snapshots/2026-09-03T15-20-50-384Z/report.md`; `SPEC.md` "Out of scope"; milestone 68.
