@executable @cli @work @work-stream
Feature: the move raises stream.archived through the stream seam, its one reactor publishes the new dir, and the one runtime reader of a live item path resolves by ref

  A stream mutation has ONE home for its consequences: the effects table (m42 wave (d)), where a
  new mutation opts in by adding a row, and ONE raiser per store: the store's transition seam,
  which is the only src module beside the journal allowed to `appendEvent` (the effects ledger's
  `APPEND_EVENT_ALLOWED`). The insert cascade is the precedent — `transitionStreamReindexed` in
  `src/effects/stream-transitions.mjs`: the item lock in front, `reindexForInsert` as the fact,
  `stream.reindexed` as the event, four remaps and the publish as its reactors. An archive is the
  same shape with LESS in it: no ref changes, so nothing is remapped, and the whole cascade is the
  publish (ADR-004 §4: "publish, don't renumber").

  THE ENGINE LIVES BESIDE THE SEAM'S OTHER ENGINE, NOT INSIDE THE COMMAND — a placement decision
  ratified in this beat (ADR-004 §1 names `src/commands/archive.mjs` as the verb; it stays the verb).
  The seam imports its fact-writer (`reindexForInsert` from `src/work/reindex.mjs`, `setItemStatus`
  from `src/work.mjs`, `appendRawFeedback` from `src/feedback-records.mjs` — never a command), and
  the command imports the seam, so a fact-writer inside `src/commands/archive.mjs` would close a
  cycle. `archiveItems(workDir, { names })` and `rewriteCrossingLinks` therefore live in
  `src/work/archive.mjs`, `reindex.mjs`'s twin: pure filesystem, no effects import, no reindex
  import, no `number:` write (FF-12705 sweeps this file too — task 05). `src/work` 41 → 42, stated
  (task 00). The face stays thin and the seam stays the one door.

  THE SEAM. `transitionStreamArchived(workspace, { names }, opts)` in
  `src/effects/stream-transitions.mjs`, `opts = { publisherOptions, journalOptions, drain = true }`:
    (0) THE LOCK — `guardItemLock` over every ref that moves (each driver and each of its stories),
        with `lockContextFor(workspace, publisherOptions)`; a held ref refuses with the lock's own
        `item-locked` code naming the holder, before any rename;
    (1) THE FACT — `archiveItems`, the rename pass then the rewrite pass (task 01);
    (2) THE EVENT — `stream.archived`, past tense, payload `{ workspaceRoot, workspaceId,
        archived: [{ ref, name, from, to }], rewritten: [{ path, links }] }`, `source:
        "stream-transition"`, appended to the effects journal and drained; the journal's own health
        never gates the move (a journal that fails to open degrades to the ephemeral run, the d2
        rule) — the fact stands and the cascade is paid.
  It returns the engine's `{ archived, rewritten }` plus `eventId` and the per-reactor `effects`.

  THE ROW. `EFFECTS["stream.archived"]` is exactly `[{ key: "publish-projection", locus: "local",
  apply: publishItemProjection }]` — the same reactor every other mutation declares, because "the
  item reached the board and the fleet" is one consequence with one home. The snapshot it publishes
  is re-derived from disk through `listItems` (three roots, 127/01), so the archived driver and its
  stories are upserted at the SAME refs with their NEW `source_path` — the cache never answers the
  old folder for a ref it already knows, and `aof work find 12` on a cache-first node answers a
  `dir` under `archive/` on the tick after the move rather than whenever a later publish happened
  to run. No remap reactor is declared: a ref that did not change has nothing to remap.

  THE PATH-READERS — TWO, NOT ONE. The SPEC counted one runtime reader of a live item path
  outside `wiki/`: `test/arch/planning/acd-tune-carries-no-second-rule.test.mjs:21`, which reads
  `wiki/work/62_milestone_self-improvement-loop/stories/04_story_the-tuners-face/STORY.md` by
  literal path at module load. Re-measured at this refine (`grep -rnE "wiki/work/[0-9]+_" src
  test scripts`, every match read), there is a second:
  `test/arch/command/acd-declared-program-single-speller.test.mjs:283-288` `readFile`s
  `wiki/work/72_milestone_inner-loop/stories/00_story_the-declared-toolchain/tasks/00_the-runner-is-declared-or-there-is-no-run.feature`
  as its non-vacuity contract. Both `62` and `72` are `done`, so 05's `--done` moves both and
  both tests would go red. Each is rewritten to resolve its item through `findWork` at RUN time —
  `findWork(workDir, "62/04")[0].dir` and `findWork(workDir, "72/00")[0].dir` — with the reading
  test's `run` made async, so no future move touches either again (ADR-004 §3). Every OTHER match
  of that grep is not a reader: a comment, a path a fixture plants in a scratch tree
  (`00_milestone_plant`, `99_milestone_probe`, `26_milestone_x`, `62_milestone_fixture`), a
  string inside a probe's own source, or a `git check-attr` PATTERN probe
  (`26_milestone_distributed-runs-leasing/…` in `acd-runs-eol-pinned` and
  `acd-loop-document-eol-pinned`, which match attributes and need no file to exist). The retired
  suites under `35_…/reference/retired-dispatch-tests/` are NOT touched: they move with their
  folder and are in no runner.

  What would quietly undo this: a command that calls `archiveItems` directly and raises no event
  (the `acd-stream-reindex-cascade` shape of failure — asserted here for the archive engine: no
  src module outside the seam calls `archiveItems(`); a second `guardItemLock` inside the command
  duplicating the seam's; a payload that names refs the engine did not move; a snapshot publish
  that filters archived rows out and so DELETES the moved item from the cache.

  ADR-004 §3, §4, §5; m42 wave (d) leg d4; 41/ADR-001; FF-12705.

  Scenario: the move raises exactly one stream.archived event carrying what moved, and the publish is its one reactor
    Given the archive fixture, driven in-process with an effects journal under a hermetic AOF_GLOBAL_HOME
    When `invoke("work:archive", { ref: "12" }, { workspace, effectsJournalOptions })` runs
    Then the journal holds exactly one event of name `stream.archived` and no event of any other name for the move
    And its payload is `{ workspaceRoot: <root>, workspaceId: <the resolved id or null>, archived: [{ ref: "12", name: "12_milestone_theta", from: <root>/12_milestone_theta, to: <root>/archive/12_milestone_theta }], rewritten: [...] }` with `rewritten` byte-equal to the envelope's
    And its steps are exactly `[publish-projection]`, each settled after the drain
    And `EFFECTS["stream.archived"]` is exactly one reactor `{ key: "publish-projection", locus: "local" }`

  Scenario: the fleet cache follows the move at the same ref
    Given the item-lock fixture (a mesh-configured workspace with a real global store), with the archive fixture's rows planted into its stream and one snapshot published so the store holds `12` at `<root>/wiki/work/12_milestone_theta/SPEC.md`
    When `invoke("work:archive", { ref: "12" }, fx.ctx)` runs and the drain settles
    Then `readWorkspaceItems(store, workspaceId)` holds `12` and `12/00` at the SAME refs with `source_path` under `<root>/wiki/work/archive/12_milestone_theta/`, `status: "done"`, and no row for the old path
    And every other row in the store is byte-identical to before the move
    And `aof work find 12 --json` run from the fixture root answers a `dir` under `archive/12_milestone_theta` with `answeredFrom: "cache"` when the cache answers, and the same `dir` from disk when it does not

  Scenario: a held ref refuses the move through the lock the seam already has
    Given the item-lock fixture with the archive fixture's rows planted, and an ACTIVE assignment seeded on `12`
    When `invoke("work:archive", { ref: "12" }, fx.ctx)` runs
    Then it is refused with the item-lock's own `item-locked` code naming the holder of `12`, and no folder moved and no `.md` file changed
    Given the same fixture with the assignment seeded on `12/00` instead
    When `invoke("work:archive", { ref: "12" }, fx.ctx)` runs
    Then it is refused the same way — a driver's stories are in the guarded set — and nothing moved
    Given the same fixture with the assignment seeded on `13`
    When `invoke("work:archive", { done: true, yes: true }, fx.ctx)` runs
    Then the WHOLE run is refused naming `13`, and `12` did not move either

  Scenario: the engine is reachable only through the seam, and the seam owes the journal nothing it cannot pay
    Given the delivered tree
    When every `src/**` module is swept for `archiveItems(` over comment-stripped source
    Then the callers are exactly `src/effects/stream-transitions.mjs` — `src/commands/archive.mjs` calls `transitionStreamArchived` and never the engine
    And `src/work/archive.mjs` imports nothing from `src/effects/`, `src/work/reindex.mjs`, `src/commands/` or `src/work.mjs`'s writers — its imports are `node:fs/promises`, `node:path` and `src/work.mjs`'s readers (`ITEM_RE`, `listItems`) at most
    When `transitionStreamArchived` runs with `journalOptions` pointing at an unwritable global home
    Then the move still lands, the result carries `eventId: null`, and the publish ran ephemerally (the d2 rule: the ledger's health never gates the cascade)

  Scenario Outline: the two path-readers resolve their item by ref and survive its milestone being archived
    Given `<test>` after this task
    When its source is read
    Then it contains no literal `<literal>` path and reaches the item through `findWork(` with the ref `"<ref>"`, inside an async `run`
    When `wiki/work/<folder>` is moved under `wiki/work/archive/` in a scratch copy of the repository and the control runs there as a focused suite
    Then it is green — the file it reads comes from the archived folder
    And run at HEAD with nothing moved, it is green too

    Examples: the two readers the grep finds, and the item each reads
      | test                                                         | literal              | ref   | folder                                 | reads                                                  |
      | test/arch/planning/acd-tune-carries-no-second-rule.test.mjs  | 62_milestone_        | 62/04 | 62_milestone_self-improvement-loop     | the story's `files:` line                              |
      | test/arch/command/acd-declared-program-single-speller.test.mjs | 72_milestone_      | 72/00 | 72_milestone_inner-loop                | `tasks/00_the-runner-is-declared-or-there-is-no-run.feature` |

  Scenario: no third path-reader is left, and every remaining match is classified
    Given the delivered tree
    When `grep -rnE "wiki/work/[0-9]+_" src test scripts --include=*.mjs` runs and every match is read
    Then no match `readFile`s, `existsSync`s or `import`s a path under a real item folder — each is a comment, a path a fixture plants in its own scratch tree, a string inside a probe's source, or a `git check-attr` pattern probe that needs no file
    And the classification is recorded, one line per match, in the milestone `VERIFICATION.md` under this story
