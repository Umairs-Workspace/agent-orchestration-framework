@manual @cli @work @work-stream
Feature: a real drive types on the input box, is accepted, and its stop leaves the REPL as drawn — one small real turn on this node

  ADR-002, ADR-004. The one leg that spends a token. The deployed driver drives the operator's own
  configured `claude` on a fixture story of the standing test-bed. The directive is pasted on the
  first ready frame and accepted, which the captured session id proves. The drive is then cancelled
  through its stdin, and the cancelled stop leaves a `session-screen` event holding the REPL as it
  was drawn at that moment.

  RULINGS (PO, 2026-09-27). (1) The token cost is written in `STATE.md` before the leg runs: one
  small real turn, cancelled once the session is under way. (2) The drive runs on a third refined
  `not-started` fixture story of the test-bed, under a lent run (`--run`) so that its stdin is the
  cancel channel. Stdin is ended 45 s after launch. (3) The lent run is settled afterwards, so no
  run is left open. (4) If the trust dialog appears, standing consent answers it once and the leg
  continues. That is recorded as a bonus observation, never staged. (5) This leg never runs under
  an empty config directory. It needs the operator's authenticated claude.

  RULINGS (QA, 2026-09-27). (1) Acceptance is shown by the drive document's `sessionId` and by the
  transcript file that id names in claude's projects directory for the test-bed. The directive is
  shown to be the session's first input by that transcript's first user record, which begins with
  `/aof:continue`. (2) The degrade log is read for lines written after the launch and naming the
  ref.

  Scenario: the drive is accepted, then cancelled
    Given `STATE.md` records the leg's token cost, and a run minted with `aof work run-start <third story> --json`, pasted
    When `aof work drive continue <third story> --run <runId> --json` runs in the test-bed with its stdin ended 45 s after launch
    Then the document holds a non-null `sessionId`, `outcome` `failed` and `failureReason` `cancelled`, pasted
    And the transcript that `sessionId` names exists, and its first user record begins with `/aof:continue`, pasted

  Scenario: the stop left the REPL as drawn
    When this node's degrade log is read for that drive
    Then it holds one `session-screen` line whose message names the ref and `failed/cancelled`, and whose `screen` has `buffer` `alternate` and rows holding the input box's two `─` rules, pasted

  Scenario: nothing on the way was a fallback or a guess
    When the same lines are read
    Then none is `screen-model-unavailable`, `screen-not-ready`, `tui-ready-marker-absent`, `directive-not-accepted` or `directive-resubmitted`

  Scenario: no run is left open
    When the lent run is settled and `aof work run-status <third story> --json` runs
    Then it shows no run in state `running`, pasted
