# 174 · A built graph is shared through the project's own remote — build plan

## Mechanism

One new spawn-free module, `graph-share.mjs`, owns the ref transport (ADR-002). It takes the
injected git (`(args, { cwd, env, timeoutMs }) → { status, stdout, stderr }`) and exposes four
operations: `probe` (ls-remote for HEAD's ref and the default branch's tip), `fetchBundle`,
`publishBundle` and `prune`. Every remote call passes `GIT_TERMINAL_PROMPT=0`. Nothing else
names `refs/aof/graph/`.

`graph:build` gains one branch around its existing `inputsCurrent` check, only when the build is
code-only, whole-root and `outRoot === projectRoot`, and `graph.share` is `"git-refs"`. Current
inputs → return as today, with no network. Otherwise fetch HEAD's bundle and lay it out; if
`inputsCurrent` now holds, return `unchanged` with `share.fetched`. Otherwise run graphify as
today, then publish if eligible (ADR-003), and prune after a successful publish. Each outcome lands
in one `share` section on the BuildResult, with soft failures as warnings. With sharing off, the
section is absent, so the result is byte-identical to today's (E12).

Follow 166's shape and reuse, never copy. Lift export's "stamp + pack" into `graph-bundle.mjs` so
export and publish build one bundle the same way. Lift import's staged swap into a function that
`graph:import` and `graph:fetch` both call, so fetch inherits import's refusals and its
byte-identical rollback. The three new verbs are `create…Command` factories with core bindings,
registered exactly where 166 registered export/import.

## Verification step

In `test/graph/graph-share.test.mjs`, a bare repo in a temp dir is the remote, two clones of it are
the nodes, and graphify is the stubbed driver that counts its runs. The proof that the mechanism is
wired: clone A builds (1 run) and publishes; clone B builds the same commit and graphify runs 0
times, and B's `graph.json` is byte-identical to A's. If B runs graphify once, the fetch happened
but the layout or the inputs confirmation is wrong. Check `share.fetched` before suspecting the
transport.

Then the `@manual` scenario against this repo's real GitHub remote, timings recorded, the test ref
deleted after.

## Out of scope

- Walking back to an earlier commit's graph — an exact hit rarely exists (2/24, spike 173), and
  any input change forces a full graphify run.
- Sharing the memory work graph or index — ADR-002; it needs its own ADR and an ADR-016 amendment.
- Mirror and fork behaviour, and when GitHub actually garbage-collects — unmeasured, not blocking.
- Making the retention count a setting — a constant beside `BUNDLE_VERSION` until someone asks.

## Known traps

- The injected git returns stdout as a UTF-8 string, which corrupts a gzip bundle. Write the blob
  out with `git unpack-file <blob>` (it prints the temp file's name, created in the cwd) and read
  that file. Never read `cat-file blob` output.
- `fetch <remote> <ref>` with no destination still writes `FETCH_HEAD`. Take the blob sha from
  `ls-remote`, not from `FETCH_HEAD`, which a concurrent fetch in the same repo can overwrite.
- `hash-object -w` needs a file path: write the packed bundle to a temp file inside the repo's git
  dir first. Push as `<blob sha>:<ref>`, no local ref needed.
- A push without `GIT_TERMINAL_PROMPT=0` can hang a daemon on a credential prompt (the Mac SSH and
  no-login-session class of failure). FF-17402 guards it.
- "On the default branch" needs the remote tip *present locally* for `merge-base --is-ancestor`.
  When it is absent, skip with a reason; never fetch the branch to decide.
- Prune keeps first-parent commits only. A published graph for a commit merged in as a non-first
  parent is pruned on the next publish. That is fine under squash merges; don't "fix" it by walking
  all parents.
