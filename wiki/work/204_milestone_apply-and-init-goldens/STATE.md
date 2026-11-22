---
doc: state
---
# 204 · What aof apply, init and clean write is held to baselines, including their merges into files the user owns — State

## Progress

- 2026-11-21 — Refined with `--all`, solo (run `20261121T232637388Z-0000`): ADR-001 to ADR-007,
  FF-20401 and FF-20402 declared (pending, with planned red probes in VERIFICATION), four stories,
  their example maps (every example proposed, no business question left open), plans and 13 task
  features. `aof work next` readies 00 and 03 and holds 03 on the shared lane registry, golden
  index and budget row (ADR-007).
- 2026-11-22 — `aof:continue 204`, solo. Milestone run `20261122T183526467Z-0001` minted; the first
  wave is 00 alone (03 held on write overlap). 00 built (run `20261122T183604480Z-0000`): the
  `assets-apply` lane and its five baselines, and the TOML merge fix (ADR-003). Golden: all 15
  registered scenarios match (`work-init` and `work-update` unmoved, as ADR-003 predicted).
- 2026-11-22 — 00 to `in-review` (run closed). 01 built (run `20261122T192932232Z-0000`): the
  path-only co-authored predicate (`coAuthoredOutput`, replacing `codexSharedOutput`), the
  `.mcp.json` `mcp-servers` merge, `co-authored-output-conflict`, the `assets-merge` lane and its
  five baselines, FF-20401, and E9 in `render-plan.suite.mjs`. `assets-apply` re-derived in the
  same diff, exactly as 01's notes said: `CLAUDE.md` gains its block, the lock records `guidance`
  and `mcp-servers` ownership, the journal gains both Claude outputs. 203's lanes unmoved.
- 2026-11-22 — 01 to `in-review` (run closed). 02 built (run `20261122T194623882Z-0000`): the one
  retraction (`retractCoAuthoredOutput`, lifted from apply's stale path, which now calls it), clean
  retracting owned entries (`retract`, or `delete` when nothing of the user's is left, or
  `drift-warning` on an edited fragment), the step-script capability and `user-edit.mjs`, the
  `assets-clean` lane and its three baselines, FF-20402, and E9 in `clean.suite.mjs`. All 23
  registered golden scenarios match.
- 2026-11-22 — 02 to `in-review` (run closed). 03 built (run `20261122T195132238Z-0000`): `aof init`
  adds `/work/` through the additive owner (`ensureWorkspaceGitignore`, header-less so a fresh file
  is unchanged), and the `project-init` lane and its five baselines. Only the additive owner writes
  `.aof/.gitignore` now.
- 2026-11-22 — 03 to `in-review` (run closed); `aof work next 204` answers `done`. Regression over
  the finished tree, by file (on this MacBook `--scope impacted` widens to the full suite, and the
  first such run was stopped after an hour because the tree changed under it): every golden suite,
  every suite importing a changed module, and the integration features — 66 suites, 1,234 cases,
  integration exit 0. The only reds are 13 that are red at HEAD: FF-11904 ×6 and 138/00 (`test/loop`
  66 > 64, `packages/foundation/src` 9 > 8), `codex-ownership` "156 — retained … lane" ×2, and
  `core-workspace` distribution-workspaces ×2 and workspace-boundaries ×2 (`loop.mjs`'s stale
  audit row). The milestone's own regression gate is still owed at `aof:verify`.

## Notes & decisions in flight

- **2026-11-21, operator decision at refine: 204 fixes four defects, and holds the rest.** Refine
  measured the three verbs before writing any ADR (ARCHITECTURE "Measured facts"). The SPEC's
  acceptance, "a merge provably leaves the user's own entries unchanged" and "`clean` provably
  removes exactly what aof wrote", is false today. The operator was asked in prose whether 204
  fixes the defects or holds them as today's behaviour, and agreed with the recommendation:
  - **Fixed in 204, at the source, in the story that baselines the verb:**
    1. `aof assets clean` deletes a merged file whole, the user's content with it: `AGENTS.md`, a
       nested `AGENTS.md`, `.codex/config.toml` and `.codex/hooks.json` (ADR-004, story 02).
    2. `aof assets apply` replaces a user's `CLAUDE.md` and `.mcp.json` whole, and would replace a
       user's `AGENTS.md` for opencode the same way (ADR-002, story 01).
    3. The Codex TOML merge into a fresh `.codex/config.toml` puts a top-level setting after a
       table header, so Codex reads it inside that table and the next `apply` refuses with
       `codex-output-conflict` (ADR-003, story 00).
    4. `aof init` replaces a user's `.aof/.gitignore`, and after `aof work init` it drops the
       entries `work init` wrote (ADR-005, story 03).
  - **Held in the baselines as today's behaviour, and filed (ADR-006):**
    5. `clean` leaves aof's merged entries in `.claude/settings.json` and leaves the apply journal.
    6. A project doc that both Codex and opencode render to `AGENTS.md` refuses with "generated
       output conflict" (and so does an unscoped Codex rule beside an `AGENTS.md` project doc).
    7. A single-runtime apply writes outside its runtime: every apply merges
       `.claude/settings.json`, and a claude- or opencode-only apply writes `.codex/config.toml`
       when the config declares Codex settings. Measured after the decision, while writing story
       00's map. It damages no user content, so it is held under the operator's rule (ADR-006 §3).
  These go to VERIFICATION as findings at verify, as 203's F-01 did.
- **`--global` is `assets add --global` and `assets use --global`.** `assets apply --global`
  refuses by design and points at `assets use --global`. The SPEC's "`--global` writes into the
  temp global home" is held through those two verbs (ADR-001).
- **No ADR is diagrammed.** The one flow with moving parts, a co-authored file's ownership from
  apply to clean, is three rules in ADR-002 and ADR-004, not a sequence a picture would clarify.

## Feedback (for retro)

- **204/00 · the merge's refusal case cannot be reached through the fixed merge.** Task 02's last
  scenario is "Given a TOML merge whose result would place an owned top-level entry after a table
  header … When the merge plans it". After ADR-003 §1 and §2 no input to `mergeToml` produces that
  text, so the case drives the merge's own guard, `indexMergedToml` (exported from
  `codex-settings.mjs` for it, and called by `mergeToml` as its last step), over a misplaced text,
  with a control that accepts the same entry placed correctly. "The target file is unchanged"
  holds by construction: the guard writes nothing, and the merge runs in planning before any
  write. ADR-003 §4 says the change is "confined to `mergeToml`"; the guard is its sibling in the
  same module. Recorded, not changed.
- **204/00 · "holds no `removed.golden`" (E1) and "holds `steps.golden` and no file" (E10).** The
  one writer always writes `removed.golden`, empty when nothing is removed, as every 203 whole
  baseline has it. The cases read both as "names no removal" and assert an empty list.
- **204/00 · declared read set incomplete.** Task 01 cites ADR-006 §3, which is not in `reads:`;
  the build read it. It also read ARCHITECTURE "Measured facts" for the fixture's measured shape
  (23 outputs), and grepped `claude-settings.mjs` for the hook marker.
- **204/00 · the fixture carries descriptions.** ADR-001 §1 lists the kinds, not their fields.
  Each resource has a `description`, so the baselines hold the frontmatter a real project renders,
  rather than `description: ` empty (what `assets add` scaffolds).
- **204/00 · a test-side TOML reader.** The repository has no TOML parser. `readToml`, a strict
  reader for the subset the Codex config renders, is exported by `test/golden/assets-apply.test.mjs`
  and imported by `codex-ownership.suite.mjs`, so E11 and the merge cases read the file
  independently of aof's own `tomlIndex`.
- **204/00 · reds that are not this story's**, each red on a clean `git archive HEAD` copy or by
  tracked count: FF-11904 (`test/loop` holds 66 tracked children against a row of 64, and
  `packages/foundation/src` 9 against its exemption's 8), and `codex-ownership.suite.mjs` "156 —
  retained ancestor/diverged lane advances before native asset preparation" ×2 (`fatal: … is a
  main working tree`).

- **204/01 amends 204/00's E9 (contract amendment, ratified here).** ADR-002 §3 journals every
  co-authored output whatever its runtime, so 00's "the journal holds one entry for each Codex
  output" became false the moment 01 landed. Task 00's E9 scenario, its example and its case now
  say "and one for `CLAUDE.md` and `.mcp.json`", each marked as amended by 204/01.
- **204/01 · refusal messages carried their prefix twice** (`code: path: code: path: reason`),
  for Codex conflicts too, because the planner stored the error's whole message as the action's
  reason and `executeApplyActions` prefixes it again. Fixed at the close: `refusal()` keeps the
  bare `reason`, and the planner carries it. Held in `assets-merge/mcp-collision`.
- **204/01 · the planner's reason text is no longer Codex's.** "merge only recorded Codex
  ownership; preserve operator content" now reads "merge only recorded AOF ownership; preserve the
  user's content" (and "retract only recorded AOF ownership"), since a Claude or opencode file
  takes the same path. No 203 baseline holds the old text.
- **204/01 · naming debt (recorded).** `checkCodexTarget`, `codexJournalPath`, `readCodexJournal`
  and `recordCodexApply` now serve every co-authored output, not Codex's alone. A rename touches
  their callers and suites for no behaviour; left for a later pass. `checkCodexTarget`'s `global`
  root is Codex's, which is correct only because `assets apply --global` refuses and a global
  render writes no co-authored file.
- **204/01 · the doctor stopped seeing an edit to aof's own MCP server (fixed in the build).**
  `graph-faces/01` went red: once `.mcp.json` is co-authored, an edit inside aof's recorded entry
  plans as a refusal (ADR-002 §3, Codex's path), and the doctor's `generated-output-drift` counted
  only `drift-warning`. Codex's merged files already had this blind spot. The check now counts a
  `conflict` as drift too (`config-inspect.mjs`), and the suite's helper reads both.
- **204/01 · declared write set incomplete.** The build had to touch three files `files:` does not
  list: `packages/core/src/application/bindings/config-inspect.mjs` (the doctor fix above),
  `packages/core/test/graph-rendered-faces.suite.mjs` (its helper), and
  `scripts/workspace-runtime-audit.json` (config-inspect's three child-process rows re-stamped,
  each reason saying the call and its argv are unchanged).
- **204/01 · cosmetic (recorded).** Over a user's config with a table, `model = "o3"` lands
  directly above the user's first table header with no blank line between them. Valid TOML, read
  correctly; held in `assets-merge/customised`.

- **204/02 · a retraction no longer leaves an empty hook event behind.** `mergeHooks` drops an
  event whose groups are all gone, so a retracted `.codex/hooks.json` parses to the user's value
  (E5) and an aof-only one is empty and deleted (E1). It changes apply's stale-hook retraction the
  same way; no baseline moved.
- **204/02 · cosmetic (recorded).** A retracted `.codex/config.toml` keeps the blank lines the merge
  added before aof's tables, so the user's file comes back with two trailing blank lines. It parses
  to the user's value, which is what ADR-004's consequences promise for TOML.

- **204/03 · E5 is checked by key, not by a fixed list.** The lock after `work init` then `init`
  keeps `work-init/claude`'s `work` section whole, and every top-level key `init` adds is one of
  `version`, `generatedAt`, `catalog`, `runtimes` and `items`; every other key is kept as it was.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
