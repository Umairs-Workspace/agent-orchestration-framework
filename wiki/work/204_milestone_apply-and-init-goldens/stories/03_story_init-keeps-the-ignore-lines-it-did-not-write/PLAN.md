# 204/03 · Init keeps the ignore lines it did not write — build plan

Advisory and the builder's own. The task features are the contract.

## Mechanism

**The fix.** The workspace writer holds a one-line constant and writes it over `.aof/.gitignore`
on every config write. The ignore module already owns that file additively: its ensure function
reads the file, keeps every line in order, and appends only the entries that are missing. Call it
with the one entry `/work/` and drop the whole-file write. If the ensure function's default entry
list would add more than `/work/` here, pass the list explicitly. Init must add its own line and
nothing else, or `empty`'s baseline changes for a reason that is not this fix.

**The lane.** Five scenarios, as ADR-001's table gives them. `after-work-init` names 203's
`work-init/claude` as a cross-lane base, as 203's update lane does. `global` names `empty` as its
base and runs eight steps after the init: three `assets add --global`, one refused global command
declared to exit 1, three `assets use --global`, then `assets apply`. Every step ends `--json`, so
its envelope is recorded and normalised.

## Verification step

`node scripts/golden.mjs --lane project-init --update`, then read the baselines. `customised`'s
delta holds `.aof/.gitignore` as `scratch/` then `/work/`. `after-work-init`'s holds `work init`'s
eight lines then `/work/`, and its lock's `work` section matches the base. `global`'s home tree
holds the config and three bodies. Re-run the 203 lanes and story 00's lane. None may move: `work
init` writes its ignore file through the ensure function already, and no apply scenario runs
`aof init`. Then a second `--update` writes nothing.

## Out of scope

- `aof init --force` over an existing config. It replaces the config by design. The lock keeps its
  other sections through the read-merge, which `after-work-init` already shows.
- The root `.gitignore`. Init never writes it, and `customised` holds that.
- `assets apply --global`, which refuses by design.

## Known traps

- The harness writes starting files only into the project. A global scenario's home starts empty,
  and the `assets add --global` steps fill it. That is the point.
- A refused step must declare its exit, or the scenario fails at that step with its stderr.
- Two new golden suite files move the golden directory's budget row by two.
