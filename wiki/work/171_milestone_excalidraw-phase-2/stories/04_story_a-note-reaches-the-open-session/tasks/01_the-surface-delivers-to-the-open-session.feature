@executable @ui @work @design
Feature: The diagram surface delivers a note or a question to the architect's session in one function

  WHY. A note typed while the architect's session is open should reach it as it is written, and a
  second Ask architect should not silently do nothing (ADR-005). The surface owns delivery in one
  function: a running session is typed into; otherwise a note waits and Ask architect starts a
  session. Starting a session from the editor also hands it the notes already waiting (171/04 Q1).

  Background:
    Given the diagram surface is open on "ADR-003-push-stream.excalidraw" of item 171

  Rule: R1 · With the architect's session running, a new note is typed into it

    Scenario: E1 · a note added while the session runs is typed into it
      Given the dock's session is running
      When the operator adds the note "Why is the cache here?" on "cache" and it is recorded as "n4"
      Then the dock is handed "/aof:diagram-review 171 ADR-003-push-stream.excalidraw n4" to type
      And the editor says the note was sent to the architect

    Scenario: E2 · a note added with the dock closed waits, as in 170
      Given the dock is closed
      When the operator adds the note "Why is the cache here?" on "cache"
      Then nothing is handed to a dock
      And the editor says the note waits for a review session

    Scenario: E3 · a note added after the session exited waits and says the session is not running
      Given the dock is open but its session has exited
      When the operator adds the note "Why is the cache here?" on "cache"
      Then nothing is typed
      And the editor says the architect session is not running

  Rule: R2 · Ask architect goes into the open session, and a new session also takes the waiting notes

    Scenario: E4 · Ask architect with the session running types into it
      Given the dock's session is running
      When the operator asks "Is the queue needed?" with Ask architect and it is recorded as "n5"
      Then the running session is handed "/aof:diagram-review 171 ADR-003-push-stream.excalidraw n5" to type
      And no new session is started

    Scenario: E5 · Ask architect with the dock closed opens a session typed the question, as in 170
      Given the dock is closed
      When the operator asks "Is the queue needed?" with Ask architect and it is recorded as "n5"
      Then the dock opens a new session typed "/aof:diagram-review 171 ADR-003-push-stream.excalidraw n5"

    Scenario: E9 · a new session takes the question, then the waiting notes
      Given the dock is closed and the notes "n1" and "n2" are open
      When the operator asks "Is the queue needed?" with Ask architect and it is recorded as "n5"
      Then a session is started typed "/aof:diagram-review 171 ADR-003-push-stream.excalidraw n5"
      And it is then handed "/aof:diagram-review 171 ADR-003-push-stream.excalidraw" for the waiting notes

    Scenario Outline: a new session is handed the waiting notes only when there are some
      Given the dock is closed and <waiting>
      When the operator <starts>
      Then the new session is typed <typed>

      Examples:
        | example | waiting                      | starts                                         | typed                                               |
        | E10     | no note is open              | asks a question with Ask architect             | only the question's invocation                      |
        |         | the note "n1" is open        | requests a first draft                         | the first draft's invocation, then the batch invocation |
        |         | the notes "n1" and "n2" are open | chooses "Review 2 notes with the architect" | the batch invocation once                           |
