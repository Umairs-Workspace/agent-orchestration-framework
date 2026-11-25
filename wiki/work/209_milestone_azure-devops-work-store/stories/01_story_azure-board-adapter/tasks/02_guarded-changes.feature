@cli @adapter @board
Feature: Apply Azure changes under the expected revision
  Rule: R3 · Report the outcome of each guarded change and verify attachment links
    @executable
    Scenario: E5 · A stale patch cannot change item 410
      Given the caller expects revision 8 but Azure has item 410 at revision 9
      When the recorded endpoint receives the status patch with a JSON Patch test on /rev for 8
      Then its 412 response yields a stale refusal for 410 and a read still shows revision 9 and its prior values

    @executable
    Scenario: E6 · One failed member cannot hide an applied change
      Given a two-member batch guards 410 at revision 8 and 411 at revision 3
      When Azure applies 410 at revision 9 and rejects 411 with a stale revision
      Then the caller receives the applied ID and revision for 410 and a separate refusal for 411

    @executable
    Scenario: E12 · A successful upload with a missing relation stays unverified
      Given Azure accepted flow.png and returned an attachment URL
      When the adapter tries to link that URL and rereads item 410 without finding the relation
      Then the copy is reported as unverified and the local original is still readable

    @executable
    Scenario Outline: Account for writes using the provider's evidence
      When the caller submits <request> and the recorded transport returns <response>
      Then the adapter returns <outcome>

      Examples:
        | request                          | response                                  | outcome                                  |
        | guarded rank and parent change   | item 410 at revision 10 with new values    | same ID 410, applied at revision 10      |
        | creates with correlation keys    | batch error after one unreported create    | uncertain members identifiable for reconciliation |
        | copy to item 410                 | attachment relation confirmed on readback | verified copy linked to 410              |
