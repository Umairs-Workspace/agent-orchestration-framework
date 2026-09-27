# 01 · The seam is named in config — Outcome

## Delivered

### The diagram generator is a config choice
`work.diagrams` (`{ generator, formats, style }`) is read by one resolver, `resolveWorkDiagrams`. An absent key is off, a bad shape is one coded `diagrams-*` error that still resolves to off, and an unknown generator is refused by naming the registered ids.

### One layout home for a diagram's place and spelling
`src/diagrams/layout.mjs` alone owns the `diagrams/` folder, the `ADR-NNN-<slug>` stem, the brief reader, the link block writer and the link parser. The parser skips fenced code and inline code spans.

### One generator adapter behind one registry
`generatorFor(id)` resolves `diagram-design`, the only adapter, which carries `locate`, `instructions`, `toSvg` and a reserved `readBack: null`. The literal `diagram-design` appears in `src/**` only in that adapter (FF-13301).

### `aof diagram plan`
`aof diagram plan <ref> <ADR-NNN> --slug <slug>` answers off, generator-missing, or the plan (stem, paths, brief, instructions) from config alone. It exits 0 on all three and writes nothing.

## Assumptions

- **The skill is locatable by path** — the plugin's `SKILL.md` exists in some installed scope or in the marketplace clone. aof never installs it.
