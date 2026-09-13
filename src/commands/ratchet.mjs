// work:ratchet — the impure observation edge around the pure contract-integrity
// engine (57/ADR-004, FF-5705). Git/history/filesystem reads live here and only
// here; work-ratchet.mjs receives completed observations as plain data.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 57 / story 03 — work:ratchet, the contract-integrity counter. The
//   command is the git/tree observation edge; its engine is the pure leaf
//   src/work/ratchet.mjs and refuses when no record-defined base can be resolved.
import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { commandError } from "../command-error.mjs";
import { idForm } from "../declared-id.mjs";
import { evaluateRatchet, RATCHET_CODES } from "../work/ratchet.mjs";
import { requireLocalCheckout, resolveItemExact } from "./resolve.mjs";

const execFileAsync = promisify(execFile);

async function defaultGitOutput(projectRoot, args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 15_000,
    windowsHide: true,
  });
  return stdout;
}

function repoPath(projectRoot, absolutePath) {
  return path.relative(projectRoot, absolutePath).split(path.sep).join("/");
}

function recordName(item) {
  if (item.type === "story") return "STORY.md";
  if (item.type === "milestone") return "SPEC.md";
  if (item.type === "spike") return "SPIKE.md";
  if (item.type === "chore") return "CHORE.md";
  if (item.type === "uat") return "SESSION.md";
  return null;
}

function frontmatterStatus(text) {
  const match = /^---\s*\r?\n([\s\S]*?)\r?\n---/u.exec(String(text ?? ""));
  return /^status:\s*in-progress\s*$/mu.test(match?.[1] ?? "") ? "in-progress" : null;
}

async function gitFile(gitOutput, projectRoot, commit, file) {
  try {
    return await gitOutput(projectRoot, ["show", `${commit}:${file}`]);
  } catch {
    return null;
  }
}

export async function resolveRatchetBase({ projectRoot, recordPath, suppliedBase }, { gitOutput = defaultGitOutput } = {}) {
  if (typeof suppliedBase === "string" && suppliedBase.trim() !== "") {
    try {
      const commit = (await gitOutput(projectRoot, ["rev-parse", "--verify", `${suppliedBase.trim()}^{commit}`])).trim();
      return commit === "" ? null : { commit, source: "supplied" };
    } catch {
      return null;
    }
  }

  try {
    const shallow = (await gitOutput(projectRoot, ["rev-parse", "--is-shallow-repository"])).trim();
    if (shallow === "true") return null;
    const history = await gitOutput(projectRoot, ["rev-list", "--first-parent", "--reverse", "HEAD", "--", recordPath]);
    for (const commit of history.split(/\r?\n/u).map((value) => value.trim()).filter(Boolean)) {
      const record = await gitFile(gitOutput, projectRoot, commit, recordPath);
      if (frontmatterStatus(record) === "in-progress") return { commit, source: "resolved" };
    }
  } catch {
    // Unborn HEAD, absent record history and unavailable history are the same
    // defined refusal. In particular, there is no HEAD~1 fallback here.
    //
    // THE REFUSAL IS RETURNED HERE, not fallen through to. m42's silent-catch ratchet
    // reads a statement-empty body as a degrade path that says nothing, and it was
    // right to: falling through left the reason for the refusal indistinguishable from
    // reaching the end of the function normally. Nothing is swallowed — the caller
    // branches on this `null` and emits `ratchet-base-unresolved` with exit 1 and no
    // legs computed, which is the loud coded outcome ADR-004 specifies (`F-57-M-8`).
    return null;
  }
  return null;
}

async function treeFiles(gitOutput, projectRoot, commit, prefix) {
  try {
    const output = await gitOutput(projectRoot, ["ls-tree", "-r", "--name-only", "-z", commit, "--", prefix]);
    return output.split("\0").filter(Boolean);
  } catch {
    return [];
  }
}

async function walkFiles(root, relative = "") {
  let entries;
  try {
    entries = await readdir(path.join(root, relative), { withFileTypes: true });
  } catch {
    return [];
  }
  const files = [];
  for (const entry of entries) {
    const child = path.join(relative, entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(root, child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

async function readHeadText(projectRoot, file) {
  try {
    return await readFile(path.join(projectRoot, ...file.split("/")), "utf8");
  } catch {
    return null;
  }
}

async function featureTextsAtBase(gitOutput, projectRoot, commit, itemPath) {
  const taskPrefix = `${itemPath}/tasks`;
  const files = (await treeFiles(gitOutput, projectRoot, commit, taskPrefix)).filter((file) => file.endsWith(".feature"));
  const entries = await Promise.all(files.map(async (file) => [file.slice(itemPath.length + 1), await gitFile(gitOutput, projectRoot, commit, file)]));
  return Object.fromEntries(entries.filter(([, text]) => text != null));
}

async function featureTextsAtHead(projectRoot, itemDir) {
  const files = (await walkFiles(path.join(itemDir, "tasks"))).filter((file) => file.endsWith(".feature"));
  const entries = await Promise.all(files.map(async (file) => {
    const absolute = path.join(itemDir, "tasks", file);
    return [`tasks/${file.split(path.sep).join("/")}`, await readFile(absolute, "utf8")];
  }));
  return Object.fromEntries(entries);
}

function isTestPath(file) {
  const normalized = `/${file.replaceAll("\\", "/")}`;
  return /\/(?:test|tests|__tests__)\//iu.test(normalized) || /\.(?:test|spec)\.[^/]+$/iu.test(normalized);
}

async function changedPaths(gitOutput, projectRoot, baseCommit) {
  const tracked = await gitOutput(projectRoot, ["diff", "--name-only", "-z", baseCommit, "--"]);
  const untracked = await gitOutput(projectRoot, ["ls-files", "--others", "--exclude-standard", "-z"]);
  return [...new Set(`${tracked}${untracked}`.split("\0").filter(Boolean))];
}

// Citations are read from the artifact AS IT STOOD AT THE BASE COMMIT, never from
// head (ADR-004 section 5). The comment explaining a weakening is written WITH the
// weakening, so it exists only at head — reading base is what makes "the ratchet
// never reads the justification comment" structural rather than a promise.
// The fragment comes from 66's one home (`F-57-M-4`); the harvest shape around it is
// this milestone's own — unanchored, global, and admitting the bare form so that
// `evaluateRatchet` can REFUSE it, which is ADR-004 section 5's first qualifier.
const ADR_CITATION = new RegExp(`\\bm?(?:\\d+(?:/\\d+)?/)?${idForm("ADR").id}\\b`, "giu");

function adrIdsOnly(text) {
  return [...new Set([...String(text ?? "").matchAll(ADR_CITATION)].map((match) => match[0]))];
}

// The owning item is whichever ancestor supplied the register, named by the ref a
// citation has to carry to discharge against it. Built from the numbered segments
// between the work dir and that ancestor, so a milestone register is `57` and a
// story-level one is `57/03` — the `m?<itemRef>/<ID>` spelling, not a bare number.
function itemRefOf(workDir, dir) {
  const segments = path.relative(workDir, dir).split(path.sep)
    .map((segment) => /^(\d+)_/u.exec(segment)?.[1])
    .filter(Boolean);
  return segments.length === 0 ? null : segments.join("/");
}

async function baseArchitecture(gitOutput, projectRoot, baseCommit, itemDir, workDir) {
  let current = itemDir;
  const boundary = path.resolve(workDir);
  while (path.resolve(current).toLowerCase().startsWith(boundary.toLowerCase())) {
    const candidate = repoPath(projectRoot, path.join(current, "ARCHITECTURE.md"));
    const text = await gitFile(gitOutput, projectRoot, baseCommit, candidate);
    if (text != null) return { text, itemRef: itemRefOf(workDir, current) };
    if (path.resolve(current).toLowerCase() === boundary.toLowerCase()) break;
    current = path.dirname(current);
  }
  return { text: "", itemRef: null };
}

export async function observeRatchet(workspace, item, resolvedBase, { gitOutput = defaultGitOutput } = {}) {
  const projectRoot = workspace.projectRoot;
  const itemPath = repoPath(projectRoot, item.dir);
  const baseFeatures = await featureTextsAtBase(gitOutput, projectRoot, resolvedBase.commit, itemPath);
  const headFeatures = await featureTextsAtHead(projectRoot, item.dir);
  const paths = (await changedPaths(gitOutput, projectRoot, resolvedBase.commit)).filter(isTestPath);
  const baseFiles = {};
  const headFiles = {};
  const citationsByPath = {};

  for (const file of paths) {
    const before = await gitFile(gitOutput, projectRoot, resolvedBase.commit, file);
    const after = await readHeadText(projectRoot, file);
    if (before != null) {
      baseFiles[file] = before;
      citationsByPath[file] = adrIdsOnly(before);
    }
    if (after != null) headFiles[file] = after;
  }
  for (const [file, text] of Object.entries(baseFeatures)) citationsByPath[file] = adrIdsOnly(text);

  const register = await baseArchitecture(gitOutput, projectRoot, resolvedBase.commit, item.dir, workspace.workDir);
  return {
    baseCommit: resolvedBase.commit,
    baseSource: resolvedBase.source,
    base: { featureTexts: baseFeatures, files: baseFiles },
    head: { featureTexts: headFeatures, files: headFiles },
    baseArchitectureText: register.text,
    owningItemRef: register.itemRef,
    citationsByPath,
  };
}

export const ratchetCommand = {
  id: "work:ratchet",
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      base: { type: "string" },
    },
    required: ["ref"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    if (ref === "") throw commandError("A work ref is required.", "missing-ref", 400);
    const resolvedItem = await resolveItemExact(ctx, ref);
    if (resolvedItem == null) throw commandError(`No work item matches "${ref}".`, "ref-not-found", 404);
    const item = requireLocalCheckout(resolvedItem, ref);
    const name = recordName(item);
    if (name == null) throw commandError(`Work item "${ref}" has no ratchet record.`, "unsupported-work-type", 400);

    const gitOutput = ctx.gitOutput ?? defaultGitOutput;
    const resolvedBase = await resolveRatchetBase({
      projectRoot: ctx.workspace.projectRoot,
      recordPath: repoPath(ctx.workspace.projectRoot, path.join(item.dir, name)),
      suppliedBase: input.base,
    }, { gitOutput });
    if (resolvedBase == null) return { ref: item.ref, ok: false, code: RATCHET_CODES.BASE_UNRESOLVED, base: null, legs: [] };

    const observation = ctx.observeRatchet
      ? await ctx.observeRatchet(ctx.workspace, item, resolvedBase)
      : await observeRatchet(ctx.workspace, item, resolvedBase, { gitOutput });
    return { ref: item.ref, ...evaluateRatchet(observation) };
  },

  cli: {
    route: ["work", "ratchet"],
    spec: {
      usage: "aof work ratchet <ref> [--base <commit>] [--json]",
      flags: { base: { type: "string", description: "explicit base commit (recorded as supplied)" } },
    },
    argv(positionals, options) {
      if (!positionals[0]) {
        throw commandError("Usage: aof work ratchet <ref> [--base <commit>] [--json]", "invalid-input", 400);
      }
      return { ref: positionals[0], ...(options.base == null ? {} : { base: options.base }) };
    },
    render(result) {
      if (!result.ok) return `${result.code}: no base commit could be resolved; no ratchet leg was computed.`;
      const lines = [`Contract-integrity ratchet for ${result.ref} at ${result.base.commit} (${result.base.source}).`];
      for (const leg of result.legs) {
        const detail = leg.id === "contract" ? ` (${leg.before.total} -> ${leg.after.total})` : "";
        lines.push(`${leg.id}: ${leg.disposition}${detail}`);
      }
      return lines.join("\n");
    },
    json: (result) => result,
    exit: (result) => (result.ok ? 0 : 1),
  },
};
