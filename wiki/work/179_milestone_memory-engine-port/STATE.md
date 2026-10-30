---
doc: state
---
# 179 · One knowledge engine behind both memory faces — State

## Progress

- 2026-10-30 — 179/04 built and reviewed. Test selection, derivation and seam liveness ask
  `relations`, and FF-17904 gives the code graph one reader. Every story is now in review, so the
  milestone is at the Review gate.
- 2026-10-30 — 179/03 built and reviewed. The record corpora sit behind the port, `aof memory` answers
  byte for byte through both doors, and FF-17902 is amended.
- 2026-10-30 — 179/02 built and reviewed. graphify serves `code` behind the port, `graph build` and
  `graph impact` are thin faces, the nested ignore closes 149's gap, and FF-17903 is amended.
- 2026-10-30 — 179/01 built and reviewed in solo mode: the port (`engine.mjs`), its core binding,
  FF-17901. Wave 1 ({02, 03}) was next.
- 2026-10-30 — refined autonomously, in solo mode. ARCHITECTURE.md (ADR-001–004, FF-17901–17904)
  and four stories, each contracted (STORY, a not-applicable EXAMPLES, PLAN, tasks). Waves:
  01 → {02, 03} → 04.

## Notes & decisions in flight

Default decisions taken at refine (non-critical, recorded for the review):

- **D1 · Build order with `retire-graphify-memory-backend` is left free.** 177 retired the graphify
  memory backend. Its backlog milestone says 179 should wait on it, but a stream item cannot carry
  an edge to a backlog item. The ADRs are drawn so either order works:
  - the port wraps every registry backend and builds no seam for the private work-stream graph
    (ADR-003);
  - the one wart is named: that graph's build rides `ingest("code")` until it is deleted (ADR-002);
  - FF-17904 names the retiring backend as an exact-path exception.

  Recommended order: promote and build the retirement first, then 179 shrinks by one `corpora` line
  and one exception. Not a gate.
- **D2 · Record backends keep 05's method names.** The port calls a record backend's `reindex` as its
  `ingest`, so the 43 direct `reindex` call sites in the suites stand unchanged (ADR-001).
- **D3 · The engine-native graph verbs stay outside the port.** These are query, triage, serve,
  export, import, fetch, publish and prune. Their output is graphify's own text or artifact bytes,
  never a record or an edge (ADR-002).
- **D4 · Share stays in `graph:build`, around `ingest`.** It is git transport (174/ADR-001), not
  engine work.
- **D5 · `none` declares the record corpora and answers empty.** Memory off stays "served, empty",
  never `corpus-unserved`, as it is today (ADR-003).
- **D6 · Hand-rolled stub backends in five in-process harnesses gain `corpora: RECORD_CORPORA`.**
  Their assertions stay unchanged. `RECORD_CORPORA` is defined once, in `engine.mjs` (01). This was
  ratified while authoring 03's contract and folded into 01's PLAN and task 01 in the same beat.
- **D7 · `computeImpact` goes one-pass per call** with identical outputs, so seam liveness keeps its
  read-once property through `relations` (ADR-002, ADR-004).
- **D8 · The SPEC's 178 out-of-scope line is satisfied, not pending.** 178 shipped `aof memory`, so
  the memory faces are `aof memory` and its alias.

Recalls: architect `0cc41230-ce60-48e3-8988-ebf655feee9b` (5 records: 1 departed, 05/ADR-003;
2 honoured; 2 irrelevant). PO `3d51cca4-9c10-4a27-ac3e-b2a045149ee2` (`--item 179`, empty: an item
not yet indexed is empty by construction, as 177 measured for this edge).

Diagram not drawn: `diagram-generator-missing` (ADR-001's brief kept; the diagram-design plugin is not
installed on this Mac).

Codebase graph used for the boundaries: `aof graph build .`, 2026-10-30T11:47Z, 21,070 nodes,
46,235 edges, egress none.

## Feedback (for retro)

- 179/01 review, Nit, recorded: a backend that lists one verb twice for a corpus, e.g.
  `code: ["relations", "relations"]`, is refused with "declares "code:relations", which backend
  "x" already serves". So the message names the backend as its own rival. The refusal is right,
  but the wording reads as a cross-backend claim.
- 179/01 read set: `reads:` names no sibling package suite to copy. The build read
  `packages/knowledge/test/memory-record-origin.suite.mjs` and `memory-hooks-inert.suite.mjs` for the
  suite conventions (exported array, scenario-named cases). The read set was missing that one entry.
- 179/01 write set: two writes outside `files:`.
  - `test/arch/command/acd-cli-entry-executes.test.mjs`: FF-16004's `work find` ceiling, 740 to 742.
    Any module `assemble.mjs` composes is on every verb's path, so ADR-001's binding moves this row by
    construction.
  - FF-17901's purity case had to use `test/support/module-family.mjs` (FF-11901 refuses a token ban).

  Stories 02 and 03 add modules to the same assembly, so their `files:` should name the ceiling row
  too.
- 179/02 contract flag: task 01's "valid JSON with no links key" row says the cause is "the
  normaliser's message". ADR-002 says the cause is the read error's `code`, else its message, which is
  also the form seam liveness quotes today. The normaliser's refusal carries `code: "graph-format"`, so
  the build follows the ADR and its case asserts the code. The feature was not edited.
- 179/02 contract decision: task 00 requires `git status --porcelain` to list nothing under
  `graphify-out/`. 10/ADR-005's nested ignore (`*` plus `!.gitignore`) leaves the ignore file itself
  untracked, which shows as `?? graphify-out/`.
  - The code corpus's ingest therefore writes `*` alone, which ignores itself. The SPEC puts each
    corpus's ignore policy on the port.
  - The graphify memory backend keeps its self-documenting variant. Where that backend wrote the file
    first, the variant stays and the one untracked ignore file remains.
  - The shared header line ("rebuilt from the .md stream") is the work graph's wording and is now also
    stamped on the code graph's ignore (Nit).
  - Both quirks end when `retire-graphify-memory-backend` deletes the other writer.
- 179/02 behaviour delta, ADR-sanctioned: `graph impact` over an artifact that does not parse now
  refuses with a coded `graph-unreadable` 424, naming the cause. It used to escape as a raw
  SyntaxError. This is the one degrade path for the corpus (ADR-002).
- 179/02 write set: two writes outside `files:`.
  - FF-16004's `work find` ceiling, 742 to 744, for the code backend and the impact binding.
  - One row in `packages/knowledge/README.md` for `graphify-code-backend`.
- 179/02 review, Important, recorded: to keep 174's fetch only on a miss, the share wrapping reaches
  into ingest through `input.onMiss`. That hook is a face's transport callback inside the engine's
  input. A later code engine that ignores it would still build correctly, but share would stop
  taking the published graph. Wrapping share around ingest with no hook inside it needs an answer
  that ADR-002 does not give: who decides "current" before the spawn. That makes it a design
  question for whoever plugs in the second engine, not a fix for this close.
- 179/02 process: the near-miss recall was taken after the build, not before. It surfaced nothing the
  build had not already done.
- 179/03 harness note: `createMemory` gains an optional `createEngine` collaborator, defaulting to
  `createKnowledgeEngine`, so a harness can watch which port verb each memory verb asks. Core passes
  nothing new.
  - Hand-rolled stubs that gained `corpora`: `work-memory-seam`'s `makeStub`, `gap-carries-discharge`'s
    fixture and `acd-memory-recall-contract`'s stub.
  - The other stub harnesses never reach a port (the verb is gated first), or inject a real backend.
- 179/03 process: the golden was captured on the working tree before 03's first edit, not on a commit.
  The memory path was untouched by 01 and 02, and two captures agreed.
- 179/04 contract flag: task 00's selection rows say "suites registered for `src/a.mjs` and
  `src/c.mjs`" are selected when `src/b.mjs` changes, and "the suites of `src/lonely.mjs`" are selected
  once lonely imports b. The selector is one-hop (72/ADR-002), so a suite is selected only when it is
  itself a dependent of the changed file. The fixture realises the rows that way: the suites
  `test/a.test.mjs` and `test/c.test.mjs` import b, and `test/lonely.test.mjs` imports b once the graph
  is rebuilt. The feature was not edited.
- 179/04 behaviour notes, both forced by `relations` being async:
  - `selectSuites` and `deriveStoryContract` are now async. The one production caller of the
    selector (`packages/work/src/commands/test.mjs`, which is not in `files:`) gained one `await`.
    The derivation has no production caller.
  - The empty-changed-set refusal now reports `graphPath: null`. It fires before the graph is asked
    anything, and `runTest` reads `graphPath` only after the refusal check.
- 179/04 caught at the sweep, fixed in-story: handing the three readers the full code engine put
  the graphify driver and the tool store into the audit family's construction closure. Both start
  processes, so 59/FF-5904 went red.
  - The readers now get a driver-free port: `createCodeRelations` composes it over the code backend's
    read half (normalizer plus `computeImpact`) in its own binding, `bindings/code-relations.mjs`.
  - The full code backend's `relations` uses the same reader function, so there is still one reader.
  - The bindings row went from 37 to 38, and FF-16004's `work find` ceiling from 744 to 745.
  - PLAN's mechanism ("core binds it from the code-only port … in `knowledge-engine.mjs`") would
    have been this regression. The ADR's "bound in core" holds.
- 179/04 write set, outside `files:`:
  - `packages/work/src/commands/test.mjs` (the `await`);
  - the new binding `bindings/code-relations.mjs`;
  - the FF-16004 ceiling row;
  - `packages/knowledge/src/graphify-code-backend.mjs` (the read half split out, and `createCodeRelations`).

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
