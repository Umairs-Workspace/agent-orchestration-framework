# Measured — what the four fixes actually did

**2026-09-03.** The four fixes in this folder landed as story 83 (`feat(work): enforce agent-layer
bounds`). This is the before/after, taken from two milestones of comparable size — milestone 63 in
this repository, seven stories, and a milestone of eight stories on a downstream work stream — against
the baseline recorded in [`ANALYSIS.md`](ANALYSIS.md).

---

## 1 · The headline

| | baseline | 63 (7 stories) | downstream (8 stories) |
|---|---:|---:|---:|
| agent runs | ~5–6 per story | 25 (3.6/story) | 49 (6.1/story) |
| **cache-creation per agent run** | **3,082,276** | **936,394** | **874,694** |
| | | **−69.6%** | **−71.6%** |
| input-to-output ratio | 538:1 | 229:1 | 342:1 |
| subagent cache-creation | — | 23.4M | 42.9M |
| review rounds | unbounded | **1 per story, all six** | max 2, none reached 3 |
| active time per story | 109 min | 44 min | 63 min |
| `fix`+`test` share of commits | 48.1% | — | 27.8% |

The context cost of a spawn is down between three and three and a half times. Rounds are bounded and
the bound is holding. Per-story active time is down 40–60%.

## 2 · It landed on the reviewers, and not on the builder

Milestone 63, scoped to its own agent runs:

| role | runs | cache-creation | per run |
|---|---:|---:|---:|
| **`aof-developer`** | 6 | **12.35M (53%)** | **2,059,059** |
| `aof-architect` | 7 | 5.56M | 793,788 |
| `aof-qa` | 12 | 5.50M | 458,249 |

The downstream milestone has the same shape: developer 18 runs / 23.4M / 55% at 1,301,673 per run;
QA 16 runs / 7.8M at 485,395.

`aof-qa` is now **the most frequent agent in the stream and the cheapest per run** — 82 turns, a
9.5-minute median. The reporting bar, the read contract and the one-round cap all landed on it.

`aof-developer` is four and a half times more expensive per run and more than half the bill. The
mechanism is not mysterious: a reviewer is handed the diff and the criteria, so a short `reads:` costs
it little; a builder must reach whatever the work actually touches, so a short set is an unplanned
cold read at full price plus the turns spent finding it.

**And the sets are short, repeatedly, in two independent streams.** 63/R4 records write-set and
read-set escapes across **four consecutive stories**, concluding that *"the sets are authored from
what the author expects to touch, not from what the work reaches"* and that the fix is to derive them
from the contract's own citations. The downstream retro records `files:` **short of the test lane
three stories running**.

That is the whole finding: the declaration works exactly as well as it is accurate, and it is
currently inaccurate on two thirds of stories.

## 3 · The tail, and a correction

The single most expensive run in milestone 63 is `aof-developer · Build story 63/03` — **3.59M
cache-creation, 367 turns, 8h03m of wall-clock**, 15% of the milestone by itself. `aof-qa ·
Behavioural review of 63/03` ran **7h22m**.

An earlier reading of the commit log called those two windows idle time waiting on a human. The
transcripts say otherwise, and also rule out the toolchain: the 8h03m developer run contains **36
minutes of tool time, 30 of it tests — 6.3% of its own wall**. The 7h22m review contains 23 minutes,
2.6% test.

So the tail is neither review rounds nor the test suite. It is unbounded runs. No agent carries
`maxTurns`, `effort` or a deadline.

## 4 · Where the wall-clock goes

Mined by pairing every `tool_use` with its `tool_result`:

| | this repo | downstream |
|---|---:|---:|
| span | 41h34m | 66h59m |
| total tool wait | 11h49m (28% of span) | 32h49m (49%) |
| **test wait** | **3h14m / 1,243 calls** | **7h19m / 902 calls** |
| mean per test call | 9.4s | 29.3s |
| test as % of span | **7.8%** | **10.9%** |

At milestone scale tests are a modest line item. **Per run they are the largest thing in the lane**,
and they concentrate on the agent that is otherwise cheapest:

```
aof-qa · Behavioural review 361/04    0h39m wall   0h23m test   58.6%
aof-qa · Behavioural review 361/07    0h53m wall   0h28m test   54.3%
aof-developer · Fix round 361/06      2h01m wall   0h55m test   45.6%
```

Two classes downstream are larger than tests and belong to nobody's story: **`AskUserQuestion` at
7h53m across 14 calls** (longest single wait 4h51m) and **search-and-read at 8h58m across 4,112
calls**. And test invocations are dying at the **600-second tool ceiling** in both repos, producing no
result and then being retried — the downstream retro names the cause as controls that compile or walk
whole trees running under budgets sized for unit tests.

## 5 · How this was measured, and why that is itself a finding

Both milestones' committed `observability/` snapshots report `runs.count: 0`, `totalOutputTokens: 0`
and `activeUnionMs: 0`, with `transcriptsFound: true` and **408** and **216** unattributed agent runs.

The miner is not broken. `work-observe.mjs:670-693` states that attribution is *"a JOIN on sessionId,
never a text match"* — the regex path was retired under FF-6805 after it pulled an unrelated milestone
into a snapshot on a hex substring — and the index is built from each item's `runs/` records.
`find wiki/work -type d -name runs` returns milestones 38 and 40 and nothing since: the phase commands
mint no run records, so the join is empty and every session is honestly counted as unattributed.

Every figure above came from two standalone miners reading
`~/.claude/projects/<slug>/<sessionId>/subagents/agent-*.jsonl` directly, committed at
`.aof/mine-transcripts.mjs` and `.aof/mine-toolwait.mjs`. None of it is reproducible from the
repository, which is why the first story of the follow-up milestone is a run record on the phase path.

## 6 · What follows

Scheduled as **milestone 96** (`the-declaration-earns-its-keep`) and **chore 97**:

| | | why |
|---|---|---|
| 97 | `validate` refuses the honest forward reference | 62/R8 — a gate that makes the honest declaration impossible teaches authors to under-declare. Blocks 96/01. |
| 96/00 | the run record on the phase path | §5 — without it every claim here is settled by argument |
| 96/01 | the sets are derived, not recalled | §2 — 53% of the bill, and 63/R4 already names the fix |
| 96/02 | the plan document, config-gated, one page | the builder's brief, developer-only, advisory |
| 96/03 | the test run matches the story | §4 — per-run, concentrated in the review lanes |
| 96/04 | the regression gate is mandatory | 63/R7 — narrowing is only safe if the gate is real |

Named and deliberately **not** scheduled yet, both larger than anything above by measured size:

- **An envelope on the agent** — `maxTurns`, `effort`, a deadline. §3: an 8-hour run with 36 minutes
  of tool time is a run nobody stopped.
- **Model routing.** Every agent is `opus` except one researcher run. QA at 458k and 9.5 minutes,
  twelve times a milestone, is the cheapest untried change in the system.
