# 209/05 · Board conformance — example map

## R1 · The accepted 205 captures behave the same over a recorded board as over files
- E1 · Every accepted 205 capture replays through the public CLI against the recorded Azure board with the file lane's output and exit code [proposed]
- E2 · "aof work status 16 active" is observed on the recorded board as well as in the repository, and the board shows one item for 16. Reworded at verify (F-01): the seed has no "status 17 in-review" capture, and 17 is a finished prototype [proposed]

## R2 · A project-owned second adapter works through the same entry point
- E3 · A test project's alternate board under its own .aof replays the same captures with no change to AOF's code [proposed]

## R3 · The loop runs end to end over a board and recovers from a conflict
- E4 · The loop drives a story from refinement to in-review over the recorded board, and each status change appears on the board [proposed]
- E5 · A recorded competing edit lands during the build. The loop halts board-conflict, a stale status write is refused, and after resync-board the loop resumes [proposed]

## R4 · One live Azure run is recorded with the environment it exercised
- E6 · A live run against a new test project on the AOF inherited process in the umair-butt organization records the platform, az version, process, work-item IDs, revisions and a custom-type round trip, with no token in the record [stated Q1]

## Questions
- Q1 · business · answered · Which Azure DevOps project should the live run use? A new test project on the AOF inherited process in the umair-butt organization. Umairs Homebase is left untouched.
- Q2 · technical · defaulted ADR-004 · Which node's daemon environment does the live run exercise? This MacBook, the only node, through its LaunchAgent environment. The record names that one machine.
