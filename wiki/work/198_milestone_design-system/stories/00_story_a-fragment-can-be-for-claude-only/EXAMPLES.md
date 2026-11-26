# 198/00 · A practice's fragment can name the runtimes it is for — example map
<!--
Drafted at refine's discovery beat (2026-11-26). The fixture is 192/00's: the command "demo" has a
common source (rendered by Claude Code and OpenCode) and an authored Codex procedure, both carrying
the slot "demo.notes"; the agent "aof-demo" has a common source and a Codex variant carrying
"ownership.notes". The practice "notes" is keyed on "work.notes.enabled". "A Claude-only fragment"
is a fragment with "runtimes": ["claude"] and a common body, "Use the Artifact tool.".
ADR-001 (Accepted) settles every rule below, so no business question is left for a person; the
open engineering choices are technical and take the default each names.
-->

## R1 · A fragment may name the runtimes it is for, and the load refuses a list that contradicts its bodies
- E1 · A Claude-only fragment on "demo.notes" with no Codex body, though the Codex procedure carries the slot: the bundle loads [proposed]
- E2 · The same fragment given a Codex body as well: the load is refused, naming the fragment, "codex" and "demo.notes" [proposed]
- E3 · A fragment declaring "runtimes": ["claud"]: the load is refused, naming "claud" and the runtimes the matrix holds [proposed]

## R2 · A scoped fragment's prose lands in the renders of the runtimes it names, and in no other, even where they share one source
- E4 · "notes" on: ".claude/commands/aof/demo.md" holds "Use the Artifact tool."; ".opencode/commands/aof/demo.md" and the Codex skill hold none of it [proposed]
- E5 · An unscoped fragment "Note one." and the Claude-only fragment in one block slot: Claude holds both in declared order; OpenCode holds "Note one." alone, with one blank line either side of it [proposed]
- E6 · A Claude-only "alpha-plus" replaces the unscoped "alpha", both on: Claude holds "Alpha plus." and not "Alpha."; OpenCode and Codex hold "Alpha." [proposed]

## R3 · With no scoped fragment on, every runtime's render is byte-for-byte today's
- E7 · "notes" off: every runtime's render of the fixture equals its render with the Claude-only fragment deleted from the descriptor [proposed]
- E8 · The shipped bundle with "discovery" and "build-brief" on (no scoped fragment ships yet): the Claude and OpenCode refine commands hold the same body, as they do today [proposed]

## R4 · The practice list names a scoped practice's runtimes, and the doctor says once when an on practice reaches none of the project's runtimes
- E9 · "aof work update" with "notes" made only of Claude-only fragments: its row ends "for claude", its JSON entry holds "runtimes": ["claude"], and the "discovery" row is as it reads today [proposed]
- E10 · A project installed for codex alone, with "notes" on: "aof work doctor" reports one "practice-no-effect" warning naming "notes", "claude" and "codex" [proposed]
- E11 · The same project installed for claude and codex: no "practice-no-effect" finding [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-001§2 · Is a scoped fragment refused when none of the runtimes it names carries its slot? Yes: it could never land, as an unscoped fragment whose slot no text carries is refused today.
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-001§1 · Does an empty "runtimes" list mean every runtime? No: it is refused as naming no runtime; "every runtime" is spelled by leaving the field out.
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-001§2 · When a scoped fragment names only runtimes that render from authored variants, is a common body a contradiction? Yes: a body that no named runtime renders is refused, as a body for an unnamed runtime is.
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-001§5 · Which practices does the list name runtimes for? Only one whose every fragment is scoped and which ships no template variant (a template reaches every runtime); it names the union of its fragments' runtimes, in matrix order.
- Q5 · technical · defaulted m192/ADR-006§2 · What does the doctor's finding look like? Code "practice-no-effect", severity warn, one per practice, anchored at the work directory as "practice-render-stale" is; the project's runtimes are the ones its lock records.
- Q6 · technical · defaulted m192/00-reference-page-cap · The reference page is 148 of its 150-line cap. Is the cap raised for the new section? No: the cap is a delivered 192 criterion; the section fits by tightening the page's existing prose.
