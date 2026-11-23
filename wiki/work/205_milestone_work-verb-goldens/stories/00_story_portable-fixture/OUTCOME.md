# 00 · One portable fixture exposes stream and CLI drift — Outcome

## Delivered

### A logical seed materialises one work stream with every item shape

`test/golden/fixtures/work-stream/seed.json` describes milestone, story, task, chore, spike, uat and four prototype states, the backlog, the archive, satisfied and unsatisfied `depends` edges and opaque attachments, and `file-adapter.mjs` is the only code that turns it into files and exports the stream back (ADR-001, ADR-002).

### A work verb is observed as a real CLI run, byte for byte

`run-case.mjs` runs the checkout CLI in a disposable project under a frozen clock, with stdout and stderr untrimmed and kept apart, exit and argv recorded, and the stream exported before and after the verb with its private SQLite state left out.

### Work-stream cases are data, registered once

Each verb family is a `work-stream-<family>.cases.json` manifest read by `work-stream.lane.mjs`, which feeds the same lanes to the golden registry and to `test/golden/work-stream.test.mjs`. A duplicate id, an empty manifest, a manifest without baselines or a baseline without a case fails (ADR-003). The `work-stream-fixture` lane holds 10 scenarios.

### The cases can only reach a store through public verbs

FF-20501 (`test/arch/work/acd-work-stream-golden-boundary.test.mjs`) runs the real case loader and rejects a direct storage path, a shell program, an internal entry point or a callback in a manifest.

### Changes to the fixture's files select their own suites

`work.test.couplings` in `.aof/aof.config.json` maps the baselines, manifests, adapter, seed, clock and runner to the suites that read them, so an impacted run over a fixture change selects 19 suites instead of widening to all 1,311.

## Assumptions

- **The exported tree is the compatibility view** — a later store must export today's visible folder tree, path moves and uninterpreted bytes included, for its runs to compare (ADR-001).
