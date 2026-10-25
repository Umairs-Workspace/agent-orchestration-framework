# 02 · Review records are pushed — build plan

## Mechanism

**Stamp in the command, watch in the face, decisions in a pure module.**

- `diagram:scene --action stamp` (a read action, so it is allowed with diagrams off and on a
  done item) answers `{ scene, review, watch }`: `scene` is the scene file's `(size, mtimeMs)` or
  null; `review` is a digest over the `requests/` and `proposals/` entries' `(name, size, mtimeMs)` —
  the same identity `listRecords`' cache keys on (F-170-05); `watch` is the absolute diagram
  folder and its `.review` folder, built from `diagramReviewPaths` in `layout.mjs`. It parses
  nothing. The scene's own revision (sha) rides the `scene` event only after a stamp change, read
  through the existing `read` action.
- `board-ui.mjs` gains `GET /api/diagram/events` beside `/api/diagram/scene`, invoking by command
  id only. On connect: invoke `stamp`, write headers and a first event, arm `fs.watch(dir,
  { recursive: true })` on each `watch` directory (a missing `.review` folder is watched by its
  parent), re-stamp 150 ms after the last watch event, and on a 30 s safety timer; if arming throws
  or the watcher errors, switch to a 2 s tick. Compare each new stamp with the last sent and emit
  `event: review` and/or `event: scene` with the new values. A comment `: keepalive` every 25 s.
  Close every timer and watcher on `request.on("close")`. The clock, timers and `watch` are
  injected through the face's existing options so the suite drives them without waiting.
- `review-stream.mjs` (pure, in `@aof/diagrams-ui`) is a reducer over editor facts (stream state,
  visibility, dirty, the revision the editor last wrote, the last stamps) and events, answering what
  to do: refresh the panel, replace the canvas, show the changed-elsewhere line, start or stop the
  poll. `ExcalidrawEditor.tsx` owns only the `EventSource` and executes those answers.
  `editor-state.mjs`'s `shouldPoll` takes the stream state.
- The editor records the revision every save, accept and publish answers, so a `scene` event for a
  revision it wrote itself changes nothing (E6, E7).

FF-17101 (`acd-diagram-face-imports-nothing`) lands with this story: the face's diagram routes
import nothing of `@aof/diagrams` and invoke only `diagram:*` ids. Give it its red probe in
VERIFICATION.md.

## Verification step

`node test/smoke/diagram-editor.smoke.mjs --playwright <dir> --channel chrome` with the new checks:
open the editor, run the stand-in architect's `respond` and `propose`, and see both in the panel
without a reload; then two pages on one diagram, save in one, watch the other. Read the screenshots.

## Out of scope

- Pushing anything to the board's other surfaces — they keep their polls.
- Carrying record content over the stream.
- Multi-operator editing; a second window is a reader of the saved draft, not a collaborator.
