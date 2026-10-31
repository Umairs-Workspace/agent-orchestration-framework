Feature: The port routes each verb to the one backend that declared the corpus, and reports an unserved pair as a fact

  WHY. Today `aof memory` and `aof graph` each drive graphify on their own. One port with four verbs,
  routed by what each backend declares it serves, is the seam a later engine plugs into. A question
  no backend declared is answered as "nobody here holds that", the way `graph impact` reports
  `present: false`, never by a backend that did not offer it (179/ADR-001).

  THE FIXTURE: two in-memory stub backends that record every call they receive.
  - "records" declares work, operator and imports, each with ingest, recall and status. Its methods
    are reindex, recall and status.
  - "edges" declares code with ingest, relations and status. Its methods are ingest, relations and
    status.

  Each stub answers with its own name and the arguments it was given.

  @executable @cli @adapter @memory
  Scenario: the port answers exactly four verbs
    Given a port composed over "records" and "edges"
    Then the port exposes exactly "ingest", "recall", "relations" and "status"

  @executable @cli @adapter @memory
  Scenario Outline: each verb reaches the backend that declared its pair
    Given a port composed over "records" and "edges"
    When the port is asked <call>
    Then backend "<backend>" receives <received>
    And no other backend receives any call

    Examples:
      | call                                        | backend | received                                  |
      | recall "pin line endings" scoped to area adr | records | recall "pin line endings" with that scope |
      | relations of "a.mjs" and "b.mjs"            | edges   | relations of "a.mjs" and "b.mjs"          |
      | ingest of "code" with path "."              | edges   | ingest of "code" with path "."            |
      | status of "operator"                        | records | status                                    |

  @executable @cli @adapter @memory
  Scenario Outline: a record backend's ingest is its reindex
    Given a port composed over "records" and "edges"
    When the port is asked to ingest "<corpus>" with <input>
    Then "records" receives reindex with only <only>

    Examples:
      | corpus  | input               | only |
      | work    | only "39"           | "39" |
      | work    | no input            | null |
      | imports | only "13"           | "13" |

  @executable @cli @adapter @memory
  Scenario Outline: an unserved pair is answered by the port, and no backend is called
    Given a port composed over "records" and "edges"
    When the port is asked <call>
    Then the answer is served false with code "corpus-unserved", corpus "<corpus>" and verb "<verb>"
    And the answer names the registered backends "records" and "edges"
    And no backend receives any call

    Examples:
      | call                         | corpus | verb      |
      | to ingest "planning"         | planning | ingest  |
      | status of "planning"         | planning | status  |

  @executable @cli @adapter @memory
  Scenario: a port without a code backend reports relations as unserved
    Given a port composed over "records" alone
    When the port is asked relations of "a.mjs"
    Then the answer is served false with code "corpus-unserved", corpus "code" and verb "relations"

  @executable @cli @adapter @memory
  Scenario: a port without a record backend reports recall as unserved
    Given a port composed over "edges" alone
    When the port is asked recall "anything"
    Then the answer is served false with code "corpus-unserved", corpus "work" and verb "recall"

  @executable @cli @adapter @memory
  Scenario: status with no corpus answers every declared corpus by name
    Given a port composed over "records" and "edges"
    When the port is asked status with no corpus
    Then the answer is keyed by exactly "work", "operator", "imports" and "code"
    And each key holds the status its declaring backend returned
