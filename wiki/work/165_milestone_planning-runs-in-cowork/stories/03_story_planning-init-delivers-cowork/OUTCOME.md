# 165/03 · Planning init delivers Cowork — Outcome

## Delivered

### aof planning init --runtime cowork
`aof planning init --runtime cowork` writes `aof.plugin` and one package per recommended planner plugin under the aof home's `cowork/` (`~/.aof`, or `AOF_GLOBAL_HOME`), prints each package's full path with the upload steps, and spawns nothing.

### The project carries only its lock entry
A cowork run writes nothing in the project except `.aof/aof.lock.json`, whose cowork entry names every package relative to the aof home and records `installConfirmed: false` (FF-16506, FF-16507).

### Cowork beside claude and codex
A cowork entry is added beside the other runtimes' entries without `--force`, a re-install needs `--force` and re-pins cowork alone, and an explicit `--scope` with cowork is refused, writing nothing.

### All or nothing
A cowork run whose clone or packaging fails writes no package and no lock entry, and a `--dry-run` resolves no sha, clones nothing, spawns nothing and writes nothing (FF-16505).

### A skill finishes unvalidated without the CLI
Each packaged skill's preamble says that without `aof` a check the procedure requires is not a failed one, so a run marks its report unvalidated and names the checks to run from Claude Code or Codex.

## Assumptions

- **The operator uploads the packages** — aof cannot see Cowork, so the install, and the new Cowork task it needs, are the operator's.

## Gaps

### PRD auto-discovery in Cowork
- **Status:** open
- **Discharge condition:** a Cowork session runs `/aof:shatter` with no argument over a repo holding exactly one `PRD-*.md` at its root, and the run finds that PRD.
Shatter's discovery rule is stated in the skill, but no Cowork run has exercised it (F-05).
