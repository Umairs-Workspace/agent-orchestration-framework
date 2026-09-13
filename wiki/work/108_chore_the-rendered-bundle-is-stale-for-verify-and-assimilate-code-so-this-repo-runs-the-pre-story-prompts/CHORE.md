---
type: chore
number: 108
slug: the-rendered-bundle-is-stale-for-verify-and-assimilate-code-so-this-repo-runs-the-pre-story-prompts
title: "The Rendered Bundle Is Stale For Verify And Assimilate Code So This Repo Runs The Pre Story Prompts"
status: done
owner: <role>
created: 2026-09-04
updated: 2026-09-05
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
# 108 · The Rendered Bundle Is Stale For Verify And Assimilate Code So This Repo Runs The Pre Story Prompts

## Intent

<!-- What housekeeping this is, and why it's needed now (a migration, config tidy-up, a cleanup
     discovered mid-build). One or two sentences — a chore is minimal-ceremony by design. -->

`aof work update` could not re-render this repo's own installed bundle at all. This machine checks
out with `core.autocrlf=true`, and `.claude/`, `.codex/` and `.opencode/` — the render targets —
carried no `.gitattributes` EOL pin, while their `src/bundle/**` source is pinned LF and the renderer
emits LF. So git wrote CRLF, every rendered file's bytes diverged from both the desired render and
the install manifest, and `planApplyActions` classified all 21 as `drift-warning` — which update
REFUSES to overwrite without `--force`. The installed prompts were frozen at whatever text was last
force-written, and the freeze reported itself as nothing at all on Linux CI.

## Definition of Done

- [x] Re-render this repo's own bundle (aof work update) so .claude/, .opencode/ and .codex/ carry the story-85 text for verify.md and assimilate-code.md; only retrospective.md was re-rendered at build, leaving 6 of 8 rendered copies at the 2026-08-29 render
- [x] `aof work validate` is green (no regression)

## Notes

- **Promoted from review finding:** "The rendered bundle is stale for verify and assimilate-code, so this repo runs the pre-story prompts" (`src/bundle/commands/verify.md:1`)
- **Raised reviewing:** `85`, review round 2
- **Promotion key:** `finding:85:the rendered bundle is stale for verify and assimilate-code, so this repo runs the pre-story prompts`

### What the re-render actually found (review close, round 1)

- **The finding's premise was half wrong, and the real defect was worse.** `verify.md` and
  `assimilate-code.md` were NOT carrying pre-story-85 text: their bodies were already byte-identical
  to `src/bundle/commands/` in all three trees, having been hand-synced. What was actually stale was
  `aof-architect.md`. And the cause was not a missed render step — it was that `aof work update`
  could not render ANY of the 21 files, because a `core.autocrlf=true` checkout wrote CRLF against
  an LF manifest and every one classified `drift-warning`, which update refuses to overwrite without
  `--force`. Recorded rather than corrected in the Definition of Done above: the checklist is this
  chore's contract, and the box it states was discharged.
- **Fixed at the close (structural lane):** the tree-wide pin now names its own escape hatch — a
  binary member landing under these trees takes an explicit `-text` override — matching the
  reasoning the `**/runs/**/*.json` rule already records one block above.
- **For whoever commits this:** three of the 21 re-rendered files (`.claude`, `.codex`, `.opencode`
  copies of `aof-architect.md`) carry chore **107**'s uncommitted `src/bundle/agents/aof-architect.md`
  edit — this checkout is shared, and `aof work update` renders the tree it is given. Source and
  render must land in the SAME commit, or the installed prompt sits ahead of its source. Not unwound
  here: reverting another lane's in-flight work is not this chore's call.
- **Left alone (nit):** eight tracked files under `.claude/` that are not render targets
  (`rules/`, `settings.json`, `prime.md`, `code-reviewer.md`, `package.json`, two skills, one hook)
  are still CRLF in the working tree. Their index blobs are LF, so they diff clean, and the new pin
  normalises them on the next checkout.

<!-- Optional. Anything chore-specific worth recording — context, gotchas, links. Keep light. -->
