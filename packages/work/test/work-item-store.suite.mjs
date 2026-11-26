import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { resolveWorkItemStore, bindWorkItemStore } from "../src/store/work-item-store.mjs";
import { createWorkReader } from "../src/read.mjs";
import { seedProject } from "../../../test/golden/fixtures/work-stream/file-adapter.mjs";
import { defaultApplication as application } from "aof/default-application";
import { createWorkEffects } from "../src/effects.mjs";
import { setItemStatus, typeHasRecordDoc } from "../src/records.mjs";

function reader() {
  return createWorkReader({
    readCachedItemRows: async () => null,
    reportDegrade() {},
    isUnderMeshWorktreesRoot: () => false,
    isUnderMeshSessionWorktreesRoot: () => false,
    isUnderMeshDispatchWorktreesRoot: () => false,
  });
}

async function orchard(run, variation = {}) {
  const projectRoot = await mkdtemp(path.join(os.tmpdir(), "aof-store-"));
  try {
    seedProject(projectRoot, { variation });
    await run({ projectRoot, workDir: path.join(projectRoot, "wiki/work"), config: {} });
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function commandContext(workspace) {
  const env = { ...process.env, AOF_GLOBAL_HOME: path.join(workspace.projectRoot, "home") };
  return {
    workspace: await application.loadWorkspace(workspace.projectRoot, undefined, { env }),
    globalWorkStoreOptions: { env }, effectsJournalOptions: { env },
  };
}

export const workItemStoreTests = [
  ...[
    ["work:promote", "promote", { slug: "queued" }],
    ["work:archive", "archive", { ref: "19" }],
    ["migrate:folder", "migrate", { folder: "source" }],
    ["work:prototype", "prototype", { slug: "fruit-crate" }],
    ["work:promote-finding", "promote-finding", { ref: "10", finding: { title: "Gap", remedy: "Fix it" } }],
    ["work:promote-gap", "promote-gap", { gap: { title: "Gap", dischargeCondition: "Fix it" } }],
    ["work:upgrade", "upgrade", { dryRun: true }],
  ].map(([command, operation, input]) => ({
    name: `208/03 ${command} reaches the selected operation without a tracking directory`,
    async run() {
      const answer = { provider: operation }, requests = [];
      const workspace = { workDir: "/missing-tracking-tree", config: {}, workItemStore: {
        async mutate(request) { requests.push(request); return answer; },
      } };
      const result = await application.invoke(command, input, { workspace });
      assert.strictEqual(result, answer);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].operation, operation);
      if (operation === "upgrade") assert.equal(requests[0].input.apply, false);
      else assert.deepEqual(requests[0].input, input);
    },
  })),
  {
    name: "208/02 replay resolves the event workspace and never mutates the draining workspace instead",
    async run() {
      const writes = [];
      const workspace = name => ({ projectRoot: `/${name}`, workDir: `/${name}/work`, workItemStore: {
        mutate: async request => { writes.push([name, request]); return { ref: request.ref, status: request.toStatus }; },
      } });
      const one = workspace("one"), two = workspace("two");
      let loads = 0;
      const effects = createWorkEffects(async () => ({ setItemStatus, typeHasRecordDoc,
        loadWorkspace: async root => { loads++; assert.ok([two.projectRoot, "/two/work/durable-home"].includes(root)); return two; },
      }));
      const apply = effects.events["run.started"][0].apply;
      const event = { payload: { ref: "42/00", itemDir: "/two/work/durable-home", itemType: "story", workspaceRoot: "/two" } };
      await apply(event, { workspace: one });
      await apply(event, { workspace: two });
      assert.equal(loads, 1, "replay loads its own workspace; the matching live context is reused");
      const unpublished = { payload: { ...event.payload, workspaceRoot: null } };
      await apply(unpublished, { workspace: one, trackingWorkspace: two });
      assert.equal(loads, 1, "runtime tracking context preserves the selected instance");
      await apply(unpublished, { workspace: one });
      assert.equal(loads, 2, "root-null replay resolves the item's owner, never the draining workspace");
      assert.deepEqual(writes.map(([name]) => name), ["two", "two", "two", "two"]);
      assert.ok(writes.every(([, request]) => request.documentHome === "durable-home"));
    },
  },
  ...[
    { ref: "11", from: "not-started", to: "in-progress" },
    { ref: "16", from: "paused", to: "active" },
  ].map(({ ref, from, to }) => ({
    name: `208/02 lifecycle ${ref} moves ${from} to ${to} through the assembled command and preserves record bytes`,
    run: () => orchard(async workspace => {
      const ctx = await commandContext(workspace);
      const snapshot = await resolveWorkItemStore(ctx.workspace).snapshot();
      const identity = snapshot.items.find(item => item.ref === ref);
      const record = await snapshot.read(ref);
      const file = path.join(workspace.workDir, identity.documentHome, record.recordDocument);
      const before = await readFile(file, "utf8");
      const result = await application.invoke("work:status", { ref, status: to, now: "2026-11-24T12:00:00Z" }, ctx);
      assert.equal(result.status, to);
      const found = await application.invoke("work:find", { query: ref }, ctx);
      assert.equal(found.rows[0].status, to);
      assert.equal(await readFile(file, "utf8"), before.replace(`status: ${from}`, `status: ${to}`).replace(/^updated:.*$/m, "updated: 2026-11-24"));
    }),
  })),
  ...[
    { ref: "11", status: "done", code: "status-edge-not-applicable" },
    { ref: "16", status: "blocked", code: "status-edge-not-applicable" },
    { ref: "11", status: "banana", code: "invalid-status" },
    { ref: "11", status: "not-started", ifApplicable: true },
  ].map(({ code, ...input }) => ({
    name: `208/02 refused or skipped ${input.ref} to ${input.status} preserves the record`,
    run: () => orchard(async workspace => {
      const ctx = await commandContext(workspace);
      const snapshot = await resolveWorkItemStore(ctx.workspace).snapshot();
      const identity = snapshot.items.find(item => item.ref === input.ref);
      const record = await snapshot.read(input.ref);
      const file = path.join(workspace.workDir, identity.documentHome, record.recordDocument);
      const before = await readFile(file, "utf8");
      if (code) await assert.rejects(application.invoke("work:status", input, ctx), { code });
      else assert.equal((await application.invoke("work:status", input, ctx)).moved, false);
      assert.equal(await readFile(file, "utf8"), before);
    }),
  })),
  {
    name: "208/02 E3 the selected file store checks a stale expected state at the write door",
    run: () => orchard(async workspace => {
      const store = resolveWorkItemStore(workspace);
      const snapshot = await store.snapshot();
      const identity = snapshot.items.find(item => item.ref === "11");
      const file = path.join(workspace.workDir, identity.documentHome, "CHORE.md");
      assert.equal((await snapshot.read("11")).metadata.status, "not-started");
      const blocked = (await readFile(file, "utf8")).replace("status: not-started", "status: blocked");
      await writeFile(file, blocked);
      await assert.rejects(store.mutate({ operation: "status", ref: "11", toStatus: "in-progress", expectFrom: "not-started" }), { code: "status-edge-not-applicable" });
      assert.equal(await readFile(file, "utf8"), blocked);
    }),
  },
  ...[
    { initial: "not-started", outcome: null, final: "in-progress" },
    { initial: "in-progress", outcome: "failed", final: "not-started" },
    { initial: "in-review", outcome: "failed", final: "in-review" },
    { initial: "in-review", outcome: "done", final: "in-review" },
  ].map(({ initial, outcome, final }) => ({
    name: `208/02 real run from ${initial}, completion ${outcome ?? "pending"}, leaves item ${final}`,
    run: () => orchard(async workspace => {
      const ctx = await commandContext(workspace);
      const started = await application.invoke("work:run-start", { ref: "10/00" }, ctx);
      if (outcome) await application.invoke("work:run-complete", { ref: "10/00", runId: started.runId, outcome, reason: "verification-stalled" }, ctx);
      const result = await application.invoke("work:find", { query: "10/00" }, ctx);
      assert.equal(result.rows[0].status, final);
    }, { items: { pick: { status: initial } } }),
  })),
  {
    name: "208/02 assembled direct and run transitions reach an injected writer without tracking files",
    run: () => orchard(async workspace => {
      const ctx = await commandContext(workspace);
      const identity = { ref: "42/00", parent: "42", number: "00", type: "story", slug: "opaque", documentHome: "durable-home" };
      await mkdir(path.join(workspace.workDir, identity.documentHome));
      let status = "not-started";
      const writes = [];
      ctx.workspace = { ...ctx.workspace, workItemStore: {
        snapshot: async () => ({ items: [identity], read: async () => ({ metadata: { status, title: "Opaque" }, fault: null }) }),
        mutate: async request => {
          writes.push(request);
          const from = status;
          status = request.toStatus;
          return { ref: identity.ref, status, ...(request.operation === "status" ? { from } : {}) };
        },
      } };
      const started = await application.invoke("work:run-start", { ref: identity.ref }, ctx);
      assert.equal(status, "in-progress");
      await application.invoke("work:run-complete", { ref: identity.ref, runId: started.runId, outcome: "failed", reason: "verification-stalled" }, ctx);
      assert.equal(status, "not-started");
      await application.invoke("work:status", { ref: identity.ref, status: "in-progress" }, ctx);
      assert.equal(status, "in-progress");
      assert.deepEqual(writes.map(request => request.operation), ["status", "rollback", "status"]);
      assert.deepEqual(writes[0].expectFrom, ["not-started", "blocked"]);
      assert.ok(writes.every(request => request.ref === identity.ref && request.documentHome === "durable-home" && !("dir" in request)));
      await assert.rejects(readFile(path.join(workspace.workDir, identity.documentHome, "STORY.md")), { code: "ENOENT" });
    }),
  },
  {
    name: "208/00 CLI selection preserves listings and refuses unknown providers before changing records",
    run: () => orchard(async workspace => {
      const cli = fileURLToPath(new URL("../../core/bin/aof.mjs", import.meta.url));
      const invoke = () => spawnSync(process.execPath, [cli, "work", "list", "--json"], {
        cwd: workspace.projectRoot,
        env: { ...process.env, AOF_GLOBAL_HOME: path.join(workspace.projectRoot, "home") },
        encoding: "utf8",
        timeout: 30_000,
      });
      const implicit = invoke();
      assert.equal(implicit.status, 0, implicit.stderr);
      const config = path.join(workspace.projectRoot, ".aof/aof.config.json");
      await writeFile(config, JSON.stringify({ work: { store: "files" } }));
      const explicit = invoke();
      assert.equal(explicit.status, 0, explicit.stderr);
      assert.deepEqual(JSON.parse(explicit.stdout), JSON.parse(implicit.stdout));
      const record = path.join(workspace.workDir, "10_milestone_orchard/SPEC.md");
      const before = await readFile(record, "utf8");
      await writeFile(config, JSON.stringify({ work: { store: "typo" } }));
      const refused = invoke();
      assert.equal(refused.status, 1);
      const error = JSON.parse(refused.stdout);
      assert.equal(error.code, "work-store-unsupported");
      assert.match(error.error, /work\.store.*typo.*files/);
      assert.equal(await readFile(record, "utf8"), before);
    }),
  },
  {
    name: "208/00 duplicate refs preserve separate document metadata in compatibility reads",
    run: () => orchard(async workspace => {
      const snapshot = await resolveWorkItemStore(workspace).snapshot();
      assert.equal((await snapshot.read("11")).fault.kind, "ambiguous");
      const rows = await reader().findWorkCacheFirst(workspace, "11");
      assert.deepEqual(rows.map(row => row.title).sort(), ["duplicate", "labels"]);
      assert.notEqual(rows[0].dir, rows[1].dir);
    }, { duplicate: true }),
  },
  {
    name: "208/00 E1 · An existing workspace opens without a migration",
    run: () => orchard(async workspace => {
      const implicit = bindWorkItemStore(workspace);
      const explicit = bindWorkItemStore({ ...workspace, config: { work: { store: "files" } } });
      assert.equal(implicit.workItemStore, implicit.workItemStore);
      assert.notEqual(implicit.workItemStore, explicit.workItemStore);
      const read = reader();
      assert.deepEqual(await read.listStreamCacheFirst(implicit), await read.listStreamCacheFirst(explicit));
      assert.equal((await read.listStreamCacheFirst(implicit)).length, 14);
    }),
  },
  {
    name: "208/00 E2 · An unsupported selection names the configuration error; malformed selections are refused",
    run: () => orchard(async workspace => {
      const record = path.join(workspace.workDir, "10_milestone_orchard/SPEC.md");
      const before = await readFile(record, "utf8");
      for (const setting of ["typo", {}, true, "", "FILES", null]) {
        const configured = bindWorkItemStore({ ...workspace, config: { work: { store: setting } } });
        assert.equal(configured.projectRoot, workspace.projectRoot, "binding does not open tracking");
        await assert.rejects(reader().listStreamCacheFirst(configured), error =>
          error.code === "work-store-unsupported" && error.message.includes("work.store") &&
          error.message.includes(JSON.stringify(setting)) && error.message.includes("files"));
        assert.equal(await readFile(record, "utf8"), before);
      }
    }),
  },
  {
    name: "208/00 E3 · A nested story retains its parent and its dependency; old stream distinctions survive",
    run: () => orchard(async workspace => {
      const store = resolveWorkItemStore(workspace);
      const snapshot = await store.snapshot();
      const pack = snapshot.items.find(item => item.ref === "10/01");
      assert.equal(pack.parent, "10");
      assert.equal(pack.number, "01");
      assert.equal("dir" in pack, false);
      assert.equal(path.isAbsolute(pack.documentHome), false);
      const record = await snapshot.read(pack.ref);
      assert.equal(record.metadata.title, "pack");
      assert.deepEqual(record.metadata.depends, ["00"]);
      assert.equal(record.fault, null);
      assert.equal(snapshot.items.find(item => item.ref === "queued").number, null);
      assert.equal(snapshot.items.find(item => item.ref === "30").archived, true);
      assert.deepEqual((await snapshot.read("14")).metadata, {});
      assert.equal((await snapshot.read("16")).metadata.status, "paused");
      assert.equal(await snapshot.read("absent"), null);
      assert.equal((await store.snapshot()).fromMemo, true);
      await writeFile(path.join(workspace.workDir, pack.documentHome, "STORY.md"), "broken record");
      const changed = await store.snapshot();
      assert.notEqual(changed.token, snapshot.token);
      assert.equal((await changed.read(pack.ref)).fault.kind, "unparseable");
    }),
  },
  {
    name: "208/00 E4 · A caller can read an identity without visiting a directory",
    async run() {
      const item = { ref: "ticket:pear", type: "story", slug: "pear", number: "1", parent: null };
      const snapshot = { items: [item], read: async ref => ref === item.ref ? { metadata: { title: "Pear", status: "not-started" }, fault: null } : null };
      const workItemStore = { snapshot: async () => snapshot };
      const workspace = { projectRoot: "/unused", workItemStore, get workDir() { throw Error("tracking directory opened"); } };
      assert.equal(resolveWorkItemStore(workspace), workItemStore);
      assert.equal((await (await resolveWorkItemStore(workspace).snapshot()).read(item.ref)).metadata.title, "Pear");
      const rows = await reader().listStreamCacheFirst({ projectRoot: "/unused", workDir: "/unused/work", workItemStore });
      assert.equal(rows[0].title, "Pear");
      assert.equal(rows[0].dir, null);
    },
  },
];

const selection = { manifest: ".aof/boards/team.yaml" };
const definition = {
  version: 1, board: { project: "Orchard" }, adapter: "./team.mjs",
  mappings: {
    types: { story: "Card" }, states: { story: { "not-started": "Ready" } },
    fields: { ref: "ref", title: "title", correlation: "key", membership: "lane" },
    relations: { parent: "parent", depends: "predecessor" }, order: "rank",
  },
  operations: { readItems: "listCards", readChanges: "getChanges", applyChanges: "apply" },
};

async function boardFixture(workspace, amend = value => value) {
  const boards = path.join(workspace.projectRoot, ".aof/boards");
  await mkdir(boards, { recursive: true });
  const raw = amend(structuredClone(definition));
  await writeFile(path.join(boards, "team.yaml"), typeof raw === "string" ? raw : JSON.stringify(raw));
  const imported = path.join(boards, "imported");
  await writeFile(path.join(boards, "team.mjs"), `
    import { appendFile } from "node:fs/promises";
    await appendFile(new URL("./imported", import.meta.url), "import\\n");
    export function listCards({ ids }, { definition }) {
      return {token:"c17", items: (!ids || ids.includes(71)) ? [{
        ref:"17/00", number:"00", id:71, revision:8, type:"story", slug:"pack", parent:"17",
        depends:["16"], title:definition.board.project, status:"not-started",
      }] : []};
    }
    export function getChanges(input) { return {input, changes:[{id:71,revision:9}], cursor:"c18"}; }
    export function apply(input) {
      return {input, results: input.changes.map(change => change.expectedRevision === 8 ?
        {id:71,revision:9,outcome:"applied"} : {id:71,outcome:"refused"})};
    }
  `);
  await writeFile(path.join(workspace.projectRoot, ".aof/aof.config.json"), JSON.stringify({ work: { store: selection } }));
  return { imported, boards, workspace: { ...workspace, config: { work: { store: selection } } } };
}

function publicBoardFind(workspace, ref) {
  const cli = fileURLToPath(new URL("../../core/bin/aof.mjs", import.meta.url));
  return spawnSync(process.execPath, [cli, "work", "find", ref, "--json"], {
    cwd: workspace.projectRoot,
    env: { ...process.env, AOF_GLOBAL_HOME: path.join(workspace.projectRoot, "home") },
    encoding: "utf8",
    timeout: 30_000,
  });
}

workItemStoreTests.push(
  { name: "209/00 task01 · The packaged validator uses the public board schema", async run() {
    const publicSchema = new URL("../../../schemas/work-board.schema.json", import.meta.url);
    const packagedSchema = new URL("../src/store/work-board.schema.json", import.meta.url);
    assert.deepEqual(JSON.parse(await readFile(packagedSchema, "utf8")), JSON.parse(await readFile(publicSchema, "utf8")));
  } },
  { name: "209/00 task00 E1 · File selection does not execute an unselected board", run: () => orchard(async workspace => {
    const fixture = await boardFixture(workspace);
    const reads = [];
    for (const work of [{}, { store: "files" }]) {
      await writeFile(path.join(fixture.boards, "../aof.config.json"), JSON.stringify({ work }));
      const result = publicBoardFind(workspace, "10");
      assert.equal(result.status, 0, result.stderr + result.stdout);
      reads.push(JSON.parse(result.stdout));
    }
    assert.deepEqual(reads[0], reads[1]);
    assert.equal(reads[0][0].ref, "10");
    await assert.rejects(readFile(fixture.imported), { code: "ENOENT" });
  }) },
  { name: "209/00 task00 E2 · Two workspaces select independently and load only on the first store operation", run: () => orchard(async first => {
    const one = await boardFixture(first);
    await orchard(async second => {
      const two = await boardFixture(second, value => ({ ...value, board: { project: "Harbour" } }));
      const a = await commandContext(first);
      const b = await commandContext(second);
      await assert.rejects(readFile(one.imported), { code: "ENOENT" });
      await assert.rejects(readFile(two.imported), { code: "ENOENT" });
      const lookup = async ctx => (await application.invoke("work:find", { query: "17/00" }, ctx)).rows[0].title;
      assert.deepEqual([await lookup(a), await lookup(b), await lookup(a)], ["Orchard", "Harbour", "Orchard"]);
      assert.equal(await readFile(one.imported, "utf8"), "import\n");
      assert.equal(await readFile(two.imported, "utf8"), "import\n");
    });
  }) },
  { name: "209/00 task01 E3 · Duplicate YAML keys fail before import", run: () => orchard(async workspace => {
    const fixture = await boardFixture(workspace, () => "version: 1\nversion: 1\n");
    const result = publicBoardFind(workspace, "17/00");
    assert.equal(result.status, 1);
    assert.match(JSON.parse(result.stdout).error, /duplicated mapping key.*\n[\s\S]*version/i);
    await assert.rejects(readFile(fixture.imported), { code: "ENOENT" });
  }) },
  ...[
    ["unsupported schema version", value => { value.version = 2; }, /version/],
    ["missing relation", value => { delete value.mappings.relations.parent; }, /parent/],
    ["missing operation", value => { delete value.operations.readChanges; }, /readChanges/],
    ["attachment binding missing", value => { value.capabilities = { attachments: { paths: ["*.png"] } }; }, /copy/],
  ].map(([label, edit, message]) => ({
    name: `209/00 task01 · Reject ${label} before import`, run: () => orchard(async workspace => {
      const fixture = await boardFixture(workspace, value => { edit(value); return value; });
      await assert.rejects(resolveWorkItemStore(fixture.workspace).snapshot(), { code: "work-board-definition-invalid", message });
      await assert.rejects(readFile(fixture.imported), { code: "ENOENT" });
    }),
  })),
  ...["manifest", "adapter"].map(kind => ({
    name: `209/00 task01 E4 · Refuse a ${kind} symlink outside .aof`, run: () => orchard(async workspace => {
      const fixture = await boardFixture(workspace);
      const name = kind === "manifest" ? "team.yaml" : "team.mjs";
      const src = path.join(fixture.boards, name);
      const outside = path.join(workspace.projectRoot, name);
      const { rename, symlink } = await import("node:fs/promises");
      await rename(src, outside);
      await symlink(outside, src, "file");
      await assert.rejects(resolveWorkItemStore(fixture.workspace).snapshot(), { code: "work-board-definition-invalid", message: new RegExp(kind + " path") });
      await assert.rejects(readFile(fixture.imported), { code: "ENOENT" });
    }),
  })),
  { name: "209/00 task01 · Missing callable export is named before any mutation", run: () => orchard(async workspace => {
    const fixture = await boardFixture(workspace, value => { value.operations.applyChanges = "changeCards"; return value; });
    const store = resolveWorkItemStore(fixture.workspace);
    await assert.rejects(store.mutate({ operation: "status" }), { code: "work-board-definition-invalid", message: /applyChanges.*changeCards/ });
  }) },
  { name: "209/00 task02 E5 E6 · Public reads use project operation names and optional capabilities can be omitted", run: () => orchard(async workspace => {
    const fixture = await boardFixture(workspace);
    const result = publicBoardFind(workspace, "17/00");
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const [row] = JSON.parse(result.stdout);
    assert.equal(row.ref, "17/00");
    assert.equal(row.title, "Orchard");
    assert.equal(row.parent, "17");
    const store = resolveWorkItemStore(fixture.workspace);
    const snapshot = await store.snapshot();
    const record = await snapshot.read("17/00");
    assert.equal(record.boardId, 71);
    assert.equal(record.revision, 8);
    assert.deepEqual(record.metadata.depends, ["16"]);
    assert.deepEqual(await store.boardCapabilities(), { attachments: undefined, accessProbe: undefined, copyAttachment: undefined });
  }) },
  { name: "209/00 task02 · Selected IDs, cursors, guarded changes and refusals cross the bindings", run: () => orchard(async workspace => {
    const fixture = await boardFixture(workspace);
    const store = resolveWorkItemStore(fixture.workspace);
    assert.equal((await store.readItems({ ids: [71] })).items[0].revision, 8);
    assert.deepEqual((await store.readItems({ ids: [72] })).items, []);
    const changes = await store.readChanges({ cursor: "c17" });
    assert.deepEqual(changes, { input: { cursor: "c17" }, changes: [{ id: 71, revision: 9 }], cursor: "c18" });
    const input = { changes: [
      { key: "k3", id: 71, expectedRevision: 8, title: "Changed", parent: "18" },
      { key: "k4", id: 71, expectedRevision: 7 },
    ] };
    assert.deepEqual(await store.applyChanges(input), {
      input, results: [{ id: 71, revision: 9, outcome: "applied" }, { id: 71, outcome: "refused" }],
    });
  }) },
);

function workDoc(type, number, slug, { parent, status = "in-progress", depends = [] } = {}) {
  return [
    "---", `type: ${type}`, `number: ${number}`, `slug: ${slug}`,
    ...(parent == null ? [] : [`parent: ${parent}`]),
    `status: ${status}`, `title: "${slug}"`, `depends: [${depends.join(", ")}]`, "schema: 1",
    "created: 2026-11-24", "updated: 2026-11-24", "---", "", "Decision lives here.", "",
  ].join("\n");
}

async function publicationFixture(run, { attachments = false, child = false, boardMode = true, accessProbe = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), "aof-publication-"));
  const workspace = { projectRoot: root, workDir: path.join(root, "wiki/work") };
  const boards = path.join(root, ".aof/boards");
  const stateFile = path.join(boards, "remote.json");
  const docHome = path.join(workspace.workDir, "17_milestone_orchard");
  const childHome = path.join(docHome, "stories/00_story_packing");
  try {
    await mkdir(child ? childHome : docHome, { recursive: true });
    await mkdir(boards, { recursive: true });
    await writeFile(path.join(docHome, "SPEC.md"), workDoc("milestone", "17", "orchard"));
    await writeFile(path.join(docHome, "ARCHITECTURE.md"), "Keep this decision.\n");
    const template = path.join(root, ".aof/templates/work/milestone");
    await mkdir(template, { recursive: true });
    for (const name of ["SPEC.md", "STATE.md"]) {
      const asset = new URL(`../../../.aof/templates/work/milestone/${name}`, import.meta.url);
      await writeFile(path.join(template, name), await readFile(asset));
    }
    if (child) await writeFile(path.join(childHome, "STORY.md"), workDoc("story", "00", "packing", { parent: "17" }));
    const manifest = structuredClone(definition);
    if (attachments) manifest.capabilities = { attachments: { paths: ["diagrams/**/*.png"], copy: "attach" } };
    if (accessProbe) manifest.capabilities = { ...manifest.capabilities, accessProbe: "probe" };
    await writeFile(path.join(boards, "team.yaml"), JSON.stringify(manifest));
    await writeFile(path.join(root, ".aof/aof.config.json"), JSON.stringify({ work: { store: boardMode ? selection : "files" } }));
    await writeFile(stateFile, JSON.stringify({ items: [], writes: [], copies: [], reads: [], mode: null }));
    await writeFile(path.join(boards, "team.mjs"), `
      import {readFile,writeFile} from "node:fs/promises";
      import {setTimeout as sleep} from "node:timers/promises";
      const file=new URL("./remote.json", import.meta.url);
      const read=async()=>JSON.parse(await readFile(file,"utf8"));
      const save=state=>writeFile(file,JSON.stringify(state));
      export async function listCards({ids,keys}) {
        const state=await read();
        if (["read-timeout", "commit-unreadable"].includes(state.mode) && (ids || keys)) throw new Error("read timeout");
        const items=structuredClone(state.items.filter(item => (!ids || ids.includes(item.id)) && (!keys || keys.includes(item.key))));
        if (state.afterRead && ids) {
          const {id, values}=state.afterRead;
          state.afterRead=null;
          const item=state.items.find(row=>row.id===id);
          Object.assign(item, values, {revision:item.revision+1});
          (state.events??=[]).push({seq:(state.events.at(-1)?.seq??0)+1,id,revision:item.revision});
          await save(state);
        }
        return {items};
      }
      export async function getChanges({cursor}={}){
        const state=await read();
        (state.feedCursors??=[]).push(cursor??null);
        await save(state);
        if (state.mode === "slow-feed") await sleep(300);
        if (state.rejectCursor != null && cursor === state.rejectCursor) {
          state.rejectCursor=null;
          await save(state);
          return {changes:[],cursor,coverage:false};
        }
        const events=state.events??[];
        const after=cursor==null ? -1 : Number(String(cursor).slice(1));
        const position="c"+(events.length ? events.at(-1).seq : 0);
        return {changes:events.filter(event=>event.seq>after).map(({id,revision,deleted})=>({id,revision,deleted})),cursor:position,coverage:true};
      }
      export async function apply({changes}) {
        const state=await read();
        const results=[];
        for (const change of changes) {
          if (state.mode === "drop-write") {
            state.mode = null;
            await save(state);
            throw new Error("no reply");
          }
          state.writes.push(change);
          if (state.mode === "refuse-child" && change.ref === "17/00") {
            results.push({key:change.key,outcome:"refused",code:"fixture-refused"});
            continue;
          }
          const creating=change.id == null;
          const item=creating ? {id:410+state.items.length,revision:7} : state.items.find(row=>row.id===change.id);
          if (!creating && item.revision!==change.expectedRevision) {
            results.push({key:change.key,id:change.id,outcome:"refused",code:"fixture-stale"});
            continue;
          }
          const {expectedRevision,correlationKey,key,...values}=change;
          Object.assign(item,values,{key:correlationKey ?? item.key,revision:item.revision+1});
          item.number=item.ref.split("/").at(-1);
          item.parent=state.items.find(row=>row.id===item.parentId)?.ref??null;
          item.depends=item.dependsIds.map(id=>state.items.find(row=>row.id===id)?.ref);
          item.slug=item.title;
          if (creating) state.items.push(item);
          if (state.mode === "wrong-values") item.title="unexpected";
          if (state.mode === "slow-create") await sleep(4000);
          if (state.mode === "lose-reply" && !creating) {
            state.mode = null;
            await save(state);
            throw new Error("reply lost");
          }
          if ((state.mode === "lose-child" && item.ref === "17/00") || (state.mode === "lose-status" && !creating)) {
            if (state.mode === "lose-status") state.mode = "commit-unreadable";
            await save(state);
            throw new Error("reply lost");
          }
          results.push({key,id:item.id,revision:item.revision,outcome:"applied"});
        }
        await save(state);
        return {results};
      }
      export async function probe() {
        const state=await read();
        const refuse=(message,code,status)=>{ throw Object.assign(new Error(message),{code,status}); };
        if (state.mode==="probe-auth") refuse("Sign-in is unavailable; the request carried Authorization: Bearer eyJ0eXAiOiJKV1QifQ.eyJzdWIiOiJ1In0.c2ln", "azure-board-auth", 401);
        if (state.mode==="probe-403") refuse("GET returned HTTP 403.", "azure-board-http", 403);
        return {ok:true};
      }
      export async function attach({id,name,bytes,contentKey,expectedRevision}) {
        const state=await read();
        const item=state.items.find(row=>row.id===id);
        const linked=state.copies.find(copy=>copy.id===id&&copy.contentKey===contentKey);
        if (linked) return {outcome:"applied",id,revision:item.revision,url:linked.url};
        if (item.revision!==expectedRevision || state.mode==="unlinked") return {outcome:"unknown",id};
        const url="fixture:"+contentKey;
        state.copies.push({id,name,contentKey,url,text:bytes.toString()});
        item.revision++;
        await save(state);
        if (state.mode==="lose-attachment") throw new Error("attachment acknowledgement lost");
        return {outcome:"applied",id,revision:item.revision,url};
      }
    `);
    const state = async () => JSON.parse(await readFile(stateFile, "utf8"));
    const adjust = async change => { const next = await state(); change(next); await writeFile(stateFile, JSON.stringify(next)); };
    const context = async () => commandContext(workspace);
    const invoke = async (id, input) => application.invoke(id, input, await context());
    const publish = (ref = "17", descendants = false) => invoke("work:publish-board", { ref, refinementComplete: true, descendants });
    await run({ root, workspace, docHome, childHome, state, adjust, context, invoke, publish });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

workItemStoreTests.push(
  { name: "209/02 task00 E9 · Successful refine close publishes while unfinished refinement stays local", run: () => publicationFixture(async fixture => {
    const { invoke, state, publish, docHome, workspace, adjust } = fixture;
    const rows = (await invoke("work:find", { query: "17" })).rows;
    assert.equal(rows.length, 1);
    assert.equal(rows[0].dir, docHome);
    await assert.rejects(invoke("work:publish-board", { ref: "17" }), { code: "work-board-refinement-required" });
    assert.equal((await state()).writes.length, 0);
    const source = new URL("../../../packages/acd/assets/commands/refine.md", import.meta.url);
    const procedure = await readFile(source, "utf8");
    const trigger = procedure.indexOf("aof work publish-board <ref> --refinement-complete");
    assert.ok(trigger > procedure.indexOf("<progress_tracking>"));
    assert.ok(trigger < procedure.lastIndexOf("aof work run-complete <ref> --outcome done"));
    const reply = await publish();
    assert.deepEqual(reply.results, [{ ref: "17", id: 410, outcome: "verified" }]);
    assert.equal((await state()).writes.length, 1);
    const result = publicBoardFind(workspace, "17");
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(JSON.parse(result.stdout).length, 1);
    assert.equal(await readFile(path.join(docHome, "ARCHITECTURE.md"), "utf8"), "Keep this decision.\n");
    await adjust(state => { state.items = []; });
    const missing = (await invoke("work:find", { query: "17" })).rows[0];
    assert.equal(missing.boardId, 410);
    assert.match(missing.fault.message, /410.*17/);
    assert.equal(missing.dir, docHome);
    assert.equal(await readFile(path.join(docHome, "ARCHITECTURE.md"), "utf8"), "Keep this decision.\n");
  }) },
  { name: "209/02 task00 · File-mode refinement and ordinary promotion create no board items", run: async () => {
    await publicationFixture(async ({ publish, state }) => {
      assert.equal((await publish()).skipped, "local-file-mode");
      assert.equal((await state()).writes.length, 0);
    }, { boardMode: false });
    await publicationFixture(async ({ workspace, invoke, state }) => {
      const backlog = path.join(workspace.workDir, "backlog/chore_queued");
      await mkdir(backlog, { recursive: true });
      await writeFile(path.join(backlog, "CHORE.md"), "---\ntype: chore\nslug: queued\ntitle: queued\nstatus: not-started\ndepends: []\n---\n");
      await invoke("work:promote", { slug: "queued" });
      assert.equal((await state()).writes.length, 0);
    });
  } },
  { name: "209/02 task00 · The same board ID in two projects has two independent journals", run: () => publicationFixture(async a => {
    await publicationFixture(async b => {
      await a.publish();
      await b.publish();
      await a.invoke("work:status", { ref: "17", status: "in-review" });
      assert.equal((await a.state()).items[0].id, (await b.state()).items[0].id);
      assert.equal((await a.state()).items[0].status, "in-review");
      assert.equal((await b.state()).items[0].status, "in-progress");
    });
  }) },
  { name: "209/02 task01 E3 and E4 · A refused member resumes and a lost create response is read back once", run: () => publicationFixture(async fixture => {
    const { publish, state, adjust, workspace } = fixture;
    await adjust(state => { state.mode = "refuse-child"; });
    const first = await publish("17", true);
    assert.deepEqual(first.results.map(row => [row.ref, row.outcome]), [["17", "verified"], ["17/00", "pending"]]);
    await adjust(state => { state.mode = "lose-child"; });
    const result = spawnSync(process.execPath, [fileURLToPath(new URL("../../core/bin/aof.mjs", import.meta.url)), "work", "publish-board", "17", "--refinement-complete", "--descendants", "--json"], {
      cwd: workspace.projectRoot, env: { ...process.env, AOF_GLOBAL_HOME: path.join(workspace.projectRoot, "home") }, encoding: "utf8", timeout: 30_000,
    });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.equal(JSON.parse(result.stdout).published, true);
    assert.deepEqual((await state()).items.map(({ id, parentId }) => [id, parentId]), [[410, null], [411, 410]]);
    assert.equal((await state()).writes.filter(change => change.ref === "17").length, 1);
    assert.equal((await state()).writes.filter(change => change.ref === "17/00").length, 2);
  }, { child: true }) },
  { name: "209/02 task01 · Timed-out readback and unexpected values keep publication pending", run: () => publicationFixture(async ({ publish, state, adjust, docHome }) => {
    await adjust(state => { state.mode = "read-timeout"; });
    assert.equal((await publish()).published, false);
    assert.equal((await state()).writes.length, 0);
    await adjust(state => { state.mode = "wrong-values"; });
    assert.equal((await publish()).results[0].code, "work-board-values-unverified");
    assert.equal((await publish()).published, false);
    assert.equal((await state()).writes.length, 1);
    assert.ok(await readFile(path.join(docHome, "ARCHITECTURE.md")));
  }) },
  { name: "209/02 task01 · Concurrent processes issue a single create", run: () => publicationFixture(async ({ workspace, state, adjust }) => {
    await adjust(state => { state.mode = "slow-create"; });
    const { execFile } = await import("node:child_process");
    const cli = fileURLToPath(new URL("../../core/bin/aof.mjs", import.meta.url));
    const run = () => new Promise((resolve, reject) => {
      execFile(process.execPath, [cli, "work", "publish-board", "17", "--refinement-complete", "--json"], {
        cwd: workspace.projectRoot, env: { ...process.env, AOF_GLOBAL_HOME: path.join(workspace.projectRoot, "home") }, timeout: 30_000,
      }, (error, stdout) => {
        try { resolve({ status: error?.code ?? 0, result: JSON.parse(stdout) }); }
        catch (parseError) { reject(error ?? parseError); }
      });
    });
    const responses = await Promise.all([run(), run()]);
    assert.ok(responses.some(r => r.status === 0));
    assert.ok(responses.every(r => r.status === 0 || r.result.code === "work-board-busy"));
    assert.equal((await state()).writes.length, 1);
  }) },
  { name: "209/02 task02 E5 · Inserting before linked work preserves its ID, rank and local documents", run: () => publicationFixture(async ({ publish, invoke, state, workspace }) => {
    await publish();
    await invoke("work:insert-milestone", { slug: "new-driver", at: "17", yes: true });
    const found = (await invoke("work:find", { query: "18" })).rows;
    assert.equal(found.length, 1);
    assert.equal(found[0].dir, path.join(workspace.workDir, "18_milestone_orchard"));
    assert.equal(await readFile(path.join(found[0].dir, "ARCHITECTURE.md"), "utf8"), "Keep this decision.\n");
    assert.deepEqual((await state()).items.map(({ id, ref, rank }) => [id, ref, rank]), [[410, "18", 18]]);
  }) },
  { name: "209/02 task02 E6 and E10 · Board lifecycle is guarded and archive belongs to files", run: () => publicationFixture(async ({ publish, invoke, state, adjust, context, docHome }) => {
    await publish();
    await invoke("work:status", { ref: "17", status: "in-review" });
    assert.equal((await state()).writes.at(-1).expectedRevision, 8);
    assert.match(await readFile(path.join(docHome, "SPEC.md"), "utf8"), /status: in-review.*Decision lives here\./s);
    await assert.rejects(invoke("work:status", { ref: "17", status: "not-started" }), { code: "status-edge-not-applicable" });
    const store = resolveWorkItemStore((await context()).workspace);
    await assert.rejects(store.mutate({ operation: "rollback", ref: "17", toStatus: "not-started" }), { code: "rollback-not-applicable" });
    await adjust(state => { state.mode = "lose-status"; });
    await assert.rejects(store.mutate({ operation: "status", ref: "17", toStatus: "done" }), { code: "work-board-readback-pending" });
    assert.match(await readFile(path.join(docHome, "SPEC.md"), "utf8"), /status: in-review/);
    await adjust(state => { state.mode = null; });
    assert.equal((await store.mutate({ operation: "status", ref: "17", toStatus: "done" })).status, "done");
    assert.equal((await state()).writes.filter(change => change.status === "done").length, 1);
    for (const args of [{ ref: "17" }, { done: true }, { done: true, yes: true }]) {
      await assert.rejects(invoke("work:archive", args), { code: "work-board-archive-local-only" });
    }
    assert.equal((await state()).items[0].status, "done");
    assert.equal(await readFile(path.join(docHome, "ARCHITECTURE.md"), "utf8"), "Keep this decision.\n");
  }) },
  { name: "209/02 task02 · An eligible local item still moves to archive", run: () => publicationFixture(async ({ invoke, workspace, docHome, state }) => {
    await writeFile(path.join(docHome, "SPEC.md"), workDoc("milestone", "17", "orchard", { status: "done" }));
    await invoke("work:archive", { ref: "17" });
    assert.equal(await readFile(path.join(workspace.workDir, "archive/17_milestone_orchard/ARCHITECTURE.md"), "utf8"), "Keep this decision.\n");
    assert.equal((await state()).writes.length, 0);
  }, { boardMode: false }) },
  { name: "209/02 task02 · A held item lock refuses file placement before its board writes", run: () => publicationFixture(async ({ root, publish, invoke, state, docHome }) => {
    await publish();
    const workspaceId = application.mesh.store.workspaceIdFor(root);
    await writeFile(path.join(root, ".aof/aof.config.json"), JSON.stringify({
      work: { store: selection }, mesh: { enabled: true, nodeId: "control-a", workspaceId },
    }));
    const { seedActive } = await import("../../../test/support/item-lock-fixture.mjs");
    const env = { ...process.env, AOF_GLOBAL_HOME: path.join(root, "home") };
    await seedActive({ home: env.AOF_GLOBAL_HOME, workspaceId, env }, { itemRef: "17", node: "board-worker" });
    const count = (await state()).writes.length;
    await assert.rejects(invoke("work:insert-milestone", { slug: "would-shift", at: "17", yes: true }), { code: "item-locked-by-assignment" });
    assert.equal((await state()).writes.length, count);
    assert.equal((await invoke("work:find", { query: "17" })).rows[0].dir, docHome);
    assert.equal((await invoke("work:find", { query: "18" })).rows.length, 0);
  }) },
  { name: "209/02 task02 · Preview is inert and moving a child preserves its verified board ID", run: () => publicationFixture(async fixture => {
    const { publish, invoke, state, workspace } = fixture;
    const newHome = path.join(workspace.workDir, "18_milestone_destination");
    await mkdir(newHome);
    await writeFile(path.join(newHome, "SPEC.md"), workDoc("milestone", "18", "destination"));
    await publish("17", true);
    await publish("18");
    const before = (await state()).writes.length;
    const plan = await invoke("work:renumber", { ref: "17/00", to: "18/00", dryRun: true });
    assert.equal(plan.to, "18/00");
    assert.equal((await state()).writes.length, before);
    assert.match(await readFile(path.join(fixture.childHome, "STORY.md"), "utf8"), /parent: 17/);
    await invoke("work:renumber", { ref: "17/00", to: "18/00" });
    const moved = (await state()).items.find(row => row.id === 411);
    assert.equal(moved.parentId, 412);
    assert.equal(moved.ref, "18/00");
    assert.match(await readFile(path.join(newHome, "stories/00_story_packing/STORY.md"), "utf8"), /parent: 18/);
  }, { child: true }) },
  { name: "209/02 task03 E7 and E8 · Eligible copies recover by content and optional attachment support can be absent", run: async () => {
    const seed = async ({ root, docHome }, withSymlink) => {
      const diagrams = path.join(docHome, "diagrams");
      await mkdir(diagrams);
      await writeFile(path.join(diagrams, "flow.png"), "flow");
      await writeFile(path.join(diagrams, "draft.txt"), "draft");
      if (withSymlink) {
        const { symlink } = await import("node:fs/promises");
        const outside = path.join(root, "outside.png");
        await writeFile(outside, "never copy");
        await symlink(outside, path.join(diagrams, "escape.png"), "file");
      }
    };
    await publicationFixture(async fixture => {
      await seed(fixture, true);
      await fixture.adjust(state => { state.mode = "lose-attachment"; });
      await assert.rejects(fixture.publish(), /acknowledgement lost/);
      const retry = await fixture.publish();
      assert.equal(retry.published, true);
      assert.deepEqual((await fixture.state()).copies.map(({ name, text }) => [name, text]), [["flow.png", "flow"]]);
      assert.equal(await readFile(path.join(fixture.docHome, "diagrams/flow.png"), "utf8"), "flow");
    }, { attachments: true });
    await publicationFixture(async fixture => {
      await seed(fixture, false);
      assert.equal((await fixture.publish()).published, true);
      assert.equal((await fixture.state()).copies.length, 0);
    });
  } },
  { name: "209/02 task03 · An uploaded artifact without a verified relation stays pending", run: () => publicationFixture(async ({ docHome, publish, adjust }) => {
    await mkdir(path.join(docHome, "diagrams"));
    await writeFile(path.join(docHome, "diagrams/flow.png"), "flow");
    await adjust(state => {state.mode = "unlinked";});
    assert.equal((await publish()).results[0].code, "work-board-attachment-unverified");
  }, { attachments: true }) },
);

// 209/03 — a linked milestone 17 with stories 17/01 and 17/02, and an independent milestone 18
// with story 18/00, all published to the fixture board. `teammate` edits the board outside AOF and
// appends the revision to the fixture's change feed.
async function conflictFixture(run, { primed = true, ...options } = {}) {
  return publicationFixture(async fixture => {
    const { workspace, docHome, publish, state, adjust, context } = fixture;
    for (const [number, slug] of [["01", "sorting"], ["02", "packing"]]) {
      const dir = path.join(docHome, `stories/${number}_story_${slug}`);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, "STORY.md"), workDoc("story", number, slug, { parent: "17" }));
    }
    const harbour = path.join(workspace.workDir, "18_milestone_harbour");
    await mkdir(path.join(harbour, "stories/00_story_crates"), { recursive: true });
    await writeFile(path.join(harbour, "SPEC.md"), workDoc("milestone", "18", "harbour"));
    await writeFile(path.join(harbour, "stories/00_story_crates/STORY.md"), workDoc("story", "00", "crates", { parent: "18" }));
    assert.equal((await publish("17", true)).published, true);
    assert.equal((await publish("18", true)).published, true);
    const item = async ref => (await state()).items.find(row => row.ref === ref);
    const teammate = (ref, values = {}, { deleted = false, feed = true } = {}) => adjust(next => {
      const target = next.items.find(row => row.ref === ref);
      const seq = (next.events?.at(-1)?.seq ?? 0) + 1;
      if (deleted) {
        next.items = next.items.filter(row => row !== target);
        if (feed) (next.events ??= []).push({ seq, id: target.id, revision: target.revision + 1, deleted: true });
        return;
      }
      Object.assign(target, values);
      target.revision += 1;
      if (feed) (next.events ??= []).push({ seq, id: target.id, revision: target.revision });
    });
    // Each call loads the workspace afresh, as a restarted daemon or a new CLI process would.
    const store = async () => resolveWorkItemStore((await context()).workspace);
    const poll = async () => (await store()).pollChanges();
    const conflicts = async () => (await store()).boardConflicts();
    const journal = async () => {
      const dir = path.join(workspace.projectRoot, ".aof/board-state");
      const { readdir } = await import("node:fs/promises");
      const name = (await readdir(dir)).find(file => file.endsWith(".json"));
      return JSON.parse(await readFile(path.join(dir, name), "utf8"));
    };
    const halt = async ref => application.loop.cycle.boardConflictHalt(ref, await context());
    if (primed) await poll();
    await run({ ...fixture, item, teammate, store, poll, conflicts, journal, halt });
  }, options);
}

const resyncCommand = 'aof work resync-board 17/02';

workItemStoreTests.push(
  { name: "209/03 task00 E1 · A state change with no pending edit records a stop", run: () => conflictFixture(async ({ item, teammate, poll, conflicts, invoke }) => {
    const before = await item("17/02");
    await teammate("17/02", { status: "done" });
    const result = await poll();
    assert.deepEqual(result.conflicts, [{ ref: "17/02", id: before.id, revision: before.revision + 1, deleted: false }]);
    assert.deepEqual(await conflicts(), result.conflicts);
    await assert.rejects(invoke("work:status", { ref: "17/02", status: "in-review" }), error =>
      error.code === "work-board-conflict" && error.message.includes(resyncCommand) && error.message.includes(String(before.id)));
  }) },
  { name: "209/03 task00 E2 · AOF's own acknowledged write is not an external edit", run: () => conflictFixture(async ({ item, invoke, adjust, poll, journal, halt }) => {
    await invoke("work:status", { ref: "17/02", status: "in-review" });
    const written = await item("17/02");
    await adjust(next => { (next.events ??= []).push({ seq: (next.events.at(-1)?.seq ?? 0) + 1, id: written.id, revision: written.revision }); });
    assert.deepEqual((await poll()).conflicts, []);
    assert.equal(Object.values((await journal()).links).find(entry => entry.ref === "17/02").revision, written.revision);
    assert.equal(await halt("17"), null);
  }) },
  { name: "209/03 task00 E3 · A comment on a linked item does not stop the workflow", run: () => conflictFixture(async ({ item, teammate, poll, journal }) => {
    await teammate("17/02", { comment: "Looks good" });
    assert.deepEqual((await poll()).conflicts, []);
    assert.equal(Object.values((await journal()).links).find(entry => entry.ref === "17/02").revision, (await item("17/02")).revision);
  }) },
  { name: "209/03 task00 E13 · A reorder on the board stops the workflow", run: () => conflictFixture(async ({ item, teammate, poll }) => {
    await teammate("17/02", { rank: 99 });
    const { id, revision } = await item("17/02");
    assert.deepEqual((await poll()).conflicts, [{ ref: "17/02", id, revision, deleted: false }]);
  }) },
  { name: "209/03 task00 E4 · A repeated observation keeps the one stop", run: () => conflictFixture(async ({ item, teammate, adjust, poll, conflicts }) => {
    await teammate("17/02", { status: "done" });
    await poll();
    const { id, revision } = await item("17/02");
    await adjust(next => { next.events.push({ seq: next.events.at(-1).seq + 1, id, revision }); });
    await poll();
    assert.deepEqual(await conflicts(), [{ ref: "17/02", id, revision, deleted: false }]);
  }) },
  ...[
    ["the title", () => ({ title: "renamed" }), true],
    ["the state", () => ({ status: "done" }), true],
    ["the parent link", async item => ({ parentId: (await item("18")).id }), true],
    ["a dependency link", async item => ({ dependsIds: [(await item("17/01")).id] }), true],
    ["the order", () => ({ rank: 99 }), true],
    ["a tag", () => ({ tags: ["urgent"] }), false],
    ["a field AOF does not map", () => ({ colour: "red" }), false],
    ["an attachment", () => ({ attachments: ["photo.png"] }), false],
    ["the state, to the value AOF already intends", async item => ({ status: (await item("17/02")).status }), false],
  ].map(([change, values, recorded]) => ({
    name: `209/03 task00 [outline] a teammate changing ${change} is ${recorded ? "recorded" : "not recorded"} as a stop`,
    run: () => conflictFixture(async ({ item, teammate, poll }) => {
      await teammate("17/02", await values(item));
      assert.equal((await poll()).conflicts.length, recorded ? 1 : 0);
    }),
  })),
  { name: "209/03 task00 · The feed position advances only after its observations are saved", run: () => conflictFixture(async ({ teammate, adjust, poll, state, journal }) => {
    const saved = (await journal()).feed.cursor;
    await teammate("17/02", { status: "done" });
    await adjust(next => { next.mode = "read-timeout"; });
    await assert.rejects(poll());
    assert.equal((await journal()).feed.cursor, saved);
    await adjust(next => { next.mode = null; });
    assert.equal((await poll()).conflicts.length, 1);
    assert.deepEqual((await state()).feedCursors.slice(-2), [saved, saved]);
  }) },

  { name: "209/03 task01 E5 · The stop survives a restart and refuses the next status change", run: () => conflictFixture(async ({ item, teammate, poll, invoke, state, docHome }) => {
    await teammate("17/02", { status: "done" });
    await poll();
    const { id, revision } = await item("17/02");
    const writes = (await state()).writes.length;
    const story = path.join(docHome, "stories/02_story_packing/STORY.md");
    await assert.rejects(invoke("work:status", { ref: "17/02", status: "in-review" }), error =>
      error.code === "work-board-conflict" && error.message.includes("17/02") &&
      error.message.includes(String(id)) && error.message.includes(`revision ${revision}`));
    assert.equal((await state()).writes.length, writes);
    assert.match(await readFile(story, "utf8"), /status: in-progress/);
  }) },
  { name: "209/03 task01 E6 · A stale write is classified and recorded as a stop", run: () => conflictFixture(async ({ item, teammate, invoke, conflicts, docHome }) => {
    await teammate("17/02", { status: "done" }, { feed: false });
    const { id, revision } = await item("17/02");
    await assert.rejects(invoke("work:status", { ref: "17/02", status: "in-review" }), { code: "work-board-conflict" });
    assert.deepEqual(await conflicts(), [{ ref: "17/02", id, revision, deleted: false }]);
    assert.match(await readFile(path.join(docHome, "stories/02_story_packing/STORY.md"), "utf8"), /status: in-progress/);
  }) },
  { name: "209/03 task01 · A stale write caused by an untracked change is retried under the new revision", run: () => conflictFixture(async ({ item, teammate, invoke, conflicts }) => {
    await teammate("17/02", { comment: "Noted" }, { feed: false });
    await invoke("work:status", { ref: "17/02", status: "in-review" });
    assert.equal((await item("17/02")).status, "in-review");
    assert.equal((await item("17/02")).comment, "Noted");
    assert.deepEqual(await conflicts(), []);
  }) },
  { name: "209/03 task01 E7 · Only the workflows that contain the item halt", run: () => conflictFixture(async ({ item, teammate, poll, halt, invoke }) => {
    await teammate("17/02", { status: "done" });
    await poll();
    const { id, revision } = await item("17/02");
    const held = await halt("17");
    assert.deepEqual(held.act, { act: "halt", stop: "board-conflict", ref: "17", producer: "work-store:work-board-conflict" });
    assert.deepEqual(held.details, { conflict: "17/02", boardId: id, revision, resync: resyncCommand });
    assert.equal(await halt("18"), null);
    await invoke("work:status", { ref: "18/00", status: "in-review" });
    assert.equal((await item("18/00")).status, "in-review");
  }) },
  { name: "209/03 task01 · A board conflict is the operator's stop", async run() {
    const { OPERATOR_STOPS, REPAIRABLE_STOPS, decideHaltRepair, mapStoreRefusal } = await import("@aof/work-loop/engine");
    assert.ok(OPERATOR_STOPS.includes("board-conflict"));
    assert.ok(!REPAIRABLE_STOPS.includes("board-conflict"));
    assert.equal(decideHaltRepair({ stop: "board-conflict", repairOn: true, priorRepair: null }), "stop");
    assert.deepEqual(mapStoreRefusal({ code: "work-board-conflict" }), { stop: "board-conflict", producer: "work-store:work-board-conflict" });
  } },
  { name: "209/03 task01 [outline] The stop is checked at each door into the workflow", run: () => conflictFixture(async ({ teammate, poll, halt, invoke, item, context, workspace }) => {
    await teammate("17/02", { title: "renamed upstream" });
    await poll();
    await assert.rejects(invoke("work:status", { ref: "17/02", status: "in-review" }), { code: "work-board-conflict" });
    await invoke("work:status", { ref: "17/01", status: "in-review" });
    assert.equal((await item("17/01")).status, "in-review");
    assert.equal((await halt("17")).act.stop, "board-conflict");
    assert.equal((await halt("17/02")).act.stop, "board-conflict");
    assert.equal(await halt("18"), null);
    const ctx = await context();
    await assert.rejects(application.loop.work.dispatch.resolveDispatchLane(workspace.projectRoot, "17/03", { workspace: ctx.workspace }),
      error => error.code === "work-board-conflict" && error.message.includes("17/02"));
    assert.equal((await invoke("work:find", { query: "17/02" })).rows.length, 1);
    assert.equal((await (await resolveWorkItemStore(ctx.workspace).snapshot()).read("17/02")).metadata.title, "packing");
  }) },

  { name: "209/03 task02 E8 · An unchanged board resumes polling without a stop", run: () => conflictFixture(async ({ adjust, poll, journal, state }) => {
    const saved = (await journal()).feed.cursor;
    await adjust(next => { next.rejectCursor = saved; });
    assert.deepEqual((await poll()).conflicts, []);
    assert.deepEqual((await state()).feedCursors.slice(-2), [saved, null], "the rejected position is replaced by a fresh read");
    await poll();
    assert.equal((await state()).feedCursors.at(-1), (await journal()).feed.cursor);
  }) },
  { name: "209/03 task02 E9 · A change made while the feed was lost is still found", run: () => conflictFixture(async ({ adjust, teammate, poll, journal, item }) => {
    const saved = (await journal()).feed.cursor;
    await adjust(next => { next.rejectCursor = saved; });
    await teammate("17/01", { title: "retitled" }, { feed: false });
    const { id, revision } = await item("17/01");
    assert.deepEqual((await poll()).conflicts, [{ ref: "17/01", id, revision, deleted: false }]);
  }) },
  { name: "209/03 task02 · A change between the startup comparison and the next poll is not missed", run: () => conflictFixture(async ({ adjust, poll, item, journal }) => {
    assert.equal((await journal()).feed, undefined, "no usable feed position yet");
    const { id } = await item("17/01");
    // The edit lands after the comparison has read 17/01 and after the feed position was taken.
    await adjust(next => { next.afterRead = { id, values: { title: "late" } }; });
    assert.deepEqual((await poll()).conflicts, []);
    const { revision } = await item("17/01");
    assert.deepEqual((await poll()).conflicts, [{ ref: "17/01", id, revision, deleted: false }]);
  }, { primed: false }) },
  { name: "209/03 task02 · A deleted linked item seen in the feed is a stop", run: () => conflictFixture(async ({ item, teammate, poll, docHome }) => {
    const { id } = await item("17/02");
    await teammate("17/02", {}, { deleted: true });
    const [conflict] = (await poll()).conflicts;
    assert.deepEqual({ ref: conflict.ref, id: conflict.id, deleted: conflict.deleted }, { ref: "17/02", id, deleted: true });
    assert.match(await readFile(path.join(docHome, "stories/02_story_packing/STORY.md"), "utf8"), /Decision lives here\./);
  }) },

  { name: "209/03 task03 E10 · Resync restores tracked values and leaves other board content alone", run: () => conflictFixture(async ({ item, teammate, poll, invoke, state, conflicts, halt }) => {
    await teammate("17/02", { status: "done", title: "renamed", comment: "Keep this", colour: "red" });
    await poll();
    const before = await item("17/02");
    const result = await invoke("work:resync-board", { ref: "17/02" });
    const after = await item("17/02");
    assert.deepEqual(result, { ref: "17/02", id: before.id, revision: before.revision + 1, resynced: true });
    assert.equal((await state()).writes.at(-1).expectedRevision, before.revision);
    assert.deepEqual([after.status, after.title, after.rank, after.parentId], ["in-progress", "packing", 2, (await item("17")).id]);
    assert.deepEqual([after.comment, after.colour], ["Keep this", "red"]);
    assert.deepEqual(await conflicts(), []);
    assert.equal(await halt("17"), null);
  }) },
  { name: "209/03 task03 E11 · A second edit during resync leaves the workflow stopped", run: () => conflictFixture(async ({ item, teammate, poll, invoke, adjust, conflicts }) => {
    await teammate("17/02", { status: "done" });
    await poll();
    const { id } = await item("17/02");
    await adjust(next => { next.afterRead = { id, values: { title: "edited mid-resync" } }; });
    await assert.rejects(invoke("work:resync-board", { ref: "17/02" }), { code: "work-board-conflict" });
    assert.deepEqual(await conflicts(), [{ ref: "17/02", id, revision: (await item("17/02")).revision, deleted: false }]);
    assert.equal((await item("17/02")).title, "edited mid-resync");
  }) },
  { name: "209/03 task03 E12 · A deleted item is not recreated by resync", run: () => conflictFixture(async ({ teammate, poll, invoke, state, conflicts }) => {
    await teammate("17/02", {}, { deleted: true });
    await poll();
    const writes = (await state()).writes.length;
    await assert.rejects(invoke("work:resync-board", { ref: "17/02" }), error =>
      error.code === "work-board-conflict" && /recycle bin/.test(error.message) && error.message.includes(resyncCommand));
    assert.equal((await state()).writes.length, writes);
    assert.equal((await conflicts())[0].deleted, true);
  }) },
  { name: "209/03 task03 · The workflow continues after a verified resync", run: () => conflictFixture(async ({ teammate, poll, invoke, halt }) => {
    await teammate("17/02", { status: "done" });
    await poll();
    assert.equal((await halt("17")).act.stop, "board-conflict");
    await invoke("work:resync-board", { ref: "17/02" });
    assert.equal(await halt("17"), null);
    await invoke("work:status", { ref: "17/02", status: "in-review" });
  }) },
  ...[
    ["is applied", "revision 8 with AOF's values", null, "cleared"],
    ["is applied", "revision 8 with a different title", "wrong-values", "kept"],
    ["gets no reply", "revision 8 with AOF's values", "lose-reply", "cleared"],
    ["gets no reply", "revision 7 unchanged", "drop-write", "kept"],
  ].map(([write, readback, mode, outcome]) => ({
    name: `209/03 task03 [outline] a resync write that ${write} with a readback of ${readback} leaves the stop ${outcome}`,
    run: () => conflictFixture(async ({ teammate, poll, invoke, adjust, conflicts }) => {
      await teammate("17/02", { status: "done" });
      await poll();
      await adjust(next => { next.mode = mode; });
      const resync = invoke("work:resync-board", { ref: "17/02" });
      if (outcome === "cleared") assert.equal((await resync).resynced, true);
      else await assert.rejects(resync, { code: "work-board-conflict" });
      await adjust(next => { next.mode = null; });
      assert.equal((await conflicts()).length, outcome === "cleared" ? 0 : 1);
    }),
  })),
  { name: "209/03 task03 [outline] Resync refuses when there is nothing to recover", run: () => conflictFixture(async ({ invoke, state }) => {
    const writes = (await state()).writes.length;
    assert.deepEqual(await invoke("work:resync-board", { ref: "17/01" }), { ref: "17/01", id: (await state()).items.find(row => row.ref === "17/01").id, resynced: false, reason: "no-conflict" });
    assert.equal((await state()).writes.length, writes);
    await assert.rejects(invoke("work:resync-board", { ref: "99" }), { code: "ref-not-found" });
  }) },
  { name: "209/03 task03 [outline] Resync is a skip in local file mode", run: () => publicationFixture(async ({ invoke }) => {
    assert.deepEqual(await invoke("work:resync-board", { ref: "17" }), { ref: "17", resynced: false, skipped: "local-file-mode" });
  }, { boardMode: false }) },
);

workItemStoreTests.push(
  { name: "209/03 task00 · The armed observation polls the board without a pending edit", run: () => conflictFixture(async ({ teammate, context, conflicts }) => {
    const { setTimeout: sleep } = await import("node:timers/promises");
    const reports = [];
    const handle = resolveWorkItemStore((await context()).workspace).observe({ boardPollIntervalMs: 20, reportDegrade: (...args) => reports.push(args) });
    try {
      await teammate("17/02", { status: "done" });
      for (let tries = 0; tries < 100 && (await conflicts()).length === 0; tries++) await sleep(20);
      assert.equal((await conflicts())[0]?.ref, "17/02");
      assert.deepEqual(reports, []);
    } finally {
      await handle.dispose();
    }
  }) },
  { name: "209/03 task00 · A status change made while a poll reads the board is applied and is not a conflict", run: () => conflictFixture(async ({ adjust, poll, invoke, item, conflicts }) => {
    await adjust(next => { next.mode = "slow-feed"; });
    const polling = poll();
    await new Promise(resolve => setTimeout(resolve, 50));
    await invoke("work:status", { ref: "17/02", status: "in-review" });
    await polling;
    await adjust(next => { next.mode = null; });
    assert.equal((await item("17/02")).status, "in-review");
    assert.deepEqual(await conflicts(), []);
    await poll();
    assert.deepEqual(await conflicts(), []);
  }) },
  { name: "209/03 task03 · The public CLI refuses the conflicted status change and resyncs the item", run: () => conflictFixture(async ({ teammate, poll, workspace }) => {
    await teammate("17/02", { status: "done" });
    await poll();
    const cli = fileURLToPath(new URL("../../core/bin/aof.mjs", import.meta.url));
    const aof = (...args) => spawnSync(process.execPath, [cli, "work", ...args, "--json"], {
      cwd: workspace.projectRoot, encoding: "utf8", timeout: 30_000,
      env: { ...process.env, AOF_GLOBAL_HOME: path.join(workspace.projectRoot, "home") },
    });
    const refused = aof("status", "17/02", "in-review");
    assert.notEqual(refused.status, 0);
    assert.match(refused.stdout + refused.stderr, /work-board-conflict/);
    assert.match(refused.stdout + refused.stderr, /aof work resync-board 17\/02/);
    const resynced = aof("resync-board", "17/02");
    assert.equal(resynced.status, 0, resynced.stderr);
    assert.equal(JSON.parse(resynced.stdout).resynced, true);
    assert.equal(aof("status", "17/02", "in-review").status, 0);
  }) },
);

workItemStoreTests.push(
  ...[
    [null, { ok: true, stage: "board", manifest: ".aof/boards/team.yaml" }, 0],
    ["probe-auth", { ok: false, stage: "sign-in", code: "azure-board-auth", status: 401 }, 1],
    ["probe-403", { ok: false, stage: "board", code: "azure-board-http", status: 403 }, 1],
  ].map(([mode, expected, exit]) => ({
    name: `209/04 [outline] board-access answers ${expected.stage} ${expected.ok ? "ok" : "failed"} and exits ${exit} when the probe ${mode ?? "passes"}`,
    run: () => publicationFixture(async ({ adjust, invoke, workspace }) => {
      await adjust(next => { next.mode = mode; });
      const result = await invoke("work:board-access", {});
      for (const [key, value] of Object.entries(expected)) assert.equal(result[key], value, key);
      assert.doesNotMatch(JSON.stringify(result), /eyJ0eXAi|Bearer eyJ/, "no credential in the answer");
      const cli = fileURLToPath(new URL("../../core/bin/aof.mjs", import.meta.url));
      const spawned = spawnSync(process.execPath, [cli, "work", "board-access", "--json"], {
        cwd: workspace.projectRoot, encoding: "utf8", timeout: 30_000,
        env: { ...process.env, AOF_GLOBAL_HOME: path.join(workspace.projectRoot, "home") },
      });
      assert.equal(spawned.status, exit, spawned.stderr);
      assert.equal(JSON.parse(spawned.stdout).stage, expected.stage);
      assert.doesNotMatch(spawned.stdout + spawned.stderr, /eyJ0eXAi/);
    }, { accessProbe: true }),
  })),
  { name: "209/04 [outline] board-access skips a definition that declares no access probe", run: () => publicationFixture(async ({ invoke }) => {
    assert.deepEqual(await invoke("work:board-access", {}), { ok: true, skipped: "no-access-probe", manifest: ".aof/boards/team.yaml" });
  }) },
  { name: "209/04 [outline] board-access fails at the definition, naming its key, when the manifest is invalid", run: () => publicationFixture(async ({ invoke, root }) => {
    const file = path.join(root, ".aof/boards/team.yaml");
    const manifest = JSON.parse(await readFile(file, "utf8"));
    delete manifest.operations;
    await writeFile(file, JSON.stringify(manifest));
    const result = await invoke("work:board-access", {});
    assert.equal(result.ok, false);
    assert.equal(result.stage, "definition");
    assert.equal(result.code, "work-board-definition-invalid");
    assert.match(result.message, /operations/);
  }) },
  { name: "209/04 [outline] board-access is a skip in local file mode", run: () => publicationFixture(async ({ invoke }) => {
    assert.deepEqual(await invoke("work:board-access", {}), { ok: true, skipped: "local-file-mode" });
  }, { boardMode: false }) },
);
