# 94 · A Malformed Aof Config Reads As An Empty One So Every Optional Declared Step Silently Does Not Run — Outcome

## Delivered

### A present-but-unreadable config is distinguishable from an absent one
`loadWorkspace` answers `configFault` — `{ path, code, message }` when `.aof/aof.config.json` is present and does not parse or cannot be read, and `null` both when it parses and when there is no config at all — while still degrading to `{ config: {} }` so no door ever dies on a torn config.

### A torn config is a reported health fault, not silence
`aof work doctor` emits an `error` finding (`config-unparseable` / `config-unreadable`) naming the file, the parse error and what is consequently not running; it is appended as a workspace fact, so no `scope` filters it away.

### `readJson` carries one vocabulary for a parse failure
A parse failure from `readJson` carries `code: "malformed-json"` — the word `config-inspect.mjs` and the board face already use — while the read leg keeps node's own `ENOENT`.
