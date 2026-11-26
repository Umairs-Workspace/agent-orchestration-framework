// A recorded Azure DevOps board that outlives one process. Each golden step is its own CLI
// process, so the board's items live in a JSON file in the subject project and every request
// reads and rewrites it. The shipped Azure adapter runs unchanged over this transport: only the
// network and `az` are replaced, by the sanitized replies in azure-recordings.json.
import { readFileSync, writeFileSync } from "node:fs";

const recordings = JSON.parse(readFileSync(new URL("./azure-recordings.json", import.meta.url), "utf8"));
const FIRST_ID = 700;
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

export function boardState(stateFile) {
  try {
    return JSON.parse(readFileSync(stateFile, "utf8"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { nextId: FIRST_ID, items: {}, requests: [] };
  }
}

// The transport the Azure adapter is handed: Azure's endpoints over the persisted items, with a
// competing edit scriptable from outside (`edits`), which the next request applies first.
export function recordedTransport(stateFile, definition) {
  const { board, mappings } = definition;
  let token = null;

  async function runAz(command, args) {
    if (command !== "az" || args[0] !== "account" || args[1] !== "get-access-token") throw new Error(`unrecorded command ${command} ${args.join(" ")}`);
    token = "recorded-access";
    return { stdout: JSON.stringify({ accessToken: token, expires_on: Date.now() / 1_000 + 1_800 }) };
  }

  async function request(url, init) {
    if (init.headers.Authorization !== `Bearer ${token}`) return json({ message: "unauthorized" }, 401);
    const state = boardState(stateFile);
    const save = () => writeFileSync(stateFile, JSON.stringify(state, null, 2) + "\n");
    for (const edit of state.edits ?? []) {
      const target = state.items[edit.id];
      if (!target) continue;
      Object.assign(target.fields, edit.fields ?? {});
      target.rev++;
    }
    if (state.edits?.length) { state.edits = []; save(); }
    const endpoint = decodeURIComponent(url.pathname).split("/_apis/").at(-1);
    const body = typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    // The log names each call and, for a write, the state it sets; never a header or a token.
    const setsState = Array.isArray(body) ? body.find(op => op.path === "/fields/System.State")?.value : undefined;
    state.requests.push({ method: init.method ?? "GET", endpoint, ...(setsState === undefined ? {} : { state: setsState }) });
    const { replies } = recordings;
    const items = Object.values(state.items);
    let reply;
    if (endpoint.startsWith("projects/")) reply = json(replies.project);
    else if (endpoint.startsWith("wit/classificationnodes/areas")) reply = json(replies.area);
    else if (endpoint === "wit/workitemrelationtypes") reply = json(replies.relationTypes);
    else if (endpoint.startsWith("wit/workitemtypes/")) {
      const [, , boardType, field] = endpoint.split("/");
      reply = json(replies.workItemTypes[boardType]?.[field] ?? { value: [] });
    } else if (endpoint === "wit/wiql") {
      if (body.query.includes("FROM WorkItemLinks")) reply = json({ workItemRelations: [] });
      else {
        const after = Number(body.query.match(/\[System.Id\] > (\d+)/)?.[1] ?? "0");
        const keys = [...body.query.matchAll(/'([^']+)'/g)].map(match => match[1]);
        const keyFilter = body.query.includes(`[${mappings.fields.correlation}] IN`);
        const top = Number(url.searchParams.get("$top"));
        reply = json({ workItems: items.filter(item => item.id > after && (!keyFilter || keys.includes(item.fields[mappings.fields.correlation])))
          .sort((a, b) => a.id - b.id).slice(0, top).map(({ id }) => ({ id })) });
      }
    } else if (endpoint === "wit/workitemsbatch") {
      reply = json({ value: body.ids.map(id => state.items[id]).filter(Boolean) });
    } else if (endpoint === "wit/reporting/workitemrevisions") {
      reply = json({ values: [], continuationToken: "recorded-end", isLastBatch: true });
    } else if (endpoint.startsWith("wit/workitems/$")) {
      const boardType = endpoint.split("/$").at(-1);
      const item = { id: state.nextId++, rev: 1, fields: { "System.WorkItemType": boardType, "System.AreaPath": board.area }, relations: [] };
      for (const op of body) {
        if (op.path.startsWith("/fields/")) item.fields[op.path.slice(8)] = op.value;
        else item.relations.push(op.value);
      }
      state.items[item.id] = item;
      reply = json(item);
    } else {
      const id = Number(endpoint.match(/^wit\/workitems\/(\d+)$/)?.[1]);
      const current = state.items[id];
      if (!current) reply = json({ message: `work item ${id} does not exist` }, 404);
      else if ((init.method ?? "GET") === "GET") reply = json(current);
      else if (body[0]?.op === "test" && body[0].value !== current.rev) reply = json({ message: "stale revision" }, 412);
      else {
        for (const op of body.slice(1)) {
          if (op.path.startsWith("/fields/")) current.fields[op.path.slice(8)] = op.value;
          else if (op.op === "remove") current.relations.splice(Number(op.path.split("/").at(-1)), 1);
          else current.relations.push(op.value);
        }
        current.rev++;
        reply = json(current);
      }
    }
    save();
    return reply;
  }

  return { request, runAz };
}

// The board's items as AOF would map them, for a case that observes the board itself.
export function exportBoard(stateFile, definition) {
  const { mappings } = definition;
  const reverse = (table, value) => Object.keys(table).find(key => table[key] === value);
  return Object.values(boardState(stateFile).items).sort((a, b) => a.id - b.id).map(item => {
    const type = reverse(mappings.types, item.fields["System.WorkItemType"]);
    return {
      id: item.id, revision: item.rev, type, ref: item.fields[mappings.fields.ref],
      title: item.fields[mappings.fields.title],
      status: reverse(mappings.states[type] ?? {}, item.fields["System.State"]),
      membership: item.fields[mappings.fields.membership],
    };
  });
}
