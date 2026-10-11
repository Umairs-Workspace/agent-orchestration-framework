Feature: New lessons preserve recurrence and promotion through the existing vocabulary

  Rule: R1 · New lessons name a promotion while older lesson bodies remain unchanged

    @executable @cli @work @memory
    Scenario: E1 · A fixed watermark protects existing lesson bodies
      Given a retrospective has unchanged legacy lessons R1 through R3 and promotionFrom 4
      When R4 is appended with conforming Kind, Area, Stage, Owner and Promoted to "none"
      Then live validation accepts R4
      And R1 through R3 require no promotion backfill
      And ingest preserves the original legacy source bytes

    @executable @cli @work @memory
    Scenario: E2 · Missing promotion is held at the new-lesson boundary
      Given a live retrospective has promotionFrom 4 and a conforming R4 without Promoted to
      When work validate examines that item
      Then the existing lesson-meta hold reports R4 and the missing Promoted to field
      And an archived copy reports the problem only as an advisory warning

    @executable @cli @work @memory
    Scenario: E3 · Promotion and recurrence use frozen record fields
      Given R4 has Promoted to "prompt:packages/core/assets/commands/refine.md" and Recurs "m45/R13"
      And its Kind has the existing qualifier "recurring"
      When the retrospective is indexed by each active backend
      Then R4 status is "prompt:packages/core/assets/commands/refine.md"
      And R4 tags retain "recurring" and contain "recurs:45/R13" exactly once
      And the record field set, title, summary and ranking text are unchanged apart from the authored source additions
      And an untagged legacy record retains its existing compact recall representation

    @executable @cli @work @memory
    Scenario Outline: New metadata syntax is checked by the shared hold
      Given a new R4 at promotionFrom 4 has Promoted to "<promotion>" and Recurs "<recurrence>"
      When the existing meta hold evaluates the lesson
      Then the result is "<result>"

      Examples:
        | promotion                                         | recurrence | result                     |
        | none                                              | absent     | conforming                 |
        | rule:.aof/rules/cleanup.md                         | 45/R13     | conforming syntax          |
        | control:153/FF-15301                               | 45/R13     | conforming syntax          |
        | prompt:packages/core/assets/commands/continue.md   | 45/R13     | conforming syntax          |
        | prompt:                                           | absent     | promotion field diagnostic |
        | invented:value                                    | absent     | promotion field diagnostic |
        | none                                              | nonsense   | recurrence field diagnostic |

    @executable @cli @work @memory
    Scenario: Inline and separate meta lines produce the same result
      Given equivalent lesson metadata is written once inline and once on separate labelled lines
      When both lessons are parsed through the shared vocabulary reader
      Then promotion and recurrence values agree
      And first-value-wins behaviour is preserved for repeated labels

    @executable @cli @work @memory
    Scenario: Malformed forward boundaries do not silently exempt new lessons
      Given a retrospective declares a non-positive or non-integer promotionFrom value
      When live validation reads the retrospective
      Then it reports the invalid boundary rather than treating the document as legacy
      And no retrospective is rewritten
