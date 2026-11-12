// src/loop/stop.mjs — `--stop` RIDES ONE VERB CORE (milestone 130 / story 02; ADR-002, ADR-006 §1).
//
// `stopLoop(workspace, { scope, now })` is the ONE function the CLI face (`work:loop --stop`),
// the fleet route and the desktop reach — a core BELOW the command layer, exactly as `assignWork`
// is the fleet's one sanctioned write door (38/ADR-012: a second CALLER of the SAME core, never a
// re-implementation). It resolves the scope's loop from its RUN RECORDS — the latest declaration
// in scope, whichever item it sits on — writes or escalates the request through
// `stop-request.mjs`'s one writer, and answers a document. It never throws for a refusal: a
// refusal is `{ ok: false, code, message }`, and the faces map it to their own contracts.
//
// The verb reads run records only. `supervised` plays no part, so a foreground loop is as
// stoppable as a supervised one (ADR-002 §7); the request is a file in THIS machine's aof home,
// so a declaration whose latest run names another node is refused by name (ADR-006 §1) — the
// operator stops it on that node's own console.

import { decideLoopScope, loopScopeIncludes, readLoopDeclaration, resolveLoopLevel } from "./engine.mjs";

import { heartbeatFromConfig } from "@aof/contracts/loop-bounds";

// Core supplies application services; creating this interface starts no work.
export function createLoopStops({
  work,
  runs,
  placement,
  stopRequests
}) {
  const { listItems } = work;
  const { isRunning, isStale, readRuns } = runs;
  const { meshNodeIdOf } = placement;
  const { STOP_LEVELS, loopResumesDir, loopStopsDir, markStopHonoured, requestLoopResume, requestLoopStop, resumeRequestPath, stopRequestPath, loopStartsDir, requestLoopStart, startRequestPath } = stopRequests;

  // The refusal codes, each a coded document (ADR-002 §3, §5): the command face maps
  // `loop-stop-no-declaration` to 404 and the other two to 409; `loop-stop-exclusive` (400) is the
  // face's own, raised before this core is reached. The two messages this core composes name their
  // code in parentheses, the shell's own `throwRefusal` idiom, because the CLI's human face prints
  // a refusal's MESSAGE and nothing else — the code would otherwise reach only the `--json` envelope.
  // The scope refusal carries the engine's own reason, verbatim.
  const STOP_REFUSALS = Object.freeze({
    scope: "loop-stop-scope",
    noDeclaration: "loop-stop-no-declaration",
    notLocal: "loop-stop-not-local",
  });

  // 131/11 (ADR-009 §6) — the hand-off's refusals, values like the stop's: the face maps
  // `loop-hand-off-no-declaration` to 404 and the others to 409.
  const HAND_OFF_REFUSALS = Object.freeze({
    scope: "loop-hand-off-scope",
    noDeclaration: "loop-hand-off-no-declaration",
    notSupervised: "loop-hand-off-not-supervised",
    running: "loop-hand-off-running",
    notLocal: "loop-hand-off-not-local",
  });

  // 191/04 (ADR-005 §2) — the start's refusals, values like the hand-off's: the face maps every one
  // to 409 but the scope's and the level's, which are the caller's input (400).
  const START_REFUSALS = Object.freeze({
    scope: "loop-start-scope",
    running: "loop-start-running",
    resumable: "loop-start-resumable",
    level: "loop-start-level",
    noWorkspace: "loop-start-no-workspace",
  });

  const refuse = (code, message) => ({ ok: false, code, message });

  // The word for a level, through the ONE map (ADR-001 §2): `drain` for 1, `cancel` for 2.
  function wordFor(level) {
    return Object.entries(STOP_LEVELS).find(([, value]) => value === level)?.[0] ?? null;
  }

  // The clock, whatever shape the caller handed in: a function answering a Date (the suites'
  // injected clock), an ISO string or a Date (the shell's `input.now`), or nothing (real time).
  function clockOf(now) {
    if (typeof now === "function") return now;
    if (now == null) return () => new Date();
    const fixed = new Date(now);
    return () => new Date(fixed.getTime());
  }

  // The latest run carrying the declaration, by the same order `readLoopDeclaration` chose it —
  // greatest `createdAt`, then greatest `runId` — over every run in scope.
  function latestRunCarrying(runs, loopRunId) {
    return runs
      .filter((run) => run?.brief?.loop?.loopRunId === loopRunId)
      .sort((left, right) => {
        const leftTime = String(left.createdAt ?? "");
        const rightTime = String(right.createdAt ?? "");
        if (leftTime !== rightTime) return leftTime < rightTime ? -1 : 1;
        const a = String(left.runId ?? "");
        const b = String(right.runId ?? "");
        return a < b ? -1 : a > b ? 1 : 0;
      })
      .at(-1) ?? null;
  }

  // stopLoop(workspace, { scope, now }) → the SEVEN-key document, in frozen order
  // `{ ok: true, loopRunId, scope, live, request, state, path }`, or `{ ok: false, code, message }`.
  //
  //   (a) `decideLoopScope` — a refusal is `loop-stop-scope`;
  //   (b) the items in scope through `listItems` + `loopScopeIncludes`, their runs through `readRuns`;
  //   (c) `readLoopDeclaration` over those runs — `null` is `loop-stop-no-declaration`;
  //   (d) the latest run carrying that `loopRunId`: when its `node` and this workspace's
  //       `mesh.nodeId` are both named and differ, `loop-stop-not-local` naming both and the
  //       remedy; a `null` (or empty) node counts as local — absence is benign;
  //   (e) `live` = that run is `running` and not stale under `heartbeatFromConfig(workspace)` —
  //       the record's own liveness, by the same threshold the driver times it out on;
  //   (f) `requestLoopStop` (129/04's ladder: drain, then cancel, then unchanged) with
  //       `by: { node, pid }`; when `live === false` the request is marked `honoured` at once —
  //       no loop will honour it, and the mark is what stops the supervisor relaunching a dead one;
  //   (g) the answer: `request` is the word for the level AFTER this call, `state` the file's.
  //
  // A third call answers `cancel` again — idempotent, never an error. A not-live loop's request is
  // honoured at the first call and never re-opened: the second and third answer `drain`/`honoured`.
  // The scope's latest declaration and the latest run carrying it, read from its RUN RECORDS — the one
  // read the stop and the hand-off share. Answers `{ scope, declaration, latest }`, or `{ refusal }`
  // built from the caller's own codes.
  async function scopeDeclaration(workspace, scope, codes) {
    const scoped = decideLoopScope(scope);
    if (scoped?.admitted !== true) {
      return { refusal: refuse(codes.scope, scoped?.reason ?? `scope ${JSON.stringify(scope)} is not an admitted loop scope`) };
    }
    const items = (await listItems(workspace.workDir)).filter((row) => loopScopeIncludes(scoped.scope, row.ref) && typeof row.dir === "string");
    const runs = [];
    for (const item of items) runs.push(...await readRuns(item));
    const declaration = readLoopDeclaration(runs);
    return { scope: scoped.scope, declaration, latest: declaration == null ? null : latestRunCarrying(runs, declaration.loopRunId) };
  }

  // hasLoopOn(workspace, scope) → whether the scope carries a loop declaration in this workspace,
  // through the same read the stop and the hand-off use. A refused scope is `false`. It lets one
  // Discord channel serve several projects: `/loop` picks the project whose loop the scope names.
  async function hasLoopOn(workspace, scope) {
    try {
      const read = await scopeDeclaration(workspace, scope, STOP_REFUSALS);
      return read.refusal == null && read.declaration != null;
    } catch {
      return false;
    }
  }

  async function stopLoop(workspace, { scope, now } = {}) {
    const read = await scopeDeclaration(workspace, scope, STOP_REFUSALS);
    if (read.refusal) return read.refusal;
    const { declaration, latest } = read;
    if (declaration == null) {
      return refuse(STOP_REFUSALS.noDeclaration, `No run in scope ${read.scope} carries a loop declaration — there is no loop to stop. Start one with \`aof work loop ${read.scope}\` (${STOP_REFUSALS.noDeclaration}).`);
    }
    const localNode = meshNodeIdOf(workspace.config);
    const runNode = typeof latest?.node === "string" && latest.node.length > 0 ? latest.node : null;
    if (localNode != null && runNode != null && runNode !== localNode) {
      return refuse(
        STOP_REFUSALS.notLocal,
        `Loop ${declaration.loopRunId} in scope ${read.scope} last ran on ${runNode}, not on this node (${localNode}) — stop it on ${runNode}'s own console (${STOP_REFUSALS.notLocal}).`,
      );
    }
    const clock = clockOf(now);
    const live = latest != null && isRunning(latest) && !isStale(latest, clock().getTime(), heartbeatFromConfig(workspace));
    const dir = loopStopsDir();
    const written = await requestLoopStop(dir, {
      loopRunId: declaration.loopRunId,
      scope: read.scope,
      workspaceId: workspace?.config?.mesh?.workspaceId ?? null,
      by: { node: localNode, pid: process.pid },
      now: clock,
    });
    let record = written.record;
    if (!live) record = await markStopHonoured(dir, declaration.loopRunId, { now: clock }) ?? record;
    return {
      ok: true,
      loopRunId: declaration.loopRunId,
      scope: read.scope,
      live,
      request: wordFor(record.level),
      state: record.state,
      path: stopRequestPath(dir, declaration.loopRunId),
    };
  }

  // handOffLoop(workspace, { scope, now }) — 131/11 (ADR-009 §6): ask the SUPERVISOR to relaunch the
  // scope's supervised loop with `--resume`, and start nothing here. The process start belongs to the
  // supervisor (the desktop app polling `mesh:status` declarations), never to the caller: this writes
  // the durable resume request the declarations producer reads, and answers
  // `{ ok: true, handedOff: true, loopRunId, scope, path }`. A refusal is a value, as the stop's is:
  // no declaration, an unsupervised one (resumed from a terminal instead), or a live one.
  async function handOffLoop(workspace, { scope, now } = {}) {
    const read = await scopeDeclaration(workspace, scope, HAND_OFF_REFUSALS);
    if (read.refusal) return read.refusal;
    const { declaration, latest } = read;
    if (declaration == null) {
      return refuse(HAND_OFF_REFUSALS.noDeclaration, `No run in scope ${read.scope} carries a loop declaration — there is no loop to hand to the supervisor. Start one with \`aof work loop ${read.scope} --supervised\` (${HAND_OFF_REFUSALS.noDeclaration}).`);
    }
    if (declaration.supervised !== true) {
      return refuse(HAND_OFF_REFUSALS.notSupervised, `Loop ${declaration.loopRunId} in scope ${read.scope} is not supervised, so no supervisor relaunches it — resume it from a terminal with \`aof work loop ${read.scope} --resume\` (${HAND_OFF_REFUSALS.notSupervised}).`);
    }
    // As the stop refuses it (130/ADR-006 §1): the request is a file in THIS machine's aof home, so a
    // declaration whose latest run names another node is handed back on that node, never here.
    const localNode = meshNodeIdOf(workspace.config);
    const runNode = typeof latest?.node === "string" && latest.node.length > 0 ? latest.node : null;
    if (localNode != null && runNode != null && runNode !== localNode) {
      return refuse(HAND_OFF_REFUSALS.notLocal, `Loop ${declaration.loopRunId} in scope ${read.scope} last ran on ${runNode}, not on this node (${localNode}) — hand it back on ${runNode} (${HAND_OFF_REFUSALS.notLocal}).`);
    }
    const clock = clockOf(now);
    if (latest != null && isRunning(latest) && !isStale(latest, clock().getTime(), heartbeatFromConfig(workspace))) {
      return refuse(HAND_OFF_REFUSALS.running, `Loop ${declaration.loopRunId} in scope ${read.scope} is running — there is nothing to hand back (${HAND_OFF_REFUSALS.running}).`);
    }
    const dir = loopResumesDir();
    await requestLoopResume(dir, {
      loopRunId: declaration.loopRunId,
      scope: read.scope,
      workspaceId: workspace?.config?.mesh?.workspaceId ?? null,
      by: { node: localNode, pid: process.pid },
      now: clock,
    });
    return { ok: true, handedOff: true, loopRunId: declaration.loopRunId, scope: read.scope, path: resumeRequestPath(dir, declaration.loopRunId) };
  }

  // handOffStart(workspace, { scope, level, now }) — 191/04 (ADR-005 §1-§2): ask the SUPERVISOR to
  // start the scope as a NEW supervised loop, and start nothing here. It reads the scope's runs
  // exactly as the hand-off does, and writes the durable start request the declarations producer
  // turns into one fresh `--supervised` row. A scope whose loop is live is refused
  // (`loop-start-running`), and so is one with a supervised declaration `--hand-off` would relaunch
  // (`loop-start-resumable`): a fresh start would reset that halted loop's total budget, so the
  // refusal names the resume instead. Answers `{ ok: true, requested: true, scope, path }`.
  // `--hand-off-start` is its own request: each companion flag is refused before any read, naming both.
  const START_COMPANIONS = Object.freeze([["stop", "--stop"], ["resume", "--resume"], ["handOff", "--hand-off"], ["dryRun", "--dry-run"]]);

  async function handOffStart(workspace, { scope, level = null, now, ...flags } = {}) {
    const companion = START_COMPANIONS.find(([key]) => flags[key] === true);
    if (companion != null) {
      return refuse("invalid-input", `--hand-off-start and ${companion[1]} are exclusive: --hand-off-start asks the supervisor to start a new supervised loop and is its own request — pass it without ${companion[1]}.`);
    }
    // The grammar is asked before any read, the hand-off's own order.
    const read = await scopeDeclaration(workspace, scope, START_REFUSALS);
    if (read.refusal) return read.refusal;
    // A level the loop would refuse at its door is refused here, before anything is written: the
    // supervisor would otherwise spawn a loop that dies at once, every poll, on a request nothing clears.
    if (level != null) {
      const resolvedLevel = resolveLoopLevel(level);
      if (resolvedLevel?.admitted !== true) {
        return refuse(START_REFUSALS.level, `Level ${JSON.stringify(level)} is not one \`aof work loop ${read.scope}\` starts at (${resolvedLevel?.code ?? "refused"}) — nothing was requested (${START_REFUSALS.level}).`);
      }
    }
    const { declaration, latest } = read;
    const clock = clockOf(now);
    if (latest != null && isRunning(latest) && !isStale(latest, clock().getTime(), heartbeatFromConfig(workspace))) {
      return refuse(START_REFUSALS.running, `Loop ${declaration.loopRunId} in scope ${read.scope} is running — there is nothing to start (${START_REFUSALS.running}).`);
    }
    // Exactly the declarations `--hand-off` would relaunch: supervised, and last run on this node.
    const localNode = meshNodeIdOf(workspace.config);
    const runNode = typeof latest?.node === "string" && latest.node.length > 0 ? latest.node : null;
    const local = localNode == null || runNode == null || runNode === localNode;
    if (declaration != null && declaration.supervised === true && local) {
      return refuse(START_REFUSALS.resumable, `Scope ${read.scope} has a halted supervised loop (${declaration.loopRunId}) — a fresh start would reset its budget. Resume it instead: \`/loop resume ${read.scope}\`, or \`aof work loop ${read.scope} --hand-off\` (${START_REFUSALS.resumable}).`);
    }
    const workspaceId = workspace?.config?.mesh?.workspaceId ?? null;
    if (typeof workspaceId !== "string" || workspaceId.length === 0) {
      return refuse(START_REFUSALS.noWorkspace, `This workspace has no mesh workspace id, so no supervisor can be asked to start ${read.scope} — publish one with \`aof mesh identity\` (${START_REFUSALS.noWorkspace}).`);
    }
    const dir = loopStartsDir();
    await requestLoopStart(dir, {
      scope: read.scope,
      workspaceId,
      by: { node: localNode, pid: process.pid },
      level: level ?? null,
      now: clock,
    });
    return { ok: true, requested: true, scope: read.scope, path: startRequestPath(dir, { workspaceId, scope: read.scope }) };
  }

  return Object.freeze({
    HAND_OFF_REFUSALS,
    START_REFUSALS,
    STOP_REFUSALS,
    handOffLoop,
    handOffStart,
    hasLoopOn,
    stopLoop
  });
}
