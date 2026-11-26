# 198/03 · Build brief

Advisory, for the builder. The task features are the contract. The frontmatter of `STORY.md` is
the read and write set, and `EXAMPLES.md` holds the defaults (Q1–Q14) the features assume. This
story runs last (ADR-008 wave 3): 01's `tokens`/`check` and 02's verify fragment file and slot
markers are already in the tree when it starts.

## The mechanism

Three seams. Build 01 (the verb) before 02 (the prose), so the prose names a verb that exists.

1. **A template variant, on 192's mechanism.**
   - One `template-variant` member in the design-system bundle: practice `design-system`,
     template `milestone`, name `DESIGN.md`.
   - Its file is core's milestone `DESIGN.md` byte for byte, with `## Design-system changes` and
     `## Design-system gaps` inserted just before `## Behavioural outcomes (cross-reference)`.
     Each section is a comment saying which mode writes it, and what a line looks like (a token with
     its new value, a component with what changed, or `None.`).
   - Add a practice-suite case that strips the two sections and compares with core's file. That
     is what stops the copy drifting when core's template changes.
2. **`tokens --merge` is a pure function plus 01's writer.** In `tokens.mjs`, take the system's
   document and the code's token lists (01's parse), and return `{document, changed, added,
   removed, unplaced}`.
   - Walk the system's tokens in order. Update a value that differs once whitespace is collapsed,
     using the same normalisation `check` uses, so merge-then-check is clean by construction (E9).
   - Keep every other field. Drop and list what the code lacks, per theme. Append the code's new
     tokens in declaration order.
   - Restamp `meta.source`'s ref (from `--ref`) and its paths, and leave the rest of `meta` alone.
   - The verb layer resolves sources exactly as `check` does: arguments, else the configured
     `source`. It refuses an `--out` that resolves to any source path, before it reads anything
     else.
3. **Verify's Claude-only fragment.**
   - Add the block slot `checks.design-system` at the end of verify's step 1, after the
     design-conformance bullets, and its twin in the Codex verify procedure of `workflow.md`.
   - Add a `<!-- fragment:checks.design-system -->` section to the practice's existing
     `verify.md` fragment file, and its member with `"runtimes": ["claude"]`.
   - The body follows the order in task 02's E10 table: resolve, read back, check, merge, record,
     publish, read back, check. Then come the four exits: in sync (publish nothing), reference
     (never publish), a story's accept (skip), and an unresolved name (stop).
   - It calls verbs and the Artifact tool, and holds no parsing (FF-19804's prose leg).

## Watch for

- FF-19802 must sweep the new fragment. If 02 wrote it over a fixed list of members rather than
  the bundle, generalise it. Don't add a second list.
- The slot markers must leave nothing behind with the practice off (FF-19205). The goldens and
  the manifest's hashes then stay put. A manifest diff means a marker is leaking.
- If this repository's config has the practice on (01's task 05), `aof work update` re-renders
  `.claude/commands/aof/verify.md` and the milestone `DESIGN.md` template. Both are in the
  write set for that reason.

## Verification

From a clean worktree with `AOF_GLOBAL_HOME=$(mktemp -d)`, run by file:
- the design-system package's tokens and practice suites;
- the practices arch index;
- the golden render suites.

Then, in this checkout, merge `apps/ui/src/index.css` into a hand-edited copy of the AOF system's
`tokens.json` and run `check` on the result. Task 03 is the real run, on a probe system.

## Out of scope

Any write from a system to the code. A re-sync at a story's accept. Changing a `reference` system.
The mock canvas and its import (02).
