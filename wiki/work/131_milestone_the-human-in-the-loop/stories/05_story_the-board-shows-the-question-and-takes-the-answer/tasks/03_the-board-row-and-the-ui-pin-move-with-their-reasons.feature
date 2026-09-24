@executable @ui @work @board
Feature: the board directory's ceiling and the frozen ui digest move once each, with the reason and the measured diff beside them

  ADR-006 §4; ARCHITECTURE "Codebase health". Two ratchets meter what this story adds, and each
  moves in the same change as its subject, stated rather than taken quietly. The `board` row of
  `test/arch/testing/acd-ui-directory-budget.test.mjs` goes from 24 to 25 for `AskCard.tsx`.
  `53/FF-5307`'s `ui/` digest in `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs`
  is re-pinned with the reason "an ask face, not a loop face" and the measured `git diff -- ui/`.
  This story is the third and last writer of that file after 01 (the store digest) and 04 (the
  board digest), and edits only the `ui/` pin and its comment.

  RULINGS (PO, 2026-09-23).
  (1) The row's `why` gains one sentence of the house form, appended: `RAISED 24 -> 25 by 131/05
  (ADR-006 §4) for AskCard.tsx` and the reasons — board-only vocabulary, since the fleet renders
  no ask (DESIGN §2); `DetailPanel.tsx` at 995 of 1,000 can take only the mount; and it deepens
  nothing TECH_DEBT 18(a) meters, because nothing outside `ui/src/board/` imports it. `allowance`
  stays 0.
  (2) The re-pin comment names the files `git diff -- ui/` lists and their changed-line count,
  measured at the build, and says what it reads: the ask fact on a list row and the answer route,
  and NO run-record key, cycle, level or loop state. It is written LAST, after 01's and 04's
  re-pins have landed from their own lanes.
  (3) Neither control is weakened: the directory count stays exact, and the digest stays a digest
  of the whole `ui/src` tree.

  RULINGS (developer, 2026-09-23).
  (4) Feasible with one scenario moved. The shapes were measured. The row is
  `Object.freeze({ directory: "board", ceiling: 24, allowance: 0, why })`, the tree holds 24
  files, and the overshoot check (`ceiling > count + allowance`) makes 25 exact. FF-5307's `ui/`
  case hashes `git ls-files -- ui`, path then LF-normalised content, against one literal, with
  the message `ui/ changed despite the zero-board-change contract`.
  (5) "A 26th file turns it red" is an in-suite detector case on a SYNTHESIZED listing, the shape
  of the suite's own 9th-directory case: `uiDirectoryBudgetViolations` over the clean listing
  plus `{ path: "board/Planted.tsx", kind: "file" }` names `ui/src/board/`. Nothing is written
  to the tree. A real-file red probe, if one is run, belongs in `VERIFICATION.md`.
  (6) The one-character case is in memory too. The digest loop is lifted into one helper over
  (path, content) pairs. The case appends one character to each tracked `ui/src` file's content
  in turn, from one read, and asserts the pinned assertion throws with that message.
  (7) `git ls-files` reads the INDEX, so the pin is measured with `AskCard.tsx` staged. A pin
  taken before the card is staged leaves it outside the digest, and reds at commit.
  (8) "Across this story's commits" names no range a suite can know, so the third scenario moved
  to task 04 as an accept-time `@manual` check: the test file's diff from the story's base, read
  and recorded in `VERIFICATION.md`.

  RULINGS (PO, ratifying, 2026-09-23). Developer (4)–(8) RATIFIED.

  Scenario: the board directory holds exactly the new ceiling
    When `acd-ui-directory-budget` runs over the tree
    Then the `board` row reads `ceiling: 25`, `allowance: 0`, `ui/src/board/` holds 25 files, and the row's `why` carries the 131/05 sentence
    And adding a 26th file to `ui/src/board/` turns it red naming `board`

  Scenario: the ui digest is re-pinned with its reason and still guards the tree
    When `53/FF-5307`'s `ui/` case runs
    Then it is green at the new pin, and the comment above the pin cites 131/05, "an ask face, not a loop face", and the measured `git diff -- ui/` file list
    And a one-character edit to any file under `ui/src/` turns it red with `ui/ changed despite the zero-board-change contract`
