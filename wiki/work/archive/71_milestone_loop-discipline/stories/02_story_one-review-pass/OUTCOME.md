# 71/02 · One review pass — lanes spawned together, mode read off the wave, and re-work confined to the delta — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. An ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `STORY.md` is.
-->

## Delivered

### The review lanes are spawned together, staggered, and bounded
The `<review_lanes>` region of `src/bundle/commands/continue.md` instructs the review step to spawn
its lanes together and wait for all of them — the same terms the build fan-out already used — names
the concurrent set as `aof-architect` + `aof-qa` + the automated craft pass always, with
`aof-designer` joining as a fourth only when the story has UI, forbids any lane reading another
lane's verdict or findings before all have returned, forbids a returning lane cancelling one still
running, staggers the spawns by a handful of seconds to warm the shared prompt prefix, and caps
concurrency at the `bound` `aof work dispatch --list --json` reports with the remainder spawned as
earlier lanes return.

### Execution mode is derived from the wave, as code
`decideExecutionMode()` in `src/work-loop.mjs` resolves (configured mode × `--solo` × wave size) to
exactly one of `EXECUTION_MODES` with a reason from the closed `EXECUTION_MODE_REASONS` set, and
returns `null` for a wave it cannot count rather than guessing. A wave of one is `inline` whatever
the static config says; `--solo` and a configured `solo` both win over the wave in both directions;
an empty wave is `inline` and carries `emptyWave: true`, so a caller can tell "nothing ready yet"
from "milestone finished". `dispatches` and `spawns` are both false for every inline answer — inline
is defined by what it does not do: no worktree, no agent, no dispatch record.

### The derivation is taken before anything is dispatched, and widens nothing
The `<execution_mode>` region of `continue.md` places the derivation before the first dispatch,
states that it reads the wave the ready set already computed and never recomputes it, that a solo
setting is never widened to orchestrated by a large wave, and that the derivation changes how the
lanes run and never how many lenses exist — no review lens is dropped by running inline.

### Round two re-reviews the delta, not the story
The `<delta_review>` region confines a granted second round to the fix it was granted for:
only the lens or lenses that raised a surviving Blocker are re-spawned, a lens that reported clean in
round one keeps that verdict as the answer of record, and each re-spawned lens is handed exactly
three things — the fix diff, the Blockers that lens itself raised, and the contract clauses those
Blockers cite — and not another lens's Blockers, not another lens's round-one verdict, not the
round-one findings below Blocker, and not the story's whole `reads:` set. The design lane re-renders
only the surfaces a surviving design-gap Blocker named. One deduplicated Blocker re-spawns exactly
one lens, chosen by claim class (`production-defect` → architect, `locked-contract-violation` → QA,
design gap → designer, ambiguous → the lens whose report survived reproduction). The delta is named
by the reproduce-and-deduplicate step, never guessed at.

### The gate ladder re-runs after every fix round, and a red ladder consumes no round
The `<review_rounds>` region states that step 4's gate ladder runs again before every re-review and
that a red ladder after a fix round does not advance the round counter — the counter advances on
review rounds, not on gate walks.

### An amendment ratifies in the beat that raised it
The `<amendment_ratification>` region of `src/bundle/commands/refine.md` closes the Decide stage
before the contract fan-out begins, states that each contract has exactly one authoring beat, and
routes every delta by WHEN it was raised across five cases — during the architecture pass, while a
contract is being authored, while the fan-out is in flight, after the contracts are authored, and
after the item is delivered (a superseding ADR in the accepting item's own contract; the delivered
`.feature` is never edited, annotated or tagged). The one delta that still earns its round is the one
that would ship a wrong criterion — already a `locked-contract-violation` and therefore already a
Blocker inside the existing round bound. A re-authoring wave is stated to be no legal response to a
delta: no stage spawns an authoring agent whose only work is re-applying a decision.

### The four rendered runtime copies carry all of it
`.claude/commands/aof/{continue,refine,code-review}.md`, `.codex/skills/aof-{continue,refine,code-review}/SKILL.md`
and `.opencode/commands/aof/{continue,refine,code-review}.md` are byte-identical to the live bundle
render, so the prompt an agent actually reads carries `<review_lanes>`, `<execution_mode>`,
`<delta_review>` and `<amendment_ratification>`.

## Assumptions

- **The concurrency, the stagger and the delta confinement are instructions, not enforcement** —
  nothing in the runtime spawns the lanes or bounds the re-review; `continue.md` instructs an agent
  to. The story declares no fitness function by decision (ADR-008): a grep for the word "together"
  in a prompt would be a control that proves nothing, and each of these claims is checkable only by
  driving the seam.
- **`decideExecutionMode()` is a pure decider with no call site in the loop** — it resolves the
  answer; the prompt tells the agent to take it. Nothing calls it on the dispatch path.
- **The dispatch bound is read from `aof work dispatch --list --json`** — the concurrency cap is
  whatever that verb reports at the moment of spawning, not a value this story fixes.

## Gaps

### The four `@manual` scenarios need a run record, and none exists for this milestone
- **Status:** open
- **Discharge condition:** one milestone driven through `aof:continue` **via the loop door**, so that
  `aof work observe <ref>` attributes its agent runs — then the lane overlap, the absent fan-out on a
  wave of one, round two's one-lens cost, and the absence of a contract re-application agent are all
  read off that record.

`aof work observe 71` and `aof work observe 72` both report **0 agent runs across 0 sessions** with
**408 unattributed** — 71 and 72 were driven interactively rather than through the loop door, so no
run record exists to read concurrency, fan-out, round-two cost or re-application count out of. The
saving this story exists to produce is therefore stated and unmeasured
(`VERIFICATION.md` **F-71-G**). One of the four is discharged at the artifact level instead:
milestone 72's refine authored eleven task contracts and its `ARCHITECTURE.md` in **one commit each**
across three amendment rounds, so each contract had exactly one authoring beat and no run
re-applied a delta.
