---
doc: retrospective
---
# 53 · The loop as a CLI artifact — Retrospective

Distilled at Accept (2026-08-20) from `STATE.md`'s `## Feedback (for retro)`, the twenty-one
`VERIFICATION.md` findings, and the blocker stops at the milestone gate. Lessons are written to be
**carryable** — each names what to do differently, not what happened.

## R1 — When a contract and the tree disagree, the instrument is usually wrong. Measure first, rule second.

**Seven of ADR-015's nine rulings** (§1, §3, §4, §5, §6, §7, §9) reached the same verdict: *the
instrument was wrong about the tree, not the rule*. §5 was the sharpest — FF-5301's denylist denied
`workspace.mjs` while its own admitted `terminal-ws.mjs → work.mjs` edge reached it at
`src/work.mjs:17`, so the row **denied what it granted and was RED on any tree**. A filename glob had
been standing in for the concept "mesh *lifecycle*", which is what the ADR's own prose said.

**Carry:** when a refined contract collides with the code at build time, the first act is to measure
the tree at HEAD, not to change the code to satisfy the contract. A contract authored from recall
rather than measurement will name counts, paths and set sizes that were never true. Budget a
measurement pass into refine, and write the measurement into the contract beside the claim.

## R2 — A milestone's own register cannot see the damage the milestone does.

Every story lane was green (240/240) and all thirteen `FF-53xx` controls were green and red-probed —
and milestone 53 was still breaking **four other milestones' declared controls**: 52's FF-5202, 15's
ADR-005 command↔route bijection, 42's `acd-console-log-confined` (both lanes) and 47's
`F-47-04-ARCH-2`, plus ADR-005's generated-stamp contract and the command-registry census. Five
stories had already been **accepted** on evidence that was complete *for them*. Not one of the six was
visible from any story gate, because a story runs its own scenarios and a register only asks its own
questions.

**Carry:** the suite-scoping rule worked exactly as written, including its stated cost — the poisoning
is caught at the milestone gate, after stories are marked done, and rework follows. That is the
intended trade and it should not be quietly widened. What *should* change is the expectation: a
milestone gate is where cross-milestone breakage is **expected to be found**, so plan for a fix pass
after it rather than treating the gate as a formality before accept.

## R3 — Cross-cutting censuses are part of the story's diff. Name them at refine.

Five of the six blockers were closed by moving a control's own census, carve-out or ceiling — not by
changing production code. Only two source files changed behaviour at all (an evidence string, and a
report collector's default). The censuses that needed moving: `WORK_IDS`, `BOARD_DEFERRED`, `PRINTERS`
+ `PRINTER_CEILING`, the `src/bundle/**` file count, and ADR-005's asset-stamp branch.

**Carry:** when a story adds a **command**, a **bundle member**, or a **`src/work-doctor*` module**,
the repo-wide enumerations of those things are part of that story's diff. Enumerate them at refine
and list them in the story's must-touch column. The gate exposed two ids (`work:resume`,
`work:init-config`) that had drifted out of the census **before this milestone began** — the same
omission, made silently, twice before.

## R4 — A deviation recorded in STATE is a deferral, not a discharge.

53/05's progress row said *"the positional-slice violation … remain implementation obligations"*. It
was still there at the gate as **F-17**, breaking milestone 47's control. Writing a known defect down
made it visible and did nothing to close it.

**Carry:** an open obligation carried in `STATE.md` needs an owner and a gate, or it is a note. If it
must survive the story, raise it as a finding in `VERIFICATION.md` where the accept rule can see it —
the register is read at accept; a narrative row is not.

## R5 — A whole-tree snapshot hash fires on the wrong story, by construction.

53/04's distribution gate freezes a 94-entry manifest residue as ONE content address, to prove that
*that story* moved only two addresses. Closing F-18 stamped nine unrelated loop records, moving nine
hashes inside the residue — so 53/04's gate went red for a change that was not 53/04's. The claim it
protects stayed true; only the snapshot expired.

**Carry:** a freeze meant to scope one story's diff should **enumerate the paths that story may move**,
not hash everything it may not. Otherwise every later legitimate change to any other member re-opens a
closed story's gate, and the next reader debugs the wrong story.

## R6 — A stamp contract written for one file type is a contract about that file type.

ADR-005 requires every rendered asset to carry a `//` line-comment stamp. That rule was written when
the only asset was a **script**, and its own comment reasons explicitly about scripts ("frontmatter
would not parse and an HTML comment would not execute"). 53/07 shipped nine **markdown** assets, and
the rule became unsatisfiable: a leading comment breaks frontmatter parsing, an `aof-generated` key is
inadmissible because FF-5313 closes the vocabulary, and a marker after the frontmatter falls outside
the detector's 512-char head window for two of the nine.

**Carry:** when a contract's rationale reasons about a file's *language*, it is parameterised by that
language whether or not it says so. Adding a member of a new type to an existing kind is a contract
question, not a content question — check the kind's cross-cutting rules before adding the member.

## R7 — Verify a milestone on a branch carrying that milestone's work.

`feat/73-item-status-lifecycle` carried milestone 53, milestone 73, **and** `d5cea70` ("Added opencode
support") — an ungoverned commit of 3,372 insertions across 59 files, touching eight `src/` modules
with no record doc, no acceptance criteria and no review gate. Between them they owned ~9 of the
whole-repo sweep's reds, and the gate could not make the statement "the suite is green" about
milestone 53 at all. The bundle-tree tripwire fired at 53's gate for a change that was not 53's,
exactly as designed and exactly in the wrong place.

**Carry:** a milestone gate measures the branch, not the milestone. Rebase onto a branch carrying only
the milestone's work before the sweep, or accept that the gate's headline number is uninterpretable
and attribute every red by hand — which cost real time here.

## R8 — The human gate was waived, and the milestone shipped without ever running once for real.

`aof work loop` has never driven a real milestone end to end under observation. Everything asserted
about it is asserted against fixtures and injected seams — 240 story lanes, thirteen controls,
thirteen red probes. That is a great deal of evidence and it is **not the same claim**. ADR-008 §3's
definition of "proven" is not met; F-12 is waived by operator decision, not closed by evidence.

**Carry:** an `@uat` gate that is cheap to defer and expensive to run will be deferred. If a milestone's
central claim depends on one, either shrink it to something agent-runnable early (the soak's own
MIGRATION clause describes exactly how — a fixture-stream L2 drive asserting an expected halt id) or
schedule it as work with a date, not as a box at the end. Waiving it is legitimate and was the
operator's call; the cost is that the prose prompt cannot be deleted and the loop's headline claim
stays unmeasured.

## R9 — Red probes are cheap and they are the difference between a gate and a comment.

All thirteen controls were red-probed at the gate by mutating their own subjects, and all thirteen went
red with messages naming the invariant. The probe sweep took minutes and it is the only reason the
register can claim these gates *catch* anything. It also caught its own hazard: the first driver
restored subjects with `git checkout`, which would have silently discarded uncommitted fixes — it now
restores from the bytes it read, and diffs the tree before and after.

**Carry:** keep the probe harness. Run it at every milestone gate, restore from read bytes rather than
from git, and assert the working tree is byte-identical afterwards.

## R10 — A milestone gate cannot see work that was never merged.

53/05 was accepted on the **pre-review** version of its controls. Its real architect + QA review round
sat as three unmerged commits on the worker branch `aof/mesh/53-05`; the integration merge had carried
an earlier state, and nobody checked. The accepted lane was 39 tests where the story had delivered 53.
The review round had already found two of the blockers this verify spent the gate re-deriving, and had
already fixed F-17 better than this verify did.

Worse than the duplication: three refusal gates in the accepted set **passed green on a zero-subject
sweep**. They were red-probed at the gate and went red — which proves non-vacuity for the mutation
chosen and says nothing about whether the sweep reads any subject at all. **A red probe is not a
floor.** Both are needed: the probe proves the assertion can fail, the floor proves it had something
to assert over.

**Carry:** before accepting a story built on a mesh worker branch, run `git log HEAD..<branch>`. A
merge commit naming the story is not evidence that it carried everything. And when a gate sweeps a
set, assert the set is non-empty in the gate itself — never rely on a probe to notice.
