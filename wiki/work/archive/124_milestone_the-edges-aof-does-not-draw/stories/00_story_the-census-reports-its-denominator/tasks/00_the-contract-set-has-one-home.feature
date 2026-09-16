@executable @cli @planning @validate
Feature: The contract set gets one home, and a directory is whatever the author wrote

  `src/story-contract.mjs` is 138 lines with a single import — `node:path`, line 1 — and no project
  import at all: no `node:fs`, no `readFile`, no `stat`, no `process.cwd`. Three source modules read
  it (`src/commands/validate.mjs:20`, `src/ready-wave.mjs:4`, `src/work/test-declared.mjs:35`). The
  two functions worth sharing are `storyContractList(text, key)` (`:71-94`, answering
  `{present, malformed, values}`) and `resolveStoryContractPath(entry, {storyDir, projectRoot})`
  (`:96-114`).

  One structural fact decides the shape of what is added here. `resolveStoryContractPath` returns
  `projectPath` through `path.relative` (`:107`), which never returns a trailing slash — so
  `src/commands/` and `src/commands` resolve to the same string and the authored slash is gone before
  any consumer sees it. Directory intent cannot be recovered downstream: it has to leave the resolver
  as its own answer, or be read off the raw entry before resolution.

  Authored, never probed, and that choice is measured rather than argued. Across the 303 `STORY.md`
  documents in this stream (`find wiki/work -name STORY.md | wc -l`), 71 carry a `reads:`/`files:`
  key and 1,569 entries are declared in total — 889 under `reads:`, 680 under `files:`. Exactly
  **8** are authored with a trailing `/`, all under `files:`, all in milestone 119's four stories
  (`grep -rn --include=STORY.md -E "^ *- *[A-Za-z0-9_./-]+/$" wiki/work`), and **0** of the 1,569
  resolve to a real on-disk directory without one (`statSync().isDirectory()` over every entry the
  resolver accepts). A lexical rule therefore reproduces a disk-probing reading of this stream
  exactly, for no `stat` at all.

  What would quietly undo this: a `stat` slipped into the predicate "just to be sure", which makes
  the answer depend on whether a path exists yet — precisely when a write-set collision matters most;
  a `startsWith` without the authored slash, under which `src/commands` swallows
  `src/commands-old.mjs`; a second coverage rule authored in a consumer because the shared one
  "answers slightly differently"; and a change to `resolveStoryContractPath`'s existing return shape,
  which three modules already read.

  ADR-003 §1, §2. FF-12403.

  Scenario: the leaf gains two answers and reaches nothing new
    Given `src/story-contract.mjs` as it stands before this story
    When the coverage predicate and the declared-set resolver have been added to it
    Then the module still spells no `node:fs`, no `readFile`, no `stat` and no `process.cwd`
    And it still imports no project module
    And `test/work/story-context-contract.test.mjs` passes unchanged, so no existing caller's answer moved
    And `src/commands/validate.mjs`, `src/work/test-declared.mjs` and `src/ready-wave.mjs` each still call it with the arguments they call it with today

  Scenario: directory intent survives the resolver that strips it
    Given the declared entries `src/commands/` and `src/commands`
    When each is resolved through the shared home
    Then both resolve to the same project path `src/commands`
    And only the first is reported as carrying a directory's intent
    And `resolveStoryContractPath`'s own return keys and values are unchanged for both

  Scenario Outline: an entry covers another only when equal, or authored as a directory above it
    Given a declared set holding <declared>
    When the predicate is asked whether that set covers <probed>
    Then it answers <covers>
    And it reads no file, stats no path and calls no `process.cwd` to decide

    Examples: the rule, its boundary, and the two real 119 shapes
      | declared              | probed                     | covers | why                                                              |
      | src/commands/test.mjs | src/commands/test.mjs      | yes    | equal                                                            |
      | src/commands/         | src/commands               | yes    | equal once resolved — the leg that keeps the adoption a tightening |
      | src/commands/         | src/commands/test.mjs      | yes    | authored directory, probed path beneath it                       |
      | src/commands/         | src/commands/mesh/gate.mjs | yes    | beneath it at any depth                                          |
      | src/commands          | src/commands/test.mjs      | no     | no authored slash, so no directory was claimed                   |
      | src/commands/         | src/commands-old.mjs       | no     | a shared prefix is not containment — the separator is required   |
      | src/commands/test.mjs | src/commands               | no     | a file covers no directory                                       |
      | test/                 | test/arch/work/index.mjs   | yes    | 119/03's declared read against 119/02's declared write           |
      | src/                  | src/commands/test.mjs      | yes    | 119/04's declared read against 119/01's declared write           |

  Scenario Outline: the four answers a declared key can give stay four different answers
    Given a `STORY.md` whose `files:` key is <declaration>
    When the shared resolver is asked for that story's write set
    Then it answers <answer>

    Examples: the resolution rules that live here rather than in each consumer
      | declaration                                | answer                                                        |
      | absent entirely                            | unknown — the story has declared nothing                      |
      | an empty list beside a non-empty `reads:`  | a real empty set — the story genuinely writes nothing         |
      | an empty list with no `reads:` either      | unknown — an untouched scaffold is not a claim                |
      | an inline list that never closes           | unknown, and reported malformed rather than empty             |
      | a list holding one absolute path           | unknown — a single unresolvable entry poisons the whole set   |
      | a list holding one `..`-escaping path      | unknown — same rule, same reason                              |
      | a list of two, the second ending in `/`    | a set of two, the second carrying directory intent            |
