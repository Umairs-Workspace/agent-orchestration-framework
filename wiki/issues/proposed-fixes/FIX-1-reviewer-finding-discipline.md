# Fix 1 · Reviewer finding discipline

**Surface:** `src/bundle/agents/aof-architect.md`, `aof-qa.md`, `aof-designer.md`
(and `aof-security.md`, `aof-compliance.md` when they run).
**Size:** ~30 lines of prompt, repeated per reviewer. No code, no schema, no dependency.
**Ships:** immediately, via `aof work update`.

---

## The defect

Nothing in any reviewer agent tells it what **not** to report, how confident to be before reporting,
or that finding nothing is an acceptable outcome. Each is spawned, told to review, and left to decide
for itself what deserves a finding.

The consequence is documented in vendor guidance before it is measured here: *"A reviewer prompted to
find gaps will usually report some, even when the work is sound, because that is what it was asked to
do. Chasing every finding leads to over-engineering: extra abstraction layers, defensive code, and
tests for cases that can't happen."*

## The evidence

- **77 commits, 7 features** on a seven-story milestone. 19 `fix` and 18 `test` commits against 7
  `feat`.
- **Milestone 66: 91 findings against 59 verification rows**, across five closure rounds. Round
  five's own record says the milestone *"was refused by the gate milestone 66 shipped"* — the
  instrument raised it, not an operator.
- **Milestone 52: thirteen delta-application runs, 661.6k output tokens, 41.8% of the milestone**,
  against one build run at 7%.

This is not "review is too expensive". First rounds find real defects — a live production 500 and
three fitness functions guarding nothing, in one case. The defect is that a reviewer with no
reporting bar treats its own thoroughness as the success criterion.

## The change

Add to each reviewer agent, adapted per lens:

```markdown
<reporting_bar>
Report a finding only when you are **more than 80% confident it is real**. A clean review is a
valid review — do not manufacture findings to justify the invocation.

Before reporting anything, all four must hold:
1. You can cite the exact `file:line`.
2. You can state a concrete failure mode as input → state → outcome. "This could be fragile" is not
   a failure mode.
3. You have read the surrounding context, not only the changed lines.
4. The severity is defensible against inflation — you would still call it that severity if asked to
   justify it.

Report **only** gaps that affect correctness or the stated requirements. Everything else is
optional and belongs in the report as a count, not as a finding.

Severity is one of: **Blocker** (breaks correctness or violates the locked contract) ·
**Important** (a real defect that does not block) · **Nit** (style, naming, preference).
Report at most five Nits; state the rest as a number.

Do NOT flag:
- error handling already performed upstream by the framework or the harness
- well-known constants used as themselves (HTTP 200/404, 60, 24, 1024)
- missing documentation on self-describing internal helpers
- speculative future requirements not in the story's contract
- anything you would need to change the locked contract to act on — flag the contract instead
</reporting_bar>
```

## Why this shape

The four-gate checklist is doing the load-bearing work, not the confidence number. A reviewer that
must produce `file:line` plus an input → state → outcome trace cannot report an impression, and the
act of assembling the evidence is itself the filter. The explicit don't-flag list handles the
recurring false positives that no confidence gate catches, because the reviewer is genuinely
confident about them.

"A clean review is a valid review" is the sentence that changes behaviour. Without it, an agent
spawned to review reads an empty report as a failure to do its job.

## Risk

**A real defect goes unreported because the bar was too high.** Mitigated by the bar being on
*reporting confidence*, not on *severity* — a suspected Blocker at 60% confidence should be reported
as a question, not suppressed. Add that carve-out explicitly if the first milestone under this rule
shows misses.

Watch for the opposite failure too: a reviewer that reports nothing and did nothing. The nit count
and the severity split make an empty review distinguishable from an absent one.

## How we would know it worked

Per milestone, before and after:

- ratio of `feat` to total commits
- findings raised against verification rows recorded
- number of remediation rounds
- reviewer output tokens as a share of the milestone

The prediction is that findings fall, `feat` share rises, and total wall-clock falls without a rise
in defects escaping to `aof:verify`. If findings fall and escapes rise, the bar is wrong.
