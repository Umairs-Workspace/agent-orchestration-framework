// FF-6203 — patches are whole, appliers are registry answers, and neither executes here.
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  ABSENT,
  ABSENT_READING,
  PROPOSAL_CLASSES,
  emitProposal,
  emitProposals,
} from "../../../src/work-tune/proposal.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const command = { id: "work:fixture-apply" };
const model = {
  nodes: [{
    id: "arbiter:fixture",
    path: "fixture.md",
    edges: { "parameter-tuning": [{ scheme: "config", operand: "work.fixture.rounds" }] },
  }],
};
const context = {
  model,
  acceptorReport: { valueAt: ABSENT_READING },
  projectConfig: {},
  resolveCommand: (id) => (id === command.id ? command : undefined),
};
const cap = (overrides = {}) => ({
  class: PROPOSAL_CLASSES.CAP_ADJUSTMENT,
  target: { kind: "config", key: "work.fixture.rounds" },
  assumedFrom: ABSENT_READING,
  to: 2,
  applierId: command.id,
  ...overrides,
});
// A bare imported process primitive is forbidden. A method named `exec` on an
// unrelated object (RegExp.exec is the live regression) is not process execution;
// property-form child-process access is already caught by the import ban above it.
const PROCESS_EXECUTION_CALL = /(?<![\w$.])(?:exec|execFile|execFileSync|execSync|spawn|spawnSync)\s*\(/u;
const CHILD_PROCESS_LOAD = /(?:\bfrom\s*["'](?:node:)?child_process["']|\bimport\s*["'](?:node:)?child_process["']|\bimport\s*\(\s*["'](?:node:)?child_process["']\s*\)|\brequire\s*\(\s*["'](?:node:)?child_process["']\s*\))/u;

export const archTests = [
  {
    name: "arch/62 FF-6203 every patch has target from and to and no patchless proposal has an applier",
    run: () => {
      const result = emitProposals([
        cap(),
        {
          class: PROPOSAL_CLASSES.MODEL_REALLOCATION,
          target: { kind: "model", role: "developer" },
          assumedFrom: ABSENT_READING,
          to: "model-b",
          applierId: command.id,
        },
        { class: PROPOSAL_CLASSES.PROMPT_REVISION, target: { kind: "prompt", path: "p.md" }, applierId: command.id },
        { class: PROPOSAL_CLASSES.STORY_SIZING, applierId: command.id },
      ], context);
      for (const proposal of result.proposals) {
        if (proposal.patch == null) {
          assert.equal(proposal.applier, null);
          assert.ok(proposal.reason?.code);
          continue;
        }
        assert.ok(proposal.patch.target);
        assert.equal(Object.hasOwn(proposal.patch, "from"), true);
        assert.equal(Object.hasOwn(proposal.patch, "to"), true);
        if (proposal.applier != null) assert.ok(context.resolveCommand(proposal.applier));
      }
    },
  },
  {
    name: "arch/62 FF-6203 a refused applier leaves the complete patch reachable",
    run: () => {
      const proposal = emitProposal(cap({ applierId: "unknown" }), context).proposal;
      assert.ok(proposal.patch);
      assert.equal(proposal.patch.from, ABSENT);
      assert.equal(proposal.patch.to, 2);
      assert.equal(proposal.applier, null);
      assert.equal(proposal.reason.code, "applier-not-registered");
    },
  },
  {
    name: "arch/62 FF-6203 work-tune contains no process execution or static command-core dependency",
    run: async () => {
      const dir = path.join(root, "src", "work-tune");
      for (const name of await readdir(dir)) {
        if (!name.endsWith(".mjs")) continue;
        const source = await readFile(path.join(dir, name), "utf8");
        assert.doesNotMatch(source, CHILD_PROCESS_LOAD, `${name} must not load child_process`);
        assert.doesNotMatch(source, /^import .*command-core\.mjs/mu, `${name} must not statically import command-core`);
        assert.doesNotMatch(
          source,
          PROCESS_EXECUTION_CALL,
          `${name} must not call a process-execution primitive`,
        );
        if (name === "proposal.mjs") {
          assert.doesNotMatch(source, /^import .*node:fs(?:\/promises)?/mu, `${name} must not import filesystem I/O`);
          assert.doesNotMatch(source, /\b(?:Date\.now|performance\.now|process\.)/u, `${name} must not read clock or process state`);
        }
      }
    },
  },
  {
    name: "arch/62 FF-6203 process-execution guard distinguishes RegExp.exec from real APIs",
    run: () => {
      assert.doesNotMatch('const match = ITEM_RE.exec(candidate.name);', PROCESS_EXECUTION_CALL);
      for (const source of [
        'exec("git status")',
        'await execFile("git", ["status"])',
        'spawn("node", [])',
        'const result = spawnSync("node", [])',
      ]) assert.match(source, PROCESS_EXECUTION_CALL, source);
      for (const source of [
        'import { exec } from "node:child_process";',
        'import cp from "child_process";',
        'const cp = await import("node:child_process"); cp.exec("git status");',
        'const cp = require("child_process"); cp.spawn("node", []);',
      ]) assert.match(source, CHILD_PROCESS_LOAD, source);
    },
  },
];
