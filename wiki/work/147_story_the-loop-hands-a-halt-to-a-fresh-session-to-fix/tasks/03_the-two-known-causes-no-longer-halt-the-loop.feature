@executable @cli @work @work-stream
Feature: the two known causes no longer halt the loop

  WHY. Both motivating halts (a downstream milestone 03, 2026-10-03) came from the loop's own
  records. A lane commit's `git add -A` captured a live heartbeat queue, and two lanes' build notes
  conflicted in the one milestone `STATE.md`. A repair session is for halts nobody has foreseen yet.
  These two are removed at the source.

  Both fixes use the self-contained nested-file idiom `.aof/.gitignore` already uses
  (`aof-gitignore.mjs`), at the work dir. `aof work init` and `aof work update` ensure
  `<work.dir>/.gitignore` holds `**/runs/.heartbeats.ndjson` and `**/runs/.heartbeats.ndjson.batch`.
  They also ensure `<work.dir>/.gitattributes` holds `STATE.md merge=union`. The one commit verb
  (`commitWorktreeChanges`) never stages a heartbeat queue, and removes one an earlier commit
  tracked from the index. The file stays on disk, where the new ignore covers it.

  Rule: R4 · The two known causes no longer halt the loop

    Scenario: E10 · a heartbeat queue left by a lane's session is not committed, and the lane cleans up
      Given a git repository whose work dir has the ensured ignore file
      And lane `03/03` whose session changed `src/a.mjs` and wrote `wiki/work/03_milestone_x/stories/03_story_y/runs/.heartbeats.ndjson`
      When the lane is committed with `commitDispatchLane`
      Then the lane's commit contains `src/a.mjs` and no `.heartbeats.ndjson` path
      And `laneChanges` for the lane answers no path
      And `cleanupDispatchLane` removes the lane

    Scenario: a heartbeat queue an earlier commit tracked is removed from the index by the next lane commit
      Given a git repository that tracks `wiki/work/03_milestone_x/stories/03_story_y/runs/.heartbeats.ndjson`
      And lane `03/03` whose session appended a line to that file
      When the lane is committed with `commitDispatchLane`
      Then the lane's commit deletes that path from the index
      And the file is still on disk in the lane, and `git status --porcelain` in the lane is empty

    Scenario Outline: every heartbeat queue path is kept out of a commit
      Given a session wrote `<path>` in a worktree with the ensured ignore file
      When `commitWorktreeChanges` commits that worktree with no `paths`
      Then the commit contains no `<path>`

      Examples:
        | path                                                               |
        | wiki/work/03_milestone_x/runs/.heartbeats.ndjson                    |
        | wiki/work/03_milestone_x/stories/03_story_y/runs/.heartbeats.ndjson |
        | wiki/work/03_milestone_x/stories/03_story_y/runs/.heartbeats.ndjson.batch |
        | wiki/work/archive/07_story_z/runs/.heartbeats.ndjson                |

    Scenario: E11 · two lanes appending build notes to the milestone STATE.md both merge home
      Given a git repository whose work dir has the ensured attributes file
      And lanes `03/01` and `03/02` each appended a different `## Build notes` paragraph to the end of `wiki/work/03_milestone_x/STATE.md`
      When the loop merges `03/01` home and then `03/02` home with `mergeDispatchLaneHome`
      Then the second merge answers outcome `merged`, not `conflict`
      And the primary's `STATE.md` holds both paragraphs

    Scenario: a conflict on any other file still halts the loop
      Given lanes `03/01` and `03/02` each changed the same line of `src/a.mjs` differently
      When the loop merges `03/01` home and then `03/02` home
      Then the second merge answers outcome `conflict` with code `lane-merge-conflict`, and the primary is back at its pre-merge commit

    Scenario Outline: init and update ensure the two work-dir files without disturbing the operator's lines
      Given `<work.dir>/<file>` <before>
      When `aof work <verb>` runs
      Then `<work.dir>/<file>` holds <entries>, each once, and every line it held before

      Examples:
        | verb   | file           | before                    | entries                                                                  |
        | init   | .gitignore     | does not exist            | `**/runs/.heartbeats.ndjson` and `**/runs/.heartbeats.ndjson.batch`      |
        | update | .gitignore     | holds the line `drafts/`  | `**/runs/.heartbeats.ndjson` and `**/runs/.heartbeats.ndjson.batch`      |
        | update | .gitattributes | does not exist            | `STATE.md merge=union`                                                   |
        | update | .gitattributes | already holds both files' entries | `STATE.md merge=union`, and the file is not rewritten             |

    Scenario: this repository tracks no heartbeat queue
      When `git ls-files` is read at the repository root
      Then no path ends in `runs/.heartbeats.ndjson` or `runs/.heartbeats.ndjson.batch`
      And `wiki/work/.gitignore` and `wiki/work/.gitattributes` are tracked with the ensured entries
