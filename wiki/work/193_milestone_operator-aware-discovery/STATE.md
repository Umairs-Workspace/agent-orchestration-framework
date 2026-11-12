---
doc: state
---
# 193 · Discovery researches the domain before it asks — State

## Progress

- 2026-11-12 — Captured in the backlog and promoted (appended, as 192).
- 2026-11-12 — Refined (`aof:refine 192 --autonomous`, as it was numbered then; solo, run `20261112T162305759Z-0000`, no
  session id: the live store did not answer). ARCHITECTURE ADR-001–007, FF-19201–19203 declared
  `pending`, five stories with example maps, contracts and build briefs. No story's map held a
  business question, so nothing was asked and no story waits at the Contract gate.
- 2026-11-12 — Re-cut the same day at the operator's review of that refinement (run
  `20261112T174956662Z-0001`). The operator's steer: the commands are getting long, and in some
  projects this approach is not needed, so make it an extension and make commands buildable.
  What changed: the practice is opt-in (`work.examples.operatorAware`); its prose ships as
  fragments of the specification-by-example practice; milestone 192 (buildable-commands) was
  captured and promoted to deliver slots and fragments, and this milestone now `depends: [192]`.
  Story 00 lost its template task and is code only. Story 03 was renamed and re-cut around the
  switch. Story 04 was re-cut against the render. ADR-003 §8–§9, ADR-004, ADR-005 §5, ADR-006 and
  ADR-007 were revised in place, and FF-19204 was added. Nothing had been built.
- 2026-11-12 — Status returned to `not-started` (`aof work status 193 not-started`): an
  `in-progress` driver with an unmet dependency is a doctor error, and nothing here is being built
  while 192 is open. The refinement stands; `aof:continue 193` picks it up once 192 is done.
- 2026-11-12 — Renumbered 192 → 193, and buildable-commands 193 → 192, so the numbers follow the
  build order (operator's request). `aof work renumber` through a free parking number, 194:
  192 → 194, 193 → 192, 194 → 193. Its two run records now carry `itemRef: "193"`. The verb also
  rewrote a pixel ratio, `192/408`, in three archived docs of milestones 46 and 49 as if it were a
  ref; those were restored to their committed bytes.
- Waves once 192 is done: 00 and 02; then 01 and 03; then 04. `aof work next 193` answers
  `blocked` until then. Only 04 needs 192, but a story cannot name another milestone in
  `depends:`, so the edge is on the milestone.

## Notes & decisions in flight

- 2026-11-12 — Captured from an operator conversation. In domain-heavy projects (fraud, property
  management, regulatory), refine asks the operator questions as if they were the domain specialist.
  The root cause is the two-label question taxonomy: `business` conflates domain fact with operator
  policy, and an unplaceable question defaults to "ask the human". Items 1–4 of that conversation's
  proposal (split the labels, research first, the operator profile, the explain-first question
  shape) are in scope. The glossary, "not mine to decide" routing, the quality lints and profile
  learning are deferred to a follow-up.
- 2026-11-12 — Default decisions taken at refine (technical, documented in the ADR named):
  - **`business` stays in the grammar and reads as `policy`** (ADR-001 §1). No delivered map is
    rewritten. The parser still reads an unknown class as `business`; "unplaceable is `domain`" is
    the PO's labelling rule.
  - **A finding is a `## F<n> ·` heading in the research document with a `- **Source:**` line**
    (ADR-001 §6). A milestone's story cites the milestone's `RESEARCH.md`; a standalone story
    cites one in its own folder.
  - **The citation is checked by code; the batch is not** (ADR-002 §2, ADR-004 §6). A
    `researched F<n>` with no sourced finding is `example-research-unanchored` and stops the
    build. The batch carries no map token, so the doctor cannot tell whether the operator saw it.
    Refine still asks it, and an unanswered batch leaves the story at the Contract gate.
  - **The profile's one home is `@aof/contracts`, merged global-under-project by `loadWorkspace`,
    and read by a session through `aof project show --json`** (ADR-003 §3–§6).
  - **An item names its domains as `domains: [...]` in its record doc's frontmatter** (ADR-003
    §8). The PO writes the key at refine; no template gains it. The word also names the tag group
    `work.tags.domains`; the beat's prose tells them apart.
  - **A question takes its domain's level; one the PO cannot attribute takes the lowest level
    among the item's domains, and `new` when it names none** (ADR-004 §3).
  - **One researcher pass per refine writes every finding** (ADR-004 §4).
  - **`Background:` counts toward a driven ask's 1,500 characters** (ADR-005 §3).
  - **The switch is `work.examples.operatorAware`, in the project's config only** (ADR-006 §1).
    Rendered commands are committed, so a render must not depend on the machine. The name is a
    default the operator may change before 03 is built.
  - **The switch gates prose and one warning, never the map's grammar or its gate** (ADR-002 §6,
    ADR-006 §3). A map written while it was on is still judged after it is turned off.
  - **`aof work init-config` turns it on and writes the profile** (`--operator-aware`,
    `--operator-role`, `--expertise`, `--global`), and a profile flag replaces what it names
    (ADR-006 §4).
  - **`aof:init` does not ask for the role** (ADR-006 §7). It renders before any config exists,
    so in a new project the switch is off. This drops a line of the SPEC as first captured.
  - **The warning is repeated by `aof work update` and by the turn-on itself** (ADR-006 §5).
  - **No standing notice in a project that left the switch off** (ADR-006 §6). That a practice
    exists is 192's to say, in its update's list of optional practices.
  - **04's fragment paths are a guess** until 192 is refined (193/04, Notes).
- 2026-11-12 — Diagram not drawn: `diagram-generator-missing` (ADR-004). The brief is kept;
  `aof:add-diagram 193` draws it once the `diagram-design` plugin is installed.
- 2026-11-12 — Recall. Architect, `9a62a92f-ba18-464b-b96b-b22b40aa696a`: five ADRs, no near-miss;
  154/ADR-002 honoured (ADR-003). PO, `81ab7638-b609-41c1-9b3c-528eb4acbd15`: empty.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green — register in `VERIFICATION.md`
- [ ] `@manual` — the live run (ADR-007). In a project with operator-aware discovery on, declare a
  profile that lists one domain as `new`, name that domain on a milestone, and run `aof:refine` on a story with
  at least one real fact and one real decision in it. Read at the source: every `domain` question
  in the story's `EXAMPLES.md` is `researched F<n>` with a sourced finding in `RESEARCH.md`, or was
  relabelled `policy`; every question the operator received carried `Background:` and
  `I would pick:`; no question reached them that the cited source answers. Needs all five stories.
