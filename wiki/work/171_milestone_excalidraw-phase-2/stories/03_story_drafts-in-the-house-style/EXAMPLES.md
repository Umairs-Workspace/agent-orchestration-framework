# 171/03 · Drafts in the house style — example map

## R1 · The palette is read from the style guide's semantic-roles table
- E1 · This repository's `.aof/diagrams/style.md`: the palette is paper `#f3f5f7`, ink `#1b1f27`, muted `#585f6a`, link `#13766d`, accent `#ba2646` [proposed]
- E2 · `work.diagrams.style` is not set: there is no palette [proposed]
- E3 · The style guide has no semantic-roles table, or its table has no `paper` or no `ink` row: there is no palette [proposed]

## R2 · A node the architect adds without a style is filled in with the house style
- E4 · A first draft adds `api`, `store` and `web`, with no `style` lines: the stored proposal carries `style api fill:#f3f5f7,stroke:#1b1f27,color:#1b1f27` and the same for `store` and `web` [proposed]
- E5 · A proposal adds `api` with its own `style api fill:#fbe9ed,stroke:#ba2646`: that line is kept as written [proposed]
- E6 · A proposal adds `k1` with `%% aof:lib k1 aws-architecture-icons/"Kinesis"`: no style line is added for `k1` [proposed]
- E7 · A proposal relabels the existing node `api`, which has no style: no style line is added for `api` [proposed]
- E8 · There is no palette: the proposal is stored exactly as written [proposed]

## R3 · A shape the operator draws by hand starts in the house style
- E9 · With this repository's palette, the operator draws a rectangle: its stroke is `#1b1f27`, its background `#f3f5f7`, its fill solid [proposed]
- E10 · A saved rectangle with a red stroke `#e03131` is opened with the house defaults set: it keeps its red stroke [proposed]
- E11 · There is no palette: a new rectangle has Excalidraw's own default colours [proposed]

## R4 · The architect is told the palette by role
- E12 · `context` answers `palette` with `paper`, `ink`, `muted`, `link` and `accent`, so an emphasis line names `link` or `accent` colours from it [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-004 · What colour do hand-drawn arrows and text take? Excalidraw has one default stroke colour for every element, so arrows and text take `ink`.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-004 · Is the default filled in at propose or at accept? At propose, so the stored proposal says what will be drawn.
