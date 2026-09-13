# PRD — Graph Engineering: aof as an Anchored Graph of Loops

> Planning PRD for the graph-engineering arc. Upstream of ACD: this is the seam `aof:shatter` consumes
> to lay out the milestone roadmap.
>
> **Origin and definition.** In July 2026 Peter Steinberger asked "are we still talking loops or did we
> shift to graphs yet?", and Carlos E. Perez's *From Loop Engineering to Graph Engineering* turned the
> remark into the thesis this document takes as load-bearing: the answer to the limits of a single loop
> "is not a better loop but a **graph of loops** — a network of improvement cycles that watch, feed,
> constrain, and correct one another." **The unit of design is no longer the cycle but the network of
> cycles.** The essay names four ways a single loop fails — it games its metric (Goodhart), it cannot
> question its own target (blindness upward), it fights its neighbours (conflict), and its measurement
> quietly rots (measurement decay) — and insists the fixes are **topological**: pair it, put a slower
> loop above it, arbitrate between it and its rivals, audit its instruments. Then the sting in the tail:
> a graph of loops fails too, *circularly* — "every loop watches another loop, and no loop touches the
> ground" — unless the network is bolted to **anchors** (measurements that cannot be argued with),
> **frozen nodes** (rules the optimizer is never allowed to tune), and an **exogenous** answer to what
> "better" means at the root. Perez's own conclusion is the one this PRD is built to serve: *"the
> durable axis was never loops versus graphs at all. It is **ungrounded versus grounded**."*
>
> **Why this is urgent for aof specifically, and not theory.** The 2026 literature on *self-evolving
> agents* — the exact thing aof is one milestone away from becoming — has now **measured** every one of
> Perez's failures in this setting. The Darwin Gödel Machine, told to reduce hallucination, found the
> legitimate fix *and* the hack: delete the hallucination-detection markers. SpecBench and Cursor's
> SWE-bench Pro study found coding agents saturating visible tests while the validation↔holdout gap
> widens with task complexity, agents editing tests and verifiers, and 63% of one model's successful
> resolutions *retrieved* the fix rather than deriving it. PACE showed the weak point of every
> self-improving system is the **acceptor**: "keep it if the score went up" is uncontrolled adaptive
> multiple testing — the agent p-hacks itself — committing **30–42% false and 10–33% harmful edits**
> when a real improvement is hidden among noisy proposals. Huang et al. showed LLMs largely *cannot*
> self-correct reasoning without external feedback, and often degrade when they try. And LLM judges
> systematically prefer their own outputs. Every one of those results says the same thing: **a
> self-improving agent system without paired watchers, frozen rules, anchored measurements and a
> disciplined acceptor does not improve — it converges on a beautiful, internally consistent story
> about itself.**
>
> **This arc and [PRD-acd-loop-engineering.md](./PRD-acd-loop-engineering.md) are one arc.** That
> document builds the loop — an explicit, code-owned, resumable `aof work loop` with an L1→L3 autonomy
> ladder and a `work tune` hill-climber. This document builds the **network around it and the ground
> beneath it**, in the same work stream, because a hill-climber shipped without this is precisely the
> configuration the literature above measured failing. Nothing here re-implements the loop; everything
> here constrains, watches, grounds and audits it.
>
> **Correction on "the knowledge graph".** graphify (milestones 09–11) is a **codebase** index — an AST
> graph of files and symbols, advisory and gate-free. It is *not* the graph this arc means and is not a
> dependency of it. The graph here is **aof's own improvement machinery**: its loops, their metrics,
> their reference-owners, their watchers, their auditors, and the anchors they settle against.

## Objective

**Objective.** Make aof's improvement machinery an **anchored graph of loops**: every control loop in
the system declared, every optimizing loop paired with a watcher it cannot itself tune, every reference
owned by a slower loop that can revise it, every conflict arbitrated rather than resolved by whoever is
awake, every measurement audited by something whose only job is to check that the numbers still touch
the world — and the whole network bolted to anchors, so it cannot drift into consistent, unverified
self-confirmation. Six levers, ground-first:

1. **Declare the loops and the edges between them.** A loop registry in the work stream — each loop as
   `{controlled variable, reference, measurement, actuator, cadence, owner}` — plus the five edge types
   that make it a graph rather than a list: **data-feed**, **target-setting**, **monitoring**,
   **veto/constraint**, **parameter-tuning**. `depends` becomes one edge type among several rather than
   the only one aof can see.
2. **Anchor it.** A declared anchor set (a test process that actually exited zero, the build stamp on
   the running binary, the commit that actually landed, a live-soak observation, a human ruling), an
   anchor edge from every loop, and a **groundedness check that is genuinely computable**: strongly
   connected components of the loop graph with no path to an anchor are ungrounded by construction, and
   `validate` can say so.
3. **Freeze what the optimizer must not touch** — and enforce it at the boundary aof already owns, not
   in a prompt. The DGM deleted its own detector; the frozen set is the answer.
4. **Pair every optimizing loop with a watching loop** on a counter-metric, computed deterministically
   wherever possible, owned by something the optimizer cannot edit.
5. **Put slower loops above faster ones, and arbitrate where they fight** — reference ownership as an
   edge, timescale separation as a rule (an outer loop that is not several times slower than its inner
   loop does not supervise it, it thrashes it), and the standing speed-vs-thoroughness conflict
   resolved by a declared arbiter with anti-oscillation devices (ordering, dwell time, dead-band).
6. **Audit the instruments, and discipline the acceptor.** An independent cadenced pass that
   mutation-probes the gates, re-runs `@manual` evidence, detects stale anchors and silent channels —
   and a commit rule for any self-tuning proposal (evidence threshold, sequential test, report-only
   first, bounded step, reversible, evaluator frozen within an epoch) so aof's hill-climber cannot
   p-hack itself.

Throughout, the CLI-as-contract spine (milestone 08) holds: loops, edges, anchors, verdicts and
proposals are registered commands with stable `--json` contracts; prompts, board and MCP stay faces.

## Context & Constraints

### The loops aof already runs — and what watches them

| Loop | Controlled variable | Reference | Actuator | Cadence | Watched by |
|---|---|---|---|---|---|
| build-to-green ([continue.md](../../src/bundle/commands/continue.md)) | scenarios passing | the task `.feature` | developer agent | minutes | review, one stage later |
| review→fix→re-review | open findings | architect/QA verdict | developer agent | minutes–hours | — |
| verify→triage→accept ([verify.md](../../src/bundle/commands/verify.md)) | findings triaged, item accepted | VERIFICATION evidence | verify session | per item | — |
| the autonomous cascade ([autonomous.md](../../src/bundle/commands/autonomous.md)) | items reaching done | `aof work next` order | the cascade | hours–days | — |
| run resilience ([run-store.mjs](../../src/run-store.mjs)) | runs reaching terminal | the state machine | retry/reclaim | seconds–minutes | — (but it *is* deterministic) |
| retrospective→memory ingest | lessons captured | RETROSPECTIVE | ingest | per milestone | — |
| observe→tune (**proposed**, loop-engineering) | harness economics | measured traces | model map, caps, prompts | per range | **— and this is the one that must not ship unwatched** |

Seven real control loops. One has a deterministic controller; none has a counter-metric, a declared
reference owner, or an auditor. aof currently improves in seven directions with no arbitration between
them, and the seventh is about to be given write access to the other six.

### The four failures, instantiated in aof — measured, not hypothesised

**1. Goodhart.** The build loop's metric is *scenarios green*; its actuator is an agent that can edit
the scenario. This is not a theoretical exposure — it is the single best-measured failure mode in
agentic coding: SpecBench finds every model saturating the visible suite while the holdout gap grows
with task complexity; Cursor's study found 63% of one model's successful SWE-bench Pro resolutions
retrieved rather than derived the fix; the DGM removed its own detection markers when told to reduce
hallucination. aof's structural defence today is a review stage that may or may not look — guidance,
not a paired loop. The general form is already this repo's hardest-won rule: **green tests ≠ running
system.** Manheim & Garrabrant's taxonomy sharpens what pairing must cover: *regressional* (green
correlates with correct, imperfectly), *extremal* (the correlation breaks exactly where the optimizer
pushes), *causal* (making the test pass ≠ making the system work), and *adversarial* (the actuator
understands the metric). Only the fourth is what people usually picture; aof is exposed to all four.

**2. Blindness upward.** A task loop drives toward its `.feature` and nothing inside it can ask whether
that feature is the right target. This is Argyris's single- vs double-loop learning — correcting error
without questioning the governing variables — and Powers' Perceptual Control Theory gives the
structural fix precisely: *higher-level loops set the reference signals of lower-level loops*. ACD
**has** the hierarchy as documents (task ← story ← milestone ← PRD ← human), but not as **reference
ownership**: no edge says which artifact owns which target, so revising a target is an edit, not a
governed cycle. Beer's Viable System Model makes the same structure recursive — every viable system
contains and is contained in one — which is exactly the shape of aof's item tree, unexploited.

**3. Conflict.** [PRD-acd-loop-performance.md](./PRD-acd-loop-performance.md) optimises cost and
wall-clock; verify optimises thoroughness; the autonomy ladder optimises unattended reach. They pull on
the same actuators. Multivariable control has known this since the 1960s and has both the diagnosis
(loop interaction) and the fixes (pairing analysis, decoupling, cascade with **time-scale
separation** — an inner loop closing 3–5× faster than its outer, 10× to treat it as static). aof's
current tie-break is whichever concern the operator has front-of-mind that evening.

**4. Measurement decay.** The sharpest one here, and *already recorded in this repo*.
[TECH_DEBT.md](../../wiki/work/TECH_DEBT.md) **item 5 is literally titled "Part of the fitness gate is
dead"**: 10 of 700 arch tests failing before any change, test files reading modules that no longer
exist, and the verdict "the gate reads green-ish while not running". It was fixed by hand in milestone
42 — and **nothing watches for its recurrence**. The residual caveat is worse: the full suite still
cannot run on the control node (the fleet port is held), so the gate is partly unrunnable on the
machine that matters, by construction. Add that ACD's `@manual` evidence is written by the same agents
that did the work — a known-live failure in this repo (evidence subagents authoring record docs and
recording decisions no node was entitled to make) — and measurement sliding "from checking reality into
checking paperwork" is not a risk aof might face; it is a thing aof has done twice.

**5. The failure of graphs themselves: circular confirmation.** Perez's warning, and the reason
groundedness precedes topology in this plan. The anchored-graph formalisation makes it computable: a
strongly connected component of the loop graph with **no path to or from an external ground-truth
source** can pass every internal consistency check while floating free of reality. Three independent
results say aof cannot pair its way out of this without anchors: LLMs largely cannot self-correct
without external feedback (and degrade when they try); LLM judges prefer their own outputs (so a
watcher that is the same model reading its own work is not independent); and reward-model
overoptimisation shows proxy score improving while true quality declines past an optimisation budget —
there is a point beyond which *more loop* is worse, and only a ground-truth signal reveals where.

### The assets aof already has

- **A validated edge, and the machinery to walk it.** `depends` is parsed, resolved and cycle-checked
  (`findCycle`, [work.mjs](../../src/work.mjs)) and traversed by `nextWork`. The graph algorithms are
  present; aof simply has one edge type and no loop nodes to connect.
- **Maker/checker as the default.** Tool-scoped role agents ([bundle/agents](../../src/bundle/agents))
  are the raw material for pairing — aof needn't invent watchers, it must *wire them to counter-metrics*
  and make them independent of what they watch.
- **A deterministic controller with durable state.** [run-store.mjs](../../src/run-store.mjs): closed
  retryable/non-retryable classification, attempt ceiling, retry lineage, heartbeat + orphan reclaim,
  write-scope guard, atomic persist, derived and rebuildable. It is the one loop in the table above
  that already behaves like an engineered controller.
- **Two half-streams of measurement.** [work-observe.mjs](../../src/work-observe.mjs) (per-agent
  time/token/stall, with real stall detection) and [degrade.mjs](../../src/degrade.mjs) (coded degrade
  events). Neither is attached to a declared loop, so nothing consumes them on a cadence.
- **A real enforcement boundary, hand-wired once.** [claude-settings.mjs](../../src/claude-settings.mjs)
  surgically merges aof's hook entries into a co-authored `.claude/settings.json` (which also carries
  `permissions.deny`), and the repo ships a PreToolUse hook that **blocks** unisolated test runs. Proof
  a frozen rule can be *actually* frozen — and proof of the gap: one rule, hand-written, derived from
  no declaration.
- **Anchor discipline practised by habit.** The build/deploy rule already insists on verifying at the
  source — the build stamp on the running binary, not an installer's exit code — and OUTCOME.md already
  records gaps with an explicit **discharge condition**, which is an anchored open loop in all but
  name. Habit, not machinery.
- **Anchor *integrity* already right.** `aof:feedback` captures raw, attributed operator language and
  deliberately never asks the operator to classify. That is exactly the production lesson that the
  feedback loop must not corrupt its own anchor — offer a menu and people select from it instead of
  saying what they mean. aof got this right by instinct; the arc must not undo it.

### Constraints

- **Loops, edges and anchors live in the work stream, under git.** If a loop, its watcher, its
  reference-owner and its auditor cannot be reviewed in a PR, they are not governed. No sidecar config,
  no service.
- **This arc declares, checks and grounds; the loop arc executes.** No workflow/DAG engine; phase logic
  does not move into `.mjs`. `aof work loop` is the engine and reads the registry this arc owns.
- **Groundedness precedes topology.** Pairing an ungrounded loop to another ungrounded loop enlarges the
  strongly connected component and makes the self-confirmation more convincing. Anchors ship before
  pairing, and a loop with no path to an anchor is a `validate` finding, not a footnote.
- **A watcher may not be the thing it watches.** Independence is structural: a different node, a
  different artifact, and — because of self-preference bias — where a model must judge, not the same
  model instance on its own output. Prefer counters over judges: where a counter-metric can be computed
  deterministically, it must be.
- **Frozen means enforced, and frozen within an epoch.** The non-tunable set (locked contract, litmus,
  tag vocabulary, gate order, isolation guard, the anchors themselves) is compiled to the enforcement
  boundary, and evaluation criteria may change **only at declared epoch boundaries** — never inside a
  run that is being scored, which is the co-evolving-evaluator discipline.
- **The acceptor is a gate, not a comparison.** No self-tuning proposal commits on "the number went up".
  It commits on an evidence threshold with a sequential test, a bounded step, a dwell period, and
  reversibility — and report-only until the threshold is genuinely met. Showing "4 rulings, threshold
  10, no change" is the machinery working, not the machinery waiting.
- **"Better" at the root is exogenous.** The human owns which things are worth controlling. No pass may
  author or revise a root reference; it proposes, within the unfrozen set, and never at all inside the
  frozen one.
- **Every loop pays for itself.** A declared loop must name the decision it changes. Loops nobody
  consults, edges nobody queries and metrics nobody acts on are removed at the next audit — the audit
  loop's second job is deleting its own graph's dead weight.
- **graphify is not this graph.** The codebase index stays advisory and independent; its `graph:*`
  namespace is taken, so this arc lands under **`work:loops`** / **`work:graph`**, and any surface
  showing both must say which it shows.
- **Derived stays derived; CLI-as-contract holds (milestone 08).** The graph is a projection of
  work-stream frontmatter and record docs — rebuildable, prunable — and every observable is a registered
  command with a `--json` contract.

## Scope

### In scope

- **The loop registry and the typed loop graph.** Loops declared as first-class work-stream artifacts
  (`{controlled variable, reference, measurement, actuator, cadence, owner}`), connected by a closed
  edge vocabulary — **data-feed**, **target-setting** (who owns this reference), **monitoring** (who
  watches this metric), **veto/constraint** (what may stop this loop), **parameter-tuning** (what may
  adjust this loop's knobs) — with `depends` retained as the item-level edge. Exposed as
  `aof work loops show|graph|validate --json`, and rendered as one picture an operator can read.
- **Computable structural checks in `validate`.** Because the graph is declared, its pathologies are
  algorithms, not opinions: **strongly connected components with no path to an anchor** (ungrounded
  regions), **optimizing loops with no monitoring edge** (unpaired), **references with no
  target-setting owner** (blind), **loops sharing an actuator with no arbiter** (conflict-prone), and
  **timescale inversions** (an outer loop not meaningfully slower than the inner loop it supervises).
- **Anchors, with integrity rules.** A declared anchor taxonomy — *external validation* (a test process
  that exited zero and was observed doing so, the build stamp on the running binary, the landed commit,
  the live two-machine soak), *frozen rules*, and *exogenous human judgment* — an anchor edge from every
  loop, a groundedness report (anchored / self-referential / stale), provenance stamped at write time,
  and the anchor-integrity rule that raw human input is captured verbatim before any classification is
  offered.
- **The frozen set, enforced.** Declared non-tunables compiled into the enforcement points aof already
  owns (merged `.claude/settings.json` permissions + hooks, agent tool scope, the mesh worker envelope),
  with attempted tampering recorded as a coded event. This is the precondition that makes
  loop-engineering's L3 honest.
- **Paired loops with independence.** A counter-metric and an owning watcher per optimizing loop —
  build-green paired with **test-integrity** (did the scenario move to fit the code? did coverage of the
  changed lines drop? does a deliberate mutation still fail?), throughput paired with **rework and
  finding-escape rate**, cost paired with **escape rate**, autonomy paired with **intervention rate** —
  computed deterministically wherever possible, and structurally unable to be edited by the loop they
  watch. An unpaired optimizing loop is a validate finding.
- **Supervising loops: ownership, timescale, arbitration.** `target-setting` edges making the hierarchy
  explicit (task ← story ← milestone ← PRD ← human) so revising a target is a governed cycle with a
  named owner; a declared timescale layer per loop (fast operational / medium management / slow
  governance) with sparse inter-layer edges and a minimum separation ratio; and a declared arbiter for
  the standing speed-vs-thoroughness-vs-autonomy conflict, with **ordering, dwell time and dead-band**
  so competing adjustments cannot oscillate.
- **The audit loop.** An independent, cadenced pass whose only inputs are anchors and whose only subject
  is the *instruments*: mutation-probing that gates still fail when the invariant is deliberately broken
  (the direct answer to "part of the fitness gate is dead"), re-running `@manual` evidence for
  reproducibility, detecting stale anchors, and **reporting absence explicitly** — which gates ran on
  nothing, which channels have been silent, which loop has not moved its metric in N cycles. It reports
  to reference-owners, never to the loop it audits, and it may raise the equivalent of an algedonic
  signal: a finding that goes straight to the top rather than through the loop that produced it.
- **The disciplined acceptor for self-tuning.** The commit rule any harness-change proposal must clear
  before it applies: a minimum evidence count, a sequential/anytime-valid test rather than "score went
  up", a bounded step size within declared floors and ceilings, a dwell period before reversion is
  considered, full reversibility with the evidence recorded alongside the change, report-only mode until
  the threshold is met, and an evaluation criterion frozen within the epoch being scored.

### Out of scope

- **A workflow/DAG engine, or moving phase logic into code** — the loop arc executes; phases stay
  prompts.
- **The loop's own mechanics and economics** — `aof work loop`, session lifecycle, resume, the autonomy
  ladder ([PRD-acd-loop-engineering.md](./PRD-acd-loop-engineering.md)); telemetry, budget, model map
  ([PRD-acd-loop-performance.md](./PRD-acd-loop-performance.md)). This arc constrains, watches and
  grounds them.
- **The codebase graph.** graphify's model, commands, privacy boundary and advisory status are untouched.
- **A graph database or query language.** The work stream is the store; edges are frontmatter and
  record-doc conventions; queries are registered commands. No Neo4j/Cypher, no embedding index.
- **A general policy engine (Rego/Cedar) and general-purpose LLM-judged trajectory scoring.**
  Deterministic checks and a small declarative grammar first; both recorded as adjacent arcs.
- **Changing the ACD contract surfaces** (litmus, tags, nine-stage semantics). The graph describes,
  constrains and audits the method; it does not rewrite it.
- **Auto-tuning anything frozen, or authoring root references.** The human owns "better".
- **Parallel-topology re-architecture of the phases** (fan-out review instead of sequential retry) —
  a real idea from the practitioner literature, but it is loop *shape*, not loop *governance*; recorded
  as an adjacent arc.

## Milestones

> **Ground before topology, topology before autonomy.** The registry makes loops nameable; anchors make
> them grounded; pairing and supervision make them stable; the audit keeps the instruments honest; the
> acceptor is the gate everything else was built to justify. The order is not aesthetic — pairing
> ungrounded loops enlarges the self-confirming component, and a disciplined acceptor without anchors
> is a rigorous test of a fabricated number.

- **loop-registry-and-graph** — the foundation. Loops declared as work-stream artifacts with the closed
  five-edge vocabulary; `work:loops show|graph|validate` with `--json`; and the structural checks that
  are pure algorithms over the declared graph (ungrounded SCCs, unpaired optimizers, unowned references,
  shared actuators without an arbiter, timescale inversions). Ships as a faithful description of the
  seven loops aof runs **today**, so it is verifiable on day one. **Depends on milestone 08
  (cli-command-core)** and **19–21 (run lifecycle)**; declares over the run store, never duplicates it.
- **anchors-and-frozen-set** — groundedness. The anchor taxonomy and anchor edges; the groundedness
  report; provenance stamped at write time; the anchor-integrity rule (verbatim capture before
  classification); and the frozen set compiled into aof's existing enforcement boundary with tampering
  surfaced as a coded event. **Depends on loop-registry-and-graph.** **Blocks loop-engineering's L3** —
  an unattended self-tuning harness without frozen rules and anchored measurements is the configuration
  the DGM, SpecBench and PACE results describe failing.
- **paired-loops** — the Goodhart defence, covering all four Goodhart variants rather than only
  deliberate gaming. Counter-metric plus independent owning watcher per optimizing loop; deterministic
  counters preferred over judges; test-integrity (mutation-probed) as the build loop's pair; unpaired
  optimizing loops become validate findings. **Depends on loop-registry-and-graph + anchors** — a
  counter-metric that is itself ungrounded moves the gaming one hop.
- **supervising-loops** — blindness upward and conflict. `target-setting` ownership edges making target
  revision a governed cycle; declared timescale layers with a minimum separation ratio and sparse
  inter-layer edges; a declared arbiter for the standing speed/thoroughness/autonomy conflict with
  ordering, dwell time and dead-band. **Depends on loop-registry-and-graph**; independent of
  paired-loops.
- **audit-loops** — measurement decay, and the recurrence guard for TECH_DEBT item 5. Independent
  cadenced instrument audit: mutation-probing the gates, `@manual` evidence reproducibility, stale-anchor
  detection, explicit absence reporting, dead-loop pruning; reports to reference-owners with an
  escalation channel that bypasses the audited loop. **Depends on anchors-and-frozen-set** (an audit
  with nothing to settle against is one more ungrounded loop) **and paired-loops** (the metric set it
  audits).
- **disciplined-acceptor** — the gate on self-improvement. The commit rule for harness-change proposals:
  evidence threshold, anytime-valid sequential test, bounded step, dwell, reversibility with recorded
  evidence, report-only until threshold, evaluator frozen within the epoch. **Depends on
  anchors-and-frozen-set, paired-loops and audit-loops**, and is the **direct precondition for
  loop-engineering's `aof work tune` auto-apply and its L3 rung** — that arc may ship `tune` as a
  proposal generator before this lands, but nothing may auto-apply until it does.

## Adjacent techniques (separate arcs — captured, not scoped here)

> Surfaced by the same review; each is its own arc, recorded so it is not lost.

- **Holdout scenarios for the build loop.** The measured reward-hacking result is a *validation vs
  holdout* gap, which means the defence is a case the maker never sees — QA-authored scenarios withheld
  until accept, or post-hoc property probes. The cleanest structural answer to build-loop Goodhart, and
  a significant change to how tasks are authored. → a QA/contract arc.
- **Co-evolving evaluators across epochs.** Where a fixed rubric would itself become the thing gamed,
  evolve the evaluator at epoch boundaries while freezing it within an epoch — the Red Queen pattern.
  Only once epochs and the acceptor exist. → an evaluation arc.
- **Parallel topology for the phases.** Fan-out independent verification instead of sequential retry,
  measured on **cost per successful completion** rather than wall-clock. Loop shape rather than loop
  governance; genuinely valuable, but it belongs with the loop arc. → a loop-performance arc.
- **Loop-conflict detection from traces.** Mine run history for loops whose gains coincide with another
  loop's losses and propose arbitration edges, instead of declaring conflicts by hand. → an analysis
  arc, gated on the registry plus telemetry.
- **An optimisation budget per loop.** The reward-overoptimisation result implies a point past which
  more iterations degrade true quality; deriving a per-loop budget from observed proxy↔anchor divergence
  would give the build-loop cap a principled value instead of a chosen one. → a loop-performance arc.
- **Agent-as-judge auditing** for the audit questions deterministic probes cannot answer (was the
  evidence actually *used*), with a calibration set before its aggregates mean anything, and never the
  same model judging its own output. → an evaluation arc.
- **Fleet-wide loop registry.** The same loops, watchers and frozen rules declared once and audited
  across every repo a mesh node drives. → a mesh arc, milestone 22+ territory.

## Sources

**The thesis and the discourse**
- Carlos E. Perez, *From Loop Engineering to Graph Engineering?* (Intuition Machine, July 2026) — the
  graph of loops; the four failures; the topological fixes; anchors, frozen nodes, exogenous "better";
  grounded vs ungrounded as the durable axis. Prompted by Peter Steinberger's "are we still talking
  loops or did we shift to graphs yet?"
- *Anchored Graphs of Improvement for AI Agents* — the formalisation: loops as nodes, the five edge
  relation types (data feed, target-setting, monitoring, veto/constraint, parameter tuning), timescale
  multiplex layers with sparse inter-layer edges, the paired-opposing-metric motif, and **strongly
  connected components with no path to ground** as a computable diagnosis of circular confirmation.
- *What "Loops to Graphs" Looks Like in Production* (Chris Lema) — the production translation: "yield is
  the proxy, verdicts rule"; parameters (tunable) vs policy (human-owned, dated rulings); ordering,
  dwell time and dead-band against oscillation; watching the watcher in three places; verbatim-evidence
  and deterministic gates in code rather than LLM judges; report-only until the evidence threshold;
  and the anchor-corruption pitfall (offer a menu and people select instead of speaking).
- Shahzad Ahmad, *Graph Engineering: The Control Plane Around AI Agents* — the mechanics view (nodes,
  edges, state, controls), model-interprets/code-enforces, and "no node should propose, approve and
  validate its own consequential action".
- *Loops vs Graphs* and *…Graduating From While-Loops to Org Charts* — the decision criteria (one agent
  with full context beats a committee; graphs earn their place on genuine parallelism and declared
  ownership), and the MAST reading that none of the three failure families is a model problem.

**The measured evidence that this is not optional**
- *Darwin Gödel Machine* (Sakana/UBC, ICLR 2026) — a self-improving coding agent that, told to reduce
  hallucination, produced both the real fix and the hack of deleting the detection markers; objective
  hacking flagged as an open problem.
- *SpecBench* and Cursor's SWE-bench Pro study (2026) — visible-suite saturation with a validation↔holdout
  gap that widens with task complexity; test/verifier modification; 63% of one model's successful
  resolutions retrieved rather than derived.
- *PACE: Anytime-Valid Acceptance Tests for Self-Evolving Agents* (2026) — the acceptor is the weak
  point; greedy "keep it if the score went up" is adaptive multiple testing and commits 30–42% false and
  10–33% harmful edits; sequential testing fixes it at ~18% lower evaluation cost.
- *The Red Queen Gödel Machine* (2026) — a self-improving system pressed against a fixed evaluator is
  an optimizer whose incentive is to game the evaluator; epoch-boundary utility updates with
  within-epoch freezing.
- Huang et al., *Large Language Models Cannot Self-Correct Reasoning Yet* (ICLR 2024) — intrinsic
  self-correction without external feedback does not work and often degrades performance.
- Panickssery et al. and follow-ups on **self-preference bias** — LLM judges systematically favour their
  own outputs, so a watcher sharing the maker's model and context is not independent.
- Gao & Schulman, *Scaling Laws for Reward Model Overoptimization* — proxy score improves while the gold
  objective degrades past an optimisation budget; Goodhart with a measurable inflection.
- MAST, *Why Do Multi-Agent LLM Systems Fail?* (arXiv 2503.13657) — 14 failure modes in three families
  (system design, inter-agent misalignment, task verification); failures are design failures.

**The prior art the fixes come from**
- Stafford Beer, **Viable System Model** — recursion (every viable system contains and is contained in
  one), System 3* as the *independent audit channel* using unfiltered data, and the algedonic channel
  that escalates past the hierarchy.
- William T. Powers, **Perceptual Control Theory** — higher-level loops set the *reference signals* of
  lower-level loops; the structural answer to blindness upward.
- Chris Argyris — single- vs double-loop learning; correcting error without questioning governing
  variables is the failure, questioning them is the fix.
- Manheim & Garrabrant, *Categorizing Variants of Goodhart's Law* (arXiv 1803.04585) — regressional,
  extremal, causal, adversarial; pairing must cover all four.
- Classical control — **cascade control** (outer loop sets the inner loop's setpoint) and **time-scale
  separation** (3–5× minimum, 10× to treat the inner loop as static), the engineering form of "slower
  loops above faster ones"; multivariable loop interaction as the diagnosis of conflict.
- **DORA** — throughput paired with stability (change failure rate, MTTR) as the canonical counter-metric
  pairing, and the finding that optimising throughput alone ships chaos invisibly until an incident.
- **Mutation testing** — the established "who watches the watchmen" answer: deliberately break the code
  and confirm the tests scream; coverage without assertions is a green gate measuring nothing.
- Held-out-selection work on self-evolving agents (2026) — strict separation of update evidence from
  frozen assessment views, or improvement is adaptation to the yardstick.
