---
type: story
number: 145
slug: loop-diagram
doc: retrospective
created: 2026-10-03
updated: 2026-10-06
schema: 1
aofVersion: 0.1.0
---
# 145 · Retrospective

The build's own scenarios were green at the gate. All three lessons come from the accept: two from
controls the build lane never ran, and one from the operator looking at the picture.

## R1 — A new bundle command is a census change, and the importer sweep cannot see censuses

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** aof:verify 145

Adding `/aof:loop-diagram` reddened four controls outside the story's declared files. Three were
inside the story's own scope: the repository's rendered bundle and lock (`adapters` 140/00 and 141/03,
`created: 3`), FF-12405's command roster, and the autonomous door's pinned command set. None imports a
changed `src` module. They enumerate `packages/core/assets/commands/`, so an importer sweep over the
changed modules (the verify-importer-sweep practice) passes clean while they are red. 127/02
(`promote`) and 127/03 (`archive`) recorded the same species in that door's own comment, so this is
the third time.

**Carry:** when a story adds or renames a file under `packages/core/assets/commands/`, its lane runs
`aof work update` (render plus lock) in the same diff. It also runs every test that names the command
directory: `grep -rlE "assets[/\"', ]+commands" test packages/*/test`. A refine that declares a new
command lists those censuses under `files:` up front.

## R2 — Per-file native-port allowlists catch a one-line import, but only in a lane that runs them

- **Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** aof:verify 145

`existsSync` from `node:fs` in `commands/diagram/export.mjs` was a one-line convenience that broke the
work kernel's declared native ports (`yarn-installation`). The module already read through
`node:fs/promises`, so the existence probe was redundant with the read's own `ENOENT`.

**Carry:** in `packages/*/src`, prefer the read's `ENOENT` to an existence probe, and include
`test/bundle/yarn-installation.test.mjs` in any lane that adds an import to a kernel module.

## R3 — The output set and the colour were operator decisions the contract defaulted

- **Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** the operator, at the @uat

The contract inherited 133's ADR export shape (SVG plus PNG, "a PNG failure never costs the SVG") and
left "built" to the drawing agent's choice of shading. At the `@uat` the operator wanted green for
done, and no SVG at all. Both were cheap to fix in the item: a `done` status role in the one style
guide, and a scratch SVG for the rasterizer. Both could have been a discovery question.

**Carry:** when a story reuses a sibling surface's output set for a new subject, ask at refine which
artefacts the operator wants. Put a status colour into the style guide as a named role, never into a
brief's prose.
