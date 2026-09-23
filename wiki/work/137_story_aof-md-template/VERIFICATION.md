---
doc: verification
updated: 2026-09-23
---
<!--
  Story VERIFICATION.md — is story 137 truly done, and what is the evidence?
  Parentless story (parent: null) → this is the story's verification record; no milestone SPEC box.
  NO @uat scenarios → no ## User sign-off. NO UI surface → no design-conformance section.
  NO sibling ARCHITECTURE.md → no FF-NN controls declared → no ## Fitness functions register.
-->
# 137 · AOF.md has a template like every other record doc — Verification

## Method

Lanes in scope: **`@executable`** (all three tasks) and **one `@manual`** (task 00, the installed
copy). No `@uat`, no UI. Run inline by the product owner who authors this record — no evidence
subagent, so the finding id below is allocated by the single writer of this register.

The suite was run **focused** on the story's own test files, never the whole repo lane, under an
isolated `AOF_GLOBAL_HOME` through `node scripts/test.mjs --only` (never `node --test`).

## Verification evidence

Run 2026-09-23 at the accept gate.

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story) | `AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only` over `test/bundle/digest-template-ships`, `test/memory/import-digest-template`, `test/memory/import-digest`, `test/arch/memory/acd-import-digest-recallable`, `test/work/gate/work-validate-digest-template`, `test/work/gate/work-validate` | exit 0 — **104 ok, 0 not ok**; every `137/00`, `137/01` and `137/02` case is present, one per scenario and per Examples row | tasks 00–02 |
| `@manual`, at the source | `aof work update` from the repo root, then `git status --porcelain` diffed against its value before | exit 0 — `0 created, 0 updated, 154 up-to-date, 0 deleted, 0 drift-warning`; the tree status is unchanged, so the installed copy was already current | task 00 sc. 6 |
| `@manual`, at the source | `.aof/templates/work/milestone/AOF.md` read and compared to `src/bundle/templates/milestone/AOF.md` | starts with `<!-- aof-generated: bundle -->`; after the marker's stamp (marker line + one separator line) the body is byte-identical to the source — the same stamp `SPEC.md` and `STATE.md` carry, measured the same way | task 00 sc. 6 |
| `@manual`, at the source | `.aof/aof.lock.json` searched for the path | `"path": ".aof/templates/work/milestone/AOF.md"` at `:1185` | task 00 sc. 6 |
| one renderer, at the source | a search of `src/**/*.mjs` for the literal `"doc: digest"`; the callers of the render in `src/import/materialize.mjs` | 0 matches; `renderDigest` (`:209`) is the single caller of `renderDigestDocument`, used by both the co-located write (`:285`) and the legacy-store path (`:320`) | task 01 sc. 5 |
| validate wiring, at the source | the `meta.doc === "digest"` branch in `src/work.mjs` | calls `digestFindings(meta, text)` from `src/work/digest-template.mjs`; no second key or section list is spelled in `work.mjs` | task 02 sc. 5 |
| gate | `aof work validate 137` / `aof work validate` | `PASS — 137 is well-formed.` / `PASS — work stream is well-formed.` — the archived 42 digest and every other in-stream digest stay green | step 4 |
| gate | `aof work doctor 137` | **no `control-unresolved` at either severity**; warns only — `numbering-gap` (122), `rubric-join-unchecked`, `depends-edges-unchecked` | step 4 |

## Findings

| id | finding | severity | route |
|---|---|---|---|
| F-137-A | **`node scripts/test.mjs --help` starts the unit suite instead of printing usage.** Invoked at this gate to read the runner's flags, it printed `# unit` and began running cases; it stopped only because the output pipe closed. It ran under an isolated `AOF_GLOBAL_HOME` (hook-enforced), so nothing reached the real `~/.aof`. Not this story's change set | Nit — non-blocker | backlog: the runner should treat an unknown flag as a refusal, or print usage on `--help` |

**No blocker finding is open.**

## Accept decision

**Accepted 2026-09-23** — `aof work status 137 done`. Every `@executable` scenario of all three tasks
is green in the focused lane. The `@manual` installed-copy scenario was measured at the source with a
fresh `aof work update`. `aof work validate 137` and the whole-stream validate both `PASS`, and
`aof work doctor 137` reports no `control-unresolved`.

**What acceptance claims.** An imported `AOF.md` now has one contract: the shipped template. The
import renders every digest through it, and validate holds every digest to its keys and sections.
Fresh imports are schema-stamped, so validate no longer calls them stale.

**What it will not claim.** That the superseded separate-store `materializeImport` path is gone. It
still works, now through the one renderer, and removing it was out of scope.
