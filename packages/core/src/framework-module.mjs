// The ONE derivation of where a framework record's `module:src/...` pointer lives in the current source.
// Shared by the loop loader and the groundedness command, so a pointer cannot resolve for one and not
// the other.
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

// Installed framework records retain module:src/... identifiers. Follow their
// actual composition binding to its declared public factory without executing it.
// This is derived from current source, rather than a table of retired modules.
export async function resolveFrameworkModule(operand, root) {
  if (!/^src\/(?:[\w-]+\/)*[\w-]+\.mjs$/u.test(operand)) return null;
  const direct = path.resolve(root, operand);
  if (existsSync(direct)) return direct;
  const binding = path.join(root, "src/application/bindings", operand.slice(4));
  let source;
  try { source = await readFile(binding, "utf8"); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
  const imports = [...source.matchAll(/import\s*\{\s*(create\w+)\s*\}\s*from\s*["'](@aof\/[\w-]+\/[\w/-]+)["']/gu)];
  const factories = imports.filter(([, factory]) => new RegExp(`\\b${factory}\\s*\\(`, "u").test(source));
  if (factories.length !== 1) return null;
  return createRequire(path.join(root, "package.json")).resolve(factories[0][2]);
}
