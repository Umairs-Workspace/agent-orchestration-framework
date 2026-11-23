Feature: Archive and renumber preserve identity and evidence

  Rule: R2 · Archive and renumber preserve identity and evidence

    @executable @cli @work @work-stream
    Scenario: E3 · Archiving a chore keeps crossing links usable
      Given live chore 11 links to done chore 19
      When the operator archives 19
      Then 19 resolves in the archive, disappears from the live list and the link in 11 reaches the moved receipt

    @executable @cli @work @work-stream
    Scenario: E4 · Renumbering a parent moves the subtree and preserves captured evidence
      Given a verification attachment quotes the original 10/00
      When the operator renumbers milestone 10 to 22
      Then 22/00 resolves, live citations follow the move and the attachment still quotes 10/00

    @executable @cli @work @work-stream
    Scenario Outline: Identity changes use the existing move rules
      Given a fresh workspace and the fixture specified by the row
      When the operator requests <operation>
      Then the observable result is <result>

      Examples:
        | operation | result |
        | archive --done --yes | 17 and 19 move together |
        | renumber 10/00 --to 03 | pack retains the literal bare dependency 00 |
        | renumber 10 --to 11 | occupied target refusal and empty delta |
        | renumber 10 --to 22 --dry-run | preview and empty delta |
