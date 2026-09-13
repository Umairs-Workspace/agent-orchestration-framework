# 124/02 · The learning edge reaches every cut — Outcome

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

### shatter recalls before it cuts
`src/bundle/commands/shatter.md` step 1 runs `aof work memory recall "<objective and scope
keywords>" --block` once per PRD, as the product owner, before the drivers are identified — with no
`--item` (no ref exists yet) and no `--area` (a milestone-level cut is cross-cutting). An empty
recall is a proceed, and any near-miss that changed a framing is acknowledged under a heading the
driver's own template declares.

### Every cut-making command carries a recall, by roster
FF-12405 holds a named roster of the two cut-making commands (`refine.md`, `shatter.md`) asserted in
both directions, classifies every other command file with its exclusion reason, and checks each
memory invocation in the bundle token by token against `MEMORY_VERBS`, `SCOPE_FLAGS` and
`parseMemoryArgv` — never against prose, and never against the command registry, whose
`aof work memory` door is asserted to be unrouted.

### The three mirrors and both hash records agree with the source
The Claude, Codex and OpenCode renders of shatter and `src/bundle/manifest.json` re-render from the
edited source, and `.aof/aof.lock.json` matches the bytes on disk for every path it names — including
the four pay-debt and run-resilience paths whose recorded hashes were stale at HEAD.

## Assumptions

- **The recall's value is its placement** — a recall after the partition cannot change it, so the
  delivered property is "before step 2", not the query text.
- **`--block` is accepted by the parser and absent from the help** — `parseMemoryArgv` takes it;
  `aof work memory --help` does not print it.

## Gaps

### A recorded hash compared with a file, for the whole bundle
- **Status:** open
- **Discharge condition:** a control that compares every recorded hash in the lock and the manifest
  with the bytes on disk, across every runtime including `.opencode/`.
FF-12405 leg 9 asserts lock-versus-disk agreement as this story's control over the lock's path set;
no general control does, the manifest declares no `.opencode/` entries, and
`acd-bundle-manifest-hashes` hashes its own re-render rather than the disk.
