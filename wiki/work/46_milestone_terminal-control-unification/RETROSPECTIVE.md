---
doc: retrospective
milestone: 46
written: 2026-08-10
---
<!--
  Milestone RETROSPECTIVE.md — the distilled lessons from how execution actually went.
  One R<n> per lesson, appended and never renumbered. References VERIFICATION findings, ADRs and
  the observability snapshot; never restates them. A clean catch with no process lesson is NOT an
  entry — it already lives in VERIFICATION.md.
-->
# 46 · One terminal control — Retrospective

Distilled from `STATE.md`'s `## Feedback (for retro)` notes and `VERIFICATION.md`'s evidence across
six story gates, the design-conformance pass and the sign-off pass.

**The through-line, and it is the milestone's whole story: this build's model was excellent and its
INTEGRATION was unproven, and every serious defect lived in the thin seam where the model meets the
browser.** 537 green tests, a 71-mutant battery, three structural reviews and two behavioural reviews
shipped a terminal control that opened no socket. The gates were not weak — they were pointed
everywhere except at the one place nothing could reach. Nine of the twelve entries below are a
variation on it.

---

## R1 · A harness that cannot express a component's side effect does not test the component

`test/support/mini-react.mjs`'s `useRef` never assigned `.current`, so **every** `if (!ref.current) return;`
effect was unreachable in **every** UI suite — and all three app harnesses stub `TerminalControl` to
`() => null` besides. That is how a control that connected to nothing passed everything. Host refs are
now opt-in and one suite mounts the real component ([TECH_DEBT 29](../TECH_DEBT.md)), but the blindness
persists anywhere that has not adopted them.

**Carry:** when a component's job is a SIDE EFFECT (a socket, a subscription, a measurement), a suite
that renders it and asserts markup is not testing it. Ask what observable the effect produces, and
whether any harness in the repo can see it — *before* writing the suite.

## R2 · Read the VERB in the acceptance criterion and test that verb

DG-46-1 says *"every control the operator can still act on is **reachable**"*. Reachable is a hit
test; visible is a screenshot; legible is a contrast measurement — three different experiments. At
1280 everything looked fine and was fine. Testing `document.elementFromPoint(centre) === the control`
found a **total** failure at 760×520, the desktop app's own window: an open dock covered all three
actions, and a half-covered button still looks like a button.

**Carry:** the criterion's verb names the instrument. If the sentence says reachable, clickable,
announced, or dismissible, a picture is not evidence.

## R3 · A rule scattered across its triggers gets re-fixed once per trigger, forever

"A `fit` source re-fits whenever its box changes" was implemented once per trigger and only one of the
three ever worked: an observer for the drag (fine), nothing for the fullscreen transition (529px of
dead black under a source DESIGN says has no band), and a socket-gated function for the non-live bar
(26px of the last output row under an opaque bar, because the fit sat behind `readyState === OPEN` and
the session ending *is* what changes the box). Three defects, one rule, found weeks apart in one night.

**Carry:** when a fix is "and also call it from here", the rule has no home. Move the rule to the
module that owns the decision and enumerate its triggers there — `geometry.mjs` now names all three.

## R4 · A declaration nothing consults is worse than a missing one

`host-model.mjs` had always said `[HOST_FULLSCREEN][AFFORDANCE_PROVIDER_PICKER] = notDeclared("the
overlay renders the SAME descriptor as its opener and adds no control of its own")`. The overlay
carried the picker anyway, because the identity fragment was built once against the OPENER's host and
handed over verbatim. The model was right; the JSX never asked it. A reviewer reading the model would
have concluded the rule was enforced.

**Carry:** a declaration reads as governing. When one exists, the gate belongs on *whether it is
consulted*, not on whether it is written.

## R5 · A gate calibrated against its own plant is not calibrated

46/05's `fixed inset-0` gate was self-checked with a synthesized 7-line violation. Fed the **real
deleted violation** (`git show HEAD:…FleetTerminalView.tsx`), its portal clause did not fire — a
1,593-character span against a 400-character window — and nine other spellings slipped it.

**Carry:** a detector's plant should come from **history, not imagination**. Commit the historical
violation as a fixture and assert the detector fires on it, with a length assertion so a trimmed
fixture loses calibration loudly.

## R6 · An exemption needs an expiry that is not a filename

m45 exempted the one live `fixed inset-0` violation "until m46 deletes that file". m46 deleted the
file, the gate went green, and **the prohibited shape survived under a new name**. The same list was
then waved past with a one-line entry carrying *verbatim the reason its own header barred*.

**Carry:** `assert.equal(EXEMPTIONS.size, 0)` is the whole fix. "Shrink-only, and this reasoning is
barred" is prose until an assertion says it.

## R7 · A milestone needs ONE whole-estate fitness sweep before it accepts

46/02's correct `MESH_UI_HOST` extraction broke `acd-mesh-ui-single-server`'s literal-matching
detector. It sat red in the working tree and green at HEAD **through three subsequent stories**,
because every story ran focused suites — the right local discipline — and nobody owned the estate.
The same sweep surfaced a third unrecorded HEAD red within a day of [TECH_DEBT 27](../TECH_DEBT.md)
being written.

**Carry:** a refactor in story N breaks a detector belonging to nobody. The sweep is a schedule item,
not a gate.

## R8 · In-process is answered from the cache that does the masking

Twice, in different guises. 46/02's module-scope constant read closed an import cycle that
`import("./src/cli.mjs")` masked and a fresh-process probe exposed. And the first mutation battery for
the yield gates ran all five plants in ONE process, so `palette.mjs` stayed cached with plant A's
value — it reported five kills while having actually tested one. **The tell was the red pattern not
matching the plant**: a `shrink-0` mutation cannot redden a viewport-variant lane.

**Carry:** one fresh process per plant, and always a **control run with no plant at all**. When the
failures do not match the mutation, suspect the harness before the code.

## R9 · A single green observation was allowed to stand for a set — three times

The 390 header was measured in `streaming` only and reported fixed; `streaming` is the *narrowest*
state, and the ref truncated to `46…` in `waiting` (the ramp's longest word) and `46/_` in `ended`
(which gains the `↻` control). The fullscreen re-fit was verified at one width. The design renders
covered three states of nine.

**Carry:** a responsive or state-dependent claim must be verified across **the dimension that changes
the measurement** — and when a state is hard to observe (`waiting` lives for ~124ms), substitute into
the live layout rather than racing a screenshot. A state that is hard to observe is the one most
likely to be wrong.

## R10 · A comment is a claim, and the easiest kind to believe without checking

The re-layout effect stated in terms that *"a `fit` source re-fits (more rows and columns, glyphs
unchanged)"*. Nothing called `fit()`. Three reviews read that comment. This is the milestone's own
"a build's summary of its own evidence is not evidence", one level down.

**Carry:** when a comment asserts behaviour, the reviewer's job is to find the line that performs it.

## R11 · The acceptance check is the command the deploy runs, not a nearby one

`tsc --noEmit` was clean and `vite build` was clean; the deploy runs `tsc -b`, which typechecks the
`.d.mts` siblings, and it failed on two real errors. The orchestrator repeated the claim without
running the command.

**Carry:** name the exact command in the acceptance criterion. "The build is clean" is a claim about a
command, and which command is the whole content of it.

## R12 · A tolerance that reports what it INTENDED rather than what it DID converts a loud failure into a silent corruption

`install-local.mjs` deleted the payload's `node-pty`, failed to copy it back, and logged
`(kept existing … — locked by a running process)`. Every terminal on the machine then died with
`Cannot find module 'node-pty'`, and the deploy that caused it printed the opposite
([TECH_DEBT 30](../TECH_DEBT.md)). The trigger is the ordinary one: the first install after any PTY
has been spawned.

**Carry:** an error handler's message must be derived from what it actually left behind. And a
blast-radius of "one file" must be implemented as one file — a whole-tree `cpSync` cannot express
*copy everything you can*.

## R13 · A judge that says "I could not see this from here" is worth more than one that answers everything

Two of `aof-designer`'s findings were **refusals**, each naming the measurement that would settle it.
Both were then settled by computed style in one command: the 8px gutter was fine, and the fullscreen
re-fit was a real defect that had survived a 9/9 green suite, five reviews and a browser pass.

**Carry:** budget for "I need a different instrument" as a first-class review outcome. A judgement made
from the wrong instrument is a coin toss wearing a verdict's clothes.

## R14 · Not being able to reach a state is a finding about the CONTRACT, not a hole in the evidence

`idle` has **no route in the product** — every door into the dock binds a session first — so a locked
scenario asks for a render the UI cannot produce. `unavailable` has the same shape, and the contract
anticipated it by demanding a *forced fixture*; `idle` was not so lucky.

**Carry:** at refine, ask of every state "what produces this?" A state with no producer needs a fixture
named in the contract, or it is a scenario nobody can ever run.

## R15 · Scope discipline held, and the one time it was tested the measurement decided it

The dock compressing the board at small windows looked like board-responsiveness work leaking into a
terminal milestone. Measured with the pre-fix header and **no dock at all**, the board is fine from
900px down to 440px — so the dock's `floor(box/2)` claim on the content box is the cause, and the fix
was in scope. **The residual is not:** at 760×520 the dock's contracted half leaves 216px for a panel
that wants ~362px, and no amount of terminal work changes that. Logged as its own item rather than
chased here (operator's ruling, 2026-08-10).

**Carry:** when scope is disputed, the cheapest resolution is usually an experiment that removes the
suspected cause. And a locked rule producing an unattractive consequence is a contract decision, never
a thing to quietly edit.
