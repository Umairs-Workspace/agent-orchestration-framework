# 167/03 · A permanent fault is said once and backed off — example map

## R1 · A permanent sync failure is said once, then retried only after a backoff or a change
- E1 · Workspace aof's sync pass fails with `event-id-conflict` on 10 ticks in a row: one warning names aof's workspace id and the code; the passes after the first are skipped until the backoff elapses, and each skip is counted, not warned [proposed]
- E2 · While aof is backed off, a record doc in aof is edited: the next tick runs aof's pass at once, without waiting out the backoff [proposed]
- E3 · aof's pass fails 8 times in a row with `event-id-conflict`: the gap between attempts grows 15 s → 30 s → … and never exceeds 1 hour [proposed]
- E4 · A pass fails with `database is locked`: it is not a permanent code, so the next tick retries it as today [proposed]
- E5 · The daemon restarts while aof is backed off: the failure is said once more on the first tick [proposed]

## R2 · A registration whose folder is gone stops costing anything
- E6 · 58 registrations point at deleted dispatch worktrees: the tick resolves its workspaces once, and each gone folder is warned about once, not twice a tick [proposed]
- E7 · A registration's folder is found gone on a tick: this node's registration is removed at once and one line names the workspace and its path; the next aof command run in that folder registers it again [stated Q1]
- E8 · Node `node-2976`'s rows in this store point at the same deleted folders: this node never removes or rewrites another node's rows [proposed]

## Questions
- Q1 · business · answered · When a registered project's folder no longer exists, what should the daemon do? Today 58 of this node's 66 registrations point at deleted dispatch worktrees, and every tick walks and warns about each one. (a) Remove the registration at once and log it once (recommended): it registers itself again the next time any aof command runs in that folder, so a project on an unplugged drive comes back when you use it. (b) Keep the registration and stop walking it, backing off up to an hour, and list it in `aof work doctor` until you remove it. (c) Remove it once it has been missing for 24 hours. Answer (2026-10-20): (a) remove at once and log it once.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-005 · Which codes are permanent? `event-id-conflict`, `workdir-missing`, `not-a-directory` and `no-descriptor`, as a closed set in the launcher.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-005 · What is the backoff? It doubles from one tick to a 1-hour cap, ends early when the stat digest moves, and lives in memory, so a restart says the fault once more.
