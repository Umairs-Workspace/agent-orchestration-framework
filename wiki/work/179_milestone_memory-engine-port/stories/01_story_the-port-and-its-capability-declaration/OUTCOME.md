# 01 · The knowledge-engine port answers four verbs and routes each by a backend's declared corpora — Outcome

## Delivered

### The knowledge-engine port
`createKnowledgeEngine({ backends })` in `packages/knowledge/src/engine.mjs` answers exactly `ingest`, `recall`, `relations` and `status`, and routes each (corpus, verb) pair to the one backend that declared it, calling a record backend's `reindex` as its `ingest`.

### The capability declaration
Every backend composed into the port exports `corpora`, a map from a corpus in `KNOWLEDGE_CORPORA` (`work`, `code`, `operator`, `imports`) to verbs in `ENGINE_VERBS`, and construction throws a `TypeError` naming the backend and entry for a value outside the vocabulary, a declared verb with no method, or a pair two backends both claim.

### The corpus-unserved miss
A verb asked of a corpus no backend declares answers `{ served: false, code: "corpus-unserved", corpus, verb, backends }` and calls no backend.

## Assumptions

- **No face asks an unserved pair yet** — there is no `--corpus` flag, so the miss is reached only through the port itself and its stub-backed suite.

## Gaps

### A duplicate pair within one backend reads as a rival
- **Status:** open
- **Discharge condition:** the duplicate-pair refusal distinguishes a backend that lists one verb twice from two backends claiming one pair.
A backend declaring `code: ["relations", "relations"]` is refused with a message that names that same backend as the one that "already serves" the pair.
