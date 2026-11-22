// FF-15404 / ADR-005: Codex shared files must pass ownership preflight.
// Ownership is a store boundary; the frozen bundle parity directory is not expanded.
//
// FF-20401 / 204/ADR-002 §1–§4: a co-authored file is merged, never written whole. For each path
// in the co-authored set, and each runtime that renders it, planning an apply over a user's file
// there yields a merge that records ownership and keeps the user's content — never "existing file
// will be overwritten".
//
// FF-20402 / 204/ADR-004 §1–§3: clean never deletes a user's content. For a lock entry carrying
// ownership, of every kind, clean's plan never emits `delete` while the file holds content outside
// aof's recorded fragment: it retracts, or it warns.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRenderPlan, planApplyActions, executeApplyActions, createLockManifest } from "../../../packages/core/src/render-plan.mjs";
import { coAuthoredOutput } from "../../../packages/core/src/codex-settings.mjs";
import { createCleanPlan } from "../../../packages/core/src/clean.mjs";
import { writeLock } from "../../../packages/core/src/lock.mjs";

export function ownershipProblems(actions) {
  return actions.filter(action => action.runtime === "codex" && ["create", "update", "delete"].includes(action.action)
    && action.expectedCurrentHash === undefined).map(action => `Codex mutation lacks a recorded preflight baseline: ${action.path}`);
}

// The user's own file at each co-authored path, and the text that must survive the merge.
const USER = {
  "AGENTS.md": ["# Agents\nMine.\n", "# Agents\nMine.\n"],
  "src/AGENTS.md": ["# Src\nMine.\n", "# Src\nMine.\n"],
  "CLAUDE.md": ["# Claude\nMine.\n", "# Claude\nMine.\n"],
  ".mcp.json": ['{\n  "mcpServers": {\n    "mine": {\n      "command": "my-mcp"\n    }\n  }\n}\n', '"mine": {\n      "command": "my-mcp"\n    }'],
  ".codex/config.toml": ['[mcp_servers.mine]\ncommand = "my-mcp"\n', '[mcp_servers.mine]\ncommand = "my-mcp"\n'],
  ".codex/hooks.json": ['{"hooks":{"Stop":[{"hooks":[{"type":"command","command":"echo mine"}]}]}}', '"command": "echo mine"'],
};

const everyCoAuthored = (docRuntimes) => ({
  resources: [{ id: "scoped", kind: "rule", runtimes: ["codex"], paths: ["src"], body: "Scoped guidance." }],
  workflows: [], packages: [],
  projectDocs: [{ id: "guide", targets: ["AGENTS.md", "CLAUDE.md"], runtimes: docRuntimes, body: "Project guidance." }],
  mcpServers: [{ id: "docs", transport: "stdio", command: "npx", runtimes: ["claude", "codex"] }],
  hooks: [{ id: "lint", event: "Stop", type: "command", command: "npm run lint", runtimes: ["codex"] }],
  settings: { codex: { model: "o3" } },
});

// What the control rejects: a co-authored action that writes whole, records nothing, or drops the user's text.
export function coAuthoredProblems(actions) {
  return actions.filter(action => coAuthoredOutput(action)).flatMap(action => [
    action.action === "conflict" ? `${action.runtime} ${action.path} refused: ${action.reason}` : null,
    action.reason === "existing file will be overwritten" ? `${action.runtime} ${action.path} is written whole` : null,
    !action.ownership ? `${action.runtime} ${action.path} records no ownership` : null,
    !String(action.content).includes(USER[action.path.replaceAll("\\", "/")]?.[1]) ? `${action.runtime} ${action.path} drops the user's content` : null,
  ].filter(Boolean));
}

// What FF-20402 rejects: a clean action that deletes a file whose lock entry carries ownership.
// Every such file in the probe holds the user's content beside aof's fragment.
export function cleanProblems(actions, entries) {
  const owned = new Map(entries.filter(entry => entry.ownership).map(entry => [entry.path.replaceAll("\\", "/"), entry.ownership.kind]));
  return actions.filter(action => owned.has(action.path.replaceAll("\\", "/")) && !["retract", "drift-warning"].includes(action.action))
    .map(action => `${owned.get(action.path.replaceAll("\\", "/"))} ${action.path} is planned ${action.action}, not retract or drift-warning`);
}

export const archTests = [
  { name: "FF-20401 co-authored output: every co-authored path, for every runtime that renders it, merges over the user's file with recorded ownership",
    run: async () => {
      const covered = new Set();
      // Codex and opencode cannot both render one AGENTS.md (204/ADR-006 §2), so opencode plans apart.
      for (const [runtimes, docRuntimes] of [[["claude", "codex"], ["claude", "codex"]], [["opencode"], ["opencode"]]]) {
        const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff20401-"));
        try {
          for (const [rel, [text]] of Object.entries(USER)) {
            await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
            await writeFile(path.join(root, rel), text);
          }
          const outputs = await createRenderPlan(everyCoAuthored(docRuntimes), { targetDir: root, runtimes });
          const actions = await planApplyActions(outputs, null, { targetDir: root });
          assert.deepEqual(coAuthoredProblems(actions), []);
          for (const action of actions.filter(item => coAuthoredOutput(item))) covered.add(`${action.runtime} ${action.path.replaceAll("\\", "/")}`);
        } finally { await rm(root, { recursive: true, force: true }); }
      }
      assert.deepEqual([...covered].sort(), ["claude .mcp.json", "claude CLAUDE.md", "codex .codex/config.toml", "codex .codex/hooks.json", "codex AGENTS.md", "codex src/AGENTS.md", "opencode AGENTS.md"]);
    } },
  { name: "FF-20402 clean never deletes a user's content: every owned entry, of every ownership kind, over a file holding the user's content, is retracted",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff20402-"));
      try {
        for (const [rel, [text]] of Object.entries(USER)) {
          await mkdir(path.dirname(path.join(root, rel)), { recursive: true });
          await writeFile(path.join(root, rel), text);
        }
        const config = everyCoAuthored(["claude", "codex"]);
        const outputs = await createRenderPlan(config, { targetDir: root, runtimes: ["claude", "codex"] });
        const actions = await planApplyActions(outputs, null, { targetDir: root });
        await executeApplyActions(actions);
        const lock = createLockManifest({ actions, desiredOutputs: outputs, previousLock: null, config, runtimes: ["claude", "codex"] });
        await writeLock(path.join(root, ".aof/aof.lock.json"), lock);
        const plan = await createCleanPlan(root);
        assert.deepEqual(cleanProblems(plan.actions, lock.files), []);
        const kinds = new Set(lock.files.filter(entry => entry.ownership).map(entry => entry.ownership.kind));
        assert.deepEqual([...kinds].sort(), ["guidance", "hooks", "mcp-servers", "toml"], "every ownership kind is probed");
        assert.ok(plan.actions.filter(action => action.action === "retract").length >= 6, "non-vacuity: the six co-authored files are retracted");
      } finally { await rm(root, { recursive: true, force: true }); }
    } },
  { name: "FF-20402 self-check: a planted delete of an owned entry trips the control, and a retract or drift-warning does not",
    run: async () => {
      const entries = [{ path: "AGENTS.md", ownership: { kind: "guidance" } }, { path: ".claude/agents/a.md" }];
      assert.deepEqual(cleanProblems([{ action: "delete", path: "AGENTS.md" }, { action: "delete", path: ".claude/agents/a.md" }], entries), ["guidance AGENTS.md is planned delete, not retract or drift-warning"]);
      assert.deepEqual(cleanProblems([{ action: "retract", path: "AGENTS.md" }], entries), []);
      assert.deepEqual(cleanProblems([{ action: "drift-warning", path: "AGENTS.md" }], entries), []);
    } },
  { name: "FF-20401 self-check: the predicate reads the path alone, and a planted whole-file write trips the control",
    run: async () => {
      for (const rel of Object.keys(USER)) for (const runtime of ["claude", "codex", "opencode"]) assert.equal(coAuthoredOutput({ path: rel, runtime }), true, `${runtime} ${rel}`);
      assert.equal(coAuthoredOutput({ path: ".claude/agents/review.md", runtime: "claude" }), false);
      const planted = { action: "update", runtime: "claude", path: "CLAUDE.md", reason: "existing file will be overwritten", content: "aof only\n" };
      assert.deepEqual(coAuthoredProblems([planted]), ["claude CLAUDE.md is written whole", "claude CLAUDE.md records no ownership", "claude CLAUDE.md drops the user's content"]);
    } },
  { name: "FF-15404 Codex output ownership: shared guidance merges and native collisions refuse before mutation",
    run: async () => {
      const root = await mkdtemp(path.join(os.tmpdir(), "aof-ff15404-"));
      try {
        await mkdir(path.join(root, ".codex/agents"), { recursive: true });
        await writeFile(path.join(root, "AGENTS.md"), "operator guidance\n");
        await writeFile(path.join(root, ".codex/agents/review.toml"), "operator agent\n");
        const outputs = await createRenderPlan({ resources: [
          { id: "review", kind: "agent", runtimes: ["codex"], body: "Review." },
          { id: "guidance", kind: "rule", runtimes: ["codex"], body: "Owned guidance." }
        ], workflows: [], packages: [] }, { targetDir: root, runtimes: ["codex"] });
        const actions = await planApplyActions(outputs, null, { targetDir: root, force: true });
        assert.equal(actions.find(action => action.resource.kind === "agent").action, "conflict");
        assert.match(actions.find(action => action.resource.kind === "rule").content, /^operator guidance\n/);
        assert.deepEqual(ownershipProblems(actions), []);
        await assert.rejects(executeApplyActions(actions), /unowned target/);
        assert.equal(await readFile(path.join(root, "AGENTS.md"), "utf8"), "operator guidance\n");
        assert.equal(await readFile(path.join(root, ".codex/agents/review.toml"), "utf8"), "operator agent\n");
      } finally { await rm(root, { recursive: true, force: true }); }
    } },
  { name: "FF-15404 self-check: planted unchecked overwrites and deletions trip the control",
    run: async () => {
      for (const action of ["create", "update", "delete"]) {
        assert.equal(ownershipProblems([{ runtime: "codex", path: "AGENTS.md", action }]).length, 1);
        assert.deepEqual(ownershipProblems([{ runtime: "codex", path: "AGENTS.md", action, expectedCurrentHash: null }]), []);
      }
    } }
];
