# 72 · The inner loop — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The inner loop's tools are declared by the project and launched by aof, and aof imports nothing of the project's
One boundary holds across all five stories: the test runner and the worktree prepare step are `work.test` and `work.worktree.prepare` declarations compiled by one module (`m72/00`), every child process this milestone starts comes from `runBounded` with a declared deadline, and no test module enters the aof process on any path (`m72/02`, FF-7204). The framework works in any repository that declares its toolchain and refuses, by coded message, in one that does not.

### Selective testing is a command, not a per-agent chore
`aof test --scope impacted|file|all` replaces the throwaway array-importing script: the selection (`m72/01`) reads the code graph and widens on every unknown, the face (`m72/02`) prints failures only from both streams, and this repository's own runner accepts `--only` through its one execution loop. The result is a report that no transition door consumes.

### A hook costs a hook's worth of boot
`aof session ping`, fired on every prompt, loads a 25-module closure instead of the 277-module command registry, and fires once per event rather than twice (`m72/03`).

### A worktree arrives prepared, and nothing is ever linked into one
Dependencies reach a worktree by the declared install at every materialisation door, a failed install removes the tree it half-filled before it throws, and FF-7207 ratchets the TECH_DEBT-36 hazard shut over all three worktree roots (`m72/04`).

### Two of the six SPEC levers are declined, not missing
The pre-apply edit gate and the blocking write-thrash guard were declined on evidence (`ARCHITECTURE.md#ADR-006`, TECH_DEBT item 87), and the SPEC's `PreToolUse` output-rewriting hook was replaced by the command's own output contract (ADR-003). No hook of any kind ships from this milestone.

## Assumptions

- **The denominator is model generation, not tool wait** — 84.1% of agent-active time is generation against 15.9% all-tool wait, so ~5 s of runner import traded for one fewer model turn is the trade this milestone made (ADR-004 §6); the 3.4–6.5 s fixed cost of `--only` on this repository's runner is real and is TECH_DEBT item 86's.
- **The graph is read, never built** — `--scope impacted` on a fresh clone with no `graphify-out/graph.json` runs the whole suite and says why; a build is minutes even when nothing changed.
- **This repository's own `work.worktree.prepare` is undeclared** — the prepare lever is unexercised on this node until chore `m90` lands (`m72/04` Gaps, `m72/F-72-AI`).

## Gaps

### The registration report for a selected-but-unregistered suite
- **Status:** open
- **Discharge condition:** a provenance producer that does not import test modules into the aof process (`m72/02` Gaps, `m72/F-72-AO`).
`aof test` does not yet say when a suite it ran is one CI would never run; the decider exists (`m72/01`) and has no honest input.

### The whole suite still cannot run whole on the control node
- **Status:** open
- **Discharge condition:** TECH_DEBT item 86 — a restructured or parallelised runner, or a suite that no longer binds the live daemon's port.
`aof test --scope all` on this machine still collides with the live `:4182` daemon through `test/global-work-propagation.test.mjs`, so a widened `impacted` here is a run this node cannot complete; the milestone gate's sweep was the registered array minus that one suite.
