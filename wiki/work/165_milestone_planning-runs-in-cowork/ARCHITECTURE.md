---
doc: architecture
---
# 165 · Planning runs in Cowork — Architecture Decisions

Recall `838fed54-8571-4ef9-b8e2-c522671fe759` (architect, area architecture) surfaced m02's
ADR-001, ADR-003, ADR-007 and ADR-009, and m01's ADR-003. There was no near-miss among them. These
ADRs honour m02's ADR-002 (the 40-hex anchor), ADR-008 (the tag is the clone ref) and ADR-009 (one
lock, and a writer keeps the sections it does not own). ADR-004 below extends m02's ADR-006 guard
from one per lock to one per runtime.

## ADR-001: Cowork is a render-and-hand-over runtime — aof writes uploadable packages, spawns nothing, and records the install as unconfirmed

**Status:** Accepted; where the packages are written is amended by ADR-006
**Date:** 2026-10-19

**Context.** Cowork has no plugin CLI, so there is nothing for aof to spawn. A plugin gets in
only through the desktop UI's upload or marketplace dialog (RESEARCH R1). Codex already set the
precedent for doing less than claude and saying so: in m02's ADR-004 it records
`pluginsInstalled: false` and prints a manual fallback.

**Decision.** `aof planning init --runtime cowork` builds a plan with no spawn items. It has one
`render` item for the aof planning plugin (ADR-002) and one `package` item for each recommended
planner plugin (ADR-003). A real run writes those packages under `.aof/cowork/` (ADR-005), prints
the upload steps (**Customize › Plugins › Add › Upload plugin**, one file per package, then
connect the repo folder in Cowork), and records a cowork lock entry (ADR-004) carrying
`cowork.installConfirmed: false`. aof never writes `true` there, because aof can't observe
Cowork. `--dry-run` prints the same plan, the paths it would write and the upload steps. It does
no network access, writes nothing and spawns nothing. The honesty gate is unchanged: if any
step fails, no lock entry is written.

**Alternatives considered.**
- *Have the folder connection supply the skills* (repo-local `.claude/skills`, RESEARCH A3).
  Rejected: unconfirmed, it writes into the `.claude/` tree that `aof work init` generates, and
  it gives no way to deliver the bought planner.
- *Publish to an org marketplace.* Out of scope (SPEC), and it needs a Team or Enterprise owner.

**Consequences.** Delivery takes a manual step the operator must do and aof can't check. That is
stated, never hidden. Because the plugin is saved to the account (R2), its skills also reach
Claude Code sessions. ADR-002 keeps them from firing there unasked.

**Invariant.** The cowork plan contains no spawn item and no `cowork` CLI verb, and no output or
lock entry claims the plugins are installed (FF-16505, FF-16506).

## ADR-002: The aof planning plugin's skills are rendered from the existing command sources through the one command-to-skill mapping

**Status:** Accepted
**Date:** 2026-10-19

**Context.** Cowork and chat both load skills (R2), and STATE's observation points the same way.
Codex already turns a command into a skill: `mappedBody` in
`packages/core/src/work/bundle-runtime.mjs` adds an invocation and `$ARGUMENTS` preamble in front
of the command's body. That preamble's wording is written for Codex. The SPEC asks for shatter at
least, with PRD discovery included, and leaves refine and explain to the break-down.

**Decision.** The plugin is named `aof`, so Cowork invokes its skills as `/aof:shatter` and
`/aof:explain`, the same names as the commands. (Amended by the operator on 2026-10-19, after the
build, from `aof-planning`. The plugin is the Cowork planning integration and is not an entry
point for Claude Code, so the shorter name wins.) It holds `.claude-plugin/plugin.json` (`name`,
`version` taken from aof's package version, `description`) and one `skills/<id>/SKILL.md` each for
**`shatter`** and **`explain`**. Every body is rendered from `packages/core/assets/commands/<id>.md`
through the existing mapping. The mapping is generalised so that each runtime's mapping carries
its own preamble wording. Codex's rendered output stays byte-identical, and cowork gets a second
mapping entry. A cowork copy of a command is never authored. The cowork preamble holds the
runtime rules in one place:
- invoke as `/aof:<id>`, and read `$ARGUMENTS` as the text after the skill name;
- the `aof` CLI may be absent (R5). Probe with `command -v aof` before the first `aof` step. If
  it is absent, skip each `aof` step, list what was skipped in the report, and never imitate a
  verb that changes state by hand: never mint a number, never promote, never touch a `status:`
  line. Shatter's drivers therefore stay in the backlog, to be promoted from Claude Code or Codex;
- write Markdown only, and never commit.

Frontmatter carries only `name` and `description`. The `aof-generated` stamp is a comment placed
after the frontmatter. Each description opens with the explicit invocation, so the skill doesn't
fire in an unrelated Claude Code session (R2). **`refine` is excluded.** It mints runs, builds the
graph and gates on `aof work doctor`, so without the CLI it would be prose with no checks, and the
SPEC keeps the lifecycle in the coding runtimes.

**Alternatives considered.**
- *Emit `commands/` instead of skills.* Rejected: commands load in chat only as skills (R2), so
  skills are the one shape that works everywhere.
- *A cowork variant file for each command, as codex's `variants/codex/workflow.md` does.*
  Rejected: that is a second copy of shatter to keep in sync. The preamble expresses the
  difference once.

**Consequences.** When shatter changes, the cowork skill picks it up on the next
`aof planning init --runtime cowork --force`. The degrade rule lives in one place, the preamble.

**Invariant.** Each cowork SKILL.md body contains its source command's body unchanged, and
codex's rendered skills are byte-identical to what they were before (FF-16502).

## ADR-003: The bought planner reaches Cowork as aof-packaged plugins of the pinned tag, never as a Cowork marketplace

**Status:** Accepted
**Date:** 2026-10-19

**Context.** The SPEC lists two routes. Cowork's **Add marketplace** can't pin a ref, and it
tracks the default branch (R1). That would install from a floating ref, which m02's ADR-002 and
ADR-003, and this SPEC, forbid. Each pm-skills plugin folder is already an uploadable plugin
root (R3).

**Decision.** For cowork, aof resolves the tag's commit exactly as claude does (m02's ADR-008:
`git ls-remote` for `refs/tags/v2.0.0`). Behind the network-boundary print, it clones
`https://github.com/phuryn/pm-skills.git` with `--depth 1 --branch v2.0.0` into a temporary
directory and checks that `HEAD` equals the resolved 40-hex sha. A mismatch refuses, and nothing
is written. From the checked tree it packages each recommended plugin (the core three, plus
`pm-market-research` with `--with-optional`, never `pm-ai-shipping`), with the root `LICENSE`
copied into each package. The temporary clone is always removed. Tests supply the source tree
through an injection seam, as `resolveSha` already accepts one.

**Alternatives considered.**
- *The operator adds the marketplace in Cowork.* Rejected: it floats, so there is no
  provenance.
- *Vendor the planner into the aof repo.* Rejected: it ships third-party code with aof and
  splits the pin across two places.

**Consequences.** The operator uploads three or four more files. Recorded provenance matches
what was uploaded: the packages were built from the exact commit in the lock.

**Invariant.** A planner package is written only from a tree whose `HEAD` equals the recorded
sha. `pm-ai-shipping` is never packaged (FF-16504).

## ADR-004: The lock's `planning` section holds one entry per runtime

**Status:** Accepted
**Date:** 2026-10-19

**Context.** Today `planning` is one flat object with a single `runtime`. The re-run guard
refuses whenever the section exists, and `--force` replaces the whole section. Planning in
Cowork while building in Claude Code needs both entries kept (SPEC), and existing single-runtime
locks must still read.

**Decision.** The section's shape becomes `planning: { runtimes: { <runtime>: <entry> } }`.
Each entry has the existing schema (m02's ADR-009), and a cowork entry adds `cowork` (ADR-001).
One exported reader in `packages/core/src/planning-init.mjs` turns either shape into the runtime
map. A legacy flat section becomes `{ [section.runtime]: section }`, kept exactly as it was. The
writer always writes the new shape. It copies every other runtime's entry through deep-equal and
replaces only the runtime being installed. The guard is per runtime: if the named runtime has an
entry and `--force` is absent, it refuses and names that runtime. A different runtime is added
without `--force`, and `--force` re-pins only the runtime named.

**Alternatives considered.**
- *Keep the flat section, with extra runtimes as siblings.* Rejected: that gives two shapes for
  one concept.
- *Key runtimes directly under `planning`.* Rejected: entries would mix with legacy fields, and
  every read would have to guess.

**Consequences.** Readers that use `lock.planning.<field>` (R4) change to the reader. A lock
written by this version is not readable by an older aof's `planning init` guard. That is
acceptable, because the guard only refuses.

**Invariant.** A planning init for one runtime leaves every other runtime's entry deep-equal, and
leaves every non-`planning` section of the lock intact (FF-16501).

## ADR-005: Packages are written by an in-repo, deterministic stored-zip writer into `.aof/cowork/`

**Status:** Accepted; its output paths are superseded by ADR-006
**Date:** 2026-10-19

**Context.** There is no zip dependency, and installs are restricted (AGENTS.md supply-chain
rules). `zlib.crc32` is newer than `engines` allows (R4). Packages are small (R3).

**Decision.** A dependency-free writer turns a file map (`relative path → bytes`) into a zip
using the *stored* method (method 0) and its own CRC-32 table. Entries are sorted by path and use
`/` separators, with a fixed DOS timestamp, so the same input always gives the same bytes. Only
`node:` built-ins are imported. Output paths are `.aof/cowork/aof.plugin` and
`.aof/cowork/pm-skills/<plugin>.plugin`. All of a run's bytes are built in memory first and
written only if every step succeeded.

**Alternatives considered.**
- *Add `yazl` or `fflate`.* Rejected: a new dependency for about sixty lines.
- *Deflate through `zlib.deflateRawSync`.* Rejected: the packages are tiny, and storing keeps the
  output byte-stable across Node versions.

**Consequences.** A re-run whose inputs are unchanged reproduces identical files, so a diff of
two packages is meaningful.

**Invariant.** The same file map always produces the same bytes, and the writer imports only
`node:` built-ins (FF-16503).

## ADR-006: The Cowork packages live once, in the aof home, not in each project

**Status:** Accepted (supersedes ADR-005's output paths)
**Date:** 2026-10-20

**Context.** ADR-005 put the packages under the project's `.aof/cowork/`, as a refine default
(165/03 Q4) nobody was asked about. The operator questioned it at verify. Every package is the
same for every project. `aof.plugin` is rendered from aof's own bundled command sources, so it
depends only on the aof version. The planner packages come from the pinned commit, and
`MARKETPLACE_REF` is a constant of aof, not of a project. Cowork saves an uploaded plugin to the
Claude account (RESEARCH R2), so one upload already serves every project. A copy per repo
multiplied identical files, needed its own `.gitignore` (Q2), and its output suggested a
per-project install that does not exist.

**Decision.** A cowork run writes its packages under the aof home: `<aof home>/cowork/aof.plugin`
and `<aof home>/cowork/pm-skills/<plugin>.plugin`. The aof home is `~/.aof`, or
`AOF_GLOBAL_HOME` when it is set, read through `defaultGlobalWorkspaceDir`, the one home every
global aof store uses. `initPlanning` takes `aofHome` to override it. The project's lock entry
still records the run (runtime, the 40-hex sha, `installConfirmed: false`), so it keeps meaning
"this project plans in Cowork". It names each package by its path relative to the aof home
(`cowork/aof.plugin`), never by an absolute path, because the lock is committed and a home
directory is machine-specific. The printed upload steps name the absolute paths, so the operator
can find the files. Nothing is written inside the project except the lock, so no `.gitignore` is
needed. The writer, the in-memory build and the all-or-nothing write are ADR-005's, unchanged.

**Alternatives considered.**
- *Keep `.aof/cowork/` per project.* Rejected for the reasons above.
- *Key the directory by aof version and sha* (`cowork/<version>-<sha>/`). Rejected for now: a
  re-run rebuilds identical bytes, and the operator uploads the newest. Old directories would
  need a pruner. Revisit if two aof versions must coexist on one machine.

**Consequences.** A second project's cowork run rewrites the same files with the same bytes. A
lock entry written by the pre-ADR-006 build names `.aof/cowork/…` paths. No such entry was
released, so there is nothing to migrate.

**Invariant.** A cowork run writes nothing inside the target project except
`.aof/aof.lock.json`, and every package path its lock entry records is relative and under
`cowork/` (FF-16507).

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-16501 | A planning init for one runtime leaves every other runtime's `planning.runtimes` entry deep-equal and every non-`planning` lock section intact; a legacy flat `planning` section reads as its one runtime's entry | `test/arch/planning/acd-planning-lock-isolation.test.mjs` (extended by 165/00) | ADR-004 |
| FF-16502 | Each cowork `SKILL.md` body contains its source command's body (`packages/core/assets/commands/<id>.md`) unchanged after the one cowork preamble; codex's mapped skills render byte-identically to before the mapping was generalised | `test/arch/planning/acd-cowork-skills-from-command-source.test.mjs` | ADR-002 |
| FF-16503 | The package writer yields identical bytes for an identical file map, whatever order the map was given in, and imports only `node:` built-ins | `test/arch/planning/acd-cowork-package-deterministic.test.mjs` | ADR-005 |
| FF-16504 | A planner package is produced only from a tree whose `HEAD` equals the resolved 40-hex sha, cloned over HTTPS at `MARKETPLACE_REF`; `pm-ai-shipping` is never packaged; every package carries `LICENSE` | `test/arch/planning/acd-cowork-planner-pinned.test.mjs` | ADR-003 |
| FF-16505 | The cowork plan holds no spawn item and the planning-init source names no `cowork plugin` verb; a cowork `--dry-run` writes nothing and spawns nothing | `test/arch/planning/acd-planning-install-commands.test.mjs` (extended by 165/03) | ADR-001 |
| FF-16506 | The cowork lock entry records `cowork.installConfirmed: false`, and no planning-init output line claims a cowork install happened | `test/arch/planning/acd-planning-cowork-install-unconfirmed.test.mjs` | ADR-001 |
| FF-16507 | A cowork run writes nothing inside the target project except `.aof/aof.lock.json`; every package path its lock entry records is relative and under `cowork/` | `test/arch/planning/acd-planning-cowork-install-unconfirmed.test.mjs` (extended at 165/03's amendment) | ADR-006 |
