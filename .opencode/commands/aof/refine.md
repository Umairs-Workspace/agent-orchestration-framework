---
description: Refine a work item — break a milestone into independent stories, or author a story's task features (Three Amigos), producing ARCHITECTURE/DESIGN/RESEARCH as needed. With --autonomous, cascade the whole item (break down + author every contract) and stop once for a single review at the end.
---

<objective>
Deepen a work item: break a milestone into **independent** stories (the doc-producing stage), or
author a story's task `.feature` files via Three Amigos.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`, `work.agents`, `work.tags`. Parse `$ARGUMENTS` into the item
**ref** (`NN` / `NN/SS` / slug), an optional **`--autonomous`** flag, an optional **`--solo`** or
**`--orchestrated`** flag and an optional **`--thinking <level>`**. Resolve the ref by running `aof work find "<ref>" --json` (folder-name
lookup — never glob `**/*.md`).

**Step 0 — a BACKLOG ref is promoted first, here, before anything else.** When that `aof work find`
answers a row with `number: null`, the item is in the backlog: it has no number yet, and everything
this phase does afterwards is keyed by one — the run mint, every `aof work` call, the hand-back. Run
`aof work promote <slug> --json` and use the envelope's `created.ref` as THE ref for the rest of the
phase (ADR-003 §7, ADR-005 §3). The promotion APPENDS: a position is the operator's to name through
`aof:promote <slug> at <P>`, never this command's to choose. A promote REFUSAL IS A STOP — report it
and stop; `promote-depends-backlog` means the item's `depends:` names another backlog item, so the two
ways out are promoting that one first or dropping the entry. (`aof work refine <ref>` on the CLI
refuses a backlog ref outright as `phase-backlog-ref`, for the same reason this step is local: a mint
belongs where the operator is and is never dispatched to a worker.)

**Execution mode.** Resolve from `work.agents.mode`, which governs the refine an operator types:
`work.agents.mode: "solo"` resolves to solo (play every role inline in this session), and
`work.agents.mode: "orchestrated"` resolves to orchestrated (spawn the role agents).
**An unset `work.agents.mode` resolves to solo** — the one default every command that reads a mode
shares, and the right one here because a contract is cheapest written in one context that already
holds the story, its ADRs and the code, and a single author keeps sibling tasks consistent.
**`--solo` OVERRIDES an orchestrated config to solo for this run** — the same effect as
`work.agents.mode: "solo"`, without editing config — and **`--orchestrated` OVERRIDES a solo config
to orchestrated for this run**, its twin in the other direction. The two together are
contradictory: STOP before any role runs and report it. The loop composes a flag on every refine it
drives: `work.loop.agents.refine.mode` (a key whose home is `packages/contracts/src/loop-bounds.mjs`)
when set, else `work.agents.mode`, else `solo` — the one built-in default, whose home is
`packages/contracts/src/agent-mode.mjs`. A loop-driven refine therefore follows `work.agents.mode`
unless the loop's own key overrides it. Either flag changes only WHO does the work, never WHAT is
produced: the same documents, the same contracts, the same gates.

Solo is the default because the orchestration usually costs more than it buys: the main session
already holds the context a fresh sub-agent would have to rediscover. A spawned agent starts cold:
it re-reads the codebase, re-derives what you already know, and hands back a summary you then
re-read. Inline pays none of that, at the cost of the parallelism and the independent perspective a
separate agent brings — reach for `--orchestrated` when that perspective is worth the cold starts.
In solo mode the roles are still played in full and their outputs still land in the same files —
you are the architect, the QA and the developer in turn.

**`--thinking <level>` is a STOP, never a setting.** This session's effort was fixed when it started:
the Agent tool takes a model but no effort, and only `/effort` changes a running session's, which
this command cannot type for the operator. So when `$ARGUMENTS` carries `--thinking <level>`, STOP
before the run is minted and before any role runs, and print what to do: run `/effort <level>`
(spelling `extra-high` as `xhigh`; `low`, `medium`, `high`, `xhigh` and `max` are typed as
given), then re-run `aof:refine` without `--thinking`. Say plainly that the session's effort was NOT
changed, and that the subagents this command spawns inherit the session's effort unless
`work.agents.effort` pins their role. A level outside the six accepted spellings — `low`, `medium`,
`high`, `xhigh`, `extra-high`, `max` — is named as unknown, with those six listed. Never report
an effort as set when it was not. (A loop-driven session is launched at its effort by
`aof work loop --thinking`, and is never handed this flag.)
</config>

<process>
**Mint this phase's run before the first agent is spawned, and complete it at the close.**
`aof work run-start <ref> --json` is this phase's first act on the item; `aof work run-complete <ref>
--outcome done` is its last. The **spike / chore decline below mints nothing** — refine is a strict
no-op on disk for those two types, and a run record is a write.

The mint's POSITION is a correctness requirement, not sequencing taste. The session id this phase runs
as is readable from the live session store for SECONDS after the prompt that invoked the phase — that
store's TTL is 120s and its reaper unlinks at every write seam — and is gone by the close. A run
minted late carries no id, and a run record with no id leaves `aof work observe` exactly the empty
index this mint exists to fill: it joins a transcript to an item on `sessionId` and on nothing else,
so a phase that mints nothing costs the milestone every number it could have reported about itself.

The mint also REPLACES the starting status move rather than sitting beside one: `run.started`'s
reactor (`packages/work/src/effects.mjs`) makes the `not-started → in-progress` move. Read the envelope's
`sessionSource` for which rung answered — `flag`, `live-store`, or absent, which is an honestly
unattributable run rather than a guessed one. A `duplicate-run` refusal means a run on this item is
still open from a phase that died; the mint reclaims a stale run before it writes, so the next attempt
recovers it. There is deliberately no heartbeat on a phase run.

Dispatch on the item's `type`. **`--autonomous`** changes only *where you stop*, not *what you
produce* — without it each stage stops at its review gate; with it (see the block after the dispatch)
refine cascades through every sub-stage of the item and stops once, at the end, for a single review.

- **spike / chore — refuse, no Three-Amigos, no break-down (ADR-003).** Neither type is a refine
  target: both are **top-level drivers that group no stories** (ADR-001) and carry **no task
  contract** to author — a spike's deliverable is a recorded finding (`SPIKE.md` `## Finding`), a
  chore's is a ticked `## Definition of Done` checklist, neither a `.feature`. There is nothing here
  to Decide (no ARCHITECTURE/DESIGN/RESEARCH fork — the item itself frames its own question/intent),
  nothing to Break down (it groups no stories), and no Contract to author (no Three Amigos, no
  `tasks/`). **Decline and redirect:** report that this type has nothing to break down or contract for,
  and point at the item's own record doc as the next step instead — a spike is worked directly (fill
  `## Investigation` / `## Finding`) and closed with `aof:verify <ref>`; a chore is worked directly
  (tick `## Definition of Done`) and closed the same way. Create **no `stories/` folder and no task
  `.feature` file** under the item — refine is a strict no-op on disk for these two types.

- **milestone — Decide + Break-down:**
  1. **Decide** (only for genuine open questions; skip what it lacks): blocking unknown →
     `aof-researcher` → `RESEARCH.md`; non-trivial decision → `aof-architect` → ADRs in
     `ARCHITECTURE.md` + the fitness functions DECLARED in its register (the arch-test file lands with
     its subject) (move any invariant out of features); UI → `aof-designer` → `DESIGN.md`.

     **Diagram an ADR only when its design has moving parts** — the architect's judgement, and most
     ADRs get none. Write the ADR's `### Diagram` brief first (why a picture helps, the view, the
     components, the flows), then run `aof diagram plan <ref> <ADR-NNN> --slug <slug> --json`.
     `enabled: false` → drop the brief and record nothing. `available: false` → keep the brief,
     record `diagram not drawn: <code>` in `STATE.md`, and continue; it is never a stop. Otherwise
     the drawing agent follows the answer's `instructions`, then run
     `aof diagram export <ref> <ADR-NNN> --json` and paste the returned `block` under the brief — aof
     never edits `ARCHITECTURE.md`. On a solo refine the main session is the architect and runs the
     same step.

     **Declare each control where a runner can see it (the fitness register's form).** A fitness
     function is DECLARED at refine — id, invariant, intended path, source ADR — and that declaration
     is the reviewable artifact. The id stands ALONE in the first cell of its `## Fitness functions`
     row, or it declares nothing.

     **A declared control must resolve to a path a runner can see** — the fitness register names the arch-test's INTENDED PATH in the runnable test tree, registered in a runner; a test-shaped file under the work tree is NOT that place, and a control whose file has not landed yet carries the token `pending` in its own entry rather than being parked anywhere.

     **Cite another item's id as `m?<itemRef>/<ID>`** — the `m` prefix is optional, because both spellings are real — **and cite only ids that resolve**: a bare id is addressable only inside its own item's documents, so a cross-item citation carries the ref.

     **When you QUOTE an id that does not resolve, write it APART (`item` + `id`), never joined** — a joined specimen is not a specimen: the grammar reads it as a real citation and plants it in your own register.

     Which places count, explicitly:
     - **a path in the runnable test tree, named by a runner** — the place a control belongs.
     - **a test-shaped file under `work.dir`** — **prohibited**. A staging folder parks guards where no
       test glob can see them; measured downstream, 8 of 13 staged guards changed on contact with a
       runner. Do not create one, and do not park the file anywhere under the work tree in the meantime.
     - **a `reference/` file renamed out of every glob** — the one admitted exception: a RETIRED suite,
       deliberately renamed out of every runner, never a staged one.
     - **an invariant with no path at all** — not a declaration a reviewer or a check can act on.
     - **a path that does not exist yet, its entry carrying the token `pending`** — admitted while the
       item is open, refused at accept.

     `pending` is ACD's `xfail`: a declarative statement that a control is known-absent, in the
     declaration's own entry, bounded by the item's own accept rather than by a date — nothing here
     records or reads one. **The token IS the marker** — no cell position or bullet shape is
     prescribed. It reports at **warn** while the item is open, and is **not admitted once the item is
     `done`**. Every declared control also owes a **red probe** in the item's `VERIFICATION.md` fitness
     register once it lands — what was changed to make it fail, and the message observed.

     **Do not accept an item whose `ARCHITECTURE.md` register declares a control that does not resolve** — marker or no marker. Nothing refuses the transition for you: `aof work doctor <ref>` reports each one as `control-unresolved`, a standing `pending` marker downgrades it to `warn`, and a warn-only doctor result does not fail `aof:validate`. What clears it is landing the file or dropping the declaration, never re-marking it `pending`.

     **UI / designer path — elicit a mock, or make the binding checklist mandatory (ADR-003).** When the
     milestone has UI and `aof-designer` authors `DESIGN.md`, **elicit mocks from the user at refine**:
     ask, per surface, whether they have a mock (an image / a local HTML export from Figma / claude.ai
     design / a screenshot). This gives the read-only designer a baseline it can actually `Read` at review
     time (the root cause being fixed: a mock left as a remote design-tool link is one the read-only
     designer cannot open). For each surface:
     - **An existing mock is committed under the milestone's `mocks/` dir** — `wiki/work/NN_milestone_<slug>/mocks/<surface>.png`,
       committed as a locally-readable artifact. Export any remote design into `mocks/` and commit the
       file; never leave a remote design-tool link as the sole reference.
     - **The committed mock is referenced from `DESIGN.md` as the conformance source of truth** for that
       surface — a locally-readable artifact, never a remote-link-only reference.
     - **With no mock, the binding checklist is mandatory and is the source of truth** — `aof-designer`
       fills the surface's mandatory binding checklist in `DESIGN.md` (layout regions in order, the
       components each region holds, the states empty/loading/error/populated, the design ramp each uses)
       so the surface still has a baseline the review can judge against (rather than an INCONCLUSIVE on a
       missing baseline). A surface with neither a committed mock nor a checklist has no baseline.

     **Recall prior lessons first (before authoring ADRs/stories).** Role-scoped, run unconditionally
     (memory may be off — see below): the **architect**, before writing an ADR, runs `aof work memory
     recall "<the decision in a few words>" --area architecture --block`; the **PO**, before the
     break-down, runs a recall keyed to the milestone's domain — `aof work memory recall "<milestone
     objective keywords>" --item <ref> --block`. Read the returned block and acknowledge any surfaced
     **near-miss** relevant to a decision — honoured, or consciously departed from, in `ARCHITECTURE.md`
     (or `STATE.md`). An **empty block means nothing to surface** (memory may be off) — proceed
     unchanged.
  2. **Break down** (with `aof-architect`): partition into **independent** stories — minimise
     cross-story coupling to maximise parallelism. For each, create `stories/<SS>_story_<slug>/`
     (`STORY.md`, `parent:` this milestone) and list it in the milestone `SPEC.md` `## Stories`.

     **Declare each story's context and write ownership at the same authoring moment.** Populate the
     story frontmatter's inline lists before the breakdown is reviewable:

     **DERIVE the two sets, then SUBTRACT — never recall them.** `packages/work/src/story-contract-derive.mjs`
     proposes both from three sources and says which proposed each entry: the story's own subject
     files, the coupling the codebase graph already holds around them (imports and call sites, read
     from the artifact `aof graph build` wrote — never rebuilt here), and the `file:line` citations
     the milestone's SPEC and ADRs already carry. It adds the leg that is pure convention and is the
     one most often missed: the suite that owns each declared source file. Start from that proposal
     and remove what the story does not need.

     **The proposal is never applied.** It is rendered for you to act on; nothing writes a
     `STORY.md`, and there is no flag that would. The asymmetry is deliberate and measured: an
     over-broad set costs a serialised wave, which is cheap and visible in `aof work next`, while a
     set silently narrowed by a tool costs a builder an unplanned cold read later with nothing in the
     stream saying why. 63/R4 records read- and write-set escapes across four consecutive stories,
     and a downstream retrospective records `files:` short of the test lane three stories running —
     the sets are short when they are recalled, which is why they are derived. A proposal derived
     against an absent or unreadable graph says so and is not a complete one; treat it as the
     citations alone.
     - `reads:` is the exact whitelist of project files the build/review needs. Name an architecture
       decision as `<path-to-ARCHITECTURE.md>#<adr-anchor>`, never as the whole milestone document.
       **A forward reference is legal**: an entry naming a path a sibling story's `files:` claims
       validates clean even though nothing has created it yet, so a stage-2 story declares the
       stage-1 modules it composes rather than standing sibling `STORY.md` paths in their place.
     - `files:` is every project file the story may write. A file in `files:` may also be in `reads:`.
       Keep paths project-root-relative with forward slashes so sibling write sets compare exactly.
     - Do not infer either set later from story prose. If the boundary changes, update the declaration
       here; an agent that discovers an undeclared read/write reports the contract gap.

     **Ground boundaries in the codebase graph first.** Run unconditionally (a silent no-op when graphify
     is absent — mirrors the memory-recall hook above): **before** drawing any story boundary, build the
     codebase graph fresh — `aof graph build .` (the project root, where call/dependency coupling
     lives; NO `--backend` — that is the code-only build: no key, zero egress, docs in the tree are fine;
     read back the `builtAt`/`egress`/counts the `BuildResult` returns so freshness is visible) —
     then run `aof graph impact <the candidate modules / files at each boundary>` to get the **exact**
     dependents + dependencies of each from the graph's edges (deterministic — not the fuzzy
     similarity-seeded `graph query`, which you may still use for open-ended "what's the god-node here"
     exploration). Draw boundaries that **follow the real call/dependency coupling** `graph impact`
     reports — a boundary that cuts a file away from the modules that import it is a bad cut — and **cite
     the graph-derived coupling** in the breakdown rationale / `ARCHITECTURE.md`. **Advisory only:** YOU
     draw the partition using your own judgment — the graph informs it, never auto-rewrites it; no graph
     output feeds a gate or work-mutation. Graphify extraction replaces the single project graph; never
     target a package or `src` subtree, because doing so evicts every file outside that subtree. A module
     `graph impact` reports `present: false` for is **not covered** by the graph — its coupling is UNKNOWN,
     so never draw a boundary on the strength of an empty answer. A build reporting `unchanged: true`
     **succeeded**: graphify rewrites only when the graph's topology actually changed, so that is "already
     current", and the graph is yours to use. Only if `aof graph build` returns the structured
     `graphify-missing` miss — or FAILS with `graphify-build-failed` / `graphify-no-persist`, which means
     no usable graph was produced — note the graph is unavailable and draw boundaries from reading the
     source exactly as before: no block, no crash, no noise, and no reading of a stale artifact as if it
     were this build's output.

- **story — Contract (Three Amigos):** author the task `.feature` files under `tasks/`, opening with
  the discovery beat below when the project has turned it on.

  Discovery comes first, and ONLY when the project has turned it on: read `work.examples.enabled`
  from `.aof/aof.config.json`. It defaults to **off**, and only the boolean `true` turns it on —
  absent, `false` or any other value (the string `"true"` included) is off. When it is off, write
  no `EXAMPLES.md`, ask no question, and author the Contract exactly as the rest of this section
  says; nothing else in the Contract changes. When it is on, before any `.feature` exists:

  - **The PO drafts the example map** — one `EXAMPLES.md` in the story's own folder, from the
    story's user story and the milestone SPEC. It holds the rules, two or three key examples per
    rule with real values including the awkward edge, and every question the PO cannot answer from
    the record. Its form is the template at `.aof/templates/work/story/EXAMPLES.md`; copy that,
    never a grammar from memory. Every example the PO writes is `proposed`, and only a person's
    recorded answer makes one `confirmed` or `stated`. A story with no rule a person owns
    declares the map not applicable in one line, as the template shows.
  - **Which answer licenses which label.** An example's `confirmed` is written only after the
    person's recorded answer to the example's own token, `<story ref> E<n>`. An example's
    `stated Q<n>` and a question's `answered` are written only after the person's recorded answer
    to the question's token, `<story ref> Q<n>`.
  - **The architect reviews every question the PO labelled `technical`**, and relabels one that is
    really policy as `business`. A technical question may take a documented default, recorded as
    `defaulted <pointer>`; a business question never does.
  - **Strike before asking.** Before any question reaches a person, strike every one the record
    already answers (the story's user story, title and Notes, the SPEC, the ADRs), and relabel
    every engineering choice `technical`. A map with no business question left is a good outcome.
    Each question that remains carries the context the person needs to answer it (what was
    measured, and what each option costs), in the person's terms, never an internal name or number
    they were not given.
  - **The main session asks** each business question through `AskUserQuestion`, in solo and in
    orchestrated mode alike: a spawned agent drafts and returns its questions, it never asks them.
    Each question opens with its token — `<story ref> Q<n>`, or `<story ref> E<n>` when a
    proposed example is put to the person to confirm. Worked, for story 7/2:
    `7/2 Q1 · Does a reserved book count toward the five?` and
    `7/2 E2 · Is a sixth loan refused while five are out?`. The token goes at the head of the
    question text, never in its header, and one call carries at most four questions. The agent
    writes the answer into the map, but it is the harness's record of the answer, not the map,
    that makes the label hold.
  - **In a driven session, one question per ask.** A driven session is one whose environment
    carries `AOF_RUN_ID`: a loop drives it, and its `AskUserQuestion` call becomes the loop's ask.
    The session stops, the question is posted, and the answer comes back when it resumes. One ask
    carries one answer text, so in a driven session each `AskUserQuestion` call carries exactly one
    question; the at-most-four rule above is the interactive session's. The question opens with its
    token, then names itself a discovery question, the rule it bears on as `R<n> · <rule>`, and the
    example it would settle, or that it would add a new one. All of that goes on its first line,
    which is what the loop's one-line account and its Discord preview show. Worked:
    `7/2 Q1 · Discovery question — rule R1 · A member may hold at most five loans; settles E2.`
    Then come the loop's four lines, `Decision needed:`, `Options:`, `I would pick:` and
    `What the answer changes:`, under 1,500 characters, with the options also given as the tool's
    options. Mark the question `asked` before the call. A business question is never given a
    default in a driven session, and is never sent as the NEEDS_INPUT sentinel, whose free text has
    no option list; a technical question still takes its documented default. The answer arrives as
    the next input of the resumed session: write it into the map (the question `answered`, and its
    example `stated Q<n>` or `confirmed`), then run `aof work doctor <story> --json` as the next
    bullet says. A question parked unanswered leaves the story at the Contract gate, with no
    `tasks/` written.
  - **Then ask the doctor.** Once the questions are asked, run `aof work doctor <story> --json`.
    Any error-severity `example-*` finding stops the Contract stage before the first headline
    Scenario, and no `tasks/` is written; settle the map and run it again. A warn does not stop
    the stage.

  **Formulation.** PO writes the headline Scenarios; `aof-qa` writes the Examples tables;
  `aof-developer` checks feasibility.
  **With an applicable example map, formulate from it.** This holds only when the discovery beat
  above ran and the map is not declared not applicable. Otherwise formulation is exactly as this
  paragraph says without it: no `Rule:` block and no example id is asked for. The PO reads the map
  first. It writes one `Rule:` per map rule, titled with the rule's id and text
  (`Rule: R1 · A member may hold at most five loans`), and under it one headline Scenario per key
  example, titled with the example's id and its outcome
  (`Scenario: E2 · a sixth loan is refused while five are out`). QA writes its outlines inside the
  rule they test, and a row that restates a map example carries the example's id in a column
  headed `example` (a row `| E3 | 5 |` under `| example | loans |`). Where a map example and a
  table row say the same thing, the key example stays the headline Scenario and the table keeps
  only the edges. Every `confirmed` or `stated` example must be carried this way, under its own
  rule: `aof work doctor` reports one that is not as `example-untraced`, and continue refuses the
  build until it is restored. A project whose runner does not bind `Rule:` writes one feature per
  rule instead, titled with the rule's id (`Feature: R1 · …`) and holding no `Rule:` line.
  **Under orchestrated mode, one `aof-qa` writes the Examples tables for all of the story's tasks**
  — a single pass that sees every task at once. **The QA pass is never split into one agent per
  task**: each such agent re-reads the same story, ADRs and code at full cost, and none of them sees
  its siblings (measured 2026-09-27: about eleven `aof-qa` agents in flight on one story's refine).
  **In solo mode you play all three yourself, in that order, in this session — no agent is
  spawned.** The three passes still happen and the contract is the same; what disappears is three
  cold starts and three hand-back summaries. **Litmus**
  every line; tag each scenario (one verification — `@executable`/`@manual`/`@uat` — +
  layer/refinement/domain from `work.tags`); defect-origin → `@bug` + `@finding-<id>`. List the tasks
  in `STORY.md` `## Tasks`.

  **Gate check (before authoring):** resolve each entry in the story's `depends:` (`aof work find <dep>
  --json`). If any is a **`uat`** session that is **not `done`**, surface it loudly: this story
  implements that gate's findings, so the gate stays **open** until these amendments are built *and*
  its findings verified — it is closed later with `aof:verify <uat-ref>`, **never** by hand-ticking it
  done. This is expected (you refine amendments while the gate is open); the flag exists so the loop
  isn't forgotten. Tag each amendment scenario with the originating finding's `@finding-<id>` so the
  fix traces back to the UAT finding it closes.

  **Finish the story contract, not only its tasks.** Before handing back, author `reads:` and `files:`
  in `STORY.md` using the same rules as milestone breakdown. `reads:` may be empty only when the task
  criteria and files being changed are genuinely sufficient; its presence is mandatory. `files:` may
  be empty only for a documentation/verification-only story that writes no project file.

  **The build brief — ONLY when the project has turned it on.** Read `work.plan.enabled` from
  `.aof/aof.config.json`. It defaults to **false**, and when it is absent or false you author **no
  plan document at all** — its absence is the normal state and nothing reports it. When it is true,
  write one `PLAN.md` in the story's own folder, from what you already read while drawing this
  story's boundary:

  - It carries **the mechanism** (the seam the change hangs off, in a few sentences) and **the
    verification step** (the end-to-end check that proves the story works) — the two things the
    frontmatter cannot express — plus what is deliberately out of scope.
  - **It restates no declared path.** The read and write sets have ONE home and it is the
    frontmatter you just authored; a table, a path list, or an enumeration in prose here is the
    second copy, and the third is whichever agent transcribes it. A single inline mention of the
    module a seam lives on is fine; an inventory is not.
  - **One page.** Aim at ~60 lines; the doc-budget lane warns past 80. Overflow is a sizing signal,
    not a budget to raise — a story you cannot brief in a page is a story that should be split.
  - **It is the BUILDER'S, and advisory.** No reviewer reads it, and a deviation from it is not a
    finding. Do not make it binding, and do not restate the contract in it: the task `.feature`
    scenarios are the contract.

**`--autonomous` — cascade, review once at the end.** Drive the item to *fully refined* without pausing
at each intermediate gate (the framework's balance is review-stops vs. autonomous runs — refining
story-by-story is needless friction once the breakdown is trusted):

- **milestone** → run Decide + Break-down, then immediately author **every** resulting story's Contract,
  fanning out the Three Amigos in parallel (the stories are independent by construction). Take
  **documented default decisions** for non-critical open questions (record them in `STATE.md`); **stop
  early only** for a genuine blocking unknown or an unsafe/irreversible decision — a real gate, never
  routine breakdown or contract authoring. When `work.examples.enabled` is on, a business-rule
  question from a story's example map never takes a default. The cascade runs the discovery beat for
  every story, and authors a story's Contract only when its map has no open business question. Every
  open business question from every story is asked at the single end review, through
  `AskUserQuestion`, as a question and never as a default, each carrying its map token (an
  interactive cascade asks in batches of four; in a session whose environment carries
  `AOF_RUN_ID`, each call carries one question, and each such question is its own ask and its own
  wait, one after another). An answered question is written into its story's map, and the contracts the answers
  unblock are authored inside that same stop, each once its story passes the beat's doctor stop. A
  question the person does not answer — deferred by the person, or refused by the harness — leaves
  its story at the Contract gate with no `tasks/` written; the other stories go on.
- **story** → author its full Contract (already a single stage).
- **spike / chore** → the refuse/redirect above applies unchanged; `--autonomous` has nothing to
  cascade (no sub-stage exists for either type).

<amendment_ratification>
**The Decide stage CLOSES before the Contract fan-out begins.** The ADR set is finished there — every
delta the architecture pass raised folded in, in that stage — and only then does contract authoring
fan out. **No step re-applies an architecture delta to a contract after the fan-out**, and each
contract has exactly ONE authoring beat named: the beat that authors it.

The measured cost of getting this wrong: in milestone 52, **thirteen agent runs existed only to
re-apply ADR deltas to contracts that had already been authored** — 38% of agent-active time and
661.6k output tokens, 41.8% of the whole milestone, against five authoring runs and one build run
at 7%.

**An amendment ratifies in the beat that raised it**, so where a delta lands is decided by WHEN it was
raised:

- **During the architecture pass** → in the ADR set, before the fan-out. No contract is re-opened,
  because none has been authored yet.
- **While a contract is being authored** → in that contract, in the same authoring beat. No contract
  is re-opened.
- **While the fan-out is still in flight** → as a finding, routed by the triage rule at the review
  close. The contracts already authored are not re-opened.
- **After the contracts are authored** → as a finding, routed by the triage rule. No contract is
  re-opened.
- **After the item is delivered** → in the ACCEPTING item's own contract, as a new superseding ADR.
  The delivered `.feature` is not edited, not annotated and not tagged — delivered acceptance
  criteria are immutable.

**The one delta that still earns its round** is the one that would leave a delivered criterion wrong.
That is a `locked-contract-violation`, and therefore already a **Blocker**, handled inside the round
bound the review lane already carries. It licenses fixing that criterion — never a re-authoring wave
over the other contracts.

**A re-authoring wave is not a legal response to a delta.** No stage here spawns an authoring agent
whose only work is re-applying a decision to an already-authored contract.
</amendment_ratification>

Produce the whole tree, then hand back **one** consolidated review (the breakdown + all contracts).
Still **doc-producing only**: stop before any build.
</process>

<progress_tracking>
- Created stories start `status: not-started` and are listed (unchecked) in the milestone
  `SPEC.md` `## Stories`.
- Created tasks are unchecked boxes in `STORY.md` `## Tasks`.
- The refined item reaches `in-progress` through the run this phase minted at its top — the
  `run.started` reactor makes that move, so **write no starting status move here** and never
  hand-edit a `status:` line. The phase door (`STARTING_PHASES`, `packages/work/src/commands/continue.mjs`) has
  usually made it already; both are bounded to the same starting edge, so a repeat is reported as not
  applicable and changes nothing. `aof work status <ref>` with no target reports the legal moves, and
  any other refusal still fails and still means stop and look.
- Close the run at the phase's close — `aof work run-complete <ref> --outcome done`. A phase that
  returns without completing its run turns the `duplicate-run` guard from a backstop into a wall for
  the next phase on that item. **Under a driving shell** (the session carries `AOF_RUN_ID`) both the
  mint and the close are answered "driven by the shell … nothing written" — the shell settles the run
  it minted when this session ends. That answer is success; do not retry or settle by hand.
- **spike / chore** — refine touches nothing: no run, no `status` change, no `stories/`, no `tasks/`.
</progress_tracking>

<output>
**Default** — report what was produced + what's still open.
**`--autonomous`** — present the full refined tree (the milestone breakdown + every story's authored
contract) as a single review surface, calling out any default decisions taken and anything still open.
When `work.examples.enabled` is on, it lists the business questions asked and their answers apart from
the default decisions taken, and names each story a deferred question left at the Contract gate.
**spike / chore** — report the decline (nothing to break down/contract) and point at `aof:verify <ref>`
as the type's own close path; produce nothing on disk.
Either way — Next: `aof:continue <ref>`. If a story feeds a `uat` gate, restate that the gate is
**still open** and is closed only by `aof:verify <uat-ref>` once these amendments verify — so it isn't
left dangling.
</output>
