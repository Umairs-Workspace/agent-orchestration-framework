---
doc: retrospective
updated: 2026-08-24
---
<!--
  Milestone RETROSPECTIVE.md — answers ONE question: what did we learn that is worth carrying?
  Owner: product-owner. Distilled at the close from STATE.md's `## Feedback (for retro)` notes and
  VERIFICATION.md's findings. Lessons are `## R<n>` headings (ADR-008 ruling 1 — the bare form,
  unhyphenated, which is what memory's parser indexes). REFERENCE the finding; never restate it.
-->
# 69 · Loop bounds — Retrospective

**The milestone in one line: it set out to end the "declared and not consumed" defect, and every
one of its own blockers was a variant of it — a guard that had frozen a fact about the past and was
being read as a claim about the future.** Twenty-two findings, seven verify passes, one accept that
had to be withdrawn by hand. Not one blocker was a defect in what the stories built; every one was
a collision between 69's additions and a control some earlier milestone had pinned. The lesson is
not "extend fewer surfaces" — it is that a frozen set is a dated assertion, and nothing in this
repository tells you when one has expired except a red suite at the gate.

## R1 · A control that freezes a SET is making a claim about the future, and nothing dates it

- **Kind:** mistake · **Area:** process
- **Stage:** verify · **Owner:** architect · **Raised by:** product-owner at `aof:verify`
- **What happened:** Five blockers, one shape. An import census frozen at seven names (F-69-V10); a
  module frozen as loadable-alone (F-69-V11); a bundle manifest membership count (F-69-V12); a hook
  merge frozen at "exactly one" (F-69-V17); a `src/bundle/**` file count frozen at 74 (F-69-V21).
  Each was written when its surface had one occupant and was correct on the day it was written.
- **Why:** A frozen count is almost always standing in for a property, and the count and the
  property agree only while the population is one. The pin that caught F-69-V21 even carries a
  comment recording the *identical* thing happening to milestone 53 at its own gate — so this
  repository has now paid for the lesson twice, in two milestones, and the second payment did not
  benefit from the first.
- **Lesson:** When a control freezes a SET — an import list, a membership count, an "exactly one" —
  the ADR that declares it must say **what a legitimate addition looks like and who records it**.
  Absent that, the control cannot distinguish a violation from a valid extension, and the next
  milestone to touch the surface pays for the ambiguity at its accept gate rather than at its build.
- **Refs:** `VERIFICATION.md` `@finding-F-69-V10`, `@finding-F-69-V11`, `@finding-F-69-V12`,
  `@finding-F-69-V17`, `@finding-F-69-V21`; `ARCHITECTURE.md` ADR-002 amendment (2026-08-24).

## R2 · A per-milestone lane selected from what the change is FILED UNDER cannot see what it touches

- **Kind:** mistake · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at `aof:verify`
- **What happened:** Story lanes were assembled from the suites registered under milestone 69's own
  blocks in `scripts/test.mjs`. Three guards over three files 69 edits — `FF-5301` over
  `agent-session-driver.mjs`, `work-loop-determinism` over `work-loop.mjs`,
  `autonomous-shell-out-prompt` over `manifest.json` — are filed under milestones 53 and 70, so no
  69 lane ever reached them. F-69-V10's red had stood since 69/01–02 merged and survived three
  verify passes.
- **Why:** The lesson had already been written down at an earlier pass, after
  `agent-session-driver-door` was found red outside every lane — and the correction added that one
  suite instead of changing the rule. **A lesson discharged by fixing its instance is not
  discharged.**
- **Lesson:** Select the lane from the CHANGED-FILE SET, not from the registry blocks. Measured at
  this gate: over the eighteen `src/` files 69 delivers or edits, **211** suites in `test/**` read
  at least one of them, and **180** were outside the lane. That ratio is not a judgement call — it
  is a query nobody runs, and it is mechanically derivable from `git diff --name-only` plus a grep
  over `test/**`. Until it exists, the full suite at the milestone gate is the only thing standing
  between a cross-milestone regression and a release.
- **Refs:** `STATE.md` `## Feedback (for retro)`; `VERIFICATION.md` `@finding-F-69-V10`.

## R3 · Every blocker was closed by re-aiming a PROXY at what it meant — never by relaxing it

- **Kind:** success · **Area:** process
- **Stage:** verify · **Owner:** developer · **Raised by:** product-owner at the fix pass
- **What happened:** Seven blockers across two fix passes, and not one needed an assertion softened
  or a locked `.feature` edited. `artifact-sync/00` counted aof-authored groups as a proxy for
  *"find the artifact-sync group"* → select by matcher and assert one entry **per** group, which is
  strictly stronger than the count it replaced. *"The same id is ONE entry, not two"* counted ALL
  entries as a proxy for *"this id did not duplicate"* → count that id. The m38 needs-input
  precondition counted status frames as a proxy for *"the park happened"* → read the assignment row.
  `FF-5301`'s total-reach ceiling is a proxy for *"the driver stays mesh-blind"* → the ceiling moved
  by a declared amount for four named zero-import leaves, denylist untouched.
- **Why:** When a frozen count breaks, the repair is to state the property it was standing in for.
  Relaxing the number is faster and throws the invariant away.
- **Lesson:** Keep this as the default move on any broken pin: ask what sentence the number was
  short for, then assert the sentence. The resulting control is usually better than the one that
  broke — which is why this class of breakage is worth having rather than worth avoiding.
- **Refs:** `VERIFICATION.md` `@finding-F-69-V17`, `@finding-F-69-V10`, `@finding-F-69-V20`,
  `@finding-F-69-V21`.

## R4 · "Reproduces in isolation" proves a red is REAL; it says nothing about who caused it

- **Kind:** mistake · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at the attribution pass
- **What happened:** Four attribution write-ups were wrong before measurement corrected them.
  F-69-V16 was attributed to milestone 70's fixture edit — the fixture's own comment named the lane,
  which made the story compelling — and restoring the file changed nothing; at the pre-68/69/70
  baseline it was 37 pass / 17 fail, identical. F-69-V12 was written up as a 69 regression on a
  suite that was already red. F-69-V17 was written up as seven assertions needing a plural merge; it
  was three, and the merge was already plural. And at the final pass the sweep-1 attribution table
  was written by hand rather than counted, summing to 50 against a total of 48.
- **Why:** "Is this red real?" and "who caused it?" are two questions, and they had been run as one
  step. Only the second needs an instrument.
- **Lesson:** A detached `git worktree` at a pre-milestone commit with `node_modules` junctioned in
  costs minutes and answers the second question outright. It should be the FIRST move on any
  unattributed red, not the last. And bucket the failure set with a script, not by eye — a
  hand-tallied attribution table is a claim, and this one was wrong by three.
- **Refs:** `VERIFICATION.md` `@finding-F-69-V16`, `@finding-F-69-V12`, `@finding-F-69-V17`; the
  sweep-1 attribution table's own correction note.

## R5 · Green in isolation names the CONDITION, not the fragile line — only driving it to failure does that

- **Kind:** near-miss · **Area:** test
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at the fix pass
- **What happened:** `69/04 task 02`'s atomicity scenario went red once in a 6,822-test sweep and ran
  35/35 green in isolation three times. It was written up as the atomicity assertion losing a race
  under load. Driven to failure deliberately — 14 concurrent workers against 6 CPU burners — **ten of
  eleven failures were `EBUSY: rmdir` in the fixture's teardown and the eleventh a setup timeout.
  The assertion never failed once.**
- **Why:** Green-in-isolation establishes only that the failure is load-dependent. It is silent about
  WHICH line is load-dependent, and the plausible candidate — the assertion whose whole subject is
  concurrency — was the wrong one. The actual faults were a 500ms patience budget for Windows to reap
  handles from already-exited children, and a 5000ms budget for a child to boot node and import two
  modules.
- **Lesson:** This is R4 inverted and it is the sharper half: when a test is green in isolation and
  red under load, **reproduce the failure before naming its cause.** Inducing it cost one command.
  Both faults turned out to be liveness guards mis-set as performance assertions — a distinction
  worth checking wherever a test carries a timeout, because a longer deadline costs a healthy run
  nothing when the wait ends on a signal.
- **Refs:** `VERIFICATION.md` `@finding-F-69-V22`, `@finding-F-69-V15`.

## R6 · Validate and doctor were green while three of this milestone's own edits held the suite red

- **Kind:** near-miss · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at the milestone gate
- **What happened:** At the pass that found five blockers, `aof work validate 69` returned `[]`,
  `aof work doctor 69` reported zero errors with no `control-unresolved` at either severity, and
  `aof work loops validate` reported zero errors. All three were true and none could see the defect.
- **Why:** They read the WORK STREAM — folder/frontmatter coherence, the depends graph, whether a
  declared control resolves to a file that exists. None reads the test tree, and a control that
  exists can still be red.
- **Lesson:** A green validate is never the accept evidence on its own, and the temptation to treat
  the suite as a formality is strongest at a gate with clean commands and a green scoped lane. This
  is precisely what the full suite at the milestone gate is for, and this milestone paid the stated
  trade — a poisoning story caught at the gate rather than immediately — exactly as designed.
- **Refs:** `VERIFICATION.md` § *The gates themselves are clear, and they were not sufficient*.

## R7 · A shipped rule with no enforcing check silently skipped six items

- **Kind:** mistake · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at the milestone gate
- **What happened:** Story 80 made `OUTCOME.md` an obligation for every delivering item, stories
  included, and had read `done` since 2026-08-20. Six of this milestone's seven stories were accepted
  without one and nothing reported it — `aof work doctor` has no missing-outcome finding code.
- **Why:** The rule lived only in a command's prose, so it was enforced only by whoever remembered to
  read it. That is the same "declared and not consumed" shape this milestone exists to attack, one
  level up from the code.
- **Lesson:** A rule that ships without a check ships without teeth. When a story establishes an
  obligation over every item of a type, the same story owes the doctor code that reports its absence
  — otherwise the obligation degrades to a convention and its violations are invisible.
- **Refs:** `VERIFICATION.md` `@finding-F-69-V14`.

## R8 · A `@manual` lane that is never RUN reports whatever the reader expected

- **Kind:** mistake · **Area:** test
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at `aof:verify`
- **What happened:** 69/01 task 02 scenario 2 asks that a declared staleness value move all three
  named consumers. An earlier pass recorded the story green by INSPECTION: the driver's idle window
  read `COMPLETION_IDLE_MS = DEFAULT_HEARTBEAT_MS`, which looks compliant because it takes the
  constant from the single home rather than a literal of its own. Executed, it failed — sharing a
  default is not reading a bound, and a workspace override moved two consumers out of three.
- **Why:** The scenario was marked `@manual` precisely because a unit assertion "would simply restate
  the constant it is checking". That reasoning is sound and it makes the lane's value entirely
  conditional on it actually being executed.
- **Lesson:** `@manual` means *an agent runs it and records the procedure*, never *a reader judges it
  plausible*. The defect this scenario was written to catch was invisible to inspection and obvious
  to execution — which is the whole argument for the lane existing.
- **Refs:** `VERIFICATION.md` § `@manual` — 69/01 task 02; `@finding-F-69-V4`.

## R9 · There is no reopen door, so a premature accept can only be undone by an unguarded hand edit

- **Kind:** mistake · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at `aof:verify`
- **What happened:** The milestone was accepted, then F-69-V7 was found — a delivered leaf with zero
  production importers, the milestone's own thesis reproduced in the story written to end it. The
  audit that catches it was run AFTER the transitions rather than before. `aof work status 69
  in-progress` refuses (`ITEM_STATUS_EDGES.done` is `[]`), so the only path back was hand-editing the
  frontmatter — outside the writer that exists to keep exactly that honest, unstamped in `updated:`,
  and invisible to every check.
- **Why:** `done` is modelled as terminal because re-opening should be deliberate. But "terminal"
  names what a COMMAND may do unattended, not what is TRUE, and a milestone with an unfinished story
  is not done regardless of what its frontmatter says.
- **Lesson:** Two carries. **Run every audit before the transitions, not after** — run in the other
  order, the production-consumer check would have held 69/03 at `in-review` and the milestone at
  `in-progress`, and none of this would have been written. And the lifecycle has a real gap:
  whether `done → in-progress` should be a declared edge or a coded operator act with its own
  refusal vocabulary is an open design question this milestone raised and did not answer.
- **Refs:** `VERIFICATION.md` § *Accept decision* (the withdrawn accept); `@finding-F-69-V7`.

## R10 · "Someone else's work" is a claim that has to resolve to an ITEM

- **Kind:** mistake · **Area:** process
- **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner at `aof:verify`
- **What happened:** F-69-V1 recorded a deleted `ui/` tree as concurrent work and triaged it "resolve
  in their owning work"; F-69-V3 did the same for a milestone-70 suite. Neither had an owner —
  nothing in the stream planned a `ui/` removal and the m70 suite was already registered. One
  `git checkout -- ui` closed both and turned four failures green. Later, F-69-V13's 123 link
  failures were correctly attributed to an uninstalled `ui/` workspace, with the owner nameable
  (a root `npm install`) — and still could not be run from the gate, because on this control node a
  root install can rebuild `node-pty` against a binary the live daemon holds open.
- **Why:** Deferring to an unnamed owner parks the whole milestone behind nobody. Naming the owner is
  necessary and, as the second half shows, not sufficient.
- **Lesson:** An unattributable blocker is an unowned one — resolve it to an item exactly like a
  control declaration or a cross-item finding id. And when the remedy is an OPERATOR act rather than
  a verify act, surface it to the operator at the gate rather than performing it silently or
  deferring it to nobody.
- **Refs:** `VERIFICATION.md` `@finding-F-69-V1`, `@finding-F-69-V3`, `@finding-F-69-V13`.

## R11 · Concurrent milestone sessions gave this gate's evidence a shelf life measured in minutes

- **Kind:** near-miss · **Area:** process
- **Stage:** verify · **Owner:** operator · **Raised by:** product-owner at the milestone gate
- **What happened:** Milestones 54, 68, 69 and 70 were in flight in one working tree. A concurrent 54
  session rewrote 69/06's production consumer and its delivered control *while 69 sat at its accept
  gate*, invalidating a 455-assertion lane measured 90 minutes earlier. Later, one monolithic commit
  swept all four milestones' uncommitted work into a single revision whose own message records that
  they "cannot be separated". The final gate had to state which of 48 failures belonged to which
  milestone before it could say anything about 69 at all.
- **Why:** Cross-lane concurrency makes a stale read look exactly like a fresh one — the same
  property that makes register-id allocation unsafe, one level up and applied to test evidence.
- **Lesson:** An item at its ACCEPT gate needs a quiet tree; the evidence is a snapshot and every
  concurrent write ages it. The cheap mitigation is what finally worked here: take the gate reading
  against a clean committed tree, record the commit in the verdict, and check that no subject file's
  mtime post-dates the run. The expensive one — serialising accept gates, or giving each lane its
  own worktree — is a real scheduling question this milestone raised and did not answer.
- **Refs:** `VERIFICATION.md` `@finding-F-69-V18`, `@finding-F-69-V6`; § *The repository sweep,
  2026-08-24*.

## R12 · Two defensible controls can meet, and one has to admit the other's case in its own words

- **Kind:** near-miss · **Area:** code
- **Stage:** verify · **Owner:** architect · **Raised by:** product-owner at the milestone gate
- **What happened:** Two of this milestone's blockers were genuine contract conflicts rather than
  censuses to bump. Milestone 53's *"the loop shell decides with every dependency absent"* against
  69/06's need for the progress authority inside the shell (F-69-V11) — resolved by inverting the
  dependency, so the engine imports nothing and the deciders are handed in, satisfying both. And 69's
  own FF-6904 — *every bundled hook derives nothing and exits 0 on every path* — against m42's
  `acd-no-new-silent-catch`, which requires every catch to emit a coded event through a `src/` sink
  the hook is FORBIDDEN to import. That one is unresolved and ledgered.
- **Why:** Two controls authored independently can each be right and still be jointly unsatisfiable.
  Nothing detects that until a change lands in the intersection.
- **Lesson:** When two controls collide, look for the inversion first — F-69-V11's remedy satisfied
  both contracts at once and was cheaper than amending either. When no inversion exists, one control
  must be amended to admit the other's case explicitly, and the amendment belongs in the ADR, not in
  a test comment. Leaving it as "known conflict" means the next milestone to touch the seam
  rediscovers it.
- **Refs:** `VERIFICATION.md` `@finding-F-69-V11`, `@finding-F-69-V17`; `ARCHITECTURE.md` FF-6904.
