---
type: chore
number: 51
slug: init-writes-config
title: "Init writes a config — /aof:init scaffolds aof.config.json with graphify and inferred tags"
status: done
owner: developer
created: 2026-08-13
updated: 2026-08-13
depends: []
schema: 1
aofVersion: 0.1.0
---
<!--
  CHORE.md — the record doc for a housekeeping chore. Answers ONE question:
  what needs doing, and is it done?
  Owner: whoever runs the chore. A chore is a TOP-LEVEL DRIVER (like a milestone or uat session) that
  groups no stories and carries no behavioural contract — no tasks/, no .feature, no user story. Its
  whole deliverable is a TICKED CHECKLIST. "Done" = every ## Definition of Done box is ticked AND
  `aof work validate` is green (aof:verify checks exactly this — no scenario run). It gates the stream:
  a milestone that `depends:` on this chore waits until it is `done`.
-->
# 51 · Init writes a config — /aof:init scaffolds aof.config.json with graphify and inferred tags

## Intent

A freshly initialised repo has no `.aof/aof.config.json` at all: `aof work init` renders the bundle
and writes the lock, and the ONLY path that writes a config today is the `--with-headroom` flag
(`src/work-init.mjs:191-206`) — so every new repo starts with no memory backend selected and an empty
tag vocabulary that `aof work validate` then has nothing to check against. This chore adds a bundled
`/aof:init` command that runs `aof work init` first and then, as an agent step, analyses the project
to author the config: `memory.backend: "graphify"` active by default, and `work.tags`
(layers / refinements / domains) inferred from what the repo actually contains.

## Definition of Done

- [x] `src/bundle/commands/init.md` exists — a new `/aof:init` bundled command, following the
      shape of the existing command docs in that directory.
- [x] `/aof:init` calls the CLI **first** (`aof work init …`), then does its agent analysis on the
      result — never the other way round.
- [x] `/aof:init --force` passes `--force` straight through to `aof work init --force`.
- [x] After `/aof:init`, `.aof/aof.config.json` exists with `memory.backend: "graphify"` set active
      by default.
- [x] `/aof:init` analyses the project (source layout, package manifest, existing dirs) and writes a
      `work.tags` block — `layers`, `refinements`, `domains` — appropriate to that repo, not a fixed
      boilerplate list.
- [x] Existing-config behaviour: if `.aof/aof.config.json` is already present and has **no** tags,
      `/aof:init` fills the tags in and leaves every other key untouched (no clobbering of
      `work.dir`, `work.agents`, `memory`, `headroom`, `mesh`, or any foreign section).
- [x] The written config validates — `aof work validate` accepts the generated tag vocabulary, and
      the closed tag check reads the same `work.tags` shape this chore writes.
- [x] CLI ↔ bundle parity: `/aof:init` is reachable in a repo after `aof work update`, alongside the
      other `/aof:*` commands.
- [x] `aof work validate` is green (no regression)

## Notes

- **Bootstrap ordering.** `/aof:init` ships *inside* the bundle that `aof work init` installs, so in a
  never-initialised repo the slash command does not exist yet — the first init is the bare CLI verb,
  and `/aof:init` covers re-init / config-repair and repos that already carry the bundle. Worth
  stating explicitly in the command doc so the sequencing isn't a surprise.
- **Reuse the existing config idiom.** `src/work-headroom.mjs` already exports the shared
  `readConfig` / `writeConfig` pair that `--with-headroom` reuses (`src/work-init.mjs:201-206`) —
  the "fill tags, leave everything else" merge should go through that same path rather than a second
  divergent config writer.
- `--with-headroom` stays flag-gated and off by default (ADR-001); this chore does not change it.
- Related memory: `aof-work-init-should-write-config` (the gap this closes) and
  `work-command-implies-claude-command` (the CLI ↔ bundle parity requirement above).

## As built (2026-08-13)

The Notes' "reuse the existing config idiom" is what decided the shape: the fill-don't-clobber merge
is CODE, not prose in a command doc, so it is testable and can only have one implementation.

- **`aof work init-config`** — a new CLI verb (`src/work-init.mjs` `initConfig` + the
  `work:init-config` face in `src/commands/init-update.mjs`, the init family's own module). It is a
  config-only read-merge-write through work-headroom.mjs's `readConfig`/`writeConfig` — the same pair
  `--with-headroom` uses — and never touches the lock. It fills holes and never re-authors: an
  existing `memory.backend` choice or an existing tag vocabulary is KEPT and reported as kept.
- **Why a SECOND CLI call, not a branch of `aof work init`.** The vocabulary is inferred from the
  repo by the agent step AFTER the render, so a deterministic first call cannot carry it. `/aof:init`
  is therefore `aof work init` → analyse → `aof work init-config`, which is exactly the
  "CLI first, agent second" ordering the DoD asks for.
- **The command doc forbids hand-editing the config** — a hand-edit would be the second divergent
  writer this chore exists to prevent.
- Guards updated for the new verb: the `/api/work` route-coverage carve-out (an install-time CLI
  action, like `init`/`update`) and the CLI-bijection probe. New tests:
  `test/work-init-config.test.mjs` (the DoD boxes as assertions, incl. the closed-tag check reading
  the written shape in both directions).

## Feedback (for retro)

- **Pre-existing red, NOT from this chore:** `test/bundle.test.mjs` has 5 failing assertions at HEAD
  (verified in a clean `git worktree` at `69d9087`), all from the m43 artifact-sync members landing
  without updating that test's hand-kept counts: `byKind("hook")` is 4 (the 3 codex hooks +
  `claude-artifact-sync`) against a pinned 3, and the `asset` member `artifact-sync-enqueue` is
  outside both the test's valid-kind set and its loaded-member count. This chore updated only the
  COMMAND count (24 → 25) it is responsible for; the hook/asset drift is left as its own fix. The
  broader lesson is the one m41 R5 already armed for packaging: a hand-kept count in a test is a
  second registry, and it drifts silently the moment a member of a new kind is added.
- The shipped bundle manifest was also stale at HEAD (`autonomous.md`'s hash), so
  `acd-bundle-manifest-hashes` was red; regenerating it for the new `init` member fixed that too — a
  reminder that `node scripts/generate-bundle-manifest.mjs` is part of any bundle-body change.

## Accept decision (2026-08-13)

**Accepted.** Verified on the chore's own per-type criterion (ADR-003) — no scenario suite, no
behavioural verify, no human sign-off, none of which a chore carries by design:

1. **Checklist ticked** — all 9 `## Definition of Done` boxes are `- [x]`; zero `- [ ]` remain.
2. **`aof work validate` green** — `PASS — 51 is well-formed.` (scoped) and
   `PASS — work stream is well-formed.` (whole stream), both exit 0.

No open findings. `status: done`.
