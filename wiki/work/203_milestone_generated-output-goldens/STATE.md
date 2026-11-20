---
doc: state
---
# 203 · Every file aof generates is held to a committed baseline, and any drift shows as a reviewable diff — State

## Progress

- 2026-11-20 — Refined with `--all`, solo (run `20261120T182303148Z-0000`). ARCHITECTURE written
  (ADR-001 to ADR-007, FF-20301 to FF-20303, all `pending`). Three stories broken down, and all
  three contracts authored (13 task features: 11 `@executable`, 2 `@manual`). Each story has an
  example map and a build plan. Nothing is built.

## Notes & decisions in flight

### For the operator: first-time `init` overwrites a user's file at an aof path

Measured at refine: over a project that already holds `.claude/agents/aof-architect.md` written by
the user, `aof work init` replaces it with aof's architect, reports it as `update`, and gives no
drift warning. `update` does warn on an edit to a file aof installed. `init` does not on a file
aof never installed. The `customised` baseline (story 01, E14) holds today's behaviour, so any
change to it will show. Whether `init` should refuse or warn here is a product decision outside
this milestone's scope. It would make a reasonable backlog item.

### Default decisions taken (technical; each is in an ADR and a story's map)

- Verbs run as child processes through `spawnCliSync`, not in-process (ADR-001).
- Six normaliser rules, closed: `eol`, `temp-paths`, `instants`, `hashes`, `version`, `build-id`.
  Path separators change only inside matched temp paths and tree keys. Ordering instability is
  fixed at its source and never given a rule (ADR-002).
- A baseline is a delta from a named base, so a shared edit shows once in a PR. Every file ends
  `.golden`, under `test/golden/baselines/`, pinned `text eol=lf` (ADR-003).
- Failures print the first 20 diffs and a count of the rest. The diff is an in-repo line LCS, with
  no new package. Only `scripts/golden.mjs --update` writes, and no environment variable does
  (ADR-004).
- Eight init scenarios, not the 24-way cross product. This rests on the measured union property:
  the three single-runtime inits together hold exactly the three-runtime tree (ADR-005).
- `all-practices` turns on every practice key that exists. Learning has no key and is in every
  render. A dated correction is in the SPEC.
- Idempotence is a property of every init scenario, not a baseline. "The previous baseline" is the
  committed one, rebuilt into a real tree with real hashes (ADR-006).
- Three stories, chained 00 → 01 → 02. 02 reads 01's lane and baselines, and both register a lane
  in the same module (ADR-007).
- No ADR is diagrammed. The one flow with moving parts, the rebuild, is a three-step list.
- No security or compliance specialist ran. The harness touches only temp directories and its own
  baseline root.

### Business questions asked, and their answers

None was raised. The discovery beat ran for all three stories. Every open question in the three
maps is technical and takes the default its ADR records. One question was struck before asking
(story 01's map): whether this milestone should change the overwrite above. The SPEC answers it,
because this milestone holds what aof generates and does not change the verbs.

### Recalls recorded on this item

- `refine-architect` `22675a29-f830-4041-8813-8ea19ba32ecd`: 4 records, 3 honoured (01/R2, 01/ADR-002, 01/ADR-003).
- `refine-po` `015155dc-e15d-4397-9947-b737c8f6ff1e` (the item's title, no filter): 5 records, 2 honoured (192/02 R1, 57 F-57-M-2).

### Refine run

- Graph: `aof graph build .` timed out after 600 s (`graphify-timeout`). No graph was used, and the
  boundaries were drawn from the source (ARCHITECTURE "Measured facts"). No story writes a runtime
  module, so the coupling the graph would report is the CLI's argv.
- Every number in ARCHITECTURE was measured by running the real CLI in scratch directories, each
  with its own `AOF_GLOBAL_HOME`, on `4cac6cd8`.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
