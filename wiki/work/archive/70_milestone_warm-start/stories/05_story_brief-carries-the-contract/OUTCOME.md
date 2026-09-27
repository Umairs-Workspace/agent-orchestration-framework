# 05 · A brief that carries what the phase must satisfy — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### Every brief section declares a reduction, and the declaration is exported and frozen
`src/phase-brief.mjs` exports `BRIEF_SECTION_CONDENSERS`, `BRIEF_NON_CONDENSABLE_SECTIONS` and
`BRIEF_BOUNDED_CONDENSERS`, all `Object.freeze`d. The union of the first two is exactly
`BRIEF_SECTION_PRIORITY` and their intersection is empty, so a section cannot exist without a
declared reduction — an eighth one added without either declaration fails on its first commit.

### A section too large for the budget is condensed, never dropped for size alone
Every section is offered its condenser before it is considered for sacrifice. Across all 219 story
folders in this repo's `wiki/work/`, compiled in all three phases through the production reader, the
only disposition the compiler emits is `condensed` — 0 sacrificed and 0 unshippable in 657
compilations.

### A condensed section states its own count, not merely its size
A bounded condenser reports `kept` / `total` / `omitted`, and the notice renders it in words —
*"All 27 scenarios listed, none omitted"*, *"2 of 3 decisions listed, 1 omitted"*. A condensed
section that named none of its own entries is therefore visible as such rather than indistinguishable
from a full one; no such section exists in this stream today.

### Sacrifice runs strictly bottom-up, so one miss no longer cascades
A section that does not fit no longer evicts the sections beneath it. A section whose condensed form
exceeds the whole ceiling is reported as unshippable and costs nothing below it.

### The truncation notice distinguishes three dispositions and points at the source
`CONDENSED (shortened to fit — still carried)` is distinguishable from dropped and from unshippable,
and each condensed section names the form that survived and the file the complete text is read in.

### The compiler is handed addressed extracts, never documents
`src/phase-brief-read.mjs` binds each section to its own named `…Section` const, produced by an
imported addressing helper, before the `compilePhaseBrief` call. A milestone's specification
reaches the brief as its `## Objective` block and a story record as its `## User story` block —
never as the whole file, and never carrying frontmatter or scaffold comments.

### The ceiling is unchanged and still has one home
`PHASE_BRIEF_MAX_CHARS` is 8,000, enforced inside `compilePhaseBrief`, and no second ceiling literal
exists outside the compiler. No brief in the stream exceeds it in any phase.

### The contract reaches every story in this repository that has one
211 of the 211 story folders carrying a `tasks/` directory receive their acceptance criteria in every
phase, and 194 of 219 receive their milestone's architecture or fitness register. Mean brief size is
7,440 / 7,234 / 6,753 chars of 8,000 at `refine` / `continue` / `verify`.

### A story's declared ADR slice reaches its brief on real data
A `STORY.md` carrying `adrs:` receives those ADRs' headings and decision passages, counted, in place
of the milestone register. `70/05` is the only such story of the 219 and its brief carries all three
of its declared ADRs' headings.

### Two record shapes the reader previously answered nothing for now resolve
All 34 stories declaring a non-empty `depends:` receive a dependencies section at `refine`, and the 3
records writing `## User Story` rather than `## User story` receive a story section.

### The brief is pinned against this repository's own work stream
`test/brief-pinned-to-the-stream.test.mjs` compiles briefs for real items under `wiki/work/` and
asserts invariants that hold for any real item rather than byte counts for particular ones. Its
declared-slice assertion fails if no story in the stream declares any ADRs, so the path cannot pass
by emptiness.

### Two structural controls guard the declarations and the call site
FF-7009 fails if the frozen declarations stop covering `BRIEF_SECTION_PRIORITY` exactly; FF-7010
fails if any section value at the `compilePhaseBrief` call site is an identifier bound directly from
a disk read. Both were observed failing at this gate against the live bytes.

## Assumptions

- **The 8,000-char ceiling stands** — ADR-009 §1 leaves it exactly where ADR-003 put it, on the
  measurement that the budget was half-spent, so nothing here depends on a larger one.
- **Priority means last to pay, not full helping** — a higher-priority section may take everything
  left except the smaller of what the sections below it need and an equal share of the budget. This
  is not a reserved per-section budget: nothing is held for an absent section.
- **A condenser is pure and structure-aware** — each reduction is a function of its input text alone,
  except the three bounded ones, whose output is additionally a function of the room they are given.
- **The real-stream guard depends on the stream** — its declared-slice invariant holds only while at
  least one story carries `adrs:`; today exactly one does.
- **Markdown block structure is the address** — a section is extracted by heading, so a record that
  renames or omits the addressed block yields no section rather than the whole file.

## Gaps

### An imported milestone's record doc is invisible to its own brief
- **Status:** open
- **Discharge condition:** the objective section is addressed through `recordDoc()`, so the brief
  reads whichever document is the milestone's record rather than `SPEC.md` by name.
`compileBriefForItem` reads `SPEC.md` alone, while `recordDoc()` resolves milestones AOF.md-first.
`wiki/work/42_structural-overhaul` is an imported milestone in this stream carrying both, and its
brief is addressed from the `SPEC.md` that is not its record doc; an imported milestone carrying
`AOF.md` alone would receive no objective section at all. Recorded as `m70/F-19`.

### The architecture register is condensed hardest at the phase that most needs it
- **Status:** open
- **Discharge condition:** the register's retention at `refine` is no worse than at `continue`, or
  the shortfall is accepted on the record as constraints-by-reference.
Measured over the same 219 stories using each bounded condenser's own count, the architecture/fitness
section's median retention is 0.86 at `verify`, 0.60 at `continue` and 0.38 at `refine`, with 34
stories receiving under a quarter of their register at `refine` against 8 at `verify`. Nothing is
dropped or husked and every count is stated, so no contract is breached. Recorded as `m70/F-20`.

### The saving this brief exists to produce is still unmeasured
- **Status:** open
- **Discharge condition:** `70/06 saving-is-measured` reports a cache-hit ratio for a phase spawned
  with a compiled brief.
The brief now carries the contract within budget, and no run record in this stream yet reports
anything but `unmeasured`. That the budget is spent on context is measured here; that the spend
bought a cheaper spawn is not. Recorded as `m70/F-12`, routed to `70/06`.
