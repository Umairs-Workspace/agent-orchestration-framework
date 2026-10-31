# Build brief

## Mechanism

Three factories in `@aof/work` take the graph's five read helpers by injection today. Swap those
five for one: `relations(paths, { projectRoot })`. Core binds it from the code-only port, the
graphify code backend composed alone, which story 02 put in `knowledge-engine.mjs`. `@aof/work`
still imports nothing from `@aof/knowledge`, because knowledge depends on work and never the
reverse. The capability arrives as a function.

Per reader:
- **Test selection** (`select.mjs` around the `no-graph` / `graph-unreadable` widenings). Ask
  `relations(changed)` once. `unavailable` picks the widening reason, `builtAt` comes from the answer,
  and `files` replaces `computeImpact`'s array index for index. The empty-changed-set refusal still
  fires before any read.
- **Derivation** (`loadGraph` plus the impact loop). `loadGraph` disappears. Ask `relations` with the
  subject paths and map `unavailable` onto `GRAPH_UNAVAILABLE`'s `absent`/`unreadable`. The
  artifact path it reports comes from `answer.artifact`.
- **Seam liveness** (`dependentsIndex`). Ask `relations` once, with every candidate's `rel`. Build
  the dependents map from `files[].dependents` and the present set from `files[].present`. The two
  limit sentences keep their wording. The second quotes `answer.cause` where it quoted the error's
  code.

FF-17904 is a static import scan over `packages/*/src/**/*.mjs`. It finds every importer of
`readGraph`, `normalizeGraph` or `computeImpact`, by named import from `graph-normalize`,
`graph-impact` or their package specifiers, and compares the set to the allowlist that 179/ADR-004
names. It prints any extra importer with its line.

Watch for:
- Several arch controls in `test/arch/testing`, `grade` and `planning` assert the selector's and
  deriver's injected names, because they guard "one selector, one reader". Re-read each one. The
  guarded invariant is still true, with the one reader moved. Amend the spelling, and never the
  invariant.
- The derivation proposal is advisory and is rendered at refine. Run it on a real story before and
  after, and diff the proposal.

## Verification

Under an isolated `AOF_GLOBAL_HOME`, on this repository with a fresh `aof graph build .`:
1. Run the selector's in-process report for 179/04's declared files, the seam-liveness audit lane,
   and the derivation for 179/02, once on the commit before this story and once after.
2. `diff` the three outputs. They must be identical.
3. Delete the artifact and repeat. Each reports its unavailable form as before.

Record FF-17904's red probe: import `readGraph` into `select.mjs` and quote the message.

## Out of scope

The graph commands (02). The record corpora (03). Changing any widening policy or audit finding.
