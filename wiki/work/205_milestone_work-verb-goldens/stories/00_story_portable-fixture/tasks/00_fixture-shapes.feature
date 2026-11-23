Feature: The same logical seed exposes every supported work shape

  Rule: R1 · The same logical seed exposes every supported work shape

    @executable @cli @work @work-stream
    Scenario: E1 · A fresh seed exposes the live stream, backlog and archive
      Given the orchard fixture in a new project and private global home
      When work list --all --json runs
      Then its ordered rows include all seven item types, both nested story refs, backlog queued and waiting, and archived 30
      And the complete seed export includes the story task, attachment bytes and empty directory

    @executable @cli @work @work-stream
    Scenario: E2 · The fixture distinguishes both lifecycle vocabularies
      When the statuses of the governed items and prototypes are read from the seeded stream
      Then the governed records show not-started, in-progress, blocked, in-review and done
      And refs 15, 16, 17 and 18 show active, paused, done and abandoned respectively

    @executable @cli @work @work-stream
    Scenario: E3 · The seed includes satisfied and outstanding dependencies
      When work next 10 and work next 10/01 run against another fresh copy
      Then 10/00 is ready and 10/01 waits on 10/00
      And the fixture contains a resolved dependency on archived 30

    @executable @cli @work @work-stream
    Scenario Outline: Copies expose each numbered or unnumbered identity
      When the CLI resolves <query> in two fresh copies
      Then both answers identify <item> with <relationship>

      Examples:
        | query | item | relationship |
        | 10/01 | pack | parent 10 |
        | queued | queued | in backlog |
        | 30 | ledger | archived |
