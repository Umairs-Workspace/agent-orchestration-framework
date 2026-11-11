Feature: A backend whose declaration the port cannot honour is refused when the port is built

  WHY. The declaration is the contract a future engine signs. If it could name a corpus aof does not
  have, promise a verb it has no method for, or claim a pair another backend already serves, the port
  would route a question to nothing, or to the wrong engine, at the moment someone asked it. It is
  refused at construction, by name, so the mistake surfaces where it was made (179/ADR-001,
  FF-17901).

  THE FIXTURE: stub backends built per row. "records" and "edges" are the well-formed stubs of task
  00.

  @executable @cli @adapter @memory
  Scenario Outline: a misdeclared backend is refused naming the backend and the entry
    Given a stub backend "bad" that declares <declaration> and has methods <methods>
    When a port is composed over "records" and "bad"
    Then construction fails with a type error
    And the message names backend "bad" and "<entry>"

    Examples:
      | declaration                    | methods                 | entry            |
      | planning: ingest               | ingest, status          | planning         |
      | code: search                   | search, status          | search           |
      | code: relations                | status                  | relations        |
      | work: recall                   | recall, status          | work:recall      |

  @executable @cli @adapter @memory
  Scenario: a backend that declares no corpora is refused
    Given a stub backend "bare" with methods ingest and status and no "corpora" export
    When a port is composed over "bare"
    Then construction fails with a type error naming backend "bare" and "corpora"

  @executable @cli @adapter @memory
  Scenario: the vocabularies are the four corpora and the four verbs, and are frozen
    Then the corpus vocabulary is exactly "work", "code", "operator" and "imports"
    And the verb vocabulary is exactly "ingest", "recall", "relations" and "status"
    And neither vocabulary can be added to at runtime
    And the shared record declaration maps exactly "work", "operator" and "imports", each to "ingest", "recall" and "status", and is frozen

  @executable @cli @adapter @memory
  Scenario: FF-17901 is a registered arch control that fails on a port with a fifth verb
    Given the arch control "acd-knowledge-engine-port" is registered in the memory arch index
    When the control runs against a port that also exposes "search"
    Then it fails naming the unexpected verb "search"
