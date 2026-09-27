# 07 · The live run — build brief

Advisory, the builder's. The contract is the two task `.feature`s.

## The mechanism

Nothing in `src/` changes. The story's product is evidence, and the seam it hangs off is the one
130/06 used: an operator-gated `@manual` story that a loop lane cannot close by itself.

The builder does task 00 and stops. It installs from the main checkout (no `--skip-ui`, because
05 changed `ui/`), reads the version at the source, and lays down a fixture on the standing
test-bed. Then it writes task 01's procedure into STATE.md with a paste slot per line and ends on
`NEEDS_INPUT`. The operator does task 01: store the webhook (`aof messaging init discord`), restart the desktop app, start
`aof work loop 03` in the test-bed, and answer twice.

**The fixture is what makes a session ask.** A session asks only at a genuine judgment call, and
131 does not change that threshold. So two of the three stories name one choice in their task
(a separator, a label's case) as the operator's and recorded nowhere. Keep the reservation plain
and early in the task, where the build session reads it before writing code. The stories arrive
refined (a task each) so REFINE skips them and all three build in lanes. An ask at refine would
run in the primary and hold the whole loop (ADR-004 §3), which leaves leg 2 nothing to show.
Keep the three `files:` sets disjoint or the wave holds one back. The third story reserves
nothing and gives leg 2 its "the other lane keeps going" evidence.

**The one config block** on the test-bed is `work.notify.channels.discord.type = "discord"`, as
`aof messaging enable discord` writes it. The URL lives in the machine-wide store (131/08). Never
read the store file or the env override's value.

## The verification step

End to end, the story is proven when STATE.md holds, for each leg of task 01:
- the ask row and its Discord twin, less than 10 s apart as measured from the message id
- a `03/02` drive line inside the wait
- two answers, each seen in its own ask file (`via` `cli`, then `board`)
- each answer in the SAME session's transcript as a new user turn
- `03 — loop done.` with `exit code=0`
- the merged records' `asks` entries with the answers verbatim

Every one is pasted from its source.

## What to watch

- Read an ask file between the answer and the end of the re-drive, because the owner clears it
  after. The board leg's `via: "board"` exists only there.
- A lane's run record lives in its dispatch worktree until the merge home. Read `<recA>`/`<recB>`
  there during the legs, and in the test-bed root after leg 5.
- Apply the scrub (`umami`) to every paste. The private-terms guard refuses the real spelling.

## Out of scope

- Answering from Discord, a mesh worker's ask (ratified as not surfaced), and a park at the bound.
  A park was already seen live once (STORY Notes), and forcing one here would need a shortened
  bound on a real loop.
- Any fix. A failure is a finding routed to 01–05 by task 01's table, never patched in this story.
