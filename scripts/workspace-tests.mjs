import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { workspaceOwners } from './workspace-boundaries.mjs';

export function assertNativeTestSource(source, file) {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const names = new Set();
  const namespaces = new Set();
  for (const statement of ast.statements) {
    if (!ts.isImportDeclaration(statement) || statement.moduleSpecifier.text !== 'node:test') continue;
    if (statement.importClause?.name) names.add(statement.importClause.name.text);
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) for (const member of bindings.elements) {
      if (['test', 'it', 'describe'].includes((member.propertyName ?? member.name).text)) names.add(member.name.text);
    }
  }
  let calls = 0;
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const expression = node.expression.getText(ast);
      if (names.has(expression) || [...names].some(name => expression.startsWith(`${name}.`))
        || [...namespaces].some(name => ['test', 'it', 'describe'].some(method => expression === `${name}.${method}`))) calls++;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  if (!calls) throw Error(`${file}: .test.mjs declares no native Node cases; importing an array suite does not execute it`);
}

// Native Node files and registered {name, run} suites are different executable surfaces.
// No module is imported by this inventory, and a missing declared test script fails loudly.
export function workspaceTestInventory(root) {
  return workspaceOwners(root).filter(owner => owner.manifest.name !== '@aof/repository').map(owner => {
    const native = []; const suites = [];
    const walk = directory => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        if (entry.isDirectory()) walk(file);
        else if (entry.name.endsWith('.test.mjs')) { assertNativeTestSource(readFileSync(file, 'utf8'), file); native.push(file); }
        else if (entry.name.endsWith('.suite.mjs')) suites.push(file);
      }
    };
    const directory = path.join(owner.directory, 'test');
    if (readdirSync(owner.directory).includes('test')) walk(directory);
    if ((native.length || suites.length) && !owner.manifest.scripts?.test) throw Error(`${owner.manifest.name} owns tests without a test script`);
    return { name: owner.manifest.name, directory: owner.directory, native: native.sort(), suites: suites.sort() };
  });
}
