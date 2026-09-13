# 102 · The declaration names its loop — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the main-session govern command that accepted the
  item (ADR-004, reconciled at 85). States product STATE, never motive — the reasoning lives in
  RETROSPECTIVE.md. This is an ADDITIONAL artifact: it carries no identity frontmatter and is never
  this item's record doc, which stays STORY.md.
-->

## Delivered

### The loop declaration envelope carries a registry id
`buildLoopDeclaration` returns eight keys — `loopRunId`, `scope`, `level`, `cap`, `phase`, `cycle`,
`startedAt`, `id` — with the original seven unmoved in their original order and `id` appended last,
and it refuses to build an envelope at all when `id` is absent, empty or not a string.

### The refusal vocabulary has a sixth member
`LOOP_REFUSALS` reads `loop-scope-unsupported, loop-level-locked, loop-level-gate, loop-level-unknown,
loop-bound-unresolved, loop-id-missing` — the five prior codes in their prior order, the new one sixth
and last, and the earlier guards still decide first.

### The loop shell declares the one loop it is
`src/commands/loop.mjs` exports `SHELL_LOOP_ID`, the constant `loop:autonomous-cascade`, and hands it
to every declaration it mints — the same id across every phase, cycle and resume of an engagement, and
never derived from the invocation.

### The shell reads no registry at run time
A tree with no `.aof/loops/` directory runs the loop shell unchanged; an id the registry does not
declare is reported by 78's projection as `ran-undeclared` and is never refused mid-run.

### The shell's id is pinned to the shipped registry by a check, not by a second literal
`test/arch/acd-shell-loop-id-is-declared.test.mjs` fails when the record declaring `SHELL_LOOP_ID` in
`src/bundle/loops/` is re-pointed, naming both the id the shell mints and the ids the registry
declares; it takes the shipped records through `test/support/registry-fixture.mjs`, the one helper
that copies them.

### A run minted before this change still resumes
The resume reader recovers exactly five keys from a stored declaration, so a seven-key run record
written before the eighth key existed resumes unchanged.

### 78's projection joins for real, end to end
`test/loop-declaration-join.test.mjs` drives the real four in series — producer → the run store's mint
verb → `readRuns` → `projectExecution` — with no `brief.loop` literal hand-written anywhere: a
carrying run reports ratio 1 and takes its loop off `declared-never-ran`, an undeclared id reports
`ran-undeclared`, an empty-brief run is counted rather than dropped, and the store's frozen sixteen
keys are unmoved.

## Assumptions

- **One shell, one loop** — `SHELL_LOOP_ID` is a constant rather than a lookup, which holds only while
  the loop shell actuates exactly one registry loop; a second shell loop needs an input, not a second
  constant.
- **The registry ships with the framework** — the drift check is over `src/bundle/loops/`, the copy
  aof controls, and deliberately says nothing about `.aof/loops/` in a consumer tree.

## Gaps

### The phase-command path mints no declaration
- **Status:** open
- **Discharge condition:** the runs `aof:refine`, `aof:continue` and `aof:verify` mint carry a
  `brief.loop`, which needs a decision about which registry loop each phase command actuates and a way
  to group phases into an engagement with no shell to mint the `loopRunId`.

`loop-record` reports on the loop shell alone. `work:run-start` already accepts a `brief`, so the seam
exists and nothing else does. Measured at refine: 64 run records under `wiki/work`, 0 carrying any
`brief.loop`.

### 78's `brief.loop.id` gap is half discharged, and stays open
- **Status:** open
- **Discharge condition:** unchanged from `m78/OUTCOME.md` — a registry-resolvable loop id in the
  declaration envelope **and** at least one run record on disk carrying it. The first half is
  delivered here; the second is met when the loop shell is driven over this repository, or when the
  phase-command path above lands.

Over this repository `aof work loop-record` still answers `runsFound: 2, runsCarryingDeclaration: 0,
ratio: 0`, with `loop:autonomous-cascade` under `declared-never-ran`. See **F-102-D**.

### The second instrument is still dark
- **Status:** open
- **Discharge condition:** agent sessions join to run records — a different key (`sessionId`, the
  96/00 ladder) than the one this story delivers.

`aof work observe 102` reports 0 agent runs across 0 sessions with 392 unattributed at this story's
close. The story's own premise names two instruments measuring nothing for one missing key; this
story fixed the loop-record join and not the transcript join.
