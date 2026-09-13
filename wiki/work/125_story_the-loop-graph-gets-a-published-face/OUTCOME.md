# 125 · The loop graph gets a published face — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### The published site
`https://umairs-workspace.github.io/agent-orchestration-framework/` serves a landing page and
three pages — `/loops/`, `/prd-acd-loop-engineering/`, `/prd-graph-engineering/` — and the landing
page links exactly those three plus the repository.

### One publishing workflow
`.github/workflows/pages.yml` is the second and last workflow beside `release.yml`; it holds two
jobs, `gate` and `deploy`, and `deploy` declares `needs: [gate]`.

### The gate is story 79's control, run
`gate` runs `node scripts/test.mjs --only test/arch/loop/acd-loop-document-current.test.mjs` under
a fresh `AOF_GLOBAL_HOME` on `pull_request` and on `push` to `main`; the workflow holds no byte
comparison and no regeneration of the loop document of its own.

### The deploy runs on `main` alone
`deploy` runs for a push to `main` or a `workflow_dispatch` whose ref is `main`, never for a pull
request; `pages: write` and `id-token: write` are granted on that job alone, the workflow's top
level and the gate job hold `contents: read`; concurrency group `pages-deploy` with
`cancel-in-progress: false`.

### The graph page is projected, never copied
`scripts/site/build-site.mjs` stages the `docs/` shell plus `wiki/work/loops.md` and the two
planning PRDs into `dist-site/` (git-ignored, `.dist-site-*` staging sibling too); it takes the
document's path from `loopDocumentPath`, spells no basename, composes no part of the document,
writes only inside `--out`, refuses an `--out` holding a foreign file by name, swaps atomically,
and stages a byte-identical site on a second run. Its static import closure is node built-ins
only, so the deploy job stages without `npm ci`.

### Every published page states its provenance
Each staged page carries front matter `source:`, `kind:` (`generated` for the loop document,
`authored` for the PRDs) and, for the generated page alone, `regenerate: aof work loops document
--write`; each body is wrapped `{% raw %}…{% endraw %}` and otherwise byte-identical to its source.

### Mermaid renders on Pages
`docs/_layouts/default.html` pins `mermaid@11.4.1`, promotes each `code.language-mermaid` node
kramdown emits into `pre.mermaid` before running Mermaid, and fetches the library only on a page
that carries a fence.

### The README names what ships
The `/aof:autonomous` row names milestone 53 as where `aof work loop` replaced it and still says
what the command does for a run in flight; a *The loop machinery* section lists `work loop`,
`work loops show|graph|validate|groundedness|document`, `work loop-record`, `work tune`,
`work trigger`, `work acceptor`; the section links the published site.

### The README cannot name a command that does not resolve
`test/arch/command/acd-readme-names-what-ships.test.mjs` extracts every `aof …` invocation from
`README.md`'s fenced blocks and command tables (never prose), resolves each against
`deriveRouteTable()`, keeps no route list of its own, holds a declared floor, and applies the same
control to `docs/index.md`.

### The builder's placement is a control
`test/arch/loop/acd-site-is-projected-not-copied.test.mjs` holds that story 79's reader-set row
still reports exactly two `src/` readers with the builder outside its walk, that the builder
imports `loopDocumentPath` and spells no basename, and that nothing under `docs/` is the document's
bytes or the builder's output.

### The workflow lints share one read boundary
`test/support/workflow/workflow-lint.mjs` exports `readWorkflowText` (CRLF normalised at the read)
and `stripYamlComments`; `release-workflow-lint` and `site-build` both read through it.

## Assumptions

- **The Pages source is GitHub Actions** — the deploy job publishes only where the repository's
  Pages source is set to `workflow`; it was set on `Umairs-Workspace/agent-orchestration-framework`
  on 2026-09-13, and a repository without it fails at `configure-pages` before publishing.
- **The builder stays dependency-free** — the deploy job's stage step runs without `npm ci` on the
  premise held by `site-build/01`'s import-closure row; a bare specifier in the builder's closure
  reds that row before it reds the deploy.
- **The Mermaid include is reachable** — the diagram draws in a browser that can fetch the pinned
  `mermaid@11.4.1` bundle; with it blocked, the promoted `pre.mermaid` holds the fence's text.
