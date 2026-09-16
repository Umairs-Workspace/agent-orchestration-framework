---
type: story
number: 84
slug: story-span-ref
doc: retrospective
created: 2026-08-27
updated: 2026-08-27
schema: 1
aofVersion: 0.1.0
---
# 84 · Retrospective

Lessons from assimilating the story-span ref. The code was delivered before governance, so these are
lessons about the *delivery*, not about a build loop that never ran.

## R1 — A forced placement was written up as a design decision, and only a review caught it

The change put the span rule in `src/work.mjs` rather than in `work-ref-scope.mjs`, the declared home
of the subtree-scope rule. The reason was real and hard: `work.mjs` cannot import that leaf, because
the session driver's root-inclusive reach measures the ADR-015 §5 ceiling of 24 **exactly**, so
FF-5301 reddens on the import alone. That constraint was verified before writing a line.

What went wrong is what was written *around* it. The code comment, the test-file header and the commit
message all framed the placement as "three lanes, three deliberate vocabularies — not three copies of
one that have drifted". **TECH_DEBT item 49 already says the opposite**, by name: "The work stream has
THREE independently-written scope parsers, and the one the loop depends on fails OPEN", with `nextWork`
on its consumers-to-migrate list. The placement was forced; the framing converted a ledgered debt into
an apparent decision.

**Why it matters more than it looks:** that header is the artefact the next author reads when deciding
where the *fifth* scope form goes. A justification reads as precedent; a ledger entry reads as a debt to
pay. Writing the first when the second is true is how drift becomes architecture.

**Carry:** before defending a placement as deliberate, grep `TECH_DEBT.md` for the concept. If the
ledger already names it, cite the item and the constraint — never re-derive the justification from
first principles, because a fresh derivation will always sound more principled than a debt.

## R2 — A new vocabulary was taught for a surface that only half-implements it

`inRange` returns `() => true` for any shape it cannot parse, so an unrecognised scope is **silently
discarded** and the walk answers for the whole stream. Measured after the change: `44/01` returns
milestone 45's story alongside 44's; so do `44/01-03x` and an en-dashed `44/01–02`.

The fail-open predates the change and was not caused by it. But the change *teaches operators a
story-grained scope vocabulary*, which makes the natural next keystroke — `aof work next 44/01`, or a
one-character typo in a span — hand out another milestone's work. Before, "next doesn't do story
scopes" was at least uniform.

This was visible from inside the work: the story's own feature narrative names the silent-discard as
the defect the span replaces, and I measured it in the very first investigation. It was recorded as a
known adjacent gap and then not carried into the delivery as a risk.

**Carry:** when a change makes a partially-implemented surface *more reachable*, the reachability is
part of the change even though the defect is not. Either close the shape you just made likely, or name
it in the item as a shipped-with risk. "Pre-existing" is a statement about blame, not about exposure.

## R3 — The prompt half of a two-half change shipped with nothing pinning it

Half the deliverable is a bundle prompt: `continue.md`'s span dispatch branch and its three rules
(never widen the ref, report an out-of-span dependency rather than building it, never move or accept
the milestone). No test references the span form or any of that prose. The whole branch could be
deleted and all 12 lanes plus the manifest hash test stay green — the hash detects *change*, not the
*claim*.

The repo already had the pattern, on this exact file: `test/work-dispatch-lanes.test.mjs` lane
`dispatch/02` asserts `continue.md`'s prose for presence *and* absence. It was not reached for, and the
scenario covering that half was tagged `@manual` — which reads as "not automatable" when the truth was
"not automated". Three of its four `Then`s are shipped-bytes obligations assertable today.

**Carry:** when a change ships prose that a later agent must obey, ask what test would fail if the
prose were deleted. `@manual` is honest for behaviour only an agent can exhibit; it is a hiding place
for a shipped-bytes claim.

## R4 — Three merges grew a ratcheted file and none of them said so

`src/work.mjs` is under a shrink-only ratchet (`lines < 1210`). Measured: 1,209 when the ratchet was
set → 1,286 → 1,339 → **1,405** after this change. Three consecutive merges each grew it, +196 total,
and none reported it. This change noticed the red, trimmed its own footprint from +87 to +66, and
reported it — which is better than the two before it and still not the fix.

The deeper shape: the file is **forbidden from shrinking by the mechanism its ratchet demands**. Reach
is 24 of 24, so extracting anything into a new leaf reddens FF-5301. `lines < 1210` and reach-24 are
each individually reasonable and jointly a deadlock. TECH_DEBT item 61 records the same shape for
`phase-brief.mjs` (432 → 1,067, decomposition forbidden by its purity guard). Two instances is a
pattern, and neither ratchet can see the other.

**Carry:** a red ratchet nobody reports is a ratchet that has stopped working. When a fitness function
and a structural constraint make each other unsatisfiable, that deadlock is the finding — record it as
one, rather than paying the smaller of the two costs quietly.

## R5 — Working in a tree another session was actively driving

The working tree changed three times mid-work: story 83's implementation landed at 19:11, then
milestone 57's watcher-node work appeared, all from another session sharing this checkout. This made
`aof:assimilate-code --pending` unusable — `git diff HEAD` would have swept 620+ lines of someone
else's in-flight work into this story's `files:` and reverse-derived acceptance criteria from it.

Committing the five files alone first and assimilating `--committed` gave an exact change set. A second
trap sat behind it: `git diff HEAD` never shows untracked files, so the new 260-line test file — the
entire evidence base QA maps coverage against — would have been invisible to every downstream lane.
Committing made it tracked and fixed both problems at once.

**Carry:** in a shared checkout, `--pending` is unsafe and `--committed` is the honest source. Check
`git status` for other work before choosing, and remember that a pending diff cannot see a new file.
