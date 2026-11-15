---
doc: state
---
# 191 · Discord drives the work from a phone — State

## Progress

- 2026-11-10: captured in the backlog, framed from the operator's wish to use AOF away from the desk.
- 2026-11-11: promoted to 191 and refined autonomously: RESEARCH Q1–Q4, ADR-001–008,
  FF-19101–19107, and eight stories, 00–07.
- 2026-11-12: built and reviewed by the loop. 191/00 was accepted at verify, and 191/01 was held for
  F-05 and F-06.
- 2026-11-14: `aof:verify 191` began. Discord was set up on this laptop. The operator ratified the
  ADR-001 §1/§3 amendment (F-03, landed as story 191/08) and the ADR-002 §4 amendment (F-05, landed
  as 191/01 task 04), and carried F-06 to the outsider check. Both were built (`5ee44d8a`). 194 made
  the channel global (`cfed0a69`).
- 2026-11-15: the outsider check was run from the phone and signed off (VERIFICATION, steps 1–9).
  It found F-14, fixed as 191/04 task 03 (`43bf9e88`). Red probes for FF-19103–19107. Stories 01–08
  accepted (`aeb920ae`). The gate was red on the MacBook (environmental), then red on the runner for
  one case (the shell's size bound, fixed in `e4ad00fe`), then green on the runner at `e4ad00fe`.
  Accepted. See VERIFICATION `## Milestone accept decision`.
- [x] `00_story_the-control-node-hosts-a-launched-session`: accepted 2026-11-12, done
- [x] `01_story_a-launched-session-runs-claude-with-remote-control`: accepted 2026-11-15 after F-05 and F-06, done
- [x] `02_story_sessions-start-and-list-from-the-cli`: accepted 2026-11-15, done
- [x] `03_story_a-launched-session-can-be-ended`: accepted 2026-11-15, done
- [x] `04_story_a-loop-starts-through-the-supervisor`: accepted 2026-11-15 after F-14, done
- [x] `05_story_the-project-is-picked-not-typed`: accepted 2026-11-15, done
- [x] `06_story_discord-starts-sessions-and-loops`: accepted 2026-11-15, done
- [x] `07_story_buttons-on-the-notifications`: accepted 2026-11-15, done
- [x] `08_story_a-single-node-control-opens-its-own-sessions`: accepted 2026-11-15, done

## Decisions (graduated)

- The control node hosts its own launched sessions, through the worker's handler. A single-node
  control resolves a served project at its registered folder and derives its relay on
  `127.0.0.1:4183` (ADR-001 and its amendment).
- A Discord session is `exec claude --remote-control <name> --session-id <id>`, typed by the node
  from a closed `launch` value, named `<project folder>-<first 8 of the id>`, and registered under
  `claude-code` (ADR-002 and its amendment).
- A start goes through one core, and watches the relay for the link for as long as its caller asks.
  Discord asks for 45 s. No link is not a failure (ADR-003).
- A session runs until it is ended, with no idle limit (191/03 Q1, operator; ADR-004 §5).
- `/loop start` writes a start request that the desktop app honours, under the workspace id the
  mesh resolves (ADR-005, F-14).
- The option is `project` everywhere, autocompleted. The `/session start` reply is ephemeral
  (191/06 Q1, operator; ADR-006).
- Buttons appear for halts and for 2–5 fixed choices, only with an `allow` list (ADR-007).
- Rejected at framing: a native mobile app, Hermes, and relying on Remote Control alone.

## Archived

The refine notes, the build and verify blow-by-blow and the `## Feedback (for retro)` notes have
graduated. The lessons are in the milestone's `RETROSPECTIVE.md` (R1–R4) and in the retrospectives
of stories 00, 01, 04 and 08. The evidence is in VERIFICATION, and the open follow-ups are in
OUTCOME's Gaps and VERIFICATION's open findings. The full pre-compaction text is in git at
`e4ad00fe`.

## Verification

- [x] `@executable` lanes green for stories 00–08 (one isolated run, 467 cases)
- [x] Fitness functions FF-19101–FF-19110 green, each with a red probe
- [x] `@manual` guide checks 05/02, 06/05 and 07/04, and 01/03 at the outsider check
- [x] The outsider check from the phone, signed off by the operator on 2026-11-15
- [x] Milestone regression gate: green at `e4ad00fe` on a runner through `gate.yml` (run
  43738846534), after the MacBook's red run and the runner's red run at `49fc1e41`
