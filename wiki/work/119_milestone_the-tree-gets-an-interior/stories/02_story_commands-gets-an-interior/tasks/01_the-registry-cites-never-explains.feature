@executable @cli @adapter @distribution
Feature: The registry entry cites one place, the prose keeps one home, and the comments that document the ring survive

  `awk '{if($0~/^\s*\/\//)c++;else if($0~/^\s*$/)b++;else s++}END{print c,b,s}' src/command-core.mjs`
  gives 352 comment / 7 blank / 222 code. This contract asserts no part of that ratio, deliberately:
  a cap with no admitted decomposition is item 61's measured failure and item 78 declines the same
  trap one directory over (ADR-006 §4). What is asserted is a SHAPE over the file that exists — and
  the file decomposes. Scanning for contiguous runs of lines matching `^\s*//` finds 68 blocks:

    · 1  the module header, lines 1-26 — the `Command` shape, `ctx`, and ADR-002's basis-neutral
         path rule. It sits directly above `import { loadWorkspace } from "./work.mjs";`, so a sweep
         reading "the block above an import" deletes it. It is not an entry's comment.
    · 47 above a `./commands/*` import — 46 multi-line, longest 12 lines, 282 comment lines.
    · 13 inside the `COMMANDS` array — 6 multi-line, longest 4 lines.
    · 6  over the registry's own API (`export { loadWorkspace }`, the array's opening, `REGISTRY`,
         `getCommand`, `listCommands`, `invoke`). Also not an entry's comment.

  Item 84's "93 times over" is the count of `import` statements, not of blocks, and the measured
  duplication is smaller and sharper. 105 registered commands; 55 bindings whose import carries a
  block; 13 array entries with a block; and TEN commands carrying a block in BOTH places —
  `loopDocument`, `loopRecord`, `audit`, `trigger`, `test`, `meshAssign`, `workOrchestrator`,
  `resync`, `assetsList`, `assetsShow`. Three more carry an array block and no import block. The
  sweep's subject is 60 blocks, and ten of them are the two-homes defect proper.

  The prose has somewhere to go, measured rather than assumed: every command module already opens
  with a header citing its own decisions — `trigger.mjs` cites `63/ADR-001, ADR-003, ADR-004,
  ADR-011`; `audit.mjs` cites `59/ADR-002 §1/§2, ADR-006, ADR-007 §1`. It is not a copy, though. The
  core's trigger block cites `63/ADR-008 §7` and `trigger.mjs` spells neither `ADR-008` nor `board`
  anywhere; the core's grade block cites `54/ADR-003` and `grade.mjs` cites four other ids and not
  that one. 25 distinct citation tokens live in these blocks and 9 blocks carry none at all. Losing
  an id is how this sweep fails quietly.

  THE EXEMPT CLASS IS NOT IN THIS FILE, and recording that is why this paragraph exists.
  `grep -c "await import(" src/command-core.mjs` is 0. The one sentence about the ring is
  `src/command-core.mjs:109`, inside `triggerCommand`'s 12-line block — the block the sweep
  collapses. The deferred-import comments TECH_DEBT item 26 names live one directory over, in
  `src/commands/`: `trigger.mjs:162`, `tune.mjs:6`, `work-ui.mjs:89` and `work-ui.mjs:238` — four
  sites in three modules, none in a moving family, all in this story's write set because the prose
  lands in those same headers. Eight modules there carry `await import(`.

  What would quietly undo this: the module header deleted as though it were an entry's comment; a
  block collapsed to a citation that drops an id nothing else in the tree carries; a TDZ comment
  rewritten away while its module's header is being enlarged; and a comment-density number added to
  the control later, which turns a shape claim back into item 61's cap.

  ADR-006 §3, §4. FF-11908. TECH_DEBT items 26, 84.

  Scenario Outline: a registry entry's comment is one line, and its content is a citation
    Given a registry comment that at HEAD is <before>
    When the sweep has run
    Then that comment is <after>

    Examples: the six subject forms and the two that are not this sweep's subject
      | before                                          | after                                                  |
      | a 12-line rationale above a `./commands/` import | one line, citing the ids that rationale carried        |
      | a 4-line note at an array entry                  | one line citing what the import line does not, or absent |
      | a block in both places (10 commands)             | one line, in one of the two places, never both         |
      | a one-line comment already carrying a citation   | unchanged                                              |
      | a block carrying no citation token (9 of them)   | one line naming the decision's home, or no comment      |
      | a bare `// see the import note` pointer          | one line citing the decision, not the other comment     |
      | the module header at lines 1-26                  | unchanged — not an entry's comment                     |
      | the comments over `getCommand`/`listCommands`/`invoke` | unchanged — not an entry's comment               |

  Scenario: no citation is lost, only relocated
    Given the 25 distinct citation tokens the collapsed blocks carry at HEAD
    When the sweep has run
    Then each token appears on its entry's one-line citation or in that command module's own header
    And no token has disappeared from the tree

  Scenario: no command states the same decision in two places afterwards
    Given the ten commands carrying a comment block at both their import and their array entry
    When the sweep has run
    Then each carries at most one comment in `src/command-core.mjs`
    And no citation token appears in two blocks for the same command id

  Scenario: the claim is a shape, and no number gates it
    Given the control that enforces this contract
    When its source is read
    Then it asserts no comment count, no comment ratio and no line budget other than one per entry
    And its subject is the registry entries in the file that exists, not a projected file

  Scenario: the exempt class is still present, and the leg that says so is not vacuous
    Given the deferred-import comments that document the TDZ ring in `src/commands/`
    When the sweep has run and the three families have moved
    Then `trigger.mjs`, `tune.mjs` and `work-ui.mjs` each still explain why their import is deferred
    And the set of such sites is derived by reading `src/commands/**`, never typed as a list
    And that set is asserted non-empty and no smaller than the four sites measured at HEAD
    And each surviving site still sits with the deferred import or ring hazard it explains

  Scenario: deleting one of them fails the control
    Given the deferred-import comment at `src/commands/trigger.mjs:162`
    When it is removed and the control runs
    Then the control fails and names that file

  Scenario: restoring a paragraph above a registry entry fails the control
    Given a multi-line rationale block reinstated above one `./commands/*` import
    When the control runs
    Then it fails and names the entry and the block's line count

  Scenario: the file's diff is comments and 28 specifiers, and this story is its only writer
    Given `src/command-core.mjs` before this story
    When the story's diff over that file is read
    Then every changed line is a comment line or one of the 28 rewritten `./commands/{mesh,assets,graph}-*` specifiers
    And no import binding, array entry or exported function changes
    And `listCommands()` returns the same 105 ids in the same order
