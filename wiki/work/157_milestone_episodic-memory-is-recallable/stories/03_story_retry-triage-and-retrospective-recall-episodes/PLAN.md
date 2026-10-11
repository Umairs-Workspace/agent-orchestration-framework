# Build brief

## Mechanism

Prompt work in three authored bundle commands — continue, verify and retrospective — plus the
Codex workflow variant where it restates the same steps, then a normal render to regenerate every
runtime output, the lock and the journal. No source code changes.

- continue: a new step, gated on attempt ≥ 2, before implementation and beside the unchanged
  `continue-developer` near-miss block. Shape it exactly like that block's capture protocol:
  ingest, the `--all` delivery recall, retain the result, acknowledge in the build record, then
  one `record-recall` with edge `continue-episodic`, actor `developer`.
- verify: at finding triage, ingest then the stream-wide `--kind finding --block` recall, compare
  by cause and evidence, cite or explain, then one `record-recall` with edge `verify-finding`,
  actor `verifier`. Ownership of findings stays with the main session.
- retrospective: the evidence step becomes observe refresh → ingest → `--all` recall; keep the
  m153 recurrence pass and post-authoring ingest exactly where they are.

Extend m153/FF-15303's `EDGES` roster in `acd-learning-edge-reaches-every-cut.test.mjs` with the two
new edges, and add the retrospective's evidence-order check — this is FF-15702.

## Verification

Render, then run the edge control and m124/FF-12405's render-parity leg with
`node scripts/test.mjs --only <files>`. Record FF-15702's red probe (drop one submission; observe
the edge named). Walk each @manual scenario on a disposable item in the test-bed with an isolated
`AOF_GLOBAL_HOME`, and record the ledger rows and build-record text as evidence.

## Out of scope

Record compilation, locators and recall's `--all` (157/01, 157/02); m153's four existing edges.
