---
aof-generated: true
description: Read the questions the loop is waiting on — each open ask in full, with the exact `aof work answer` line that replies to it.
argument-hint: "[--all] [--json]"
aof-invocation: /aof:questions
aof-runtime: claude
---

<objective>
Show the operator every question a loop has stopped a lane to ask, so they can read and answer it
from this session. Read-only: this command prints the questions and answers none of them.
</objective>

<process>
1. Run `aof work questions` from the repository root — add `--all` when the operator asks for every
   workspace on this node, and `--json` when they want the rows as data. The verb reads the ask files
   and the local mesh store directly, so it answers when the portal is stale or down.
2. Print what it printed, unchanged: each question in full, its choices, whether it is parked, stale
   or on another node, and its `aof work answer <ref> "…"` line. A stale row has no answer line — its
   loop stopped, and `aof work loop <ref> --resume` clears it. A row from another workspace names the
   checkout to answer from.
3. `No open questions.` is a complete answer: say so and stop.
</process>

<output>
The verb's rows, as printed. Write no file, and never run `aof work answer` yourself — answering is
the operator's call; hand them the line.
</output>
