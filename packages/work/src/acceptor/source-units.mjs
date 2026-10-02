import path from "node:path";
import { lstat, readdir, readFile, realpath } from "node:fs/promises";
import picomatch from "picomatch";

const EXCLUDED_DIRECTORIES = new Set(["node_modules", "dist", "build", "coverage", "target"]);
const excluded = name => name.startsWith(".") || EXCLUDED_DIRECTORIES.has(name);
const within = (root, target) => {
  const relative = path.relative(root, target);
  return relative === "" || (relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
};

async function statIfPresent(file) {
  try { return await lstat(file); }
  catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return null;
    throw error;
  }
}

async function manifestAt(directory) {
  const file = path.join(directory, "package.json");
  if (!(await statIfPresent(file))?.isFile()) return null;
  const manifest = JSON.parse(await readFile(file, "utf8"));
  if (manifest == null || typeof manifest !== "object" || Array.isArray(manifest)) {
    throw new TypeError(`Invalid package manifest: ${file}`);
  }
  return manifest;
}

// Only declared, repository-local workspace packages add source roots. Dependency installs,
// generated directories and symbolic links never become evidence about application behavior.
export async function readRuntimeSourceUnits(projectRoot) {
  const root = await realpath(projectRoot);
  const roots = new Set([root]);
  const manifest = await manifestAt(root);
  const declaration = manifest?.workspaces;
  if (declaration != null) {
    const patterns = Array.isArray(declaration) ? declaration : declaration.packages;
    if (!Array.isArray(patterns) || patterns.some(value => typeof value !== "string" || value.length === 0)) {
      throw new TypeError("Workspace declaration must contain an array of path patterns.");
    }
    const positive = [], negative = [];
    for (const value of patterns) {
      const negated = value.startsWith("!") && !value.startsWith("!(");
      const pattern = (negated ? value.slice(1) : value).replace(/^\.\//u, "").replace(/\/$/u, "");
      if (!pattern || path.posix.isAbsolute(pattern) || path.win32.isAbsolute(pattern) || pattern.split("/").includes("..")) {
        throw new TypeError(`Workspace pattern must stay within the project: ${value}`);
      }
      (negated ? negative : positive).push(pattern);
    }
    if (positive.length > 0) {
      const matches = picomatch(positive, { dot: true, windows: false, ignore: negative });
      const visited = new Set();
      async function findWorkspaces(directory) {
        const info = await statIfPresent(directory);
        if (!info?.isDirectory()) return;
        const canonical = await realpath(directory);
        if (!within(root, canonical)) throw new Error(`Workspace path escapes the project: ${directory}`);
        if (visited.has(canonical)) return;
        visited.add(canonical);
        const relative = path.relative(root, directory).replaceAll("\\", "/") || ".";
        if (matches(relative) && await manifestAt(directory) != null) roots.add(canonical);
        for (const entry of await readdir(directory, { withFileTypes: true })) {
          if (entry.isDirectory() && !excluded(entry.name)) await findWorkspaces(path.join(directory, entry.name));
        }
      }
      for (const pattern of positive) {
        const base = picomatch.scan(pattern).base || ".";
        const directory = path.resolve(root, base);
        if (!within(root, directory)) throw new Error(`Workspace path escapes the project: ${pattern}`);
        const segments = path.relative(root, directory).split(path.sep).filter(Boolean);
        if (segments.some(excluded)) continue;
        let cursor = root, linked = false;
        for (const segment of segments) {
          cursor = path.join(cursor, segment);
          if ((await statIfPresent(cursor))?.isSymbolicLink()) { linked = true; break; }
        }
        if (linked) continue;
        await findWorkspaces(directory);
      }
    }
  }

  const units = new Map();
  async function readSource(directory) {
    if (!(await statIfPresent(directory))?.isDirectory()) return;
    const canonical = await realpath(directory);
    if (!within(root, canonical)) throw new Error(`Source path escapes the project: ${directory}`);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory() && !excluded(entry.name)) await readSource(absolute);
      else if (entry.isFile() && entry.name.endsWith(".mjs")) {
        const rel = path.relative(root, absolute).replaceAll("\\", "/");
        units.set(rel, { rel, code: await readFile(absolute, "utf8") });
      }
    }
  }
  for (const directory of [...roots].sort()) await readSource(path.join(directory, "src"));
  return [...units.values()].sort((a, b) => a.rel < b.rel ? -1 : a.rel > b.rel ? 1 : 0);
}
