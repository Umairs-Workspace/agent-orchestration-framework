---
type: story
number: 00
slug: the-prompt-layer
title: "The prompt layer — an agent told to use a verb it was never granted, and a rule stated four times"
parent: 77
status: done
owner: product-owner
created: 2026-09-03
updated: 2026-09-03
depends: []
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-003, wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-004, wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010, src/work-audit/reads.mjs, src/work-audit/census.mjs, src/model.mjs, src/bundle/agents/aof-product-owner.md, src/bundle/agents/aof-designer.md, src/bundle/commands/refine.md, test/support/source-slice.mjs, scripts/test.mjs, test/arch/acd-audit-never-imports-project-code.test.mjs, test/support/read-src-files.mjs]
files: [src/work-audit/prompt-layer.mjs, test/work-audit-prompt-layer.test.mjs, test/arch/acd-capability-gap-cites-a-code-span.test.mjs, test/arch/acd-duplication-rule-states-its-blindness.test.mjs, scripts/test.mjs]
---
# 00 · The prompt layer

## User story

As the person who installs aof into a project that is not this one,
I want the harness to tell me when a prompt orders an agent to run a verb its `tools:` never granted, and when the same rule has been copy-pasted into four places,
so that the failure surfaces as a finding at audit time instead of as a subagent that silently cannot do what it was told — which is how the product owner came to be ordered to run `aof work memory recall` with no `Bash` for as long as this repo has run it inline.

## Tasks

- [ ] `tasks/00_a-capability-gap-cites-a-code-span-and-under-reports.feature` — an instruction ordering a role to run a program its `tools:` never granted is a finding — a code span only, a closed one-row program map requiring `program + space + arg`, a *run* verb, exactly one bolded role word per clause, the grant from the frontmatter, and the severity taken from the audited config's role routing
- [ ] `tasks/01_a-duplicated-instruction-is-exact-and-aggregated-per-file-pair.feature` — a byte-identical normalised sentence at or above the declared floor, in two documents, is one `warn` finding for that FILE PAIR carrying its redundant byte total; a paraphrase is invisible and the corpus is the prompt layer AS INSTALLED
- [ ] `tasks/02_the-lane-declares-what-it-read-and-states-what-it-cannot-see.feature` — both sweeps declared with a floor greater than zero, a limit record on EVERY run naming the floor and both blindnesses, a shortfall reported rather than rendered clean, and the lane pure over injected inputs with no clock

## Notes

- **This story's rule UNDER-REPORTS by construction, and that is the design, not a limitation.** `ARCHITECTURE.md#ADR-003` fixes the detector: code spans only, a closed one-row program map requiring `program + space + arg`, a *run* verb, and exactly one bolded role word per clause. The naive token match `STATE.md` warned about was built and measured — **17 findings, none of them the true one**. The shipped design measures **33 docs → 165 spans → 5 attributed → 1 finding, 0 false positives**.
- **The duplication rule states its own blindness on every run.** Exact-block matching finds ZERO of the four graph-grounding copies — they are paraphrases, not copies (`ADR-004`). Sentence-level exact matching at a 120-character floor gives 21 groups / 5,242 redundant bytes / 18 file pairs; 12 groups at 200 characters; **0 at 300**. The floor is an exported constant and the lane emits a limit record naming what it could not see.
- The one live capability gap is real but **masked in this repo**: `.aof/aof.config.json` routes the product owner inline, so the finding lands at `warn` here and at `error` only where a project sets `work.agents.productOwner: "agent"`.
- Stage 1. The module registers nothing — `ADR-010 §2` puts every `REPORT_LANES` entry in 77/05, so this story cannot red on a registry it does not touch.
