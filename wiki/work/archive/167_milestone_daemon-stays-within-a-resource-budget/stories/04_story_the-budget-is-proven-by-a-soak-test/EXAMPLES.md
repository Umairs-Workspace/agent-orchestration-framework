# 167/04 · The budget is proven by a soak test — example map

## R1 · The real daemons hold the budget over a tree as large as aof's, with the faults planted
- E1 · Over 1,800 generated docs, with the cache empty, a sync failing on `event-id-conflict` and 5 dead registrations, 30 s with no viewer: `serve` and `ui` are each under the idle budget [proposed]
- E2 · The next 30 s, with a viewer polling the fleet and the board at the UI's cadence: each daemon is under the viewer-open budget [proposed]
- E3 · A daemon's phase measures over its budget: the soak fails, naming the daemon, the phase, the measured share, the budget and the top cause with its workspace [proposed]

## R2 · The planted faults are named where the operator looks
- E4 · After the soak, `aof mesh status --json` names the empty cache, the conflicting sync and the dead registrations as counted causes, each with the fixture's workspace id [proposed]
- E5 · Across the whole soak, the degrade log holds the conflicting sync's line once and each dead registration's line once, not once per tick [proposed]

## R3 · The soak runs in the regression gate without touching the live node
- E6 · The live desktop daemons hold `:4181` and `:4182` while the soak runs: it binds neither, and passes [proposed]
- E7 · After the soak, the real `~/.aof` is byte-unchanged and no daemon child outlives the test [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-007 · How long does it run? A 15 s warm-up, 30 s idle and 30 s viewer-open, about 90 s with start and stop.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-007 · How does it hold up when the gate's workers load the machine? It judges CPU-seconds, not wall time: a fixed cadence does the same work under contention.
