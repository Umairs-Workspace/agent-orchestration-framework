# 05 · The board shows the question and takes the answer — build plan

## Mechanism

One fact on the wire, one pure function, one component, one client. The route and the verb are
04's; this story is a READER of the ask file and a CALLER of the route.

1. **The fact rides the list row.** `work:list` with `mesh: true` already ends in
   `applyCachedProvenance(applyExecutionOverlay(…))`. Wrap that in `applyAskOverlay(rows, { asks, workspaceId })`,
   where `asks` is 01's `readAsks(loopAsksDir(env), { workspaceId })` read once per call. A local
   ask is keyed by its own `ref`; a mesh ask is derived from the row's final `execution` under the
   same condition 04's mesh leg accepts. Rows without either are returned as the same object, which
   is what keeps the no-ask board and the CLI's `--json` byte-identical.
2. **The card's words are data.** `askCardState` in `action.mjs` turns (ask, send phase, text,
   clock) into eleven keys. It imports `formatElapsed` and `eventPhrase` from
   `../../../src/notify/form.mjs`, the single sanctioned `ui → src` import. `primaryAction`'s
   mirror branch reads `item.ask` for its label and nothing else changes.
3. **The component is a renderer.** `AskCard.tsx` owns `text`, `phase`, `error`, `sent`,
   `expanded` and a clamp measurement (to show the toggle); everything it paints comes from
   `askCardState`. Its classes are DESIGN §1's, lifted from `ActionsStrip`'s composer and
   `CurrentRunStrip`'s frame. `DetailPanel` takes the import and the mount, keyed per ask.
4. **The client is `resync`'s shape.** `workApi.answer` posts `{ ref, text, actor }` and throws
   `codedError`, so the code survives to the sentence map.

## Verification step

Under an isolated `AOF_GLOBAL_HOME`, run `node scripts/test.mjs --only` over the test files in
`files:` plus the ui surface-file budget; then `npm run ui:build`. Then
task 04 end to end: `aof work ui` over a fixture with a hand-opened `waiting` ask, type a
multi-line answer in Chromium, read the ask file back as `answered` with `via: "board"`. A wrong
build shows as a card on a row the verb would refuse, a receipt that decays on a timer, a Send that
fires on Enter, or a `--json` diff with asks on disk.

## Out of scope

- The route, its admission and the verb: 04's. A refusal's code is whatever 04 answers.
- FF-13108 and FF-13109 as controls: 06's. Note for 06 — the card has TWO `<button` elements
  (Send and the show-all toggle); FF-13109's count must be of the SEND button.
- The subjective `@uat` read of the card: 131/07, on the live board.

## Known traps

- `DetailPanel.tsx` is at 995/1,000. Two lines, no refactor, no comment block.
- Vite and `tsc` must both resolve `../../../src/notify/form.mjs` and its `.d.mts`; check the dev
  server's `fs.allow` as well as the build.
- `53/FF-5307`'s `ui/` pin moves on ANY byte of the board tree. Re-pin last, after 01's and 04's lanes have
  landed their pins, with the measured diff in the comment.
- Node's clock is not the board's: every elapsed case passes `nowMs` explicitly.
