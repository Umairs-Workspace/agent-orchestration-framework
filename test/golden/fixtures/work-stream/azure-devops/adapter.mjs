import { createHash } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";
import { AzureBoardError, createAzureHttp } from "./http.mjs";

const wit = "_apis/wit/";
const pageSize = 2_000;
const detailLimit = 200;
const pollIntervalMs = 5_000;
const types = ["milestone", "story", "task", "chore", "spike", "uat", "prototype"];
const governed = ["not-started", "in-progress", "blocked", "in-review", "done"];
const prototype = ["active", "paused", "done", "abandoned"];
const encode = encodeURIComponent;
const quote = value => `'${String(value).replaceAll("'", "''")}'`;
const rows = response => response.value ?? [];
const relationId = link => Number(link?.url?.match(/\/(\d+)\/?$/)?.[1]);
const array = value => Array.isArray(value) ? value : [];

function fault(message) {
  return new AzureBoardError(message, { code: "azure-board-mapping" });
}

function reverse(mapping, value) {
  return Object.keys(mapping ?? {}).find(key => mapping[key] === value);
}

function changeResult(change, error) {
  return {
    key: change.key, id: change.id ?? null,
    outcome: error.uncertain ? "unknown" : "refused",
    code: error.code ?? "azure-board-operation",
  };
}

function stateOf(fields, type, mappings) {
  return reverse(mappings.states[type], fields["System.State"]);
}

function mapItem(raw, related, mappings) {
  const fields = raw.fields ?? {};
  const ref = fields[mappings.fields.ref];
  const type = reverse(mappings.types, fields["System.WorkItemType"]);
  const status = type == null ? undefined : stateOf(fields, type, mappings);
  const links = array(raw.relations);
  const parentId = relationId(links.find(link => link.rel === mappings.relations.parent));
  const dependsIds = links.filter(link => link.rel === mappings.relations.depends).map(relationId);
  const membership = fields[mappings.fields.membership];
  const number = membership === "backlog" ? null : String(ref ?? "").split("/").at(-1);
  const message = typeof ref !== "string" || ref === "" ? "missing mapped ref"
    : type == null ? `unmapped type ${fields["System.WorkItemType"]}`
    : status == null ? `unmapped ${type} state ${fields["System.State"]}`
    : !["active", "backlog", "archived"].includes(membership) ? "unmapped membership" : null;
  return {
    id: raw.id, revision: raw.rev, ref, type, number,
    slug: String(fields[mappings.fields.correlation] ?? ref ?? raw.id).toLowerCase().replace(/[^a-z0-9-]+/g, "-"),
    title: fields[mappings.fields.title], status, membership,
    key: fields[mappings.fields.correlation], rank: fields[mappings.order],
    parent: related.get(parentId) ?? null, depends: dependsIds.map(id => related.get(id)).filter(ref => typeof ref === "string"),
    parentId: Number.isFinite(parentId) ? parentId : null, dependsIds,
    ...(membership === "backlog" && { backlog: "" }),
    ...(membership === "archived" && { archived: true }),
    ...(message && { fault: { code: "azure-board-record", message: `Azure item ${raw.id} has ${message}.` } }),
  };
}

export function createAzureAdapter(definition, { now = Date.now, wait = sleep, ...transport } = {}) {
  const { board, mappings } = definition;
  for (const key of ["organization", "project", "process", "area"]) {
    if (!board[key]) throw fault(`The Azure definition requires board.${key}.`);
  }
  const { send, itemUrl } = createAzureHttp(board, { ...transport, now });
  const workItem = id => wit + "workitems/" + id;
  let projectCheck;
  let lastPoll;
  let polling = Promise.resolve();
  function ensureProject() {
    projectCheck ??= checkProject().catch(error => { projectCheck = null; throw error; });
    return projectCheck;
  }
  async function checkProject() {
    const project = await send(`_apis/projects/${encode(board.project)}`, { scope: "organization", query: { includeCapabilities: true } });
    if (project.capabilities?.processTemplate?.templateName !== board.process) {
      throw fault(`Project ${board.project} must use inherited process ${board.process}.`);
    }
    const areaParts = board.area.split("\\");
    if (areaParts.shift() !== board.project) throw fault("The Azure area path must start with the selected project.");
    const areaPath = areaParts.map(encode).join("/");
    await send(wit + "classificationnodes/areas" + (areaPath ? "/" + areaPath : ""));
    const fields = new Set([...Object.values(mappings.fields), mappings.order]);
    const links = new Set(rows(await send(wit + "workitemrelationtypes", { scope: "organization" })).map(row => row.referenceName));
    for (const ref of Object.values(mappings.relations)) {
      if (!links.has(ref)) throw fault(`Azure relation type ${ref} is unavailable.`);
    }
    for (const type of types) {
      const name = mappings.types[type];
      if (!name) throw fault(`The Azure definition has no mapping for ${type}.`);
      const endpoint = wit + "workitemtypes/" + encode(name);
      const [stateList, fieldList] = await Promise.all([
        send(endpoint + "/states"), send(endpoint + "/fields"),
      ]).catch(error => {
        if (error.status === 404) throw fault(`Azure work item type ${name} is unavailable.`);
        throw error;
      });
      const names = new Set(rows(stateList).map(row => row.name));
      const fieldNames = new Set(rows(fieldList).map(row => row.referenceName));
      const statuses = type === "prototype" ? prototype : governed;
      const mappedStates = mappings.states[type] ?? {};
      if (new Set(Object.values(mappedStates)).size !== Object.keys(mappedStates).length) {
        throw fault(`Azure work item type ${name} has duplicate state mappings.`);
      }
      for (const status of statuses) {
        const state = mappedStates[status];
        if (!state || !names.has(state)) throw fault(`Azure work item type ${name} is missing state ${state ?? status}.`);
      }
      for (const field of fields) if (!fieldNames.has(field)) throw fault(`Azure work item type ${name} is missing field ${field}.`);
    }
  }

  const areaClause = `[System.TeamProject] = ${quote(board.project)} AND [System.AreaPath] = ${quote(board.area)}`;
  const wiql = (query, top) => send(wit + "wiql", { method: "POST", body: { query }, query: top ? { $top: top } : undefined });
  async function streamIds(keys) {
    const ids = new Set();
    const filter = keys?.length ? ` AND [${mappings.fields.correlation}] IN (${keys.map(quote).join(", ")})` : "";
    let after = 0;
    for (;;) {
      const result = await wiql(`SELECT [System.Id] FROM WorkItems WHERE ${areaClause}${filter} AND [System.Id] > ${after} ORDER BY [System.Id] ASC`, pageSize);
      const page = array(result.workItems).map(row => row.id);
      for (const id of page) ids.add(id);
      if (page.length < pageSize) return [...ids];
      const next = Math.max(...page);
      if (!(next > after)) throw fault("Azure WIQL did not advance the ID page.");
      after = next;
    }
  }

  async function detail(ids) {
    const items = [];
    for (let i = 0; i < ids.length; i += detailLimit) {
      const result = await send(wit + "workitemsbatch", {
        method: "POST",
        body: { ids: ids.slice(i, i + detailLimit), $expand: "Relations", errorPolicy: "Omit" },
      });
      items.push(...rows(result));
    }
    return items;
  }

  async function readItems({ ids, keys } = {}) {
    await ensureProject();
    if (keys?.length === 0 || ids?.length === 0) return { items: [], missingIds: [] };
    const requested = [...new Set(ids ?? await streamIds(keys))];
    const raw = (await detail(requested)).filter(item => item.fields?.["System.AreaPath"] === board.area);
    const refs = new Map(raw.map(item => [item.id, item.fields[mappings.fields.ref]]));
    if (ids == null && keys == null && raw.length > 0) {
      const parentForward = "System.LinkTypes.Hierarchy-Forward";
      const dependsForward = "System.LinkTypes.Dependency-Forward";
      const linkQuery = await wiql(`SELECT [System.Id] FROM WorkItemLinks WHERE ([Source].${areaClause.replaceAll(" AND [", " AND [Source].[")}) AND ([System.Links.LinkType] IN (${[mappings.relations.parent, mappings.relations.depends, parentForward, dependsForward].map(quote).join(", ")})) MODE (MayContain)`);
      const byId = new Map(raw.map(item => [item.id, item]));
      for (const edge of array(linkQuery.workItemRelations)) {
        if (!edge.source || !edge.target) continue;
        const reverse = edge.rel === parentForward || edge.rel === dependsForward;
        const id = reverse ? edge.target.id : edge.source.id;
        const other = reverse ? edge.source.id : edge.target.id;
        const rel = edge.rel === parentForward ? mappings.relations.parent : edge.rel === dependsForward ? mappings.relations.depends : edge.rel;
        const item = byId.get(id);
        if (!item) continue;
        item.relations ??= [];
        if (!item.relations.some(link => link.rel === rel && relationId(link) === other)) item.relations.push({ rel, url: itemUrl(other) });
      }
    }
    const relatedIds = new Set();
    for (const item of raw) for (const link of array(item.relations)) {
      if (!Object.values(mappings.relations).includes(link.rel)) continue;
      const id = relationId(link);
      if (Number.isFinite(id) && !refs.has(id)) relatedIds.add(id);
    }
    if (relatedIds.size) {
      for (const item of await detail([...relatedIds])) refs.set(item.id, item.fields?.[mappings.fields.ref]);
    }
    const items = raw.map(item => mapItem(item, refs, mappings))
      .sort((a, b) => (Number(a.rank ?? Infinity) - Number(b.rank ?? Infinity)) || a.id - b.id);
    const found = new Set(items.map(item => item.id));
    const missingIds = requested.filter(id => !found.has(id));
    const token = createHash("sha256").update(JSON.stringify(items.map(({ id, revision }) => [id, revision]))).digest("hex");
    return { items, missingIds, token };
  }

  async function observe({ cursor } = {}) {
    await ensureProject();
    if (lastPoll != null) await wait(Math.max(0, lastPoll + pollIntervalMs - now()));
    let continuation = cursor;
    let nextLink = wit + "reporting/workitemrevisions";
    const changes = [];
    const visited = new Set();
    try {
      for (;;) {
        const page = await send(nextLink, { query: nextLink.startsWith("https:") ? undefined : {
          continuationToken: continuation, includeDeleted: "true",
        } });
        for (const item of array(page.values)) {
          if (item.isDeleted || item.fields?.["System.AreaPath"] === board.area) {
            changes.push({ id: item.id, revision: item.rev, deleted: item.isDeleted === true, fields: item.fields });
          }
        }
        continuation = page.continuationToken ?? (page.nextLink && new URL(page.nextLink).searchParams.get("continuationToken")) ?? continuation;
        if (page.isLastBatch) return { changes, cursor: continuation, coverage: true };
        if (!page.nextLink || visited.has(page.nextLink)) return { changes: [], cursor, coverage: false };
        visited.add(page.nextLink);
        nextLink = page.nextLink;
      }
    } catch (error) {
      if (cursor != null && [400, 404, 410].includes(error.status)) return { changes: [], cursor, coverage: false };
      throw error;
    } finally {
      lastPoll = now();
    }
  }

  function readChanges(input) {
    const result = polling.then(() => observe(input));
    polling = result.catch(() => {});
    return result;
  }

  function fieldPatch(change) {
    const { fields, order } = mappings;
    const values = [
      [fields.ref, change.ref], [fields.title, change.title],
      [fields.correlation, change.correlationKey ?? (change.id == null ? change.key : undefined)],
      [fields.membership, change.membership], [order, change.rank],
      ["System.AreaPath", change.id == null ? board.area : undefined],
    ];
    if (change.status !== undefined) {
      const state = mappings.states[change.type]?.[change.status];
      if (!state) throw fault(`Azure mapping has no state for ${change.type} ${change.status}.`);
      values.push(["System.State", state]);
    }
    return values.filter(([, value]) => value !== undefined).map(([field, value]) => ({ op: "add", path: "/fields/" + field, value }));
  }

  async function patchFor(change) {
    const patch = [];
    const wantsRelations = change.parentId !== undefined || change.dependsIds !== undefined;
    if (change.id != null) {
      if (!Number.isSafeInteger(change.expectedRevision)) throw fault(`Azure update of ${change.id} requires an expected revision.`);
      patch.push({ op: "test", path: "/rev", value: change.expectedRevision });
    }
    patch.push(...fieldPatch(change));
    const desired = new Map();
    if (change.parentId !== undefined) desired.set(mappings.relations.parent, change.parentId == null ? [] : [change.parentId]);
    if (change.dependsIds !== undefined) desired.set(mappings.relations.depends, change.dependsIds);
    if (wantsRelations && change.id != null) {
      const existing = await send(workItem(change.id), { query: { $expand: "Relations" } });
      for (let i = array(existing.relations).length - 1; i >= 0; i--) {
        if (desired.has(existing.relations[i].rel)) patch.push({ op: "remove", path: `/relations/${i}` });
      }
    }
    for (const [rel, ids] of desired) for (const id of new Set(ids)) {
      if (!Number.isSafeInteger(id) || id < 1) throw fault(`Azure relation ${rel} requires a board ID.`);
      patch.push({ op: "add", path: "/relations/-", value: { rel, url: itemUrl(id) } });
    }
    return patch;
  }

  async function applyChanges({ changes }) {
    await ensureProject();
    const results = [];
    for (const change of changes) {
      try {
        const create = change.id == null;
        const type = mappings.types[change.type];
        if (create && (!type || !change.key)) throw fault("An Azure create requires a mapped type and correlation key.");
        const result = await send(create ? workItem("$" + encode(type)) : workItem(change.id), {
          method: create ? "POST" : "PATCH", contentType: "application/json-patch+json", body: await patchFor(change),
        });
        if (!Number.isSafeInteger(result.id) || !Number.isSafeInteger(result.rev)) {
          throw new AzureBoardError("Azure did not acknowledge the item identity and revision.", { code: "azure-board-response", uncertain: true });
        }
        results.push({ key: change.key, id: result.id, revision: result.rev, outcome: "applied" });
      } catch (error) {
        results.push(changeResult(change, error));
      }
    }
    return { results };
  }

  async function copyAttachment({ id, name, bytes, contentKey, expectedRevision }) {
    await ensureProject();
    if (!Number.isSafeInteger(id) || !Number.isSafeInteger(expectedRevision) || !contentKey) throw fault("An attachment copy requires an item ID, revision and content key.");
    const marker = `AOF attachment ${contentKey}`;
    const linkedUrl = item => array(item.relations).find(link => link.rel === "AttachedFile" && link.attributes?.comment === marker)?.url;
    const read = () => send(workItem(id), { query: { $expand: "Relations" } });
    const existing = await read();
    const existingUrl = linkedUrl(existing);
    if (existingUrl) return { outcome: "applied", id, revision: existing.rev, url: existingUrl };
    if (existing.rev !== expectedRevision) return { outcome: "refused", id, code: "azure-board-stale" };
    let attachment;
    try {
      attachment = await send(wit + "attachments", {
        method: "POST", contentType: "application/octet-stream", body: bytes, query: { fileName: name },
      });
      if (!attachment.url) return { outcome: "unknown", id };
      await send(workItem(id), { method: "PATCH", contentType: "application/json-patch+json", body: [
        { op: "test", path: "/rev", value: expectedRevision },
        { op: "add", path: "/relations/-", value: { rel: "AttachedFile", url: attachment.url, attributes: { comment: marker } } },
      ] });
    } catch (error) {
      if (!error.uncertain) return changeResult({ id }, error);
    }
    const verified = await read();
    const url = linkedUrl(verified);
    return url ? { outcome: "applied", id, revision: verified.rev, url } : { outcome: "unknown", id };
  }

  async function accessProbe() {
    await ensureProject();
    await wiql(`SELECT [System.Id] FROM WorkItems WHERE ${areaClause}`, 1);
    return { ok: true };
  }

  return { readItems, readChanges, applyChanges, accessProbe, copyAttachment };
}

const adapters = new Map();
function selected({ definition }) {
  const key = JSON.stringify(definition);
  if (!adapters.has(key)) adapters.set(key, createAzureAdapter(definition));
  return adapters.get(key);
}
export const readItems = (input, context) => selected(context).readItems(input);
export const readChanges = (input, context) => selected(context).readChanges(input);
export const applyChanges = (input, context) => selected(context).applyChanges(input);
export const copyAttachment = (input, context) => selected(context).copyAttachment(input);
export const accessProbe = (input, context) => selected(context).accessProbe(input);
