@executable @cli @work @round-trip
Feature: this repository sets work.intake to backlog, and the SPEC's add → promote round trip is proved on a byte-faithful copy of the real stream

  ADR-005 §5: this repository sets `"backlog"` in `.aof/aof.config.json` as part of story 05 —
  the one config write in the milestone. The key is WRITE-side only (FF-12704): after it, the
  `aof:add-*` prompts land a new driver under `wiki/work/backlog/`, `promote` mints its number,
  and no reader changes its answer. This task is that write plus the FIRST HALF of the SPEC's
  outsider check — "adding an item and finding it under `backlog/` with no number; promoting it
  and finding it at the root with the next number, with `aof work find`, `validate`, `next` and
  the board all seeing the same item" — run over THIS stream's real shape rather than a
  fixture's, because the whole story is that the milestone is proved on the tree it was framed
  against.

  A TEST NEVER WRITES THE REAL TREE. The add / promote round trip mints a folder and a number;
  run against `wiki/work` it would leave a `131_milestone_…` in the operator's checkout. So the
  round trip runs on a SHAPE COPY: every record doc, `ARCHITECTURE.md`, `STATE.md` and task
  `.feature` under `wiki/work` (the three roots, `TECH_DEBT.md`, `ROADMAP.md`, `loops.md`
  included — measured 2.0 MB of `.md` + `.feature`; no `runs/`, no `mocks/`, no `reference/`
  `.mjs`) copied under a scratch project with this repository's own `.aof/aof.config.json`
  (`work.intake: "backlog"`) and an isolated `AOF_GLOBAL_HOME`. The copy has the real 130
  numbered folders (or, after task 01, the real live root and the real `archive/`), the real
  `depends:` edges, the real `32_uat` gate, the real `42_structural-overhaul` (a folder no
  `ITEM_RE` matches — it is not an item and the scanner ignores it, exactly as it ignores
  `TECH_DEBT.md`), so `next`'s candidacy walk, `validate`'s numbering lanes and the board's
  derivation run over the stream's actual shape. The "add" is what the `aof:add-milestone`
  prompt writes under `"backlog"` (02/05): `backlog/milestone_<slug>/SPEC.md` + `STATE.md`,
  frontmatter with `type`, `slug`, `title`, `status: not-started`, `depends: []` and NO
  `number:` — written directly by the test, since the prompt is prose and its own scenarios are
  02/05's. The "promote" is the real verb (02/00). The "board" is the real face,
  `handleWorkApi(request, response, { projectDir: <copy> })` (the `captureResponse` shim
  `test/support/board-face-fixture.mjs` already uses), never a stub of `/api/work/list`.

  THE WRITE ITSELF is one key under `work` in `.aof/aof.config.json`, placed after `dir` and
  before `agents` so the file's shape stays readable, two-space indented like its neighbours,
  and nothing else in the file moves — the diff is one line. `aof work validate` and `aof work
  doctor` are green over the real tree afterwards (from the repository root — doctor from a
  subdirectory reads an empty stream as healthy), FF-12704's allow-list is untouched (the token
  is in config, not in `src`), and `aof work init-config` over this repository reports
  `intakeWritten: false` (an existing `"backlog"` is kept — 02/04's fill-don't-clobber rule).

  What would quietly undo this: a round trip that copies `runs/` (heartbeats and run records
  are not shape, and the copy would take minutes); a copy that renames or renumbers anything;
  a test that shells `aof:add-milestone` (a prompt, not a verb); asserting the minted number as
  a literal `131` (the real tree's max moves — the test reads `max + 1` off the copy it made);
  the board check against `work:list` in-process rather than the HTTP face.

  ADR-005 §1, §3, §5; ADR-003 §1, §2; SPEC §Objective (the outsider check); 02/00, 02/04, 02/05.

  Scenario: the repository's config carries the intake key and nothing else moves
    Given the delivered `.aof/aof.config.json`
    When it is parsed and `git diff` over it is read at the story's commit
    Then `work.intake` is exactly the string `"backlog"`, placed between `work.dir` and `work.agents`, and the diff against the parent commit is exactly one added line
    And `aof work validate --json` from the repository root is `[]`, and `aof work doctor --json` from the repository root reports no `error`-level finding it did not report before the write
    And `aof work init-config --json` over the repository answers `intakeWritten: false` and leaves the file byte-identical
    And `test/arch/work/acd-intake-write-side-only.test.mjs` (FF-12704) is green — no `src` module outside its allow-list contains the token `intake`

  Scenario: an item added under intake backlog is found under backlog/ with no number, and every reader agrees it is not scheduled
    Given a shape copy of this repository's `wiki/work` under a scratch project carrying this repository's config, and an isolated global home
    When `backlog/milestone_search-across-the-fleet/SPEC.md` and `STATE.md` are written as the `aof:add-milestone` prompt writes them under `"backlog"` — no `number:` line, `status: not-started`
    Then `aof work find search-across-the-fleet --json` answers one row `{ ref: "search-across-the-fleet", type: "milestone", number: null, backlog: "", parent: null, status: "not-started", dir: <…/backlog/milestone_search-across-the-fleet> }`
    And `aof work validate --json` is `[]` and `aof work doctor --json` reports no finding naming the folder
    And `aof work next --json` proposes a `ref` that is not `search-across-the-fleet` and whose `readySet` does not contain it
    And `aof work list --json` carries the row with `number: null` after every live numbered row, and `GET /api/work/list` on the real face over the copy carries the same row with `number: null, backlog: ""`
    And `ls <copy>` holds no new folder at the root — the item is born un-numbered

  Scenario: promoting it mints the next number, moves the folder to the root, and find, validate, next and the board see one item
    Given the same copy with `search-across-the-fleet` in its backlog, and `MAX` the highest top-level number among the copy's live rows (`aof work list --json`, `parent: null`, `number != null`, `archived` absent)
    When `aof work promote search-across-the-fleet --json` runs from the copy's root
    Then the envelope's `created.ref` is `String(MAX + 1)`, the folder `<MAX+1>_milestone_search-across-the-fleet` exists at the root and `backlog/milestone_search-across-the-fleet` does not, and its `SPEC.md` frontmatter carries `number: <MAX+1>` on one line with every other line byte-identical
    And `aof work find <MAX+1> --json` and `aof work find search-across-the-fleet --json` each answer the SAME single row — `ref: "<MAX+1>"`, `number: "<MAX+1>"`, no `backlog` key, `dir` at the root
    And `aof work validate --json` is `[]` and `aof work doctor <MAX+1> --json` reports no `error`
    And `aof work next <MAX+1> --json` answers `state: "ready"` for `<MAX+1>` (`depends: []`), and the unscoped `aof work next --json`'s `readySet` contains `<MAX+1>`
    And `GET /api/work/list` on the real face over the copy carries `<MAX+1>` with the frozen seven keys, and `deriveBoard` over that envelope's `items` places it in `milestones` and not in `backlog`
    And no other row of `aof work list --all --json` changed between the two reads — the promotion appended and shifted nothing (ADR-003 §2)

  Scenario: the shape copy is faithful to the stream it copies
    Given the shape copy
    When `aof work list --all --json` runs over the copy and over the real tree (both from their roots, both under isolated global homes)
    Then the two arrays are equal on every `ref`, `type`, `slug`, `status`, `parent`, `number`, `backlog` and `archived` — only `dir` differs, by the copy's root prefix
    And `aof work validate --json` over the copy equals `aof work validate --json` over the real tree
