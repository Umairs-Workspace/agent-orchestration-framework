---
doc: retrospective
item: 83
created: 2026-08-24
updated: 2026-08-27
---
# 83 · Retrospective

Distilled from the architect and QA lanes of `aof:assimilate-code`, then amended after operator
feedback moved the deterministic bounds into code. Eight lessons, each carryable past this story — the last two added at the accept gate.

## Post-review amendment · A language bound is documentation, not enforcement

The first review correctly found that the proposed round and wave bounds were still delegated to the
orchestrating model. The subsequent implementation moved review admission, the blocker-count stall,
the absolute three-round ceiling, and ready-set write partitioning into deterministic runtime code.
The prompts now consume or document those decisions. R1's call-graph discipline still holds, but its
initial conclusion that the prose path should remain independently bounded was superseded by the
measured failure mode: model restraint cannot be the enforcement layer for a model loop.

## R1 · A record pointing at a file does not make that file the implementation — check the call graph

This review's most severe finding was wrong, and the way it went wrong is the lesson.
`src/bundle/loops/review-fix-rereview.md` declares `ceiling: [config:work.loop.reviewRounds]` with
`reference:` and `measurement:` both pointing at `prose:src/bundle/commands/continue.md`. Read as a
pointer *to the implementation*, that makes the prose and the engine one loop, and the delivered
literal "three" a competing runtime cap. It is not: `reviewRoundsFromConfig` and `decideReviewGate`
are called only from `src/commands/loop.mjs`, `autonomous.md:33` delegates to that shell rather than
re-implementing it, and no code is interposed on `/aof:continue` at all. The loop record documents
where the loop is *described*; the prompt path genuinely had no bound, exactly as FIX-3 said. The
same misreading produced a second finding about severity vocabulary, against an adapter whose own
comment says it is not the production path.

**Carry:** frontmatter pointers, ADR citations and registry entries are claims about *documentation*
until the call graph says otherwise. Before grading anything a duplicate, a competing implementation
or a second authority, trace the callers — one grep for the resolver's call sites would have retired
both findings before they were written. Two lanes agreeing does not substitute for this: the finding
came from a lens with fitting evidence, and the evidence was about the wrong pair of things. The
orchestrator caught it only because the operator pushed back.

## R1b · Separate paths may document one policy, but only one runtime should enforce it

Milestone 69 shipped a one-round default and blocker-gated escalation in code, but a structured
Blocker could continue extending the loop. FIX-3 initially repeated the desired stop in prose. The
revision instead clamps the configured value to three, persists blocker counts, and refuses both a
non-decreasing count and round four in the existing runtime decision path. The prompt may state that
policy, but it does not own the counter.

**Carry:** when the same policy appears twice, distinguish documentation from enforcement. Multiple
surfaces may explain the rule; the counter, cap, and transition decision still need one code-owned
authority that a model cannot bypass by continuing to reason.

## R2 · The ADR that names a defect species is the one an unrelated change will re-commit

`src/phase-brief.mjs:212-217` states the rule and prices it: two copies of one frontmatter regex, one
grew `\r?` and the other did not, 31 of 41 stories silently lost their dependencies for a year. The
new `src/story-contract.mjs` re-types that regex — and `src/commands/validate.mjs` now imports the
ADR's own module and the re-spelling on adjacent lines. The reasoning was sound in isolation
(`src/work.mjs` is a 261-dependent god node, so routing around it is right); the mistake was
concluding that a new *module* licenses a new *grammar*.

**Carry:** a pure-leaf module is the right shape; a second parse of a shared format is not, whatever
shape holds it. Separate the two questions — "where does this code live?" from "how many readers does
this grammar have?" — and answer the second by counting. The count here went 4 → 5, and the fifth was
the first to diverge.

## R3 · An empty default silently disarms the gate that fires on absence

FIX-2 made a missing `reads:` a hard stop on purpose. The template then shipped `reads: []`, which is
present-and-empty — so the stop fires for every legacy story and for no story the framework creates.
Three surfaces each independently made empty legal (`add-story.md` "intentional at creation time",
`refine.md` "may be empty", `validate.mjs` `if (!declaration.present) continue`), and none of them
could see that together they made the gate unreachable.

**Carry:** when a gate keys on absence, the scaffold must not author the key. Otherwise the
placeholder and the deliberate answer are the same value, and no reader downstream can tell "nobody
refined this" from "refine decided none were needed". Both reviewers found this independently, which
is the signal that it is structural rather than stylistic.

## R4 · A substring assertion on a prompt proves distribution, and nothing past it

QA mutated the real bundle files and re-ran the delivered assertions: the cap number could be changed
to five, the wave partition inverted to "add every story regardless of its write set", every
reporting-bar body truncated to one sentence, and `<review_context>` deleted from three agents — all
with the suite green. The single load-bearing authoring prompt, `refine.md`, is never opened by any
test at all.

**Carry:** distribution-altitude assertion is the honest ceiling for a prompt-only change and is
worth having. But pin the *operative clause*, not the headline — the sentence whose deletion changes
behaviour, not the one that announces the section. And where a change spans several prompts, assert
over every prompt it edits: an untested authoring path makes every downstream mechanism inert while
CI stays green. Prefer mutation-testing a prompt change over counting its passing assertions.

## R5 · The reverse path found what the forward path would have priced in ADRs

`aof:assimilate-code` has no research and no build, so the entire cost was two review lanes over a
finished diff. The lanes returned four severe findings; two survived scrutiny (the grammar
divergence, the disarmed absence gate) and two did not (R1). Both survivors were invisible to a green
224-case run, and both were found by reading the tree's own records rather than its tests.

**Carry:** green tests are not agreement with the codebase's own decisions — but a citation of an
in-tree record is not agreement either until its subject is verified. The review that matters for a
policy change reads the records that already hold policy *and* traces what executes them. Note the
split here: the findings that survived were ones where the reviewer had **measured a behaviour**
(two parsers, two answers; a present-and-empty key against a gate keyed on absence), and the ones
that fell were ones where it had **inferred a relationship from a document**. Weight a finding by
which of those two it is.

## R6 · A folder named `_to_delete` is an intention; a hygiene finding closes on a mechanism

F-83-F said three untracked files were sitting in a tracked directory and routed "delete all three
before commit". At the accept gate the three had been moved into `.aof/_to_delete/` and four scratch
artefacts had joined them — `git check-ignore` still exits 1 for all seven, so `git add -A` would still
commit a duplicate of a shipped module, and the finding is now larger than when it was written. The
lesson is not "the fix was skipped": the files were plainly staged for removal by someone who meant to
remove them. It is that a hygiene finding is discharged by a MECHANISM a check can read — the file is
gone, or the path is ignored — and relocation reads as progress to a human and as nothing at all to
`git`. Re-measure such a finding at the gate rather than reading its route as its resolution.

## R7 · A red fitness lane is inherited by default, so name whose it is at the gate

Running the whole `test/arch/**` lane at this story's gate returned five failures, and the first
instinct — that a story touching `validate.mjs`, `story-contract.mjs` and `ready-wave.mjs` had broken a
control — was wrong in every case. Four name files byte-identical to `HEAD` (pre-existing red), and the
fifth (`acd-loop-scope-guard`, a pinned hash of `src/work.mjs`) is caused by a CONCURRENT lane's
uncommitted `parseStorySpan` edit sitting in the same working tree. A shared working tree makes
"the suite is red" an ambiguous sentence, and the cheap disambiguation is `git diff --name-only HEAD`
against the failing test's implicated files. Record the answer as a finding routed to the owning lane —
an inherited red that is neither fixed nor named becomes the next gate's baseline.
