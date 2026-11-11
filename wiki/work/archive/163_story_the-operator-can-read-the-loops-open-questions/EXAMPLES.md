# 163 · The operator can read the loop's open questions — example map

## R1 · Every question waiting on me in this workspace is listed with what I need to answer it
- E1 · One claude refine ask on 011, asked 14:02, run from the acme-core checkout at 14:32: one row naming 011, refine, claude, the asked instant and "30m ago", the full multi-line question, and `aof work answer 011 "…"` [proposed]
- E2 · A codex ask carrying three choices: the row lists them numbered 1, 2, 3 under the question [proposed]
- E3 · A parked ask on 04/02: listed, marked parked, and says the loop resumes with `aof work loop 04 --resume` once it is answered [proposed]
- E4 · No ask file in this workspace, or only answered ones: one line, "No open questions.", exit 0 [proposed]
- E12 · 05/01 stopped to ask on a lane running on node-9549, its question text carried to this machine: listed, marked as on node-9549, with its question and `aof work answer 05/01 "…"` [stated Q2]
- E13 · 05/01 asking on node-9549 with no question text on this machine: listed, saying the question did not reach this machine and to open the worker's terminal to read it, with its answer line [stated Q2]
- E5 · `--json` over the 011 ask: an array of one row carrying ref, runId, phase, runtime, askedAt, workspace, state, question, choices and the answer command [proposed]

## R2 · Only a question `aof work answer` would actually reach is offered an answer line
- E6 · Two waiting asks on 011, run A asked 09:00 and run B asked 11:00: one row, run B's question — the answer reaches the latest ask [proposed]
- E7 · 011's latest ask is answered and its owner has not cleared it yet: 011 is not listed [proposed]
- E11 · 011's ask file still reads waiting but its run is no longer running (the loop died): listed, marked stale, with no answer line, saying `aof work loop 011 --resume` clears it [stated Q1]

## R3 · `--all` widens the listing to every workspace on this node
- E8 · Asks waiting in aof and in acme-core, run from the aof checkout: without `--all` only aof's row; with `--all` both, each naming its workspace and the checkout to answer from [proposed]
- E9 · An ask whose workspace this node has no descriptor for: listed under its workspace id [proposed]
- E14 · An ask in a workspace whose checkout cannot be read here: listed, its liveness reported unknown rather than guessed [proposed]

## R4 · `aof work resume` sends me to `aof work questions` for the question text
- E10 · `aof work resume` with 011 waiting on an answer: the NEEDS YOUR ANSWER row stays, and the tail says to read the question with `aof work questions` [proposed]

## Questions
- Q1 · business · answered · An ask whose run has stopped (its loop died; the next `aof work loop --resume` clears it unanswered) — is it hidden, shown marked stale with no answer line, or shown as waiting? Answer: shown, marked stale, with no answer line.
- Q2 · business · answered · A question a lane running on another machine stopped on (which `aof work answer` already reaches) — is it listed? Answer: listed.
- Q3 · technical · defaulted PLAN.md#one-predicate · Where does the one "waiting on a human" predicate live, so resume.mjs and work-loop ask.mjs share it?
- Q4 · technical · defaulted PLAN.md#runtime · How does a claude ask record its runtime, when only the codex path stamps one today?
- Q5 · technical · defaulted PLAN.md#order · In what order are rows listed? Oldest asked first, the order the ask store already reads.
- Q6 · technical · defaulted PLAN.md#workspace-name · Where does a row's workspace name come from? The node's workspace descriptors.
