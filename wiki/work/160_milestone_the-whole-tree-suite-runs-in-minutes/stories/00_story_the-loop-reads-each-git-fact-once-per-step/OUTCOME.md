
# 160/00 · The loop reads each git fact once per step — Outcome

## Delivered

### A loop step asks git each ref or topology question once
`memoGitReads` in `packages/execution/src/worktrees.mjs` answers a repeated `rev-parse`, `symbolic-ref`, `show-ref`, `merge-base`, `rev-list` or `worktree list` call from its first status-0 answer within one step. It forwards content and working-tree reads every time, clears itself on any other verb, and never keeps a failed read.

### A step is one in-process run of git work
The wave gives a fresh memo to the ask-and-dispatch tick (and the dispatch calls it makes), to a lane's prelude, to a lane's commit, to a merge home, to a cleanup, and to the epoch re-mint. No memo outlives the step that opened it.

### The loop's commit names its own tip
`recordCommitTip` reads the sha from the commit's own summary line, so committing through the loop's port needs no second `rev-parse HEAD`. A lane already at its base is not advanced.

### One lane cycle is held under a pinned call ceiling
FF-16001 pins one ready story's lane cycle at 34 git calls through the port (37 unmemoised). The measured cases make 37% fewer git spawns (471 → 295 over three wave cases).

## Assumptions

- **Every write the loop makes goes through its port within the step** — the lane's child session and the cleanup verb write the tree through no port, which is why a step ends where they begin.
