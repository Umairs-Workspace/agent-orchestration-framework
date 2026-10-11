# 152 · Promote shows what to promote next — example map

## R1 · A candidate is a backlog item promote would accept right now
- E1 · memory-closes-the-loop depends only on 148, which is in the stream but not done: it is a candidate [stated Q1]
- E2 · episodic-memory-is-recallable depends on memory-closes-the-loop, still in the backlog: it is not a candidate [stated Q1]
- E3 · a backlog item whose depends names a slug no item carries: it is not a candidate [stated Q1]
- E11 · --show-candidates over any backlog: nothing on disk changes [proposed]

## R2 · Candidates are listed in the order they should be promoted
- E4 · memory-closes-the-loop unblocks two backlog items, a-halted-lane-is-reaped unblocks none: memory-closes-the-loop is listed first [stated Q2]
- E5 · a-halted-lane-is-reaped (created 2026-09-27) and every-command-runs-over-a-valid-config (created 2026-10-02) unblock nothing: a-halted-lane-is-reaped is listed first [stated Q2]
- E6 · two candidates created the same day that unblock nothing: listed by slug, alphabetically [stated Q2]

## R3 · Items that cannot go yet are shown after the candidates, with what they wait on
- E7 · the-memory-wiki-stays-true is listed as waiting on memory-closes-the-loop and episodic-memory-is-recallable [stated Q3]
- E8 · an item whose depends names a slug no item carries is listed as waiting on an unresolved entry [stated Q3]

## R4 · --next-item promotes the head of the candidate list, and is never combined with a slug or --show-candidates
- E9 · memory-closes-the-loop heads the list: --next-item promotes it to the tail, and the edges the two backlog items hold on it are rewired [proposed]
- E10 · the backlog holds no candidate: --next-item says nothing can be promoted and nothing on disk changes [proposed]
- E12 · a slug given with --next-item: refused, and nothing is read or written [proposed]

## Questions
- Q1 · business · answered · Does a backlog item whose dependency is in the stream but not yet done count as a candidate?
- Q2 · business · answered · Are candidates ordered by how many backlog items each unblocks, then oldest first, then by slug?
- Q3 · business · answered · Does --show-candidates also list the items that cannot go yet, with what each waits on?
- Q4 · technical · defaulted STORY.md#notes · Does --next-item take --at? Yes, with the same meaning and refusals as a named promote.
- Q5 · technical · defaulted STORY.md#notes · Are a slug together with either flag, or the two flags together, refused? Yes, before anything is read.
- Q6 · technical · defaulted STORY.md#notes · Does "unblocks" count only direct dependents? No: every backlog item that waits on it, directly or through another backlog item.
