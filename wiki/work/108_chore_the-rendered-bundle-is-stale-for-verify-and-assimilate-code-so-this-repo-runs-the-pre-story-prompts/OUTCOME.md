# 108 · The Rendered Bundle Is Stale For Verify And Assimilate Code So This Repo Runs The Pre Story Prompts — Outcome

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

### This repo's own installed bundle is re-renderable on a Windows checkout
`.claude/**`, `.codex/**` and `.opencode/**` are pinned `text eol=lf`, so on a `core.autocrlf=true`
checkout all 144 installed members classify `keep` and none classify `drift-warning` — `aof work update`
re-renders without `--force`, where before it could render none of them.

### The installed bundle is current with its `src/bundle/` source
Every rendered member across the three runtime trees is byte-identical to the source it renders from,
including `aof-architect.md` — the member that was actually stale, not `verify.md` or `assimilate-code.md`.

### The install-tree EOL pin is guarded, and the guard can fail
`acd-bundle-install-eol-pinned` resolves every render target across all three runtimes through
`git check-attr` and asserts `eol=lf`, with a non-vacuity control outside the trees reporting
`unspecified`; it is registered in the `scripts/test.mjs` array, so it runs in the suite.

## Assumptions

- **Every member under the three install trees is text** — the pin is tree-wide rather than
  extension-scoped, mirroring the `src/bundle/**` source pin; a binary member landing under these
  trees takes an explicit `-text` override on its own path, as `.gitattributes` records.
