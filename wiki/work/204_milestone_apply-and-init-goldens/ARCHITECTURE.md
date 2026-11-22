---
doc: architecture
---
# 204 · What aof apply, init and clean write is held to baselines — Architecture

The SPEC puts `aof assets apply`, `aof assets clean` and `aof init` on 203's golden harness. ADR-001
decides the lanes, the fixture `.aof/` and every scenario. The measurements below found four
defects that make the SPEC's acceptance false, and the operator decided at refine that 204 fixes
them (STATE). ADR-002 to ADR-005 are those fixes: co-authored files merged by path (ADR-002), the
Codex TOML merge (ADR-003), clean retracting what it recorded (ADR-004), and init's ignore file
(ADR-005). ADR-006 is what is held rather than fixed. ADR-007 is the break-down.

## Memory recall: what was surfaced, and what it changed

Architect recall `49672e72-5132-4806-8358-f1255e0ad13a` ("golden baselines for aof apply init clean
output and merges into user-owned settings files", `--area architecture`) returned five ADRs:

- **m203/ADR-001**, a verb runs as a child process in a temp project and home. **Honoured.** Every
  lane here runs the real CLI through 203's runner, and no ADR here adds an in-process path.
- **m203/ADR-003**, a baseline is a delta from a named base. **Honoured.** Each lane names its bases,
  across lanes where that saves storage (ADR-001).
- **m203/ADR-005**, named scenarios, not the cross product. **Honoured.** One three-runtime render
  is held whole, and each runtime alone is a delta over it.
- **m43/ADR-002**, `.claude/settings.json` is co-authored: "a whole-file render is correct exactly
  when aof exclusively owns the file; a co-authored file gets a surgical merge". **Honoured, and
  extended.** ADR-002 applies that rule to the files it was not yet applied to: `CLAUDE.md`,
  `.mcp.json` and opencode's `AGENTS.md`. ADR-004 applies it to clean, which still treats a merged
  file as aof's whole.
- m77/ADR-005, hook-duplicate detection, does not bear on these decisions.

PO recall `57ee8760-c07a-4f92-86f9-cb20db8d3e62` (the item's title, no filter) returned five
records. **m203/01's capability "today's first-time init over a user's own files, on record"** set
the precedent of holding today's behaviour so any change shows. It is **departed from** for the
four defects the operator chose to fix, and honoured for the two held in ADR-006. **m203's
"the baselines are platform-neutral"** is honoured: no normaliser rule is added here. The other
three (m203/01's init capability, m203/ADR-001 and m203/F-01) do not bear on the break-down.

## Measured facts this document reasons from

Measured 2026-11-21 on `81953d9b`, by running the real CLI (`node packages/core/bin/aof.mjs …`)
in scratch projects under the session's scratchpad, each with its own `AOF_GLOBAL_HOME`.

| Fact | Where |
|---|---|
| `aof apply` and `aof clean` are removed. The verbs are `aof assets apply` and `aof assets clean` | measured |
| `assets add` takes `agent`, `command`, `skill` and `rule`. MCP servers, hooks, project docs, settings and workflows are declared in `.aof/aof.config.json` | measured; `packages/core/src/application/bindings/dsl.mjs:100-118` |
| A `command` cannot target Codex: apply refuses the config with `unsupported-runtime-capability` | measured |
| Opencode renders no MCP config. Codex renders no command | measured; `packages/core/src/adapters.mjs:93-157` |
| A fixture with every kind (agent, skill, rule scoped to `src`, workflow on three runtimes; command on claude and opencode; two MCP servers; a `Stop` hook; a project doc for claude and codex; codex and claude settings) applies to 23 files plus the lock and journal. The global home stays empty | measured |
| `.claude/settings.json` is merged (`claude-settings.mjs`). `.codex/config.toml`, `.codex/hooks.json` and every `AGENTS.md` that Codex writes are merged with recorded ownership. Every other output is written whole | `packages/core/src/render-plan.mjs:15-100`; `packages/core/src/codex-settings.mjs:23-26` |
| Over a user's files, apply keeps the user's settings, Codex config, Codex hooks, root and nested `AGENTS.md`, root `.gitignore`, and `.claude/.gitignore` (`drift-warning`). **It replaces the user's `CLAUDE.md` and `.mcp.json` whole**, reported `update` "existing file will be overwritten" | measured |
| **Clean deletes a merged file whole.** Over that project it deleted the user's `AGENTS.md`, `src/AGENTS.md`, `.codex/config.toml` and `.codex/hooks.json`, user lines included. The lock records each merged file's whole hash, and clean deletes on a hash match | measured; `packages/core/src/clean.mjs:6-41` |
| The lock entry of a merged Codex file carries `ownership` (`guidance`, `toml` or `hooks`) | measured; `packages/core/src/render-plan.mjs:212` |
| **Into a fresh `.codex/config.toml`, the merge writes `model = "o3"` after the last `[mcp_servers.*]` header.** Parsed, it is `mcp_servers.docs.model`. The next apply refuses with `codex-output-conflict` and exits 1. The whole-file renderer (`codexConfigToml`) orders it correctly | measured; `codex-settings.mjs:373-445` |
| Over a user's config with a top-level key, the same merge places `model` correctly | measured |
| Clean leaves `.claude/settings.json` holding aof's entries, and leaves `.aof/aof.apply-journal.json` | measured |
| A project doc for codex and opencode, or an unscoped Codex rule beside an `AGENTS.md` doc, refuses: "Generated output conflict at AGENTS.md" | measured; `render-plan.mjs:285-300` |
| `assets apply --runtime claude`, `codex` or `opencode` each merges `.claude/settings.json`. The claude and opencode applies also write `.codex/config.toml` (the fixture's Codex settings) and the apply journal | measured; `adapters.mjs:107` |
| Re-apply over the customised project skips every file. Only the lock's instants move | measured |
| `assets apply --global` refuses by design. `assets add --global` writes `aof.config.json` and `assets/` into `AOF_GLOBAL_HOME`; `assets use --global` adds a `globalRefs` entry; apply renders the global asset into the project and writes nothing to the home. A global `command` is refused | measured |
| `aof init` writes `.aof/aof.config.json`, `.aof/aof.lock.json` and `.aof/.gitignore` (`/work/`). A second `init` refuses with `config-exists`, exit 1 | measured |
| **`aof init` replaces a user's `.aof/.gitignore`.** The user's `scratch/` line was lost | measured; `packages/core/src/application/bindings/workspace-writer.mjs:9`, `:28` |
| `aof init` after `aof work init` keeps the lock's `work` section (92 entries), through `mergeLock` | measured; `packages/core/src/application/bindings/commands/project-init.mjs:41-50` |
| The additive owner of `.aof/.gitignore` already exists | `packages/core/src/aof-gitignore.mjs:94` |
| 203's rebuild recomputes `hooks` ownership and refuses any other kind by name. 203's fixture verb writes whole files from a spec file | `test/support/golden/baseline-store.mjs:128-140`; `test/golden/fixtures/fixture-verb.mjs` |
| `test/golden` is budgeted at 6 direct children with no allowance, and its row expects one lane suite per verb. `test/arch/store` is at its ceiling of 22, and its row says further ownership assertions extend FF-15404's control | `test/arch/testing/acd-source-directory-budget.test.mjs:298-302`, `:359-363` |

**Graph.** `aof graph build .` succeeded (22,457 nodes, 49,545 edges, built
2026-11-21T23:34:09Z). `aof graph impact` grounds ADR-007's cuts: `codex-settings.mjs` and
`render-plan.mjs` are both depended on by `adapters.mjs`, `work/init.mjs` and the Codex ownership
suite. `clean.mjs` depends only on `lock.mjs` and `workspace.mjs`. `workspace-writer.mjs` has one
dependent, `application/assemble.mjs`. `test/support/golden/lanes.mjs` is imported by
`scripts/golden.mjs`, the harness, the baseline store and every lane suite.

## ADR-001 — Four lanes on 203's harness, one per verb surface, over one fixture declared as data

**Status:** Accepted · **Date:** 2026-11-21

**Context.** 203's harness runs a lane: an id, scenarios, each with an optional base, starting
files and verb steps (m203/ADR-001, ADR-003, ADR-005). The SPEC needs every asset kind on three
runtimes, merges into user files, clean, init and `--global`. The fixture `.aof/` must hold every
kind, and a file tree committed under `test/` would be read by every source sweep (m203/ADR-003).

**Decision.**

1. **The fixture is data.** `test/golden/assets-apply.lane.mjs` exports `EVERY_KIND`, a map from
   project path to text: `.aof/aof.config.json` and the asset bodies it names. It declares, on
   runtimes `claude`, `codex` and `opencode` unless noted:
   - an agent, a skill, a workflow, and a rule scoped to `paths: ["src"]` (so Codex writes it to
     `src/AGENTS.md`, beside the root project doc, not into it);
   - a command, on `claude` and `opencode` only, because Codex refuses commands;
   - MCP servers `docs` (stdio) and `remote` (http, `claude` and `codex`);
   - a `Stop` hook running `npm run lint`;
   - a project doc `guide` targeting `AGENTS.md` and `CLAUDE.md`, on `claude` and `codex`;
   - settings `codex.model` and `claude.model`.
   Other lanes import it. A scenario that needs a variant derives it from `EVERY_KIND` in its own
   lane module. Nobody keeps a second copy.
2. **Four lanes**, each a lane module and a suite under `test/golden/`, registered in
   `test/support/golden/lanes.mjs` and `test/golden/index.mjs`:

   | lane | scenario | base | starting files | steps (each `--json`) |
   |---|---|---|---|---|
   | `assets-apply` | `every-kind` | none | `EVERY_KIND` | `assets apply` |
   | | `claude`, `codex`, `opencode` | `every-kind` | `EVERY_KIND` | `assets apply --runtime <one>` |
   | | `re-apply` | `every-kind` | `EVERY_KIND` | `assets apply`, `assets apply` |
   | `assets-merge` | `customised` | `assets-apply/every-kind` | `EVERY_KIND` plus `USER_FILES` | `assets apply` |
   | | `customised-re-apply` | `customised` | as `customised` | `assets apply`, `assets apply` |
   | | `opencode-agents` | `assets-apply/opencode` | `EVERY_KIND` with `guide` on `opencode` only, plus the user's `AGENTS.md` | `assets apply --runtime opencode` |
   | | `mcp-collision` | none | `EVERY_KIND` plus a user `.mcp.json` declaring a server named `docs` | `assets apply`, exit 1 |
   | | `doc-conflict` | none | `EVERY_KIND` with `guide` also on `opencode` | `assets apply`, exit 1 |
   | `assets-clean` | `plain` | none | `EVERY_KIND` | `assets apply`, `assets clean`, `assets clean` |
   | | `customised` | `plain` | `EVERY_KIND` plus `USER_FILES` | `assets apply`, `assets clean` |
   | | `drifted` | `plain` | `EVERY_KIND` | `assets apply`; a user edit appending a line to `.claude/agents/my-agent.md`; a user edit prepending a line to `CLAUDE.md`; `assets clean` |
   | `project-init` | `empty` | none | none | `init --runtime claude,codex,opencode` |
   | | `customised` | `empty` | a root `.gitignore`, and `.aof/.gitignore` holding `scratch/` | as `empty` |
   | | `re-init` | `empty` | none | as `empty`, twice; the second exits 1 |
   | | `after-work-init` | `work-init/claude` | none | `work init --runtime claude`, `init --runtime claude` |
   | | `global` | `empty` | none | as `empty`; `assets add --global` a skill, an agent and a rule; `assets use --global` each; `assets apply` |

3. **`USER_FILES`** is exported by `test/golden/assets-merge.lane.mjs`: the user's own file at every
   merge point. That is `.claude/settings.json` (an allow and a `Stop` hook),
   `.codex/config.toml` (a top-level key and an `[mcp_servers.mine]` table), `.codex/hooks.json` (a
   `Stop` matcher group), `AGENTS.md`, `src/AGENTS.md`, `CLAUDE.md`, `.mcp.json` (a server
   `mine`), a root `.gitignore` and `.claude/.gitignore`. Story 01 fixes their text.
4. **`--global` is held through `assets add --global` and `assets use --global`.** `assets apply
   --global` refuses by design. The `global` scenario's home tree holds the global config and asset
   bodies, and its project tree holds their renders. No step reports a path outside `<project>` or
   `<home>`.
5. **A step may name its own script.** A step is `{ argv, exit }` and runs the lane's command
   (m203/ADR-001 §1). It may also carry `command`, a test fixture script, which runs in its place
   with the same working directory and environment. `test/golden/fixtures/user-edit.mjs` is the
   one such script: `<path> --append <text>` or `<path> --prepend <text>` edits one project file,
   as a user would between two verbs, and exits 1 naming the path when the file is absent. The
   step record names the script by its repository-relative path, so `steps.golden` says what ran.
   Otherwise the harness is unchanged. No normaliser rule is added (m203/ADR-002 §6), and any
   run-to-run instability found is fixed where it is rendered.

**Alternatives considered.**
- *Build the fixture with `assets add` steps.* MCP, hooks, docs, settings and workflows have no
  verb, so a config edit would still be needed. Rejected.
- *One `assets` lane for apply, merge and clean.* Every story would edit one lane module. Rejected.
- *A per-runtime cross of every scenario.* The three-runtime render holds every runtime's files,
  as 203 measured for init. Rejected.

**Consequences.** Each lane costs two files in `test/golden`, so its budget row rises from 6 to 14
across the four stories, each moving it by two in its own diff. `user-edit.mjs` is the second
member of `test/golden/fixtures`. Lanes whose bases are other lanes' scenarios follow those lanes.
205's lanes over `aof work` verbs can model a user's edit the same way.

## ADR-002 — A co-authored file is decided by its path, whatever the runtime, and is merged with recorded ownership

**Status:** Accepted · **Date:** 2026-11-21

**Context.** m43/ADR-002 made `.claude/settings.json` a surgical merge, and 154 made Codex's
shared files merges with recorded ownership. The predicate that decides "shared" asks for
`runtime === "codex"` (`codex-settings.mjs:23-26`). So the same kind of file, a project's
guidance or MCP list, is merged when Codex writes it and replaced when Claude Code or opencode
writes it. Measured, apply replaced a user's `CLAUDE.md` and `.mcp.json`.

**Decision.**

1. **The co-authored set is a set of paths:** `AGENTS.md` at any depth, `CLAUDE.md`, `.mcp.json`,
   `.codex/config.toml` and `.codex/hooks.json`. One predicate answers "is this output
   co-authored" from the path alone. It replaces the runtime-gated `codexSharedOutput`, and
   `render-plan.mjs` asks it. `.claude/settings.json` keeps its own merge (m43/ADR-002), outside
   the render plan.
2. **Each path merges by its kind.** `AGENTS.md` and `CLAUDE.md` use the existing
   `aof-managed:begin`/`end` guidance block. `.codex/config.toml` and `.codex/hooks.json` are
   unchanged. `.mcp.json` gains an `mcp-servers` merge:
   - aof's servers are entries under `mcpServers`, recorded by id with the hash of each entry's JSON;
   - the user's servers and every other top-level key are untouched, and aof's are added after them;
   - the file is written back as two-space JSON only when its value changed.
3. **Every co-authored output takes the path Codex's take today:** target preflight, intent in
   the apply journal before the write, and the ownership recorded in its lock entry.
4. **A collision refuses before any write.** A user's entry at aof's key, such as a user server
   named as one of aof's, refuses with `co-authored-output-conflict`, and the run writes nothing.
   Codex's refusals keep their `codex-output-conflict` code.
5. **A legacy entry upgrades silently when unedited.** A `CLAUDE.md` or `.mcp.json` lock entry
   written whole before this fix carries no ownership. If the file still matches its hash, the
   next apply adopts it as aof's, exactly as the guidance merge's legacy branch does for Codex.
6. Every other output stays a whole-file render.

**Alternatives considered.**
- *Refuse to write over any user file not in the lock.* That stops the damage but leaves a
  project with its own `CLAUDE.md` unable to use project docs at all. Rejected.
- *A per-runtime list of shared paths.* That is how the gap arose. The file's role does not depend
  on which runtime renders it. Rejected.

**Consequences.** A claude-only apply that renders a project doc or an MCP server now writes the
apply journal, and its baseline shows it. Opencode's `AGENTS.md` is covered by construction and
held by `assets-merge/opencode-agents`. Two runtimes writing one `AGENTS.md` still conflict
(ADR-006). FF-20401 holds the rule.

## ADR-003 — The TOML merge puts a top-level setting before the first table, and keeps the render's order

**Status:** Accepted · **Date:** 2026-11-21

**Context.** Into a fresh `.codex/config.toml`, `mergeToml` inserts the top-level additions and
the new tables at the same offset, and applies equal-offset edits in an order that puts the
top-level key last, inside the final table. Codex then reads `model` as a server field, and the
next apply sees aof's own entry missing and refuses.

**Decision.**

1. A top-level addition is inserted before the file's first table header, or at its start when it
   has none.
2. Edits at one offset are applied so that the result keeps the render's order.
3. After the merge, the re-indexed text must hold every owned entry under the table its key
   names. A merge that would not refuses, and writes nothing.
4. The change is confined to `mergeToml`. A case in `packages/core/test/codex-ownership.suite.mjs`
   proves it at the seam, and `assets-apply/every-kind` and `re-apply` prove it end to end.

**Consequences.** The `every-kind` baseline holds `model = "o3"` at the top of the Codex config,
and `re-apply`'s second step skips every file. No 203 baseline holds a fresh-file merge with both
a top-level key and a table (measured), so none is expected to move. If one does, it moves in
story 00's diff and shows exactly this.

## ADR-004 — Clean retracts what aof recorded, and deletes only a file left with nothing of the user's

**Status:** Accepted · **Date:** 2026-11-21

**Context.** `createCleanPlan` deletes any lock entry's file whose whole hash matches. For a merged
file the lock records the merged file's hash, so the user's lines are deleted with aof's. Apply
already knows how to retract recorded ownership when an output leaves the plan
(`render-plan.mjs:107-118`).

**Decision.**

1. **An entry with `ownership` is retracted, not deleted.** Clean removes aof's recorded fragment
   with the same retraction apply uses for a stale co-authored output. There is one retraction,
   and clean calls it.
2. **The remainder is written back, or the file deleted when nothing of the user's is left.**
   Nothing is left when, with empty containers dropped, the file holds no text (guidance, TOML)
   or no value (hooks, `.mcp.json`). A written-back file is reported with a new clean action,
   `retract`, and the reason "aof's recorded entries removed; the user's content kept".
3. **Drift is judged on aof's fragment.** An edit outside it is the user's and does not stop the
   retraction. An edit inside it is a `drift-warning`: the file is untouched and its lock entry
   kept.
4. **A whole-file entry behaves as today:** `delete` on a hash match, `drift-warning` on a
   mismatch, `skip` when absent.
5. `retract`, `delete` and `skip` remove the entry from the lock. A second clean finds nothing to
   do.
6. **A user's edit between apply and clean is a step** (ADR-001 §5), not a rebuilt baseline. The
   `drifted` scenario runs the real apply, the user's two edits, then the real clean.

**Alternatives considered.**
- *Skip every co-authored entry in clean.* It stops the damage but leaves aof's guidance and
  servers in the user's files. That is the opposite of "removes exactly what aof wrote".
  Rejected.
- *Restore the user's original bytes from a snapshot.* aof keeps no snapshot, and the user may
  have edited their part since. Rejected.
- *Start `drifted` from a rebuilt apply baseline* (m203/ADR-006 §2's form). The rebuild would
  have to recompute `guidance`, `mcp-servers` and `toml` ownership. TOML ownership is the hash of
  each statement's raw text, so the test would need a second TOML indexer beside the product's.
  Every apply baseline holds a Codex config, because even a claude-only apply writes one (ADR-006
  §3). Rejected for a step that edits as a user does.

**Consequences.** A user's Markdown file comes back byte for byte when the merge appended to a
file ending in a newline. A JSON or TOML file comes back to the same parsed value, because the
merge may have reformatted it. FF-20402 holds the rule. `.claude/settings.json` is not in the
lock and is held as ADR-006 says.

## ADR-005 — `aof init` adds its ignore line to `.aof/.gitignore`, and never writes the file whole

**Status:** Accepted · **Date:** 2026-11-21

**Context.** `writeWorkspaceConfig` writes `.aof/.gitignore` as the single line `/work/`
(`workspace-writer.mjs:9`, `:28`). `aof-gitignore.mjs` is the file's additive owner, which
`work init` and the memory backends use. So `aof init` drops a user's lines, and drops the
entries `work init` wrote.

**Decision.** `writeWorkspaceConfig` adds `/work/` through `aof-gitignore.mjs`'s additive writer.
Every existing line is kept in its order, `/work/` is appended only when absent, and a file that
already holds it is not rewritten. No other writer of `.aof/.gitignore` remains.

**Consequences.** `project-init/customised` holds `scratch/` then `/work/`, and
`after-work-init` holds `work init`'s entries with `/work/` appended. `empty` is unchanged.

## ADR-006 — What is held, not fixed, and how it is held

**Status:** Accepted · **Date:** 2026-11-21

**Decision.** Three measured behaviours damage no user content, and are held in the baselines as
they are, so that any change to them shows. This is the line the operator drew at refine
(STATE):

1. **Clean leaves aof's entries in `.claude/settings.json`**, which is not in the lock, and leaves
   `.aof/aof.apply-journal.json`. `assets-clean/plain` and `customised` hold both.
2. **An `AGENTS.md` written by two runtimes refuses** ("Generated output conflict"). This happens
   with a project doc on Codex and opencode, or with an unscoped Codex rule beside an `AGENTS.md`
   doc. `assets-merge/doc-conflict` holds the refusal and its message.
3. **A single-runtime apply writes outside the runtime it was asked for.** Every apply merges
   `.claude/settings.json`, because `apply.mjs` calls the merge whatever runtimes are asked for.
   An apply for claude or opencode alone writes `.codex/config.toml` when the config declares
   Codex settings, because the renderer gates that file on the settings and not on the requested
   runtimes (`adapters.mjs:107`). `assets-apply/claude`, `codex` and `opencode` hold both.

Each is raised as a finding at verify and filed, as 203's F-01 was. A user's own file at a whole-file
aof path, such as `.claude/agents/<id>.md`, is replaced by apply as m203/F-01 records for init. No
scenario here exercises it, and the SPEC does not ask.

## ADR-007 — Four stories: apply, merges, clean, init

**Status:** Accepted · **Date:** 2026-11-21

| story | owns | waits on |
|---|---|---|
| 00 · every asset kind applies to its baseline | the fixture, the `assets-apply` lane and its five baselines, the TOML fix (ADR-003) | nothing |
| 01 · apply merges keep the user's entries | `USER_FILES`, the `assets-merge` lane and its five baselines, the co-authored predicate and the `.mcp.json` merge (ADR-002), the held `AGENTS.md` refusal (ADR-006 §2), FF-20401 | 00 |
| 02 · clean removes exactly what aof wrote | the `assets-clean` lane and its three baselines, clean's retraction (ADR-004), a step's own script and `user-edit.mjs` (ADR-001 §5), FF-20402 | 00, 01 |
| 03 · init keeps the ignore lines it did not write, and `--global` writes only into the home | the `project-init` lane and its five baselines, the additive `.aof/.gitignore` (ADR-005), the `--global` path (ADR-001 §4) | nothing |

The cuts follow the graph's coupling. 01 and 02 both change how a co-authored file is recognised
and retracted, in `codex-settings.mjs` and `render-plan.mjs`, which share every dependent. 02 also
retracts the ownership kinds 01 introduces, and starts from 00's and 01's lanes, so the chain is
00 → 01 → 02 by data as well as by code. 03 touches `workspace-writer.mjs`, whose one dependent
is the assembly, and starts from 203's `work-init/claude`, so it shares no source with the chain.

Every story also edits the lane registry, the golden index and the `test/golden` budget row: one
line each. Those three write sets overlap, so `aof work next` serialises 03 against the story in
flight. That costs a wave, not a cold read, and is accepted.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-20401 | **A co-authored file is merged, never written whole.** For each path in the co-authored set, and each runtime that renders it, planning an apply over a user's file at that path yields an action that is a merge, recording ownership and holding the user's content. It is never "existing file will be overwritten". | `test/arch/store/acd-codex-output-ownership.test.mjs`, a case beside FF-15404's, with its self-check (landed with story 01) | ADR-002 §1–§4 |
| FF-20402 | **Clean never deletes a user's content.** For a lock entry carrying ownership, clean's plan never emits `delete` while the file holds content outside aof's recorded fragment. It retracts, or it warns. | `test/arch/store/acd-codex-output-ownership.test.mjs`, a case beside FF-15404's, with its self-check (landed with story 02) | ADR-004 §1–§3 |
