@cli @work @board
Feature: Copy eligible artifacts from the item's document home
  Rule: R4 · An upload is a verified copy of an eligible local artifact
    @executable
    Scenario: E7 · A retried copy produces one verified link for the same content
      Given diagrams/flow.png in the home of 17 is eligible and linked to 410 after upload
      And the process stops before the copy is acknowledged locally
      When a new process retries publication of the same content
      Then readback identifies one verified attachment link on 410
      And the board contains one copy of that content and the local file retains its original bytes

    @executable
    Scenario: E8 · A board without uploads still tracks the item
      Given the selected board omits attachment support and 17 contains diagrams/flow.png
      When refinement completes and publishes 17
      Then the board item and tracked values are verified with zero upload requests
      And the local diagram remains readable from 17

    @executable
    Scenario Outline: Only eligible content with a verified item link is acknowledged
      Given the board accepts diagrams/*.png under the document home
      When publication encounters <artifact>
      Then the copy result is <result>

      Examples:
        | artifact                                           | result                              |
        | notes/draft.txt                                    | no upload                           |
        | an eligible filename symlinked outside the home    | no bytes sent from the outside file |
        | an uploaded PNG with no link on the intended item  | unverified, recovery remains pending |
