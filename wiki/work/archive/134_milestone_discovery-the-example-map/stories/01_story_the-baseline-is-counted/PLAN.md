# 134/01 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

A count, not code. The seam is one new section, `## R7 · Baseline`, between R6 and `## Commands`
in this milestone's research document. Write the method first, then count against it: the two
rules (misunderstood-requirement finding; amendment round), the sources read and those out of
reach, then the per-story table, the milestone totals, and the one before-number over 21 stories.

**Findings.** Classify each row of the four `## Findings` tables from its prose, never by
splitting the table on `|` (126 has a row with backticked pipes, and 126/F-35 and 127/F-27 have
shifted cells). The type column is a hint, not the call: `contract-wording` sits on both sides of
the rule (127/F-03 counted, 127/F-02 not). Note every call you had to argue in the borderline list.

**Amendment rounds.** Git cannot show them. Measured at refine: no task `.feature` of the four
milestones was modified after it was first committed, apart from the `f76c153` scrub. 124 and 126
arrived squash-merged at the public-root cut, 133 in one commit. So read rounds from the records:
milestone STATE, VERIFICATION, RETROSPECTIVE and OUTCOME, and each story's STORY, RETROSPECTIVE and
OUTCOME. 127's pre-accept STATE is still in tracked history at `9e6623a~1`. `STATE.md` compacts at
accept, so 124 and 126 are floors from the compacted records. Say so beside their numbers.

The run records under `runs/` are not a source (their repeats are timeouts and dead agents).
`.git-archive` is local-only: use it, if at all, only to confirm what is out of reach. No command in
the section may depend on it.

**133** is counted as of a named commit. All six of its stories are accepted and the milestone is
verified, but its SPEC still reads in-progress while F-133-09 holds the door.

## The verification step

Walk the feature as a second reader would. Run every command in the R7 block from the repository
root with the output unpiped, and check that each prints what the section says. Re-apply both
rules to three rows chosen at random and get the same calls. Then check that `git status` lists
only the research document among this story's paths. No test suite is involved.

## Out of scope

- Any after-number, and any judgement on whether discovery earns its place (that is the live run).
- Editing the four milestones' records, including the malformed register rows. Report them; do
  not repair them.
- Committing the origin research document. The milestone owns that (see `STATE.md`).
