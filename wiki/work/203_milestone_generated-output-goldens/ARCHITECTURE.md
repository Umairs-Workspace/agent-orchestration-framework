---
doc: architecture
---
# 203 · Every file aof generates is held to a committed baseline — Architecture

The SPEC asks for a harness, an update flow, a normaliser and a first lane over `aof work init` and
`aof work update`. ADR-001 decides how a verb is run and what is captured. ADR-002 is the
normaliser and the line it draws against hiding instability. ADR-003 is where a baseline lives and
in what form. ADR-004 is the comparison, its report and the one door that writes. ADR-005 is the
init lane's scenarios. ADR-006 is the update lane: idempotence, a customised update, and the
upgrade. ADR-007 is the break-down.

## Memory recall: what was surfaced, and what it changed

Architect recall `22675a29-f830-4041-8813-8ea19ba32ecd` ("golden baseline snapshot of generated
bundle output with normalisation and an update flag", `--area architecture`) returned one
near-miss and three ADRs:

- **01/R2**, near-miss, "Content-addressed artifacts must pin line endings or cross-platform CI
  hashes diverge". **Honoured.** The committed baselines are pinned `text eol=lf`, and FF-20303
  asserts the pin through `git check-attr`, which is that lesson's method (ADR-003 §4).
- **01/ADR-002**, the content-addressed bundle manifest. **Honoured.** This milestone does not
  retire it. The installer still reads its hashes, and the SPEC defers its retirement.
- **01/ADR-003**, init and update reuse one render and lock pipeline. **Honoured.** The harness
  runs both verbs black-box and owns no render of its own (ADR-001).
- 01/ADR-005, the `aof-generated` stamp, does not bear on these decisions.

PO recall `015155dc-e15d-4397-9947-b737c8f6ff1e` (the item's title, no filter) returned five
records. Two were honoured:

- **192/02 R1**, "A stale lock is proven stale by re-rendering from the lock's own baseline". The
  upgrade lane starts from the committed baseline, rebuilt into a real tree with its lock, and
  runs `update` over it (ADR-006 §3).
- **57 F-57-M-2**, a directory grew without moving the census literal that counts it. Every story
  here adds files under budgeted test directories, so each one declares
  `acd-source-directory-budget` in its write set and moves its row in the same story.

The other three (a 63 capability, 140's F-04 and 57's F-57-00-2) do not bear on the break-down.

## Measured facts this document reasons from

Measured 2026-11-20 on `4cac6cd8`, by running the real CLI
(`node packages/core/bin/aof.mjs work …`) in scratch directories under the session's scratchpad,
each with its own `AOF_GLOBAL_HOME`.

| Fact | Where |
|---|---|
| `work init --runtime claude,codex,opencode` on an empty folder writes 238 files, 1.9 MB: `.claude` 53, `.agents` 82, `.opencode` 48, `.codex` 10, `.aof` 43, `wiki/work` 2 | measured |
| Two inits in two folders are byte-identical except `.aof/aof.lock.json`, where only the `generatedAt` instants differ | `diff -r`, measured |
| Nothing else in the tree carries an instant, an absolute path or the version. The lock carries the version, and the lock and the apply journal carry `sha256:` hashes | `grep -r`, measured |
| `work init` writes no file into the global home | measured |
| `work update` on a fresh init skips all 232 planned files and creates, updates and deletes none | measured |
| A fresh init with one member's text made older (its lock hash matching), one retired file present with its lock entry, and one member removed from disk and lock, updates to 1 created, 1 updated, 1 deleted and 230 skipped. The result equals a fresh init. The lock holds the same 232 paths in the same order, and only its instants differ | measured |
| Single-runtime inits for claude (97 files), codex (138) and opencode (76) together hold exactly the three-runtime tree's files. Only the lock and the journal differ | measured |
| A plain `work init` writes no `.aof/aof.config.json`. A profile is a config the project already holds when `init` runs | `packages/core/src/application/bindings/work/init.mjs:78-235` |
| Init and update load the bundle composed for the project's own config, and run one shared synthesis | `init.mjs:107-113`; `packages/core/src/work/update.mjs:94-103`; `packages/core/src/work/bundle-synthesis.mjs:73` |
| Practices are gated by keys: `discovery` by `work.examples.enabled`, `operator-aware` by that and `work.examples.operatorAware`, `build-brief` by `work.plan.enabled`. **Learning has no key.** It ships `/aof:teach` in every render | `packages/specification-by-example/assets/bundle.json`; `packages/core/assets/bundle.json:3-9`; `packages/learning/src/contribution.mjs` |
| An integration is on when its `work.integrations.<id>` block is present. **Notion ships no bundle member.** Hyperagent ships `/aof:hyperplan` for claude and opencode, with a codex variant | `packages/core/src/integrations.mjs:20`; `packages/integration-notion/src/contribution.mjs:12`; `packages/integration-hyperagent/assets/bundle.json` |
| Over `default`, every practice on changes 18 files (refine and four agents in each runtime, the `EXAMPLES.md` and `RESEARCH.md` templates). Hyperagent adds `/aof:hyperplan` in three places. Notion changes no file. Each adds only its own config besides | `diff -r`, measured |
| Over a project holding user files, `init` keeps the user's own command, `AGENTS.md`, `CLAUDE.md`, `.codex/config.toml` and `.opencode/opencode.json`, and both merges keep the user's hooks and permissions | measured |
| **First-time `init` overwrites a user's own file that sits at an aof path** (`.claude/agents/aof-architect.md`), reported as `update`, with no drift warning | measured |
| `init` refuses a `.codex/hooks.json` it cannot parse (`codex-hooks-unparseable`, exit 1) | measured |
| A test helper already runs `work init` and `work update` as a child process under its own `AOF_GLOBAL_HOME` | `test/support/cli-spawn.mjs:58-111` |
| The repository has no line-diff utility, and AGENTS.md forbids adding a package without a phase that requires it | `grep`, measured |
| The installed trees are pinned `text eol=lf` because a CRLF checkout makes every rendered file drift | `.gitattributes`; `test/arch/bundle/acd-bundle-install-eol-pinned.test.mjs` |
| Every direct child of a budgeted test directory is counted against a ceiling with no allowance | `test/arch/testing/acd-source-directory-budget.test.mjs:161-212`, `:305`, `:340` |
| The CI gate runs on `ubuntu-latest`. No workflow runs the suite on Windows or macOS | `.github/workflows/gate.yml:28` |

**Graph.** `aof graph build .` timed out after 600 s (`graphify-timeout`), so no graph was used.
The boundaries in ADR-007 are drawn from the source read above. The coupling they cut is small:
the harness reaches the verbs through the CLI's argv, and no story writes a runtime module.

## ADR-001 — A verb runs as a child process in a temp project with a temp global home, and both trees are captured

**Status:** Accepted · **Date:** 2026-11-20

**Context.** aof's product is what a verb leaves on disk: the rendered files, and also the merges
into `.claude/settings.json` and `.codex/hooks.json`, the `.gitignore` files, the lock and the
journal. Some of that is written by the command's door, after the core function returns. A test
must also never touch the real `~/.aof`, which holds the live config and mesh stores.

**Decision.**

1. A scenario's steps run as `node packages/core/bin/aof.mjs <verb…> --json`, through
   `spawnCliSync` (`test/support/cli-spawn.mjs`). The working directory is the temp project.
   `AOF_GLOBAL_HOME` is the temp home and `NODE_NO_WARNINGS=1` is set. Nothing else from the
   environment is changed.
2. A scenario has one temp root under `os.tmpdir()`, holding `project/` and `home/`. The harness
   asserts that the root is a direct child of the temp parent, then removes it when the scenario
   ends, whether it passed or failed (the `bundleFixtureRoot` guard).
3. Before the first step, the harness writes the scenario's starting files into `project/`,
   including the config that selects a profile.
4. After the last step, the harness captures two trees: every file under `project/` and every file
   under `home/`, dotfiles included, keyed by their `/`-joined relative paths. An empty tree is
   still captured, because an empty home is a claim.
5. Each step also leaves a record: its argv, its exit code and its parsed `--json` envelope. A
   step whose exit code is not the one the scenario declares fails the scenario. The failure names
   the step and shows its stderr. The step records are part of what is compared (ADR-003 §1).

**Alternatives considered.**
- *Call `initWork` and `updateWork` in-process.* Faster, but it skips the command door, and the
  harness would then hold a second idea of what the verb does. It also shares the test process's
  state. Rejected.
- *Shell out to the packaged `aof` binary.* It tests the payload, not the checkout, and it is
  absent on a fresh clone. Rejected.

**Consequences.** Each step costs a Node start (about 1 s measured). The first lane has about 20
steps. 204 and 205 reuse the same runner with other verbs.

## ADR-002 — Normalisation is a closed rule list in one module, and instability is fixed at its source

**Status:** Accepted · **Date:** 2026-11-20

**Context.** A baseline must hold on macOS, Windows and Linux, and on every run. Some values are
meant to differ (an instant, an absolute temp path, a version, a content hash). Others differ only
because the render is unstable, such as an order that follows the file system. A normaliser that
grows a rule for the second kind hides a defect behind a green suite.

**Decision.**

1. `test/support/golden/normalise.mjs` holds the rules as one ordered, exported list. Each rule has
   an id and applies to file contents, step envelopes or both. Nothing else under
   `test/support/golden/` rewrites captured content.
2. The list is closed at these six rules, in this order:
   - `eol`: CRLF and a lone CR become LF.
   - `temp-paths`: the scenario's project and home paths become `<project>` and `<home>`. Each
     path is matched in its given and `realpath` forms (macOS's temp dir is a symlink), with
     either separator, and JSON-escaped.
   - `instants`: an ISO-8601 instant becomes `<timestamp>`.
   - `hashes`: `sha256:` and 64 hex digits become `sha256:<hash>`.
   - `version`: the running aof's version string, as a whole token, becomes `<version>`.
   - `build-id`: the running build's id, where one exists, becomes `<build-id>`.
3. Path separators are normalised in tree keys, and inside the paths `temp-paths` matches. Nothing
   else is rewritten. A blanket `\` → `/` is forbidden, because the bundle's prose and regexes
   contain backslashes.
4. A captured file that is not valid UTF-8 fails the scenario by name. It is never compared as
   mangled text.
5. A value that differs from run to run for any other reason, such as ordering, is fixed where it
   is rendered, in the story that finds it. It is never given a rule. The lane runs one scenario
   twice, applies only `eol`, `temp-paths` and `instants`, and asserts the two trees are equal,
   so an unstable order fails at the source (story 01).
6. A seventh rule needs a superseding ADR. FF-20301 asserts the list.

**Alternatives considered.**
- *Ignore the lock and the journal.* That would make them invisible, and they are generated
  output a user commits. Rejected.
- *Normalise everything that differs between two runs.* That is the defect this ADR exists to
  prevent. Rejected.

**Consequences.** A prose edit changes its file's text and no hash line, so the diff is the edit.
A change to a lock field other than a hash, an instant or the version still shows.

## ADR-003 — A baseline is committed per scenario, as a delta from a named base, LF-pinned and suffixed out of every glob

**Status:** Accepted · **Date:** 2026-11-20

**Context.** The three-runtime tree is 1.9 MB and 238 files. The first lane has eight init
scenarios, and most of their files are the same. Stored whole, one edit to a shared template
would show eight times in a PR, and the SPEC's acceptance is that an edit shows as exactly that
edit. The files are also `.mjs`, `.js`, `.feature`, `.md` and `.toml`. Committed under `test/` as
they are, they would be read by the source sweeps, the suite census, the graph and Claude Code.

**Decision.**

1. A scenario's baseline lives at `test/golden/baselines/<lane>/<scenario>/` and holds:
   - `project/<path>.golden` and `home/<path>.golden`, one per file the scenario adds or changes
     relative to its base;
   - `removed.golden`, the sorted base paths (prefixed `project/` or `home/`) this scenario does
     not have;
   - `steps.golden`, the normalised step records (ADR-001 §5), as formatted JSON.
2. A scenario names at most one `base`: a scenario of its own lane by id, or another lane's as
   `<lane>/<scenario>`. Its expected tree is the base's
   expected tree, minus `removed`, overlaid with its own files. A scenario with no base stores its
   whole tree. A chain may be several deep, and a cycle or a missing base is an error that names
   the chain.
3. A file is stored in a derived scenario only when it is absent from its base or its normalised
   bytes differ. The writer computes this, and nobody writes a delta by hand.
4. `.gitattributes` pins `test/golden/baselines/** text eol=lf`. FF-20303 asserts the pin through
   `git check-attr`, and asserts that every file under the root ends in `.golden`.

**Alternatives considered.**
- *Store every scenario whole.* Simple, but it is about 11 MB, and a shared edit shows eight
  times. Rejected.
- *One snapshot file per scenario.* A PR hunk then sits far from its file's name. Rejected.
- *A content-addressed blob store.* A changed file appears as a new blob, not as a diff. Rejected.
- *Exclude the directory from each tool.* Every sweep has its own exclude list. One suffix
  covers them all. Rejected.

**Consequences.** A template edit shows once, in the base. A file that differs in a derived
scenario shows again there, correctly, because that scenario's copy changed too. Adding a member
to one runtime adds a line to the other runtimes' `removed.golden`, which is honest: it says
those runtimes do not get it.

## ADR-004 — Drift fails with a summary and a unified diff per file, and only the update script writes

**Status:** Accepted · **Date:** 2026-11-20

**Context.** A failure must say what changed in terms a reviewer reads. And a run that silently
rewrites its own expectations is no check at all.

**Decision.**

1. The comparison materialises the expected tree (ADR-003 §2) and compares it with the normalised
   actual tree, file by file, then compares the step records.
2. A mismatch fails with a summary first: counts of added, removed and changed files, then the
   paths under each heading. A unified diff follows for each changed file, with 3 lines of context,
   and an added or removed file is diffed against nothing. Diffs are printed for the first 20 files
   in path order. A longer list ends with how many were left out, and the script prints all of
   them. The message's last line is the exact update command for that lane and scenario.
3. The diff is a line LCS in `test/support/golden/line-diff.mjs`. No package is added.
4. `scripts/golden.mjs [--lane <id>] [--scenario <id>] [--update]` runs scenarios outside the test
   runner. Without `--update` it reports exactly as the suite does. With it, it writes each
   scenario's minimal delta, removes files it no longer needs, and prints what it wrote. Updating a
   base re-derives every scenario whose chain includes it, base first. A second `--update` on an
   unchanged tree writes nothing.
5. The writer lives in `test/support/golden/baseline-writer.mjs`, and only `scripts/golden.mjs`
   imports it. No environment variable turns a test run into an update. FF-20302 asserts this.
6. A missing baseline fails the suite with the update command. The suite never seeds one.

**Alternatives considered.**
- *`AOF_GOLDEN_UPDATE=1` in the test run.* An exported variable would rewrite baselines inside a
  gate run and report green. Rejected.
- *`git diff --no-index`.* Its output depends on the user's git config, and git is a second
  dependency. Rejected.

**Consequences.** Accepting a change is one command plus a PR review of the `.golden` diff. A
reviewer sees the same diff the failure printed.

## ADR-005 — The init lane: eight named scenarios, a full base and deltas, not the full cross product

**Status:** Accepted · **Date:** 2026-11-20

**Context.** The SPEC names three profile choices beyond default, three runtimes and two
starting states. The full cross product is 24 scenarios. The measured union property means a
three-runtime render already holds every runtime's files, and the delta form means each further
scenario costs only what differs.

**Decision.** A lane is declared as data in `test/golden/<lane>.lane.mjs`: its id, and per scenario
an id, an optional base, the starting files, and the steps. The `work-init` lane:

| scenario | base | runtimes | starting state | what it holds |
|---|---|---|---|---|
| `default` | none | claude, codex, opencode | empty folder | the whole tree |
| `claude` | `default` | claude | empty folder | what claude alone lacks or changes |
| `codex` | `default` | codex | empty folder | likewise |
| `opencode` | `default` | opencode | empty folder | likewise |
| `all-practices` | `default` | all three | config: `work.examples.enabled`, `work.examples.operatorAware`, `work.plan.enabled` all true | the practices' prose |
| `notion` | `default` | all three | config: `work.integrations.notion: {}` | its config only. Notion ships no member |
| `hyperagent` | `default` | all three | config: `work.integrations.hyperagent: {}` | `/aof:hyperplan` and its variants |
| `customised` | `default` | all three | the user's files beside aof's paths, listed in story 01's map | what the user keeps, and what the merges do |

Each runs one step, `work init --runtime <list>`, which exits 0. Learning has no key, so it is in
every scenario, and `all-practices` turns on every key that exists.

**Alternatives considered.**
- *The full cross product.* The measured union property makes most of it redundant. Rejected.
- *Profiles on one runtime each.* That would leave out how each runtime renders a practice's
  prose. Rejected.

**Consequences.** The `customised` baseline records that first-time `init` overwrites a user's
file at an aof path. That is today's behaviour, held so that any change to it shows. Whether it
should change is not this milestone's to decide (STATE).

## ADR-006 — The update lane: update on its own output, a customised update, and an upgrade from the committed baseline

**Status:** Accepted · **Date:** 2026-11-20

**Context.** The SPEC asks that `update` on a baseline's own output changes nothing, and that a
tree generated by the previous baseline produces exactly the expected changes when updated.

**Decision.**

1. **Idempotence is a property of every init scenario, not a baseline.** For each `work-init`
   scenario, the lane runs its steps and then `work update`. The tree must equal that scenario's
   committed baseline, and the update's envelope must report 0 created, updated, deleted and
   drift-warning.
2. **`customised-update`** (base: `work-init/customised`, cross-lane) starts from that committed
   baseline, rebuilt as §3 describes, which is the tree `init` left. It applies a declared user edit
   to one aof-managed file and one new user file, then runs `update`. Its baseline holds the tree
   and the step records: the edited file kept and reported `drift-warning`, and the user's file
   untouched. A base may name another lane's scenario as `<lane>/<scenario>`. Starting from the
   rebuilt baseline needs no step kind besides a verb. The lane hands the rebuilt tree, with its
   edits, to the harness as the scenario's starting files (ADR-001 §3).
3. **`upgrade`** starts from the committed `work-init/default` baseline, rebuilt into a real tree:
   every placeholder is filled with the current value, and every lock and journal hash is
   recomputed from the rebuilt file it names. The rebuild refuses a baseline whose lock records
   drift. The stored hashes are placeholders, so drift is read from the baseline's step record:
   any step reporting a `drift-warning`, or a lock entry whose file the baseline lacks. Then three declared mutations model an older release:
   - one member's file holds older text, and its lock hash matches that text;
   - a file aof no longer ships is present, with its lock entry;
   - one current member is absent from disk and from the lock.

   One step runs `work update`. The tree must equal the `default` baseline, and the step record
   must show exactly 1 updated, 1 deleted and 1 created. The rest are skipped. Its baseline is a
   delta over `work-init/default`, which should hold only `steps.golden`.
4. The rebuild lives in `test/support/golden/baseline-store.mjs`, beside materialisation, because
   it is materialisation plus rehydration.

**Alternatives considered.**
- *A committed snapshot of a past release as the previous tree.* Every release is `0.1.0`, and a
  second frozen tree would double the storage. Rejected.
- *Take the previous tree from git history.* A `git archive` copy has no history, and that is
  how reds are verified on this machine. Rejected.

**Consequences.** Before a change's baselines are updated, the upgrade check fails with the same
file diff as the init lane, plus a step record that names exactly the files the update would
change. After the update the check holds again. 207 can then show "the diff is empty" for an old
tree run through new code.

## ADR-007 — Three stories: the harness, the init lane, the update lane

**Status:** Accepted · **Date:** 2026-11-20

| story | owns | waits on |
|---|---|---|
| 00 · the harness | runner, normaliser, baseline store and writer, line diff, the update script, the LF pin, FF-20301 to FF-20303 | nothing |
| 01 · every init scenario renders to its committed baseline | the `work-init` lane, its eight baselines, the determinism check | 00 |
| 02 · update changes nothing it should not | the `work-update` lane, idempotence, the customised update, the upgrade, the any-OS check (amended at verify, 2026-11-21: was a Windows run) | 00, 01 |

The cuts follow the only coupling there is. 00 is tested on a fixture verb, a small script that
writes a tree, so it needs no aof verb and no baseline from a lane. 01 is data plus baselines over
00's API. 02 reads 01's scenarios and its committed `default` and `customised` baselines, and both
add their lane to `test/support/golden/lanes.mjs`, so it follows 01. No story writes a runtime
module, unless the determinism check or the any-OS check finds instability, which is then fixed at
its source as ADR-002 §5 requires.

No ADR is diagrammed. The one flow with moving parts, the upgrade's rebuild, is a three-step list.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-20301 | **The normaliser's rules are closed.** `test/support/golden/normalise.mjs` exports exactly `eol`, `temp-paths`, `instants`, `hashes`, `version` and `build-id`, in that order. In comment-stripped source, no other module under `test/support/golden/` calls `replace` or `replaceAll` on captured content. | `test/arch/testing/acd-golden-normaliser-closed.test.mjs` | ADR-002 §1, §2, §6 |
| FF-20302 | **Only the update script writes a baseline.** `test/support/golden/baseline-writer.mjs` is imported by `scripts/golden.mjs` and by nothing else. No module under `test/` imports it. No golden module reads an environment variable that would switch a run to writing. | `test/arch/testing/acd-golden-baselines-written-by-the-script.test.mjs` | ADR-004 §4, §5 |
| FF-20303 | **Baselines are LF-pinned and inert.** `git check-attr eol` reports `lf` for sample paths under `test/golden/baselines/`, one per runtime tree and one under `home/`. Every file under that root ends in `.golden`. | `test/arch/testing/acd-golden-baselines-eol-pinned.test.mjs` | ADR-003 §4 |
