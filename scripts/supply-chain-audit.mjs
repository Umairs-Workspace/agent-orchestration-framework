import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseSyml } from '@yarnpkg/parsers';
import { readYarnPackages, installedManifests } from './dependency-inventory.mjs';


const allowedInstallScripts = new Set([
  "esbuild",
  "fsevents",
  // node-pty@1.1.0 (ADR-003): its install script is `node scripts/prebuild.js ||
  // node-gyp rebuild`, where prebuild.js only does fs.existsSync(prebuilds/<plat>)
  // + process.exit(0) — it does NOT download or compile when the bundled
  // win32-x64 N-API prebuilt is present (RESEARCH §2, verified from the tarball).
  "node-pty"
]);

const knownBadVersions = new Map([
  ["axios", new Set(["1.14.1", "0.30.4"])],
  ["plain-crypto-js", new Set(["4.2.1"])],
  ["node-ipc", new Set(["9.1.6", "9.2.3"])],
  ["chalk", new Set(["5.6.1"])],
  ["debug", new Set(["4.4.2"])],
  ["ansi-styles", new Set(["6.2.2"])],
  ["supports-color", new Set(["10.2.1"])],
  ["strip-ansi", new Set(["7.1.1"])],
  ["ansi-regex", new Set(["6.2.1"])],
  ["wrap-ansi", new Set(["9.0.1"])],
  ["color-convert", new Set(["3.1.1"])],
  ["color-name", new Set(["2.0.1"])],
  ["is-arrayish", new Set(["0.3.3"])],
  ["slice-ansi", new Set(["7.1.1"])],
  ["error-ex", new Set(["1.3.3"])],
  ["simple-swizzle", new Set(["0.2.3"])],
  ["supports-hyperlinks", new Set(["4.1.1"])],
  ["chalk-template", new Set(["1.1.1"])],
  ["backslash", new Set(["0.2.1"])],
  ["color-string", new Set(["2.1.1"])],
  ["has-ansi", new Set(["6.0.1"])],
  ["proto-tinker-wc", new Set(["0.1.87"])]
]);
const knownBadNxVersions = new Set([
  "20.9.0",
  "20.10.0",
  "20.11.0",
  "20.12.0",
  "21.5.0",
  "21.6.0",
  "21.7.0",
  "21.8.0"
]);

const blockedPackageFamilies = [
  "@tanstack/",
  "@mistralai/",
  "@uipath/",
  "@opensearch-project/",
  "guardrails-ai",
  "node-ipc"
];

const suspiciousPayloadFiles = new Set([
  "router_init.js",
  "router_runtime.js",
  "execution.js",
  "telemetry.js",
  "bundle.js",
  "bun_environment.js"
]);

export async function auditSupplyChain(repoRoot) {
  const lockPath = path.join(repoRoot, 'yarn.lock');
  const nodeModulesPath = path.join(repoRoot, 'node_modules');
  const diagnostics = [];

  function auditScripts(pkg, location, workspace = false) {
    const hasScripts = ['preinstall', 'install', 'postinstall'].some(key => pkg.scripts?.[key]) ||
      existsSync(path.join(repoRoot, location, 'binding.gyp'));
    if (hasScripts && (workspace || !allowedInstallScripts.has(pkg.name))) {
      diagnostics.push(error('UNAPPROVED_INSTALL_SCRIPT', location, `${pkg.name}@${pkg.version} has an unapproved install lifecycle script.`));
    }
  }

  if (!existsSync(lockPath)) {
    diagnostics.push(error("LOCKFILE_MISSING", "yarn.lock", "yarn.lock is required for dependency safety checks."));
  } else {
    const packages = readYarnPackages(readFileSync(lockPath, "utf8"));
    for (const entry of packages) {
      const { name } = entry;
      const entryPath = `yarn.lock:${name}`;

      const version = String(entry.version ?? "");
      if (isKnownCompromisedVersion(name, version)) {
        diagnostics.push(error("KNOWN_COMPROMISED_VERSION", entryPath, `${name}@${version} is on the known compromised package/version blocklist.`));
      }

      if (blockedPackageFamilies.some((blocked) => name === blocked || name.startsWith(blocked))) {
        diagnostics.push(error("BLOCKED_PACKAGE_FAMILY", entryPath, `${name} matches a currently blocked high-risk supply-chain family.`));
      }

      if (!entry.workspace && !entry.registry) {
        diagnostics.push(warning("NON_NPM_REGISTRY_SOURCE", entryPath, `${name}@${version} resolves outside the configured npm registry.`));
      }
    }
    for (const entry of packages.filter(entry => entry.workspace)) {
      const relative = path.relative(repoRoot, path.resolve(repoRoot, entry.location));
      if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
        throw new Error('Workspace lock entry escapes repository');
      }
      auditScripts(JSON.parse(readFileSync(path.join(repoRoot, entry.location, 'package.json'), 'utf8')), entry.location, true);
    }
  }

  const settings = parseSyml(readFileSync(path.join(repoRoot, '.yarnrc.yml'), 'utf8'));
  if (settings.enableScripts !== 'false' || settings.npmRegistryServer !== 'https://registry.npmjs.org') {
    diagnostics.push(error('UNSAFE_YARN_CONFIGURATION', '.yarnrc.yml', 'Disable lifecycle scripts by default and use registry.npmjs.org.'));
  }
  const manifest = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const approvedBuilds = new Set(['esbuild@0.28.1', 'esbuild@0.25.12', 'node-pty@1.1.0', 'fsevents@2.3.3']);
  for (const [descriptor, metadata] of Object.entries(manifest.dependenciesMeta ?? {})) {
    if (metadata.built === true && !approvedBuilds.has(descriptor)) {
      diagnostics.push(error('UNAPPROVED_BUILD_EXCEPTION', 'package.json', 'An install-script exception is not version-pinned and reviewed.'));
    }
  }
  if (existsSync(nodeModulesPath)) {
    // Yarn locks omit hasInstallScript. Inspect actual manifests; disabled scripts and
    // versioned exceptions above protect dependencies absent on this platform.
    for (const { location, manifest } of installedManifests(repoRoot)) auditScripts(manifest, location);
    for (const filePath of await findSuspiciousPayloads(nodeModulesPath)) {
      diagnostics.push(error("SUSPICIOUS_PAYLOAD_FILE", path.relative(repoRoot, filePath).replaceAll("\\", "/"), "Known npm malware payload filename found in node_modules."));
    }
  }

  const workflowPath = path.join(repoRoot, ".github", "workflows");
  if (existsSync(workflowPath)) {
    for (const filePath of await findWorkflowFiles(workflowPath)) {
      const body = readFileSync(filePath, "utf8");
      if (/\bpull_request_target\b/.test(body)) {
        diagnostics.push(error("UNSAFE_PULL_REQUEST_TARGET_WORKFLOW", path.relative(repoRoot, filePath).replaceAll("\\", "/"), "pull_request_target workflows must be reviewed before they can access repository secrets or publish tokens."));
      }
    }
  }

  return diagnostics;
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const diagnostics = await auditSupplyChain(repoRoot);
  const errors = diagnostics.filter((item) => item.severity === "error");
  for (const item of diagnostics) {
    console.log(`${item.severity}: ${item.code} ${item.path} ${item.message}`);
  }

  if (errors.length > 0) {
    console.error(`supply-chain audit failed: ${errors.length} error(s)`);
    process.exitCode = 1;
  } else {
    console.log(`supply-chain audit passed: ${diagnostics.length} warning(s)`);
  }
}

function isKnownCompromisedVersion(name, version) {
  const knownBad = knownBadVersions.get(name);
  if (knownBad?.has(version)) return true;
  if ((name === "nx" || name.startsWith("@nx/")) && knownBadNxVersions.has(version)) return true;
  return false;
}


async function findSuspiciousPayloads(root) {
  const found = [];
  await walk(root, found);
  return found;
}

async function findWorkflowFiles(root) {
  const found = [];
  await walkWorkflows(root, found);
  return found;
}

async function walk(dir, found) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, found);
    } else if (entry.isFile() && suspiciousPayloadFiles.has(entry.name)) {
      found.push(fullPath);
    }
  }
}

async function walkWorkflows(dir, found) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkWorkflows(fullPath, found);
    } else if (entry.isFile() && /\.(ya?ml)$/i.test(entry.name)) {
      found.push(fullPath);
    }
  }
}

function error(code, pathName, message) {
  return { severity: "error", code, path: pathName, message };
}

function warning(code, pathName, message) {
  return { severity: "warning", code, path: pathName, message };
}
