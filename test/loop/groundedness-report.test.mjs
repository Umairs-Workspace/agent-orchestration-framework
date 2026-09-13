import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getCommand } from "../../src/command-core.mjs";
import { createLoopsGroundednessCommand, resolveAnchorAuthorities } from "../../src/commands/loops-groundedness.mjs";
import { GROUND_VERDICTS, buildGroundednessReport } from "../../src/work/loops-checks.mjs";
import { loadLoops } from "../../src/work/loops.mjs";

const endpoint = (raw) => ({ raw, scheme: raw.slice(0, raw.indexOf(":")), operand: raw.slice(raw.indexOf(":") + 1), resolved: true });
const source = path.resolve("test-fixtures", "loops");

function node(id, kind, { ground, observes, edges = {}, file = `${id.replace(":", "-")}.md` } = {}) {
  const fields = {};
  if (ground != null) fields.ground = { kind: "enum", value: ground, raw: ground };
  if (observes != null) fields.observes = observes;
  return { id, kind, title: id, path: path.isAbsolute(file) ? file : path.join(source, file), fields, edges };
}

function pointer(raw) {
  const hash = raw.indexOf("#");
  const colon = raw.indexOf(":");
  return {
    kind: "pointer",
    raw,
    pointer: {
      scheme: raw.slice(0, colon),
      operand: raw.slice(colon + 1, hash < 0 ? undefined : hash),
      ...(hash < 0 ? {} : { symbol: raw.slice(hash + 1) }),
    },
  };
}

function model(nodes, overrides = {}) {
  return { source, present: true, findings: [], nodes, ...overrides };
}

function byMembers(report, members) {
  return report.components.find((component) => component.members.join(",") === members.join(","));
}

async function snapshot(dir) {
  const names = (await readdir(dir)).sort();
  return Object.fromEntries(await Promise.all(names.map(async (name) => [name, (await readFile(path.join(dir, name))).toString("hex")])));
}

export const groundednessReportTests = [
  {
    name: "groundedness-report/00 every admitted ground seeds the unchanged directed flood and verdicts are closed",
    run: () => {
      assert.deepEqual([...GROUND_VERDICTS].sort(), ["anchored", "exogenous-only", "self-referential", "stale"].sort());
      const grounds = ["process-exit", "build-stamp", "landed-commit", "live-soak", "frozen-rule", "exogenous"];
      for (const ground of grounds) {
        const report = buildGroundednessReport(model([
          node("actor:seed", "actor", { ground, edges: { "data-feed": [endpoint("loop:a")] } }),
          node("loop:a", "loop", { edges: { monitoring: [endpoint("loop:b")] } }),
          node("loop:b", "loop", { edges: { monitoring: [endpoint("loop:a")] } }),
        ]));
        const cycle = byMembers(report, ["loop:a", "loop:b"]);
        assert.equal(cycle.verdict, ground === "exogenous" ? "exogenous-only" : "anchored", ground);
        assert.deepEqual(cycle.groundClasses, [ground]);
      }

      const report = buildGroundednessReport(model([
        node("anchor:stamp", "anchor", {
          ground: "build-stamp",
          observes: pointer("command:work:loops-validate"),
          edges: { "data-feed": [endpoint("loop:a")] },
        }),
        node("loop:a", "loop", { edges: { monitoring: [endpoint("loop:b")] } }),
        node("loop:b", "loop", { edges: { monitoring: [endpoint("loop:a")] } }),
        node("loop:free", "loop"),
      ]), { "anchor:stamp": true });
      assert.equal(byMembers(report, ["loop:a", "loop:b"]).verdict, "anchored");
      assert.equal(byMembers(report, ["loop:free"]).verdict, "self-referential");
    },
  },
  {
    name: "groundedness-report/01 only an anchor outbound data-feed admits a loop",
    run: async () => {
      const report = buildGroundednessReport(model([
        node("anchor:authority", "anchor", {
          ground: "frozen-rule",
          observes: pointer("config:work.tags"),
          edges: {
            "data-feed": [endpoint("loop:fed"), endpoint("loop:fed-two"), endpoint("loop:fed-three")],
            monitoring: [endpoint("loop:watched")],
            "target-setting": [endpoint("loop:targeted")],
          },
        }),
        node("loop:fed", "loop"), node("loop:fed-two", "loop"), node("loop:fed-three", "loop"),
        node("loop:watched", "loop"), node("loop:targeted", "loop"),
      ]));
      assert.deepEqual(report.unanchoredLoops, ["loop:targeted", "loop:watched"]);
      assert.equal(report.unanchoredLoops.length, 2);
      assert.deepEqual(report.findings.filter((item) => item.code === "loop-anchor-absent").map((item) => path.basename(item.path)), ["loop-targeted.md", "loop-watched.md"]);

      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-ground-dangling-"));
      try {
        const dir = path.join(temp, "loops"); await mkdir(dir);
        await writeFile(path.join(dir, "only.md"), "---\nid: loop:only\nkind: loop\ntitle: Only\ncontrolled: state\nreference: [prose:r.md]\nmeasurement: [prose:m.md]\nactuator: [prose:a.md]\ncadence: event:per-item\nceiling: none\nowner: unknown\noptimizing: false\n---\n");
        await writeFile(path.join(dir, "source.md"), "---\nid: anchor:source\nkind: anchor\ntitle: Source\nground: build-stamp\nobserves: command:work:loops-validate\ndata-feed: [loop:missing]\n---\n");
        const loaded = await loadLoops(temp);
        assert.ok(loaded.findings.some((item) => item.code === "loop-graph-dangling-endpoint"));
        assert.deepEqual(buildGroundednessReport(loaded).unanchoredLoops, ["loop:only"]);
      } finally { await rm(temp, { recursive: true, force: true }); }

      const schemaTemp = await mkdtemp(path.join(os.tmpdir(), "aof-ground-schema-"));
      try {
        const dir = path.join(schemaTemp, "loops"); await mkdir(dir);
        await writeFile(path.join(dir, "claim.md"), "---\nid: loop:claim\nkind: loop\ntitle: Claim\ncontrolled: state\nreference: [prose:r.md]\nmeasurement: [prose:m.md]\nactuator: [prose:a.md]\ncadence: event:per-item\nceiling: none\nowner: unknown\noptimizing: false\nanchor: anchor:claimed\n---\n");
        const loaded = await loadLoops(schemaTemp);
        assert.ok(loaded.findings.some((item) => item.code === "loop-unknown-key" && item.message.includes("anchor")));
      } finally { await rm(schemaTemp, { recursive: true, force: true }); }
    },
  },
  {
    name: "groundedness-report/02 stale authorities are injected, explicit, and do not contaminate sound components",
    run: () => {
      const graph = model([
        node("anchor:stale", "anchor", { ground: "process-exit", observes: pointer("module:missing.mjs#done"), edges: { "data-feed": [endpoint("loop:stale")] } }),
        node("loop:stale", "loop"),
        node("anchor:sound", "anchor", { ground: "frozen-rule", observes: pointer("config:rules.active"), edges: { "data-feed": [endpoint("loop:sound")] } }),
        node("loop:sound", "loop"),
        node("loop:free", "loop"),
      ]);
      const report = buildGroundednessReport(graph, { "anchor:stale": false, "anchor:sound": true });
      assert.equal(byMembers(report, ["loop:stale"]).verdict, "stale");
      assert.deepEqual(byMembers(report, ["loop:stale"]).groundClasses, ["process-exit"]);
      assert.deepEqual(byMembers(report, ["loop:stale"]).staleAuthorities, ["module:missing.mjs#done"]);
      assert.equal(byMembers(report, ["loop:sound"]).verdict, "anchored");
      assert.deepEqual(byMembers(report, ["loop:sound"]).groundClasses, ["frozen-rule"]);
      assert.equal(byMembers(report, ["loop:free"]).verdict, "self-referential");
    },
  },
  {
    name: "groundedness-report/02 module command and config authorities resolve at the command boundary",
    run: async () => {
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-ground-resolve-"));
      try {
        await writeFile(path.join(temp, "authority.mjs"), "export function ready() {}\n");
        const anchorPath = path.join(temp, "anchor.md"); await writeFile(anchorPath, "# local anchor\n");
        const anchors = [
          node("anchor:module-good", "anchor", { ground: "build-stamp", observes: pointer("module:authority.mjs#ready"), file: anchorPath }),
          node("anchor:module-symbol", "anchor", { ground: "build-stamp", observes: pointer("module:authority.mjs#missing"), file: anchorPath }),
          node("anchor:module-path", "anchor", { ground: "build-stamp", observes: pointer("module:missing.mjs#ready"), file: anchorPath }),
          node("anchor:command-good", "anchor", { ground: "process-exit", observes: pointer("command:work:loops-validate"), file: anchorPath }),
          node("anchor:command-bad", "anchor", { ground: "process-exit", observes: pointer("command:work:not-real"), file: anchorPath }),
          node("anchor:config-good", "anchor", { ground: "frozen-rule", observes: pointer("config:rules.active"), file: anchorPath }),
          node("anchor:config-bad", "anchor", { ground: "frozen-rule", observes: pointer("config:rules.missing"), file: anchorPath }),
        ];
        const resolutions = await resolveAnchorAuthorities(model(anchors), { projectRoot: temp, config: { rules: { active: true } } }, { hasCommand: (id) => id === "work:loops-validate" });
        assert.deepEqual(Object.fromEntries(Object.entries(resolutions).map(([id, value]) => [id, value.resolved])), {
          "anchor:command-bad": false, "anchor:command-good": true,
          "anchor:config-bad": false, "anchor:config-good": true,
          "anchor:module-good": true, "anchor:module-path": false, "anchor:module-symbol": false,
        });
      } finally { await rm(temp, { recursive: true, force: true }); }
    },
  },
  {
    name: "groundedness-report/03 the registered report is deterministic, total, exact-shaped, and read-only",
    run: async () => {
      const registered = getCommand("work:loops-groundedness");
      assert.ok(registered);
      assert.deepEqual(registered.cli.route, ["work", "loops", "groundedness"]);
      const graph = model([node("loop:free", "loop")]);
      const temp = await mkdtemp(path.join(os.tmpdir(), "aof-ground-command-"));
      try {
        await writeFile(path.join(temp, "sentinel.txt"), "unchanged\n");
        const before = await snapshot(temp);
        const command = createLoopsGroundednessCommand({ loadModel: async () => graph });
        const context = { workspace: { projectRoot: temp, aofDir: temp, config: {} } };
        const first = await command.run({}, context);
        assert.deepEqual(await command.run({}, context), first);
        assert.deepEqual(Object.keys(first), ["source", "present", "state", "components", "unanchoredLoops", "authorities", "findings", "summary", "error"]);
        assert.deepEqual(first.summary, { components: 1, anchored: 0, exogenousOnly: 0, selfReferential: 1, stale: 0, unanchoredLoops: 1 });
        assert.equal(first.state, "reported");
        assert.deepEqual(await snapshot(temp), before);

        const absent = await createLoopsGroundednessCommand({ loadModel: async () => ({ source, present: false, nodes: [], findings: [] }) }).run({}, context);
        assert.equal(absent.state, "absent"); assert.equal(absent.error, null); assert.deepEqual(absent.components, []);
        const unreadable = await createLoopsGroundednessCommand({ loadModel: async () => { throw new Error("broken registry"); } }).run({}, context);
        assert.equal(unreadable.state, "unreadable"); assert.equal(unreadable.error.code, "registry-unreadable"); assert.deepEqual(unreadable.components, []);
      } finally { await rm(temp, { recursive: true, force: true }); }
    },
  },
];
