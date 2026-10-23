# 167/07 · An idle tick walks nothing — example map

## R1 · A watched tree is walked only when it changed, or when its last walk is 5 minutes old
- E1 · `mesh serve` watches the soak tree (1,800 docs), and nothing is edited for ten ticks after the watch is armed: no `stat-walk` is counted, and the stat gate, the backoff check and the presence read each still answer the tree's last digest [proposed]
- E2 · A backed-off workspace whose tree moved fails again on that tick: one walk that tick, not two (F-06) [proposed]
- E7 · No event for 4 min 59 s: no walk. At 5 min 0 s: one walk, labelled `safety` [proposed]

## R2 · A change under a watched tree makes the next ask walk it once
- E3 · A STORY.md's `status:` is edited: the next tick walks once, counted `stat-walk` labelled `changed`, and syncs the change, and the tick after walks nothing [proposed]
- E4 · A folder with no record doc in it is made: the next ask walks [proposed]
- E5 · A run record `runs/node-7297/20261022T150000000Z-0000.json` is written: no walk [proposed]
- E6 · An event arrives while a walk is in flight: the next ask walks again [proposed]

## R3 · A tree that cannot be watched is walked on every ask, as today, and said once
- E8 · Arming the watch throws `EMFILE`: every tick walks, labelled `unwatched`, and one `work-tree-watch-unavailable` line names the work dir, not one per tick [proposed]
- E9 · A held watch emits `error` an hour in: it is closed, the next ask walks, and one line is logged [proposed]

## R4 · Only `mesh serve` watches, and only the trees its sync pass covers
- E10 · `aof work list` in a CLI process arms no watch, and two reads of an unchanged tree walk twice, as 01 says [proposed]
- E11 · A registered dispatch lane that does not propagate: not watched [proposed]
- E12 · A registration removed on a tick (03's gone folder): its watch is closed on that tick; the daemon's stop closes every watch [proposed]
- E13 · A tick whose registry read fails: every watch is left as it was [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-009 · How old may a watched tree's last walk get before it is walked anyway? 5 minutes, which the operator chose with this approach on 2026-10-22.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-009 · Does `mesh ui` watch the trees its board polls? No. A board poll walks in `ui`, which is held to the viewer-open budget.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-009 · Which events make a tree dirty? Any event except one whose file name has an extension other than `.md` or `.feature`.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-009 · Is a dir whose watch failed armed again? Not in this process. A restart tries again.
