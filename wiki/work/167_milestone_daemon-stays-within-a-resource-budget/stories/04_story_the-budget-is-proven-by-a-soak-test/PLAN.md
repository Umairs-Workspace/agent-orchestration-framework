# 167/04 · The budget is proven by a soak test — build plan

## Mechanism

**`soak-harness.mjs`** exports one function, `runSoak({ phases, viewer })`. It:
1. makes a temp `AOF_GLOBAL_HOME` and a temp project, and generates the tree (32 live items, the
   rest under `archive/`, with STORY.md/SPEC.md frontmatter in aof's shape);
2. registers the project with a descriptor and no item rows (the empty cache). It seeds the
   journal with an event whose id collides with the one the first sync pass will mint (the
   conflict), and registers 5 workspaces whose dirs are deleted;
3. picks two free ports, writes them into the fixture config and the `--port` flag, and spawns
   both daemons with `stdio` captured and a clean env (no leaked `CLAUDE_*` or `GIT_ASKPASS`);
4. waits for each daemon's first cost snapshot, then reads snapshots at phase boundaries and takes
   CPU-seconds per phase as differences of `since start`;
5. in the viewer phase, polls `/api/mesh/status` and the board's `/api/work/list` at the UI's
   cadence, with `X-AOF-Client` and `If-None-Match`, exactly as `api.ts` does. The board's port
   comes from the status's `boards` block;
6. stops both daemons gracefully, and tree-kills them in a `finally`.

**The suite** asserts E1–E7 against the harness's result. It judges with the meter's own `judge`,
so the threshold has one home. E3 is proven by feeding the judgement a recorded over-budget phase,
not by making production code slow.

## Verification step

Run the soak suite alone (`node scripts/test.mjs --only` over the story's declared test file)
with the live desktop app running: green in about 90 s, `~/.aof` untouched. Then revert 01's memo
locally: the suite goes red, naming `serve` and `full-disk-read`. That is the red probe for
VERIFICATION.

## Out of scope

- The Mac and WSL workers (SPEC).
- The desktop guard (05). The soak measures the daemons from inside, through their own snapshots.
