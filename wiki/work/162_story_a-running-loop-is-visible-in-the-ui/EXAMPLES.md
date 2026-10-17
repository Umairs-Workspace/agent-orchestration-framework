# 162 · A running loop is visible in the UI — example map

## R1 · A loop-driven Claude session streams its terminal output, live and read-only, to its session card
- E1 · Loop 03 drives refine of 03/07 sequentially on this machine: the session card for its session shows the Claude screen updating live, never "no live output — no assignment is relaying this session" [proposed]
- E2 · A wave runs 01 and 02 in two lanes at once: each lane's session has its own card, and each card streams only its own lane's output [proposed]
- E3 · The operator types into a loop session's card: nothing reaches the session, and the card says it is read-only [proposed]
- E4 · The drive finishes: the card shows the stream ended, not a pane still waiting for bytes [proposed]
- E5 · A loop on the WSL worker drives a story: its session card on the control machine's UI streams too [stated Q1]

## R2 · The running loop shows how long the current drive has run and when it last did something, on the home page as well as the fleet node card
- E6 · Loop 03 at refine of 03/07, drive started 36 min ago, last heartbeat 5 s ago: the loop line reads `loop 03 · refine 03/07 · cycle 1 of 3 · 36 min · active 5 s ago` [proposed]
- E7 · Between two drives the loop has no current item: the line shows no elapsed time and no activity [proposed]
- E8 · The current drive last did something 14 min ago: the line reads `… · 50 min · quiet 14 min` in the warning tone [stated Q3]
- E14 · The last activity was 9 min 59 s ago: the line reads `… · active 9 min ago`, with no warning [stated Q3]

## R3 · While a drive runs, `aof work loop` prints a status line every five minutes
- E9 · 36 min into refine of 03/07, 2 subagents running, the last heartbeat 5 s ago: the loop prints `03/07 — 36 min, 2 subagents active, last activity 5 s ago` [proposed]
- E10 · A drive that finishes 4 min after it started prints only its start and end lines [stated Q2]
- E11 · A wave of two lanes: one status line per lane every five minutes, each naming its own ref [stated Q2]

## R4 · The home page never shows an empty grid beside "N runs in flight" while a loop is running
- E12 · Loop 03 is running and its session has not registered yet: the page names `loop 03 · refine 03/07` and says its session has not reported yet, instead of blaming the bundle [proposed]
- E13 · One run is in flight that belongs to no loop and reports no session: the page keeps today's sentence [proposed]

## Questions
- Q1 · business · answered · Must a loop running on a worker machine (WSL, the Mac) stream to the control UI in this story, or is a loop on the control machine enough for now?
- Q2 · business · answered · How often does `aof work loop` print the status line while a drive runs?
- Q3 · business · answered · Does the UI call out a quiet drive, or show the times only and leave the judgement to the operator?
- Q4 · business · answered · Does a session with no live stream fall back to a transcript view (assistant text, tool calls, subagents) in this story?
- Q5 · technical · defaulted ADR-001 · Which channel carries the drive child's PTY bytes to the relay: the loopback relay directly, or the node's own mesh daemon?
- Q6 · technical · defaulted ADR-003 · What is "last activity": the run's heartbeat, the transcript's last write, or the later of the two?

<!-- Answers, 2026-10-17: Q1 every machine, through each node's own daemon. Q2 every five minutes, fixed. Q3 flag after ten minutes quiet. Q4 not in this story. -->
