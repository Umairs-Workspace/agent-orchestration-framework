Feature: Other managed-item writers preserve existing identities

  Rule: R3 · Other managed-item writers preserve existing identities

    @executable @cli @work @work-stream
    Scenario: E5 · A new prototype allocates beyond the archived high-water mark
      Given a fresh orchard stream ends at archived 30
      When the operator starts a new prototype with the slug fruit-crate
      Then the new item is active at 31, its intent document is readable and no existing item moves

    @executable @cli @work @work-stream
    Scenario: E6 · Upgrading a current stream is idempotent
      Given every managed record is at the current schema and the stream validates
      When the operator applies the existing upgrade twice
      Then both runs leave all record bytes and identities unchanged

    @executable @cli @work @work-stream
    Scenario Outline: Other writer entry points honor the tracking boundary
      Given a fresh workspace and the fixture specified by the row
      When the operator runs <operation> with a recording store bound to the workspace
      Then <observable> and the document output matches the existing verb contract

      Examples:
        | operation | observable |
        | migrate a folder into a managed milestone | the selected store supplies the minted identity |
        | promote a finding to a chore | the resulting chore resolves from the selected store |
        | upgrade --dry-run | the upgrade reports pending changes without a tracking write |
