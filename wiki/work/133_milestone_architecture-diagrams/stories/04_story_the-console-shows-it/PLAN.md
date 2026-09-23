# 133/04 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

Two halves that share one path and nothing else.

**Server side: one entry and one forwarded key.** Append
`{ name: "DIAGRAMS", dir: "diagrams", ext: ".svg" }` to `WORK_ITEM_ARTIFACTS`. The directory kind
`TASKS` uses already gives membership, the `work:doc` member request, worker streaming and cache
reads. The one real bug is in `board-ui.mjs`: `/api/work/doc` never forwards `member`. Forward it
only when non-blank, so every existing request is byte-identical. Extend FF-7008's arch-test with
FF-13305's leg. Walk the manifest's existing suites (sync manifest, delivered records) for any that
enumerate the set and need to learn the new entry.

**Client side: logic in a pure pair, a thin panel.** `DetailPanel.tsx` has 7 lines of headroom, so
it gains only `ARCHITECTURE` in the milestone tab list (second), the Records probe/row, and one call
that collects members, fetches each distinct one once through `api.doc(ref, "DIAGRAMS", member)`,
and passes an `images` map to `Markdown`. Everything else goes in `ui/src/board/diagrams.mjs` and
its `.d.mts`: member collection, `svgDataUri`, response → state, and per-state figure markup
(escaped alt/caption, DESIGN's classes). `Markdown` gets an optional `images` prop and a per-call
image renderer from that module. Use a per-call `Marked` instance rather than mutating the global
`marked`, and do not emit a `<figure>` inside a `<p>`.

The SVG body reaches the page only as a data URI in `<img src>` (FF-13304). It never passes through
`marked.parse` or `innerHTML`.

Budgets: the `board` row of the UI directory budget rises 22 → 24 with its reason, and FF-5307's
tree digest is re-pinned with the measured diff stated.

## The verification step

Task 02 is the proof: build the UI (`npm run ui:build`), serve a scratch fixture with `aof work ui`
from this checkout on its ephemeral port, and capture 390/768/1280 with the cached headless
Chromium (absolute forward-slash `--screenshot`). Then judge each DESIGN checklist line in
`VERIFICATION.md`. Before that, the focused UI and manifest suites through
the runner's `--only` selection under a fresh `AOF_GLOBAL_HOME`, with red probes for FF-13304 (pass
a body to `marked.parse`) and FF-13305 (add a `.png` entry).

## Out of scope

- Zoom, pan, lightbox, or a gallery. The figure is inline and scales down.
- Inline SVG markup, or a raw-file route serving `image/svg+xml`.
- Any import of the diagram engine. The UI knows a diagram only by its image `src`.
