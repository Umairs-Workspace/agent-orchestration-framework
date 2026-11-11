---
doc: research
---
# 165 · Planning runs in Cowork — Research

**Gathered:** 2026-10-19
**Method:** Anthropic's Cowork and plugin docs (fetched 2026-10-19); a shallow clone of
`phuryn/pm-skills` at tag `v2.0.0`; reading `packages/core/src/planning-init.mjs`,
`packages/core/src/work/bundle-runtime.mjs` and the `acd-planning-*` arch tests.
**Status:** Desk research complete. A1–A4 need a live Cowork session and stay `@uat`.

## R1 · How a plugin reaches Cowork

- **Finding:** **Customize › Plugins › Add › Upload plugin** accepts a `.zip` or `.plugin` file.
  "Zip either the plugin folder itself or its contents; both work as long as the archive holds one
  `.claude-plugin/plugin.json`." Limits: 200 MB uncompressed, 5,000 files per package.
- **Finding:** **Add marketplace** takes a repository URL (`https://github.com/owner/repo`) or
  `owner/repo`. No ref, tag or commit can be given. Updates come from **Check for updates** or
  **Sync automatically**, so whatever is installed tracks the default branch.
- **Constraint:** Cowork has no plugin CLI, so aof can't install anything. The best it can do is
  produce an uploadable file. A marketplace added in Cowork can't be pinned, which is what
  m02's ADR-002 and ADR-003 require.
- **Source:** https://claude.com/docs/plugins/overview, https://claude.com/docs/cowork/guide/plugins

## R2 · What Cowork loads from a plugin, and where else it appears

- **Finding:** A plugin can carry skills, commands, agents, connectors and hooks. In Cowork,
  commands run as `/plugin-name:command`, and a skill loads when its description matches the
  task. Skills also load in chat; commands load there as skills.
- **Finding:** An installed plugin is saved to the **account**. It also appears in chat, and
  Claude Code downloads it as a synced plugin in every session signed in to that account.
- **Constraint:** A skill is the one component that works on every surface. Because the plugin
  syncs to the whole account, its skills show up in every Claude Code session, whatever the repo.
  A description that matches too broadly would fire there too.
- **Source:** https://claude.com/docs/plugins/overview (*Compare what each plugin component adds*,
  *Find the plugin in each app*)

## R3 · The bought planner at the pinned tag

- **Finding:** `v2.0.0` resolves to commit `5042ff6169e0df49086c846f69bf7b6cdb67a6de`
  (measured on a clone, 2026-10-19). Each plugin is a top-level folder that holds its own
  `.claude-plugin/plugin.json`, `skills/` and `commands/`. That is already an uploadable plugin
  root.
- **Finding:** The licence is MIT, and the `LICENSE` file is at the repository root only, not in
  each plugin folder. Package sizes: pm-execution 29 files / 144 KB, pm-product-discovery 20 /
  117 KB, pm-product-strategy 19 / 140 KB, pm-market-research 12 / 69 KB. All are far under
  R1's limits.
- **Constraint:** To package one plugin folder by itself and still honour the licence, the root
  `LICENSE` has to be copied in. `create-prd` (pm-execution) is the skill that writes the PRD the
  seam reads (m02, ADR-005).
- **Source:** `git clone --depth 1 --branch v2.0.0 https://github.com/phuryn/pm-skills.git`

## R4 · What aof already has

- **Finding:** `planning-init.mjs` accepts only `claude` and `codex`. Its lock section is one
  flat object with a single `runtime` field. The re-run guard checks only whether that section
  exists, and `--force` replaces the whole section.
- **Finding:** `bundle-runtime.mjs` already maps a command to a skill for codex
  (`RESOURCE_MAPPINGS.command.codex`). It adds a preamble that explains `$ARGUMENTS` and how
  the command is invoked, then the command's body. That preamble is Codex-specific text.
- **Finding:** The tree has no zip dependency. `zlib.crc32` exists only from Node 22.2, but the
  package's `engines` field is `node >=20`, so CRC-32 needs its own table.
- **Finding:** `planning-init.mjs` is imported by its CLI face, `planning-init.suite.mjs`, the five
  `acd-planning-*` arch tests and `acd-unified-lock-sections.test.mjs`. Every one of them reads
  `lock.planning.<field>` as a flat object. The `work-init`, `work-update` and
  `install-manifest-contract` suites only copy a planning section through without reading it.
- **Source:** the files named above. The graph build timed out (`graphify-timeout`, 120 s), so
  this list comes from greps, not from `aof graph impact`.

## R5 · Cowork's shell

- **Finding** (from a Cowork session, recorded in STATE on 2026-10-19): Cowork's shell runs in a
  Linux VM. The Windows `aof.exe` payload doesn't run there. In that session, deleting files and
  committing cleanly failed until the operator allowed deletion: git left `.lock` files behind.
- **Constraint:** A skill can't assume `aof` is on PATH. It has to be able to finish with
  Markdown writes alone.

## Assumptions to confirm

- **A1 — Cowork accepts an aof-written stored (uncompressed) zip as a `.plugin` upload.** Upload
  it and check that the skills tab lists the skills. Testable in CI: no.
- **A2 — A skill's writes into the connected folder land in the Windows tree, and a Windows
  `aof work validate` passes over them.** Shatter a PRD in Cowork, then run validate from Windows.
  Testable in CI: no.
- **A3 — Connecting a folder surfaces its `.claude/skills`, but not `.claude/commands`** (STATE
  observation). Nothing in this milestone relies on it. Recorded so that a future no-install
  path doesn't treat it as settled. Testable in CI: no.
- **A4 — The uploaded pm-skills packages run `create-prd` in Cowork exactly as the marketplace
  install does in Claude Code.** Write a PRD in Cowork and check it lands as `PRD-*.md`.
  Testable in CI: no.
- **A5 — The tag still resolves to the R3 commit.** Testable in CI: yes; it is the existing
  networked clone check, `acd-planning-clonable-ref`.
