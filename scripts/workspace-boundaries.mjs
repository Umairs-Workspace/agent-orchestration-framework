import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { builtinModules, isBuiltin } from 'node:module';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { readYarnPackages } from './dependency-inventory.mjs';
import { workspaceDirectory } from './workspace-paths.mjs';
import { sourceFiles } from './source-inventory.mjs';

const builtin = new Set(builtinModules.flatMap(name => [name, `node:${name}`]));
const slash = value => value.replaceAll('\\', '/');
const within = (base, file) => { const rel = path.relative(base, file); return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel); };
const packageName = value => value.startsWith('@') ? value.split('/').slice(0, 2).join('/') : value.split('/')[0];

export function workspaceOwners(root) {
  return readYarnPackages(readFileSync(path.join(root, 'yarn.lock'), 'utf8')).filter(entry => entry.workspace)
    .map(entry => { const directory = entry.location === '.' ? root : workspaceDirectory(root, entry.name);
      return { directory, manifest: JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')) }; });
}

// Parse syntax, including TS/TSX, rather than extracting imports from comments or strings.
export function moduleReferences(source, file = 'source.mjs') {
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const references = [];
  const runtime = [];
  const children = new Set(['spawn', 'spawnSync', 'execFile', 'execFileSync', 'fork', 'exec', 'execSync', 'execFileAsync']);
  const childNamespaces = new Set();
  const requires = new Set(['require']);
  const requireFactories = new Set(['createRequire']);
  const moduleNamespaces = new Set();
  for (const statement of ast.statements) {
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.text === 'node:module') {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) moduleNamespaces.add(bindings.name.text);
      if (bindings && ts.isNamedImports(bindings)) for (const member of bindings.elements) {
        if ((member.propertyName ?? member.name).text === 'createRequire') requireFactories.add(member.name.text);
      }
    }
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.text === 'node:child_process') {
      const bindings = statement.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) childNamespaces.add(bindings.name.text);
      if (bindings && ts.isNamedImports(bindings)) for (const member of bindings.elements) children.add(member.name.text);
    }
  }
  const literal = node => node && (ts.isStringLiteralLike(node) ? node.text : null);
  const requireFactoryCall = node => ts.isCallExpression(node)
    && (requireFactories.has(node.expression.getText(ast)) || [...moduleNamespaces].some(name => node.expression.getText(ast) === `${name}.createRequire`));
  const inspect = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
      references.push({ kind: 'static', specifier: literal(node.moduleSpecifier), typeOnly: node.isTypeOnly === true || node.importClause?.isTypeOnly === true });
    }
    if (ts.isImportTypeNode(node)) {
      references.push({ kind: 'static', specifier: ts.isLiteralTypeNode(node.argument) ? literal(node.argument.literal) : null, typeOnly: true });
    }
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isCallExpression(node.initializer)
      && (requireFactories.has(node.initializer.expression.getText(ast))
        || [...moduleNamespaces].some(name => node.initializer.expression.getText(ast) === `${name}.createRequire`))) requires.add(node.name.text);
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isIdentifier(node.initializer)
      && requires.has(node.initializer.text)) requires.add(node.name.text);
    if (ts.isCallExpression(node)) {
      const expression = node.expression.getText(ast);
      const dynamic = node.expression.kind === ts.SyntaxKind.ImportKeyword;
      const requiring = requires.has(expression) || [...requires].some(name => expression === `${name}.resolve`)
        || requireFactoryCall(node.expression)
        || (ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'resolve' && requireFactoryCall(node.expression.expression));
      if (dynamic || requiring) {
        const specifier = literal(node.arguments[0]);
        if (specifier != null) references.push({ kind: dynamic ? 'dynamic' : 'require', specifier });
        else runtime.push({ kind: dynamic ? 'computed-import' : 'computed-require', expression: node.getText(ast) });
      }
      if (children.has(expression) || [...childNamespaces].some(name => expression.startsWith(`${name}.`))) {
        runtime.push({ kind: 'child-process', expression: node.getText(ast) });
      }
      if (expression === 'eval') runtime.push({ kind: 'generated-code', expression: node.getText(ast) });
    }
    if (ts.isNewExpression(node) && node.expression.getText(ast) === 'Function'
      && node.arguments?.some(argument => /(?:import|require)\s*\(/u.test(literal(argument) ?? ''))) {
      runtime.push({ kind: 'engine-import', expression: node.getText(ast) });
    }
    ts.forEachChild(node, inspect);
  };
  inspect(ast);
  const sourceDigest = createHash('sha256').update(ts.createPrinter({ removeComments: true, newLine: ts.NewLineKind.LineFeed }).printFile(ast).replaceAll('\r\n', '\n')).digest('hex');
  return { references, sourceDigest, runtime: runtime.map(entry => ({ ...entry, expression: entry.expression.replaceAll('\r\n', '\n') })) };
}

export function dependencyCycles(owners) {
  const names = new Set(owners.map(owner => owner.manifest.name));
  const graph = new Map(owners.map(({ manifest }) => [manifest.name, Object.keys({ ...manifest.dependencies, ...manifest.devDependencies, ...manifest.optionalDependencies, ...manifest.peerDependencies }).filter(name => names.has(name))]));
  const active = new Set(); const complete = new Set(); const cycles = [];
  function visit(name, chain) {
    if (active.has(name)) { cycles.push([...chain.slice(chain.indexOf(name)), name]); return; }
    if (complete.has(name)) return;
    active.add(name);
    for (const target of graph.get(name) ?? []) visit(target, [...chain, name]);
    active.delete(name); complete.add(name);
  }
  for (const name of names) visit(name, []);
  return cycles;
}

export function boundaryFiles(root, owners = workspaceOwners(root)) {
  const files = sourceFiles(root);
  // Build configuration is a real workspace consumer; it is not inside src/.
  for (const owner of owners) {
    if (owner.directory === root) continue;
    for (const entry of readdirSync(owner.directory, { withFileTypes: true })) {
      if (entry.isFile() && /\.(?:[cm]?js|tsx?)$/u.test(entry.name)) files.push({ owner: owner.manifest.name,
        path: path.join(owner.directory, entry.name), rel: slash(path.relative(root, path.join(owner.directory, entry.name))) });
    }
  }
  const repository = owners.find(owner => owner.directory === root);
  files.push(...sourceFiles(root, [{ owner: repository.manifest.name, directory: 'scripts' }]));
  return files.sort((a, b) => a.rel.localeCompare(b.rel));
}

export function inspectBoundaries(root, { owners = workspaceOwners(root), files = boundaryFiles(root, owners), runtimeAudit = [] } = {}) {
  const findings = [];
  const runtime = [];
  const byName = new Map(owners.map(owner => [owner.manifest.name, owner]));
  const byDirectory = [...owners].sort((a, b) => b.directory.length - a.directory.length);
  const covered = new Map();
  const locate = file => byDirectory.find(owner => within(owner.directory, file));
  const auditKeys = new Set(runtimeAudit.map(entry => `${entry.file}:${entry.kind}:${entry.digest}:${entry.sourceDigest}`));
  const usedAudits = new Set();
  for (const owner of owners) {
    for (const [entry, target] of Object.entries(owner.manifest.exports ?? {})) {
      if (entry.includes('*') || typeof target !== 'string' || !target.startsWith('./')
        || !within(owner.directory, path.resolve(owner.directory, target)) || !existsSync(path.resolve(owner.directory, target))) {
        findings.push(`${owner.manifest.name}: invalid explicit export ${entry}`);
      }
    }
  }
  for (const file of files) {
    const owner = byName.get(file.owner);
    if (!owner) { findings.push(`${file.rel}: unknown source owner ${file.owner}`); continue; }
    covered.set(file.owner, (covered.get(file.owner) ?? 0) + 1);
    const source = readFileSync(file.path, 'utf8');
    const parsed = moduleReferences(source, file.path);
    const problem = message => findings.push(`${file.rel}: ${message}`);
    for (const { specifier, typeOnly, kind } of parsed.references) {
      if (specifier == null) { problem('nonliteral module declaration'); continue; }
      if (builtin.has(specifier) || isBuiltin(specifier)) continue;
      if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('@/')) {
        // @/ is the UI's explicit tsconfig alias to its own src/. No sibling bypass.
        if (specifier.startsWith('@/')) {
          const configPath = path.join(owner.directory, 'tsconfig.json');
          const config = existsSync(configPath) ? ts.parseConfigFileTextToJson(configPath, readFileSync(configPath, 'utf8')).config : null;
          const options = config?.compilerOptions;
          if (owner.manifest.name !== '@aof/ui' || options?.baseUrl !== '.' || JSON.stringify(options.paths?.['@/*']) !== JSON.stringify(['./src/*'])) {
            problem(`unverified local alias ${specifier}`); continue;
          }
        }
        const target = specifier.startsWith('@/') ? path.join(owner.directory, 'src', specifier.slice(2)) : path.resolve(path.dirname(file.path), specifier);
        const targetOwner = locate(target);
        // The two repository harnesses may register owned test suites. They may
        // never use this route to a sibling's implementation or an undeclared owner.
        const ownedTest = targetOwner && owner.directory === root
          && (file.rel === 'scripts/test.mjs' && target === path.join(targetOwner.directory, 'test', 'index.mjs')
            || file.rel === 'scripts/test-unit.mjs' && within(path.join(targetOwner.directory, 'test'), target) && target.endsWith('.suite.mjs'));
        if (ownedTest) {
          if (!Object.hasOwn({ ...owner.manifest.dependencies, ...owner.manifest.devDependencies }, targetOwner.manifest.name)) problem(`undeclared test owner ${targetOwner.manifest.name}`);
          if (!existsSync(target)) problem(`missing owned test registration ${specifier}`);
          continue;
        }
        if (!targetOwner || targetOwner !== owner) problem(`private sibling import ${specifier}; use an explicit package export`);
        else if (owner.directory === root && within(path.join(root, 'src'), target)) problem(`legacy root source ${specifier}`);
        else if (!['', '.mjs', '.js', '.cjs', '.ts', '.tsx', '/index.ts', '/index.tsx', '/index.mjs'].some(suffix => existsSync(target + suffix))
          && !(typeOnly && existsSync(target.replace(/\.mjs$/u, '.d.mts')))) problem(`missing local module ${specifier}`);
        continue;
      }
      const dependency = packageName(specifier);
      const production = within(path.join(owner.directory, 'src'), file.path) || within(path.join(owner.directory, 'bin'), file.path);
      const declared = { ...owner.manifest.dependencies, ...owner.manifest.optionalDependencies, ...owner.manifest.peerDependencies,
        ...(!production ? owner.manifest.devDependencies : {}) };
      if (dependency !== owner.manifest.name && !Object.hasOwn(declared, dependency)) {
        // Optional development tools may be loaded lazily from a declared dev
        // dependency, with a reviewed call and selector. Static runtime imports
        // still require a production dependency, and export rules still apply.
        if (production && kind === 'dynamic' && Object.hasOwn(owner.manifest.devDependencies ?? {}, dependency)) {
          parsed.runtime.push({ kind: 'dev-tool-import', expression: `import(${JSON.stringify(specifier)})` });
        } else problem(`undeclared dependency ${dependency}`);
      }
      const target = byName.get(dependency);
      if (!target) continue;
      if (dependency === 'aof' && owner.directory !== root && owner.manifest.name !== 'aof') problem('feature/app imports assembled core');
      const key = specifier === dependency ? '.' : `.${specifier.slice(dependency.length)}`;
      const exported = target.manifest.exports?.[key];
      if (typeof exported !== 'string' || !exported.startsWith('./') || exported.includes('*') || !within(target.directory, path.resolve(target.directory, exported))) problem(`missing explicit export ${specifier}`);
      else if (!existsSync(path.resolve(target.directory, exported))) problem(`export target does not exist: ${specifier}`);
    }
    for (const entry of parsed.runtime) {
      const digest = createHash('sha256').update(entry.expression).digest('hex');
      const record = { file: file.rel, ...entry, digest, sourceDigest: parsed.sourceDigest };
      runtime.push(record);
      const key = `${file.rel}:${entry.kind}:${digest}:${parsed.sourceDigest}`;
      if (!auditKeys.has(key)) problem(`unaudited ${entry.kind}: ${entry.expression}`);
      else usedAudits.add(key);
    }
  }
  for (const entry of runtimeAudit) {
    const key = `${entry.file}:${entry.kind}:${entry.digest}:${entry.sourceDigest}`;
    if (!entry.reason?.trim()) findings.push(`${entry.file}: runtime audit needs a reason`);
    if (!usedAudits.has(key)) findings.push(`${entry.file}: stale runtime audit ${entry.kind}:${entry.digest}`);
  }
  for (const cycle of dependencyCycles(owners)) findings.push(`dependency cycle: ${cycle.join(' -> ')}`);
  for (const owner of owners) {
    if ((existsSync(path.join(owner.directory, 'src')) || existsSync(path.join(owner.directory, 'bin'))
      || owner.directory === root && existsSync(path.join(root, 'scripts'))) && !covered.has(owner.manifest.name)) {
      findings.push(`${owner.manifest.name}: source census read no files`);
    }
  }
  return { findings, runtime, covered: Object.fromEntries(covered), files: files.length };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const root = process.cwd();
  const audit = JSON.parse(readFileSync(path.join(root, 'scripts/workspace-runtime-audit.json'), 'utf8'));
  const result = inspectBoundaries(root, { runtimeAudit: audit });
  console.log(JSON.stringify(result, null, 2));
  if (result.findings.length) process.exitCode = 1;
}
