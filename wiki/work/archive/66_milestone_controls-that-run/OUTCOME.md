# 66 · Controls That Run — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### Structural contract lint at `validate`

`aof work validate` parses every `.feature` under `<work.dir>` and reports free text in step position
as a structural finding naming the opening line; run today it reports one file and is silent on the
thirteen under `done` items.

### The acceptance horizon

One exported predicate in `src/acceptance-horizon.mjs` decides whether a record is still editable;
every check calls it, it holds the frozen five lifecycle words, and it has zero imports.

### One Gherkin reader

`src/feature-parse.mjs` is the only module under `src/` that recognises a Gherkin keyword; it returns
structural findings beside the scenarios it could recognise, and `src/work.mjs` reaches the grammar
only by import.

### One declaration grammar

`src/declared-id.mjs` is the only home of the id namespace, the register-block set and the
declaration/citation recognisers; memory's two parsers build their headers from it, and the records
they produce are byte-identical across the extraction.

### The controls lane

`aof work doctor` carries a fifth lane of pure `(snapshot, ctx) => Finding[]` groups emitting exactly
eight frozen codes; it performs no process spawn, no dynamic `import()` and no filesystem read outside
the snapshot, and on this repo it reports 20 errors and 17 warns against work that predates it.

### Two-leg control resolution

A declared control resolves when its cited path exists on disk **and** a declared runner names it; an
unlanded control marked `pending` reports at `warn`, and an unmarked one at `error` while its item is
open.

### The accept gate

No item whose `status` is `done` may carry a register declaring a control that does not resolve —
enforced over the real stream, marker or no marker, and green today at 2 registers / 16 declarations.

### The shipped `VERIFICATION.md` schema

ACD ships a `VERIFICATION.md` template carrying four frozen headings, a findings register on seven
frozen columns with the id alone in the first cell, and a fitness register whose `red probe` cell is
byte-equal to the constant the check compares against.

### Seven authoring asks

`src/bundle/` carries the declaration form, the red probe, the runnable path and `pending`, unnumbered
findings, the citation form, the accept precondition, and write-apart — each present in every file
whose reader must obey it, and each guarded by a frozen-token assertion.

## Assumptions

- **A project declares its runners** — leg B of control resolution runs only where
  `config.work.controls.runners` is configured; this repo does not configure it, so leg B reports
  `control-runner-unchecked` and no control here is known to be registered.
- **A runner names a control by basename in its own text** — leg B is a substring read, so an
  imported-but-never-spread suite satisfies it (TECH_DEBT item 50, inherited unchanged).
- **A register's ids are hand-numbered and may carry suffixes** — the declaration grammar admits
  `FF`/`F`/`D` suffixed ids and treats a dotted id as declaring nothing.
- **Memory reads only `ARCHITECTURE.md` and `RETROSPECTIVE.md`** — the union that resolves `ADR`/`R`
  citations is scoped to those two basenames.
- **An item's own status decides its horizon** — a task feature follows its story, a milestone record
  doc follows the milestone, so a `done` story under an open milestone is closed.
- **`aof work doctor` is run** — the accept precondition is a rule the acceptor applies; outside this
  repo's own arch-test nothing refuses a transition, and a standing `pending` marker downgrades the
  finding to `warn`, which does not gate.
- **The bundle is reinstalled after accept** — the asks ship in `src/bundle/`; a project's installed
  copies under `.claude/`, `.codex/` and `.aof/templates/` carry them only after `aof work update` (in
  this repo, `node scripts/install-local.mjs`).

## Gaps

### A fabricated red probe

- **Status:** open
- **Discharge condition:** none by declarative means — discharged only if ACD gains a way to tie a
  recorded probe to an observed run of the shipped assertion.

The `red probe` cell is checked by shape only: a non-empty cell that is not the frozen placeholder
satisfies it, and no code path inspects whether the recorded failure ever happened.

### An assertion that is not a declared control

- **Status:** open
- **Discharge condition:** a milestone extends the obligation past `FF-NN` ids to another declared
  class of assertion.

The red-probe obligation reaches ids declared in an `ARCHITECTURE.md` fitness register and nothing
else; no scenario in any `.feature` and no assertion inside a behavioural suite carries one.

### Leg B against an imported-but-never-spread suite

- **Status:** open
- **Discharge condition:** TECH_DEBT item 50's fix — a name-set assertion over the *assembled* suite
  rather than a substring read of the runner's text.

`control-unregistered` is decided by a substring read of each declared runner file, so a suite that a
runner imports but never spreads reads as registered.

### The `pending` marker's expiry outside this repo

- **Status:** open
- **Discharge condition:** a carrier exists that refuses a transition in any project — a gate hook, a
  `work.checks` seam, or an equivalent an accepting command can run.

A standing `pending` marker downgrades `control-unresolved` to `warn` at every status; the refusal at
`done` is enforced by an arch-test that exists in this repo only, and elsewhere is a rule the acceptor
applies.

### `STATE.md` is outside the policed document set

- **Status:** open
- **Discharge condition:** a check reads `STATE.md` without breaking the read budget frozen by
  `00_one-lane-that-reads-and-never-runs.feature`.

Doctor's snapshot carries `ARCHITECTURE.md`, `VERIFICATION.md`, `RETROSPECTIVE.md` and each item's
record doc; an id declared or cited in a `STATE.md` is invisible to every register check.

### Bare-prose citations

- **Status:** open
- **Discharge condition:** a scoping exists that reports a bare cross-item id at usable precision —
  measured at 0% on the live milestone under every scoping tried.

`register-dangling-citation` resolves qualified citations (`m?<itemRef>/<ID>`) and bare ids inside a
citing register entry; a bare id in free prose is outside the policed universe.

### Installed bundle copies drift from `src/bundle/`

- **Status:** open
- **Discharge condition:** TECH_DEBT item 54 — a warn-only report of installed↔source drift, or a
  named operator step in the deploy loop after an accept that touches `src/bundle/`.

87 rendered outputs exist under `.aof/`, `.claude/` and `.codex/`; 69 match their source, 17 differ
and 1 is absent, and no check compares that pair.

### Doctor's snapshot retains every record document's text

- **Status:** open
- **Discharge condition:** `docTexts[name]` is kept only where a register opener occurs or the doc is
  a memory source, turning whole-corpus retention into per-register.

`buildSnapshot` holds ~12.6 MiB of document text on every `doctor` run, growing linearly with the
stream, and the controls lane is its only consumer.
