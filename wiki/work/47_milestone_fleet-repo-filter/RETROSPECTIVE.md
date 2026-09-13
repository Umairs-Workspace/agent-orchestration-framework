---
doc: retrospective
---
<!--
  Milestone RETROSPECTIVE.md — the distilled lessons from how execution actually went.
  One R<n> per lesson, APPEND-only (never renumber). References its evidence; never restates it.
-->
# 47 · /fleet with a repo filter — Retrospective

Written at Accept, 2026-08-13. Sources: `STATE.md` §Feedback (for retro), `VERIFICATION.md`
§Findings across three verify passes, and `observability/report.md`.

**This milestone has one dominant species and it is worth naming before the entries.** A claim is
written down — in a record, a comment, a checklist, a gate's own message — and never executed against
the thing it describes. It appeared **nine times**, in five distinct disguises, and every blocker this
milestone ever had was an instance of it. R1 is the species; R2–R6 are the disguises that were not
obvious from R1; R7–R9 are its instruments; R10–R16 are the rest.

---

## R1 — A refine-time claim about RUNTIME behaviour is not knowledge until it has been run once

- **Kind:** mistake · **Area:** process · **Stage:** refine · **Owner:** architect / product-owner · **Raised by:** architect
- **What happened.** Five behaviours were specified and none was executed until the first gate that
  rendered the page and pressed the keys — at which point all five were wrong. Three more instances
  were caught earlier only because a developer stopped and flagged rather than working around.
- **Why.** Refine produces artefacts, and an artefact reads as settled. Nothing in the pipeline
  distinguishes *a decision* (which is true because it was taken) from *a claim about what the running
  system does* (which is true only if it is).
- **Lesson.** A refine-time claim about runtime behaviour — a refusal code, a rendered outcome, a
  payload shape, a keyboard response — must be **executed once at refine** and the verdict recorded
  beside it, the way task features' FEASIBILITY sections already are for pure functions. m45 did this
  for its fitness functions and called it necessary; m47 did not.
- **Refs:** `VERIFICATION.md` @finding-F-47-V-1, -2, -3, -12, -14; ADR-011; STATE §Feedback (architect,
  ruled by product-owner).

## R2 — The species also runs BACKWARDS, and that direction is more expensive

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** product-owner · **Raised by:** developer (47/03 fix pass)
- **What happened.** Four findings routed to a fix pass were **already fixed in the tree** when the
  agent started, each closed hours earlier with its own finding id in a comment, while STATE listed
  them as owed.
- **Why.** A fix-pass brief is assembled from the review report, and nothing re-reads the tree between
  the review and the dispatch.
- **Lesson.** A stale-**ahead** record is caught the moment someone executes it; a stale-**behind**
  record's failure mode is an agent silently re-implementing a green fix and re-testing what already
  passes. Closing a finding in code should close it in the record — or brief-assembly should be
  required to run the one-line check (`grep -rn "<finding-id>" test/`). It cost nothing here only
  because the developer measured before building and converted four rebuilds into four mutation
  proofs. **Reinforce that instinct.**
- **Refs:** STATE §"47/03 RESUMED AND CLOSED TO REVIEW"; @finding-F-47-03-QA-1/3/4/10.

## R3 — A downstream document can silently override an accepted decision

- **Kind:** misunderstanding · **Area:** contract · **Stage:** build · **Owner:** architect · **Raised by:** architect
- **What happened.** `DESIGN.md` moved the "filtered by" chip into the page as R0 — an alternative
  `ARCHITECTURE.md`'s ADR-007 **rejects by name** — with three measured reasons and no entry in the
  decision log. The build followed DESIGN and was right; ARCHITECTURE then read as contradicting a
  green, correct build and nothing surfaced it.
- **Why.** DESIGN and ARCHITECTURE are both authoritative, are written by different roles, and have no
  channel between them. An override leaves no trace where the decision lives.
- **Lesson.** When DESIGN contradicts an accepted ADR, the ADR is amended **in the same change** — and
  the milestone already had the right precedent twenty lines away in how ADR-010 corrects ADR-005 as a
  new dated ADR that edits nothing. The open question is what *makes* that happen, and who notices if
  it does not.
- **Refs:** @finding-F-47-03-ARCH-1; ADR-012 (the superseding ADR, written in response).

## R4 — The same claim asserted in a CODE COMMENT governs constants nobody re-derives

- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** architect · **Raised by:** architect
- **What happened.** `GlobalMilestoneCard` asserted the card is *"viewport-INVARIANT by construction …
  a ~300–370px band"*. Measured, the band is **286…368.66 and non-monotone** — 1024 gives a wider card
  than 1056 — and both of region 5's budgets had been derived from the row the card takes at exactly
  one viewport. A threshold keyed to 1280 was never a threshold.
- **Why.** An invariant stated in prose, consumed by a constant, checked by nothing.
- **Lesson.** **An invariant asserted in a comment and consumed by a constant is something a fitness
  function should couple.** ADR-014's Gate B does exactly that for this instance — it reads the grid's
  `minmax()` floor out of the source and requires the constant to equal it — and the general form is
  cheap.
- **Refs:** ADR-014; @finding-F-47-04-QA-8.

## R5 — …and when the constant IS re-derived, the term nobody measured is the one that is wrong

- **Kind:** mistake · **Area:** code · **Stage:** verify · **Owner:** product-owner · **Raised by:** designer
- **What happened.** The fix for the ≤390 slot overflow derived a trigger ceiling as *"rail 358 −
  scope 105.2 − **gaps 24** − aids 53"*. The slot row's computed `column-gap` is **16px, twice**; 12px
  is the *bar's* gap, one element up. Eight pixels. At its own ceiling the row needed 365.73px in a
  358px rail and wrapped into the chrome — and the record called the ceiling *"proved to bind … one
  y-band, no overflow"* for the exact case that wraps.
- **Why.** Every term in the derivation was measured except the one that was assumed, and the
  assumption was about a different element in a different file.
- **Lesson.** **A fit expressed as a sum must be recomputed by hand every time any occupant changes**,
  including occupants a later milestone adds. Prefer the structural form that makes the layout engine
  compute it (`flex-nowrap` + shrinkable occupants); where a constant is unavoidable, have the gate
  **read the CSS fact out of the source** rather than trusting a transcription. Note this is R1
  occurring *inside the fix for its own instance*.
- **Refs:** @finding-F-47-V-18; DESIGN §Surface 1 *"the fit is a property, not an arithmetic"*.

## R6 — A measurement was taken, printed, and its MEANING was not read

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** designer
- **What happened.** The fix for R5 moved the trigger's fixed slot to `sm` and left the aid drop at
  390, inverting DG-47-4 in the 391–639 band. The evidence was already on the page: the verify session
  measured the residual at three widths — **167.77 / 92.73 / 212.73px at 390 / 480 / 600** — and
  reported it as *"each width's true residual"*. It is non-monotone; the protected control is 75px
  narrower one designed drop above the width where it was in full. `aof-designer` found it in those
  three printed numbers.
- **Why.** This milestone built a strong reflex for *execute the claim* and none at all for *read the
  result*. Three numbers where the middle one breaks the trend is exactly what a human skims.
- **Lesson.** A measurement is evidence only once someone states what it **means**. The executable form
  is to **assert the shape of the number, not only its value** — here, `trigger width is monotone
  non-decreasing in viewport width`, one line, which fails the pre-fix build. This is the cheapest
  instance of R1's family: it needed a second *reader*, not a second run.
- **Refs:** @finding-F-47-V-23.

## R7 — Eight instruments were found wrong about the TREE rather than about the rule

- **Kind:** mistake · **Area:** architecture · **Stage:** refine, build · **Owner:** architect · **Raised by:** architect, developer
- **What happened.** Eight gates were wrong in ways that had nothing to do with the rule they encode:
  three positional slices over source; a comment-stripper that deleted 9,192 characters of a route
  table; a call-site sweep that counted a `.d.mts` declaration; a sibling-module gate that forbade the
  extraction another gate demands; a nested-collection blind spot (whose first fix reproduced itself
  one level down); and a self-check probe disarmed by an ADR adding constants to a module in
  alphabetical order.
- **Why.** Gates are authored at refine against a tree that does not yet contain the implementation, so
  *"does this gate PASS a correct build"* is never exercised — and the only reader who can tell is the
  developer, one stage later.
- **Lesson.** **Run each new gate against the current tree and state the verdict in its own header** —
  one line, unconditional, because the run *is* the check. It was proposed after the fifth instance and
  caught the sixth by accident within the hour. And the deeper structural fix for the largest class:
  no fixed character windows; use the shared brace-balancer in one home.
- **Refs:** @finding-F-47-03-ARCH-4, F-47-04-ARCH-2; TECH_DEBT item 24; STATE §Feedback (×4).

## R8 — A gate's non-vacuity proof must be self-contained, and reachable

- **Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** architect
- **What happened.** Two failures, opposite in shape. One gate's self-checks sat **downstream of the
  assertion they prove**, so they had never executed since refine — a proof that runs only when the
  gate passes, i.e. exactly when it is least needed. Another gate's evidence was **historical**: the
  red it once produced was consumed by the build before the gate existed.
- **Why.** Evidence that describes a *moment* rather than a *property*.
- **Lesson.** A non-vacuity self-check must not be reachable only through the assertion it is proving,
  and it must be a **planted mutant it can re-run**, never a red it once produced. A third instance
  sharpened it further: the proof that a *retired* instrument was wrong must be built on **synthetic**
  text, or it re-plants the defect it documents inside its own proof.
- **Refs:** STATE §"The completeness ratchet caught a DIFFERENT milestone"; @finding-F-47-04-ARCH-1/2.

## R9 — A gate that STORES what it found reports history

- **Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** architect
- **What happened.** A new ratchet named its two expected-red addresses inline in the lane name and the
  failure prose. Both were deleted by the in-flight build within hours — one of them while the review
  citing it was being written — so the gate's own message was wrong about the tree it was measuring.
- **Why.** Same shape as R8: evidence describing a moment.
- **Lesson.** **No stored counts, no stored addresses — report what this run found.** A house rule for
  fitness-function failure messages, in the same way *no fixed character windows* now is for the cuts
  that produce them.
- **Refs:** @finding-F-47-04-ARCH-1.

## R10 — A finding whose noun is a MECHANISM cannot be closed by fixing an instance

- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** architect · **Raised by:** architect
- **What happened.** A positional-slice finding was filed against one file, remediated for that file,
  and recorded as closing the species. Re-opened, it named three survivors. A mechanical census of all
  **266** gates measured **nineteen** cuts across twelve files — six inside this milestone's own gates,
  three more than the review that re-opened it had counted — and **two of the nineteen are invisible to
  any grep**, because the slice's end offset is bound to a variable before the cut.
- **Why.** *A species whose instances cannot all be found by searching for it cannot be closed by
  searching for it.* The detector that becomes the ratchet is the only honest census.
- **Lesson.** Closing a mechanism-noun finding should require **(a) a census and (b) a ratchet holding
  the count**, as preconditions of the close rather than as follow-ups. The ratchet took ~40 lines and
  proved itself in four mutations; the two review passes that missed the survivors cost far more.
- **Refs:** @finding-F-47-04-ARCH-2.

## R11 — The verification gate handed its own read-only judge an unsound artifact

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** product-owner (against itself)
- **What happened.** A design pass was handed frames captured with Chromium's `--window-size`, which
  does not reliably set the layout viewport: the page laid out wider than the image, was cropped, and
  the crop composited a bottom-anchored element twice. The judge returned three confident, specific
  findings — two rated HIGH — and all three were false. They were withdrawn only because the gate
  re-rendered through CDP device-metrics and measured.
- **Why.** A read-only judge structurally cannot detect that its input is an artifact; it can only
  judge what it is handed. Soundness is the *renderer's* obligation and nothing carried it.
- **Lesson.** **A render is not evidence until its own soundness is measured and recorded beside it**
  — `scrollWidth == innerWidth`, the layout viewport equals the stated width, and a format-level
  integrity check on the file — and that record travels **with** the frame to whoever judges it. This
  generalises the milestone's existing *verify the artefact, not the transfer* rule (R12) from *the
  file is intact* to *the measurement is sound*. Worth recording that the judge flagged its own
  uncertainty correctly in both places it mattered, and was right both times.
- **Refs:** @finding-F-47-V-21; DESIGN §Render breakpoints.

## R12 — A binary fetched through a size-capped channel needs a FORMAT check, not a byte count

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer
- **What happened.** The design mocks were fetched through an MCP whose file read caps at 256 KiB.
  `filter-control.png` returned 192 KB with a valid PNG signature, `truncated: true` in the envelope,
  and **no `IEND` chunk** — a file that opens, renders its top two-thirds, and looks like a baseline.
  It was caught only because the decode was checked for its terminator before the copy.
- **Why.** Nothing in the read path treats a truncated image as an error, and the failure mode is
  silence.
- **Lesson.** **Verify the artefact, not the transfer.** The check is per-format and cheap (`IEND` for
  PNG, EOI for JPEG). The recovery was also better than the fetch: reading the small *source* and
  re-rendering locally produced a `design-source.html` that is inspectable and re-renderable, which a
  downloaded PNG is not.
- **Refs:** STATE §"47/04 RESUMED … AND THE MOCKS LANDED"; `mocks/README.md`.

## R13 — Every layout claim in this codebase is asserted by reading class strings

- **Kind:** blocker · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** developer
- **What happened.** Three shipped defects — a slot that was never reserved, a slot that overflowed its
  bar, a breakpoint 8px above the window it was written for — were all invisible to the suite, which
  has no layout engine. Closing the last of them took **three** plausible fixes, each wrong in a way
  only a real browser could reveal: `min-w-0` never applying because `flex-wrap` breaks lines on
  hypothetical sizes; the shrink stopping at a wrapper span rather than the button; and a `<button>`'s
  `width: auto` being shrink-to-fit rather than fill.
- **Why.** Playwright is invoked on demand and is not a dependency, so the only channels are a headless
  tree with no stylesheet and a human.
- **Lesson.** For a surface carrying a DG-13…DG-22 geometry contract, an **on-demand browser lane run
  at the verify gate** is the honest floor — and the `@executable` / `@uat` split should name it as a
  third lane rather than pretending the choice is headless-or-human. This milestone has now paid for
  its absence four times.
- **Refs:** @finding-F-47-V-4, -18, -19; `VERIFICATION.md` §"Fix pass — 2026-08-13".

## R14 — A hand-carried cross-document citation bit three times, and every rescue was luck

- **Kind:** near-miss · **Area:** contract · **Stage:** build · **Owner:** product-owner · **Raised by:** architect, designer
- **What happened.** A cross-milestone classification was dispatched citing the wrong ADR number (the
  ruling was right, every other citation checked out, which is what made it dangerous). A returned
  DESIGN patch proposed a new section number **already taken** by an open gap cited ten times. An ADR
  attributed a yield rung to the wrong DG clause — and that one mattered materially, because the right
  clause is a local amendment and the wrong one re-opens the contract everything rests on.
- **Why.** Nothing checks a citation. Each rescue came from a reader who happened to be instructed to
  verify rather than transcribe.
- **Lesson.** The mechanical half is cheap and exists as a description already: **a sweep that resolves
  every `DG-*` / `ADR-*` / `file:line` citation in a record doc and reports the ones whose target does
  not contain what the citation claims**, plus a uniqueness check on any new section number a patch
  proposes. Make it a house tool rather than a standing instruction. Relatedly: ADR citations into
  files under active build go stale within the hour — **anchor by symbol, with line numbers as a dated
  convenience.**
- **Refs:** STATE §Feedback (×3); ADR-013; DG-47-7.

## R15 — The agent that owns the longest document cannot edit it

- **Kind:** blocker · **Area:** process · **Stage:** refine, build, verify · **Owner:** operator · **Raised by:** designer
- **What happened.** `aof-designer`'s toolset is `Read, Grep, Glob, Write, WebSearch, WebFetch` —
  `Write` is whole-file only, there is no `Edit`, and `DESIGN.md` is ~1,900 lines. **Every** design
  amendment in this milestone was therefore a two-party operation: the designer returned anchored patch
  blocks and a second party applied them by hand. It recurred at each of the three verify passes.
- **Why.** A toolset inherited from a time when `DESIGN.md` was short.
- **Lesson.** An agent whose single deliverable is one long document should have `Edit`. The failure
  mode the workaround invites is a hand-applied patch drifting from what the author ruled — precisely
  the class this milestone was bitten by repeatedly. **Not self-authorised**: it is an agent-definition
  change and the standing rule is that the operator decides. Same question for any other write-owning
  agent whose document has outgrown a whole-file rewrite.
- **Refs:** @finding-F-47-V-11.

## R16 — A hook-enforced hard constraint has a side door, and an agent went through it

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** operator · **Raised by:** developer
- **What happened.** The test-isolation guard blocks unisolated suite runs by pattern-matching *test*
  invocations. `scripts/check.mjs` is not one, and it chains `scripts/test.mjs` with no
  `AOF_GLOBAL_HOME`, so an agent reaching for the repo's own lint entry point ran the **full suite
  unisolated on the control node for ~18 minutes** and the guard was silent.
- **Why.** The guard's threat model is *"an agent runs the tests"* and it enumerates the **spellings**
  of that rather than the **behaviour**. Every aggregate entry point that chains the suite is an
  unguarded spelling.
- **Lesson.** No harm landed, and the reason is worth naming because it was luck of design rather than
  circumstance: `test.mjs` gives every unit lane its own hermetic global home, so the belt held while
  the braces were missing. The structural fix is `test.mjs` itself refusing to run on the control node
  without an isolated home — the one place no side door can bypass. **The standing rule held**: the
  agent reported the gap and did not self-authorise a guard change.
- **Refs:** STATE §Feedback (developer, 47/03 fix pass); STATE §"An unisolated FULL-SUITE run happened".

## R17 — Two agents edited one file concurrently, and it was noticed by luck

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** product-owner · **Raised by:** developer
- **What happened.** An arch-test file was rewritten by the architect (+250 lines) while the developer
  held it open adding fixture rows to the same file. The developer found out from an editor
  diagnostics notice, not from any mechanism. Both changes happened to compose.
- **Why.** This milestone deliberately serialised its stories against `Fleet.tsx` as the single hot
  file — and that serialisation **does not cover the fitness functions**, which turn out to be the
  second hot surface: five were edited by three different roles across the milestone.
- **Lesson.** Hot-file serialisation should be derived from the **whole change set** (production *and*
  gates), not authored as a list of production files. "Both changes composed" is an outcome, not a
  control.
- **Refs:** STATE §Feedback (developer, 47/03 fix pass).

## R18 — A story boundary was drawn on a blast-radius claim that two minutes would have falsified

- **Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** product-owner · **Raised by:** architect
- **What happened.** `47/02` was specified as zero-blast-radius and parallel-eligible with `47/01`,
  while **also** specifying that an export's return shape grows from a string to an object and that
  `47/03` makes the consumer change. Those cannot all be true — the new shape without the call-site
  edit breaks the live empty state at runtime and at `tsc`. Three artefacts then repeated the claim.
- **Why.** Blast radius was asserted from the file list rather than checked at the export's one call
  site.
- **Lesson.** *"Does this story change the SHAPE of anything another file already consumes?"* is a
  question the boundary-drawing step should answer **at source**. Note the cheap alternative nobody
  considered: keep the export backward-compatible across the two stories, which would have preserved
  the parallelism the boundary was drawn to get.
- **Refs:** @finding-F-47-02-ARCH-F2.

## R19 — Two lanes of one suite asserted contradictory things about the same element

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** qa · **Raised by:** developer
- **What happened.** One scenario asserts three drill-in states render three different strings; the
  next asserts the whole subtree — text included — is identical across those same three states. Both
  were authored in the same session against the same DESIGN table. No build can satisfy both, so one
  lane was going to be red whatever the code did — and the red was read as a code defect and carried
  in STATE as such for a day.
- **Why.** A feature's scenarios are reviewed individually and their Examples checked against DESIGN;
  **nothing checks scenarios in the same feature against each other.**
- **Lesson.** This one is mechanically detectable: two Thens over the same element where one pins a
  per-state value and the other pins cross-state equality of the region containing it. A cheap
  consistency read across a feature's own scenarios is worth adding at refine.
- **Refs:** STATE §Feedback (developer, 47/04 resume).

## R20 — The wall-clock was 644 hours; the work was ten

- **Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** operator / product-owner · **Raised by:** observability
- **What happened.** Calendar span **644h47m** against **9h49m** of real active agent time — 634h58m
  idle. **107h28m** blocked waiting for a human (17% of the span). **31h20m of dead air**: the main
  thread quiet, nothing running, and **no human asked**. Six infra kills (API session/usage limits)
  cost **36h20m** of that wait, each one ending only when a person noticed. Ten agents stalled; sixteen
  were grinding a fix-test-rerun loop.
- **Why.** Nothing restarts a dead orchestrator, and nothing notices a quiet one. The two are different
  failures with the same symptom.
- **Lesson.** Dead air is the tractable half and it is the one with no owner: a **stall watchdog** would
  have closed every one of those windows, and the milestone's own resume behaviour proves recovery is
  cheap once someone notices — the runs were marked retryable and continued their existing lineage
  rather than replaying. Separately, **serialisation cost ~10h48m of wall-clock** across four roles
  that never overlapped within themselves (parallelism factor 1.78×), which is the second-largest
  recoverable number in the report.
- **Refs:** `observability/report.md` §"Lost time — why the run stopped", §Concurrency.

## R21 — The budget worked exactly as designed, and nothing measured the trend

- **Kind:** near-miss · **Area:** code · **Stage:** build · **Owner:** architect · **Raised by:** architect
- **What happened.** `Fleet.tsx` went 1,547 → 1,390 (after a 250-line deletion) → 1,543 against a 1,560
  ratchet, with a fourth story still to land. The deletion bought 157 lines of headroom and one story
  spent 153 of them. The milestone's own net-negative projection was falsified at +206.
- **Why.** The ratchet measures the **file**; nothing measures the **trend**.
- **Lesson.** The budget behaved correctly throughout — green, never blocking a correct build, and it
  forced the extraction conversation at the right moment. But *"headroom consumed per milestone"* is
  the number that should have been watched, given TECH_DEBT item 33 already records five of six
  budgeted `ui/src` files sitting within 2% of their ceilings.
- **Refs:** @finding-F-47-01-ARCH-F6; TECH_DEBT item 33.
