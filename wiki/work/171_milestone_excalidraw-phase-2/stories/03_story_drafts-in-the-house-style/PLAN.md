# 03 · Drafts in the house style — build plan

## Mechanism

**One reader, two consumers.** `house-style.mjs` (pure, in `@aof/diagrams`) parses the style
guide's markdown: find the table under a heading named "Semantic roles", read each row's first cell
as the role (backticks stripped) and the third cell as its light value, and keep a role only when
its value is a `#rrggbb`/`#rgb` hex or an `rgba(...)`. No `paper` or no `ink` means `null`. It
exports `readPalette(text)`, `defaultNodeStyle(palette)` (the `fill/stroke/color` triple) and
`canvasDefaults(palette)` (the SDK's `currentItemStrokeColor`, `currentItemBackgroundColor`,
`currentItemFillStyle: "solid"`, or `{}` for no palette).

`diagram:scene` resolves the style path through the one reader (`resolveWorkDiagrams(config).style`,
as `plan.mjs` already does) and reads the file once per invocation, tolerating a missing file as
no palette. `read` and `context` carry `palette`. `propose`, before diffing, parses the proposed
text, and for each node that the diff ADDS, that has no `style` entry and no `aof:lib`, appends the
default style line to the text — then diffs and stores as today, so `changes` include the `style:`
keys. The editor passes `canvasDefaults(answer.palette)` into `initialData.appState`; a stored
element keeps its own colours because the defaults only seed new elements.

The prompt (`packages/core/assets/commands/diagram-review.md` and its three renders, plus the
manifest hashes) loses "recolour" as the architect's job: new nodes are drawn in the house style
by themselves; a `style` line is for emphasis, using `palette.link` or `palette.accent`.

## Verification step

In the smoke's diagrams-on project, point `work.diagrams.style` at a copy of this repo's
`style.md`; propose a first draft through the stand-in architect, accept it, and read the
screenshot: paper boxes, ink strokes, labels that fit. Draw a rectangle, save, and read its stored
colours. `node scripts/test.mjs --only` over the scene suites and `house-style.suite.mjs`.

## Out of scope

- Recolouring diagrams drawn before this story.
- Edge colours from the profile — `linkStyle` stays refused; hand-drawn arrows take `ink`.
- The dark column of the style guide; the editor draws on a light canvas.
