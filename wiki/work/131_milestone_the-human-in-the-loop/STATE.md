---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 131 · NN · The human in the loop — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. -->

- [ ] to be broken down at refine (six stories proposed in the SPEC)

## Notes & decisions in flight

- **Framed 2026-09-16** from 129/06's live run on 127: the loop halted `session-needs-input` at
  127/02 with only a session id on the line; the question (27 doctor findings and a shell loop to
  run) was in the transcript, answered by hand outside the session, and the re-drive finished in
  four minutes. The operator's direction: "the loop can't just die if it needs my input … we need
  a better way", and "support things like Discord channel notifications — ensure infrastructure
  for external messaging is in place". The SPEC carries the measured table; nothing is decided here.
- **What the ARCHITECTURE must settle, in order:** (1) keeping the PTY alive on the sentinel
  without breaking 69/05's parked fallback — one driver, two waits; (2) the one reader of "the
  question" (the transcript's last assistant message — never the PTY buffer); (3) the answer's
  transport — the terminal-input path (m38) reused for a LOCAL session, which today targets a
  worker by node id; (4) the notifier's envelope and channel registry — one shape, renderers per
  channel, Discord webhook first, delivery best-effort and degrade-by-name; (5) where the secret
  lives (config vs env) and what the config-key controls (FF-7101's species) require of it.

## Feedback (for retro)

<!-- Raw, attributed entries; triaged into VERIFICATION.md / RETROSPECTIVE.md at aof:verify. -->

## Verification

<!-- Pointers, not restatements. -->
- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` live run recorded
