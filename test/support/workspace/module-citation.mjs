import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import { readCitationHistory } from '@aof/work/citation-history';
import { resolveCitedPath } from '@aof/work/cited-path-resolve';

const histories = new Map();
export async function moduleCitationTarget(root, operand) {
  if (!histories.has(root)) histories.set(root, readCitationHistory(root, async args => {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  }));
  const renameMap = await histories.get(root);
  const result = resolveCitedPath(operand, { renameMap, existsAtHead: rel => existsSync(path.join(root, rel)) });
  if (!result.resolved || result.destinations?.length > 1) throw Error(`Unresolved module citation: ${operand}`);
  return path.join(root, result.at);
}

// A factory's returned member is the public symbol after composition. Verify the
// real return object and its definition/import, rather than treating a name in prose
// or any nested helper as an export. Follow only explicit public package imports.
export async function declaresServiceSymbol(file, symbol, seen = new Set()) {
  if (seen.has(file)) return false;
  seen.add(file);
  const source = await readFile(file, 'utf8');
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const exported = node => node.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword);
  for (const node of ast.statements) {
    if (exported(node) && node.name?.text === symbol) return true;
    if (exported(node) && ts.isVariableStatement(node) && node.declarationList.declarations.some(decl => decl.name.getText(ast) === symbol)) return true;
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) {
      const member = node.exportClause.elements.find(entry => entry.name.text === symbol);
      if (member) {
        if (!node.moduleSpecifier) return true;
        if (node.moduleSpecifier.text.startsWith('@aof/')) return declaresServiceSymbol(createRequire(file).resolve(node.moduleSpecifier.text), member.propertyName?.text ?? symbol, seen);
      }
    }
    if (!exported(node) || !ts.isFunctionDeclaration(node) || !node.body) continue;
    const returned = node.body.statements.filter(ts.isReturnStatement).some(statement => ts.isObjectLiteralExpression(statement.expression)
      && statement.expression.properties.some(property => property.name?.text === symbol));
    if (returned) return true;
  }
  for (const node of ast.statements) {
    if (!ts.isImportDeclaration(node) || !node.moduleSpecifier.text.startsWith('@aof/')) continue;
    const imported = node.importClause?.namedBindings;
    if (!imported || !ts.isNamedImports(imported)) continue;
    // A constructor call is required; merely importing a factory is no proof.
    const called = imported.elements.some(entry => /^create\w+/u.test(entry.propertyName?.text ?? entry.name.text)
      && new RegExp(`\\b${entry.name.text}\\s*\\(`, 'u').test(source));
    if (called && await declaresServiceSymbol(createRequire(file).resolve(node.moduleSpecifier.text), symbol, seen)) return true;
  }
  return false;
}
