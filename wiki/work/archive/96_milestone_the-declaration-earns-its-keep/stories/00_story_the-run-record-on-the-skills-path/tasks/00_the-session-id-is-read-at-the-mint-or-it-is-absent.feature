@executable @cli @work @work-stream
Feature: The session id is read where it exists or it is absent, and ambiguity is never resolved by guessing

  `aof work observe` joins a transcript to a work item on `sessionId` and on nothing else — the regex
  fallback that once pulled an unrelated milestone into a snapshot on a hex substring was retired
  under FF-6805, correctly. The join is empty on the phase path because no run record carries an id,
  and the repair is one rung, not a wider match.

  Where the id can be read was measured at refine rather than assumed. `CLAUDE_SESSION_ID` is
  **unset** in a tool shell — so is `CLAUDE_PROJECT_DIR` — which means 48/ADR-001's ladder has three
  rungs and only the first, the explicit `--session` flag, is reachable from a phase command. The id
  exists in exactly one readable place: the record `aof session ping` writes on every prompt.

  That store is a LIVENESS store, and treating it as an attribution source is the mistake this
  contract exists to prevent. `DEFAULT_SESSION_TTL_SECONDS` is 120, and `reapExpiredSessions` unlinks
  every expired leaf of this node at each `startSession`/`pingSession` — measured directly at refine:
  this session's own record was absent from the store while two records for a different workspace,
  written sixty seconds later, were present. A record is guaranteed fresh for seconds, which is why
  the mint sits at the top of the phase and why nothing may read the store at a phase's close.

  Two live records can also share one workspace — measured, two `claude-code` sessions on one
  workspace id at once — so "the session for this workspace" is not a unique answer. The resolution
  is strictly the newest `lastPingAt`, correct here because the ping that launched the phase is the
  newest event by construction, and a tie resolves to nothing rather than to a coin toss. An
  unattributable run costs one honest row in a snapshot; a guessed one silently moves another item's
  tokens, which is FF-6805's defect rebuilt in a different module.

  What would quietly undo this: a second reader of the sessions directory anywhere in `src/`; making
  `resolveSessionIdentity` impure so the "ladder" appears to grow a rung when it has actually grown a
  filesystem read; and a field on the run record naming the rung, which would give `work-observe` a
  second attribution vocabulary to interpret.

  ADR-001 §2, §3, §4. FF-9601.

  Scenario: the ordinary case — one live record for this node and workspace, minutes old
    Given a live session record for this node and workspace whose `lastPingAt` is within the session TTL
    And no `--session` flag on the mint
    When `work:run-start` mints a run for an item in that workspace
    Then the run record carries that record's `sessionId`
    And the command envelope reports the answering rung as the live store

  Scenario: the flag keeps priority over the store
    Given a live session record for this node and workspace carrying one session id
    And a `--session` flag naming a different id
    When `work:run-start` mints a run for an item in that workspace
    Then the run record carries the flag's id
    And the command envelope reports the answering rung as the flag

  Scenario Outline: the store answers only when one record is strictly the newest
    Given the live session records for this node and workspace are <records>
    And no `--session` flag on the mint
    When `work:run-start` mints a run for an item in that workspace
    Then the run record's `sessionId` is <outcome>

    Examples: one answer, or none — never a choice between two
      | records                                                              | outcome                              |
      | one record inside the TTL                                            | that record's id                     |
      | two records, one strictly newer by `lastPingAt`                      | the newer record's id                |
      | two records with identical `lastPingAt`                              | null                                 |
      | no records at all                                                    | null                                 |
      | one record for a DIFFERENT workspace on this node                    | null                                 |
      | one record for this workspace on a DIFFERENT node                    | null                                 |
      | one record whose `lastPingAt` is older than the session TTL          | null                                 |

  Scenario: a store fault resolves to absence and never fails the mint
    Given the sessions directory cannot be read
    When `work:run-start` mints a run for an item in that workspace
    Then the run is minted
    And its `sessionId` is null
    And the fault is reported through the coded-degrade seam

  Scenario: a run minted with no id is reported as unattributable rather than rendered as attributed
    Given a mint that resolved no session id
    When the command envelope is read
    Then it names no answering rung
    And `aof work observe` counts that run's item among its items and attributes no agent session to it

  Scenario: the resolver has one home, and the pure identity ladder stays pure
    Given the session-id rung that reads the live store
    When the module set of this story is examined
    Then that rung is exported from `src/mesh-session.mjs`
    And no other module in `src/` reads the sessions directory
    And `resolveSessionIdentity` still resolves over `{ stdinText, env }` alone, reading no filesystem

  Scenario: the run record's field set does not grow
    Given a run minted through the live-store rung
    When the persisted record is compared with one minted through the `--session` flag
    Then the two records carry the same field names
    And neither carries a field naming which rung answered
