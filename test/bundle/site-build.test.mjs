// Traceability wiring for story 125 (the loop graph gets a published face),
// task 00_the-site-has-a-publishing-path.feature + task 01_the-graph-page-is-projected-not-copied.feature.
//
// TWO KINDS OF ROW LIVE HERE. Task 00's rows are a STATIC LINT over the checked-in Pages workflow
// (`.github/workflows/pages.yml`) — the job graph, the triggers and job conditions, the permission
// scoping and the concurrency declaration a build agent can assert without a GitHub Actions run —
// in the idiom `release-workflow-lint.test.mjs` established: comment-stripped, line-anchored, no
// YAML parser dependency added for a lint-only concern. Task 01's rows DRIVE the staging step
// (`scripts/site/build-site.mjs`) over this repository and over fixture trees, and prove the
// story's load-bearing claim end to end: a registry edit that was not regenerated fails the gate
// the way the workflow runs it, and regenerating clears it.
//
// THE READ BOUNDARY IS SHARED, NOT COPIED. `test/support/workflow/workflow-lint.mjs` is the one
// home for the CRLF normalisation and the comment strip (its header records why the order of the
// two is load-bearing); this lint and the release lint both read through it. The workflow this
// suite lints carries comments that name `needs` and `pull_request` on purpose, so that a lint
// which read prose would be caught by the rows below rather than by the next Windows clone.
//
// THE LINT IS ANCHORED AT THE JOB'S INDENT. A job-level `if:`, `needs:` or `concurrency:` sits at
// four spaces; a step-level `if:` sits deeper, and a lint that took the first `if:` anywhere in
// the job body would let a condition on the deploy-pages STEP satisfy a rule about the JOB
// (measured at review: the job `if` moved to the step, zero problems). Every job-level read below
// is anchored the way `permissionsOf` is.
//
// The live site (Pages source switched to GitHub Actions, the page rendering as a diagram) is
// @uat in both features and is not exercised here.
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { spawnSyncHardened } from "../support/cli-spawn.mjs";
import { RECORDS, loop, snapshot, writeRegistry } from "../support/loop-document-fixture.mjs";
import { computedDynamicImports, importSpecifiers } from "../support/module-family.mjs";
import { stripComments } from "../support/source-slice.mjs";
import { normaliseEol, readWorkflowText, stripYamlComments } from "../support/workflow/workflow-lint.mjs";
import { loadWorkspace } from "../../src/work.mjs";
import { loopDocumentCommand } from "../../src/commands/loop-document.mjs";
import { loopDocumentPath, REGENERATE_COMMAND } from "../../src/loop-document.mjs";
import {
  BUILD_COMMAND,
  DEFAULT_OUT,
  DELIVERED_SOURCE,
  MANIFEST,
  RAW_CLOSE,
  RAW_OPEN,
  SHELL_DIR,
  SiteBuildError,
  buildSite,
  carriesProvenanceEnvelope,
  collectDelivered,
  houseStyle,
  resolveManifest,
} from "../../scripts/site/build-site.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const workflowsDir = path.join(repoRoot, ".github", "workflows");
const workflowPath = path.join(workflowsDir, "pages.yml");
const layoutPath = path.join(repoRoot, SHELL_DIR, "_layouts", "default.html");
const BUILDER = "scripts/site/build-site.mjs";
const GATE_CONTROL = "test/arch/loop/acd-loop-document-current.test.mjs";
// The gate command exactly as the workflow spells it, minus the shell's `AOF_GLOBAL_HOME=…`
// prefix, which is passed as the child's environment here.
const GATE_ARGV = ["scripts/test.mjs", "--only", GATE_CONTROL];
// A job's own keys sit at this indent; a step's keys sit deeper.
const JOB_INDENT = 4;

function readWorkflow() {
  return readWorkflowText(workflowPath);
}

// A top-level `key:` block: its lines up to the next top-level key. Null when absent.
function topLevelBlock(stripped, key) {
  const lines = stripped.split("\n");
  const start = lines.findIndex((line) => new RegExp(`^${key}:\\s*$`).test(line));
  if (start < 0) return null;
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() !== "" && !/^\s/.test(line)) break;
    body.push(line);
  }
  return body.join("\n");
}

// The two-space-indented children of a block, keyed by name, valued by their own lines.
function childBlocks(block) {
  const children = new Map();
  if (block == null) return children;
  let current = null;
  for (const line of block.split("\n")) {
    const header = /^  ([A-Za-z0-9_-]+):(.*)$/.exec(line);
    if (header) {
      current = header[1];
      children.set(current, header[2].trim() === "" ? [] : [header[2].trim()]);
      continue;
    }
    if (current != null) children.get(current).push(line);
  }
  return new Map([...children].map(([name, lines]) => [name, lines.join("\n")]));
}

// A job-level scalar — `if:`, `needs:` — at the job's own indent and nowhere deeper.
function jobScalar(job, key) {
  const match = new RegExp(`^ {${JOB_INDENT}}${key}:\\s*(.+?)\\s*$`, "m").exec(job);
  return match ? match[1] : null;
}

// `needs: [a, b]`, `needs: a` or a `needs:` list at the job's indent — the job names, or [].
function needsOf(job) {
  const scalar = jobScalar(job, "needs");
  if (scalar != null) {
    const inline = /^\[([^\]]*)\]$/.exec(scalar);
    return inline ? inline[1].split(",").map((name) => name.trim()).filter(Boolean) : [scalar];
  }
  const list = new RegExp(`^ {${JOB_INDENT}}needs:\\s*\\n((?: {${JOB_INDENT + 2}}-\\s*\\S+\\s*(?:\\n|$))+)`, "m").exec(`${job}\n`);
  if (list) return [...list[1].matchAll(/-\s*(\S+)/g)].map((match) => match[1]);
  return [];
}

// A block declared at `indent` spaces inside `text` — `permissions:`, `concurrency:` — with its
// deeper lines, or null when none is declared at that level (0 for the workflow, 4 for a job).
function blockAt(text, key, indent) {
  const pad = " ".repeat(indent);
  const match = new RegExp(`^${pad}${key}:\\s*\\n((?:${pad}  \\S.*(?:\\n|$))+)`, "m").exec(`${text}\n`);
  return match ? match[1] : null;
}

function permissionsOf(text, indent) {
  const block = blockAt(text, "permissions", indent);
  if (block == null) return null;
  const scopes = {};
  for (const [, scope, level] of block.matchAll(/^\s*([a-z-]+):\s*([a-z]+)\s*$/gm)) scopes[scope] = level;
  return scopes;
}

function branchesOf(trigger) {
  if (trigger == null) return null;
  const inline = /branches:\s*\[([^\]]*)\]/.exec(trigger);
  if (inline) return inline[1].split(",").map((name) => name.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  const list = /branches:\s*\n((?:\s*-\s*\S+\s*\n?)+)/.exec(`${trigger}\n`);
  if (list) return [...list[1].matchAll(/-\s*(\S+)/g)].map((match) => match[1].replace(/^["']|["']$/g, ""));
  return [];
}

// ── THE LINT ─────────────────────────────────────────────────────────────────────────────
// One pure function over the workflow's RAW text — it normalises at its own read boundary, strips
// comments, and returns what it read plus every problem it found. The rows below assert on the
// structure; the mutation rows feed it altered copies and read the problems.
export function lintPagesWorkflow(rawText) {
  const stripped = stripYamlComments(normaliseEol(rawText));
  const problems = [];

  const jobs = childBlocks(topLevelBlock(stripped, "jobs"));
  const deployJobs = [...jobs].filter(([, body]) => /uses:\s*actions\/deploy-pages@/.test(body)).map(([name]) => name);
  const gateJobs = [...jobs].filter(([, body]) => body.includes(GATE_CONTROL)).map(([name]) => name);
  if (deployJobs.length !== 1) problems.push(`exactly one job deploys (actions/deploy-pages): found ${deployJobs.length}`);
  if (gateJobs.length !== 1) problems.push(`exactly one job runs the gate (${GATE_CONTROL}): found ${gateJobs.length}`);
  const deploy = deployJobs[0] ?? null;
  const gate = gateJobs[0] ?? null;

  const deployBody = deploy ? jobs.get(deploy) : "";
  const gateBody = gate ? jobs.get(gate) : "";
  const needs = deploy ? needsOf(deployBody) : [];
  if (deploy && gate && !needs.includes(gate)) {
    problems.push(`job "${deploy}" deploys without waiting for the gate: its needs [${needs.join(", ")}] do not include "${gate}"`);
  }

  // REACHABILITY. `needs: [gate]` is satisfied by a gate that FAILED SOFTLY, and there are four ways
  // to make it fail softly (measured at review, zero problems on each before these lines): a
  // `continue-on-error` on the gate job or one of its steps, a `|| true` on its run line, and a
  // deploy condition that overrides the need with `cancelled()` or reads `needs.<job>.result`.
  const deployIf = deploy ? jobScalar(deployBody, "if") : null;
  if (deploy && deployIf && /always\(\)|failure\(\)|cancelled\(\)|needs\.\w+\.result/.test(deployIf)) {
    problems.push(`job "${deploy}" is reachable without the gate succeeding: if: ${deployIf}`);
  }
  if (deploy && !(deployIf && /github\.event_name\s*!=\s*['"]pull_request['"]/.test(deployIf))) {
    problems.push(`job "${deploy}" does not exclude pull_request: if: ${deployIf ?? "(none)"}`);
  }
  if (deploy && !(deployIf && /github\.ref\s*==\s*['"]refs\/heads\/main['"]/.test(deployIf))) {
    problems.push(`job "${deploy}" would deploy a ref other than main (a workflow_dispatch can be started from any branch): if: ${deployIf ?? "(none)"}`);
  }
  if (gate && /continue-on-error/.test(gateBody)) problems.push(`job "${gate}" or one of its steps carries continue-on-error, so a red check would not fail it`);
  if (gate && /\|\|\s*true/.test(gateBody)) problems.push(`job "${gate}" swallows its exit code with \`|| true\``);
  const gateIf = gate ? jobScalar(gateBody, "if") : null;
  if (gate && gateIf) problems.push(`job "${gate}" carries a condition, so it does not answer on every trigger: if: ${gateIf}`);

  const on = childBlocks(topLevelBlock(stripped, "on"));
  const triggers = {
    push: branchesOf(on.get("push") ?? null),
    pull_request: branchesOf(on.get("pull_request") ?? null),
    workflow_dispatch: on.has("workflow_dispatch"),
  };
  if (!triggers.push?.includes("main")) problems.push("the workflow does not trigger on a push to main");
  if (!triggers.pull_request?.includes("main")) problems.push("the workflow does not trigger on a pull_request targeting main");
  if (!triggers.workflow_dispatch) problems.push("the workflow does not trigger on workflow_dispatch");

  const topPermissions = permissionsOf(stripped, 0);
  if (topPermissions == null) problems.push("the workflow declares no top-level permissions block");
  for (const [scope, level] of Object.entries(topPermissions ?? {})) {
    if (level === "write") problems.push(`the top-level permissions grant a write scope: ${scope}: write`);
  }
  const jobPermissions = new Map([...jobs].map(([name, body]) => [name, permissionsOf(body, JOB_INDENT)]));
  const deployPermissions = deploy ? jobPermissions.get(deploy) : null;
  for (const scope of ["pages", "id-token"]) {
    if (deployPermissions?.[scope] !== "write") problems.push(`job "${deploy}" is not granted ${scope}: write`);
    for (const [name, scopes] of jobPermissions) {
      if (name !== deploy && scopes?.[scope] === "write") problems.push(`job "${name}" is granted ${scope}: write, which belongs to the deploy job alone`);
    }
  }
  const gatePermissions = gate ? jobPermissions.get(gate) : null;
  if (gate && JSON.stringify(gatePermissions) !== JSON.stringify({ contents: "read" })) {
    problems.push(`job "${gate}" is granted ${JSON.stringify(gatePermissions)} rather than exactly { contents: read }`);
  }

  const concurrency = deploy ? blockAt(deployBody, "concurrency", JOB_INDENT) : null;
  const concurrencyGroup = concurrency ? /group:\s*(\S+)/.exec(concurrency)?.[1] ?? null : null;
  const cancelInProgress = concurrency ? /cancel-in-progress:\s*(\S+)/.exec(concurrency)?.[1] ?? null : null;
  if (deploy && !concurrencyGroup) problems.push(`job "${deploy}" declares no concurrency group`);
  if (deploy && cancelInProgress !== "false") problems.push(`job "${deploy}" does not declare cancel-in-progress: false (found ${cancelInProgress ?? "nothing"})`);

  for (const [, uses] of stripped.matchAll(/^\s*(?:-\s*)?uses:\s*(\S+)/gm)) {
    if (!/@v\d+$/.test(uses)) problems.push(`action is not pinned to a major: ${uses}`);
  }

  return {
    jobs: [...jobs.keys()],
    deploy,
    gate,
    needs,
    deployIf,
    gateIf,
    triggers,
    permissions: { top: topPermissions, jobs: Object.fromEntries(jobPermissions) },
    concurrency: { group: concurrencyGroup, cancelInProgress },
    gateBody,
    deployBody,
    problems,
  };
}

// ── FIXTURES ─────────────────────────────────────────────────────────────────────────────
// A small project tree the builder can stage: a config, the real shell, and the manifest's sources
// copied from this repository. `omit` drops one source to drive the missing-source row.
async function makeSiteFixture({ omit = null } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-site-build-"));
  await mkdir(path.join(root, ".aof"), { recursive: true });
  await writeFile(path.join(root, ".aof", "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
  await cp(path.join(repoRoot, SHELL_DIR), path.join(root, SHELL_DIR), { recursive: true });
  const manifest = resolveManifest(repoRoot, await loadWorkspace(repoRoot));
  for (const entry of manifest) {
    if (!entry.absolute) continue; // a composed page has no file to copy — it is composed from the fixture's own records
    if (entry.source === omit) continue;
    const target = path.join(root, ...entry.source.split("/"));
    await mkdir(path.dirname(target), { recursive: true });
    await cp(entry.absolute, target);
  }
  return { root, manifest };
}

// Write one item's identity record and outcome into a fixture work dir. `record` is the identity
// doc's filename (SPEC/STORY/CHORE.md) and `status` its frontmatter status; `delivered` is the
// body of the outcome's `## Delivered` section.
async function writeOutcomeFixture(root, relativeDir, { record, status, title, delivered, extra = "" }) {
  const dir = path.join(root, "wiki", "work", ...relativeDir.split("/"));
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, record), `---\ntype: ${record === "SPEC.md" ? "milestone" : record === "CHORE.md" ? "chore" : "story"}\nstatus: ${status}\n---\n# ${title}\n`, "utf8");
  await writeFile(path.join(dir, "OUTCOME.md"), `# ${title} — Outcome\n\n<!-- a comment the page must not carry -->\n\n## Delivered\n\n${delivered}\n\n## Assumptions\n\n- **stays in the record** — not published\n${extra}`, "utf8");
}

async function withSiteFixture(options, fn) {
  const fixture = await makeSiteFixture(options);
  try {
    return await fn(fixture);
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
}

async function withTempDir(prefix, fn) {
  const dir = await mkdtemp(path.join(os.tmpdir(), prefix));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Every file below a directory, as POSIX-relative keys — the fixture's own walk (`snapshot`),
// keys only, so this suite carries no second walker.
async function listFiles(dir) {
  return Object.keys(await snapshot(dir));
}

async function exists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

// Split a staged page into what the builder ADDED and the body it carried through: the front
// matter, the guard's opener, the body, the guard's closer. Throws when the page is not that shape,
// so a row asserting on the parts fails loudly rather than over the wrong region.
function partsOfStagedPage(text) {
  const opening = /^---\n[\s\S]*?\n---\n/.exec(text);
  assert.ok(opening, "a staged page opens with front matter");
  const frontMatter = opening[0];
  const rest = text.slice(frontMatter.length);
  assert.ok(rest.startsWith(RAW_OPEN), "the front matter is followed by the Liquid guard's opener");
  assert.ok(rest.endsWith(RAW_CLOSE), "and the page ends with the guard's closer");
  const body = rest.slice(RAW_OPEN.length, rest.length - RAW_CLOSE.length);
  return { frontMatter, body };
}

function frontMatterValue(frontMatter, key) {
  const match = new RegExp(`^${key}:\\s*(.*)$`, "m").exec(frontMatter);
  if (!match) return undefined;
  const raw = match[1].trim();
  return raw.startsWith('"') ? JSON.parse(raw) : raw;
}

function gitCheckIgnore(target) {
  return spawnSyncHardened("git", ["check-ignore", "-q", "--", target], { cwd: repoRoot, encoding: "utf8" });
}

// The builder's STATIC import closure: every module reached by a literal `import … from`,
// `import "…"` or `import("…")` from the builder, transitively, through the shared extractor
// (`test/support/module-family.mjs`). Bare specifiers are collected, not followed; a computed
// dynamic import is reported, because a closure that cannot be read is not a closure.
async function staticImportClosure(entry) {
  const seen = new Map();
  const bare = [];
  const computed = [];
  async function walk(file) {
    if (seen.has(file)) return;
    const code = await readFile(file, "utf8");
    seen.set(file, code);
    for (const expression of computedDynamicImports(code)) computed.push(`${path.relative(repoRoot, file)}: import(${expression})`);
    for (const { specifier } of importSpecifiers(code)) {
      if (specifier.startsWith("node:")) continue;
      if (!specifier.startsWith(".")) {
        bare.push(`${specifier} <- ${path.relative(repoRoot, file).split(path.sep).join("/")}`);
        continue;
      }
      await walk(path.resolve(path.dirname(file), specifier));
    }
  }
  await walk(path.resolve(repoRoot, entry));
  return { modules: [...seen.keys()].map((file) => path.relative(repoRoot, file).split(path.sep).join("/")), bare, computed };
}

// A copy of this repository's runnable tree — everything `scripts/test.mjs` reaches at LOAD (the
// runner imports every suite before it selects, and suites import `src/`, `ui/src/` and the hook
// under `.claude/hooks/` at module scope) — with a FIXTURE registry and its own config, placed
// INSIDE this repository (under the git-ignored `.aof-test/`) so bare imports resolve up to this
// tree's `node_modules` without a link or a junction. The gate is then run in it exactly as the
// workflow runs it, and the fixture's registry is what drifts — never this repository's.
async function makeGateFixture() {
  const root = path.join(repoRoot, ".aof-test", `site-gate-${randomBytes(4).toString("hex")}`);
  await mkdir(root, { recursive: true });
  // `wiki/` rides along because the runner's load-time closure reaches into it — MEASURED
  // (2026-09-12): every suite is imported before `--only` selects, and suites read record docs and
  // task fixtures under `wiki/work/` at module scope (`acd-tune-carries-no-second-rule`,
  // `graphify-reranking`). The fixture's OWN document is written over the copy below, from the
  // fixture's own registry, before the gate is first run. Run records and observability snapshots
  // are left out: nothing loads them, and they are the bulk of the tree.
  for (const tree of ["src", "test", "scripts", "ui/src", ".claude/hooks", "wiki"]) {
    await cp(path.join(repoRoot, ...tree.split("/")), path.join(root, ...tree.split("/")), {
      recursive: true,
      filter: (source) => !/[\\/](?:runs|observability)(?:[\\/]|$)/.test(path.relative(repoRoot, source)),
    });
  }
  await cp(path.join(repoRoot, "package.json"), path.join(root, "package.json"));
  const aofDir = path.join(root, ".aof");
  await mkdir(aofDir, { recursive: true });
  await writeFile(path.join(aofDir, "aof.config.json"), `${JSON.stringify({ name: "gate-fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`, "utf8");
  await writeRegistry({ aofDir }, RECORDS);
  await mkdir(path.join(root, "wiki", "work"), { recursive: true });
  return { root, aofDir };
}

function runGate(root) {
  const globalHome = path.join(root, ".global-home");
  return spawnSyncHardened(process.execPath, GATE_ARGV, {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, AOF_GLOBAL_HOME: globalHome },
    timeout: 240_000,
  });
}

// The mutations the non-vacuity row drives through the lint — each a way of keeping `needs: [gate]`
// or the deploy condition SATISFIED while the gate's answer no longer decides anything, plus the
// edge removal itself. Every one must produce at least one problem.
const REACHABILITY_MUTATIONS = [
  { name: "the gate's needs edge removed", apply: (raw) => raw.replace(/^ {4}needs:.*$/m, "") },
  { name: "continue-on-error on the gate job", apply: (raw) => raw.replace(/^( {4})runs-on: ubuntu-latest$/m, (line, pad) => `${line}\n${pad}continue-on-error: true`) },
  { name: "continue-on-error on the gate's check step", apply: (raw) => raw.replace(/^( {6})- name: Run story 79's drift control.*$/m, (line, pad) => `${line}\n${pad}  continue-on-error: true`) },
  { name: "`|| true` appended to the gate's run line", apply: (raw) => raw.replace(/(node scripts\/test\.mjs --only [^\n]*)$/m, "$1 || true") },
  { name: "`!cancelled() &&` prefixed to the deploy condition", apply: (raw) => raw.replace(/^( {4})if: (github\.event_name[^\n]*)$/m, "$1if: ${{ !cancelled() && $2 }}") },
  { name: "`needs.gate.result != 'skipped' &&` prefixed to the deploy condition", apply: (raw) => raw.replace(/^( {4})if: (github\.event_name[^\n]*)$/m, "$1if: needs.gate.result != 'skipped' && $2") },
  { name: "the deploy's job-level if moved onto the deploy-pages step", apply: (raw) => raw.replace(/^ {4}if: (github\.event_name[^\n]*)\n/m, "").replace(/^( {6})- name: Deploy to GitHub Pages$/m, (line, pad) => `${line}\n${pad}  if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'`) },
  { name: "the deploy's ref guard removed", apply: (raw) => raw.replace(/ && github\.ref == 'refs\/heads\/main'/, "") },
];

export const siteBuildTests = [
  // ══════ 00_the-site-has-a-publishing-path.feature: "the repository gains exactly one publishing workflow" ══════
  {
    name: "site-build/00 the repository gains exactly one publishing workflow: pages.yml is present, release.yml is untouched in claim, and no third workflow is added",
    run: async () => {
      const members = (await readdir(workflowsDir)).sort();
      assert.deepEqual(members, ["pages.yml", "release.yml"], ".github/workflows/ holds the release workflow and the ONE publishing workflow, and nothing else");
      // release.yml's claims — its legs, triggers, permissions and jobs — are held by the 21 rows of
      // `release-workflow-lint.test.mjs`; what this row adds is that the two workflows share no
      // vocabulary, so neither could have been edited into the other's shape.
      const release = stripYamlComments(readWorkflowText(path.join(workflowsDir, "release.yml")));
      const pages = stripYamlComments(readWorkflow());
      for (const token of ["deploy-pages", "jekyll", "id-token", "upload-pages-artifact", BUILDER]) {
        assert.ok(!release.includes(token), `release.yml carries none of the publishing path (found ${token})`);
      }
      for (const token of ["build-sea", "codesign", "softprops", "SHA256SUMS", "contents: write"]) {
        assert.ok(!pages.includes(token), `pages.yml carries none of the release path (found ${token})`);
      }
    },
  },

  // ══════ 00: "the deploy runs only after the gate passes" ══════
  {
    name: "site-build/00 the deploy runs only after the gate passes: the deploying job declares the gate in its needs, and no deploying job is reachable without the gate having succeeded",
    run: async () => {
      const verdict = lintPagesWorkflow(readWorkflow());
      assert.deepEqual(verdict.problems, [], `the shipped workflow lints clean:\n  ${verdict.problems.join("\n  ")}`);
      assert.ok(verdict.deploy && verdict.gate, `a deploy job (${verdict.deploy}) and a gate job (${verdict.gate}) are both declared`);
      assert.ok(verdict.needs.includes(verdict.gate), `job "${verdict.deploy}" needs "${verdict.gate}" (needs: [${verdict.needs.join(", ")}])`);
      assert.doesNotMatch(verdict.deployIf ?? "", /always\(\)|failure\(\)|cancelled\(\)|needs\.\w+\.result/, "and its condition never overrides a failed need — `needs` without an override is what makes the deploy unreachable when the gate fails");
      assert.doesNotMatch(verdict.gateBody, /continue-on-error|\|\|\s*true/, "and the gate cannot fail softly");
      // No other job deploys (the clean verdict above includes "exactly one job deploys"), so
      // there is no second path onto the site.
      assert.deepEqual(verdict.jobs, [verdict.gate, verdict.deploy], "the workflow's jobs are the gate and the deploy, in that order");
    },
  },

  // ══════ 00: "the gate answers on a pull request and the deploy does not" ══════
  {
    name: "site-build/00 the gate answers on a pull request and the deploy does not: the gate runs on pull_request and push to main, the deploy on push to main and a workflow_dispatch of main, never for a pull request or another ref",
    run: async () => {
      const verdict = lintPagesWorkflow(readWorkflow());
      assert.deepEqual(verdict.problems, []);
      assert.ok(verdict.triggers.pull_request?.includes("main"), "the workflow triggers on a pull_request targeting main");
      assert.ok(verdict.triggers.push?.includes("main"), "and on a push to main");
      assert.equal(verdict.triggers.workflow_dispatch, true, "and on a manual dispatch");
      assert.equal(verdict.gateIf, null, "the gate job carries no condition, so it runs on every one of those triggers");
      assert.match(verdict.deployIf, /github\.event_name\s*!=\s*'pull_request'/, "the deploy job runs unless the event is a pull request — so it runs for the push and the dispatch and not for the PR");
      assert.match(verdict.deployIf, /github\.ref\s*==\s*'refs\/heads\/main'/, "and only for main — a dispatch started from another branch does not publish that branch at the canonical address");
    },
  },

  // ══════ 00: "the publishing token is scoped to the job that publishes" ══════
  {
    name: "site-build/00 the publishing token is scoped to the job that publishes: no top-level write scope, pages: write + id-token: write on the deploy job alone, contents: read and nothing more on the gate",
    run: async () => {
      const verdict = lintPagesWorkflow(readWorkflow());
      assert.deepEqual(verdict.problems, []);
      assert.ok(verdict.permissions.top, "a top-level permissions block is declared");
      assert.ok(Object.values(verdict.permissions.top).every((level) => level !== "write"), `the top-level block grants no write scope: ${JSON.stringify(verdict.permissions.top)}`);
      const deploy = verdict.permissions.jobs[verdict.deploy];
      assert.equal(deploy?.pages, "write", "pages: write is granted on the deploy job");
      assert.equal(deploy?.["id-token"], "write", "id-token: write is granted on the deploy job");
      for (const [name, scopes] of Object.entries(verdict.permissions.jobs)) {
        if (name === verdict.deploy) continue;
        assert.notEqual(scopes?.pages, "write", `${name} is not granted pages: write`);
        assert.notEqual(scopes?.["id-token"], "write", `${name} is not granted id-token: write`);
      }
      assert.deepEqual(verdict.permissions.jobs[verdict.gate], { contents: "read" }, "the gate job is granted contents: read and nothing more");
    },
  },

  // ══════ 00: "two pushes in quick succession do not race each other onto the site" ══════
  {
    name: "site-build/00 two pushes in quick succession do not race each other onto the site: the deploy job declares a concurrency group and an in-flight deploy is not cancelled by a newer one",
    run: async () => {
      const verdict = lintPagesWorkflow(readWorkflow());
      assert.deepEqual(verdict.problems, []);
      assert.ok(verdict.concurrency.group, `the deploy job declares a concurrency group (${verdict.concurrency.group})`);
      assert.equal(verdict.concurrency.cancelInProgress, "false", "and cancel-in-progress is false, so the newer run queues behind the in-flight deploy");
    },
  },

  // ══════ 00: "the site's shell is committed and its content is not" ══════
  {
    name: "site-build/00 the site's shell is committed and its content is not: docs/ holds the config, the layout and the landing page, no build-produced page, and the staging directory is git-ignored",
    run: async () => {
      const files = await listFiles(path.join(repoRoot, SHELL_DIR));
      assert.deepEqual(files, ["_config.yml", "_layouts/default.html", "index.md"], "docs/ holds exactly the site's configuration, its layout and its landing page");

      // No file in the shell is a staged page (the builder's provenance envelope) or carries a
      // manifest source's bytes.
      const manifest = resolveManifest(repoRoot, await loadWorkspace(repoRoot));
      // A composed page has no source file — its bytes exist only in the staging — so it is checked
      // by page name alone below.
      const sources = await Promise.all(manifest.map((entry) => (entry.absolute ? readFile(entry.absolute, "utf8") : "")));
      for (const file of files) {
        const text = await readFile(path.join(repoRoot, SHELL_DIR, file), "utf8");
        assert.ok(!carriesProvenanceEnvelope(text), `${file} is not a page the build produced`);
        for (const [index, source] of sources.entries()) {
          if (!source) continue;
          assert.ok(!text.includes(source.trim()), `${file} does not carry the bytes of ${manifest[index].source}`);
        }
        assert.ok(!manifest.some((entry) => entry.page === file), `${file} is not a manifest page name`);
      }

      // The landing page links every page the build stages — by permalink, which is what the
      // build stamps into each page's front matter.
      const landing = await readFile(path.join(repoRoot, SHELL_DIR, "index.md"), "utf8");
      for (const entry of MANIFEST) assert.ok(landing.includes(`'${entry.permalink}'`), `index.md links ${entry.permalink}`);

      // Ignored BY GIT'S OWN MATCHER — never a grep of .gitignore (the m23/R3 near-miss). Probed
      // through a file INSIDE each directory: `check-ignore` on a bare `dir/` pathspec answered
      // from an empty line (measured on this checkout), while a member path is matched the way a
      // real staged file would be. The atomic-swap sibling is ignored too, so a hard kill mid-swap
      // strands nothing git would offer to commit. And the control that the matcher can say no:
      // the shell's own landing page is not ignored.
      const ignored = gitCheckIgnore(`${DEFAULT_OUT}/index.md`);
      assert.equal(ignored.status, 0, `git ignores a file under ${DEFAULT_OUT}/ (stderr: ${ignored.stderr})`);
      const swap = gitCheckIgnore(`.${DEFAULT_OUT}-abc123/index.md`);
      assert.equal(swap.status, 0, `git ignores the builder's atomic-swap sibling .${DEFAULT_OUT}-*/ (stderr: ${swap.stderr})`);
      const tracked = gitCheckIgnore(`${SHELL_DIR}/index.md`);
      assert.equal(tracked.status, 1, `and does not ignore ${SHELL_DIR}/index.md — the matcher can say no`);
    },
  },

  // ══════ 00: Scenario Outline "the lint reads configuration, never the workflow's own prose" ══════
  {
    name: "site-build/00 the lint reads configuration, never the workflow's own prose — outline: a configuration line holding `needs` is read; a comment explaining a choice with `needs` is not; a comment naming `pull_request` is not",
    run: async () => {
      const raw = readWorkflow();
      const commentLines = raw.split("\n").filter((line) => /^\s*#/.test(line));
      // The shipped workflow really does carry the prose the outline names — otherwise the rows
      // below would be proving the lint blind to nothing.
      assert.ok(commentLines.some((line) => /needs/.test(line)), "the workflow carries a comment explaining a choice that names `needs`");
      assert.ok(commentLines.some((line) => /pull_request/.test(line)), "and a comment naming the `pull_request` trigger");

      // Row 1 — configuration line, token `needs` → read as configuration.
      const shipped = lintPagesWorkflow(raw);
      assert.ok(shipped.needs.includes(shipped.gate), `the configuration line \`needs: [${shipped.gate}]\` is read as the deploy job's needs`);

      // Row 2 — a comment explaining a choice, token `needs` → NOT read as configuration. The
      // configuration line is removed and the comments stay; if the lint read prose, the edge
      // would still appear to exist.
      const withoutEdge = raw.replace(/^ {4}needs:.*$/m, "");
      assert.ok(withoutEdge.split("\n").filter((line) => /^\s*#/.test(line)).some((line) => /needs/.test(line)), "the comments naming `needs` survive the mutation");
      const noEdge = lintPagesWorkflow(withoutEdge);
      assert.deepEqual(noEdge.needs, [], "with the configuration line gone, the lint reads no needs — the comment is not read as one");

      // Row 3 — a comment naming a trigger, token `pull_request` → NOT read as configuration.
      const withoutTrigger = raw.replace(/^  pull_request:\s*\n(?:    .*\n)*/m, "");
      assert.ok(withoutTrigger.split("\n").filter((line) => /^\s*#/.test(line)).some((line) => /pull_request/.test(line)), "the comments naming `pull_request` survive the mutation");
      const noTrigger = lintPagesWorkflow(withoutTrigger);
      assert.equal(noTrigger.triggers.pull_request, null, "with the trigger gone, the lint reads no pull_request trigger — the comment is not read as one");
      assert.ok(noTrigger.problems.some((problem) => /pull_request/.test(problem)), "and it reports the missing trigger");
    },
  },

  // ══════ 00: "the lint is line-ending agnostic, so it answers the same on either checkout" ══════
  {
    name: "site-build/00 the lint is line-ending agnostic: the CRLF and LF readings of the workflow yield identical verdicts, and every comment is stripped in both",
    run: async () => {
      const lf = readWorkflow();
      const crlf = lf.split("\n").join("\r\n");
      assert.ok(crlf.includes("\r\n") && !lf.includes("\r"), "the two readings really differ in their line endings");
      const fromLf = lintPagesWorkflow(lf);
      const fromCrlf = lintPagesWorkflow(crlf);
      assert.deepEqual(fromCrlf, fromLf, "the verdict is identical on either checkout");
      assert.deepEqual(fromLf.problems, [], "and it is the clean verdict");
      for (const [label, text] of [["LF", lf], ["CRLF", crlf]]) {
        const stripped = stripYamlComments(normaliseEol(text));
        assert.ok(!stripped.includes("#"), `every comment is stripped from the ${label} reading`);
        assert.ok(!stripped.includes("\r"), `and no carriage return survives the ${label} read boundary`);
      }
      // The trap itself, demonstrated: stripping WITHOUT normalising leaves every comment in place
      // on the CRLF reading. That is the defect the shared read boundary exists to close.
      const unnormalised = stripYamlComments(crlf);
      assert.ok(unnormalised.includes("#"), "without the normalisation, the per-line strip matches nothing on a CRLF reading — which is why the boundary is a criterion");
    },
  },

  // ══════ 00: "the lint is non-vacuous" ══════
  {
    name: "site-build/00 the lint is non-vacuous: with the gate's needs edge removed it fails naming the deploy job and the gate — and every soft-failure route around the edge (continue-on-error on the job or the step, `|| true`, `!cancelled()`, `needs.gate.result`, a step-level if, a missing ref guard) is refused too",
    run: async () => {
      const raw = readWorkflow();
      const shipped = lintPagesWorkflow(raw);
      assert.deepEqual(shipped.problems, [], "the shipped workflow is clean, so every failure below is its mutation's");

      for (const mutation of REACHABILITY_MUTATIONS) {
        const mutated = mutation.apply(raw);
        assert.notEqual(mutated, raw, `${mutation.name}: the mutation applied`);
        const verdict = lintPagesWorkflow(mutated);
        assert.ok(verdict.problems.length > 0, `${mutation.name}: the lint fails`);
      }

      // The edge removal names both ends.
      const verdict = lintPagesWorkflow(REACHABILITY_MUTATIONS[0].apply(raw));
      const edge = verdict.problems.find((problem) => /deploys without waiting for the gate/.test(problem));
      assert.ok(edge, `one problem is the missing edge:\n  ${verdict.problems.join("\n  ")}`);
      assert.ok(edge.includes(`"${shipped.deploy}"`), `it names the deploy job (${shipped.deploy})`);
      assert.ok(edge.includes(`"${shipped.gate}"`), `and the gate it no longer waits for (${shipped.gate})`);

      // And the step-level `if` is refused for the RIGHT reason: the job-level read did not find it.
      const stepIf = lintPagesWorkflow(REACHABILITY_MUTATIONS.find((mutation) => /step/.test(mutation.name) && /if/.test(mutation.name)).apply(raw));
      assert.equal(stepIf.deployIf, null, "a step-level if is not read as the job's condition");
    },
  },

  // ══════ 01_the-graph-page-is-projected-not-copied.feature: Scenario Outline "every published page states where it came from and how it is kept true" ══════
  {
    name: "site-build/01 every published page states where it came from and how it is kept true — outline: the loop document as `generated` naming `aof work loops document --write`, the Delivered page as `generated` naming the site build and its OUTCOME.md glob as source",
    run: async () => {
      await withTempDir("aof-site-out-", async (out) => {
        const result = await buildSite({ root: repoRoot, out });
        const workspace = await loadWorkspace(repoRoot);
        const documentSource = path.relative(repoRoot, loopDocumentPath(workspace)).split(path.sep).join("/");
        const rows = [
          { source: documentSource, kind: "generated", regenerate: REGENERATE_COMMAND },
          { source: DELIVERED_SOURCE, kind: "generated", regenerate: BUILD_COMMAND },
        ];
        assert.equal(result.pages.length, rows.length, "the build stages exactly the outline's pages");
        for (const row of rows) {
          const page = result.pages.find((entry) => entry.source === row.source);
          assert.ok(page, `a page was projected from ${row.source}`);
          const { frontMatter } = partsOfStagedPage(await readFile(path.join(out, page.page), "utf8"));
          assert.equal(frontMatterValue(frontMatter, "source"), row.source, `the page names ${row.source} as its source`);
          assert.equal(frontMatterValue(frontMatter, "kind"), row.kind, `and declares itself ${row.kind}`);
          if (row.kind === "generated") {
            assert.equal(frontMatterValue(frontMatter, "regenerate"), row.regenerate, `and names \`${row.regenerate}\` as the remedy`);
          } else {
            assert.equal(frontMatterValue(frontMatter, "regenerate"), undefined, "and names no regeneration command");
            assert.ok(!frontMatter.includes(REGENERATE_COMMAND), "not even in passing");
          }
        }
      });
    },
  },

  // ══════ 01: "an authored page is published as authored" ══════
  {
    name: "site-build/01 an authored page is published as authored: its body is byte-identical to the source's, the only bytes the build added are the front matter, its provenance and the Liquid guard — and the guard is `{% raw %}` opening the body and `{% endraw %}` closing it, nothing else",
    run: async () => {
      assert.equal(RAW_OPEN, "{% raw %}\n", "the guard opens the body with `{% raw %}`");
      assert.equal(RAW_CLOSE, "\n{% endraw %}\n", "and closes it with `{% endraw %}`");
      // The shipped manifest carries no authored page (the site documents what is delivered, and
      // both of its pages are generated), so the capability is exercised through the manifest
      // parameter over a fixture whose body holds exactly what Liquid would otherwise eat.
      assert.equal(MANIFEST.filter((entry) => entry.kind === "authored").length, 0, "the shipped manifest stages no authored page");
      await withSiteFixture({}, async ({ root }) => {
        const source = "# A fixture — authored\n\nA hexagon {{ node }} and a tag {% if x %} — kept as written.\n";
        await mkdir(path.join(root, "wiki", "planning"), { recursive: true });
        await writeFile(path.join(root, "wiki", "planning", "fixture.md"), source, "utf8");
        const out = path.join(root, DEFAULT_OUT);
        const result = await buildSite({ root, out, manifest: [{ kind: "authored", source: "wiki/planning/fixture.md", permalink: "/fixture/" }] });
        const authored = result.pages.filter((page) => page.kind === "authored");
        assert.equal(authored.length, 1, "the fixture manifest's one authored page is staged");
        for (const page of authored) {
          const staged = await readFile(path.join(out, page.page), "utf8");
          const { frontMatter, body } = partsOfStagedPage(staged);
          assert.equal(body, source, `${page.page}'s body is byte-identical to ${page.source}`);
          assert.equal(staged, `${frontMatter}${RAW_OPEN}${source}${RAW_CLOSE}`, "and the page is exactly front matter + guard + source + guard — nothing else was added");
          const keys = [...frontMatter.matchAll(/^([a-z]+):/gm)].map((match) => match[1]).sort();
          assert.deepEqual(keys, ["kind", "layout", "permalink", "source", "title"], "the front matter carries the page's provenance and its Jekyll addressing, and no regeneration command");
        }
      });
    },
  },

  // ══════ the Delivered page (the site documents what is delivered — added at the re-scope, 2026-09-13) ══════
  {
    name: "site-build/delivered the page is composed from every ACCEPTED item's outcome and nothing else: done items in, other statuses and un-numbered folders out, newest first with a milestone before its stories, only the `## Delivered` section, comments stripped, en dashes, a literal `{% endraw %}` spaced so it cannot close the guard, and a TOC of items",
    run: async () => {
      await withSiteFixture({}, async ({ root }) => {
        await writeOutcomeFixture(root, "50_milestone_alpha", { record: "SPEC.md", status: "done", title: "50 · Alpha", delivered: "### One thing\nThe system is X — measured.\n\n### Another\nThe guard is `{% raw %}…{% endraw %}`." });
        await writeOutcomeFixture(root, "50_milestone_alpha/stories/01_story_beta", { record: "STORY.md", status: "done", title: "50/01 · Beta", delivered: "### A story capability\nIt IS." });
        await writeOutcomeFixture(root, "51_story_gamma", { record: "STORY.md", status: "in-review", title: "51 · Gamma", delivered: "### Not yet\nNot accepted." });
        await writeOutcomeFixture(root, "52_chore_delta", { record: "CHORE.md", status: "done", title: "52 · Delta", delivered: "### The chore's state\nPinned." });
        await writeOutcomeFixture(root, "backlog/epsilon_story", { record: "STORY.md", status: "done", title: "Epsilon", delivered: "### Unnumbered\nNever." });
        const items = await collectDelivered(root, await loadWorkspace(root));
        assert.deepEqual(items.map((item) => item.label), ["52", "50", "50/01"], "done, numbered items only — newest first, the milestone before its story");
        assert.deepEqual(items.map((item) => item.title), ["Delta", "Alpha", "Beta"], "titles come from the outcome's H1 with the ref and the ' — Outcome' suffix removed");
        const out = path.join(root, DEFAULT_OUT);
        const result = await buildSite({ root, out });
        const page = result.pages.find((entry) => entry.permalink === "/delivered/");
        assert.ok(page, "the Delivered page is staged");
        const { frontMatter, body } = partsOfStagedPage(await readFile(path.join(out, page.page), "utf8"));
        assert.equal(frontMatterValue(frontMatter, "kind"), "generated");
        assert.equal(frontMatterValue(frontMatter, "regenerate"), BUILD_COMMAND);
        assert.equal(frontMatterValue(frontMatter, "source"), DELIVERED_SOURCE);
        assert.equal(frontMatterValue(frontMatter, "title"), "Delivered");
        assert.match(body, /^\* TOC\n\{:toc\}$/m, "the page opens with kramdown's TOC macro");
        assert.deepEqual([...body.matchAll(/^## (.+)$/gm)].map((match) => match[1]), ["52 · Delta", "50 · Alpha", "50/01 · Beta"], "one H2 per accepted item, in order");
        assert.equal((body.match(/^### /gm) ?? []).length, 4, "every capability of every accepted item, and none of the excluded ones");
        assert.ok(!body.includes("Not accepted") && !body.includes("Never."), "the in-review item and the un-numbered folder are absent");
        assert.ok(!body.includes("stays in the record") && !body.includes("a comment the page must not carry"), "assumptions and comments do not travel");
        assert.ok(!body.includes("—"), "no em dash survives on the composed page");
        assert.ok(body.includes("The system is X – measured."), "an em dash in a record reads as an en dash on the page");
        assert.ok(body.includes("{ % endraw % }"), "a literal closer is spaced out");
        assert.ok(!/\{%-?\s*endraw\s*-?%\}/.test(body), "so nothing in the body can close the Liquid guard");
        assert.ok(body.includes("3 items, 4 capabilities"), "the intro counts what it lists");
      });
      // And over THIS repository: everything listed is an accepted item, and the list is not empty.
      const real = await collectDelivered(repoRoot, await loadWorkspace(repoRoot));
      assert.ok(real.length >= 100, `the repository's accepted items carry outcomes (${real.length})`);
      assert.equal(houseStyle("a — b {% endraw %}"), "a – b { % endraw % }", "the house style is the one transformation, applied once");
    },
  },

  // ══════ 01: "a staged source that is not there fails the build" ══════
  {
    name: "site-build/01 a staged source that is not there fails the build: non-zero exit naming the missing path, no page staged for it, and no partially staged site left behind",
    run: async () => {
      const missing = path.relative(repoRoot, loopDocumentPath(await loadWorkspace(repoRoot))).split(path.sep).join("/");
      await withSiteFixture({ omit: missing }, async ({ root }) => {
        const out = path.join(root, DEFAULT_OUT);
        await assert.rejects(
          buildSite({ root, out }),
          (error) => error instanceof SiteBuildError && error.code === "site-source-missing" && error.message.includes(missing) && path.isAbsolute(error.path),
          "the build refuses, the refusal names the missing path, and its `path` is the absolute one",
        );
        assert.equal(await exists(out), false, "no staged site is left for the deploy step to publish");
        const stranded = (await readdir(root)).filter((name) => name.startsWith(`.${DEFAULT_OUT}-`));
        assert.deepEqual(stranded, [], "and no temporary staging directory is stranded beside it");
        const everything = await listFiles(root);
        assert.ok(!everything.some((file) => path.basename(file) === path.basename(missing)), "no page was staged for the missing source anywhere in the tree");

        // The same through the CLI face the workflow calls — the exit code is what stops the deploy.
        const cli = spawnSyncHardened(process.execPath, [path.join(repoRoot, BUILDER), "--root", root, "--out", DEFAULT_OUT], {
          cwd: root,
          encoding: "utf8",
          env: { ...process.env, AOF_GLOBAL_HOME: path.join(root, ".global-home") },
        });
        assert.notEqual(cli.status, 0, `the builder exits non-zero (stdout: ${cli.stdout})`);
        assert.ok(cli.stderr.includes(missing), `and stderr names the missing path: ${cli.stderr}`);
        assert.equal(await exists(out), false, "still no staged site");
      });
    },
  },

  // ══════ 01: "the build writes only into the directory it stages" ══════
  {
    name: "site-build/01 the build writes only into the directory it stages: every file it created is inside the staged directory, the loop document is byte-identical, and nothing under docs/ moved",
    run: async () => {
      // Over a whole tree, so the claim is about EVERY file and not a chosen few.
      await withSiteFixture({}, async ({ root }) => {
        const before = await snapshot(root);
        const result = await buildSite({ root, out: DEFAULT_OUT });
        const after = await snapshot(root);
        const outPrefix = `${path.relative(root, result.out).split(path.sep).join("/")}/`;
        const touched = Object.keys(after).filter((key) => before[key] !== after[key]);
        assert.ok(touched.length > 0, "the build created files");
        assert.deepEqual(touched.filter((key) => !key.startsWith(outPrefix)), [], "every file it created or modified is inside the staged site directory");
        for (const key of Object.keys(before)) assert.equal(after[key], before[key], `${key} is unchanged`);
      });
      // And over THIS repository: the document and the shell, before and after.
      await withTempDir("aof-site-out-", async (out) => {
        const workspace = await loadWorkspace(repoRoot);
        const documentPath = loopDocumentPath(workspace);
        const document = await readFile(documentPath);
        const shell = await snapshot(path.join(repoRoot, SHELL_DIR));
        await buildSite({ root: repoRoot, out });
        assert.ok(document.equals(await readFile(documentPath)), `${path.relative(repoRoot, documentPath)} is left byte-identical`);
        assert.deepEqual(await snapshot(path.join(repoRoot, SHELL_DIR)), shell, "and no file under docs/ is modified");
      });
    },
  },

  // ══════ 01 (review round 1, finding 1): the target is cleared only when it is a previous staging ══════
  {
    name: "site-build/01 the build replaces only its own previous staging: `--out` at a directory holding a foreign file is refused by name, the tree is left byte-untouched, and no temporary directory is left behind — while a previous staging is replaced",
    run: async () => {
      await withSiteFixture({}, async ({ root }) => {
        // (a) A directory that is somebody's tree — measured at review as `--out wiki`, which the
        // first cut deleted at exit 0.
        const foreign = path.join(root, "somebody-elses");
        await mkdir(path.join(foreign, "nested"), { recursive: true });
        await writeFile(path.join(foreign, "notes.txt"), "not yours\n", "utf8");
        await writeFile(path.join(foreign, "nested", "keep.md"), "# keep\n", "utf8");
        const before = await snapshot(root);
        await assert.rejects(
          buildSite({ root, out: foreign }),
          (error) => error instanceof SiteBuildError && error.code === "site-out-foreign" && error.message.includes(foreign) && error.path === foreign,
          "the build refuses, naming the directory it would not clear",
        );
        assert.deepEqual(await snapshot(root), before, "and the whole tree is byte-untouched");
        assert.deepEqual((await readdir(root)).filter((name) => name.startsWith(".somebody-elses-")), [], "and no temporary directory was left beside the target");

        // (b) A directory that LOOKS like a staging — it has the shell's config — but also holds a
        // file this builder did not stage. Refused too, naming the file.
        const mixed = path.join(root, "mixed");
        await mkdir(mixed, { recursive: true });
        await cp(path.join(root, SHELL_DIR, "_config.yml"), path.join(mixed, "_config.yml"));
        await writeFile(path.join(mixed, "stray.md"), "# not staged by the builder\n", "utf8");
        const beforeMixed = await snapshot(root);
        await assert.rejects(
          buildSite({ root, out: mixed }),
          (error) => error instanceof SiteBuildError && error.code === "site-out-foreign" && error.message.includes("stray.md"),
          "a staging-shaped directory with a foreign file is refused, naming the file",
        );
        assert.deepEqual(await snapshot(root), beforeMixed, "and nothing moved");

        // (c) THE CONTROL: a previous staging IS replaced, and an empty target is fine.
        const first = await buildSite({ root, out: DEFAULT_OUT });
        assert.ok(carriesProvenanceEnvelope(await readFile(path.join(first.out, first.pages[0].page), "utf8")), "the first build's pages carry the envelope the refusal looks for");
        const second = await buildSite({ root, out: DEFAULT_OUT });
        assert.equal(second.out, first.out, "the second build replaced the first in place");
        const empty = path.join(root, "empty-target");
        await mkdir(empty, { recursive: true });
        const third = await buildSite({ root, out: empty });
        assert.equal(third.out, empty, "an empty existing target is staged into");
      });
    },
  },

  // ══════ 01: "the build is a projection, so running it twice changes nothing" ══════
  {
    name: "site-build/01 the build is a projection, so running it twice over an unchanged tree stages a byte-identical site",
    run: async () => {
      await withSiteFixture({}, async ({ root }) => {
        const first = await buildSite({ root, out: DEFAULT_OUT });
        const one = await snapshot(first.out);
        const second = await buildSite({ root, out: DEFAULT_OUT });
        assert.equal(second.out, first.out);
        assert.deepEqual(await snapshot(second.out), one, "the second run's staged site is byte-identical to the first's");
        assert.ok(Object.keys(one).length >= 3 + MANIFEST.length, `the comparison covered the shell and every page (${Object.keys(one).length} files)`);
      });
    },
  },

  // ══════ 01 (review round 1, finding 2): the deploy job's no-`npm ci` premise, held ══════
  {
    name: "site-build/01 the builder's static import closure holds node built-ins only — no bare specifier and no computed dynamic import anywhere it reaches — which is the premise on which the deploy job stages without `npm ci`",
    run: async () => {
      const closure = await staticImportClosure(BUILDER);
      assert.ok(closure.modules.includes(BUILDER), "the walk started at the builder");
      assert.ok(closure.modules.length >= 5, `the closure was actually walked (${closure.modules.length} modules): ${closure.modules.join(", ")}`);
      assert.deepEqual(closure.bare, [], `no module the builder reaches imports a bare specifier — a dependency would need \`npm ci\` in the deploy job:\n  ${closure.bare.join("\n  ")}`);
      assert.deepEqual(closure.computed, [], `and no module the builder reaches carries a computed dynamic import, which the walk could not follow:\n  ${closure.computed.join("\n  ")}`);
      // And the workflow really does stage without installing — the premise this row holds.
      const verdict = lintPagesWorkflow(readWorkflow());
      assert.doesNotMatch(verdict.deployBody, /npm ci|npm install/, "the deploy job runs no package install");
      assert.match(verdict.deployBody, new RegExp(BUILDER.replace(/[./]/g, "\\$&")), "and it runs the builder");
    },
  },

  // ══════ 01: "the deploy is gated on story 79's control, run rather than re-implemented" ══════
  {
    name: "site-build/01 the deploy is gated on story 79's control, run rather than re-implemented: the gate job runs acd-loop-document-current through the project's own test command, isolated by AOF_GLOBAL_HOME, with no byte comparison and no regeneration of its own",
    run: async () => {
      const verdict = lintPagesWorkflow(readWorkflow());
      assert.deepEqual(verdict.problems, []);
      const gate = verdict.gateBody;
      assert.match(gate, /node scripts\/test\.mjs --only test\/arch\/loop\/acd-loop-document-current\.test\.mjs/, "the gate runs story 79's control through the project's own test command and its --only selection");
      assert.match(gate, /AOF_GLOBAL_HOME=/, "the run is isolated by AOF_GLOBAL_HOME, so it writes no fixture into a real ~/.aof");
      assert.doesNotMatch(gate, /git diff|\bcmp\b|\bdiff\b|sha256sum|md5sum/, "it holds no comparison of the document's bytes of its own");
      assert.doesNotMatch(gate, /loops document|loop-document --write|--write/, "and no regeneration of the document");
      // Nor does any other job: the whole workflow regenerates nothing.
      assert.doesNotMatch(stripYamlComments(readWorkflow()), /aof work loops|--write/, "no job in the workflow regenerates the document");
    },
  },

  // ══════ 01: "a registry edit without regeneration stops the deploy" ══════
  {
    name: "site-build/01 a registry edit without regeneration stops the deploy: run the way the workflow runs it, the gate passes on a current document, fails after a record is edited without regenerating (naming the document and the regeneration command), passes again once regenerated — and the deploy job's needs makes it unreachable in between",
    run: async () => {
      const fixture = await makeGateFixture();
      try {
        const workspace = await loadWorkspace(fixture.root);
        const documentName = path.basename(loopDocumentPath(workspace));
        await loopDocumentCommand.run({ write: true }, { workspace });

        // (1) THE FIXTURE PASSES FOR THE RIGHT REASON before anything drifts (m77/R8: a row that
        // passes against a belief about the loader proves nothing).
        const current = runGate(fixture.root);
        assert.equal(current.status, 0, `the gate passes on a current document\n--- stdout\n${current.stdout}\n--- stderr\n${current.stderr}`);
        assert.match(current.stdout, /^ok - arch\/79\/02 the committed loop document matches a fresh render/m, "and it is story 79's first entry that passed");

        // (2) A LOOP RECORD CHANGES AND THE DOCUMENT IS NOT REGENERATED.
        await writeRegistry({ aofDir: fixture.aofDir }, { ...RECORDS, "extra.md": loop("loop:extra", "Extra loop") });
        const drifted = runGate(fixture.root);
        assert.notEqual(drifted.status, 0, "the gate job fails");
        const output = `${drifted.stdout}\n${drifted.stderr}`;
        assert.match(output, /^not ok - arch\/79\/02 the committed loop document matches a fresh render/m, "on story 79's drift entry");
        assert.ok(output.includes(documentName), `the failure names the document (${documentName})`);
        assert.ok(output.includes(REGENERATE_COMMAND), `and the command that regenerates it (${REGENERATE_COMMAND})`);

        // (3) REGENERATING CLEARS IT (m78/R5: a finding a regeneration cannot clear is a defect in
        // the check, not a fact about the tree).
        await loopDocumentCommand.run({ write: true }, { workspace });
        const regenerated = runGate(fixture.root);
        assert.equal(regenerated.status, 0, `the gate passes again once the document is regenerated\n--- stderr\n${regenerated.stderr}`);
      } finally {
        await rm(fixture.root, { recursive: true, force: true });
      }

      // (4) THE DEPLOY DOES NOT RUN: it waits on the gate and never overrides a failed need.
      const verdict = lintPagesWorkflow(readWorkflow());
      assert.ok(verdict.needs.includes(verdict.gate), `the deploy job needs the gate (needs: [${verdict.needs.join(", ")}])`);
      assert.doesNotMatch(verdict.deployIf ?? "", /always\(\)|failure\(\)|cancelled\(\)|needs\.\w+\.result/, "and its condition cannot make it run after the gate failed");
    },
  },

  // ══════ 01: "the Mermaid include is pinned and targets what kramdown actually emits" ══════
  {
    name: "site-build/01 the Mermaid include is pinned and targets what kramdown actually emits: an exact version, the <pre><code class=\"language-mermaid\"> shape selected, the promotion done before Mermaid is loaded or run, and the library fetched only on a page with a fence",
    run: async () => {
      const layout = normaliseEol(await readFile(layoutPath, "utf8"));
      // Only the executable half of the layout: the file's own HTML comment explains the floating
      // tags it refuses, and the script's comments name the shapes — a lint that read either
      // would red on the explanation.
      const script = stripComments(layout.replace(/<!--[\s\S]*?-->/g, ""));
      const include = /import\(\s*["']([^"']*mermaid[^"']*)["']\s*\)/.exec(script);
      assert.ok(include, "the layout imports Mermaid from a CDN, dynamically");
      assert.match(include[1], /\/mermaid@\d+\.\d+\.\d+\//, `the include names an exact version: ${include[1]}`);
      assert.doesNotMatch(include[1], /@latest|@\^|@~|@\d+\/|@\d+\.\d+\//, "never a floating tag or a bare major/minor");

      assert.ok(script.includes("code.language-mermaid"), "it selects the shape kramdown emits for a ```mermaid fence — <pre><code class=\"language-mermaid\">");
      const promote = script.indexOf("code.language-mermaid");
      const load = script.indexOf(include[0]);
      const initialise = script.indexOf("mermaid.initialize(");
      const run = script.indexOf("mermaid.run(");
      assert.ok(initialise > 0 && run > 0, "Mermaid is initialised and run");
      assert.ok(promote < load && promote < initialise && promote < run, "and the fenced nodes are promoted BEFORE Mermaid is loaded, initialised or run over them");
      assert.match(script, /className\s*=\s*["']mermaid["']/, "each promoted node carries the class Mermaid looks for");
      assert.match(script, /querySelector:\s*["']pre\.mermaid["']/, "and Mermaid runs over the promoted nodes");
      assert.match(script, /if\s*\(\s*fences\.length\s*>\s*0\s*\)/, "and the library is fetched only when the page has a fence to draw");
    },
  },
];
