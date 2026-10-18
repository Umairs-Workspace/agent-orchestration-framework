import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

// work:questions — the READ side of `work:answer` (163). A loop that stops a lane to ask leaves its
// question in an ask file, and nothing printed it: `aof work resume` names the ref without the
// question, and `aof work list --json` carries it as one buried field. This verb prints every
// question waiting on the operator in full, with the line that answers it, from the ask files and
// the local mesh store alone — no daemon round-trip, so it answers when the portal is stale.
//
// It READS ONLY. The answer stays `work:answer`'s one write, and clearing a stale ask stays the
// loop's sweep. It spells no ask path, segment or state word of its own (FF-13101): the asks come
// through `readAsks`, the states through `ASK_STATES`, the runs behind an ask through the loop's
// `runsBehindAsk`, and the stale test is the loop's `askRunStopped` — the one the sweep clears on.
//
// An answer line is offered only where `aof work answer` would really reach a live question: the
// LATEST ask on a ref (the one `answerAsk` writes), only while it is waiting or parked, and only
// while the run behind it is still running. A local ask outranks a worker's on the same ref, as it
// does on the board.

// Core supplies the ask store, the loop's liveness reads, the mesh overlay and the form's clock.
export function createQuestionsCommand({ ASK_STATES, loopAsksDir, readAsks, askEnvFor, askRunStopped, runsBehindAsk, readExecutionOverlay, awaitsAnswer, executionScopeRef, resolveWorkspaceId, formatElapsed, loadWorkspace, globalMeshPaths, reportDegrade }) {
  const OPEN = new Set([ASK_STATES.waiting, ASK_STATES.parked]);
  const LIVENESS = Object.freeze({ live: "live", stale: "stale", unknown: "unknown" });

  const nonEmpty = (value) => typeof value === "string" && value.length > 0;
  const ordinal = (a, b) => {
    const [x, y] = [String(a), String(b)];
    return x < y ? -1 : x > y ? 1 : 0;
  };
  const answerLine = (ref) => `aof work answer ${ref} "…"`;
  const resumeLine = (scope) => `aof work loop ${scope} --resume`;

  // The node's workspace descriptors, by id: `{ name, projectRoot }`. Absent or unreadable entries
  // are skipped — a row then names its workspace by id.
  async function readWorkspaceDescriptors(storeOptions) {
    const root = globalMeshPaths(storeOptions).workspacesRoot;
    const byId = new Map();
    let names = [];
    try {
      names = await readdir(root);
    } catch (error) {
      if (error?.code !== "ENOENT") reportDegrade("work-questions-descriptors", error, { path: root });
      return byId;
    }
    for (const name of names.filter((entry) => entry.endsWith(".json"))) {
      try {
        const descriptor = JSON.parse(await readFile(path.join(root, name), "utf8"));
        if (nonEmpty(descriptor?.workspaceId)) byId.set(descriptor.workspaceId, { name: descriptor.name ?? null, projectRoot: descriptor.projectRoot ?? null });
      } catch (error) {
        reportDegrade("work-questions-descriptors", error, { path: path.join(root, name) });
      }
    }
    return byId;
  }

  // The latest ask per (workspace, ref) — `readAsks`'s order is `askedAt` then `runId`, so the last
  // seen wins, exactly as `answerAsk` picks — kept only while it is open.
  function latestOpen(records) {
    const latest = new Map();
    for (const record of records) latest.set(`${record.workspaceId}\u0000${record.ref}`, record);
    return [...latest.values()].filter((record) => OPEN.has(record.state));
  }

  // How one workspace's runs are read: the current checkout's ctx, another workspace's loaded from
  // its descriptor's checkout, or null when that checkout cannot be read here (liveness unknown).
  async function runReaderFor(workspaceId, { ctx, currentId, descriptors, cache }) {
    if (cache.has(workspaceId)) return cache.get(workspaceId);
    let reader = null;
    if (workspaceId === currentId) {
      reader = { ctx, primaryRoot: ctx.workspace.projectRoot };
    } else {
      const root = descriptors.get(workspaceId)?.projectRoot ?? null;
      if (nonEmpty(root) && existsSync(root)) {
        try {
          const workspace = await loadWorkspace(root);
          reader = { ctx: { ...ctx, workspace }, primaryRoot: workspace.projectRoot };
        } catch (error) {
          reportDegrade("work-questions-workspace", error, { path: root });
        }
      }
    }
    cache.set(workspaceId, reader);
    return reader;
  }

  function workspaceOf(workspaceId, { currentId, currentName, currentRoot, descriptors }) {
    const descriptor = descriptors.get(workspaceId) ?? null;
    const current = workspaceId === currentId;
    return {
      id: workspaceId ?? null,
      name: descriptor?.name ?? (current ? currentName : null) ?? workspaceId ?? null,
      root: current ? currentRoot : descriptor?.projectRoot ?? null,
      current,
    };
  }

  function ageOf(askedAt, nowMs) {
    const at = Date.parse(askedAt ?? "");
    return Number.isFinite(at) ? formatElapsed(Math.max(0, nowMs - at)) : null;
  }

  function localRow(record, { liveness, workspace, nowMs }) {
    const scope = nonEmpty(record.scope) ? record.scope : executionScopeRef(record.ref);
    const stale = liveness === LIVENESS.stale;
    const parked = record.state === ASK_STATES.parked;
    return {
      ref: record.ref,
      runId: record.runId ?? null,
      phase: record.phase ?? null,
      runtime: record.runtime ?? null,
      askedAt: record.askedAt ?? null,
      age: ageOf(record.askedAt, nowMs),
      workspace,
      state: record.state,
      parkedAt: record.parkedAt ?? null,
      liveness,
      node: null,
      question: typeof record.question === "string" ? record.question : null,
      choices: Array.isArray(record.choices) ? record.choices : [],
      answer: stale ? null : answerLine(record.ref),
      resume: stale || parked ? resumeLine(scope) : null,
    };
  }

  // A worker's parked session (131/ADR-010): its question rides the assignment row when its park
  // carried one, and otherwise never reached this machine.
  function workerRow(ref, execution, { workspace, nowMs }) {
    const carried = execution.ask != null && typeof execution.ask === "object" ? execution.ask : null;
    const askedAt = nonEmpty(carried?.askedAt) ? carried.askedAt : execution.updatedAt ?? null;
    return {
      ref,
      runId: null,
      phase: nonEmpty(carried?.phase) ? carried.phase : null,
      runtime: null,
      askedAt,
      age: ageOf(askedAt, nowMs),
      workspace,
      state: ASK_STATES.waiting,
      parkedAt: null,
      liveness: LIVENESS.live,
      node: execution.nodeId ?? null,
      question: typeof carried?.question === "string" ? carried.question : null,
      choices: [],
      answer: answerLine(ref),
      resume: null,
    };
  }

  const questionsCommand = {
    id: "work:questions",
    input: {
      type: "object",
      properties: {
        all: { type: "boolean" },
        // `now` (ISO-8601 UTC-Z) is an INJECTED clock for deterministic assertions — a test input,
        // never a CLI flag.
        now: { type: "string" },
      },
      additionalProperties: false,
    },

    async run(input, ctx) {
      const nowMs = Date.parse(input?.now ?? new Date().toISOString());
      const all = input?.all === true;
      const storeOptions = ctx.globalWorkStoreOptions ?? {};
      const currentId = resolveWorkspaceId(ctx.workspace);
      const descriptors = await readWorkspaceDescriptors(storeOptions);
      const naming = {
        currentId,
        currentName: ctx.workspace?.config?.name ?? null,
        currentRoot: ctx.workspace?.projectRoot ?? null,
        descriptors,
      };
      const dir = loopAsksDir(askEnvFor(ctx));
      const records = all ? await readAsks(dir, { allWorkspaces: true }) : await readAsks(dir, { workspaceId: currentId });

      const rows = [];
      const readers = new Map();
      for (const record of latestOpen(records)) {
        const reader = await runReaderFor(record.workspaceId, { ctx, currentId, descriptors, cache: readers });
        let liveness = LIVENESS.unknown;
        if (reader != null) {
          const behind = await runsBehindAsk({ ctx: reader.ctx, primaryRoot: reader.primaryRoot, ref: record.ref });
          liveness = askRunStopped(record, behind) ? LIVENESS.stale : LIVENESS.live;
        }
        rows.push(localRow(record, { liveness, workspace: workspaceOf(record.workspaceId, naming), nowMs }));
      }

      // The worker leg: this workspace's assignments a worker parked on a human, read from the local
      // projection (no daemon). A ref that already has a local row keeps it.
      const localRefs = new Set(rows.filter((row) => row.workspace.id === currentId).map((row) => row.ref));
      const overlay = await readExecutionOverlay(ctx.workspace, { globalWorkStoreOptions: storeOptions });
      for (const [ref, execution] of overlay) {
        if (localRefs.has(ref) || !awaitsAnswer(execution)) continue;
        rows.push(workerRow(ref, execution, { workspace: workspaceOf(currentId, naming), nowMs }));
      }

      return rows.sort((a, b) => ordinal(a.askedAt, b.askedAt) || ordinal(a.runId, b.runId) || ordinal(a.ref, b.ref));
    },

    cli: {
      route: ["work", "questions"],
      spec: {
        usage: "aof work questions [--all] [--json]",
        flags: {
          all: { type: "boolean", description: "list the open questions of every workspace on this node" },
        },
      },

      argv: (_positionals, options) => ({ ...(options.all ? { all: true } : {}) }),

      render(rows) {
        if (rows.length === 0) return "No open questions.";
        const blocks = rows.map((row) => {
          const facts = [row.phase, row.runtime].filter(nonEmpty);
          const where = row.node != null ? ` — on ${row.node}` : "";
          const asked = row.askedAt == null ? "" : ` — asked ${row.askedAt}${row.age == null ? "" : ` (${row.age} ago)`}`;
          const mark = row.liveness === LIVENESS.stale
            ? " — STALE: its loop stopped"
            : row.state === ASK_STATES.parked
              ? ` — PARKED${row.parkedAt == null ? "" : ` at ${row.parkedAt}`}`
              : row.liveness === LIVENESS.unknown
                ? " — liveness unknown: its checkout cannot be read here"
                : "";
          const lines = [`${row.ref}${facts.length ? ` · ${facts.join(" · ")}` : ""}${where}${asked} — workspace ${row.workspace.name}${mark}`];
          if (row.question != null) {
            for (const line of row.question.split(/\r?\n/u)) lines.push(line.trimEnd() === "" ? "" : `  ${line}`);
          } else {
            lines.push(row.node != null
              ? "  The question did not reach this machine — open the worker's terminal to read it."
              : "  The question was not recorded.");
          }
          row.choices.forEach((choice, index) => {
            const text = typeof choice === "string" ? choice : [choice?.label, choice?.description].filter(nonEmpty).join(" — ");
            lines.push(`  ${index + 1}. ${text}`);
          });
          if (!row.workspace.current) {
            lines.push(row.workspace.root != null ? `  answer from the checkout: ${row.workspace.root}` : "  no checkout of this workspace is known on this machine");
          }
          if (row.answer != null) lines.push(`  answer: ${row.answer}`);
          if (row.liveness === LIVENESS.stale) lines.push(`  ${row.resume} clears it — an answer would not reach it.`);
          else if (row.resume != null) lines.push(`  once it is answered, the loop resumes with: ${row.resume}`);
          return lines.join("\n");
        });
        return `${rows.length} open question(s):\n\n${blocks.join("\n\n")}`;
      },

      json: (rows) => rows,
    },
  };

  return { questionsCommand };
}
