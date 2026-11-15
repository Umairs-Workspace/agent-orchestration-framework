# 192/02 · The gated prose leaves core — Outcome

## Delivered

### Discovery is a declared practice of the specification-by-example package
`@aof/specification-by-example`'s own bundle fragment declares the `discovery` practice (key `work.examples.enabled`). Its fragments carry the discovery prose into the refine command and into the PO, architect and QA briefs, under `assets/fragments/discovery/`, with a Claude body and a Codex body for each target.

### The build brief is a declared practice of core's own bundle
Core's bundle declares the `build-brief` practice (key `work.plan.enabled`). Its refine fragment, `assets/fragments/build-brief/refine.md` and `.codex.md`, holds the `PLAN.md` prose that used to stand inline in the refine command.

### Core's sources hold slots, not practice prose
Core's refine command (Claude source and Codex workflow) holds the `entry.rules`, `contract.discovery`, `contract.formulation`, `contract.brief`, `autonomous.milestone` and `output.autonomous` slots. The PO, architect and QA briefs hold `ownership.examples`. None of these sources holds the words of either practice (FF-19208).

### A project with a practice off is given none of its prose
With both keys off, the rendered refine command and the three briefs, on every runtime, hold none of the discovery or build-brief words. The refine command is 104 lines shorter than with both keys on.

### A project with a practice on reads what it read before
With both keys on, the rendered commands and briefs match their pre-move text, compared with whitespace collapsed, except at two seams. The Contract's opening no longer says "opening with the discovery beat below when the project has turned it on". The Codex skill's ";" before "retain" is now ". Retain". The nine rendered briefs are byte-identical.

### This checkout's lock owns what it renders
`.aof/aof.lock.json` holds the hashes of the re-rendered refine copies and records `work.practices` (`build-brief`, `discovery`). `aof work update --dry-run` plans no change.

## Assumptions

- **Lock carried by hand** — the lane's lock write was dropped by the loop's reconcile (`m127/F-13`) and re-stamped at verify. A later lane that changes rendered output can drop it again until that gap closes.
