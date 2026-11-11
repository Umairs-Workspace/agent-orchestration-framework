# 167/00 · The daemon says what it costs — example map

## R1 · Each daemon counts its work by cause, and names the workspace
- E1 · The board's list poll answers aof's 1,800 docs from disk 40 times in a minute because the cache holds no rows: the `serve` snapshot counts 40 `full-disk-read` labelled with aof's workspace id, although the degrade log shows at most 12 lines (one per 5 s) [proposed]
- E2 · The fleet polls `/api/mesh/status` 12 times and the board polls `/api/work/list` 12 times in a minute: the `ui` snapshot counts 12 `request` for each route, by client `fleet` and `board`; a request with no client header counts as `unknown` [proposed]
- E3 · A degrade line raised while reading workspace `52294b307214c27d` carries `workspaceId: "52294b307214c27d"` [proposed]

## R2 · `aof mesh status --json` shows what each daemon costs
- E4 · Both daemons wrote snapshots 10 s ago: the `cost` block lists `serve` and `ui`, each with its CPU share over the last 60 s, its state (`idle` or `viewer-open`), the budget for that state (2% idle, 10% viewer-open), and its top three causes with labels [stated Q1]
- E5 · The `serve` snapshot is 50 s old (three writes missed): `serve` reads `not-reporting` with the age, and `ui` still reads normally [proposed]
- E6 · No daemon has ever run on this node: the `cost` block is present and empty, never absent [proposed]

## R3 · `aof work doctor` warns when a daemon is over budget, naming what it is spending on
- E7 · `serve` is idle at 38% of a core against the 2% idle budget, and its top cause is `full-disk-read` for aof: a `daemon-over-budget` warn names `serve`, 38%, 2%, `full-disk-read` and aof's workspace id [stated Q1]
- E8 · `ui` is `not-reporting`: a `daemon-not-reporting` warn names `ui` and how long ago it last reported [proposed]
- E9 · Both daemons are under budget: no daemon finding, and `aof work validate` still exits 0 when either warn is raised [proposed]

## Questions
- Q1 · business · answered · What may each daemon cost? The budget is a share of one CPU core, averaged over a minute, per daemon. "Idle" means no fleet or board view is open; "viewer-open" means one has polled in the last 30 s. Measured today: `mesh serve` at 128% of a core. One stat walk of aof's own work tree (about 3,200 files) takes about 240 ms, so a walk of that tree every 15 s costs roughly 1–2% of a core on its own. (a) idle 1%, viewer-open 5%: the strictest; the daemon may have to walk large trees less often than every 15 s. (b) idle 2%, viewer-open 10% (recommended): holds with one walk per tick and a memoised read. (c) idle 5%, viewer-open 20%: easy to hold, but a fifth of a core while you look at the board. Answer (2026-10-20): (b) idle 2%, viewer-open 10%.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-001 · How does a request say which client sent it? The UI sends `X-AOF-Client: fleet|board`; an absent header counts as `unknown`.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-001 · When does a snapshot count as stale? After 45 s, three missed 15 s writes.
