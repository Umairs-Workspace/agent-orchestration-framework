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

# aof

`aof` is a local CLI for agent-driven delivery. Its heart is `aof work`: an opinionated workflow –
**ACD, Agent-Centric Delivery** – where a milestone is broken into independent stories and tasks with
`.feature` acceptance criteria, and a bundled team of subagents plus `/aof:*` slash commands refine,
build, review and verify each one. Everything is Markdown and JSON in the repository.

## Pages

- [ACD – Agent-Centric Delivery]({{ '/acd/' | relative_url }}) – the delivery model: items, the
  `.feature` contract, the lifecycle, the team, the gates.
- [The loop graph]({{ '/loops/' | relative_url }}) – the control loops that drive delivery, every
  declared node and edge as a diagram with the health census. **Generated** from the committed loop
  document (`aof work loops document --write`).

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

---

[Delivered]({{ '/delivered/' | relative_url }}) – the accepted items' outcome records, concatenated.
**Generated** by the site build.
