# 133/06 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

No code. This story runs the path stories 01 to 05 built, once, on a real ADR, and reads every
result at the source.

1. **Style.** Write `.aof/diagrams/style.md` in the structure of the plugin's own
   `references/style-guide.md` (read it from the located install). Map each semantic role to a
   token in `ui/src/index.css:3-25`: crimson accent as the focal role, primary teal as the
   structural accent, the paper/ink/rule/muted from background/foreground/border/muted-foreground,
   the `0.5rem` radius, and the UI's font stacks. Keep the plugin's light→dark inversion rule.
2. **Opt in.** Add `work.diagrams` to `.aof/aof.config.json` with the generator, both formats and
   that style path. Validate with `aof project validate --json`.
3. **Draw.** `node src/cli.mjs diagram plan 133 ADR-002 --slug generator-seam --json`, then hand the
   `instructions` to a drawing agent (a subagent, or this session following them literally). It
   writes only the `.html`.
4. **Export and paste.** `node src/cli.mjs diagram export 133 ADR-002 --json`, then paste `block`
   under ADR-002's existing `### Diagram` brief. That is the only edit to `ARCHITECTURE.md`, and
   ADR-002's decision text does not change.
5. **Read back.** `aof work doctor 133 --json` from the repo root, then this checkout's
   `aof work ui` on its ephemeral port, captured with the cached headless Chromium.

Commit `.aof/diagrams/style.md`, `.aof/aof.config.json` and the milestone's `ARCHITECTURE.md` plus
`diagrams/` by hand on the branch. A lane reconcile drops `.aof/`.

If the drawing needs another pass, re-draw and re-export. The item is open, so both verbs overwrite.

## The verification step

Task 00's evidence in `VERIFICATION.md`: each command with its unedited, scrubbed output and the
instant, the PNG's pixel size, the doctor result, and the screenshot. Then task 01: the operator
judges the drawing against the brief and the console's style, in their own words. Their "not yet"
is a finding fixed here, not a new ADR.

## Out of scope

- Restarting the desktop supervisor. If the operator wants the installed board to show it, that is
  `install-local` plus an operator restart, recorded as outstanding.
- Any other ADR's diagram, or diagrams for other milestones (delivered records are immutable).
- Changing the style of diagrams in other projects. The style file is this repo's.
