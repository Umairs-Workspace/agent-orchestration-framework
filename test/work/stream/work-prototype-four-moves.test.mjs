import { defaultApplication as _aofApplication } from "aof/default-application";
import { defaultWorkspace as _aofWorkspace } from "aof/workspace-services";
// Traceability for milestone 168 / story 01 — tasks 00 and 01: `aof work prototype`'s four moves
// (168/ADR-004). Start reaches the one mint through `runInsertTopLevel`'s append form; continue folds
// a new ask in and reopens a stopped prototype; `--log` writes one dated line; stop and complete
// refuse on the template hand-off and quote the written one into the Log.
//
// Each case runs the REGISTERED verb through `invoke` over a real temp work tree whose templates are
// the bundle's own `templates/prototype/` pair — the files `aof work update` renders.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm, cp, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
const invoke = _aofApplication.invoke;
const loadWorkspace = _aofWorkspace.work.loadWorkspace;
const validateWork = _aofWorkspace.work.validateWork;

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const TEMPLATES = path.join(repoRoot, "packages", "core", "assets", "templates", "prototype");
const HANDOFF = "Import works for Monzo CSV. Next: Starling.";

async function withStream(body) {
  const repo = await mkdtemp(path.join(os.tmpdir(), "aof-prototype-"));
  const workDir = path.join(repo, "wiki", "work");
  const aofDir = path.join(repo, ".aof");
  try {
    await mkdir(path.join(workDir, "168_milestone_framing"), { recursive: true });
    await writeFile(path.join(workDir, "168_milestone_framing", "SPEC.md"), "---\ntype: milestone\nnumber: 168\nslug: framing\ntitle: \"Framing\"\nstatus: in-progress\ncreated: 2026-10-22\nupdated: 2026-10-22\nschema: 1\n---\n# 168 · Framing\n");
    await mkdir(aofDir, { recursive: true });
    await writeFile(path.join(aofDir, "aof.config.json"), `${JSON.stringify({ name: "fixture", work: { dir: "./wiki/work" } }, null, 2)}\n`);
    await cp(TEMPLATES, path.join(aofDir, "templates", "work", "prototype"), { recursive: true });
    const workspace = await loadWorkspace(repo);
    const run = (input) => invoke("work:prototype", input, { workspace });
    await body({ repo, workDir, workspace, run });
  } finally {
    await rm(repo, { recursive: true, force: true, maxRetries: 20, retryDelay: 100 });
  }
}

const read = (dir, file) => readFile(path.join(dir, file), "utf8");
const statusOf = async (dir) => (await read(dir, "PROTOTYPE.md")).match(/^status: (.*)$/m)[1];
const section = (text, heading) => {
  const rows = text.split(/\r?\n/);
  const start = rows.indexOf(`## ${heading}`);
  const next = rows.findIndex((row, index) => index > start && /^#{1,2} /.test(row));
  return rows.slice(start + 1, next < 0 ? rows.length : next).filter((row) => row.trim() !== "" && !row.trim().startsWith("<!--") && !/^\s/.test(row) && !row.endsWith("-->"));
};
const tree = async (workDir) => {
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out.push([path.relative(workDir, full), await readFile(full, "utf8")]);
    }
  }
  await walk(workDir);
  return out.sort();
};
async function rejectsWith(promise, code, named) {
  await assert.rejects(promise, (error) => error.code === code && (named == null || error.message.includes(named)) || assert.fail(`expected ${code}${named ? ` naming ${named}` : ""}; got ${error.code}: ${error.message}`));
}
async function started(run, ask = "a CSV importer", date = "2026-10-23") {
  const result = await run({ arg: ask, today: date });
  return result.dir;
}
async function writeHandOff(dir, text) {
  const state = await read(dir, "STATE.md");
  const rows = state.split(/\r?\n/);
  const start = rows.indexOf("## Hand-off");
  const end = rows.indexOf("## Log");
  await writeFile(path.join(dir, "STATE.md"), [...rows.slice(0, start + 1), "", text, "", ...rows.slice(end)].join("\n"));
}

export const workPrototypeFourMovesTests = [
  // ── task 00 · R1 — start ────────────────────────────────────────────────────────────────────
  {
    name: "168/01 E1 · start turns the ask into the intent, the first want and the first log line, through the one mint",
    run: () => withStream(async ({ workDir, run }) => {
      const result = await run({ arg: "a CSV importer for bank statements", today: "2026-10-23" });
      const dir = path.join(workDir, "169_prototype_csv-importer-for-bank-statements");
      assert.equal(result.dir, dir);
      assert.deepEqual([result.move, result.ref, result.status], ["start", "169", "active"]);
      const doc = await read(dir, "PROTOTYPE.md");
      assert.match(doc, /^status: active$/m);
      assert.match(doc, /^number: 169$/m);
      assert.match(doc, /^created: 2026-10-23$/m);
      assert.deepEqual(section(doc, "Intent"), ["a CSV importer for bank statements"]);
      assert.deepEqual(section(doc, "Wants"), ["- 2026-10-23 · a CSV importer for bank statements"]);
      assert.deepEqual(section(await read(dir, "STATE.md"), "Log"), ["- 2026-10-23 · started"]);
      assert.equal(existsSync(path.join(workDir, "backlog")), false, "no backlog folder is left behind");
      assert.deepEqual(await validateWork(workDir, {}), [], "the started prototype validates clean");
    }),
  },
  {
    name: "168/01 E2 · --slug names the folder",
    run: () => withStream(async ({ workDir, run }) => {
      await run({ arg: "a CSV importer for bank statements", slug: "importer" });
      assert.ok(existsSync(path.join(workDir, "169_prototype_importer")));
    }),
  },
  ...[
    ["Build me a CSV importer", "csv-importer"],
    ["the Kanban board, with drag & drop!", "kanban-board-with-drag-drop"],
    ["a tool that reads bank statements and sorts them by", "tool-that-reads-bank-statements-and"],
  ].map(([ask, slug]) => ({
    name: `168/01 the slug is made from the ask: "${ask}" → ${slug}`,
    run: () => withStream(async ({ workDir, run }) => {
      await run({ arg: ask });
      assert.ok(existsSync(path.join(workDir, `169_prototype_${slug}`)), (await readdir(workDir)).join(", "));
    }),
  })),
  ...[
    ["E3", null, "999", "prototype-ref-unknown"],
    ["E4", "backlog/prototype_csv-importer", "a CSV importer", "insert-backlog-exists"],
    ["", null, "!!!", "insert-invalid-slug"],
  ].map(([example, leaf, arg, code]) => ({
    name: `168/01 ${example} an argument that is not an ask is refused as ${code}, and nothing is written`,
    run: () => withStream(async ({ workDir, run }) => {
      if (leaf) {
        await mkdir(path.join(workDir, leaf), { recursive: true });
        await writeFile(path.join(workDir, leaf, "PROTOTYPE.md"), "---\ntype: prototype\nslug: csv-importer\nstatus: active\n---\n");
      }
      const before = await tree(workDir);
      await rejectsWith(run({ arg }), code);
      assert.deepEqual(await tree(workDir), before, "the work tree is unchanged");
    }),
  })),
  {
    name: "168/01 start mints through the one mint, past an archived number, and renumbers nothing",
    run: () => withStream(async ({ workDir, run }) => {
      await mkdir(path.join(workDir, "archive", "52_milestone_old"), { recursive: true });
      await writeFile(path.join(workDir, "archive", "52_milestone_old", "SPEC.md"), "---\ntype: milestone\nnumber: 52\nslug: old\nstatus: done\ncreated: 2026-01-01\nupdated: 2026-01-01\nschema: 1\n---\n");
      const result = await run({ arg: "a CSV importer" });
      assert.equal(result.ref, "169");
      assert.ok(existsSync(path.join(workDir, "168_milestone_framing")) && existsSync(path.join(workDir, "archive", "52_milestone_old")), "no existing item was renumbered");
    }),
  },

  // ── task 01 · R2 — continue ─────────────────────────────────────────────────────────────────
  {
    name: "168/01 E5 · a new ask on an active prototype is added and logged",
    run: () => withStream(async ({ run }) => {
      const dir = await started(run);
      await run({ arg: "169", addition: "export to JSON too", today: "2026-10-24" });
      assert.equal(section(await read(dir, "PROTOTYPE.md"), "Wants").at(-1), "- 2026-10-24 · export to JSON too");
      assert.equal(section(await read(dir, "STATE.md"), "Log").at(-1), "- 2026-10-24 · want added: export to JSON too");
      assert.equal(await statusOf(dir), "active");
    }),
  },
  ...[
    ["E6", "paused", "--stop", "export to JSON too"],
    ["E7", "done", "--done", null],
    ["", "abandoned", "--abandon", null],
  ].map(([example, status, flag, addition]) => ({
    name: `168/01 ${example} continuing a ${status} prototype reopens it`,
    run: () => withStream(async ({ run }) => {
      const dir = await started(run);
      await writeHandOff(dir, HANDOFF);
      await run({ arg: "169", [flag.slice(2)]: true, today: "2026-10-24" });
      assert.equal(await statusOf(dir), status);
      const wantsBefore = section(await read(dir, "PROTOTYPE.md"), "Wants");
      await run({ arg: "169", ...(addition ? { addition } : {}), today: "2026-10-25" });
      assert.equal(await statusOf(dir), "active");
      assert.ok(section(await read(dir, "STATE.md"), "Log").includes("- 2026-10-25 · reopened"));
      const wants = section(await read(dir, "PROTOTYPE.md"), "Wants");
      if (addition) assert.equal(wants.at(-1), `- 2026-10-25 · ${addition}`);
      else assert.deepEqual(wants, wantsBefore, "the wants are unchanged");
    }),
  })),
  {
    name: "168/01 an active prototype continued with no addition changes nothing on disk",
    run: () => withStream(async ({ run }) => {
      const dir = await started(run);
      const before = [await read(dir, "PROTOTYPE.md"), await read(dir, "STATE.md")];
      await run({ arg: "169" });
      assert.deepEqual([await read(dir, "PROTOTYPE.md"), await read(dir, "STATE.md")], before);
    }),
  },
  {
    name: "168/01 E8 · a ref that is not a prototype is refused, and the milestone is unchanged",
    run: () => withStream(async ({ workDir, run }) => {
      const spec = await read(path.join(workDir, "168_milestone_framing"), "SPEC.md");
      await rejectsWith(run({ arg: "168", addition: "more" }), "prototype-not-a-prototype");
      assert.equal(await read(path.join(workDir, "168_milestone_framing"), "SPEC.md"), spec);
    }),
  },
  {
    name: "168/01 E9 · --log appends one dated line and nothing else",
    run: () => withStream(async ({ run }) => {
      const dir = await started(run);
      const doc = await read(dir, "PROTOTYPE.md");
      await run({ arg: "169", log: "dropped the PDF want", today: "2026-10-24" });
      assert.equal(section(await read(dir, "STATE.md"), "Log").at(-1), "- 2026-10-24 · dropped the PDF want");
      assert.equal(await read(dir, "PROTOTYPE.md"), doc);
      assert.equal(await statusOf(dir), "active");
    }),
  },

  // ── task 01 · R3 — stop and complete ────────────────────────────────────────────────────────
  {
    name: "168/01 E10 · a stop with the template's hand-off is refused",
    run: () => withStream(async ({ run }) => {
      const dir = await started(run);
      await rejectsWith(run({ arg: "169", stop: true }), "prototype-handoff-missing");
      assert.equal(await statusOf(dir), "active");
    }),
  },
  ...[
    ["E11", "active", "stop", "paused", "stopped"],
    ["E12", "paused", "done", "done", "done"],
    ["", "active", "abandon", "abandoned", "abandoned"],
  ].map(([example, from, flag, to, line]) => ({
    name: `168/01 ${example} --${flag} from ${from} moves to ${to} and quotes the hand-off into the Log`,
    run: () => withStream(async ({ run }) => {
      const dir = await started(run);
      await writeHandOff(dir, HANDOFF);
      if (from === "paused") await run({ arg: "169", stop: true, today: "2026-10-25" });
      await run({ arg: "169", [flag]: true, today: "2026-10-26" });
      assert.equal(await statusOf(dir), to);
      const state = await read(dir, "STATE.md");
      assert.deepEqual(section(state, "Log").slice(-2), [`- 2026-10-26 · ${line}`, `> ${HANDOFF}`]);
      assert.deepEqual(section(state, "Hand-off"), [HANDOFF], "the hand-off itself is left in place");
    }),
  })),
  {
    name: "168/01 two stops keep both hand-offs in the Log, in order",
    run: () => withStream(async ({ run }) => {
      const dir = await started(run);
      await writeHandOff(dir, "First checkpoint.");
      await run({ arg: "169", stop: true, today: "2026-10-26" });
      await run({ arg: "169", today: "2026-10-27" });
      await writeHandOff(dir, "Second checkpoint.");
      await run({ arg: "169", stop: true, today: "2026-10-27" });
      const log = section(await read(dir, "STATE.md"), "Log");
      assert.ok(log.indexOf("> First checkpoint.") >= 0 && log.indexOf("> First checkpoint.") < log.indexOf("> Second checkpoint."), log.join("\n"));
      assert.deepEqual(await validateWork(path.dirname(dir), {}), [], "the stopped prototype validates clean");
    }),
  },
  ...[
    ["E13", "abandoned", "abandon", "active"],
    ["", "done", "stop", "active"],
  ].map(([example, from, flag, legal]) => ({
    name: `168/01 ${example} --${flag} on a ${from} prototype is refused, naming ${legal}`,
    run: () => withStream(async ({ run }) => {
      const dir = await started(run);
      await writeHandOff(dir, HANDOFF);
      await run({ arg: "169", [from === "done" ? "done" : "abandon"]: true });
      await rejectsWith(run({ arg: "169", [flag]: true }), "status-edge-not-applicable", legal);
      assert.equal(await statusOf(dir), from);
    }),
  })),
  {
    name: "168/01 two move flags together are refused as prototype-one-move",
    run: () => withStream(async ({ run }) => {
      const dir = await started(run);
      await rejectsWith(run({ arg: "169", stop: true, done: true }), "prototype-one-move");
      assert.equal(await statusOf(dir), "active");
      // …and a new ask beside a move or a log line is refused rather than dropped unwritten.
      const before = [await read(dir, "PROTOTYPE.md"), await read(dir, "STATE.md")];
      await rejectsWith(run({ arg: "169", addition: "more", log: "a line" }), "prototype-one-move");
      assert.deepEqual([await read(dir, "PROTOTYPE.md"), await read(dir, "STATE.md")], before);
    }),
  },
  {
    name: "168/01 no line the verb writes carries a time of day, and it mints no run record",
    run: () => withStream(async ({ run }) => {
      const dir = await started(run);
      await run({ arg: "169", addition: "more" });
      for (const file of ["PROTOTYPE.md", "STATE.md"]) {
        assert.doesNotMatch(await read(dir, file), /\d{1,2}:\d{2}/, `${file} holds no time of day`);
      }
      assert.equal(existsSync(path.join(dir, "runs")), false, "no run record exists for 169");
    }),
  },
];
