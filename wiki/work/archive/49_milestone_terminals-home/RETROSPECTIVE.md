---
doc: retrospective
milestone: 49
written: 2026-08-13
---
<!--
  Milestone RETROSPECTIVE.md — the distilled lessons from how execution actually went.
  One R<n> per lesson, appended and never renumbered. References VERIFICATION findings, ADRs and
  the observability snapshot; never restates them. A clean catch with no process lesson is NOT an
  entry — it already lives in VERIFICATION.md.
-->
# 49 · The terminals home — Retrospective

Distilled from `STATE.md`'s fifteen `## Feedback (for retro)` notes, [VERIFICATION.md](VERIFICATION.md)'s
findings and their triage, and the [observability snapshot](observability/report.md) over 45 agent runs
across six sessions.

**The through-line: this milestone's costs came almost entirely from claims that read as measurements.**
A SPEC clause whose premise was already false when it was written. A STORY that printed a `grep` as
evidence and returned four hits when run. Six file-budget rows computed with `wc -l` where the gate
counts `split(/\r?\n/).length`, every one understated in the unsafe direction. An ADR that specified a
seam in prose, read complete, and was missing the argument that *was* the defect. An amendment that
characterised a DESIGN clause it in fact contradicted. An invariant asserted as a hard-coded return
value, sitting in the same frozen object as the code that falsified it. A copy rule written *"every
count in **the summary**"* — scoped to the one site that exposed it, so the fix never reached its
sibling on the same screen. And underneath all of them, the reason none was caught: **there is no CI
test job in this repository**, so every "fails CI" sentence in every ADR is aspirational, and
`aof work validate` — the thing a chore closes on — has never run a fitness function in its life.

**The counter-force that worked, and worked in both directions, was re-execution.** Verification
re-ran its agents' claims rather than relaying them. Once that caught a destroyed working tree that
every green test was blind to (the suites live outside `ui/`). Once it refuted a blocker that did not
exist. Neither would have been found by reading a report.

---

## R1 · A prohibition written as a list of forbidden COMMANDS does not generalise to the hazard

- **Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** orchestration · **Raised by:** verify session

The entire `ui/` tree was destroyed twice in one day. The second time, the agent was **obeying the
prohibition written after the first**: every brief said *"NEVER `npm ci`, NEVER delete or recreate
`node_modules`"*, and the agent created a detached `git worktree`, junctioned `node_modules` into it,
and ran `git worktree remove --force`. The hazard was never the install — it is the
`node_modules/@aof/ui` **junction**, which a recursive delete follows into the source tree. Every brief
named commands.

Three things follow. **(a)** A ledger entry's TITLE must name the mechanism, not the command that first
exposed it — item 36 said *"A root-level `npm ci` can DELETE…"*, and that framing is exactly what the
second agent read and complied with. **(b)** Forbidding the install without providing a sanctioned
sandbox recipe **manufactures** this failure: `git worktree` is the natural next move for an agent told
it may not reinstall. **(c)** The tree was left in the worst possible state — every suite and fitness
gate survived, because they live outside `ui/`, while the code they prove was gone. A full run would
have reported mass failure of work that was correct.

**Carry:** name the mechanism in the title, and ship the sanctioned alternative in the same breath as
the prohibition. **Refs:** [TECH_DEBT](../../TECH_DEBT.md) item 36 · `@finding-F-49-00-b`

## R2 · Commit at the gate, not in a batch

- **Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** orchestration · **Raised by:** verify session

Both wipes destroyed **exclusively uncommitted state**. The committed halves — story 00's production
code, the record docs, ARCHITECTURE's amendments — came through both incidents untouched, twice. The
milestone ran for hours with eight stories' work uncommitted while the orchestrator waited on a commit
decision because another session was live in the tree; that caution *was* the exposure. Recovery was
possible only because each builder's agent transcript still held its files.

**Carry:** in a shared or agent-driven tree, a story that has passed its gate is committed at that
moment. An unreviewed commit is recoverable; a destroyed working tree is not.

## R3 · A guard that matches the RUNNER'S PATH misses every wrapper that runs it for you

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** tooling · **Raised by:** verify session

The test-isolation hook blocks a bare `node scripts/test.mjs`, but `node ./scripts/check.mjs` sails
through — and `check.mjs` shells the full suite, which on this machine binds `:4182` and `:4181`, both
held by live daemons. Two agents hit it in one session. It also fails the other way: it blocked a
read-only `grep` whose command string merely *contained* the suite path.

**Carry:** a guard should match what a command **transitively executes**, or the wrapper should refuse
when a daemon holds the port. And `npm run check` — this repo's own advertised "check everything" verb —
is **unusable on the control node with nothing saying so**; a repo-standard command forbidden on the
machine it is standardised for must say so in `CLAUDE.md` or fail fast with the reason.

## R4 · This repository has no CI test job, and every gate it ships is therefore a comment

- **Kind:** mistake · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Raised by:** architect

`.github/workflows/` contains exactly one file — a tag-driven build/sign pipeline with **no test job** —
and there is no other CI config in the tree. So every "fails CI" clause in every ADR and every fitness
function in this repository is aspirational: the gate is a local habit, not an enforced one. It is the
root cause behind the red-suite ledger, and it re-scopes that item's fix from *"run the suite properly
locally"* to *"a workflow asserts the green"*.

**Carry:** a milestone that ships fitness functions to a repo with no CI is shipping a comment.
**Refs:** `@finding-F-49-00-h` · [TECH_DEBT](../../TECH_DEBT.md) item 27

## R5 · A check a document PRINTS is a claim wearing the costume of a measurement — run it

- **Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** verify session

Story 00 stated `grep -rn "needs-input" ui/src` returns nothing. It returns four hits — the board has
keyed on the exact word and rendered a "WAITING ON A HUMAN" treatment since `277ada5`, long before this
milestone. The consequence was not cosmetic: it falsified the ruling that story 05 would be the
vocabulary's *first* author, changing that story's instruction from "author the mark" to "reconcile with
the existing one".

**Carry:** when a record doc prints a command as evidence, run it at refine and paste the output. It is
the cheapest anti-rot measure this milestone found, and the only one that costs nothing to apply.
**Refs:** `@finding-F-49-00-e`

## R6 · Cite the FACT plus a stable anchor — and do not refine against a mid-flight tree

- **Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** architect

Four anchor-rot instances in one milestone, root cause **measured rather than assumed**: the tree
carried two milestones' uncommitted work and moved *during* the refine — `Shell.tsx` 917→930,
`Fleet.tsx` 1532→1539, `ui/src` 20228→20298 lines, all between two measurements hours apart. A bare
line number in a record doc has a half-life of about an afternoon against a tree that is still moving.

**Carry:** cite the fact plus a **stable** anchor (function, route, constant, test name), with the line
as a hint only; a load-bearing pointer belongs in a **detector** that reads the real file, where rot
fails a gate instead of misleading a reader. And treat refine-against-an-uncommitted-tree as a hazard in
itself — every measured number in a document authored in that window is a snapshot of something still
moving, and the document should say so rather than reading as settled fact.

## R7 · An ADR that specifies a pure function as a SEAM must write its signature and one total invariant

- **Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** aof-qa

ADR-006 specified the subscription arbiter as a pure function of `(rows, cap, intents)` — three
arguments, in prose. Driven at cap, that form **cannot express "do not demote"**: it can only re-rank,
and every re-rank is an eviction, reproducing the exact irreversible scrollback loss the cap exists to
prevent. The missing argument *was* the defect, and the prose read complete. Found by QA's contract
pass, not by a structural review — because a seam's gap appears only when the seam is **driven**.

A second, related failure in the same pass: **ADR and DESIGN were authored in parallel over the same
rule** (a cap's behaviour at its limit) and disagreed outright — the identical shape m46 recorded
between its own draft and DESIGN.

**Carry:** an ADR specifying a seam writes its **signature** plus at least one **total invariant** over
it, never an argument list in prose. And refine should diff ADR decisions against DESIGN rulings before
either reaches a builder, rather than leaving it to QA's contract pass. **Refs:** ARCHITECTURE ADR-006
amendment (5a/5d)

## R8 · An invariant asserted as a hard-coded return value is a comment with a type

- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** aof-architect

`demoted: EMPTY // empty on every input, by construction` sat in the same frozen object as the code
that falsified it — twelve live incumbents released. A field whose value is a literal can never be
wrong, so it can never be right. Same pass, same species, second instance: two `cause` fields were
`a ? x : b ? y : z` chains whose **last branch absorbed the unclassified case**, fabricating `hidden`
for capped-out panes and `at-cap` for unaddressable rows.

**Carry:** treat *"by construction"* in a return shape as a smell — an invariant must be **computed from
the same inputs** as the answer it describes, or it cannot detect its own violation. And every `cause`
needs a **biconditional** precondition, never a fall-through. **Refs:** `@finding-F-49-02-c`

## R9 · An amendment claiming a DESIGN clause is satisfied must QUOTE it, not characterise it

- **Kind:** mistake · **Area:** architecture · **Stage:** build · **Owner:** architect · **Raised by:** architect

ADR-003's amendment ruled the unfed pane `idle` — correct — and in the same parenthetical claimed
`PANE_EMPTY_HOST`'s centred line *"is exactly the shape DG-49-2 asks for"*. DG-49-2 says **top-left**,
in three places. The amendment was ruling a **state** and had no business ruling a **treatment**, and
the developer correctly built to it. A parenthetical that mis-describes the document it claims to
satisfy is worse than silence, because it reads as a reconciliation and a builder stops checking.

**Carry:** when an amendment claims a DESIGN clause is satisfied, **quote the line**. The quote is what
makes the claim falsifiable at the moment it is written. **Refs:** `@finding-F-49-05` (F5)

## R10 · A correction scoped to the site that exposed it will be missed at the next site

- **Kind:** mistake · **Area:** contract · **Stage:** verify · **Owner:** designer · **Raised by:** verify session

The designer's first pass ruled the summary counts must pluralise (GAP-3) and wrote the correction as
*"every count in **the summary** pluralises by its own value"* — scoped to one component. The fix
inherited that scope. Re-rendering the fixed build found `1 runs in flight` **on the live production
screen**, the first sentence an operator reads on this milestone's own surface: a different string, the
same defect, never in the fix's blast radius. Patching a third string would have left the fourth.

The second-order instance is sharper still: landing the rule for GAP-6 revealed that the earlier
correction had fixed **its own template** and left the **binding checklist** — which is the copy a
builder actually implements from — uncorrected. One string, two homes, one fixed.

**Carry:** when a correction states a rule, ask whether the rule's true subject is wider than the site
that exposed it, and state it at that width — once, above the table, binding on every row, with the
instances enumerated so the sweep is checkable rather than remembered. The structural fix is a single
shared function; a rule applied per-site is a rule that gets missed at the next site.
**Refs:** `@finding-F-49-VER-b` · DESIGN-CONFORMANCE-49 §2b GAP-6

## R11 · A chore can introduce an architectural regression and close GREEN by construction

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** orchestration · **Raised by:** verify session

Two fitness functions requiring `config.memory?.backend` to be read in exactly one place are red at
HEAD, and the reads that broke them were added by a chore that is `status: done`. A chore's close
criteria (ADR-003) are a ticked checklist plus a green `aof work validate` — and **`aof work validate`
validates the work stream: folder↔frontmatter, tag vocabulary, the depends graph. It has never run a
fitness function.** So the gate ran, passed, and could not see the violation.

This is not the chore's mistake. It is a hole in what "validate" is asked to mean at a chore's accept,
and it will recur on every chore until either the criterion names the fitness set or R4's fix makes the
green signal an asserted one.

**Carry:** a close criterion must name the thing it is meant to protect. "Validate is green" protects
the work stream and nothing else. **Refs:** `@finding-F-49-VER-a` · [TECH_DEBT](../../TECH_DEBT.md) item 27

## R12 · Re-executing an agent's claim is the whole value of verification, and it cuts both ways

- **Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** verify session · **Raised by:** verify session

Every result in [VERIFICATION.md](VERIFICATION.md) was executed by the verify session rather than
accepted from a report, and it earned its keep twice in opposite directions. **Once it caught a loss:**
the build reported a two-file change, and by the time the reviews returned one of those files had been
reverted by a tree-destroying event no test could see. **Once it prevented a fabrication:** a capture
agent reported the expanded pane's exit control unreachable by keyboard — a blocker of the same species
as a real defect fixed earlier the same day — measured as eight forward `Tab`s cycling inside the opener
tile. Re-run here, the control is reached at **stop 9 of 13**. The walk stopped one press short, and its
two supporting observations were both contracted behaviour.

**Carry:** a relayed green and a relayed red are equally unreliable. The cost of re-running a claim is
minutes; the cost of recording either kind of wrong one is a milestone.
**Refs:** `@finding-F-49-00-b` · `@finding-F-49-VER-c`

## R13 · Nothing restarts a dead orchestrator — 31% of this milestone's span was waiting for a human

- **Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** orchestration · **Raised by:** observability

Measured over a 126h46m calendar span containing **9h25m of real active time**: **39h06m blocked
waiting for a human (31%)** and a further **15h06m of dead air (12%)** — the main thread quiet, nothing
driving, and no human asked. A **single infra kill** cost **16h48m** of that, because nothing noticed
the orchestrator was dead until the operator did.

The dead-air windows are the sharper finding: each one is a window a stall watchdog would have closed,
and unlike the human waits they are not the cost of needing a person — they are the cost of nobody
being asked.

**Carry:** the loop needs a way back in that does not require a human to notice. A watchdog that
detects "nothing is running and nobody was asked" and either resumes or *asks* would have recovered the
largest single loss in this milestone. **Refs:** [observability/report.md](observability/report.md)

## R14 · The supervisor's missing programmatic stop now has a price on it

- **Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** tooling · **Raised by:** observability

The deploy loop requires the operator to quit a GUI app by hand. In this milestone alone that cost
roughly **four and a quarter hours** of the human-blocked time above, across waits whose restart
messages are unambiguous about the cause — *"I can't quit the desktop app again"*, *"I can't quit the
app from the task tray, that's the only way to quit"*. The debt was already ledgered as a design
observation; it now has a measured cost attached to it.

**Carry:** a documented loop step that only a human at a GUI can perform is a rate limit on every
milestone that deploys. **Refs:** [TECH_DEBT](../../TECH_DEBT.md) item 20 ·
[observability/report.md](observability/report.md)

## R15 · Write-first building grinds, and the transcripts say so precisely

- **Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** observability

**Sixteen of 45 agent runs** are flagged as grinding — active time dominated by a fix-test-rerun loop
rather than by idle. The sharpest instance is story 05's build: **199 edits against 1 test run**, with
`TerminalControl.tsx` edited **70 times** and one command re-run 33 times. Toolchain wait was 0% of
active time, so this is not a slow machine; it is a loop that edits far ahead of what it verifies.

**Carry:** a builder that edits 199 times between test runs is not building, it is guessing with
conviction. An edit↔test rhythm is worth stating in the brief the way a file budget is — and it is
measurable from the transcripts afterwards, so it can be checked rather than asked for.
**Refs:** [observability/report.md](observability/report.md) §Why slow
