---
doc: verification
updated: 2026-09-13
---
<!--
  Story VERIFICATION.md — answers ONE question: is story 125 truly done, and what is the evidence?
  Only sections with content appear (absence is information).
  Parentless story (parent: null) → this is the story's own verification record; there is no
  milestone SPEC box to tick and no milestone regression gate at this door.
  TWO @uat scenarios (tasks/00 "the site is live and reachable", tasks/01 "the graph renders as a
  diagram") → ## User sign-off is present, and both procedures are PENDING: their preconditions
  were measured unmet at this gate (below). NO @manual scenario.
  NO DESIGN.md and no `work.ui` key → no design-conformance section; the renderability precondition
  is never reached, because there is no DESIGN surface to reach it for. The site's visual check IS
  the second @uat, and it is the human's.
  NO sibling ARCHITECTURE.md → this story declares no FF-NN of its own → no ## Fitness functions
  register. Its two arch controls (`acd-site-is-projected-not-copied`, `acd-readme-names-what-ships`)
  are recorded as evidence rows; story 79's FF (`acd-loop-document-current`) is run unedited because
  tasks/01 asserts it.
-->
# 125 · The loop graph gets a published face — Verification

## Method

Lanes in scope: **`@executable`** (25 scenarios across three tasks) and **`@uat`** (2 scenarios).
No `@manual`. Run **inline** by the product owner who authors this record — also the single
writer that allocates the finding ids below.

Every suite run was made under a fresh isolated `AOF_GLOBAL_HOME`, through `node scripts/test.mjs
--only <files>` and never `node --test` (a silent false pass on these files) and never the whole
repo lane (`:4182` is held by the live control daemon). Exit codes were read from `node`/`aof`
directly, then re-read from a saved copy for the counts. `aof work validate` and `aof work doctor`
were run from the repository root.

**Six files, widening outward from the contract.** The story's three own suites; story 79's drift
control, which tasks/01 asserts passes unedited; and the two standing suites this story edited —
`release-workflow-lint` (its read boundary re-homed to `test/support/workflow/workflow-lint.mjs`)
and the source-directory budget (`test/arch/command` 24→25, `test/arch/loop` 54→55, `test/bundle`
30→31, plus the `test/arch/bundle` row's freeze note).

**The checkout is shared with concurrent lanes, and the boundary is drawn by ref.** The budget
control's diff also carries `src` 91→92 (`loop-diag.mjs`), `src/commands` 67→68 (127/02) and
`test/arch/work` 43→48 (127/01–02) — none 125's. The control is green with all of them in the tree;
125's three rows are the ones this record vouches for.

**The two `@uat` scenarios were not brokered to a QA session.** Their shared precondition is a
repository setting and a merge, and both were measured absent at the source before anything was
spawned (F-125-A); a session that cannot make the site live has nothing to broker. The procedures
are recorded below for the human, and the accept is **held** rather than taken on their absence.

## Verification evidence

Run 2026-09-13 at the gate. Each row names the procedure and the observation.

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story) | isolated home, one focused run over `test/bundle/site-build.test.mjs`, `test/arch/loop/acd-site-is-projected-not-copied.test.mjs`, `test/arch/command/acd-readme-names-what-ships.test.mjs`, `test/arch/loop/acd-loop-document-current.test.mjs`, `test/bundle/release-workflow-lint.test.mjs`, `test/arch/testing/acd-source-directory-budget.test.mjs` | **64 ok, 0 not ok, exit 0**; no file reported unusable. `site-build/00` 9 rows, `site-build/01` 10, `arch/125/01` 3, `arch/125/02` 7, `arch/79/02` 8, `release-workflow-lint` 21, `arch/119 FF-11904` 6 | tasks/00 all 9 `@executable`; tasks/01 all 11 (3 in the arch control, 8 in `site-build/01`, which adds 2 rows beyond the contract — the atomic-swap refusal and the built-ins-only import closure); tasks/02 all 6 (the arch control adds 1 — the same lesson applied to `docs/index.md`) |
| `@executable` (79's control, unedited) | `arch/79/02` in the same run; `git status -- test/arch/loop/acd-loop-document-current.test.mjs` | 8/8 green; the file is unmodified, and its reader-set row reports exactly `src/commands/loop-document.mjs` + `src/loop-document.mjs` with the builder under `scripts/site/` | tasks/01 sc. *the builder is reachable from no path the delivered reader-set control walks* |
| agent-run, the build as the workflow runs it | `node scripts/site/build-site.mjs --out <scratch>` over this tree, unpiped | **exit 0**; stages exactly `loops.md` (`kind: generated`, `regenerate: aof work loops document --write`), `PRD-acd-loop-engineering.md`, `PRD-graph-engineering.md` (both `kind: authored`) plus the `docs/` shell; each body wrapped `{% raw %}…{% endraw %}` and nothing else added. `git status -- docs/ wiki/work/loops.md` unchanged afterwards | tasks/01 provenance outline, *published as authored*, *writes only into the directory it stages* |
| agent-run, the landing page's links | the three staged `permalink:` values against the three links `docs/index.md` carries | `/loops/`, `/prd-acd-loop-engineering/`, `/prd-graph-engineering/` — one-to-one, none missing, none extra | the *landing page links every page the build published* clause of the tasks/00 `@uat`, as far as it can be checked without the site |
| agent-run, the live preconditions | `gh api repos/{owner}/{repo}/pages`; `gh run list --workflow=pages.yml` | **404 Not Found** on both — no Pages site is configured for the repository as it then stood (`UmairB/agent-orchestration-framework`, since renamed `-archive`; the public home is now `Umairs-Workspace/agent-orchestration-framework`), and `pages.yml` is not on the default branch (untracked here, on `milestone-127-backlog-and-archive`) | both `@uat` scenarios' `Given` — unmet (F-125-A) |
| gate | `aof work validate 125`, from the repository root, unpiped | **`PASS — 125 is well-formed.`**, exit 0 | step 4 |
| gate | `aof work doctor 125`, from the repository root, unpiped | **exit 0**, and **no `control-unresolved` at either severity**; no `doc-over-budget` (`STORY.md` is 150 lines, at the strictly-greater budget). Warns only: `numbering-gap`, `rubric-join-unchecked`, `depends-edges-unchecked` — the same three 123, 126 and 128 recorded, stream-wide and inherited. `Loop-Ready: 80% (8/10)`, unchanged | step 4 |
| record | the story's `in-review` status before this gate; `aof work find 125 --json` | `status: in-review`, run `20260912T175636771Z-0001` `outcome: done` — the Review gate was passed on 2026-09-12 | the `in-review` precondition of the accept door |

## Findings

Ids are allocated here by the single writer of this record, at the moment of landing them.
**No blocker finding is open.** One finding was recorded at the first gate; it was environmental,
not a defect in the delivered code, and it is **discharged** at the second.

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-125-A | **The live site could not be reached at the first gate, so neither `@uat` could be performed.** `gh api /pages` → 404 (no Pages source set), and `pages.yml` had never run on `main` because it was not on `main` — the story's diff was uncommitted on a branch. Consequence already in the tree: `README.md` named a Pages URL that 404ed — a claim about system state only true once the owner acted, the exact class of defect tasks/02 exists to name | environment (precondition) | Important | **non-blocker, not a code defect**: the workflow, the build and the README are what make the claim TRUE once the owner acts; nothing in `src/`, `scripts/` or `docs/` could substitute. Held the accept rather than taking it | the repository owner — put the tree on `main`, set the Pages source to **GitHub Actions**, let `pages` run once | **discharged 2026-09-13** — the tree became the root of the public `Umairs-Workspace/agent-orchestration-framework`; Pages enabled with `build_type: workflow`; run `34782343251` deployed; both procedures signed below |

## User sign-off

Both procedures were **pending** at the first gate (2026-09-13, morning — F-125-A). The same day
the tree became the public repository's root, the Pages source was set to GitHub Actions, and the
push's `pages` run (`34782343251`) went green in both jobs — `gate` (story 79's control through
`npm ci` + the project's test command on a clean Linux clone) and `build and deploy the site`.
Agent-run evidence was put in front of the operator before the sign-off: all four pages fetched
**HTTP 200**; the landing page's `href`s are exactly `/`, `/loops/`, `/prd-acd-loop-engineering/`,
`/prd-graph-engineering/` and the repository; `/loops/` carries the kramdown `language-mermaid`
fence, the pinned `mermaid@11.4.1` include and the census `<table>`; a headless-Chromium render
at 1280px (`--virtual-time-budget=8000`) shows the graph drawn, no Mermaid source as text, and
the census as a table. The operator signed both in the session.

| scenario | procedure (the human) | result | signed |
|---|---|---|---|
| tasks/00 *the site is live and reachable* | (1) Confirm the `pages` workflow's deploy job ran green on `main`. (2) Open `https://umairs-workspace.github.io/agent-orchestration-framework/`. (3) Follow each of the three links on the landing page and confirm none 404s and no other page was published that the landing page does not link | **pass** — deploy green; `/` 200; `/loops/`, `/prd-acd-loop-engineering/`, `/prd-graph-engineering/` each 200; the build staged exactly those three pages | operator, 2026-09-13 |
| tasks/01 *the graph renders as a diagram on the published page* | (1) Open `/loops/`. (2) Confirm the loop graph is drawn as a diagram and no block of Mermaid source is shown as text. (3) Confirm the health census above it reads as a table | **pass** — diagram drawn (17 records, 23 edges, labelled); no fenced source visible; census table rendered above the graph | operator, 2026-09-13 |

## Accept decision

**ACCEPTED, 2026-09-13, on the second gate of the same day.** `aof work status 125 done` was run
and stamped the acceptance.

**The first gate held.** The `@executable` lane was green in full (64/64), story 79's control
passed unedited with the builder outside its walk, the build was a clean projection whose three
permalinks were the landing page's three links, validate PASS, doctor with no unresolved control —
and the accept was still held, because the one thing no test can assert (the story's own plan
said so) was measured absent at the source: no Pages source, no deploy from `main`.

**The second gate closed it by making the claim true, not by re-describing it.** The working
tree became the single root commit of the public repository, `pages.yml` ran on the push, the
gate job passed on a clean CI clone (the deploy is gated on the delivered control, run — tasks/01's
central claim, now witnessed outside this machine), Pages was enabled with the Actions source, the
deploy job published, and the operator signed both `@uat` procedures against the live site with
the fetches and the render in front of them. F-125-A is discharged by that, not by a note.

**What was re-pointed at the close, and why it is not drift.** The Pages URL in `README.md`, the
site's Jekyll `url`/`repository` and the landing page's repository link moved from the personal
account to the organisation the public repository lives under. Task 02's control still resolves
every command the README spells; the URL is the one thing on that page no control checks, and it
was checked the only way it can be — by fetching it.

**The close created nothing.** One finding, environmental, discharged by the owner's two actions.
No chore, no folder in the stream.
