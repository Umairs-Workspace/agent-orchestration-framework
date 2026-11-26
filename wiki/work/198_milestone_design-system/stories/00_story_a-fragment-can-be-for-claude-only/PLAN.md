# 198/00 · Build brief

Advisory, for the builder. The task features are the contract; the frontmatter of `STORY.md` is
the read and write set.

## The mechanism

Three seams, in this order.

1. **Load.** `contributionFaults` keeps its shape, but for a fragment with `runtimes` it first
   works out which runtime keys the named runtimes render this member from. A named runtime with an
   authored variant renders from its own key. Every other named runtime renders from `common`.
   The body rule then runs over only those keys, and a body under any other key is refused (Q3).
   Validate the list itself (non-empty array, every name in `RUNTIMES` of the capability matrix)
   before the body rule, so the refusal names the bad entry first. A list whose keys carry none of
   the slot is refused (Q1). Keep the module pure (FF-19207): hand it the matrix's runtime names
   from the loader, never import the matrix here.
2. **Selection and composition.** `selectFragments(fragments, states, { target, slot, runtime })`
   drops a fragment whose `runtimes` excludes `runtime` before the `replaces` set is built, so a
   scoped replacer replaces only where it is selected. In `composeResources`, compose the common
   body once per runtime that renders it. If every composition is equal, keep the single
   `resource.body` exactly as today: that is what makes R3 hold byte for byte. When they differ,
   carry the per-runtime bodies on the resource, e.g. `commonBodies: { claude, opencode }`, with
   `body` left as one of them for readers that load with an empty config.
3. **Resolution.** `bundle-runtime.mjs` is where a runtime's body is chosen. `resolveBundleVariant`
   and `partitionByCapability` must pick `commonBodies[runtime]` when present. `renderRuntimes` must
   not group two runtimes whose bodies differ under one resource. The orchestrator resolves through
   `resolveBundleVariant`, so it follows for free. `bundle-manifest.mjs` and `cowork-plugin.mjs` load
   with the empty config and see no scoped fragment, so leave them alone.

The list and the doctor: `practiceList` takes the descriptor's members (or a precomputed
`practiceRuntimes` map from the same place `practiceTargets` lives) and adds `runtimes` only when
every fragment of the practice is scoped and it has no template variant (Q4). The union is in
matrix order. `practiceLines` appends `for <a and b>` after the keys. The doctor's facts add the
lock's `runtimes`, and `practiceRenderFindings` emits `practice-no-effect` (warn, anchored at the
work dir) for a practice that is on, has `runtimes`, and shares none with the lock's (Q5).

## Watch for

- FF-19206's file is amended in place: its `landingGaps` gains the scoped rule, and its name and
  header now cite FF-19801 too. Its 192 planted cases must still go red.
- FF-19802's planted cases need a seam to inject a faulty composer. Load the fixture through
  `loadBundle` with an injected `readText`, and plant the fault through a test-only wrapper, not a
  flag in production code.
- The reference page is at 148/150 lines. Tighten §3 and §5 to make room; do not raise the cap.

## Verification

From a clean worktree with `AOF_GLOBAL_HOME=$(mktemp -d)`, run by file the suites in the story's
write set, the arch/practices index, and the suite that owns `bundle-runtime.mjs`. Then run
`aof work update --dry-run` in this checkout and diff its planned outputs against `main`'s. There
must be no change, since the shipped bundle declares no scoped fragment. Never run the full suite
on a node whose daemon holds `:4182`.

## Out of scope

The design-system practice's own fragments (198/02), and any shipped fragment declaring `runtimes`.
