# 147 · The loop hands a halt to a fresh session to fix, then resumes — Outcome

## Delivered

### Lane halts are handed to a repair session
A foreground `aof work loop` handles its three lane stops (`lane-open-failed`, `lane-merge-refused`,
`lane-merge-conflict`) by writing a hand-over file under the aof home (`mesh/loop-repairs/<runId>.json`)
and driving a fresh Claude session typed `/aof:repair <ref> <file>`. Every other stop still ends the
loop. `--no-repair` or `work.loop.repair: false` turns the hand-over off.

### One repair per halt, then the loop resumes or stops
The repair is a run on the halted ref, with `brief.loop.phase: "repair"` and the halt's stop and
producer in its brief. It is settled from the session's outcome. When it ends `done`, the account
prints `Repaired <stop> at <ref> (run <id>) — resuming <scope>.` and the loop re-enters its body in
process, on the recorded models and efforts. Otherwise the original halt is re-printed with the repair's
facts appended to its Details, and the loop stops.

### `work:drive-repair` and `/aof:repair`
Repair is the fourth drive phase, and its session resolves as `continue`. The `/aof:repair` bundle
command renders for Claude, Codex and OpenCode. It fixes only the loop's own records, never discards a
commit, never touches the operator's dirty paths or a delivered `.feature`, and never starts a loop.

### The two known lane-halt causes are gone
`runs/.heartbeats.ndjson` queues are git-ignored, are never captured by the one commit verb (lane and
mesh worker alike), and are untracked where an earlier commit tracked them. `STATE.md` under the work
dir merges by union (`wiki/work/.gitattributes`), so two lanes' build notes no longer conflict.
