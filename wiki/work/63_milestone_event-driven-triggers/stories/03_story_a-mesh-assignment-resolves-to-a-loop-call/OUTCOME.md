# 03 · A mesh assignment resolves to a loop call — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The autonomous phase dispatches a loop launch, not a slash command
An assignment on the `autonomous` phase resolves to a launch of kind `loop` carrying the assigned scope and nothing else. Exactly one of the four dispatchable phases resolves to a non-session launch, driven from `ASSIGNMENT_PHASES` rather than a literal list, so a fifth phase cannot be added silently.

### The other three phases are byte-unchanged
`refine`, `continue` and `verify` produce the exact directive strings a delivered tree produced before this story, including `refine --autonomous`, and exactly one module in `src/` authors an assignment phase's slash command.

### The launch rides the directive additively
The launch travels on the directive beside `baseBranch` and `commit`; the assignment record's key count is unchanged at the frozen ten, and the worker reads the launch in exactly one place.

### A story-shaped ref is refused before a directive is sent
The resolver refuses a story-shaped ref on the `autonomous` phase with a code, and the dispatch tick over such a row sends nothing — while the same ref on `continue` and `verify` resolves exactly as before.

### No topology, PTY or NEEDS_INPUT machinery moved
Leasing, reclaim, presence, routing, PTY spawn, output chunking, completion detection and the NEEDS_INPUT sentinel behave as they do at HEAD; `src/agent-session-driver.mjs` holds none of this story's identifiers.

### An old worker handed a loop directive idles rather than doing the wrong work
Observed live on a genuinely skewed pair: a worker built before this story receives the directive, finds no command it understands, and spawns its session with **nothing typed into it** — no cascade fallback, no loop argv as text — holds the assignment rather than dropping it, writes no commit to its worktree, and settles on the deadline policy it already had.

## Assumptions

- **The dispatch argv carries no level** — `resolveLoopLevel`'s default applies at the worker, which is **L2**, a level that DRIVES. Nothing in the dispatch path names a level, so no carrier exists that 55/FF-5508 could be breached through, but an operator dispatching `autonomous` is dispatching a driving loop.
- **A skewed pair is a deploy state, not a designed mode** — the idle-session behaviour is a bounded, observable symptom of an operator-visible deploy skew, never a supported configuration.

## Gaps

### The skewed-pair lane is observed only in one direction
- **Status:** open
- **Discharge condition:** a mesh workspace where the worker is enrolled with a local clone AND the configured credential provider can mint for that repo, at which point the two remaining vintage/phase rows can be dispatched and watched to settlement.
`tasks/03`'s Scenario Outline has four rows. Two are observed and passing — *new control with an old worker* on the `autonomous` phase (every clause, including settlement on the pre-existing deadline) and on a session phase (the typed command, verbatim). Two are not: *old control with a new worker*, and *the matched pair*. Both need the upgraded worker, whose gate-time push requires a credential this environment cannot currently mint for any workspace the worker is enrolled in (`VERIFICATION.md` F-63-P, F-63-Q). The unobserved rows are behaviours of the SESSION path this story left byte-unchanged and of the loop launch its `@executable` lanes already cover; what is missing is the live cross-machine observation, not a claim about the code.
