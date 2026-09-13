---
aof-generated: true
description: Execute/resume a work item — build its tasks to green, then structural + behavioural review. For a milestone, walks every story to built-and-reviewed; refining stays with `aof:refine`, accepting with `aof:verify`.
aof-invocation: /aof:continue
aof-runtime: claude
---

<objective>
Build a work item's tasks until every `@executable` scenario is green, then review — keeping status
current as you go. Continuing a MILESTONE means continuing the whole milestone: every story, driven
to built-and-reviewed — never one slice. Accepting it is `aof:verify`'s phase, not this one's.

**Whatever ref you were handed, you continue ALL of it.** That rule is what a `NN/MM-PP` span
changes and does not weaken: the operator, not this command, chose the boundary — and then every
story inside it is driven, exactly as every story of a milestone is.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`. Resolve the ref by running
`aof work find "$ARGUMENTS" --json` (folder-name lookup — never glob `**/*.md`; the folder name is the
index). Items nest by scope: `milestone/ → stories/<story>/ → tasks/<task>.feature`.

**A ref resolves to one row, or — for a `NN/MM-PP` span — to the several rows it names.** Many rows
from a span is the answer, not an ambiguity to disambiguate; many rows from free text still is one.
An EMPTY answer is a stop: name the ref and stop, never fall back to a broader scope. In particular
never retry a span as its bare milestone — `44/01-03` finding nothing means those stories do not
exist, and continuing all of 44 instead is the one thing the operator ruled out by typing a span.

**Step 0 — a BACKLOG ref is promoted first, here, before anything else.** When that `aof work find`
answers a row with `number: null`, the item is in the backlog: it has no number yet, and everything
this phase does afterwards is keyed by one — the run mint, every `aof work` call, the hand-back. Run
`aof work promote <slug> --json` and use the envelope's `created.ref` as THE ref for the rest of the
phase (ADR-003 §7, ADR-005 §3). This is the ONE door for a chore and a spike too, which have no
refine. The promotion APPENDS: a position is the operator's to name through `aof:promote <slug> at
<P>`, never this command's to choose. A promote REFUSAL IS A STOP — report it and stop;
`promote-depends-backlog` means the item's `depends:` names another backlog item, so the two ways out
are promoting that one first or dropping the entry. (`aof work continue <ref>` on the CLI refuses a
backlog ref outright as `phase-backlog-ref`, for the same reason this step is local: a mint belongs
where the operator is and is never dispatched to a worker.)
</config>

<config>
Parse `$ARGUMENTS` into the item **ref** and an optional **`--solo`** flag.

**Execution mode.** Resolve from `work.agents.mode`: `"solo"` → play every role inline in this
session; any other value → orchestrated (spawn the role agents). **`--solo` OVERRIDES an
orchestrated config to solo for this run.** This command delegates to no other command, so the flag
governs exactly one thing: which roles this session plays inline and which it spawns. It changes
only WHO does the work, never WHAT is produced — the same build, the same review lanes, the same
gates.

Reach for it when the main session already holds the context a spawned agent would have to
rediscover from cold: a well-trodden change, a small story, or a fix round on work you just did.
The trade is real in both directions — inline keeps the context and pays no hand-off, but loses
the parallelism across independent stories and the independent perspective a separate reviewer
brings. On a milestone with genuinely independent stories, orchestrated is usually still faster.
</config>

<process>
**Re-entry first — before anything else, run `aof work resume`.** This command is the thing an operator
types after a run died, so the first question is always "was something already in flight?". The sweep
answers it deterministically: every retryable failed run, its reason, its attempt against the ceiling, and
— for a run killed by an API session limit — whether its stated reset has passed. If the target ref is
listed **READY**, resume its lineage with `aof work resume <ref>` and carry on from there rather than
starting fresh: the prior session and its working tree are intact, and a fresh start pays for that work
twice. If it is listed **parked**, say when it becomes ready and stop — retrying early burns one of three
attempts on a kill that is certain to repeat. If the sweep is empty, proceed normally.

Dispatch on the item's `type` — or, when the ref was a `NN/MM-PP` span, on the span:

- **story span (`NN/MM-PP`)** — the stories MM..PP of milestone NN, to **built-and-reviewed**. This
  is the milestone lane run against a **named subset**, so read that lane below and follow it — the
  ready set, the wave, the dispatch bound, the per-member build+review, the `--solo` behaviour, all
  of it — with exactly three differences:

  1. **Scope every walk to the span, never to the milestone.** `aof work next <NN/MM-PP> --through-review --json`
     answers with only the in-span stories, and it is the same command that gates a milestone walk —
     so the dependency answer stays the milestone's own. **Never widen the ref to `<NN>` mid-walk:**
     that silently enlarges the job to stories the operator excluded, in a session they will read as
     having done what they asked.
  2. **A story that depends on a story OUTSIDE the span still waits for it.** The walk reports that
     as `blocked` naming the out-of-span sibling (e.g. `waitingOn: ["44/00"]`). This is not a defect
     in the span and must not be worked around by building the named sibling: report it, say the
     span cannot proceed until that story is done, and stop. The operator picks — widen the span, or
     continue the sibling first.
  3. **Mint no MILESTONE run. Do not move the MILESTONE's status, and never accept it.** The
     whole-milestone lane mints `<NN>`'s run once before its fan-out — and so starts it — because it
     owns the whole record; a span does not own it. Mint only each member story's own run, in its own
     lane, exactly as the story lane says. When
     the span is finished, hand back at the Review gate naming **the stories built** — never "NN is
     ready to accept". `aof work next` will not offer the milestone from a span scope, and neither
     do you: stories outside the span were never looked at, so their state is simply unknown here.

  Everything else is unchanged, and that includes the halt rule: a member whose contract is not
  authored/tagged halts the span immediately, exactly as it halts a milestone.

- **milestone** — the whole milestone, to **built-and-reviewed**. **This command is the walk's one
  implementation and calls no other command**: build+review lives here, and a sequencer above it
  (`aof:autonomous`) only decides which item to hand it next. Its scope is **build + review only**.
  A member whose contract is not authored/tagged **halts the walk immediately** — name it, send the
  operator to `aof:refine <ref>`, and stop; continue never refines, and never skips it to re-ask
  either, which would leave it in the ready set forever. Accepting is likewise never taken here: the
  `@manual` verification lanes, `VERIFICATION.md`/`OUTCOME.md` authorship and `status: done` belong
  to `aof:verify <NN>`, and this command hands back at the Review gate.

  **The whole milestone — every story, never one slice.** Loop on the CLI's `state`, never on the
  size of the set: **`ready`** → build that set, then ask again, because finishing one story is what
  makes the next one ready; **`done`** → the walk is finished, hand back at the Review gate;
  **`blocked`** → report its `waitingOn` and stop. An empty `readySet` is not "finished" — a blocked
  milestone answers with an empty one too, and reading that as done builds nothing and then sends
  the operator to accept a milestone no one built. A milestone continue that builds one slice and
  parks is the exact defect this lane exists to refuse.

  **Mint the MILESTONE's run once — here, in THIS checkout, before the fan-out.** `aof work
  run-start <NN> --json` is the orchestrator's mint and nobody else's, taken before the first
  dispatch below; `aof work run-complete <NN> --outcome done` closes it at the walk's end. The mint
  is what STARTS the milestone — `run.started`'s reactor (`src/effects/table.mjs`) makes the
  `not-started → in-progress` move — so no status move is written here by hand.
  The milestone's `SPEC.md` is the one record every lane shares, so a per-lane start would put N
  branches into the same two-line `status:`/`updated:` hunk of one file — a hazard a `STORY.md`
  never has, because exactly one lane writes it. (`work:status` is deliberately not item-locked, and
  `src/commands/item-status.mjs` is right about why: a status write is record-keeping on your own
  checkout. That reasoning holds for the record ONE lane owns; the shared one is started before the
  lanes exist.) A repeat mint on a resumed run is the ordinary case and needs no flag: the reactor's
  edge is bounded, so an item already past `not-started` is reported as not applicable and the walk
  carries on. **A `NN/MM-PP` span mints no milestone run**, exactly as it moves no milestone status —
  the span does not own that record.

  **Build the ready set concurrently, not one story at a time.** `aof work next <NN> --through-review --json` — always
  scoped to the milestone ref this command was invoked with — answers with `readySet`: *every* item
  that is dependency-safe to start, plus the deterministic `wave` that is write-disjoint and the
  `heldSet` excluded from that wave by declared-write overlap. `aof work dispatch --list --json`
  reports the concurrency `bound`.
  **Never ask it unscoped** — bare `aof work next --json` answers for the WHOLE stream, so its
  `readySet` carries other milestones' items, and a lane cut from that set dispatches a worktree and
  spawns a developer on work this command was never asked to do. Take up to `bound` members of `wave`
  and build them **together**, each in its own isolated lane:

  1. `aof work next <NN> --through-review --json` → obey `wave`; report `heldSet`. `readySet` remains the dependency
     answer, but it is not a dispatch instruction.
  2. `aof work dispatch --list --json` → read `bound`. Never invent a number and never exceed it:
     agents spend 33–44% of their time waiting on the toolchain, so an unbounded fan-out trades a
     serialisation problem for a contention one.
  3. **Do not recompute or widen `wave`.** `work next` owns path normalization, overlap detection,
     ready-set ordering, and the conservative rule that a missing/malformed `files:` declaration runs
     alone. Never infer concurrency from prose and never substitute `readySet` for `wave`. Re-run
     `aof work next <NN> --through-review --json` after the selected wave closes.
  4. **Derive the execution mode from that wave — before anything is dispatched.**

     <execution_mode>
     Take the member count from the CLI's own `wave`, the answer step 1 already holds, and resolve:

     - **A `wave` of exactly one member runs INLINE.** Dispatch no worktree, spawn no build agent and
       write no dispatch record for it: there is nothing to parallelise, and a fan-out over one
       member pays a full cold start for no concurrency at all. The member is still built and
       reviewed in full.
     - **A `wave` of two or more members is dispatched**, exactly as steps 5-7 below describe.
     - **`--solo`, and a `solo` `work.agents.mode`, still win.** This derivation only REMOVES a
       fan-out that could not have paid for itself; it never ADDS one against a solo setting, so a
       solo workspace whose wave holds five members is still inline.
     - **An EMPTY `wave` dispatches nothing and spawns nothing — and is not a finished milestone.**
       Report the held members as held, naming the `heldSet` that is why the wave is empty, never as
       done; and do not print the accept hand-off.

     **Read the wave; never recompute it.** The member count comes from the CLI's `wave` — not from
     prose, not from a `depends` comment, and not from `readySet`.

     **The derivation changes only WHO does the work.** Breadth is unchanged: re-ask
     `aof work next <NN> --through-review --json` once the member closes, and drive every story of the
     milestone exactly as before. And **no review lens is dropped on the strength of the wave's
     size** — a member reviewed inline still gets every lens its shape calls for.
     </execution_mode>
  5. For each selected member, `aof work dispatch <ref> --json` → its own `worktree` on its own
     `branch`. **Tell the spawned agent to work in that worktree**, and never dispatch two stories
     into one tree: a partition's independence claim is not reliable — measured, two stories an
     architect had partitioned as independent both edited one file, ×9 and ×8 in a single milestone —
     so without a tree each they would have corrupted it.
  6. Spawn the builds together (one `aof-developer` per member) and wait for all of them, rather than
     starting the next after the previous returns. As a lane finishes, dispatch the next member.
  7. When a lane's work is merged back, `aof work dispatch --cleanup <ref>`. Cleanup retries any
     journalled projection consequence for that lane and **refuses non-zero** while one remains
     unpublished; keep the lane and stop the walk rather than hiding the checkout that owns the
     retry. If a run died, `aof work dispatch --sweep` reports what was left behind — it never
     removes a tree holding uncommitted work, and a lane's commits survive on its branch either way.

  **Under `--solo` (or a solo config) there is no fan-out.** Walk the same ready set inline, one
  member at a time, dispatching nothing and spawning nothing — the mode's whole point is that this
  session does the work. Breadth is unchanged (still every story, still in `readySet` order); the
  parallelism is what solo trades away.

  **Still do not infer concurrency from prose.** A claim of "independent stories" in an
  `ARCHITECTURE.md` or an italic `*(depends 00, 01)*` in a `SPEC.md` is not data. What may run at
  once is exactly what `readySet` says — the stories' own `depends` frontmatter, read by the same
  command that gates the walk. If two stories look independent but one is missing from the set,
  the set is right and the prose is stale; fix the `depends`, do not work around it.

  **Each member's build + review is exactly the story lane below** — run that lane per member. It is
  not restated here: two copies of a build lane drift, and the one that drifts is the one nobody
  reads.
- **story** — Build → Review:
  1. Read exactly the story's `reads:` set and its task features. If `reads:` is absent, or tasks are
     thin/untagged, stop and send the user to `aof:refine <ref>`. Do not read milestone
     `ARCHITECTURE.md`, `DESIGN.md`, or `STATE.md` in full: a `reads:` entry may name a specific ADR
     anchor, and that anchor is the scope.

     <read_depth>
     - Sibling and prior work items: read frontmatter only (`status`, `depends`, `title`). Another
       story's body is not this story's context.
     - A file named in `reads:`: read it in full, except an anchored document entry: read only the
       named section.
     - A file outside `reads:` that is genuinely required: read it, then report that the declared
       read set is incomplete. The escape prevents blind work; the report makes refine repair it.
     - Never inline a large file into a spawned agent prompt. Hand the agent the path and anchor.
     </read_depth>
  2. **Mint its run — before any code.** `aof work run-start <ref> --json`, where `<ref>` is
     **this member's own story — never the milestone**, whose run the orchestrator already minted
     once above (a lane that also mints it drives N branches through one shared frontmatter hunk).
     Run it inside the lane's worktree, when this member was dispatched into one — that is the tree
     its commits travel in, and the tree its run record is written under.
     This is a STEP of the build, not bookkeeping done on the way out, and it does two jobs at once.
     It STARTS the item: the **`run.started` reactor** (`src/effects/table.mjs`) makes the move, so
     an item is never read as `not-started` while it is being built — which lies to the board, to
     the fleet and to `aof work next`, and leaves the failure rollback nothing to roll back (the
     rollback fires only FROM `in-progress`). And it CAPTURES the session this build runs as, which
     is the only thing that lets `aof work observe` afterwards say what the story cost: the join is
     on `sessionId` and on nothing else, and that id is readable for SECONDS after the prompt that
     invoked this phase — never at its close, which is why the mint is here and not on the way out.
     **Write no status move of your own here.** The reactor performs it, and a hand-written
     `in-progress` move would be a second authority over one status line. Read the
     envelope's `sessionSource` for which rung answered — `flag`, `live-store`, or absent, which is
     an honestly unattributable run rather than a guessed one. A `duplicate-run` refusal means a run
     on this story is still open from a phase that died; the mint reclaims a stale run before it
     writes, so the next attempt recovers it rather than being walled out.
  3. **Build** — (orchestrated) spawn `aof-developer` to implement code + `@executable` step defs;
     **in solo mode (config or `--solo`), do it yourself in this session — spawn nothing.** Flag,
     don't change, a wrong scenario — and note any blocker or contract problem in the milestone's
     `STATE.md` `## Feedback (for retro)` section (distilled into `RETROSPECTIVE.md` at `aof:verify`).

     <build_terminator>
     **Run the tests as `aof test --scope impacted --story <ref>`.** The story's own declared
     `files:` is the changed set, so the run is the suites this story's write set can actually have
     touched — the declaration paying for a third time, after the wave planner and `validate`. Do
     **not** name individual suite files: that is `--scope file` wearing prose, and it is a
     selection made by judgement rather than by the declaration. A declared path the graph has not
     seen — the test the developer is about to write — WIDENS the run rather than dropping it, so
     the narrowing can never be silent, and every widening is named in the summary line.

     **The build stops at one of two terminators, and it says which one it stopped at.**

     *Success — the build is done and hands on.* Every task's `@executable` scenarios/rows are green,
     typecheck and lint are clean, and the fitness functions pass. All three legs, never just the
     first: a green scenario over a tree that does not typecheck is not a built story.

     *Failure to progress — the build has stopped converging and hands back.* Count the failing
     scenarios at the end of every round. A round that reduces the count clears the no-progress
     record; a round that leaves the count the same or higher records one more no-progress round.
     Reaching **2 consecutive no-progress rounds** — `work.loop.buildNoProgressRounds`, the bound's
     one home in `src/loop-bounds.mjs` — stops the build. The first round has no predecessor and so
     is never a no-progress round. This is a failure-to-progress bound rather than an iteration
     count, which is the stronger condition and needs no arbitrary N: a build that is still reducing
     the count is never stopped, and a build that has stopped reducing it is never ground at.

     Success is checked first, so a round that reaches zero failing scenarios hands on however many
     no-progress rounds stand against it.

     On reaching the bound, **stop and hand back**: report the round count and the failing scenarios
     by name, and name the bound that stopped it so the operator can raise it. Do not start another
     round, do not hand on to the gate ladder or the review lanes, and never print the accept
     hand-off.
     </build_terminator>

     **Recall prior gotchas first.** Before building, the developer runs (unconditionally — memory may
     be off) `aof work memory recall "<milestone domain / story keywords>" --kind near-miss --block` and
     considers the surfaced gotchas, recording at `aof:verify` (in `VERIFICATION.md`) any that shaped the
     build. An **empty block means nothing to surface** (memory may be off) — proceed unchanged.
  4. **Gate** — the free deterministic ladder, walked BEFORE any review lane is spawned.

     <gate_ladder>
     Walk the rungs the loop shell's `invokeGateLadder` (`src/commands/loop.mjs`) walks, in its
     order, each scoped to **the driven item's own ref — never to its parent**:

     1. `aof work validate <ref>` — if it answers with findings, **stop here**: the second rung is
        not walked and no reviewer is spawned.
     2. `aof work doctor <ref>` — walked only on a clean first rung. Only its admitted findings
        count, and an admitted finding is a red rung like any other.

     **Only when both rungs answer clean is any review lane spawnable.**

     **A rung that exits non-zero is a red rung**, never a clean one — report the rung, the ref and
     the error and stop, exactly as `<progress_tracking>` says of every work verb. A crashed gate
     followed by three spawned reviewers is the failure this step exists to refuse.

     **A red gate is its own outcome, never a review verdict.** Name the rung that answered and the
     findings it returned; print no review verdict, do not print the accept hand-off, and do not move
     the item to `in-review`. Fix what it named, then **walk the ladder again from its first rung** —
     a fixed rung is re-gated, never assumed green.

     **The ladder re-runs after every fix round too**, before any re-review is admitted, and **a red
     ladder after a fix round does not consume a review round**: the round counter advances on review
     rounds, and a red gate means the fix is not finished — return to fix, do not spawn.

     These two rungs cost seconds and the lanes below cost tens of minutes. Running them in the other
     order is how three reviewers get paid to rediscover one red the gate already knew about.
     </gate_ladder>
  5. **Review** — `aof-architect` (structural) + `aof-qa` (behavioural) + **`aof-designer` (design
     conformance, when the story has UI)** + an automated craft pass; apply confirmed fixes.
     **In solo mode you perform each review lane yourself in this session, in turn, and record
     the same verdicts — spawn nothing.** Be aware of what that costs: the value of a
     spawned reviewer is that it did not write the code and cannot be talked into liking it. Judge
     against the contract and the ADRs, not against your own build.

     <review_lanes>
     **Spawn the review lanes together and wait for all of them, rather than starting the next after
     the previous returns** — the same terms the build fan-out above already uses, for the same
     reason. The lanes are independent lenses over one diff; nothing in this step reads another
     lane's output, so a lane whose spawn waits on a prior lane's return buys nothing and costs its
     whole duration. Measured in milestone 71: `aof-architect` ran at 1.00× concurrency for a
     serial-chain cost of 30m46s and `aof-qa` for 32m01s — over an hour of pure serialisation in one
     milestone, on a lane one sentence would have parallelised.

     **The concurrent set is the story's own shape:** `aof-architect` (structural), `aof-qa`
     (behavioural) and the automated craft pass always; **`aof-designer` (design conformance) joins
     them as a fourth when the story has UI**, and not otherwise. **In solo mode nothing is spawned
     at all** — every lens is performed in this session, in turn, whether or not the story has UI.

     **Stagger the spawns by a handful of seconds** so the first warms the shared prompt prefix the
     rest read. That interval is prose and stays prose — deliberately neither a config key nor a
     `work.loop.*` bound, because a spawn-ordering hint whose failure mode is "the prefix cache
     misses" would be a knob with no consequence.

     **No lane reads another lane's verdict or findings.** Merge the lanes' findings only once all of
     them have returned, and a lane that returns findings never cancels the lanes still running — a
     Blocker from one lens is not a reason to discard a pass already paid for.

     **Concurrency stays inside the dispatch bound.** Never spawn more lanes at once than the `bound`
     `aof work dispatch --list --json` reports, and spawn the remainder as earlier lanes return.

     **A review lane runs `aof test --scope impacted --story <ref>` too, and never names suite files
     by hand.** Measured, this is the largest single item in a review lane's wall clock — one
     behavioural review at 58.6% test runner, another at 54.3%, a fix round at 45.6% — and it is
     time the operator waits through for no information. **A story-scoped green does not accept a
     milestone.** It says this story's suites pass; the milestone's own regression gate is what says
     the tree does, and 63/R7 is explicit that story-scoped suites are what make that gate
     load-bearing rather than ceremonial. Never report a narrowed run as a whole one — the summary
     line states the scope it ran as, and that is the claim to carry.
     </review_lanes>

     Hand every reviewer only the task `.feature` files (criteria), the build diff, and the story's
     `reads:` set. Do not preload the milestone body, `STATE.md`, or design/ADR prose outside the
     declared entries. Each reviewer follows the same `<read_depth>` contract as the build lane.

     <review_rounds>
     Review runs one round by default — `work.loop.reviewRounds`, whose one home is
     `src/loop-bounds.mjs`. Apply confirmed Blocker fixes from that round, then proceed to the
     Review gate. A second round runs only when round one leaves at least one **Blocker** (breaks
     correctness or violates the locked contract). Important findings and Nits do not earn another
     round: record them in the milestone feedback/findings path or hand them back as a story shape,
     so they remain named work rather than being silently dropped.

     Before round two, reproduce every outstanding Blocker against actual code, deduplicate the
     reviewer reports, and discard any claim that cannot be verified. Three rounds is the hard cap,
     the `MAX_REVIEW_ROUNDS` clamp on `work.loop.reviewRounds`. On reaching round three, stop and
     hand back with every outstanding Blocker named; never start a fourth round.

     **The gate ladder of step 4 runs again before every re-review**, and a red ladder after a fix
     round does not consume a round — the counter advances on review rounds, not on gate walks.
     </review_rounds>

     <delta_review>
     **A granted second round re-reviews the DELTA it was granted for, never the whole story again.**
     Round one's cost is the price of judging the build; round two's is the price of judging a fix
     that touched a handful of lines, and those are not the same number.

     **Re-spawn only the lens or lenses that raised a surviving Blocker.** Every other lens is left
     with its round-one verdict standing: a lens that reported clean in round one is not spawned
     again, and that clean verdict is the answer of record. If no Blocker survived reproduction,
     nothing is re-spawned at all.

     **Hand each re-spawned lens exactly three things** — the fix diff, the Blockers that lens itself
     raised, and the contract clauses those Blockers cite. Not another lens's Blockers, not another
     lens's round-one verdict, not the round-one findings below Blocker, and not the story's whole
     `reads:` set: the lens is judging a fix, not re-judging a story.

     **The design lane re-renders only the surfaces a surviving design-gap Blocker NAMED** — that
     surface, or those surfaces, and no other. A design-gap claim that names no surface names nothing
     to re-render, and re-renders nothing.

     **One deduplicated Blocker re-spawns exactly ONE lens**, chosen by the claim's class: a
     `production-defect` is the architect's, a `locked-contract-violation` is QA's, a design gap is
     the designer's, and where the class is ambiguous it is the lens whose report survived
     reproduction. Two lenses reporting one defect is one claim, and re-spawning both raisers for it
     is the duplicated effort this bound exists to remove.

     **The delta is named by the reproduce-and-deduplicate step above, never guessed at.** Reproduce
     every outstanding Blocker against actual code first, deduplicate the overlapping lens reports,
     and discard any claim that cannot be reproduced — a discarded claim earns its lens no re-spawn.
     </delta_review>

     <finding_triage>
     **At the CLOSE of the review pass — once, never inside a round** — every surviving non-Blocker
     finding is routed, so that capping the rounds SCHEDULES the remaining work instead of dropping
     it. A Blocker is not routed here: it was chased in a round, or it is named in the bounded stop.
     A claim that did not reproduce was discarded before the close. Two lenses reporting one defect
     is one finding, routed once.

     Put each surviving finding to these **five ordered questions** and take the first answer:

     1. **Does it require a change to a locked contract — a delivered `.feature`, or an ADR?** → it
        is an **amendment**, ratified in the beat that raised it. **No item is created**, and the
        delivered `.feature` is never edited: the rule lands in the accepting item's own contract, or
        as a new superseding ADR.
     2. **Is the remedy cheaper than the driver that would carry it?** → it is **`fixed`**, applied
        at this close, and **no item is created**. Weigh the remedy against the ceremony a driver
        costs — a top-level folder and its record doc, a Definition of Done to author, a validate
        gate the stream must keep green, and a whole `aof:verify` session to close it — never
        against a line count or a duration, which is a judgement about the code rather than about
        what scheduling it would cost. This question is asked BEFORE the next one on purpose: a
        remedy that is both cheap and checklist-shaped is fixed, not scheduled. Fixing at the close
        is applying a confirmed fix, so it mints no review round; every surviving finding is routed
        exactly once, so N findings admit at most N fixes and the close still terminates.
        **Only an Important finding reaches this question** — a Nit is recorded at question 5.
        **The driver being weighed is a story the operator must refine**, since 123 left no lighter
        one. The bar is therefore higher than it was, and deliberately: fix it here if it is small,
        and log it as a story if it is not.
     3. **Is it discharged by a checklist against existing code, with no new acceptance criteria?** →
        **the loop creates nothing.** It is chore-shaped work that question 2 has already found too
        expensive to fix at this close, so it is handed back to the operator as a **story** shape —
        the routing question 4 takes, recorded as `story (operator)` with the shape the story would
        take. A Nit never reaches this question at all.
        This question minted a top-level driver until 123, and it was the last door through which a
        review pass could deposit work in the stream as a side effect of being thorough: measured
        2026-09-06, milestone 119's closes minted three, and 118/01's depth bound answered correctly
        for every one of them because the item under review was not a chore.
        **When the item under review is ITSELF a chore**, the remedy folds into
        the reviewed chore's own `## Definition of Done` instead — an **amendment**, creating
        nothing, exactly as question 1 already means, and a cheaper destination than a story the
        operator must refine. A remedy that does not belong in that checklist is handed back to the
        operator as a story shape rather than folded.
     4. **Does it need new acceptance criteria a `.feature` must state?** → **the loop creates
        nothing.** Record the routing as `story (operator)` with the shape the story would take, and
        hand back. This is the one question whose answer is new acceptance criteria, so it is where
        the machine stops and the human starts.
     5. **Otherwise** → it stays a **recorded finding** in the milestone's `STATE.md`
        `## Feedback (for retro)`, landed in `VERIFICATION.md`'s register with its allocated id by
        the PO at `aof:verify`.

     **The loop creates NO item.** No answer above ends in a creation: an amendment lands in a
     contract, a `fixed` remedy lands in the code at the close that found it, a `recorded` finding
     lands in `STATE.md`, and everything else is handed back as a story shape. It never creates a
     story — authoring criteria is a refine act, and a story born without criteria is the unbounded
     backlog this rule exists to prevent — it never creates a milestone, which is the operator's
     call, and since 123 it no longer creates the one `chore` 71/ADR-003 allowed it. That authority
     is narrowed to zero rather than contradicted: an operator who wants chore-shaped work scheduled
     still schedules it by hand, which is where the decision belonged. **Name no creating verb here**
     — there is no creation for one to perform.

     **Allocate no finding id and print no `@finding-<id>` tag.** The only findings register is the
     milestone's `VERIFICATION.md`, authored by the PO at `aof:verify`; at review-close time neither
     it nor an allocator exists. The back-reference names the finding by title, and `routed-to`
     closes the trace from the other end at the gate.

     Report what the close routed: each surviving finding with the routing it took, what each `fixed`
     finding changed, and each finding handed to the operator as a story shape. A close creates no
     item, so it has no created ref to name. A close with nothing surviving routes nothing, creates
     nothing, and says so.
     </finding_triage>

     <stall_detection>
     Record the round number and Blocker count at the end of every round. From round two onward, if
     the count is not strictly lower than the previous round, stop immediately and report:
     `Round N: <count> Blockers, unchanged from round N-1. Stopping.` Name each outstanding finding
     as `file:line` plus its input → state → outcome failure mode, then offer the operator exactly:
     force-proceed to the gate · provide guidance · abandon and re-refine.
     </stall_detection>

     **Design conformance (when the story has UI) — render → hand to the designer → spawn QA
     (ADR-001/002/003).** Catch design-gaps here (at build) — far cheaper than at the `aof:verify` gate
     or a cross-milestone UAT. The orchestration renders, then hands the screenshot to the read-only
     designer to JUDGE (it is the only party that bridges "run the browser" to "judge the result"):
     - **Renderability precondition — evaluated BEFORE any render is attempted, and before anything is spawned.** Resolve both halves: **(a) a base URL** — `--url` when given, else `work.ui.baseUrl`; and **(b) a renderer** — `work.ui.renderer` when declared, else the highest-revision Chromium found by GLOBBING the platform's `ms-playwright` cache. Glob it, never template a path: the cache layout is not stable (`chromium-1187 → chrome-win`, `chromium-1234 → chrome-win64`, plus `chromium_headless_shell-<rev>`), so a templated path is a bug with a release-number fuse. **Resolvable means EXISTS AND IS EXECUTABLE**, not merely that the key is set — a declared path that is not there is this precondition's finding, named with the path that failed, rather than a render-time crash. If either half is unresolved, or the surface declares no `Route`: **attempt no render at any breakpoint** — record the reason naming the missing key, the missing binary or the missing `Route`, return `INCONCLUSIVE`, spawn no designer session and no QA session, and continue the story lane. The precondition is per surface, so a surface that resolves is still rendered and judged when a sibling surface does not.
     - **Render** each DESIGN surface by driving the resolved renderer directly, one render per breakpoint — `<renderer> --headless=new --disable-gpu --hide-scrollbars --window-size=<W>,<H> --screenshot="<absolute forward-slash path>" "<baseUrl><Route>"`. The output path is made absolute and forward-slashed on every platform before it is passed. A render that exits non-zero, exits zero but writes no file at the named path, writes a zero-byte file, or does not return within the step's own wait is `INCONCLUSIVE` with that failure recorded as the reason.
     - **Breakpoints.** Take the render at the defined breakpoints — the `390` / `768` / `1280` default (mobile / tablet / desktop), DESIGN-overridable per milestone (a surface's `DESIGN.md` may state its own widths). The breakpoint's width is what `--window-size=` carries, so each breakpoint is one invocation at its own width and one screenshot at its own output path; a render that dropped the width would be rendering a different surface than the one being judged.
     - **Playwright stays off the dependency list.** It is NOT a `package.json` dependency and does not become one — the render above drives an already-cached browser binary. QA's own lane is untouched: it still runs the Playwright harness and owns the `toHaveScreenshot` regression.
     - **Hand off to the designer.** Spawn `aof-designer` to JUDGE the rendered screenshot they pass it (the ADR-001 hand-off) — give it the screenshot path(s) + the conformance baseline (the committed mock under `mocks/` and/or the binding checklist) and have it return the region-by-region verdict. Do NOT instruct the designer to run the browser itself — it has no `Bash`; it only judges the screenshot it is handed.
     - **Spawn QA.** Spawn `aof-qa` for the browser harness / regression / a11y — QA runs the Playwright harness, owns the `toHaveScreenshot` regression, and the optional axe-core-via-Playwright a11y lane.
     - **Verdict.** The verdict is `CONFORMS` / `GAPS` / `INCONCLUSIVE`. It is `INCONCLUSIVE` when no base URL / screenshot is available or no baseline exists (no committed mock AND no binding checklist). A DESIGN surface with no renderable `Route` collapses to `INCONCLUSIVE` naming the missing `Route`. Name the missing baseline as the gap rather than inferring from component code — never read the component code and call it a `CONFORMS`/`GAPS` verdict; the honest answer is `INCONCLUSIVE` + "produce the missing baseline / render".
  6. **Mark it reviewed**, and close the run this lane minted — `aof work status <ref> in-review`
     once every `@executable` scenario is green, the gate ladder answers clean, and the review lanes'
     confirmed fixes are applied, then `aof work run-complete <ref> --outcome done`. A phase that
     returns without completing its run turns the `duplicate-run` guard from a backstop into a wall
     for the next phase on that story. That is this command's terminus: `done` belongs to
     `aof:verify`, and the lifecycle refuses it from here anyway.
     **Under a driving shell** (`aof work loop` / `aof work drive` / the mesh worker — the session
     carries `AOF_RUN_ID`), both verbs answer "driven by the shell … nothing written" and exit 0:
     the shell minted this run before the session and settles it when the session ends. That
     answer is success — never retry it, never reach for `--run`, never settle the run by hand.
- **task** — build that single task to green, then review.
</process>

<progress_tracking>
Status is the source of truth, and **`aof work status` is its one writer** — never hand-edit a
`status:` line. The verb checks the move against `ITEM_STATUS_EDGES` (`src/acceptance-horizon.mjs`),
which is the one copy of the lifecycle — do not redraw it here. A story's usual walk is
`not-started → in-progress → in-review → done`, but **`in-progress → done` is equally legal**, and
it is the path a milestone, `uat` session, `spike` and `chore` actually take: none of them is ever
authored `in-review`, so requiring that hop would refuse acceptance for every driver type except a
story. (`blocked` is reachable from any of them and rolls back to `in-progress`/`not-started`;
`done` is terminal.) `verify.md` states the acceptance half in the same terms. The verb refuses an
illegal move with the legal moves named, stamps `updated:`, and publishes the change to the board
and the fleet. A hand edit does none of that, and stays invisible until something else happens to
republish. (The PO remains the single writer of milestone SPEC/STATE **prose**.)

- **Task** — done when its `@executable` feature is green. Tick its box in the parent `STORY.md` `## Tasks`.
- **Story** — `aof work run-start <ref> --json` when the build starts (step 2 above), whose reactor
  makes the `in-progress` move; then `aof work status <ref> in-review` once built, gated and reviewed,
  and `aof work run-complete <ref> --outcome done` to close the run (step 6). `in-review` carries **no
  flag**: nothing else moves an item there, so a refusal is genuinely surprising and must stay loud.
  `done` is set later, at `aof:verify`.
- **Milestone** — `aof work run-start <NN> --json` **once, by the orchestrator, in its own checkout
  before the fan-out**, closed by `aof work run-complete <NN> --outcome done` at the walk's end (the
  walk above); no lane mints it, and a span mints none at all. Record notable events in `STATE.md`.
- **Driven session** — when a shell owns this session's run (`AOF_RUN_ID` is set), `run-start` and
  `run-complete` for THAT item are answered, not performed: the shell settles its own run from what
  it observed. The reply names it; treat it as done. Runs for OTHER items (a milestone orchestrator's
  per-story mints) are unaffected.
- `aof work status <ref>` with NO target is the read: it reports the current status and the item's
  legal next moves. Ask it rather than guessing — a wrong move is refused and writes nothing.
- Finding the item already started is the COMMON case, not the exception, and no prompt here writes
  that move. **Two** mechanisms make it: the **phase door** (`STARTING_PHASES`,
  `src/commands/continue.mjs`) on any local `continue`/`refine` act — which is why
  `aof:refine <story-ref>` starts the story it refines — and the **`run.started` reactor**
  (`src/effects/table.mjs`) on every run mint, which is how the mints above, `aof work resume` and a
  worker's dispatch all start theirs. A re-entered lane arrives the same way. Both are bounded to the
  same starting edge, so a repeat is reported as not applicable and changes nothing — which is what
  makes the mint safe to run unconditionally at the top of a lane.
- **A non-zero exit from a work verb is a stop signal, always.** `--if-applicable` narrows exactly one
  code on exactly one move; `ref-not-found`, `invalid-status`, `record-doc-unusable` and the
  no-local-checkout refusal all still fail, and each means the item is not what this prompt believes
  it is. Read the refusal — never step past it.
- **A propagation warning is also a stop signal for closing that lane.** The local status write did
  land, but the shared scheduler has not observed it yet. Do not merge-and-clean through a
  `propagationWarnings` result or a rendered `warning: global work propagation ...` line. Keep the
  lane, report the warning, and retry cleanup after the projection store recovers; cleanup itself
  retries the durable consequence and refuses while it is still owed. This applies even though the
  status verb exits zero: failure isolation preserves the local write, not permission to discard its
  convergence evidence.
- Bump `updated:` on every other record you touch by hand — the status verb stamps its own.
</progress_tracking>

<output>
Report what landed, each task's green-status, and the review verdicts — then name which outcome this
was, and the command that follows it. Never print the accept hand-off after a stop:

- **walked to the Review gate** — every member built and reviewed. Next: `aof:verify <ref>`.
- **stopped: `<ref>` unrefined** — its contract is not authored/tagged. Next: `aof:refine <ref>`.
- **stopped: blocked on `<waitingOn>`** — `aof work next` answered `blocked`. Next: finish what it
  names, then re-run `aof:continue <ref>`.
- **stopped: the gate is red** — name the rung that answered and its findings (or its error), and
  say that no reviewer was spawned. Next: fix what the rung named, then re-run `aof:continue <ref>`,
  which walks the ladder again from its first rung.
- **stopped: the build stopped progressing** — report the round count, the failing scenarios by name,
  and `work.loop.buildNoProgressRounds` as the bound that stopped it. Never print the accept hand-off.
- **stopped: review stalled/capped** — report the round counts and outstanding Blockers, then wait for
  the operator's force-proceed / guidance / re-refine decision. Never print the accept hand-off.
</output>
