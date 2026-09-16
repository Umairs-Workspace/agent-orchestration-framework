@executable @cli @work @memory
Feature: the memory index reads an OUTCOME.md from any item that carries one, and cites it by ref

  THE CONSUMER IS NOT AS READY AS THE STORY SAYS — MEASURED WHILE AUTHORING THIS CONTRACT.
  `buildRecords` does join `OUTCOME.md` onto `item.dir` and parse it whatever the type
  (`src/memory/local-indexing.mjs:676`), but the set it scans is
  `items.filter(item => item.type === "milestone" && item.parent == null)` (`:644`). A story's or a
  chore's outcome is never opened. So the aggregation surface the story's `## Why` calls "already
  built" reaches only milestones, and this task is the load-bearing half of the ask, not a follow-on.

  `item` MUST CARRY THE REF, NOT THE NUMBER. A record carries `item: item.number`, and recall renders
  its citation as `m${record.item}` (`src/memory/local-retrieval.mjs:323`). For a top-level item
  `ref === number`, so this is a NO-OP for every record that exists today. For a nested story `39/02`
  the number is `02` and the citation would read `m02` — a different milestone's ref, pointing at a
  real item that delivered something else. The ref is what the `m?<itemRef>/<ID>` citation grammar
  already expects, so this makes the rendered citation true rather than inventing a form.

  WHICH FORCES THE SCOPE FILTER TO BE SUBTREE-AWARE. `--item NN` matches
  `String(record.item) === String(value)` (`local-retrieval.mjs:73`). Once a nested story's records
  carry `39/02`, a milestone-scoped recall stops seeing its own stories' deliveries — the exact
  aggregation the story wants, broken by the fix that makes citations true. Widen the match to the
  subtree by MIRRORING the predicate `inScope` already applies (`src/work-doctor.mjs:618`) rather than
  authoring a second one. The `--only NN` rebuild scope needs the same treatment for the same reason.

  THE READ IS PATH-DRIVEN; THE TYPE RULE HAS ONE HOME. The index reads an OUTCOME.md wherever it
  finds one and does not consult the item's type. Which types are ENTITLED to one is decided at
  authoring (task 01, the verify prompt) and nowhere else — a second list of delivering types here
  would be a copy free to drift from the first.

  THE SEAM DOES NOT FORK. This is one edit inside `buildRecords`, the shared record-source both
  backends consume (39/ADR-002, the graph-verified two-importer seam) — no graphify-only widening,
  no new parser in a backend, and no field added to the frozen `MemoryRecord`.

  Scenario Outline: an OUTCOME.md is read from any item that carries one
    Given a work stream containing <item>
    When I run "aof work memory ingest"
    Then <count> capability records are produced for it

    Examples:
      | item                                              | count      |
      | a top-level milestone with an authored OUTCOME.md | at least 1 |
      | a story under that milestone with one             | at least 1 |
      | a parentless story with one                       | at least 1 |
      | a chore with one                                  | at least 1 |
      | a spike carrying an OUTCOME.md                    | at least 1 |
      | a uat carrying no OUTCOME.md                      | 0          |
      | a milestone carrying no OUTCOME.md                | 0          |

  Scenario: a nested item's records carry its full ref, and today's records are unchanged
    Given a milestone at ref "39" and a story under it at ref "39/02", each with an authored OUTCOME.md
    When I run "aof work memory ingest"
    Then every capability record from the story carries `item: "39/02"`
    And every capability record from the milestone carries `item: "39"`
    And a recall that surfaces the story's capability renders its citation as "m39/02"
    And no record produced from a top-level item changes its `item` value from before this story

  Scenario Outline: an --item recall scope matches the item and its subtree
    Given ingested outcomes for milestone "39", stories "39/02" and "39/03", and parentless story "80"
    When I run "aof work memory recall <query> --item <scope>"
    Then the block carries records from <matches> and from nothing else

    Examples:
      | scope | matches                  |
      | 39    | 39, 39/02 and 39/03      |
      | 39/02 | 39/02                    |
      | 80    | 80                       |
      | 41    | nothing — an empty block |

  Scenario: an unresolved scope returns an empty block rather than throwing
    Given an ingested stream
    When I run "aof work memory recall <query> --item 999"
    Then the command exits 0
    And the block is empty
    And no error envelope is emitted

  Scenario: a milestone-scoped rebuild includes its stories' and its own outcomes, and no other item's
    Given a stream where milestones "39" and "40" each carry stories with authored outcomes
    When I run "aof work memory ingest --only 39"
    Then the index carries the capability records of milestone 39 and of every story under it
    And it carries none from milestone 40 or any story under it

  Scenario: the widening is one edit at the shared seam
    Given the memory backends
    When I read where the source parsers are defined and where each backend gets its records
    Then no source parser is defined in the local backend or the graphify backend
    And the graphify backend's record source is the imported `buildRecords`
    And `INDEX_VERSION` and `GRAPHIFY_INDEX_VERSION` are equal and unchanged
    And the delivery records carry exactly the frozen MemoryRecord fields — none added, none omitted

  Scenario: a stream with no OUTCOME.md anywhere indexes exactly as before
    Given a work stream in which no item carries an OUTCOME.md
    When I run "aof work memory ingest"
    Then no capability record and no gap record is produced
    And the ADR, retrospective and digest records are identical to the run before this story

  # The shipped template's own placeholders must not become delivery records for the new types either
  # — a story accepted before its outcome is authored would otherwise index "<Capability name>".
  Scenario Outline: an unauthored placeholder heading yields no record, whatever item carries it
    Given a <type> whose OUTCOME.md is the freshly instantiated template
    When I run "aof work memory ingest"
    Then no capability record and no gap record is produced for it

    Examples:
      | type      |
      | milestone |
      | story     |
      | chore     |
