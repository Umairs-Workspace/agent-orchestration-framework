// FF-20801: tracking is selected once per workspace. Resolve symbols to their
// owners so an alias, namespace or barrel cannot turn a file API into a store API.
import assert from "node:assert/strict";
import ts from "typescript";
import path from "node:path";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../support/source-slice.mjs";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const work = "packages/work/src/";
const queries = new Set(["listItems", "findWork", "listStream"]);
const operations = new Map([
  [work + "discovery.mjs", new Set([...queries, "readWorkDirectory", "readStreamSnapshot", "workTreeStatDigest", "createWorkTreeWatches"])],
  [work + "records.mjs", new Set(["readItemMeta", "readItemSchema", "readItemVersion", "setItemStatus", "rollbackItemStatus", "applyItemFrontmatter"])],
  [work + "archive.mjs", new Set(["archiveItems", "refsMovedByArchive"])],
  [work + "reindex.mjs", new Set(["countShiftedByInsert", "refsTouchedByInsert", "reindexForInsert"])],
  [work + "renumber.mjs", new Set(["planRenumber", "applyRenumber"])],
]);
// These are the implementation, not exemptions for all of @aof/work. A mixed
// command facade is admitted only inside its named file-engine factory below.
const implementations = new Map([
  ...["store/file-store.mjs", "store/file-lifecycle.mjs", "store/file-placement.mjs"].map(file => [work + file, "selected files adapter"]),
  ...["discovery.mjs", "records.mjs", "archive.mjs", "reindex.mjs", "renumber.mjs", "upgrade.mjs", "promote/promotion.mjs"].map(file => [work + file, "legacy file engine retained behind the adapter"]),
]);
const factories = new Map([
  [work + "commands/archive.mjs", "createFileArchiveCommand"],
  [work + "commands/promote.mjs", "createFilePromoteCommand"],
  [work + "commands/prototype.mjs", "createFilePrototypeCommand"],
  [work + "commands/migrate-folder.mjs", "createFileMigrateFolderCommand"],
  [work + "commands/promote-finding-to-chore.mjs", "createFilePromoteFindingCommand"],
  [work + "commands/promote-gap-to-chore.mjs", "createFilePromoteGapCommand"],
  [work + "commands/upgrade.mjs", "createFileUpgradeCommand"],
  [work + "insertion/scaffold.mjs", "createFileWorkInsertion"],
]);
// Assembly passes legacy compatibility APIs without calling them. DI consumers
// still need checking: the supplied name denotes the same owning API here.
const injected = new Map([
  ["packages/execution/src/reconcile.mjs", ["listItems"]],
  ["packages/work-loop/src/stop.mjs", ["listItems"]],
  ["packages/work-loop/src/dispatch.mjs", ["findWork"]],
  ["packages/mesh/src/declarations.mjs", ["listItems"]],
  ["packages/mesh/src/worker-execution.mjs", ["findWork", "listItems", "findWorkRecords"]],
  ["packages/mesh/src/park-resume.mjs", ["listItems"]],
  ["packages/mesh/src/effects.mjs", ["listItems"]],
  ["packages/mesh/src/launcher.mjs", ["listItems"]],
  [work + "effects.mjs", ["listItems", "setItemStatus", "rollbackItemStatus"]],
]);
const manualKeepers = new Map([
  [work + "legacy-milestone-discovery.mjs", "foreign folder fallback explicitly excludes ITEM_RE"],
  [work + "commands/migrate-folder.mjs", "foreign source input, selected store owns the output"],
  [work + "doctor/index.mjs", "orphan inventory deliberately sees folders omitted by tracking"],
  [work + "tune/provenance.mjs", "synchronous citation resolution, no tracking metadata"],
  [work + "commands/ratchet.mjs", "item subtree evidence traversal"],
  ["packages/knowledge/src/import/recovery.mjs", "foreign import source inventory"],
]);
const functionName = node => node.name?.text ?? (ts.isVariableDeclaration(node.parent) ? node.parent.name?.text : null);
function within(node, name) {
  for (let cursor = node; cursor; cursor = cursor.parent) if (ts.isFunctionLike(cursor) && functionName(cursor) === name) return true;
  return false;
}

export function trackingViolations(sources) {
  const modules = new Map();
  for (const [file, text] of sources) {
    const ast = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    modules.set(file, { ast, imports: new Map(), exports: new Map(), stars: [], aliases: new Map() });
  }
  const resolve = (from, specifier) => {
    if (specifier.startsWith('.')) return path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier));
    try { return path.relative(root, createRequire(path.join(root, from)).resolve(specifier)).split(path.sep).join('/'); }
    catch { return null; }
  };
  for (const [file, mod] of modules) {
    const visit = node => {
      if (ts.isImportDeclaration(node) && node.importClause) {
        const owner = resolve(file, node.moduleSpecifier.text), bindings = node.importClause.namedBindings;
        if (bindings && ts.isNamespaceImport(bindings)) mod.imports.set(bindings.name.text, { owner, symbol: '*' });
        else if (bindings) for (const entry of bindings.elements) mod.imports.set(entry.name.text, { owner, symbol: entry.propertyName?.text ?? entry.name.text });
      }
      if (ts.isExportDeclaration(node)) {
        const owner = node.moduleSpecifier ? resolve(file, node.moduleSpecifier.text) : file;
        if (!node.exportClause) mod.stars.push(owner);
        else if (ts.isNamedExports(node.exportClause)) for (const entry of node.exportClause.elements) mod.exports.set(entry.name.text, { owner, symbol: entry.propertyName?.text ?? entry.name.text });
      }
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) mod.aliases.set(node.name.text, node.initializer);
      ts.forEachChild(node, visit);
    };
    visit(mod.ast);
  }
  const origin = (owner, symbol, seen = new Set()) => {
    const key = `${owner}:${symbol}`;
    if (seen.has(key)) return null;
    seen.add(key);
    if (operations.get(owner)?.has(symbol)) return { owner, symbol };
    const mod = modules.get(owner);
    if (!mod) return null;
    const next = mod.exports.get(symbol) ?? mod.imports.get(symbol);
    if (next && (next.owner !== owner || next.symbol !== symbol)) {
      const found = origin(next.owner, next.symbol, seen); if (found) return found;
    }
    for (const target of mod.stars) { const found = origin(target, symbol, new Set(seen)); if (found) return found; }
    return mod.aliases.has(symbol) ? expression(owner, mod.aliases.get(symbol), seen) : null;
  };
  const expression = (file, node, seen = new Set()) => {
    const mod = modules.get(file);
    if (ts.isIdentifier(node)) {
      const binding = mod.imports.get(node.text);
      if (binding) return origin(binding.owner, binding.symbol, seen);
      if (mod.aliases.has(node.text) && !seen.has(`${file}:${node.text}`)) {
        seen.add(`${file}:${node.text}`); return expression(file, mod.aliases.get(node.text), seen);
      }
      if (injected.get(file)?.includes(node.text)) return { owner: work + (['setItemStatus', 'rollbackItemStatus'].includes(node.text) ? 'records.mjs' : 'discovery.mjs'), symbol: node.text === 'findWorkRecords' ? 'findWork' : node.text };
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      const binding = mod.imports.get(node.expression.text);
      if (binding?.symbol === '*') return origin(binding.owner, node.name.text, seen);
    }
    return null;
  };
  const failures = [];
  for (const [file, mod] of modules) {
    if (implementations.has(file)) continue;
    const admittedFactory = node => factories.has(file) && within(node, factories.get(file));
    const report = (node, operation) => failures.push(`${file}:${mod.ast.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${operation} bypasses the selected work-item store`);
    const visit = node => {
      if (ts.isCallExpression(node) && !admittedFactory(node)) {
        const found = expression(file, node.expression);
        if (found) {
          const args = node.arguments.map(arg => arg.getText(mod.ast));
          const selected = queries.has(found.symbol) ? /\bview\b/.test(args.at(-1) ?? '')
            : found.symbol === 'readItemMeta' ? args.length > 1
              : ['setItemStatus', 'rollbackItemStatus'].includes(found.symbol) ? /\bworkspace\b/.test(args.at(-1) ?? '') : false;
          const evidenceListing = file === work + 'validation.mjs' && found.symbol === 'readWorkDirectory' && args[0] === 'tasksDir';
          if (!selected && !evidenceListing) report(node, `${found.owner}#${found.symbol}`);
        }
      }
      // A direct record read followed by tracking extraction/write is a bypass;
      // reading the document body alone (SPEC/architecture/task evidence) is valid.
      if (ts.isFunctionLike(node) && node.body && !admittedFactory(node) && !manualKeepers.has(file)) {
        // Judge each lexical function separately; nested factories are not one giant read.
        const ranges = [];
        let trackingPattern = false;
        const nested = child => {
          if (ts.isFunctionLike(child) && child.body && ts.isBlock(child.body)) { ranges.push([child.getStart(), child.end]); return; }
          if (ts.isRegularExpressionLiteral(child) && /\b(?:status|depends|number|parent)\b/.test(child.text)) trackingPattern = true;
          ts.forEachChild(child, nested);
        };
        ts.forEachChild(node.body, nested);
        let body = node.body.getText(mod.ast);
        for (const [start, end] of ranges.reverse()) body = body.slice(0, start - node.body.getStart()) + ' '.repeat(end - start) + body.slice(end - node.body.getStart());
        body = stripComments(body);
        const record = /\b(?:SPEC|STORY|CHORE|SPIKE|SESSION|PROTOTYPE|AOF)\.md\b|\brecordDoc\s*\(/.test(body);
        const read = /\b(?:readFile|readFileSync)\s*\(/.test(body);
        const tracking = trackingPattern || /\b(?:parseFrontmatter|readItemMeta)\s*\(|\.(?:status|depends|number|parent)\b/.test(body);
        const write = /\b(?:writeFile|writeFileSync)\s*\(/.test(body) && /status:|number:|parent:|depends:/.test(body);
        const enumeration = /\breaddir(?:Sync)?\s*\(/.test(body) && /\b(?:ITEM_RE|BACKLOG_ITEM_RE)\b|_milestone_/.test(body);
        const foreign = (file === 'packages/integration-notion/src/sync-work.mjs' && functionName(node) === 'readForeignItemMeta')
          || (file === 'packages/knowledge/src/memory/local-indexing.mjs' && functionName(node) === 'buildRecords'); // original import provenance, not current tracking
        if (!foreign && ((record && read && (tracking || write)) || enumeration)) report(node, 'manual tracking read/write');
      }
      ts.forEachChild(node, visit);
    };
    visit(mod.ast);
  }
  return [...new Set(failures)].sort();
}

export const archTests = [
  { name: 'arch/208 FF-20801 production tracking crosses the workspace store', async run() {
    const sources = new Map(await Promise.all((await readRuntimeFiles(root)).map(async file => [file.rel, await readFile(file.path, 'utf8')])));
    assert.deepEqual(trackingViolations(sources), []);
  } },
  { name: 'arch/208 FF-20801 catches launcher digest aliases and command metadata through reexports', run() {
    const sources = new Map([
      ['packages/mesh/src/planted-launcher.mjs', 'import * as disk from "@aof/work/discovery"; const poll = disk.workTreeStatDigest; await poll(ws.workDir);'],
      ['packages/work/src/planted-barrel.mjs', 'export { readItemMeta as metadata } from "./records.mjs";'],
      ['packages/work/src/commands/planted.mjs', 'import { metadata as inspect } from "../planted-barrel.mjs"; await inspect(item);'],
    ]);
    const failures = trackingViolations(sources);
    assert.equal(failures.length, 2);
    assert.ok(failures.some(f => f.includes('planted-launcher.mjs') && f.includes('#workTreeStatDigest')));
    assert.ok(failures.some(f => f.includes('commands/planted.mjs') && f.includes('#readItemMeta')));
  } },
  { name: 'arch/208 FF-20801 distinguishes document bodies from manual tracking and selected queries', run() {
    const file = 'packages/work/src/commands/planted.mjs';
    for (const body of [
      'async function read(item) { const text = await readFile(path.join(item.dir, "SPEC.md")); return parseFrontmatter(text).status; }',
      'async function read(item) { const text = await readFile(path.join(item.dir, "SPEC.md")); return /^status:(.*)$/m.exec(text)?.[1]; }',
      'async function scan(root) { return (await readdir(root)).filter(name => ITEM_RE.test(name)); }',
      'async function write(item) { const file = path.join(item.dir, "STORY.md"); const text = await readFile(file); await writeFile(file, text.replace(/status:.*/, "status: done")); }',
    ]) assert.ok(trackingViolations(new Map([[file, body]])).length > 0);
    assert.deepEqual(trackingViolations(new Map([[file, 'async function body(item) { return await readFile(path.join(item.dir, "SPEC.md"), "utf8"); }']])), []);
    assert.deepEqual(trackingViolations(new Map([[file, 'import { findWork } from "@aof/work/discovery"; await findWork(ws.workDir, ref, { view: await readWorkItemView(ws) });']])), []);
  } },
];
