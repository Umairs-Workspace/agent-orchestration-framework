import path from "node:path";
import { access } from "node:fs/promises";
import { defaultGlobalWorkspaceDir } from "./paths.mjs";

export function workspacePaths(projectDir = process.cwd()) {
  const root = path.resolve(projectDir);
  const workspaceDir = path.join(root, ".aof");
  return workspacePathsForRoot(workspaceDir, { projectDir: root });
}

export function globalWorkspacePaths(options = {}) {
  return workspacePathsForRoot(defaultGlobalWorkspaceDir(options.env, options.platform, options.homedir), { projectDir: null });
}

export function globalMeshPaths(options = {}) {
  const { workspaceDir } = globalWorkspacePaths(options);
  const meshRoot = path.join(workspaceDir, "mesh");
  const workRoot = path.join(meshRoot, "work");
  return {
    meshRoot,
    workRoot,
    nodesRoot: path.join(meshRoot, "nodes"),
    workspacesRoot: path.join(meshRoot, "workspaces"),
    databasePath: path.join(workRoot, "projection.sqlite"),
    // The MACHINE-WIDE per-install identity (nodeId + salt), initialized once and
    // shared by every workspace on this machine (34/story 00). Lives in the global AOF
    // home (honoring AOF_GLOBAL_HOME), so a git clone never carries it — strictly more
    // clone-safe than the per-workspace sidecar 33/ADR-004 used.
    identityPath: path.join(meshRoot, "identity.json"),
  };
}

export function workspacePathsForRoot(workspaceDir, options = {}) {
  const resolvedWorkspaceDir = path.resolve(workspaceDir);
  return {
    projectDir: options.projectDir ?? path.dirname(resolvedWorkspaceDir),
    workspaceDir: resolvedWorkspaceDir,
    configPath: path.join(resolvedWorkspaceDir, "aof.config.json"),
    lockPath: path.join(resolvedWorkspaceDir, "aof.lock.json"),
    assetsDir: path.join(resolvedWorkspaceDir, "assets")
  };
}

export function legacyConfigPath(projectDir = process.cwd()) {
  return path.join(path.resolve(projectDir), "aof.config.json");
}

// chore 103 — CONFIG DISCOVERY WALKS UP, so every reader of a workspace path is
// cwd-INDEPENDENT. This function is the shared resolution site: `loadWorkspace`
// derives `projectRoot` from the directory the config was found in, and resolves
// `work.dir` against THAT — so a discovery that answered only for the literal
// `projectDir` made the whole workspace cwd-derived. From `src/` this invented
// `src/.aof/aof.config.json`, took `src/` as the project root, and pointed
// `work.dir` at `src/wiki/work` — a directory that does not exist. `work:doctor`
// then scanned an EMPTY stream and printed `healthy` (F-78-K, measured at 78's
// gate: 8 findings and `Loop-Ready: 70% (7/10)` from the root against `healthy`
// and `50% (2/4)` from a subdirectory, same ref, same tree). Fixing it HERE fixes
// every reader of the path with it, rather than doctor alone.
//
// The walk is the git-like convention — nearest wins — and `.aof` still beats a
// legacy root config AT EACH LEVEL, so a nearer legacy config correctly outranks a
// farther `.aof` one.
//
// TWO BOUNDARIES BOUND THE WALK, and both were found by measurement rather than by
// reading — each is spelled out at its own line below:
//   · aof's own config HOME (`~/.aof`, and AOF_GLOBAL_HOME when it differs) is not a
//     project root, and it is an ANCESTOR of ordinary working directories — on Windows
//     `os.tmpdir()` is `~/AppData/Local/Temp` — so an unbounded walk resolves every
//     temp-dir project to the global config;
//   · an ancestor `.aof` STATE dir is a project boundary, because a mesh worktree is
//     materialised inside one and must resolve itself rather than its origin.
// Both are skipped, never returned. Discovery FROM either directory, asked for
// directly, is unchanged: the fallback below answers with that directory's own config
// path, exactly as it did before the walk existed.
export async function findProjectConfig(projectDir = process.cwd(), explicitConfigPath) {
  if (explicitConfigPath) {
    return path.resolve(projectDir, explicitConfigPath);
  }

  const start = path.resolve(projectDir);
  // BOTH spellings of aof's own home, because they can differ: the CONFIGURED one
  // (AOF_GLOBAL_HOME, which the test suite always sets) and the CONVENTIONAL one
  // (`~/.aof`). Skipping only the configured one lets a run with the override set walk
  // straight past it and adopt the operator's REAL `~/.aof` instead — measured, by this
  // chore's own regression test: a fixture under `os.tmpdir()` resolved its work dir to
  // `~/wiki/work`. That is the isolation breach AOF_GLOBAL_HOME exists to prevent,
  // arriving through the back door.
  const aofHomes = new Set([globalWorkspacePaths().workspaceDir, defaultGlobalWorkspaceDir({})]);

  let dir = start;
  for (;;) {
    const paths = workspacePaths(dir);
    // AN ANCESTOR `.aof` IS A PROJECT BOUNDARY, not a step on the way to one. Anything
    // living under a project's `.aof/` is aof's own runtime state rather than that
    // project's source — and a mesh worktree is materialised exactly there, at
    // `<origin>/.aof/mesh/worktrees/<assignmentId>` (m35/ADR-004's one seam). Walking
    // past it adopts the ORIGIN's config for a checkout that has its own work dir, which
    // is how a worker's doctor started reading the control's cache as authority over the
    // tree it is itself authoring (caught by cache-read/04). The `.aof` dir also holds
    // `aof.config.json` — the PARENT's canonical config, which matches the LEGACY
    // `<root>/aof.config.json` shape by coincidence of naming — so examining it at all
    // adopts the wrong root twice over. `dir !== start` keeps a call made directly
    // against a `.aof` directory answering exactly as it did before.
    const aofStateDir = dir !== start && path.basename(dir) === ".aof";
    if (!aofStateDir && !aofHomes.has(paths.workspaceDir)) {
      if (await exists(paths.configPath)) return paths.configPath;

      const legacyPath = legacyConfigPath(dir);
      if (await exists(legacyPath)) return legacyPath;
    }
    if (aofStateDir) break;

    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // No config anywhere above: the honest answer stays the STARTING directory's own
  // config path — an unconfigured project is a legitimate state, and loadWorkspace's
  // `{ config: {} }` degrade (chore 94) is unchanged by this walk.
  return workspacePaths(start).configPath;
}

export async function isLegacyConfigOnlyProject(projectDir = process.cwd()) {
  const paths = workspacePaths(projectDir);
  return (await exists(legacyConfigPath(projectDir))) && !(await exists(paths.configPath));
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
