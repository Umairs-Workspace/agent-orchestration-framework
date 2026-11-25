import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { readRuntimeFiles } from "../../support/read-src-files.mjs";

const root = fileURLToPath(new URL("../../..", import.meta.url));
const providerModule = /azure-devops|azure-pipelines|@azure\/|(?:^|\/)boards\//i;
const providerDetail = /(?:dev\.azure\.com|visualstudio\.com|x-vss-forcemsapassthrough|workitemsbatch|_apis\/wit\/|account get-access-token)/i;
const az = /^(?:.*[/\\])?az(?:\.cmd|\.exe)?$/i;

function violations(file, source) {
  if (file.startsWith(".aof/boards/")) return [];
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const found = [];
  function visit(node) {
    if (ts.isStringLiteralLike(node)) {
      const caller = node.parent;
      const imported = ts.isImportDeclaration(caller) || ts.isExportDeclaration(caller) ||
        (ts.isCallExpression(caller) && (caller.expression.kind === ts.SyntaxKind.ImportKeyword || caller.expression.getText(ast) === "require"));
      const called = ts.isCallExpression(caller) && caller.arguments[0] === node;
      const reason = imported && providerModule.test(node.text) ? "provider import" :
        (providerDetail.test(node.text) || (called && az.test(node.text))) ? "provider-specific call or value" : null;
      if (reason) found.push(`${file}:${ast.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${reason}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return found;
}

export const archTests = [
  { name: "arch/209 FF-20901 provider details stay in the selected project adapter", async run() {
    const files = await readRuntimeFiles(root);
    assert.ok(files.some(file => file.rel === "packages/work/src/store/board-store.mjs"));
    const results = await Promise.all(files.map(async file => violations(file.rel, await readFile(file.path, "utf8"))));
    assert.deepEqual(results.flat(), []);
  } },
  { name: "arch/209 FF-20901 catches a provider import and CLI invocation in shared code", run() {
    const text = 'import azure from "azure-devops-node-api";\nspawn("az", ["account", "get-access-token"]);';
    assert.deepEqual(violations("packages/work/src/commands/probe.mjs", text), [
      "packages/work/src/commands/probe.mjs:1: provider import",
      "packages/work/src/commands/probe.mjs:2: provider-specific call or value",
    ]);
    assert.deepEqual(violations(".aof/boards/azure-devops/adapter.mjs", text), []);
  } },
];
