---
title: "Start here"
permalink: /
---
<!--
  docs/index.md — the landing page (story 125). Part of the committed shell; it links every page the
  build stages. The pages themselves are NOT under docs/: `scripts/site/build-site.mjs` projects them
  from their committed sources at build time, and `test/bundle/site-build.test.mjs` holds that every
  staged permalink is linked from here.
-->

# The loop machinery

`aof work` runs as a set of declared **control loops** — build-to-green, review → fix → re-review,
verify → triage → accept, the autonomous cascade — each a record in the loop registry with its
reference, measurement, actuator, cadence and ceiling. These pages are where that machinery is
documented. The graph is not retyped here: it is projected from the committed document the CLI
renders from the registry, and a stale document fails the deploy.

## Pages

- [The loop graph]({{ '/loops/' | relative_url }}) — every declared node and edge as a diagram, with
  the health census. **Generated** from the committed loop document (`aof work loops document --write`).
- [PRD — ACD as a loop-engineered model]({{ '/prd-acd-loop-engineering/' | relative_url }}) — the
  loop-engineering arc: the CLI-owned loop shell, verification as a feedback loop, the
  self-improvement loop and event-driven triggers. **Authored.**
- [PRD — Graph engineering]({{ '/prd-graph-engineering/' | relative_url }}) — aof as an anchored
  graph of loops: the registry, its checks, the acceptor and the arbiter. **Authored.**

## The commands

```sh
aof work loop <ref|NN-MM>        # drive an item or a range through its phases, in code
aof work loops show              # the declared records
aof work loops graph             # the graph as Mermaid
aof work loops validate          # the registry's checks
aof work loops groundedness      # what each record is grounded in
aof work loops document --write  # render the graph document the page above is projected from
```

The source of everything here is the repository:
[Umairs-Workspace/agent-orchestration-framework](https://github.com/Umairs-Workspace/agent-orchestration-framework).
