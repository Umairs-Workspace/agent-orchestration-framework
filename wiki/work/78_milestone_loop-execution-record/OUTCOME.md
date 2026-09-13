# 78 · The loop execution record — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. This is an ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — `SPEC.md` stays that.

  A milestone's outcome is AUTHORED, not concatenated from its stories'. Where a story states a
  capability whole, it is CITED here rather than restated: `aof work memory ingest` unions every
  item's records into one recall surface, so a restatement writes one fact twice.
-->

## Delivered

### aof can now show the loops that RAN, per work item, as a committed document

Before this milestone aof could render its loop registry — the same nine framework-wide nodes in every
repository, to stdout only — and could not answer "what ran for item 54". It can now: one registered
command produces a per-item execution record, and `--write` commits it beside the work. This is the
additive face 52 pre-authorised (`52/ARCHITECTURE.md:869-870`) and it changed no byte of 52's frozen
renderer.

### Execution is legible against DECLARATION, not merely reported

The record states observed facts against what the registry declared: cycles against the declared
ceiling, phases entered, attempts, terminal outcome and stop reason. `SPEC.md` opened on the complaint
that *"a `ceiling: uncapped` loop and a capped one must not produce identical records; today they do."*
They no longer do — the four ceiling states are distinguishable in the model (`m78/00/`) and, because
that is the property that regresses silently, in the rendered BYTES (FF-7806).

### Absence is delivered as a finding rather than as an empty page

The record names three classes of gap — a loop that ran and is not declared, a declared loop that never
ran, an authority that cannot be resolved — under their own headings, and emits no heading and no
"None" placeholder for a class with no gaps. Measured on this repository at the accept gate: zero
coverage, zero engagements, and all seven registry loops reported under `declared-never-ran`. The
milestone's central claim is therefore demonstrated in the one condition that matters — the condition
where there is nothing to show.

### A machine-readable place for a human to say the execution was acceptable

The arc 52–63 had no machine-readable sign-off of any kind; `@uat` tags and prose in `## Accept
decision` were the whole vocabulary. There is now a frozen block (`m78/03/`) with a shape a check can
read, and a signature in it survives regeneration verbatim (`m78/02/`) — which is what makes the
document safe to regenerate and therefore worth committing.

### The whole thing is a face, with the writer as its only door to disk

Every execution fact reaching a consumer is computed from the run records; nothing recovers one from
the document. The record can be tampered with and the command's answer does not move by one field.
Regeneration is byte-identical on unchanged inputs across processes and working directories, so a diff
in a pull request means an input changed. Cited whole at `m78/02/` and `m78/00/`.

### The milestone stayed outside the registry's read-only law without weakening it

A milestone whose deliverable is a WRITER landed inside a domain whose defining law (52/FF-5201) is
that it does not write. The modules take the execution family's name, FF-5201's discovery patterns
match none of them, its expected six-module list is unchanged, and its read-only sweep is re-measured
independently rather than re-run. The law is intact and the writer is provably outside it.

### Ten declared controls, all landed, all red-probed

Every entry in this milestone's `ARCHITECTURE.md` fitness register resolves to a file in the runnable
test tree, is green, and carries a red probe recorded in `VERIFICATION.md` — 24 probes in total, each
applied to the working tree, run in a fresh process, reverted, and the restore confirmed byte-identical
by sha256. One probe did not go red and is recorded as a finding (**F-78-H**) rather than replaced with
one that did.

## Assumptions

- **The loop registry is the authority on what is declared** — the record reports gaps against it, so a registry that is itself dishonest (the day-one registry validates with 0 errors and 40 warnings, 12 of 21 authority slots `prose:` only) makes the `declared-never-ran` class a statement about the registry as much as about the runs. Fixing that is 55's and 57's work, scoped out here.
- **Run records are the authority on what ran** — the record has no other input, so an execution that left no run record is invisible to it and is not reported as a gap.
- **A committed, reviewed, signable document beats a generated report** — the milestone's premise, evidenced by `aof work observe`'s `observability/report.md` existing since milestone 45 and being present on 2 of ~20 items. Nothing in this milestone tests that premise; it will be tested by whether these records get signed.
- **The board deliberately has no face for this** — `SPEC.md`'s original scope item asking for board reachability is withdrawn (ADR-008); the surface is a markdown file the operator already has in their editor, and 52/FF-5202 keeps `ui/` clear of the loop family.

## Gaps

### `brief.loop.id` — the join key that has no producer

- **Status:** open
- **Discharge condition:** `buildLoopDeclaration` (`src/work-loop.mjs:903-923`) mints a
  registry-resolvable loop id into the declaration envelope, and at least one run record on disk carries
  it.

**This is the gap that decides whether the milestone's capability is ever more than latent, and it is
stated here rather than treated as an accept veto because `SPEC.md` puts it out of scope in as many
words** — *"Instrumenting the loops. The join key is `brief.loop` and it belongs to 53. This milestone
reads it; if 53 has not populated it, this milestone renders the absence honestly and says so."* The
declaration 53 mints carries `loopRunId`, `scope`, `level`, `cap`, `phase`, `cycle` and `startedAt` —
and no loop id. `scope` is a work-ref range and `level` is L1/L2/L3; neither resolves to a registry
record. Join coverage is consequently 0 for every item in this repository and stays 0 even once the loop
shell is driven, which is one step worse than "nobody has run it yet". Everything above is built and
green; what it reports about is empty. See **F-78-A**. The producer change is now **story 102**
(`102_story_the-declaration-names-its-loop`), `not-started` and awaiting `aof:refine`.

### The settled stop reason

- **Status:** open
- **Discharge condition:** a run record or a loop declaration carries a loop's own settled stop reason
  as a field the projection can read.

For the `done` terminal outcome there is no field on disk holding a settled stop reason, so that half of
the execution facts is exercised by fixtures alone.

### Nothing obliges anyone to sign, and nothing notices if they never do

- **Status:** open
- **Discharge condition:** a decision is taken — recorded as an ADR — that an unsigned record should
  surface somewhere an operator is obliged to look, or that it deliberately should not.

The record never gates, by design (ADR-007), and the argument for that restraint is strong and
measured: a gate's first act today would be to refuse every accept in the stream over a fact no operator
can supply. But the consequence is that an unsigned record produces one warning among many, forever. The
milestone's own premise — that a committed, reviewed document is a different object from an ignored
report — rests on the pull-request review habit and on nothing enforceable. Cited whole at `m78/03/`.

### Two defects in `aof work doctor` were found by this gate and are not fixed here

- **Status:** open
- **Discharge condition:** chores **103** and **104** are `done`.

**F-78-I** — a top-level parentless story is absent from doctor's driver index, so a `depends:` edge
naming one reports `error: depends-blocked-in-progress` although the dependency is `done`; the same
blind spot makes `numbering-gap` count that story's number as missing. The fix already exists as
`isDependTarget` in `src/work.mjs`, written for this exact pair and adopted by `work:next` and
`validate` — the doctor lane is the third reader that was missed, and the constant is not exported. **F-78-K** — `aof work doctor`
resolves `work.dir` against the process cwd rather than the project root, so from any subdirectory it
scans an empty stream and reports `healthy`, a false green in the exact instrument `aof:verify` step 4
tells the gate to trust. Both are defects in the instrument rather than in this milestone, and neither
belongs to a milestone about loop records. Both are now created and `not-started`: **chore 103**
(the subdirectory false green) and **chore 104** (the coherence lane's missed reader).
