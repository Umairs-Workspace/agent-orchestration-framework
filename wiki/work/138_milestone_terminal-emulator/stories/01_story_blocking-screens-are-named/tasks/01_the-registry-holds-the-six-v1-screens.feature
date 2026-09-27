@executable @cli @work @work-stream
Feature: the registry holds the six v1 screens, in order, each recognised from its own recording and never from the input box

  ADR-003 §1 to §3. `CLAUDE_SCREENS` in `src/terminal/claude-screens.mjs` gains its four remaining
  v1 entries between the two story 00 landed. An entry's recording is
  `test/fixtures/claude-screens/<id>.json`, by name. The cases live in
  `test/terminal/claude-screens-registry.test.mjs`, registered in `test/terminal/index.mjs`.

  RULINGS (PO, 2026-09-27). (1) The order is ADR-003's table: `ready`, `trust`, `mcp-approval`,
  `first-run`, `login`, `usage-limit`. (2) `trust` is `consent` with `option`
  `Yes, I trust this folder`; `mcp-approval`, `first-run` and `login` are `fail`. (3) No
  `update-notice` entry: nothing was recorded (ADR-003 §2). (4) A recogniser reads structure and the
  screen's own words together, from its recording, and every `fail` or `consent` entry rejects any
  frame on which `ready` holds. A conversation that quotes a dialog's words above a live input box
  is a working session, not a dialog. (5) Exclusivity is among the frame-deciding entries (`type`,
  `consent`, `fail`). A `wait` entry is read on its own (138/00, task 04), so `usage-limit.json`,
  drawn on a REPL frame, is recognised by `usage-limit` and by `ready`, and by nothing else. This
  refines FF-13802's "as no other" for the one `wait` entry, and is ratified here.

  RULINGS (QA, 2026-09-27). (1) Each fixture is replayed through a real model of its own size.
  (2) The "quoted words" frames are the `ready.json` recording followed by a chunk that draws, on a
  conversation row above the upper rule, the one line of the dialog's text its recogniser keys on.

  Scenario: the registry is the six v1 entries in order
    When `CLAUDE_SCREENS` is read
    Then its ids are `ready`, `trust`, `mcp-approval`, `first-run`, `login` and `usage-limit`, in that order
    And their actions are `type`, `consent`, `fail`, `fail`, `fail` and `wait`, and `trust`'s `option` is `Yes, I trust this folder`
    And no entry's id is `update-notice`

  Scenario Outline: each recording is claimed by its own entry
    Given `test/fixtures/claude-screens/<fixture>` replayed through a real model
    When every entry's `recognise` is asked of the snapshot
    Then the entries answering yes are exactly <claimed>

    Examples:
      | fixture           | claimed                        |
      | ready.json        | `ready`                        |
      | trust.json        | `trust`                        |
      | mcp-approval.json | `mcp-approval`                 |
      | first-run.json    | `first-run`                    |
      | login.json        | `login`                        |
      | usage-limit.json  | `ready` and `usage-limit`      |

  Scenario Outline: a working session that quotes a dialog is not that dialog
    Given the `ready.json` frame with the words `<entry>` keys on drawn on a conversation row above the upper rule
    When every entry's `recognise` is asked of the snapshot
    Then only `ready` answers yes

    Examples:
      | entry        |
      | trust        |
      | mcp-approval |
      | first-run    |
      | login        |

  Scenario: the trust recording opens on another option, and its named option is an item of the same menu
    Given `trust.json` replayed through a real model
    When its menu is read as the door reads it (the item under `❯`, and the item whose text is `trust`'s `option`)
    Then the highlighted item is `No, exit`, and `Yes, I trust this folder` is the item directly below it
    And the recording enables no application cursor keys, so the arrow toward the option is Down, `ESC [ B`
