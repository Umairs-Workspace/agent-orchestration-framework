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

# aof – what it delivers

`aof work` runs as a set of declared **control loops** – build-to-green, review → fix → re-review,
verify → triage → accept, the autonomous cascade – each a record in the loop registry with its
reference, measurement, actuator, cadence and ceiling. These pages document what that machinery
delivers. Nothing here is retyped: every page is projected from a committed record at build time,
and a stale record fails the deploy.

## Pages

- [Delivered]({{ '/delivered/' | relative_url }}) – what aof provides today, one section per accepted
  item, each capability stated as product state from that item's own outcome record. **Generated**
  from every `OUTCOME.md` by the site build.
- [The loop graph]({{ '/loops/' | relative_url }}) – every declared node and edge as a diagram, with
  the health census. **Generated** from the committed loop document (`aof work loops document --write`).

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
