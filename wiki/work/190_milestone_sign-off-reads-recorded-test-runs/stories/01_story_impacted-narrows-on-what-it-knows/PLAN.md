<!-- Build brief — advisory, the builder's alone. The task features are the contract. -->
# 190/01 · `impacted` narrows on what it knows — build plan

## Mechanism

Everything still happens inside `selectSuites` in `packages/work/src/testing/select.mjs`, keeping
its "union first, predicate last" order (72/ADR-002 §2a). Each changed file is now resolved in this
order, and the first that applies wins:
1. present in the graph → the suites in its **transitive** dependents (`graph-dependent`);
2. absent, and a suite by the declared predicate → itself (`suite-itself`);
3. absent, and imported by a literal specifier from another changed file that resolved → the
   importer's suites (`imported-by-changed`). Iterate to a fixpoint, so a chain of new files
   resolves;
4. absent, not code, and matching a declared coupling → the coupling's suites
   (`declared-coupling`);
5. under `--story`, absent from disk and from the graph → nothing (`not-yet-written`);
6. otherwise → widen, with the reason 72 already gives.

`isSuiteFile` takes the declared suffixes beside the roots. `toolchain.mjs` reads
`work.test.suiteSuffixes` and `work.test.couplings`, and is still the one reader of `work.test.*`
(FF-7201). `test.mjs` hands both to the selector, and to the census walk that counts the whole
suite. The specifier scan reads only the changed files. A single regex over `import`/`export … from`
and literal `import("…")` is enough, resolved relative to the importing file. Bare package specifiers
resolve through the workspace's `package.json` `exports` only where that is a literal map. Otherwise
they leave the file unplaced (→ widen).

## Verification step

Re-run the replay from `RESEARCH.md` Q1, but through the shipped `selectSuites`, against a freshly
built graph, over the same 76 declared sets. Record in `VERIFICATION.md`:
- how many still widen, and why;
- the median selected count.

Then pick three stories that narrowed, run `aof test --scope impacted --story <ref>` on them, and
confirm the run is the suites named. A wrong result looks like a story whose `files:` names a
package `src` module yet selects no package suite. That means the predicate was not passed through.

## Out of scope

- Records and reuse — 190/00.
- Rebuilding the graph before selecting — refused by 72/ADR-002 §1, and 2:41 measured here.
- Narrowing the content key for record edits — ADR-001's rejected alternative, a later item.

## Known traps

- The extractor records some spurious edges. For example, `apps/ui/src/terminal/host-model.mjs` is
  listed as a dependent of `scripts/test-sharded.mjs`. A spurious edge only over-selects, which is
  the safe direction, so do not filter edges in the selector to "fix" it.
- Adding roots under `packages/` must not walk `node_modules`. The census walk needs an explicit
  skip.
