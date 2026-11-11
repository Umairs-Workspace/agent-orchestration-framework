@executable @ui @work @board
Feature: The polled routes answer 304 when nothing changed

  WHY. Every poll rebuilt, re-serialised and resent the whole fleet or board answer, and the page
  re-rendered it, even when nothing had changed. The two polled routes now tag each answer, and a
  poll that sends back the tag of an unchanged answer gets `304` with no body.

  Rule: R1 · A poll that finds nothing changed is answered 304

    Scenario: E1 · a fleet poll with nothing changed is answered 304
      Given the fleet has polled "/api/mesh/status" and received an ETag
      When the fleet polls "/api/mesh/status" again with that ETag and nothing has changed
      Then the answer is 304 with no body

    Scenario: E2 · a board poll after a status change gets the new list and a new tag
      Given the board has polled "/api/work/list" and received an ETag
      And story "12/03" changes from "in-progress" to "done"
      When the board polls "/api/work/list" again with the old ETag
      Then the answer is 200 with "12/03" reading "done"
      And it carries a different ETag

    Scenario Outline: the tag is honoured only when it matches
      When "<route>" is requested with If-None-Match "<sent>"
      Then the answer is <status>

      Examples:
        | route            | sent             | status                                |
        | /api/mesh/status | the current tag  | 304 with no body                      |
        | /api/mesh/status | a stale tag      | 200 with the body and the current tag |
        | /api/work/list   | no header        | 200 with the body and the current tag |
        | /api/work/list   | the current tag  | 304 with no body                      |

    Scenario: an error answer carries no tag
      Given the global store cannot be opened
      When the fleet polls "/api/mesh/status"
      Then the answer is the existing error envelope with no ETag
