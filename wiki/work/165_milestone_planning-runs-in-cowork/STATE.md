---
doc: state
---
# 165 · Planning runs in Cowork — State

## Progress

- [x] Refined 2026-10-19 (`aof:refine 165 --autonomous`, solo): RESEARCH, ADR-001…005, FF-16501…16506
- [x] Contracts authored for 00, 01, 02 and 03. 03's Q1 and Q2 were answered by the operator at
  the refine review: an explicit `--scope` with cowork is refused, and the packages stay out of
  git via `.aof/cowork/.gitignore`.
- [ ] `aof:continue 165` (solo), built in the sibling worktree `aof-165` on branch
  `165-planning-runs-in-cowork` off main, because the main checkout carries 164's branch
  - [x] 165/00 built and reviewed 2026-10-19: 80/80 on the focused set, FF-16501 red-probed
  - [x] 165/01 built and reviewed 2026-10-19: 290/290 on the focused set (00's and 01's suites,
    the planning arch index, budget and codex suites); FF-16502 and FF-16503 red-probed. Codex's
    33 bundle skills are byte-identical across the shared mapping, but every one of them renders
    through a native variant, so the preamble path is proven by FF-16502's frozen pre-165 oracle,
    run over every command with its variants stripped.

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
