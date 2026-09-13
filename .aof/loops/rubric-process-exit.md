---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: anchor:rubric-process-exit
kind: anchor
title: Rubric process exit
ground: process-exit
observes: module:src/commands/grade.mjs#reportObservation
data-feed: [loop:build-to-green]
---
# Rubric process exit

Framework record source: `src/bundle/loops/rubric-process-exit.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

`reportObservation` is the exported command-boundary seam that reads a completed rubric subprocess
capture and retains its exit status (`src/commands/grade.mjs:179-183`, `:253`). `compileGrade` then
treats a non-zero status as a veto even when the report text looks green
(`src/work/grade.mjs:456-462`). That is direct evidence for `ground: process-exit` rather than a
claim inferred from prose.

The `data-feed` edge to `loop:build-to-green` is supported by that loop's controlled value —
executable scenarios and fitness functions green — and by the grade record being the framework's
machine-readable observation of those executions. No other edge is declared: a process exit does
not by itself ground the human or lifecycle judgments made by the other framework loops.
