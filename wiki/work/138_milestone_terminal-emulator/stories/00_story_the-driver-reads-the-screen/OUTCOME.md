# 00 · The driver reads the screen — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. An ADDITIONAL artifact: never the record doc.
-->

## Delivered

### One screen model per driven session
Every interactive `claude` session the driver launches carries a `@xterm/headless` 6.0.0 model, fed from the session's own PTY output and sized to it (80×24, `scrollback: 0`). `src/terminal/screen.mjs` is the only module that imports the package (FF-13801).

### Typing waits for the input box
The directive is pasted on the first settled frame whose cursor row starts with `❯` at column 0 between two full-width `─` rules, on either buffer (ADR-002 §1 as amended at verify). If a model is live and no such frame arrives by the 60 s cap, nothing is typed, and the session stops `failed / timeout` with the screen recorded as `screen-not-ready`.

### Every verdict the screen gives is acted on, by the door's word alone
The driver acts on four verdicts from `src/terminal/session-screen.mjs`: type; consent (a menu walked one confirmed key at a time, then one Enter); blocked (`failed / blocked_screen`, with `screen: { id }` on the result); and wait (the heartbeat deadline suspended). The driver reads no screen itself.

### Every stop but done leaves the screen
Every timeout, death, unaccepted directive and needs-input stop writes one degrade event carrying the rendered rows, the buffer and the cursor, taken before the kill. `reportDegrade` throttles per (code, key).

### The byte gate is the fallback
With no model (the package absent, or failing to load), readiness is the pre-138 byte gate, verbatim: the floor, then bracketed paste ON with visible output since. `screen-model-unavailable` is logged once.

## Assumptions

- **claude draws its input box as `❯` at column 0 between two full-width `─` rules** — measured on 2.1.283 (Windows, both renderers) and 2.1.259 (Linux). A release that changes it fails its first drive as a recorded `timeout`, never a blind paste.
- **The launch declares `TERM=xterm-256color`** — claude picks its glyphs from it (m138/F-01, landed by 138/02).
