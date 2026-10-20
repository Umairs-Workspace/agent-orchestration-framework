// The bought planner, packaged for Cowork (165/ADR-003). Cowork's marketplace dialog
// cannot pin a ref, so aof packages pm-skills itself — and only from a tree whose HEAD
// is the exact 40-hex commit the lock records (FF-16504). Live, that tree is a shallow
// HTTPS clone of the release TAG into a temporary directory, which is removed whatever
// the outcome. Each recommended plugin becomes one standalone file map: its own folder
// exactly as it is at the commit, plus the repository's root LICENSE (MIT, root only —
// RESEARCH R3). pm-ai-shipping is never packaged. This module returns file maps only;
// zipping and writing under the aof home's `cowork/` is planning init's (165/03).
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { MARKETPLACE_GIT_URL, MARKETPLACE_REF, isFullSha, recommendedPlugins } from "../planning-init.mjs";

const NO_PRINT = () => {};
const PLUGIN_MANIFEST = ".claude-plugin/plugin.json";

// The live clone's argv: HTTPS (never the SSH shorthand, m02 ADR-007), shallow, at the
// clonable release TAG (never a bare sha, m02 ADR-008). The two `-c` settings keep the
// checkout at the commit's own bytes on every host. Measured 2026-10-19 on Windows:
// pm-skills declares `* text=auto`, so with the native `core.eol` all 128 plugin files
// arrived CRLF-converted even with `core.autocrlf=false`; with both settings, all 142
// checked-out files hash equal to their blobs.
export function plannerCloneArgv(dir) {
  return ["-c", "core.autocrlf=false", "-c", "core.eol=lf", "clone", "--depth", "1", "--branch", MARKETPLACE_REF, MARKETPLACE_GIT_URL, dir];
}

// The live clone seam: clone into `dir`, then read its HEAD. Returns { ok, head } or
// { ok: false, message }. Spawned by argv with NO shell: unlike resolveSha's argv, this
// one carries a temp path, which a Windows shell would split at a space in the profile
// directory. `git` is an executable, so it resolves on PATH without one.
export function cloneAtTag(dir) {
  const spawnOptions = { encoding: "utf8", shell: false };
  const clone = spawnSync("git", plannerCloneArgv(dir), spawnOptions);
  if (clone.status !== 0) {
    return { ok: false, message: (clone.stderr || clone.error?.message || "").trim() };
  }
  const head = spawnSync("git", ["-C", dir, "rev-parse", "HEAD"], spawnOptions);
  if (head.status !== 0) return { ok: false, message: (head.stderr || "").trim() };
  return { ok: true, head: head.stdout.trim() };
}

function refused(reason, message) {
  return { ok: false, reason, message, packages: [] };
}

// Every file under `root`, as `relative /-path → bytes`, skipping `.git`.
async function collectFiles(root, prefix = "") {
  const files = {};
  const entries = await readdir(path.join(root, prefix), { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) Object.assign(files, await collectFiles(root, relative));
    else if (entry.isFile()) files[relative] = await readFile(path.join(root, relative));
  }
  return files;
}

async function packagesFromTree(dir, withOptional) {
  const licensePath = path.join(dir, "LICENSE");
  if (!existsSync(licensePath)) return refused("license-missing", "The planner tree has no root LICENSE to carry into each package.");
  const license = await readFile(licensePath);
  const packages = [];
  for (const name of recommendedPlugins({ withOptional })) {
    const pluginDir = path.join(dir, name);
    if (!existsSync(path.join(pluginDir, PLUGIN_MANIFEST))) {
      return refused("plugin-missing", `The planner tree has no ${name}/${PLUGIN_MANIFEST}; nothing was packaged.`);
    }
    packages.push({ name, files: { ...(await collectFiles(pluginDir)), LICENSE: license } });
  }
  return { ok: true, packages };
}

// `packagePlanner({ sha, withOptional, source, clone, log })` →
//   { ok: true, packages: [{ name, files }] } | { ok: false, reason, message, packages: [] }
// `source: { dir, head }` injects a caller-owned tree, which is never removed. Otherwise a
// temporary directory is cloned through `clone` (default: the live `cloneAtTag`) and
// always removed. Reasons: sha-not-pinned, clone-failed, head-mismatch, plugin-missing,
// license-missing.
export async function packagePlanner({ sha, withOptional = false, source, clone = cloneAtTag, log = NO_PRINT } = {}) {
  if (!isFullSha(sha)) {
    return refused("sha-not-pinned", `Refusing to package the planner: "${sha}" is not a 40-character commit sha.`);
  }

  if (source) return checkedPackages(source.dir, source.head, sha, withOptional);

  const dir = await mkdtemp(path.join(os.tmpdir(), "aof-pm-skills-"));
  try {
    log(`network-boundary: git ${plannerCloneArgv(dir).join(" ")}`);
    log("warning: this command accesses the network and downloads plugin code (it does not run it).");
    const cloned = await clone(dir);
    if (!cloned.ok) {
      return refused("clone-failed", `The pm-skills clone at ${MARKETPLACE_REF} failed${cloned.message ? `: ${cloned.message}` : "."} Nothing was packaged.`);
    }
    return await checkedPackages(dir, cloned.head, sha, withOptional);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function checkedPackages(dir, head, sha, withOptional) {
  if (head !== sha) {
    return refused(
      "head-mismatch",
      `Refusing to package the planner: ${MARKETPLACE_REF} resolved to ${sha}, but the cloned tree's HEAD is ${head}. Nothing was packaged.`
    );
  }
  return packagesFromTree(dir, withOptional);
}
