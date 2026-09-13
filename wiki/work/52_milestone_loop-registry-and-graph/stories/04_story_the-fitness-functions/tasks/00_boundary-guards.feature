@executable @cli @work @validate
Feature: The boundary guards — the loop vocabulary never enters ITEM_RE, and the registry is the only door

  Two gates, one boundary. FF-5201 (`test/arch/acd-loop-registry-not-an-item-type.test.mjs`)
  holds the item vocabulary closed at six types across all four of its physical sites and
  holds this milestone to its no-writer promise. FF-5202
  (`test/arch/acd-loop-module-import-boundary.test.mjs`) holds the import surface: exactly
  `parseFrontmatter` in from the god-node, and nothing out — no module under `src/work.mjs`,
  `src/work-doctor*.mjs`, `src/cli.mjs` or `ui/` may name a loop module or a loop command id,
  so `src/command-core.mjs`'s registry is the only way in. ADR-001, ADR-003, ADR-007, ADR-009,
  ADR-011. Both gates read CALL FORM with comments stripped, and both are asserted non-vacuous:
  the vocabulary sweep must find a parseable alternation, and the reverse sweep must have
  actually read the trees it clears.
  The no-writer promise is held in TWO legs, because the static half alone is not decidable —
  a grep sees `writeFile(target, …)` and cannot see that `target` resolves under `loops/`.
  Leg (a) is a call-form tripwire over the loop modules: no write verb at all, whatever its
  argument. Leg (b) is the real guarantee and is dynamic: snapshot the fixture registry's file
  list AND every byte, drive the loader and all three verbs over it, and assert nothing moved.

  Scenario: the ITEM_RE alternation in src/work.mjs is exactly the six item types
    Given the ITEM_RE literal in `src/work.mjs`
    When the type alternation is extracted
    Then the alternation is parseable — the gate is not reading nothing
    And the admitted set is exactly milestone, story, task, uat, spike, chore
    And the set holds no `loop` token and no `loops` token

  Scenario: a diff adding a loop token to src/work.mjs's ITEM_RE fails the gate
    Given the ITEM_RE alternation with `loop` appended as a seventh type
    When the gate reads the alternation
    Then the gate fails, naming `src/work.mjs` and the added token
    And it fails for `loops` in the same position

  Scenario: each ITEM_RE copy carries the same six-type alternation and no loop token
    Given the ITEM_RE copies in `src/work-doctor.mjs` and `src/commands/migrate-folder.mjs`
    When each alternation is extracted
    Then each is exactly the same six tokens as `src/work.mjs`'s
    And none holds a `loop` or `loops` token
    And a copy that has drifted from `src/work.mjs`'s set fails the gate

  Scenario: the board's TS union is exactly the six item types
    Given the `WorkItem["type"]` union in `ui/src/board/api.ts`
    When the union's string literals are extracted
    Then they are exactly "milestone", "story", "task", "uat", "spike", "chore"
    And a diff adding `| "loop"` to that union fails the gate

  Scenario: the vocabulary sweep reads call form, not comments
    Given a comment beside `ITEM_RE` that uses the word "loop" in prose
    When the gate reads the alternation
    Then the gate passes — the token is in a stripped comment, not in the literal
    And the same token inside the alternation itself fails

  Scenario: no loop module carries a write call form at all
    Given the five loop modules — `src/work-loops.mjs`, `src/work-loops-checks.mjs`, `src/commands/loops-show.mjs`, `src/commands/loops-graph.mjs`, `src/commands/loops-validate.mjs` — with comments stripped
    When each is read for the write verbs `writeFile`, `appendFile`, `mkdir`, `rm`, `rename` and `open` with a write mode
    Then no call site of any of them appears, whatever its argument
    And the tripwire does not ask where the argument resolves — that question is not decidable by reading
    And the sweep reports the modules it read, so a zero-module sweep fails

  Scenario: a diff adding any write call to a loop module fails the tripwire
    Given `writeFile(path.join(workDir, "loops", slug + ".md"), text)` added to `src/work-loops.mjs`
    When the gate reads the write call sites
    Then the gate fails, naming the module and the call
    And it fails identically for `mkdir(dir)`, `appendFile(f, s)`, `rename(a, b)` and `open(f, "w")`
    And it fails even where the target is a computed variable the gate cannot resolve

  Scenario: driving the whole surface over a fixture registry leaves the directory byte-unchanged
    Given a fixture workspace whose `<work.dir>/loops/` holds records
    And a recorded snapshot of that directory's file list and of every file's bytes
    When the loader runs and all three `work:loops` verbs run over it
    Then the directory's file list is unchanged — no file added, none removed, none renamed
    And every file's bytes are unchanged — the no-writer promise proved by effect, not only by grep

  Scenario: a write the tripwire cannot see still fails the byte-unchanged leg
    Given a loop module that writes through an indirection the call-form sweep does not name
    When the loader and the three verbs run over the fixture registry
    Then the file list or the byte snapshot differs, and the gate fails
    And this is why the promise is held dynamically and not by the grep alone

  Scenario: the loop modules import exactly parseFrontmatter from work.mjs
    Given each loop module — `src/work-loops.mjs`, `src/work-loops-checks.mjs`, `src/commands/loops-show.mjs`, `src/commands/loops-graph.mjs`, `src/commands/loops-validate.mjs`
    When its import statements are parsed
    Then any import whose specifier resolves to `work.mjs` has named bindings exactly `{ parseFrontmatter }`
    And the module set the gate discovers is non-empty

  Scenario: a second named binding from work.mjs fails the gate
    Given `import { parseFrontmatter, listItems } from "./work.mjs"` in `src/work-loops.mjs`
    When the gate parses the import
    Then the gate fails, naming the extra binding `listItems`
    And it fails identically for `ITEM_RE`, `validateWork` or any other second binding

  Scenario: a default or namespace import of work.mjs fails the gate
    Given `import * as work from "./work.mjs"` in a loop module
    When the gate parses the import
    Then the gate fails — a namespace import is every binding, which is not exactly one
    And `import work from "./work.mjs"` fails the same way

  Scenario: nothing in the god-node, doctor, the CLI or the UI references a loop module
    Given `src/work.mjs`, every `src/work-doctor*.mjs`, `src/cli.mjs` and every source file under `ui/`
    When each is read with comments stripped
    Then none carries `work-loops`, `loops-show`, `loops-graph`, `loops-validate` or `work:loops-`
    And the sweep reports the number of files it read, so a zero-file sweep fails

  Scenario: a diff importing a loop module into doctor fails the gate
    Given `import { loadLoops } from "./work-loops.mjs"` added to `src/work-doctor.mjs`
    When the reverse sweep runs
    Then the gate fails, naming `src/work-doctor.mjs`
    And it fails identically for a `getCommand("work:loops-validate")` call added to `src/cli.mjs`

  Scenario: the reverse sweep is token-scoped, so the English word "loop" does not fail it
    Given `src/work.mjs` carries the prose "the story-loop returns" in a comment
    And thirteen files under `ui/src` use the words "loop" or "loops" in comments today
    When the reverse sweep runs
    Then the gate passes — it matches the five registry tokens, not the English word
    And a bare `loops` substring sweep is not what the gate does, because it would fail on those thirteen files today

  Examples:
    | guarded site                              | token / import / call that must be absent                                 | how the gate reads it                          |
    | src/work.mjs ITEM_RE alternation          | loop, loops                                                               | alternation literal, comments stripped         |
    | src/work-doctor.mjs ITEM_RE copy          | loop, loops                                                               | alternation literal, comments stripped         |
    | src/commands/migrate-folder.mjs ITEM_RE   | loop, loops                                                               | alternation literal, comments stripped         |
    | ui/src/board/api.ts WorkItem type union   | "loop", "loops"                                                           | union string literals, comments stripped       |
    | the five loop modules — write call form   | writeFile, appendFile, mkdir, rm, rename, open(…,"w") — any argument      | leg (a) call-form tripwire, comments stripped  |
    | the fixture <work.dir>/loops/ directory   | any change to the file list or to any file's bytes                        | leg (b) snapshot, run loader + three verbs, re-compare |
    | src/work-loops.mjs → ./work.mjs           | any named binding other than parseFrontmatter                             | import-statement parse                         |
    | src/work-loops-checks.mjs → ./work.mjs    | any named binding other than parseFrontmatter                             | import-statement parse                         |
    | src/commands/loops-show.mjs → ../work.mjs | any named binding other than parseFrontmatter                             | import-statement parse                         |
    | src/commands/loops-graph.mjs → ../work.mjs| any named binding other than parseFrontmatter                             | import-statement parse                         |
    | src/commands/loops-validate.mjs → ../work.mjs | any named binding other than parseFrontmatter                         | import-statement parse                         |
    | src/work.mjs                              | work-loops, loops-show, loops-graph, loops-validate, work:loops-           | reverse token sweep, comments stripped         |
    | src/work-doctor*.mjs                      | work-loops, loops-show, loops-graph, loops-validate, work:loops-           | reverse token sweep, comments stripped         |
    | src/cli.mjs                               | work-loops, loops-show, loops-graph, loops-validate, work:loops-           | reverse token sweep, comments stripped         |
    | ui/** source files                        | work-loops, loops-show, loops-graph, loops-validate, work:loops-           | reverse token sweep, comments stripped         |
