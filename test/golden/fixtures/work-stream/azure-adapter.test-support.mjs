import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import yaml from "js-yaml";

let selectedDefinition;
export function azureDefinition() {
  return selectedDefinition ??= yaml.load(readFileSync(new URL("../../../../.aof/boards/azure-devops/board.yaml", import.meta.url), "utf8"),
    { schema: yaml.JSON_SCHEMA });
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

export function azureItem(id, { type = "milestone", status = "in-progress", membership = "active", ref = String(id), rank = id, revision = 8 } = {}) {
  const { board, mappings } = azureDefinition();
  return {
    id, rev: revision,
    fields: {
      "System.WorkItemType": mappings.types[type], "System.State": mappings.states[type]?.[status] ?? status,
      "System.AreaPath": board.area, [mappings.fields.ref]: ref, [mappings.fields.title]: `Item ${id}`,
      [mappings.fields.membership]: membership, [mappings.fields.correlation]: `item-${id}`, [mappings.order]: rank,
    },
    relations: [],
  };
}

export async function azureRecording({
  items = [azureItem(410), azureItem(411, { revision: 4 })], edges = [], missingState,
  oldCursor = false, loseCreate = false, hideAttachment = false,
} = {}) {
  const { createAzureAdapter } = await import("../../../../.aof/boards/azure-devops/adapter.mjs");
  const definition = azureDefinition();
  const { board, mappings } = definition;
  const { parent, depends } = mappings.relations;
  const itemUrl = id => `https://dev.azure.com/${board.organization}/_apis/wit/workitems/${id}`;
  const remote = new Map(items.map(item => [item.id, structuredClone(item)]));
  const requests = [];
  const waits = [];
  let clock = Date.parse("2026-11-24T10:00:00Z");
  let mints = 0;
  let signedIn = true;
  let expectedToken;
  let feed = [[{ id: 410, rev: 9, fields: { "System.AreaPath": board.area } }], [{ id: 410, rev: 10, fields: { "System.AreaPath": board.area } }]];
  let createdId = 700;
  const attachmentUrl = `https://dev.azure.com/${board.organization}/_apis/wit/attachments/flow`;

  async function runAz(command, args) {
    assert.equal(command, "az");
    assert.deepEqual(args.slice(0, 2), ["account", "get-access-token"]);
    mints++;
    expectedToken = `fixture-access-${mints}`;
    if (!signedIn) throw new Error(expectedToken);
    return { stdout: JSON.stringify({ accessToken: expectedToken, expires_on: (clock + 30 * 60_000) / 1_000 }) };
  }

  async function request(url, init) {
    assert.equal(init.headers.Authorization, `Bearer ${expectedToken}`);
    assert.equal(init.headers["X-VSS-ForceMsaPassThrough"], "true");
    assert.equal(init.redirect, "error");
    const endpoint = decodeURIComponent(url.pathname).split("/_apis/").at(-1);
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    requests.push({ endpoint, method: init.method, body, query: Object.fromEntries(url.searchParams) });
    if (endpoint.startsWith("projects/")) return json({ capabilities: { processTemplate: { templateName: board.process } } });
    if (endpoint.startsWith("wit/classificationnodes/areas")) return json({ name: "AOF" });
    if (endpoint === "wit/workitemrelationtypes") return json({ value: [parent, depends].map(referenceName => ({ referenceName })) });
    if (endpoint.startsWith("wit/workitemtypes/")) {
      const [, , boardType, field] = endpoint.split("/");
      const type = Object.keys(mappings.types).find(type => mappings.types[type] === boardType);
      assert.ok(type, endpoint);
      if (field === "states") {
        const value = Object.values(mappings.states[type]).filter(name => boardType !== "User Story" || name !== missingState);
        return json({ value: value.map(name => ({ name })) });
      }
      if (field === "fields") return json({ value: [...Object.values(mappings.fields), mappings.order].map(referenceName => ({ referenceName })) });
    }
    if (endpoint === "wit/wiql") {
      if (body.query.includes("FROM WorkItemLinks")) return json({ workItemRelations: edges });
      assert.match(body.query, /\[System.AreaPath\] = 'Your Project\\AOF'/);
      const after = Number(body.query.match(/\[System.Id\] > (\d+)/)?.[1] ?? "0");
      const top = Number(url.searchParams.get("$top"));
      const keyFilter = body.query.includes("[Custom.AofKey] IN");
      const workItems = [...remote.values()].filter(item => item.id > after &&
        item.fields["System.AreaPath"] === board.area &&
        (!keyFilter || body.query.includes(`'${item.fields["Custom.AofKey"]}'`)))
        .sort((a, b) => a.id - b.id).slice(0, top).map(({ id }) => ({ id }));
      return json({ workItems });
    }
    if (endpoint === "wit/workitemsbatch") {
      assert.ok(body.ids.length <= 200);
      return json({ value: body.ids.map(id => remote.get(id)).filter(Boolean) });
    }
    if (endpoint === "wit/reporting/workitemrevisions") {
      const token = url.searchParams.get("continuationToken");
      if (oldCursor) return json({}, 410);
      if (token === "p2") return json({ values: feed[1], continuationToken: "c18", isLastBatch: true });
      if (token === "c17") return json({ values: feed[0], nextLink: `https://dev.azure.com/${board.organization}/${encodeURIComponent(board.project)}/_apis/wit/reporting/workitemrevisions?continuationToken=p2`, isLastBatch: false });
      return json({ values: feed[0], continuationToken: "c19", isLastBatch: true });
    }
    if (endpoint === "wit/attachments") return json({ url: attachmentUrl });
    if (endpoint.startsWith("wit/workitems/$")) {
      const type = Object.keys(mappings.types).find(type => mappings.types[type] === endpoint.split("/$").at(-1));
      const item = azureItem(createdId++, { type, revision: 1 });
      for (const op of body) {
        if (op.path.startsWith("/fields/")) item.fields[op.path.slice(8)] = op.value;
        else item.relations.push(op.value);
      }
      remote.set(item.id, item);
      if (loseCreate) throw new Error("recorded disconnect after create");
      return json(item);
    }
    const id = Number(endpoint.match(/^wit\/workitems\/(\d+)$/)?.[1]);
    const current = remote.get(id);
    if (current && init.method === "GET") return json(current);
    if (current && init.method === "PATCH") {
      assert.deepEqual(body[0], { op: "test", path: "/rev", value: body[0].value });
      if (body[0].value !== current.rev) return json({}, 412);
      for (const op of body.slice(1)) {
        if (op.path.startsWith("/fields/")) current.fields[op.path.slice(8)] = op.value;
        else if (op.op === "remove") current.relations.splice(Number(op.path.split("/").at(-1)), 1);
        else if (!hideAttachment || op.value.rel !== "AttachedFile") current.relations.push(op.value);
      }
      current.rev++;
      return json(current);
    }
    throw new Error(`No recorded Azure reply for ${init.method} ${endpoint}`);
  }

  const adapter = createAzureAdapter(definition, { request, runAz, now: () => clock, wait: async ms => { waits.push(ms); clock += ms; } });
  return {
    adapter, requests, waits, remote, itemUrl,
    setFeed: items => { feed = [items, []]; },
    advance: minutes => { clock += minutes * 60_000; },
    signOut: () => { signedIn = false; },
    mints: () => mints,
    transport: { request, runAz, now: () => clock },
  };
}
