# 198/02 · Build brief

Advisory, for the builder. The task features are the contract. The frontmatter of `STORY.md` is
the read and write set, and `EXAMPLES.md` holds the defaults (Q1–Q14) the features assume.

## The mechanism

Three seams. Build 00 first, so the prose names verbs that exist by the time 03 runs.

1. **Three Claude-only fragments, on three new slots.** This rides 00's `runtimes` field.
   - Add the block slots: `decide.designer` after refine's mock-elicitation bullets,
     `ownership.design-system` at the end of aof-designer's `<ownership>`, and
     `conformance.baseline` just before verify's renderability precondition.
   - Put the same three markers in the matching Codex sections of `workflow.md`: the refine
     procedure, the `aof-designer` section and the verify procedure (192/ADR-002 §7). With no
     Codex body they leave nothing there.
   - Each fragment declares `"runtimes": ["claude"]`, a single common body and no Codex variant.
   - Check the goldens are untouched with the practice off before writing any prose (E1).
   - The refine body follows this order:
     1. replace the mock elicitation: no offer, no checklist-only or own-mocks path (amended
        2026-11-27, F-05);
     2. resolve the system (ADR-005 §4);
     3. find the milestone's page with `canvas pages`, and draw on it from the boards already
        there, from the designer's brief when orchestrated;
     4. ask Approve / Revise / Later (one per ask when driven);
     5. on Approve: read back, then run `mocks import`, then `mocks capture`, then name the frames
        in DESIGN.md;
     6. on Later: name the canvas link in DESIGN.md as awaiting approval.
   - It never publishes to the system. Keep every parse and comparison out of it (FF-19804's
     prose leg).
2. **`mocks import` is a pure plan plus one writer.** `mocks.mjs` takes a listing of the pulled
   dir and the flags, and returns either a refusal or a plan: the files to write, the files to
   remove from the previous import, and the README text. The verb layer in `commands.mjs` lists
   the dir, applies the plan and answers in JSON.
   - The README's file list is what makes a re-import "whole" (Q5), and its `Canvas:` line is
     what FF-19805 and capture key on.
   - Validate both links with 01's artifact-URL check. Don't write a second regex.
3. **`mocks capture` goes through the rasterizer that core injects.**
   - Give `svg-rasterizer.mjs` a page entry beside `rasterizeSvg`. It takes a path and an explicit
     width and height, and shares the done-poll and profile clean-up.
   - Generalise `browserArgv`'s last argument rather than adding a second builder (FF-13303
     counts builders).
   - Core's `diagrams/rasterize.mjs` returns the page entry too, and `command-core.mjs` passes it,
     with `findBrowser`, into the practice's command services.
   - Capture reads `canvas.json`'s `boards` and `order`, renders each board at scale 2, and writes
     the frame table only once every board succeeds (E17 and the failing-browser scenario).
   - If A3 shows the runtime hasn't painted by the time `--screenshot` fires, add a
     `--virtual-time-budget` for pages only, inside the same builder.

## Watch for

- 00's FF-19206 amendment and FF-19802 both sweep the shipped bundle. Register FF-19802 in
  `test/arch/practices/index.mjs` after 00's and 01's additions.
- FF-19805 needs its fixture so it is never vacuous. No real import exists until task 03 runs.
- The designer's `tools:` line must not move (FF-19803). The designer fragment is prose only.
- If 01's `use` has turned the practice on in this repo's config, `aof work update` re-renders
  `.claude/` with the new prose. Those rendered files are in the write set for that reason.

## Verification

From a clean worktree with `AOF_GLOBAL_HOME=$(mktemp -d)`, run by file:
- the design-system package's suites;
- `packages/execution/test/diagram-rasterize.suite.mjs`;
- the practices, ui and diagrams arch indexes;
- the golden render suites.

Then, in this checkout, import and capture a hand-made pull into a scratch milestone. Open a
board from disk with the network off. Task 03 is the operator's real run.

## Out of scope

Re-syncing an owned system at accept, and DESIGN.md's `## Design-system changes` (both 03).
The designer's tools. Any write to a Design System.
