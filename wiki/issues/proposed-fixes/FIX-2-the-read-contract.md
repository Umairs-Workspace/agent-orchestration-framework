# Fix 2 · The read contract

**Surface:** `STORY.md` frontmatter (new `reads:` key) + `src/bundle/commands/continue.md`
(the story lane's Build and Review steps) + the three reviewer agents.
**Size:** one frontmatter field, a read-depth rule in the phase prompt, ~15 lines per reviewer.
**Ships:** with Fix 4 — both need a new declared field on the story record.

---

## The defect

`continue.md`'s story lane opens with *"Read the milestone's ADRs/DESIGN + the story's task
features."* That instruction is given to every agent the lane spawns, including the reviewers, and it
is unbounded: "the milestone's ADRs" on a real milestone is an 87 KB `ARCHITECTURE.md` with twelve
ADRs plus a 33 KB `STATE.md`, none of which the agent can scope down because nothing tells it which
parts pertain to the story it was handed.

Three separate costs come out of that one line.

**It is paid cold, every time.** A subagent starts a fresh conversation with its own system prompt.
Its first request does not read the parent's cache, and subagent caches carry the five-minute TTL
regardless of plan. Five or six reviewers per story means five or six full re-ingestions of the same
documents within the same hour. Measured across a downstream stream's instrumented milestones:
**3,082,276 cache-creation tokens per agent spawn** — roughly 12 MB of text per spawn — at a **538:1**
input-to-output ratio.

**It buys negative accuracy.** The reason a fresh reviewer catches what a warm one misses is that it
did not accumulate the context that produced the code. Vendor guidance says a code-review subagent
works precisely because it *"sees only the diff and the criteria you give it"*. We create the clean
context and then spend the first several tool calls filling it with the milestone's own reasoning —
which is the author's case for the design, argued at length, handed to the party whose job is to
doubt it. On SWE-bench, a 100-line file window resolved **18.0%** where showing the entire file
resolved **12.7%**, and keeping the last five observations resolved **18.0%** against **15.0%** for
full history. More context measured worse, in both dimensions, on the same benchmark.

**It is unbounded in the wrong direction.** Nothing caps it, so a large milestone costs more per
reviewer than a small one — even when the story under review is two files. The document the reviewer
reads scales with the *milestone*; the work it is reviewing scales with the *story*.

## The evidence

- **538:1 input-to-output**, 3.08M cache-creation tokens per spawn, 42 agent runs.
- **~3.12M subagent tokens across 16 agents for a refinement pass** — a phase that produces
  documents. Every one of those sixteen was told to orient the same way.
- **Milestone 52: thirteen agent runs existed only to re-apply ADR deltas** to contracts already
  authored — 661.6k output tokens, 41.8% of the milestone. Re-reading the architecture produced
  re-writing against it.

## The change

**1 — Declare the read set on the story, not in the phase prompt.**

```yaml
---
type: story
number: 04
slug: executor-step-timeout
parent: 358
status: not-started
reads:                                  # NEW — the whitelist. A hard gate, not a hint.
  - src/scenario-executor.mjs
  - src/loop-bounds.mjs
  - ../ARCHITECTURE.md#adr-004          # a named ADR anchor, never the whole document
files:                                  # NEW — see Fix 4; same authoring moment
  - src/scenario-executor.mjs
  - test/scenario-executor.test.mjs
---
```

`reads:` is authored at `aof:refine`, when the architect has just done the work of deciding which
prior art the story rests on. That decision is currently made and then thrown away; this records it.

**2 — Replace the orienting instruction in the story lane.**

Today:

> Read the milestone's ADRs/DESIGN + the story's task features.

Proposed:

> Read exactly the story's `reads:` set and its task features. If `reads:` is absent, stop and send
> the operator to `aof:refine <ref>` — an unrefined read set is the same class of defect as an
> untagged task. Do not read the milestone `ARCHITECTURE.md`, `DESIGN.md` or `STATE.md` in full; a
> `reads:` entry may name an ADR anchor, and that anchor is what you read.

**3 — A read-depth rule, applied everywhere an agent reaches for a neighbouring record.**

```markdown
<read_depth>
- Sibling and prior work items: read **frontmatter only** (`status`, `depends`, `title`). The body of
  another story is not your context.
- A file named in `reads:`: read it in full.
- A file not named in `reads:` that you believe you need: read it, and say in your report that the
  read set was incomplete. That is a finding about the contract, and refine should fix it.
- Never inline a large file into a spawned agent's prompt. Hand it the path.
</read_depth>
```

**4 — Hand the reviewers the diff, the criteria and the read set. Nothing else.** The reviewer's
brief becomes: the story's task `.feature` files (the criteria), the diff of what the build lane
produced, and `reads:`. Not the milestone body, not `STATE.md`, not the ADR prose that argues for
the design it is meant to test.

## Why this shape

The whitelist is on the **story** because that is the only place with both the knowledge and the
scope. Put it in the phase prompt and it is generic; put it in the milestone and it is the thing we
are trying to stop reading; put it in the agent file and it cannot vary per story.

Making the absence of `reads:` a *stop* rather than a fallback is deliberate and is the same rule the
lane already applies to thin or untagged tasks. A soft fallback to "read the milestone" means every
legacy story keeps the old cost forever and nothing ever migrates.

The "read something outside the set and report it" escape matters more than the gate. A hard
whitelist with no escape produces agents that work blind and confidently wrong. An escape that
*costs a line in the report* produces a read set that improves every time it is wrong.

## Risk

**An under-specified `reads:` starves the reviewer and it misses a real defect.** This is the live
risk and the escape hatch above is the only mitigation — plus watching escapes to `aof:verify` for
the first two milestones under the rule.

**It adds work at refine, which is already the expensive phase.** True, and partly self-cancelling:
the architect is already deciding this, and a refine that must name the files is a refine that cannot
hand-wave a story's scope. Fix 3's round cap and the sizing pressure of an explicit file list push
the other way.

**Anchors drift.** `../ARCHITECTURE.md#adr-004` breaks silently when an ADR is renamed. A resolve
check in `aof work validate` — every `reads:` path exists, every anchor resolves — is the cheap
guard, and belongs with the field rather than after it.

## How we would know it worked

The single headline number is **cache-creation tokens per agent spawn**, currently 3.08M. It should
fall by roughly the ratio of the read set to the milestone documents — a story naming three files
against an 87 KB architecture document is an order of magnitude, not a percentage.

Secondary, all already recorded per milestone:

- input-to-output ratio (currently 538:1)
- wall-clock per story (currently 109 minutes against 43 minutes of feature work per milestone)
- findings raised per verification row — this should **fall**, and if it rises the reviewers are
  reporting the read set's gaps rather than the code's
- defects escaping to `aof:verify` — the number that must not move
