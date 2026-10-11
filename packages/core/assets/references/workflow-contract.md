# Shared workflow contract

Resolve the exact requested ref through `aof work find`; never widen a story span to its parent.
CLI envelopes own identity, dependencies, wave membership, dispatch bounds and status. Refusals,
non-zero work exits and propagation warnings remain visible stops. Use `aof work status` as the
single status writer. A driving shell owns its attributed run; never settle that run by hand.
Mint locally owned runs before implementation and complete them at the phase's actual close.

Read declared files in full, anchored documents only at their named sections and siblings only
at frontmatter depth. Repair a genuinely required missing declaration before editing its owner.
`.aof` is authored state; rendered assistant folders are generated. Preserve operator files,
existing changes and recorded ownership. Never force-adopt a collision, reset/stash another
actor's changes, write credentials or grant trust as part of workflow installation.

Tasks and ADRs are the locked contract. Delivered features are immutable; an amendment lands
in the accepting item's own contract or a superseding ADR. The main governing session owns
record prose, acceptance, outcomes and finding ids. Developers/reviewers return evidence and
unnumbered findings. No continue/review close creates a work item or accepts a milestone.

Build through `aof test --scope impacted --story <ref>`; report its actual resolved scope and
widening, never substitute hand-picked files. Syntax/lint and declared fitness controls must
also pass. Walk `aof work validate <ref>` then `aof work doctor <ref>` before review, and again
after confirmed fixes. Stop on a red rung before paying for reviewers. A story green is not a
milestone regression gate. Acceptance distinguishes executable evidence, agent-run manual
checks and genuine human UAT; absent evidence stays absent.

Native role work belongs to the primary assistant. Optional cross-assistant delegation requires
both a separate request and `work.agents.delegation: on`; the toggle never chooses the primary.
Solo means every required lens inline with no subagent or dispatch. An inline self-review is
never labelled independent. In orchestrated mode, preflight an available native role launcher,
independent context and the actual selected model/effort support before claiming independence.
Use runtime-scoped role settings under `work.agents.runtimes.<runtime>.models` / `.effort`,
validated against the native catalog; never translate assistant family aliases. If a tool cannot
pass an explicitly chosen setting, return an unsupported-setting refusal. Lack of a role launcher
is a missing-capability stop, not a silently successful orchestrated review. The host integration
seam is `createWorkflowRoleLauncher` in `packages/core/src/work/orchestrator.mjs`: its providers
supply the actual native operation and capabilities, and the caller lends the CLI dispatch bound.
This seam does not prove any client exposes that operation.

Concurrency comes from `aof work dispatch --list --json` and the exact write-disjoint `wave`.
One member or solo runs inline. Review defaults to one round, with at most three: only reproduced,
deduplicated Blockers earn a delta rereview. Re-review only the owning lens's fix and cited clauses;
unchanged Blocker counts stop. Build stops after two consecutive no-progress rounds unless the
existing configured resolver selects another bounded value. Resolve these policies from
`packages/contracts/src/loop-bounds.mjs`, never invent another setting. Route surviving Important
findings once at close: contract amendment, cheap confirmed fix, or `story (operator)` shape;
record Nits. No new item or finding id is allocated by continue/review.

Recall uses `aof work memory recall "<domain / keywords>" --kind near-miss --block` before build,
and unfiltered domain recall before framing. An empty block is harmless, including memory off.
After authoring lessons, `aof work memory ingest` indexes the existing records without inventing
another vocabulary. Lessons use Kind mistake / blocker / near-miss / misunderstanding,
Area code / architecture / contract / security / process, Stage refine / build / verify, and Owner.
Keep stable lesson ids; never renumber old entries.
