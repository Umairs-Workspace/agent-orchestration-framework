---
aof-generated: true
description: Pay down structural debt — find the TECH_DEBT entries living in the files at hand, fix what fits, defer only what is genuinely story-sized, and discharge what is already paid.
aof-invocation: /aof:pay-debt
aof-runtime: claude
---

<objective>
Drain the tech-debt ledger through ordinary work. The default mode is NARROW: given the item or the
files in hand, find the debt that lives there and pay what fits. The ledger is a backlog to be
emptied, not a journal to be appended to.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`. The ledger is `<work.dir>/TECH_DEBT.md`.
`aof work debt` is the instrument — it measures, narrows and prunes. You judge; it never does.
</config>

<process>

**1. Resolve what you are paying against.**

- `<ref>` (e.g. `78/03`) — resolve the item, then take the files its diff touches
  (`git diff --name-only` against its base, or the item's declared write set).
- `<path>...` — those files.
- No argument — the working tree's changed files (`git status --porcelain`).
- `--sweep` — the WHOLE ledger, worst-first. Use this only when the operator asks for a triage
  pass; it is the expensive mode and it is not what ordinary work needs.

**2. Ask the ledger what lives there.**

```
aof work debt <path>...          # the entries citing those files
aof work debt --json             # the whole ledger, measured, when sweeping
```

Report nothing further if no entry cites the files — say so in one line and stop.

**3. Re-measure before you believe an entry.** This is the step that matters most, and the one
nobody has ever done. Entries state countable claims and **the counts go stale silently** — item 0's
evidence table was 100% wrong when checked on 2026-09-05 (43 empty catches had become 2; 17
`workspaceIdFor` sites had become 4; 147 src files had become 315). For each entry in scope:

- Re-run the claim's own measurement (`grep -c`, `wc -l`, a file listing, the cited fitness function).
- Check the cited `file:line` still says what the entry says it says.
- Land in exactly one verdict: **DEAD** (the defect is gone) · **LIVE, numbers stale** ·
  **LIVE, worse than recorded** · **LIVE as written**.

**4. Route each LIVE entry by COST — the default is to fix it now.**

- **Fix it in this item** — the DEFAULT. Anything up to roughly a day, needing no design decision
  this item cannot make and changing no accepted contract. "It touches a file outside the diff" is
  NOT a reason to defer; most structural fixes do.
- **Leave it in the ledger** only when the fix is genuinely its own story or bigger. Say why, in one
  sentence, in your report. If you cannot name why it is story-sized, it is not — fix it.
- **Promote it** when it is story-sized AND ready to schedule: `aof:add-chore` / `aof:add-story`,
  then mark the entry's status with the ref that will pay it.

**5. Discharge what you paid, and what was already paid.**

- An entry you FIXED: delete it from the ledger outright. Do not annotate it, do not mark it closed
  and leave it — a discharged entry's record is git history plus the ref of the item that paid it,
  which you name in your commit and in the item's own record doc.
- An entry you found **DEAD**: delete it, and say in your report what you measured to prove it.
- An entry with a discharged status still sitting in the file: `aof work debt --prune --write`.
- **Never renumber.** Holes are correct — entries are cited by number from other entries and by
  `file:line` from source comments, and renumbering breaks every citation silently.

**6. Re-stamp the budget.** After any deletion, `aof work debt --json` reports the new totals; set
`DEBT_BUDGET.maxTotalLines` / `maxOversizeEntries` in `src/work/debt.mjs` DOWN to match. The ratchet
is shrink-only: leaving the ceiling above the measured state silently grants back what you just
bought, and `test/arch/testing/acd-debt-ledger-budget.test.mjs` fails if the slack exceeds 10%.

**7. An entry you must WRITE is four things and nothing else — 12 lines, hard.** What's wrong · how
it bites · the shape of the fix · one `file:line`. Plus a `**Status:** open (raised <date> by
<role>, at <ref>)` line, which is not optional — 34 of 86 entries carry none, and nothing can ever
discharge them. The investigation goes in the item's own `ARCHITECTURE.md` / `VERIFICATION.md`,
which is dated and immutable; the ledger cites that register rather than restating it.

</process>

<rules>
- **You are emptying this file, not curating it.** Every session should end with the ledger the same
  size or smaller. If you added more lines than you removed, you did the wrong job.
- **Re-measure before you reason.** An entry's numbers are a claim about a tree that has moved on;
  quoting them without re-running them is how a stale backlog stays alive for six weeks.
- **Never delete an entry you did not prove is paid.** DEAD needs a measurement in your report;
  "probably fixed" is not a verdict. When a claim cannot be measured, leave the entry and say so.
- **The unstatused entries are the ones that will never leave on their own.** When you touch one,
  give it a status even if you defer it — that is the minimum a later prune needs.
- Run the ledger's gate before you finish:
  `node scripts/test.mjs --only test/arch/testing/acd-debt-ledger-budget.test.mjs` (with
  `AOF_GLOBAL_HOME=$(mktemp -d)`).
</rules>

<output>
Per entry in scope: the number, the verdict (DEAD / LIVE + why), what you measured to reach it, and
the route taken (fixed here / deferred because <reason> / promoted to <ref> / deleted). Close with
the ledger's before-and-after line count, and name any budget number you re-stamped.
</output>
