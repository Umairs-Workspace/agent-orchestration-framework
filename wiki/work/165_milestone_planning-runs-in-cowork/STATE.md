---
doc: state
---
# 165 · Planning runs in Cowork — State

## Progress

- [x] Refined 2026-10-19 (`aof:refine 165 --autonomous`, solo): RESEARCH, ADR-001…005, FF-16501…16506
- [x] Contracts authored for 00, 01, 02 and 03. 03's Q1 and Q2 were answered by the operator at
  the refine review: an explicit `--scope` with cowork is refused, and the packages stay out of
  git via `.aof/cowork/.gitignore`.
- [x] `aof:continue 165` (solo), built in the sibling worktree `aof-165` on branch
  `165-planning-runs-in-cowork` off main, because the main checkout carries 164's branch
  - [x] 165/00 built and reviewed 2026-10-19: 80/80 on the focused set, FF-16501 red-probed
  - [x] 165/01 built and reviewed 2026-10-19: 290/290 on the focused set (00's and 01's suites,
    the planning arch index, budget and codex suites); FF-16502 and FF-16503 red-probed. Codex's
    33 bundle skills are byte-identical across the shared mapping, but every one of them renders
    through a native variant, so the preamble path is proven by FF-16502's frozen pre-165 oracle,
    run over every command with its variants stripped.
  - [x] 165/02 built and reviewed 2026-10-19: 28/28 on the focused set; FF-16504 red-probed four
    ways (head check removed, pm-ai-shipping added, LICENSE dropped, SSH clone URL).
    **`@manual` live clone, run by the developer on 2026-10-19 (Windows control node), evidence
    for VERIFICATION:** `resolveSha` gave `refs/tags/v2.0.0` →
    `5042ff6169e0df49086c846f69bf7b6cdb67a6de`. `packagePlanner({ withOptional: true })` cloned at
    `v2.0.0` over HTTPS and returned `ok: true`, so the clone's HEAD equalled that sha. It produced
    pm-execution (30 files), pm-product-discovery (21), pm-product-strategy (20) and
    pm-market-research (13), each with LICENSE. 0 of the 84 files contain a CR, and no
    `aof-pm-skills-*` temp directory remained afterwards.
  - [x] 165/03 built and reviewed 2026-10-19: 269/269 on the focused set, then 599/599 on the
    importer sweep (every test importing a changed module, plus work init/update, the bundle arch
    index and the budget). FF-16505 and FF-16506 red-probed (argv on a cowork item, a dry-run
    resolving the sha, `installConfirmed: true`, an "installed" claim). **End-to-end, through the
    real CLI on a temp git repo with claude seeded:** a live `--runtime cowork` exited 0. It wrote
    `.aof/cowork/{.gitignore, aof-planning.plugin, pm-skills/pm-{execution,product-discovery,product-strategy}.plugin}`,
    `git check-ignore` reports them ignored, and `git status` shows only the lock. Every `.plugin`
    passes `python -m zipfile -t`, and no output line contains "Installed".
    `--runtime cowork --scope user` exited 1 and left the lock byte-identical.
- [ ] Next: `aof:verify 165`, which includes the `@uat` 165/03 E5 (install in Cowork, PRD →
  shatter, Windows validate). That one is the operator's.

## Notes & decisions in flight

Framing notes (2026-10-19), from a Cowork session that read the repo, now settled in RESEARCH and
the ADRs:

- **Skills, not commands.** Cowork does load plugin commands (RESEARCH R2), but skills are the one
  shape that works in Cowork, chat and Claude Code alike → ADR-002.
- **Lock holds one runtime** → ADR-004 (one entry per runtime, with the legacy flat section
  still read).
- **Can Cowork pin the pm-skills marketplace?** No. Add marketplace takes a URL with no ref
  (RESEARCH R1), so aof packages the pinned tag itself → ADR-003.
- **`$ARGUMENTS` / invocation in a Cowork skill.** The cowork preamble covers it whatever Cowork
  substitutes → ADR-002.
- **Cowork's shell can't commit cleanly or run aof** → the preamble says Markdown only, never
  commit, and skip CLI steps (ADR-002).

Default decisions taken at refine (technical, each recorded in an EXAMPLES map as `defaulted`):

- refine is **not** shipped to Cowork. Only shatter and explain are (ADR-002).
- The packages are written by an in-repo stored-zip writer, adding no dependency (ADR-005).
- Every package is built in memory and written only if every step succeeded (ADR-005).
- The skill descriptions open with the explicit invocation, because the plugin syncs to every
  Claude Code session on the account (RESEARCH R2).

Graph: `aof graph build .` timed out (`graphify-timeout`, 120 s) and the artifact on disk was from
09:56, so it was treated as stale. Story boundaries were drawn from source greps (RESEARCH R4).
Diagrams: none. Each ADR is a linear flow with no moving parts that a picture would clarify.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green (FF-16501…16506), each with a red probe
- [ ] `@manual`: 165/02's live clone at `v2.0.0`
- [ ] `@uat`: 165/03 E5 — install in Cowork, PRD → shatter on a real repo, Windows validate green

## Feedback (for retro)

- 165/00 · `files:` was incomplete. The build also changed the `--force` help text in
  `packages/core/src/commands/planning-init.mjs` (now "re-pin and re-install the named runtime over
  its recorded planning entry"). That file was in `reads:` but not in `files:`.
- 165/00 · `aof test --scope impacted --story 165/00` launched the whole tree (`scripts/test.mjs`
  with no selection) even though every declared path exists. It was stopped after 10 minutes with
  no output, and the story was gated with `scripts/test.mjs --only` over its five suites instead.
- 165/01 · The review found that FF-16503's import scan missed a bare side-effect `import "x"`, and
  fixed it at the close: the red probe now catches both import forms. E3 pinned aof's literal
  version, so any release bump would have turned it red for an unrelated reason. It now passes the
  version in and checks the default against `packages/core/package.json` (also fixed at the close).
- 165/01 · `packages/core/src/planning/` is founded as a declared EXEMPTION, not a row. It names
  02's `cowork-planner` ahead of time, so 02 adds its file without a budget edit.
- 165/02 · The live `@manual` run caught what the fixtures could not. pm-skills declares
  `* text=auto`, so a Windows clone checked out all 128 plugin files with CRLF, even with
  `core.autocrlf=false`. Those packages were not "the folder as it is at the commit" (E7), and
  their bytes would have varied by host. Fixed in the build: the clone argv now pins
  `-c core.autocrlf=false -c core.eol=lf` (all 142 files hash equal to their blobs), and FF-16504
  asserts both settings. PLAN.md's verification step called for this live run, and it paid for
  itself.
- 165/02 · Review fix at the close: the clone spawned through `shell: true`, the codebase's
  Windows idiom from `resolveSha`. Its argv carries a temp path, so a profile directory containing
  a space would have split under the shell. It now spawns with no shell (`git` is an executable),
  and a live clone into `…\aof probe …\with space` succeeded at `5042ff61…`.
- 165/03 · `files:` was incomplete in two places, and both were found by the importer sweep, not
  by the story's own suites. (1) `scripts/workspace-runtime-audit.json` keys each reviewed spawn by
  a digest of the call and of the whole source file, so 00's and 03's edits to `planning-init.mjs`
  turned its two existing entries stale, and 02's new clone needed entries of its own. They were
  re-reviewed: same reasons for the unchanged spawns, a new reason for the clone. (2)
  `test/fixtures/application/command-inventory.json` snapshots the `planning:init` usage and flag
  text, which 00 and 03 changed. A refine that adds a spawn or edits a CLI face should list both
  files.
- 165/03 · The worktree had no `apps/ui/dist`, so two inventory readers failed for that reason
  alone. `node scripts/ui-build.mjs` in the worktree turned them green rather than writing them
  off as environmental. One of them ("copied core runs") packages the new `src/planning/` files.
