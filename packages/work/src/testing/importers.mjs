import path from "node:path";
import { readdir, readFile, stat } from "node:fs/promises";
import { isBuiltin } from "node:module";
import { DEFAULT_SUITE_SUFFIXES, isSuiteFile } from "./suites.mjs";

// 210/ADR-003: fresh text reads, never evaluation or a graph. The caller supplies the
// census's workspaceExportMap; config compilation and command policy stay outside this leaf.
const MODULE = /\.[cm]?[jt]sx?$/u;
const EXTENSIONS = ["", ".mjs", ".js", ".cjs", ".ts", ".tsx", ".jsx", ".json", "/index.mjs", "/index.js", "/index.ts"];
const slash = file => file.replaceAll("\\", "/");
const relative = file => path.posix.normalize(slash(file)).replace(/^\.\//u, "");
const inside = file => file !== ".." && !file.startsWith("../") && !path.posix.isAbsolute(file) && !path.win32.isAbsolute(file);
const escape = text => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// Skip comments and standalone strings before looking for import declarations. This
// deliberately remains a regex scan: computed specifiers and generated paths are not inferred.
const TOKENS = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|\b(?:import\s*(?:[\w$*{}\s,]+?\s*from\s*)?|export\s*[\w$*{}\s,]*?\s*from\s*|import\s*\(\s*|require\s*\(\s*)(["'])([^"'\n]+)\1|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`/gu;

async function modulesUnder(projectRoot, roots, suffixes, exclude) {
  const files = new Set();
  const visited = new Set();
  async function walk(dir) {
    if (visited.has(dir) || !inside(dir) || dir.split("/").some(part => ["node_modules", ".git", "graphify-out"].includes(part))) return;
    visited.add(dir);
    let entries;
    try { entries = await readdir(path.resolve(projectRoot, dir), { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") return; throw error; }
    for (const entry of entries) {
      const file = relative(path.posix.join(dir, entry.name));
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && (MODULE.test(file) || isSuiteFile(file, roots, suffixes, exclude))) files.add(file);
    }
  }
  for (const root of roots) await walk(root);
  return [...files].sort();
}

export async function scanImporters({ projectRoot, changed = [], roots = [], suffixes = DEFAULT_SUITE_SUFFIXES, exclude = [], exportMap = new Map() } = {}) {
  const testRoots = [...new Set(roots.map(relative))];
  const changes = [...new Set(changed.map(relative))].sort();
  const files = await modulesUnder(projectRoot, testRoots, suffixes, exclude);
  const suites = new Set(files.filter(file => isSuiteFile(file, testRoots, suffixes, exclude)));
  const helpers = new Set(files.filter(file => !suites.has(file) && MODULE.test(file)));
  const texts = new Map();
  const importedBy = new Map();
  const unresolved = [];
  // All memoization is local to this call. Added/edited/deleted files are seen next time.
  const present = new Map();
  async function exists(file) {
    if (!inside(file)) return false;
    if (!present.has(file)) present.set(file, stat(path.resolve(projectRoot, file)).then(info => info.isFile(), error => {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") return false;
      throw error;
    }));
    return present.get(file);
  }
  for (const file of files) {
    const text = await readFile(path.resolve(projectRoot, file), "utf8");
    texts.set(file, text);
    const specifiers = new Set([...text.matchAll(TOKENS)].map(match => match[2]).filter(Boolean));
    for (const specifier of specifiers) {
      if (isBuiltin(specifier)) continue;
      const mapped = exportMap.get(specifier);
      const base = specifier.startsWith(".") ? relative(path.posix.join(path.posix.dirname(file), specifier)) : null;
      const candidates = base == null ? (mapped == null ? [] : [relative(mapped)]) : EXTENSIONS.map(ext => base + ext);
      let target = null;
      for (const candidate of candidates) {
        if (inside(candidate) && (changes.includes(candidate) || await exists(candidate))) { target = candidate; break; }
      }
      if (target == null) { unresolved.push(Object.freeze({ file, specifier })); continue; }
      if (!importedBy.has(target)) importedBy.set(target, new Set());
      importedBy.get(target).add(file);
    }
  }

  const reached = new Map();
  const unreached = [];
  for (const changedFile of changes) {
    const reasons = new Map();
    const queue = [];
    const visited = new Set();
    for (const importer of importedBy.get(changedFile) ?? []) {
      if (suites.has(importer)) reasons.set(importer, "imports");
      else if (helpers.has(importer)) queue.push(importer);
    }
    for (let at = 0; at < queue.length; at += 1) {
      const helper = queue[at];
      if (visited.has(helper)) continue;
      visited.add(helper);
      for (const importer of importedBy.get(helper) ?? []) {
        if (suites.has(importer) && !reasons.has(importer)) reasons.set(importer, `via ${helper}`);
        else if (helpers.has(importer) && !visited.has(importer)) queue.push(importer);
      }
    }
    const names = new RegExp(`(?<![\\p{L}\\p{N}_$./\\\\-])${escape(changedFile)}(?![\\p{L}\\p{N}_$./\\\\-])`, "u");
    for (const suite of suites) if (!reasons.has(suite) && names.test(texts.get(suite))) reasons.set(suite, "names");
    if (reasons.size === 0) unreached.push(changedFile);
    for (const [suite, how] of reasons) {
      if (!reached.has(suite)) reached.set(suite, []);
      reached.get(suite).push(Object.freeze({ file: changedFile, how }));
    }
  }
  const selected = [...reached.keys()].sort();
  return Object.freeze({
    selected: Object.freeze(selected),
    suites: Object.freeze(selected.map(file => Object.freeze({ file, reachedBy: Object.freeze(reached.get(file)) }))),
    unreached: Object.freeze(unreached),
    unresolved: Object.freeze(unresolved),
    unresolvedCount: unresolved.length,
  });
}
