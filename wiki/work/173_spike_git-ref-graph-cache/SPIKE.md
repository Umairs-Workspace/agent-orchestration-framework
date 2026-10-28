---
type: spike
number: 173
slug: git-ref-graph-cache
title: "Can a built graph travel through the project's own git remote, so no one exports or imports by hand?"
status: done
owner: researcher
created: 2026-10-27
updated: 2026-10-27
depends: []
timebox: 1d
schema: 1
aofVersion: 0.1.0
---
# 173 · Can a built graph travel through the project's own git remote, so no one exports or imports by hand?

## Question

166 made a built codebase graph portable: `aof graph export <path>` writes one bundle, and `aof graph
import <path>` lays it out in another clone of the same project (299 s full build vs ~4 s after an
import). The carry is still manual. Someone has to export, move the file, and import, for every
clone, worktree and machine (control node, WSL worker, Mac worker).

The graph is derived and keyable. `graphify-out/aof-inputs.json` stamps exactly what a code-only
build read, so `hash(aof-inputs) + graphify version` names one graph. That makes it a cache entry,
not a document. Git can hold such an entry with no history: a ref outside the branch namespace
(`refs/aof/graph/<key>`) that points straight at a blob is pushed and fetched by name, and is never
pulled by a plain clone. A local proof (bare remote, 2 MB blob) round-tripped byte-identical, and the
fresh clone did not receive the ref.

**Will the project's real remote (GitHub) carry graph bundles as content-addressed custom refs, at
the size and pruning cost a working cache needs, so that `aof graph build` can fetch on a miss and
publish after a build, with no new service and without breaking the egress and never-on-mesh
rulings?**

Sub-questions the finding must answer:

1. **Host acceptance.** Does GitHub accept a push of `refs/aof/graph/<key>` pointing directly at a
   blob? If not, does a parentless single-commit wrapper (one-file tree, no parent) go through? Is
   either visible in the UI, API or `ls-remote`, and does either count against anything?
2. **Size.** What is the compressed bundle size for this repo's graph (`graph.json` is ~21 MB
   raw)? Where do GitHub's 50 MB warning and 100 MB rejection fall for a blob pushed this way, and
   is the push-size limit a practical concern?
3. **Fetch cost.** Wall-clock for `git fetch origin refs/aof/graph/<key>` + extract + import, on a
   miss and on a hit, compared with the 299 s build and the 3 s rebuild. Can the client detect a
   miss cheaply (`git ls-remote origin refs/aof/graph/<key>`) before fetching anything?
4. **Pruning.** Does deleting the ref free the blob on the host, or does it live on unreachable?
   Does it ever reach a full clone, a `--mirror` clone, or a fork? What retention policy keeps the
   ref namespace bounded (keep the N newest keys, or only keys reachable from `main`'s recent
   inputs)?
5. **Key design.** Inputs-hash keying vs commit keying: how often do consecutive commits on this
   repo share a key (doc-only commits)? On an exact miss, does fetching the nearest earlier key and
   running the incremental path beat a full build, given that `graph import` already reports how far
   behind HEAD a graph is?
6. **Line endings and platforms.** 166 re-keys the cache to the clone's line endings on import. Is
   the inputs key stable across a Windows (CRLF) clone and a Linux/macOS (LF) clone of one commit,
   or does the key need normalising first?
7. **Rulings.** Is publishing a graph to the project's own remote egress under the existing
   rulings? The graph describes code structure, but it goes to the remote that already holds the
   code. Does `acd-memory-index-never-on-mesh` cover the code graph (it names the memory index),
   and does this route stay off the mesh?
8. **Credentials and concurrency.** Does publish reuse the clone's existing push credential with no
   new config? What happens when two nodes race to publish the same key (identical content, so
   last-writer-wins should be harmless)? Verify it.

## Timebox

- Box: `1d`. Stop and record the best-available finding at the boundary, noting any open
  sub-question as uncertain. Extending the timebox requires explicit re-scoping.
- Experiments run against **this repository's own remote** (operator's call, 2026-10-27), confined
  to the `refs/aof/spike/*` namespace: no branch is created or moved, and every spike ref is deleted
  once measured. Credentials are never logged or recorded.

## Investigation

Run 2026-10-27 from the Mac, against `github.com/Umairs-Workspace/agent-orchestration-framework`,
from throwaway repos in the session scratchpad (the working checkout's refs were never touched).
Every `refs/aof/spike/*` ref was deleted afterwards; `ls-remote 'refs/aof/*'` returned nothing.

- **The bundle.** `aof graph export` of this repo's current graph (built 2026-10-20 at `b669097`):
  537 files, **1.3 MB** (the bundle already compresses; `graph.json` alone is ~21 MB raw). Export
  took 1.6 s.
- **A · ref → blob.** `git hash-object -w` + `update-ref refs/aof/spike/blob` + push: accepted,
  `[new reference]`, 3.4 s from an empty repo.
- **B · ref → parentless commit** (one-file tree, no parent): accepted, 2.1 s.
- **C · listing.** `git ls-remote origin 'refs/aof/*'` listed both in 0.45 s.
- **D · fetch.** Into an empty repo: blob ref 1.25 s, commit ref 0.85 s; both byte-identical to the
  export. Miss probe `git ls-remote --exit-code origin refs/aof/spike/nope`: 0.8 s, exit 2.
- **H · plain clones.** The default refspec is `+refs/heads/*:refs/remotes/origin/*`, so clones
  and `git fetch` never download `refs/aof/*`. A `--mirror` clone (`+refs/*:refs/*`) would. Not
  tested: whether a GitHub fork copies custom refs.
- **E · overwrite and races.** Re-pushing the same content: `Everything up-to-date`. Pointing the
  ref at a *different* blob and pushing without `--force`: **refused**; git will not move a remote
  ref that points at a non-commit unless forced. With `--force`: accepted.
- **G · deletion.** After `push --delete`, both objects were **still fetchable by sha**
  (`git fetch origin <sha>` succeeded for the blob and the commit). Deleting a ref removes the name,
  not the content; GitHub garbage-collects on its own schedule.
- **Credentials.** Every push used the existing credential helper with only a remote URL configured;
  no new config.
- **Key design, read from code.** The `aof-inputs.json` digest (`graph-bundle.mjs`
  `inputsDigest`) covers the files *graphify read* (its `manifest.json`), which exist only after a
  build. A client cannot compute it before it has a graph, so it can only confirm a candidate, not
  locate one. `inputsCurrent` already does that confirming.
- **Key design, measured.** Of the last 24 first-parent commits on `main` (squash merges), 2 left
  the graph's inputs unchanged (no add/delete, no read file touched). Any input change forces a full
  graphify run (166 F-01: no incremental path for JS), so reusing the nearest earlier commit's graph
  rarely saves a build.
- **Leak path, read from code.** `listCloneFiles` uses `ls-files --cached --others
  --exclude-standard`, so a build over a dirty tree includes untracked, non-ignored files, and
  `graph.json` names their paths and symbols. Publishing such a graph would push uncommitted work's
  structure to the remote, where it stays fetchable by sha (G).
- **Line endings.** A commit sha is platform-neutral by construction. The inputs digest already
  folds CRLF, and import re-keys the cache to the clone's line endings (166; impact answers
  identical on Windows and WSL).

## Finding

**Yes. GitHub carries graph bundles as custom refs, and nothing else is needed.** A ref outside the
branch namespace pointing at a blob is accepted, listed, fetched by name in about a second, and
never reaches a plain clone. At 1.3 MB per bundle, GitHub's size limits are irrelevant. The design
the follow-on story should build:

1. **Key by commit, under a versioned namespace.** `refs/aof/graph/v<bundleVersion>/<commit-sha>`.
   The inputs digest cannot be computed before a build, so it stays the validator (the existing
   `inputsCurrent` check after import), not the lookup key. Put the graphify version in the
   bundle's stamp rather than in the ref name, so a graphify upgrade is a stale hit that rebuilds,
   not a miss.
2. **Ref → blob, not a commit wrapper.** Both work. The blob is one object, and the non-commit
   push rule turns a conflicting publish into a refusal instead of a silent overwrite. Identical
   content re-publishes as a no-op. Two nodes building one commit and getting different bundles is a
   non-determinism signal worth surfacing, not something to force past.
3. **Publish only a clean build.** Publish only when the tree's graph inputs equal `HEAD` (no
   untracked or modified non-ignored files), otherwise skip with a reason. This closes the leak
   path, and it is also what makes "the graph for this commit" true.
4. **Fetch on a miss in `aof graph build`.** Order: local graph current → done. Else
   `ls-remote --exit-code` for `HEAD` → fetch + import → `inputsCurrent` confirms (no graphify
   run). Else build, then publish. Walking back to an earlier commit's graph is **not** worth
   building for an exact hit (2/24). It is only worth considering as an explicit "stale graph now"
   option, since `graph import` already reports how far behind it is.
5. **Treat a publish as permanent.** A deleted ref's objects stay fetchable by sha. Pruning (keep
   refs for the last N commits on `main`) bounds the ref list and mirror clones, not exposure. The
   egress argument holds only because the graph is code-only (zero LLM egress) and goes to the
   remote that already holds the code it describes.
6. **Rulings.** This route never touches a mesh transport, so `acd-memory-index-never-on-mesh`
   invariant 1 holds. `graphify-out/` stays git-ignored and derived (invariant 2): it is never
   tracked on a branch. Invariant 3 ("never fetches a remote index or a peer's cache") is written
   for **memory ingest**. The story's ADR must scope the remote cache to the **code graph only**,
   with the memory work graph (`.aof/memory-graph/`) and the memory index explicitly excluded, and
   arm a guard that the memory modules never import the ref transport.
7. **Opt-in, per remote.** A node needs read access to fetch and push access to publish. A node
   without push access (or a project that opts out) fetches only. Config is one switch, e.g.
   `graph.share: "git-refs" | "off"`.

Open, not blocking: whether GitHub forks copy `refs/aof/*`; when GitHub actually garbage-collects
an unreferenced bundle.

## Outcome / Next

Unblocks a story, "a built graph is shared through the project's own remote": `aof graph build`
fetches the graph for `HEAD` on a miss and publishes after a clean build, with an `aof graph
publish` / `aof graph fetch` pair for explicit use, a pruning command, and the scoping ADR from
point 6. Export/import stay for remotes you can't push to, and for moving a graph between projects
by hand.
