import path from "node:path";
import { rm } from "node:fs/promises";
import { writeText } from "@aof/foundation/fs";
import { hashContent, hashFileIfExists, LOCK_VERSION } from "./lock.mjs";
import { renderConfigOutputs } from "./adapters.mjs";
import { resolvedPackageEntry } from "./packages.mjs";
import { codexGuidanceScope } from "./model.mjs";
import { checkCodexTarget, codexJournalPath, codexSharedOutput, mergeCodexOutput, readCodexJournal, recordCodexApply } from "./codex-settings.mjs";

export async function createRenderPlan(config, options = {}) {
  const outputs = renderConfigOutputs(config, options);
  return groupDesiredOutputs(outputs);
}

export async function planApplyActions(desiredOutputs, previousLock, options = {}) {
  const priorEntries = new Map(lockFiles(previousLock).map((entry) => [normalizePath(entry.path), entry]));
  const journal = desiredOutputs.some(output => output.runtime === "codex")
    ? await readCodexJournal(options.targetDir ?? process.cwd()) : null;
  const journalEntries = new Map(lockFiles(journal).map(entry => [normalizePath(entry.path), entry]));
  const desiredEntries = new Map(desiredOutputs.map((output) => [normalizePath(output.path), output]));
  const actions = [];

  for (const output of desiredOutputs) {
    const key = normalizePath(output.path);
    let prior = priorEntries.get(key);
    if (output.runtime === "codex") {
      try { await checkCodexTarget(output, options); }
      catch (error) { actions.push({ ...action("conflict", output, error.message), code: error.code }); continue; }
    }
    const currentHash = await hashFileIfExists(output.absolutePath);

    if (output.runtime === "codex") {
      try {
        const recovery = journalEntries.get(key);
        if (recovery?.hash === currentHash) prior = recovery;
        let prepared = output;
        if (codexSharedOutput(output)) prepared = await mergeCodexOutput(output, prior);
        else if (currentHash && !prior) {
          throw new Error(`unowned target collides with ${output.path}; --force cannot adopt it`);
        } else if (currentHash && prior && currentHash !== prior.hash) {
          throw new Error(`AOF-owned target ${output.path} was modified; it cannot be replaced`);
        }
        const planned = action(!currentHash ? "create" : currentHash === prepared.hash ? "skip" : "update", prepared,
          codexSharedOutput(output) ? "merge only recorded Codex ownership; preserve operator content" : !currentHash ? "file does not exist" : currentHash === prepared.hash ? "content already matches desired output" : "generated content changed");
        planned.expectedCurrentHash = currentHash;
        planned.journalPath = codexJournalPath(options.targetDir ?? process.cwd());
        planned.targetDir = options.targetDir ?? process.cwd();
        planned.global = Boolean(options.global);
        if (prepared.ownership) planned.ownership = prepared.ownership;
        if (prepared.activation) planned.activation = prepared.activation;
        if (prepared.activation) {
          planned.active = false;
          planned.profile = prepared.profile;
          planned.unsupportedEvents = prepared.unsupportedEvents;
          if (prepared.unsupportedEvents?.length) planned.reason += `; inactive hook events for ${prepared.profile}: ${prepared.unsupportedEvents.join(", ")}`;
        }
        actions.push(planned);
      } catch (error) {
        actions.push({ ...action("conflict", output, error.message), code: error.code ?? "codex-output-conflict" });
      }
      continue;
    }

    if (!currentHash) {
      actions.push(action("create", output, "file does not exist"));
      continue;
    }

    if (output.resource?.kind === "gitignore" && !prior && currentHash !== output.hash) {
      actions.push(action("drift-warning", output, "existing .gitignore was not created by AOF; not overwriting"));
      continue;
    }

    if (currentHash === output.hash) {
      actions.push(action("skip", output, "content already matches desired output"));
      continue;
    }

    if (prior && currentHash !== prior.hash && !options.force) {
      actions.push(action("drift-warning", output, "previously generated file was modified; use --force to overwrite"));
      continue;
    }

    if (prior && currentHash !== prior.hash && options.force) {
      actions.push(action("update", output, "drifted generated file will be overwritten because --force was provided"));
      continue;
    }

    actions.push(action("update", output, prior ? "generated content changed" : "existing file will be overwritten"));
  }

  for (const prior of priorEntries.values()) {
    const priorPath = normalizePath(prior.path);
    if (desiredEntries.has(priorPath)) continue;

    const absolutePath = path.resolve(options.targetDir ?? process.cwd(), prior.path);
    const staleOutput = {
      absolutePath,
      path: prior.path,
      runtime: prior.runtime,
      resource: prior.resource ?? null,
      hash: prior.hash
    };

    if (prior.runtime === "codex") {
      try { await checkCodexTarget(staleOutput, options); }
      catch (error) { actions.push({ ...action("conflict", staleOutput, error.message), code: error.code }); continue; }
    }
    const currentHash = await hashFileIfExists(absolutePath);
    if (prior.runtime === "codex") {
      if (prior.ownership) {
        try {
          const empty = { ...staleOutput, content: normalizePath(prior.path).endsWith("/hooks.json") ? '{"hooks":{}}' : "" };
          const merged = await mergeCodexOutput(empty, prior);
          actions.push({ ...action(currentHash === merged.hash ? "skip" : "update", merged, "retract only recorded Codex ownership"), ownership: merged.ownership,
            expectedCurrentHash: currentHash, targetDir: options.targetDir ?? process.cwd(), global: Boolean(options.global) });
        } catch (error) { actions.push({ ...action("conflict", staleOutput, error.message), code: error.code ?? "codex-output-conflict" }); }
        continue;
      }
    }

    if (!currentHash) {
      actions.push(action("skip", staleOutput, "previously generated file is already absent"));
      continue;
    }

    if (currentHash === prior.hash) {
      actions.push({ ...action("delete", staleOutput, "previously generated file is no longer desired"),
        ...(prior.runtime === "codex" ? { expectedCurrentHash: currentHash, targetDir: options.targetDir ?? process.cwd(), global: Boolean(options.global) } : {}) });
      continue;
    }

    actions.push(action(prior.runtime === "codex" ? "conflict" : "drift-warning", staleOutput, "stale generated file was modified; not deleting"));
  }

  // Migration is one preflight: any drift in a legacy skill blocks the native
  // copies of that skill too, before a shared-file merge or target write occurs.
  for (const blocked of actions.filter(item => item.action === "conflict" && normalizePath(item.path).startsWith(".codex/skills/"))) {
    const oldRoot = normalizePath(blocked.path).split("/").slice(0, 3).join("/");
    const newRoot = oldRoot.replace(".codex/skills/", ".agents/skills/");
    for (const item of actions.filter(candidate => normalizePath(candidate.path).startsWith(`${newRoot}/`))) {
      item.action = "conflict";
      item.reason = `legacy skill drift blocks duplicate discovery: ${normalizePath(blocked.path)} -> ${normalizePath(item.path)}`;
      item.code = "codex-migration-drift";
    }
    blocked.reason += `; native target ${newRoot}/SKILL.md was not installed`;
  }

  return actions;
}

export async function executeApplyActions(actions) {
  const conflicts = actions.filter(item => item.action === "conflict");
  if (conflicts.length) {
    const error = new Error(conflicts.map(item => `${item.code ?? "codex-output-conflict"}: ${item.path}: ${item.reason}`).join("\n"));
    error.code = conflicts[0].code ?? "codex-output-conflict";
    error.conflicts = conflicts;
    throw error;
  }
  // Recheck every Codex target together before the first mutation. A file changed
  // since dry planning is a refusal, never permission to overwrite the new bytes.
  for (const item of actions.filter(item => item.runtime === "codex" && item.expectedCurrentHash !== undefined)) {
    await checkCodexTarget(item, { targetDir: item.targetDir, global: item.global });
    if (await hashFileIfExists(item.absolutePath) !== item.expectedCurrentHash) throw new Error(`codex-output-conflict: ${item.path}: target changed after planning`);
  }
  await recordCodexApply(actions);
  const results = [];
  for (const item of actions) {
    if (item.action === "create" || item.action === "update") {
      results.push(await writeText(item.absolutePath, item.content));
      continue;
    }
    if (item.action === "delete") {
      await rm(item.absolutePath, { force: true });
      results.push({ path: item.absolutePath, action: "delete" });
      continue;
    }
    results.push({ path: item.absolutePath, action: item.action });
  }
  return results;
}

export function createLockManifest({ actions, desiredOutputs, previousLock, config, runtimes, global = false, generatedAt = new Date().toISOString() }) {
  const unchangedCodex = runtimes?.includes("codex") && actions.every(item => item.action === "skip");
  if (unchangedCodex && previousLock?.generatedAt) generatedAt = previousLock.generatedAt;
  const blocked = new Set(actions.filter((item) => ["drift-warning", "conflict"].includes(item.action)).map((item) => normalizePath(item.path)));
  const plannedByPath = new Map(actions.map(item => [normalizePath(item.path), item]));
  const priorByPath = new Map(lockFiles(previousLock).map((entry) => [normalizePath(entry.path), entry]));
  const preservedDrift = [...blocked]
    .map((filePath) => priorByPath.get(filePath))
    .filter(Boolean);

  // ADR-009 (unified lock): read-merge-write. Spread the prior lock FIRST so any
  // foreign section it carries (the `planning`/`work` domains, or an unknown key)
  // survives, then overwrite ONLY the flat asset fields this writer owns. This is
  // the seam the asset-apply path uses (it passes the whole unified lock as
  // previousLock); work init/update pass their own `work` section and then pick
  // specific fields off the result, so no foreign key leaks into the `work` nest.
  return {
    ...(previousLock && typeof previousLock === "object" ? previousLock : {}),
    version: LOCK_VERSION,
    generatedAt,
    runtimes,
    files: [
      ...desiredOutputs
        .filter((output) => !blocked.has(normalizePath(output.path)))
        .map((output) => ({
          path: output.path,
          runtime: output.runtime,
          resource: output.resource,
          hash: plannedByPath.get(normalizePath(output.path))?.hash ?? output.hash,
          ...(plannedByPath.get(normalizePath(output.path))?.ownership ? { ownership: plannedByPath.get(normalizePath(output.path)).ownership } : {}),
          generatedAt: unchangedCodex ? priorByPath.get(normalizePath(output.path))?.generatedAt ?? generatedAt : generatedAt
        })),
      ...preservedDrift
    ],
    packages: packageIntent(config.packages ?? [], { runtimes, global }),
    frameworks: frameworkIntent(config.packages ?? [], { runtimes, global }),
    frameworkInstallAttempts: Array.isArray(previousLock?.frameworkInstallAttempts) ? previousLock.frameworkInstallAttempts : []
  };
}

// The one-line human form of a plan/clean action. Moved here from cli.mjs
// (m42 wave (d) leg d1 — command logic leaves the face file; shared by the
// assets:clean and assets:apply registry commands).
export function formatApplyAction(item) {
  const parts = [
    `${item.action}: ${item.path}`,
    item.runtime ? `runtime=${item.runtime}` : null,
    item.resource ? `source=${item.resource.kind}:${item.resource.id}` : null,
    item.reason ? `reason=${item.reason}` : null
  ].filter(Boolean);
  return parts.join(" ");
}

// The friendly (non---verbose) action line + its display helpers. Moved here
// from cli.mjs with the assets:apply migration (m42 wave (d) leg d1); still
// imported by the remaining inline work-init/work-update/planning-init faces.
export function formatFriendlyApplyAction(item, options = {}) {
  const displayPath = relativeDisplayPath(item.path, options.targetDir);
  if (item.action === "conflict") return `refusal[${item.code ?? "codex-output-conflict"}]: ${displayPath} — ${item.reason}`;
  if (options.dryRun) {
    const verbs = {
      create: "Would create",
      update: "Would update",
      delete: "Would remove",
      skip: "Would keep",
      "drift-warning": "Warning"
    };
    const verb = verbs[item.action] ?? item.action;
    if (item.action === "drift-warning") return `drift-warning: ${displayPath} was modified; not overwriting`;
    return `${verb} ${displayPath}`;
  }

  const verbs = {
    create: "Created",
    update: "Updated",
    delete: "Removed",
    skip: "Kept",
    "drift-warning": "Warning"
  };
  if (item.action === "drift-warning") return `drift-warning: ${displayPath} was modified; not overwriting`;
  return `${successMarker()} ${verbs[item.action] ?? item.action} ${displayPath}`;
}

export function successMarker() {
  if (process.stdout.isTTY) return "\u001b[32m\u2713\u001b[0m";
  return "\u2713";
}

export function relativeDisplayPath(filePath, targetDir = process.cwd()) {
  const relativePath = path.isAbsolute(filePath) ? path.relative(targetDir, filePath) : filePath;
  return relativePath.replaceAll("\\", "/");
}

export function summarizeLockManifest(manifest) {
  return {
    files: manifest.files.length,
    packages: Array.isArray(manifest.packages) ? manifest.packages.length : 0,
    frameworks: manifest.frameworks.length,
    runtimes: manifest.runtimes
  };
}

function groupDesiredOutputs(outputs) {
  const groups = new Map();
  for (const output of outputs) {
    const key = normalizePath(output.path);
    const group = groups.get(key) ?? [];
    group.push(output);
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => {
    if (group.length === 1) return group[0];
    if (group.every((output) => output.runtime === "codex" && output.resource.kind === "rule" && path.basename(output.path) === "AGENTS.md")) {
      return mergeCodexAgents(group);
    }
    throw new Error(`Generated output conflict at ${group[0].path}: ${group.map(describeOutput).join(", ")}`);
  });
}

function mergeCodexAgents(group) {
  const sorted = [...group].sort((a, b) => a.resource.id.localeCompare(b.resource.id));
  const first = sorted[0];
  const content = [
    "# AOF Generated Guidance",
    "",
    "<!-- Generated by AOF. Do not edit directly; update .aof/ instead. -->",
    "",
    ...sorted.flatMap((output) => [
      `## ${output.source.name ?? output.source.id}`,
      "",
      output.source.description ? `> ${output.source.description}` : null,
      Array.isArray(output.source.paths) && output.source.paths.length > 0 ? `Applies to: ${output.source.paths.join(", ")}` : null,
      codexGuidanceScope(output.source.paths).advisory ? "Advisory condition only: apply this guidance when the listed paths match. Codex does not enforce these path selectors." : null,
      "",
      output.body.trim(),
      ""
    ].filter((line) => line !== null))
  ].join("\n");

  return {
    ...first,
    content,
    hash: hashContent(content),
    resource: {
      id: sorted.map((output) => output.resource.id).join("+"),
      kind: "rule"
    },
    sources: sorted.map((output) => output.resource)
  };
}

function describeOutput(output) {
  const resource = output.resource ?? {};
  if (resource.package) {
    return `package:${resource.package.namespace}/${resource.package.id}:${resource.kind}:${resource.originalId ?? resource.id}`;
  }
  if (resource.scope === "global") {
    return `global:${resource.kind}:${resource.id}`;
  }
  if (resource.kind) {
    return `local:${resource.kind}:${resource.id}`;
  }
  return `runtime:${output.runtime}:${output.path}`;
}

function action(name, output, reason) {
  return {
    action: name,
    path: output.path,
    absolutePath: output.absolutePath,
    runtime: output.runtime,
    resource: output.resource,
    reason,
    content: output.content,
    hash: output.hash
  };
}

function lockFiles(lock) {
  if (!lock || !Array.isArray(lock.files)) return [];
  return lock.files;
}

function normalizePath(filePath) {
  return String(filePath).replaceAll("\\", "/");
}

function frameworkIntent(packages, options) {
  const selectedRuntimes = new Set(options.runtimes ?? []);
  return packages.map((pkg) => {
    const runtimes = (pkg.runtimes ?? options.runtimes ?? []).filter((runtime) => selectedRuntimes.size === 0 || selectedRuntimes.has(runtime));
    return {
      id: pkg.id,
      namespace: pkg.namespace,
      source: pkg.source,
      sourceDescriptor: pkg.sourceDescriptor,
      runtimes,
      scope: options.global ? "global" : "local",
      intent: "managed"
    };
  });
}

function packageIntent(packages, options) {
  const selectedRuntimes = new Set(options.runtimes ?? []);
  return packages.map((pkg) => {
    const runtimes = (pkg.runtimes ?? options.runtimes ?? []).filter((runtime) => selectedRuntimes.size === 0 || selectedRuntimes.has(runtime));
    return {
      ...resolvedPackageEntry(pkg),
      runtimes,
      scope: options.global ? "global" : "local",
      intent: "managed"
    };
  });
}
