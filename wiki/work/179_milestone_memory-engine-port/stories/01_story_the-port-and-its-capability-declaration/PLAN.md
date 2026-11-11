# Build brief

## Mechanism

`engine.mjs` exports `KNOWLEDGE_CORPORA`, `ENGINE_VERBS`, `RECORD_CORPORA` and
`createKnowledgeEngine({ backends })`. `RECORD_CORPORA` is the frozen declaration that every record
backend and every in-process stub harness spreads. Story 03 adopts it, so it is defined once, here.
Construction walks each backend's `corpora` once and builds a frozen route table keyed
`"<corpus>:<verb>"` → backend. It throws a `TypeError` naming the backend and the entry for:
- an unknown corpus or verb;
- a declared verb with no method behind it;
- a pair already claimed by another backend.

A backend counts as a record backend when it has `reindex` and not `ingest`. For that one shape, the
route's `ingest` calls `reindex(input?.only ?? null, ctx)`. Every other verb calls the method of the
same name.

The four returned verbs share one lookup. `recall` looks up `work:recall`, `relations` looks up
`code:relations`, and `ingest` and `status` look up the corpus they are given. `status` with no
corpus answers an object keyed by every declared corpus. A missing route returns the frozen miss
`{ served: false, code: "corpus-unserved", corpus, verb, backends: [names] }` and calls nothing.

Return a frozen object with exactly the four verbs, so FF-17901 can assert the key set.

The core binding `knowledge-engine.mjs` exposes `{ createKnowledgeEngine, KNOWLEDGE_CORPORA,
ENGINE_VERBS }` and is assembled in `assemble.mjs`. Story 02 adds the graphify code backend to that
same binding, so leave room for it there.

Watch for:
- Keep the port free of graphify, config and fs. It is a pure router, and the suite drives it with
  stubs alone.
- The budget control re-checks exemptions on every run. Moving `packages/knowledge/src` from
  exemption to row is a move, not an addition. Delete the exemption entry.

## Verification

Under an isolated `AOF_GLOBAL_HOME`, run `packages/knowledge/test/index.mjs`'s array and
`test/arch/memory/index.mjs`'s array, plus the budget and yarn-installation suites. Record FF-17901's
red probe in the milestone VERIFICATION: drop the declared-method check, construct a backend that
declares `code: ["relations"]` with no `relations` method, and quote the message the control prints.

## Out of scope

Wiring any real backend or face (02, 03, 04). A `--corpus` flag. Config keys.
