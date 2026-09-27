# 62/04 · The tuner's face — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### `aof work tune [scope] [--json]`
A registered core command whose bare face is a read. It composes the four stage-1 leaves into one
report — `headline`, `scope`, `corpus`, `formation`, `proposalEvidenceFloor`, `proposals`, `findings`,
`acceptor` — and `--json` and the human face render from one object.

### A verdict obtained only by invoking the acceptor
The tunable lane's verdict comes from exactly one `invoke("work:acceptor", …)` call site, with the id
resolved from `getCommand` rather than spelled twice. A registry that refuses the id makes the lane
report a construction failure; there is no locally computed fallback, which is the second acceptance
rule this milestone may not carry.

### A read face that writes nothing
Running the command twice over one tree leaves every workspace byte unchanged and accumulates nothing
between runs. The two writes it can reach are outside the workspace and named — `reportDegrade`'s
mesh-log append and `censusSnapshot`'s temp copy inside `work:acceptor` — and the family opens no
journal of its own.

### A two-sided exit code
Every refusal, finding, demotion, below-floor candidate and empty result exits 0, so no findings gate
arrives by the back door; an unreachable `work:acceptor` is reported first in `--json` as
`acceptor-unreachable` and then exits non-zero.

### The registry ring stays open
No module in the family statically imports `src/command-core.mjs` — asserted per module in a fresh
process, the only probe that sees this class — and the applier resolver is injected by the face rather
than obtained by a leaf.

### A lesson's structured config pointer becomes its target
`loopPointersIn` (`src/work-loops.mjs`) lets the corpus join the one unambiguous `config:` pointer in a
lesson section to that lesson, and the section's path citations to its evidence; embedded pointer-like
text inside a URL or a larger token does not promote a target.

## Assumptions

- **`tune` declares no `--strict` and no `--dry-run`** — it is present in `BOARD_DEFERRED` with
  `acceptor`, `audit` and `grade`, and holds no board route.
- **`WORK_IDS` is a hand-kept census** — `work:tune`'s entry in `test/command-core-contract.test.mjs`
  is the one non-derived registration edit, so a future command must be added there by hand.

## Gaps

### No auto-apply
- **Status:** open
- **Discharge condition:** L3 is unlocked and an application path exists that logs to the run store and
  is reversible.
Every proposal is data. Nothing in this milestone applies one, because auto-apply is L3 and L3 is
locked; the L2 diff is rendered for a human, and the only write in the arc stays 61's store.
