# 00 · The execution projection — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. This is an ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `STORY.md` stays that.
-->

## Delivered

### The execution projection

`src/loop-record.mjs` turns a loaded loop registry model and one work item's run records into the
item's execution facts — engagements, cycles against declared ceilings, phases, attempts, outcomes,
join coverage and gaps — as a pure function over injected values.

### Engagement identity by `loopRunId`

Two engagements of the same loop are two rows: runs are grouped by `brief.loop.loopRunId`, so
separate engagements of one loop are never fused into one.

### Four distinguishable ceiling states

`bounded`, `none`, `unknown` and `uncapped` are separate states carried in the model, and two
engagements identical in every observed fact but differing in ceiling are not equal models —
"terminates by construction", "nobody has said" and "deliberately unbounded" no longer collapse to
one word.

### Join coverage as a stated measurement

Every model carries how many run records were found, how many carried a loop declaration, and the
ratio. A zero-coverage model over 14 undeclared runs is a different object from a model over no runs
at all, so an empty answer is distinguishable from a broken projection.

### Three separately named gap classes

`ran-undeclared`, `declared-never-ran` and `authority-unresolved` are reported under their own names
in a frozen order, no gap appearing in more than one class, and gaps within a class ordered by their
subject's code-unit sort.

### A structurally enforced purity boundary

FF-7801 (`test/arch/acd-loop-record-projection-pure.test.mjs`) holds `src/loop-record.mjs` and every
module it directly imports free of `node:fs`, a clock and a child process, and pins the direct-import
set to `["src/loop-bounds.mjs"]` so a new import re-opens the question.

## Assumptions

- **The registry model is handed in, never loaded** — the projection's purity holds only because
  `loadLoops`' output and the run records both arrive as arguments; a caller that reads them is where
  the filesystem access lives.
- **A `config:` ceiling resolves against injected config** — the numeric bound reported is the one the
  machinery would really enforce (clamped through `src/loop-bounds.mjs`' resolvers), not the number
  written in the config file.
- **`authority-unresolved` covers intra-registry citations only** — `owner` and the edge keys, whose
  resolution is a question about the declared id set the model already holds.

## Gaps

### `brief.loop.id` — the join key with no producer

- **Status:** open
- **Discharge condition:** `buildLoopDeclaration` (`src/work-loop.mjs`) mints a registry-resolvable
  loop id into the declaration envelope, and at least one run record on disk carries it.

The projection joins a run to a loop on `brief.loop.id`. No code path writes that key: the seven-key
declaration milestone 53 mints carries `loopRunId`, `scope`, `level`, `cap`, `phase`, `cycle` and
`startedAt` alone. Join coverage is therefore 0 for every item in this repository, and stays 0 even
once the loop shell is driven. See `78/VERIFICATION.md` **F-78-A**.

### The settled stop reason

- **Status:** open
- **Discharge condition:** a run record or a loop declaration carries the loop's own settled stop
  reason as a field the projection can read.

The model reports a terminal outcome and a stop reason carried through from the last run rather than
re-derived. For the `done` outcome there is no field on disk holding a loop's settled stop reason, so
that half is exercised by fixtures alone.

### The actuator half of `authority-unresolved`

- **Status:** open
- **Discharge condition:** the registry's own grounding lane passes its findings into the projection's
  caller, or `ADR-005`'s wording is narrowed to the intra-registry citations the class actually covers.

`ADR-005` names "an actuator or reference owner the endpoint grammar cannot resolve". `actuator:` and
`reference:` admit `module:`/`command:`/`config:`/`prose:` alone, whose resolution is a question about
a file on disk — which FF-7801 forbids this module from asking. The class as delivered is narrower
than the ADR's wording. See `78/VERIFICATION.md` **F-78-C**.
