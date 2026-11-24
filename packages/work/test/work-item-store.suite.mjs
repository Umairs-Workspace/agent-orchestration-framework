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
