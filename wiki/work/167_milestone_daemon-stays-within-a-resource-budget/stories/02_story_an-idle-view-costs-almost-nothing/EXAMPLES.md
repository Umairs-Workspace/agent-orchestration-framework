# 167/02 · An idle view costs almost nothing — example map

## R1 · A poll that finds nothing changed is answered 304
- E1 · The fleet polls `/api/mesh/status` twice and nothing changed: the second answer is `304` with no body [proposed]
- E2 · A story's status changes between two board polls: the second `/api/work/list` answer is `200` with the new body and a new `ETag` [proposed]

## R2 · A hidden view polls nothing, and polls at once when shown
- E3 · The desktop window is minimised to the tray for 10 minutes: the fleet and board make no request in that time [proposed]
- E4 · The window is shown again: the fleet and the board each poll at once, before any delay [proposed]

## R3 · A visible view backs off while nothing changes, and snaps back on a change or an action
- E5 · The board is visible and its list poll answers `304` four times in a row: the delay grows 5 s → 10 s → 15 s, and stays at 15 s [stated Q1]
- E6 · After the delay has grown, a poll answers a changed list: the next poll is 5 s later [proposed]
- E7 · The operator clicks Assign on a fleet card: the fleet polls at 5 s until the assign resolves, so its `Sent` hold and its timeout keep their meaning [proposed]

## Questions
- Q1 · business · answered · How long may a change take to appear on a view you are looking at, after a quiet spell? While nothing changes, a visible fleet or board slows its polling, and resets to every 5 s as soon as anything changes or you click. A slower cap costs the daemon less while you watch: one poll is about one stat walk of the work tree. (a) no slow-down while visible: always 5 s, and only a hidden window stops polling; (b) up to 15 s after a quiet spell (recommended): a loop's progress shows within 15 s; (c) up to 60 s: the cheapest, but a change can take a minute to show. Answer (2026-10-20): (b) up to 15 s.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-004 · What is the `ETag`? A hash of the response body, so it needs no version counter in either store.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-004 · Which polls are exempt from the helper? The clock ticks that only re-render a relative time, and the session launcher's bounded wait for one spawn outcome.
