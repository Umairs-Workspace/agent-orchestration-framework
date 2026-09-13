# 00 · The phase brief — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A pure phase-brief compiler
`src/phase-brief.mjs` turns supplied document text into one rendered brief: it imports nothing,
reads no filesystem and no wall-clock, and returns a byte-identical result for identical inputs.

### A caller-side reader that keeps the compiler pure
`src/phase-brief-read.mjs` is where the item's documents are read; `compileBriefForItem` is the one
function both spawn seams call, so there is one reader and one compiler rather than two
implementations of the same assembly.

### A declared, priority-ordered section set, selected per phase
`BRIEF_SECTION_PRIORITY` is `item, story, objective, tasks, fitness, dependencies` in that order, and
`refine`, `continue` and `verify` each resolve to their own subset of it rather than to every section
that exists.

### A size ceiling enforced inside the writer
`compilePhaseBrief` cannot return an over-ceiling brief: `PHASE_BRIEF_CEILING_CHARS`
(`PHASE_BRIEF_CEILING_TOKENS` 2000 × `PHASE_BRIEF_CHARS_PER_TOKEN` 4 = 8,000 characters) is the only
ceiling literal in `src/**`, and no caller applies a bound of its own.

### Loud, non-empty truncation
An over-ceiling brief drops from the bottom of the priority list, retains the `item` section, and
carries a notice naming which sections were dropped or shortened; the compiler never returns an
empty brief and never silently ships the overflow.

### Honest degradation, and refusal of a subject-less brief
An absent or whitespace-only section is omitted rather than faked, an empty task-contract set is
stated as empty, a read fault contributes an absent section rather than failing a spawn, and a brief
with no item ref is refused by the compiler rather than returned.

### The brief on the bag that already existed, at both spawn seams
`src/commands/drive.mjs` and `src/mesh-worker-execution.mjs` both set an additive `context` key
beside the four existing `brief` keys (`itemRef`, `worktreeCwd`, `task`, `command`), which keep their
meaning; the driver's signature stays `driveInteractiveClaudeSession(brief, options)` and it reads
`brief.context`. No rival context/payload/digest object exists.

### The context arrives as input, not as an instruction to go and read
`composePhaseBriefInput` appends the rendered brief (and its truncation notice, when present) to the
command the driver types into the session, so the phase receives the content by value.

### Absence is benign at both seams
A caller that supplies no compiled context produces a byte-identical launch to the pre-story
behaviour, so the two seams were landable independently and every existing run record stays readable.

### Three declared controls in service
FF-7001 (one brief bag), FF-7002 (the compiler is a pure leaf and the driver's export set stays the
frozen seventeen) and FF-7003 (the bound is in the writer) are armed, registered in the suite, and
each was observed failing against a planted violation.

## Assumptions

- **The caller locates the item's milestone correctly** — a story's milestone documents sit TWO
  directories above its own (`<milestone>/stories/<story>`), and both seams derive `milestoneDir`
  that way; a one-level derivation silently yields a brief with no objective and no fitness section.
- **The mesh seam's phase is read from the directive's command string** — `phaseBriefContext` maps
  `/aof:refine` → `refine`, `/aof:verify` → `verify` and everything else → `continue`, so a directive
  whose command names no phase is briefed as a build phase.
- **The ceiling is a character budget, not a measured token count** — 8,000 characters stands in for
  ~2,000 tokens at the declared 4-chars-per-token ratio; no tokenizer is consulted, so the true token
  count of a full brief varies with content.

## Gaps

### The reduction the brief exists to produce is not measured here
- **Status:** open
- **Discharge condition:** story 70/02 lands the per-phase `cacheRead ÷ cacheCreate` ratio and a
  measured run reports it.
The brief is **additive** — `composePhaseBriefInput` appends it to the existing `/aof:continue <ref>`
command, and the session still has the whole repository — so nothing in this story prevents a phase
re-reading the documents it was handed. This story delivers the payload and its bound; whether a
spawn's cache-creation tokens actually fall is unstated by any scenario it owns.

### The section list is open by construction, and one declared consumer is unbuilt
- **Status:** open
- **Discharge condition:** story 70/03 adds its ADR slice to `BRIEF_SECTION_PRIORITY` and
  `PHASE_SECTIONS` without renegotiating the ceiling.
`BRIEF_SECTION_PRIORITY` holds six sections and the ceiling is fixed at 8,000 characters; adding a
seventh consumes the same budget, so the ADR slice arrives as competition for space rather than as
additional space.
