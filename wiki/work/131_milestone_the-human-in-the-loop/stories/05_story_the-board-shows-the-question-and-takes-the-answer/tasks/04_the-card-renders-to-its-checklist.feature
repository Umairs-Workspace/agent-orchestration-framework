@manual @ui @work @board
Feature: the card, rendered on a real board over a fixture ask, conforms to DESIGN's binding checklist and answers end to end

  DESIGN §1 "Conformance source of truth": no mock was elicited, so the binding checklist is the
  baseline, and surface 1 is judged by screenshot at 1280×800 and 760×520 (DG-46-1's frame).
  The developer runs it: build the UI (`npm run ui:build`), stand the board up with `aof work ui`
  over a fixture workspace under an isolated `AOF_GLOBAL_HOME`, hand-write ask files in each
  state through 131/01's writers, and drive the cached ms-playwright Chromium directly
  (`--headless=new --screenshot=<absolute forward-slash path>`; `npx playwright` is
  policy-blocked). Each screenshot is handed to `aof-designer` as a read-only fidelity judge
  (CONFORMS / GAPS / INCONCLUSIVE). The evidence — the command lines, the screenshot paths, the
  verdicts and the file read back — goes into the milestone `VERIFICATION.md`, never a
  paraphrase. Nothing here touches the real `~/.aof` or the live daemons.

  RULINGS (PO, 2026-09-23).
  (1) The subjective `@uat` review DESIGN names (the card reads as a question awaiting a
  considered answer, not an alert or a confirm dialog) is the operator's, taken on the live board
  in 131/07, where a real ask is answered from the board. It is not a gate on this story.
  (2) A GAPS verdict is fixed in this story and re-rendered; it is not routed to a new item.

  RULINGS (QA, 2026-09-23).
  (1) DESIGN §1's `Loading` state has no row: task 01's PO ruling (5) removes it.
  (2) The sending frame is captured by pausing `POST /api/work/answer` at the browser (CDP
  `Fetch.requestPaused`), never by editing the server or the card.
  (3) The remote-lane row seeds a `needs-input` assignment row in the isolated home's store, not
  an ask file, so the card is proved to key on the fact and not on a file.

  RULINGS (developer, 2026-09-23).
  (4) Feasible with one scenario amended. `--headless=new --screenshot=` captures one page load
  and nothing else. Typing, clicking, both frames and the paused POST therefore go through CDP:
  the cached `ms-playwright` Chromium with `--remote-debugging-port`, driven by a scratch script
  over Node 22's global `WebSocket` (`Emulation.setDeviceMetricsOverride`, `Input.insertText`,
  `Runtime.evaluate`, `Fetch.requestPaused`, `Page.captureScreenshot`). There is no npm package,
  and the script lives in the scratchpad, never the repo.
  (5) The board is `node src/cli.mjs work ui --target W --port <a free port>` with
  `AOF_GLOBAL_HOME` = `H`: this checkout's CLI, so it serves this tree's `ui/dist`, on none of
  4180-4182 and never through the live payload. It is a hand-started process, stopped by SIGINT
  at the end, and the run says so. The item opens by `#<ref>`.
  (6) The refusal row and scenario need the board NOT to poll between the CLI answer and the
  click. List GETs are held with `Fetch.requestPaused` on `/api/work/list*`, as QA 2 holds the
  POST. A timed race is not evidence.
  (7) A base build needs a base `ui/dist`. A worktree has no `node_modules`, and one must never
  be junctioned in, so the base is captured FIRST, from this checkout before any `ui/src` edit.
  The board's 1 s clock repaints relative times, so the no-ask scenario compares the detail
  panel's `outerHTML`, with the screenshot recorded beside it.
  (8) `VERIFICATION.md` is not in `files:`, and the screenshots need a durable home, not the
  scratchpad. Both are reported. The twenty screenshots go to ONE `aof-designer` call.
  (9) The last two scenarios moved here from tasks 02 and 03: each reads a diff from the story's
  base, which no suite can name, and a scenario there inherits `@executable`.

  RULINGS (PO, ratifying, 2026-09-23). QA (1)–(3) and developer (4)–(9) RATIFIED. The PNGs are
  committed under this story's `evidence/` folder, and `VERIFICATION.md` cites them by path.

  Scenario Outline: each state renders to its checklist at both frames
    Given a fixture item whose ask is <state>
    When the detail panel is rendered at 1280×800 and at 760×520 and each screenshot is judged against DESIGN §1's binding checklist
    Then each verdict is CONFORMS, and the screenshot paths and verdicts are recorded in `VERIFICATION.md`

    Examples:
      | state |
      | `waiting`, local, a two-line question asked 12 min ago: no toggle, `Send answer` disabled |
      | `waiting`, a 40-line question: clamped at 6 lines under `Show the full question` |
      | `waiting`, the 40-line question after `Show the full question` is clicked: full height, `Show less` |
      | `waiting`, `question: null`: the dashed unreadable box, the reply still usable |
      | `waiting`, `take b` typed and the answer route held open: `readOnly`, `Sending…`, `aria-busy` |
      | `answered` by `"umami"` from the CLI: the `✓ Answered by umami · …` receipt and the answer verbatim |
      | `parked`, asked 3 h 10 min and parked 1 h ago: `PARKED — UNANSWERED`, the notice, `Send answer and resume` |
      | `parked`, then answered: the `resumes with the loop (aof work loop <scope> --resume)` receipt |
      | `answered` after the board polled, then `Send answer` clicked: the `✕ Not sent — …` slot in `text-accent`, the text kept |
      | a worker's `needs-input` row, no ask file: `· on <node>`, `Delivered to <node>.`, header `Open terminal — <node>` |

  Scenario: an answer typed on the board lands verbatim, and the receipt holds until the ask leaves the wire
    Given a fixture item whose ask for run `R1` is `waiting`, and the board open on it
    When `take b —\n  keep the tests` is typed into `Your answer` and `Send answer` is clicked
    Then the ask file for `R1` reads `state: "answered"`, `answer` byte-equal to the typed text and `by.via: "board"`, read back from disk
    And the card shows `✓ Answered by <actor> · …` and still shows it after two list polls, and it is gone on the first poll after the file is removed

  Scenario: a refusal keeps the words and names what happened
    Given the ask for `R1` has already been answered by `"umami"` from the CLI after the board last polled
    When a different answer is typed and `Send answer` is clicked
    Then the slot reads `✕ Not sent — the session is no longer waiting`, the typed text is still in the textarea, and `Send answer` is enabled

  Scenario: with no ask the panel is unchanged
    Given the detail panel's `outerHTML` and a 1280×800 screenshot of the item, captured from this checkout's build before any `ui/src` edit of this story (ruling 7)
    When the same item is rendered with its ask file removed
    Then the detail panel's `outerHTML` is byte-identical to the captured one, and both screenshots are recorded in `VERIFICATION.md`

  Scenario: the panel's diff against the story's base is the two added lines (task 02, developer ruling 8)
    When `git diff --numstat` of `ui/src/board/DetailPanel.tsx` from the story's base to its last commit is read at the accept
    Then it reads 2 added and 0 removed, and the command and its output are recorded in `VERIFICATION.md`

  Scenario: the story's other pins are the earlier writers' (task 03, developer ruling 8)
    When `git diff` of `acd-loop-state-rides-the-run-record.test.mjs` from the story's base to its last commit is read at the accept
    Then only the `ui/` digest literal and its comment changed, and the `src/run-store.mjs` and `src/board-ui.mjs` pins are byte-unchanged from 04's
    And the command and its output are recorded in `VERIFICATION.md`
