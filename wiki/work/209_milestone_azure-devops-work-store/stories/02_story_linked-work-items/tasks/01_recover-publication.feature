@cli @work @board
Feature: Recover a partially applied publication
  Rule: R2 · Retrying an interrupted publication accounts for each item exactly once
    @executable
    Scenario: E3 · A lost create response is recovered after restart
      Given the board created 411 for 17/00 but its reply was lost before AOF saved the ID
      When a fresh process retries the same publication
      Then it finds 411 by the original create's correlation key and verifies the link
      And the board has received exactly one create for 17/00

    @executable
    Scenario: E4 · A partially accepted plan resumes at the outstanding member
      Given a publication created parent 410 and its child create was refused
      When I inspect the interrupted result and retry after the refusal clears
      Then the first result distinguishes the verified parent from the outstanding child
      And the retry links one child to 410 and verifies both items without creating a second parent

    @executable
    Scenario: Concurrent retries cannot both create the same board item
      Given publication of the same draft is ready to retry in two processes
      When both attempt to claim it before either create response arrives
      Then at most one remote create is issued and the other process joins or reports the active claim
      And after verification both processes can read the same linked board identity

    @executable
    Scenario Outline: Report completion only after readback
      Given a create request was sent and its result is uncertain
      When reconciliation returns <evidence>
      Then publication reports <result> and the original document home is readable

      Examples:
        | evidence                                     | result                                    |
        | a board timeout                              | pending recovery                          |
        | an item with the key but wrong tracked values| incomplete verification                   |
        | the correlated item with all intended values | verified link to the recovered board ID   |
