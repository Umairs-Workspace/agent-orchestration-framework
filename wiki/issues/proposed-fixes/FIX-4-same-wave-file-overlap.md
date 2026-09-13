# Fix 4 · The same-wave file overlap check

**Surface:** `STORY.md` frontmatter (new `files:` key) + `src/bundle/commands/continue.md`
(the milestone lane, before fan-out).
**Size:** one frontmatter field, ~12 lines of prompt. Shares its prerequisite with Fix 2.
**Ships:** with Fix 2 — both add a declared field to the story record at `aof:refine`.

---

## The defect

The milestone lane fans out one `aof-developer` per ready story and waits for all of them. What
decides the wave is `readySet` — the stories' `depends` frontmatter — and `depends` says nothing
about **files**. Two stories with no dependency edge between them can and do target the same module.

The lane already knows this. `continue.md` says so in its own words, with the measurement attached:

> *a partition's independence claim is not reliable — measured, two stories an architect had
> partitioned as independent both edited one file, ×9 and ×8 in a single milestone*

The remedy in place today is worktree isolation: each lane gets its own tree, so the concurrent edits
cannot corrupt each other. That is the right guard and it should stay. **It solves the corruption and
leaves the cost.** Seventeen edits to one file across two isolated trees means:

- two agents doing overlapping work in ignorance of each other, both paying full Opus rates;
- a merge that a human or a third agent has to reconcile, on a file neither lane owns;
- reviewers on each lane judging a file whose other half is in a branch they cannot see, which
  produces findings that are correct against the tree and wrong against the merge;
- and a real chance the two lanes made **contradictory** decisions about the same code, which
  surfaces as a round-two finding on both.

The evidence for the last one is already in the corpus: two commits eighteen minutes apart in a
single run asserting opposite things about the same fitness register.

## The evidence

- **The lane's own measurement**: two "independent" stories, one file, **×9 and ×8 edits** in a
  single milestone.
- **19 `fix` and 18 `test` commits against 7 `feat`** on the seven-story milestone — reconciliation
  work, not feature work.
- **Milestone 52's thirteen delta-application runs** (661.6k output tokens, 41.8% of the milestone)
  are the same shape one level up: work re-applied because it was authored without sight of what
  else had been authored.

## The change

**1 — Declare the write set on the story.** The same authoring moment as Fix 2's `reads:`:

```yaml
files:                                  # NEW — every path this story may write.
  - src/scenario-executor.mjs
  - test/scenario-executor.test.mjs
```

`files:` is the *write* set; `reads:` is the *read* set. They overlap and that is fine — a file being
edited is a file being read. A path not in `files:` may not be written; a lane that must write one
says so in its report, and that is a finding about the contract.

**2 — Scan the wave before fanning out.**

```markdown
<wave_partition>
Before spawning the wave, read `files:` from every story in `readySet`.

- **No overlap** — fan out as today, one lane per story.
- **Any overlap** — the story earliest in `readySet` order keeps this wave; every story that
  overlaps it is **held to the next wave**. Do not attempt to merge them into one lane, and do not
  ask an agent to arbitrate: hold, then re-derive the ready set when the wave closes.
- **A story with no `files:`** — treat it as overlapping everything and run it alone. An
  undeclared write set is not evidence of independence.
- Report the partition before spawning: which stories are in this wave, which were held, and the
  path that held them.
</wave_partition>
```

**3 — Keep the worktrees.** They stay exactly as they are. This check reduces how often two lanes
race for the same file; it does not replace the guard for when they still do — a story's `files:`
can be wrong, and the tree is what makes a wrong declaration survivable rather than corrupting.

## Why this shape

**Hold, do not merge.** Combining two overlapping stories into one lane sounds cheaper and is not: it
doubles the lane's scope, defeats the sizing the stories represent, and produces a diff that spans
two contracts. Serialising is the cheap answer — the second story runs in the next wave, against a
file that is now settled, with a reviewer that can see all of it.

**Earliest-in-`readySet` wins** because that order is already deterministic and already the one the
walk obeys. Any other tiebreak invents a priority the framework does not have.

**Missing `files:` runs alone rather than blocking.** Fix 2 makes a missing `reads:` a stop, because
a reviewer with no read set works blind. A missing write set is different: the story can still be
built correctly, it just cannot be proven safe to parallelise. Degrading to serial is the honest
behaviour and it lets the field roll in gradually.

**No inference, at all.** The lane already refuses to infer concurrency from prose — *"A claim of
'independent stories' in an `ARCHITECTURE.md` … is not data"*. `files:` is data on the same terms as
`depends:`. Do not ask an agent to guess a write set from a story body; an unguessed set is
information, a guessed one is noise that looks like information.

## Risk

**A wrong `files:` declaration.** Two failure directions. Too narrow, and a lane writes outside its
set — the worktree contains it and the report names it. Too broad, and the wave serialises for no
reason, which costs wall-clock but nothing else. Watch the held-story count; a milestone where every
story holds is a milestone where `files:` is being authored defensively.

**Serialisation eats the parallelism.** Real. A milestone whose stories genuinely all touch one
module is a milestone that should not have been fanned out, and this check surfaces that at fan-out
rather than at merge. If the held count is routinely high, the partition is wrong upstream — that is
a refine finding, not a reason to drop the check.

**It adds another field to author at refine.** Same trade as Fix 2, same answer: the architect is
already making this decision when it partitions the milestone, and writing it down is what makes the
partition checkable rather than asserted.

## How we would know it worked

- **Edits per file per milestone** — the direct measure, and the one the lane already cited. The
  ×9/×8 case should become ×9 in one wave and ×0 in the other.
- **Merge-conflict commits and `merge` commits** — 9 of the 77 on the seven-story milestone.
- **`fix` share of commits** — 19 of 77 today.
- **Held-story count per wave** — the new number, and the one that says whether the milestone was
  partitioned well in the first place.
- **Wall-clock per milestone** — the guard number here, because this fix trades parallelism for
  correctness. If wall-clock rises without `fix` and `merge` falling, the trade is not paying.
