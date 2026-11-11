# 166 · A built graph travels to another machine — build plan

## Mechanism

Two new verbs in the existing `aof graph` family, `graph:export` and `graph:import`, built the
way `graph:build` is: a `create…Command({ … })` factory in `packages/knowledge/src/commands/`,
with every effect injected by a core binding. `acd-graph-no-face-spawn` forbids any spawn or
`child_process` import in a knowledge command module, so the git reads (HEAD, root commit,
`rev-list --count <src>..HEAD`, `merge-base --is-ancestor`) and the graphify version
(`resolveGraphifyBinary().version`, via the driver) arrive as injected functions. Project
identity is read from config (`mesh.workspaceId`), falling back to the root commit (Q6).

The bundle logic lives in one spawn-free module, `graph-bundle.mjs`: pack, unpack, stamp and
re-key. **Format (Q5):** one gzip stream written with `node:zlib`, holding a small JSON header
line (`{format:"aof-graph-bundle", version:1, stamp, files:[{path,size,sha256}]}`) followed by
each file's bytes in header order. There are no new dependencies (yarn.lock has `tar` only
transitively). The per-file sha256 in the header is what makes truncation and corruption
detectable (E8). Export reads only `graphify-out/` and never source files. It leaves out
`cache/stat-index.json`, `.graphify_root` and `.gitignore`: the first two are machine-local, and
the receiver writes its own `.gitignore`.

**Import (Q7)** verifies the whole bundle into a sibling staging folder
(`graphify-out.import-<pid>`). It then writes `.gitignore` through the existing
`aof-gitignore.mjs` helper and `.graphify_root` as the receiving root, re-keys the cache, sets
`graph.json`'s mtime to `stamp.builtAt` (E14: `builtAt` IS that mtime, via
`graphArtifactBuiltAt`), and only then swaps it in. With `--force`, the old `graphify-out/` is
renamed aside first and removed only after the swap succeeds. Any failure removes the staging
folder and leaves the old graph byte-identical.

**Re-key (Q8, E15).** graphify 0.8.44 `cache.file_hash` is
`sha256(content + "\0" + relposix.lower())`, where `content` is the raw bytes, or for `.md` only
the body below the frontmatter (`_body_content`, delimited by a whole-line `---`). Each AST cache
entry names its `source_file` (relative, #777), so import reads that path, hashes the receiving
clone's own bytes, and renames the entry to that key. When the old key already matches, the
entry is `kept`. When the clone's bytes differ from the source's beyond line endings, compare
CRLF-normalised hashes: an entry is moved only if the two contents are equal after normalisation,
otherwise it is `dropped` and graphify re-extracts that one file. Do the same for
`cache/semantic/` when present. Keep the formula next to `PINNED_GRAPHIFY_VERSION` and name the
version it was read from. When the bundle's graphify version differs from the local one, warn
(Q3) and carry the cache unchanged; graphify will sweep it on its own.

## Verification step

Run both `@manual` scenarios for real. Build on this Windows clone, export, import into the WSL
clone at the same commit (deploy the tree with `install-local.mjs --wsl --skip-ui`), and run
`aof graph build . --json` there. A pass is `unchanged: true` with no new file under
`graphify-out/cache/ast/`, plus identical `graph impact` dependents on both sides. A fail looks
like a build that runs for minutes and grows `cache/ast/` by roughly the file count. That means
the re-key computed the wrong key: diff aof's key for one file against graphify's own
`file_hash` on the WSL side.

## Out of scope

- The memory store's graph (`.aof/memory-graph/graphify-out/`) is rebuilt cheaply from the `.md` stream.
- Mesh-driven sync of graphs between nodes: the story's Notes exclude it.
- Merging two graphs: an import replaces whole (Q2).

## Known traps

- `.graphify_root` written by aof's own builds is absolute (aof passes `update <absRoot>`), so
  every exported graph carries one. That is why export leaves it out rather than trusting it.
- The tests must build the CRLF fixture by writing the bytes, never by relying on
  `core.autocrlf`: the WSL/Mac test lane checks out LF.
- `AOF_GLOBAL_HOME` isolation applies (hook-enforced). Run the new suite with
  `node scripts/test.mjs --only`, never the full suite on this machine.
