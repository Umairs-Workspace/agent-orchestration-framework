# 133/02 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

Export is a composition of three things, and only the rasterizer is new code of any size.

1. **Find the source.** List the item's `diagrams/` folder for exactly one
   `ADR-NNN-*.<sourceExt>`, through the layout from story 01. The stem comes from the file name.
2. **SVG.** Call the adapter's `toSvg` (story 01) and write the result. The SVG is written FIRST
   and is never rolled back.
3. **PNG.** Only when `formats` includes it: `findBrowser`, then `rasterizeSvg` on the COMMITTED
   SVG, never the HTML.

`rasterize.mjs` takes everything impure as injected functions (`exists`, `which`, `spawn`, `stat`,
the clock and sleep), with real defaults for the CLI. That is what lets the suites drive the Edge
case: the launcher exits before the file exists. "Done" is two facts, the process has exited and a
non-empty file exists, polled up to 30 s. Clear any old output before spawning, so stale bytes
cannot satisfy the poll. Remove the temp `--user-data-dir` in a `finally`. `browserArgv` is the ONE
function that forms an argv (FF-13303). Only a `full` browser gets `--headless=new`.

The command threads the rasterizer's injectables through its context, so the export suite can run
`diagram:export` in-process via `invoke` with a fake spawn. A CLI child cannot spawn a fake script
as a browser on Windows. The refusal rows, and the SVG-only rows that start no browser, run through
the real CLI, which is what pins the exit codes.

A PNG miss returns the partial envelope (`written`, `block`, `png: { ok: false, code, fix }`) and
exits non-zero. The doctor lane (story 03) keeps the item red until a node with a browser exports.

`diagram-png-render-failed` (the browser exits non-zero without writing) is a code this contract
added beside ADR-005's two.

## The verification step

Task 03 on this machine: the shipped command, run as `node src/cli.mjs` against a scratch project,
renders the plugin's example architecture through the cached headless shell and again through
Edge. Read the PNG's IHDR for 2000×960, and record the wall time against Edge's instant return.
Before that, the focused suites plus FF-13303 through `node scripts/test.mjs --only`, under a fresh
`AOF_GLOBAL_HOME`, with a red probe for FF-13303 (add a second argv builder, or a `playwright`
import).

## Out of scope

- CDP or element screenshots. The window IS the viewBox. CDP stays the documented fallback.
- Transparency. The measured PNG is RGB, and the diagram draws its own paper.
- Downloading or installing any browser.
