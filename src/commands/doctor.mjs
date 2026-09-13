// work:doctor — the deterministic, cross-item HEALTH lane of the work stream
// (milestone 15 / ADR-001). The SIBLING of work:validate on the SAME command
// core: same `{ id, input, run, cli }` contract, same getCommand/invoke door, the
// same basis-neutral `{ findings }` shape and scope-as-filter semantics — but a
// RICHER finding `{ code, severity, path, message }` (a health finding carries a
// severity + a machine code) where validate's is a per-file `{ path, problem }`.
//
// `run` returns ADR-014's closed `{ findings, loopReady }` envelope basis-neutral: every `finding.path` is a RAW
// ABSOLUTE in its on-disk OS form — NO displayPath, NO path.relative, NO slashing
// (the 08/ADR-002 keystone, inherited from validate.mjs). The FACES relativise:
// the board to projectRoot + forward-slash, the CLI --json adapter to cwd. The
// `--strict` exit gate is a FACE concern (ADR-002) — it is NOT part of `input`,
// and `run` ALWAYS returns the full, advisory finding set.
//
// `Date.now()` lives HERE, at the impure command boundary (ADR-003 step 4) — the
// engine (work-doctor.mjs) reads no wall-clock; it receives `now`/`staleWindow`.
//
// milestone 33 / story 00 (ADR-004.4, F-3203) — the RAW committed config's mesh block
// is ALSO read HERE, at this SAME impure edge, and handed to the engine as plain data
// (`rawCommittedMesh`/`committedConfigPath`) so the mesh-identity-committed check-group
// never trusts `ctx.workspace.config` (the loadWorkspace-HYDRATED object, which a
// correctly-migrated repo still populates from the sidecar) for its committed-config
// decision.
//
// milestone 33 / story 01 (ADR-001.4 / ADR-003.4, task 04) — the per-fabric operator
// guidance is ADDITIVELY appended to `findings` at THIS SAME impure edge (the probe is
// an async fabric read, the same class of impurity as Date.now()/the raw config read
// above) — never inside work-doctor.mjs's pure CHECK_GROUPS registry, which stays a
// synchronous (snapshot, ctx) => Finding[] pipeline. SILENT (no finding appended) when
// config.mesh.fabric is undeclared, so a clean/unconfigured stream's doctor output is
// byte-identical to before this task (no dangling finding on every install that never
// opted into a fabric).
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
//   milestone 15 — work doctor core (work:doctor registers into the SAME core;
//   15/ADR-001). The 7th work command: the deterministic, cross-item HEALTH lane —
//   validate's sibling with a richer { code, severity, path, message } envelope.
import path from "node:path";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildSnapshot, doctorWork, staleWindowFromConfig, CONVENTION_DOCS } from "../work/doctor.mjs";
// 119/ADR-004 — the impure half of the cited-path resolver. THIS module reads the repository's
// history; the engine stays a pure function of the snapshot and names no spawn door, which
// `test/arch/audit/acd-controls-never-execute.test.mjs` asserts of the spine. The map is derived from
// git's own rename records rather than stored, so it cannot go stale.
import { RENAME_LOG_ARGS, buildRenameMap, parseRenameRecords } from "../cited-path-resolve.mjs";
import { declaredReportFrom } from "../work/doctor-rubric.mjs";
import { computeLoopReady } from "../work/doctor-loop-ready.mjs";
// m43 / story 06 (ADR-005) — the cache's three per-item facts (status, convention-doc
// presence, children), read ONCE here and handed to the engine as plain data…
import { readCachedWorkFacts } from "../cache-read.mjs";
// …and the WORKSPACE fact that decides whether this node may consult the cache at all. It is
// a named export of the read seam, not a private helper of one reader, precisely so that
// THIS door — which does not go through the seam — can reach it (ADR-016/G4). Importing the
// predicate does NOT make doctor a cache-first reader: its item set is still the disk's,
// which is what `acd-cache-read-surface-boundary` pins `buildSnapshot` on.
import { isMeshWorktree } from "../work/read.mjs";
const execFileAsync = promisify(execFile);

// THE ONE GIT READ THIS COMMAND PERFORMS, and the whole impure half of 119/ADR-004. The argv comes
// from the resolver so this edge spells no second version of the read, and the parse and the map are
// the resolver's too — this function contributes the spawn and nothing else.
export async function readRenameMap(projectRoot, runGit = null) {
  if (projectRoot == null) return null;
  // `runGit` is the READER, not its output: an injected `(args) => stdout` for tests. Named for what
  // it is, because a string handed here would be swallowed by the catch below and read as "no
  // renames, ever" — a silent empty map, which is the one answer this control must never invent.
  const run = runGit ?? (async (args) => {
    const { stdout } = await execFileAsync("git", args, {
      cwd: projectRoot,
      encoding: "utf8",
      timeout: 15_000,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    return stdout;
  });
  try {
    return buildRenameMap(parseRenameRecords(await run([...RENAME_LOG_ARGS])));
  } catch {
    // Not a checkout, no git on PATH, a shallow clone with no history — every one of them means
    // "history records no rename from here", which is exactly an empty map.
    return new Map();
  }
}

import { meshNodeIdOf } from "./mesh/gate.mjs";
import { readJson } from "../fs.mjs";
import { probeFabric, remediationForReason } from "../mesh/fabric.mjs";
import { commandError } from "../command-error.mjs";
import { effectsFor, knownEvents } from "../effects/table.mjs";
import {
  openEffectsJournal,
  effectsJournalPath,
  readEvents,
  readEventSteps,
  pendingSteps,
} from "../effects/journal.mjs";
import { drainEffects, reachableLoci } from "../effects/dispatch.mjs";
import { reconcileRunRecords } from "../effects/reconcile.mjs";

// The operator guidance for a step left owed at a locus this process cannot
// reach — the honest half of --converge's report: what was NOT paid, and whose
// job it is. One home for the hints so render and --json carry the same words.
const LEFT_HINTS = Object.freeze({
  "control-store": "paid by the control daemon's converge tick (aof mesh serve), or delivered over the mesh bridge",
  "integration:notion": "run `aof work integrations notion sync-work <milestone>`, or set work.integrations.notion.autoSync",
});

function leftHint(locus) {
  return LEFT_HINTS[locus] ?? `owed at "${locus}" — drained by the process that reaches that locus`;
}

export const doctorCommand = {
  id: "work:doctor",
  input: {
    type: "object",
    properties: {
      scope: { type: "string" },
      // m42 wave (d) leg d5 — the ledger's two diagnostic modes. `explain`
      // renders one event's declared cascade + its journal state (read-only);
      // `converge` runs the file-store reconciler scan and drains everything
      // this process's loci can pay. Mutually exclusive with each other; the
      // bare findings lane is untouched when neither is set.
      explain: { type: "string" },
      converge: { type: "boolean" },
      // The injected clock for timestamp-deterministic assertions (the 22/R2
      // white-box idiom — a test input, never a CLI flag).
      now: { type: "string" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    if (typeof input.explain === "string" && input.converge === true) {
      throw commandError("Use --explain <event> or --converge, not both.", "invalid-input", 400);
    }
    if (typeof input.explain === "string") return await explainEvent(input.explain, ctx);
    if (input.converge === true) return await convergeLedger(ctx, input.now);

    const scope = scopeOf(input);
    let rawCommittedConfig = {};
    let rawCommittedMesh = {};
    try {
      const rawCommitted = await readJson(ctx.workspace.configPath);
      if (rawCommitted && typeof rawCommitted === "object") rawCommittedConfig = rawCommitted;
      if (rawCommitted?.mesh && typeof rawCommitted.mesh === "object") rawCommittedMesh = rawCommitted.mesh;
    } catch {
      rawCommittedConfig = {};
      rawCommittedMesh = {}; // an unreadable/torn committed config has no identity to warn about here.
    }
    // milestone 34 / story 00 — does a LEGACY per-workspace identity sidecar still exist
    // (should be migrated up to the machine-wide global home)? Read at the impure edge,
    // handed to the pure check-group as plain data (never a read the engine performs).
    let legacyIdentitySidecarPresent = false;
    try {
      const { sidecarPathFor } = await import("../node-identity.mjs");
      const { existsSync } = await import("node:fs");
      legacyIdentitySidecarPresent = existsSync(sidecarPathFor(ctx.workspace.aofDir));
    } catch {
      legacyIdentitySidecarPresent = false;
    }
    // milestone 43 / story 06 (ADR-005) — THE CACHE OVERLAY's read, at this SAME impure edge.
    // Doctor's engine builds its snapshot once and hands pure data to pure groups, so the
    // store read belongs here beside `Date.now()` and the raw committed config, never inside
    // the engine. A fault degrades to `null`, which is exactly "no overlay": every group then
    // sees the disk-only snapshot it saw before this story, rather than doctor failing
    // because the mesh cache is unavailable.
    //
    // …AND THE WORKTREE GUARD IS APPLIED HERE TOO (m43 / ADR-016/G4, MEASURED). ADR-005's
    // echo-chamber rule is a fact about the WORKSPACE, not about one reader: a per-assignment
    // worktree reports under the SAME workspace id as the control, so inside a worker's own
    // checkout the cache answers with another node's opinion of the work this checkout is
    // authoring. `work-read.mjs`'s seam already refuses that; this read reaches the store
    // DIRECTLY and was the second, unguarded door. Measured inside a real worktree it produced
    // `cache-status-divergence` on every item whose disk had moved past the last stream tick
    // — the normal mid-phase state — plus a `started-story-no-tasks` fired only because the
    // OVERLAID status made a not-started story read in-progress. `null` costs no new control
    // flow: `doctorWork` already treats it as "no overlay", which in a worktree is exactly
    // right — its own disk IS the authority on the work it is doing.
    const cache = isMeshWorktree(ctx.workspace.projectRoot)
      ? null
      : await readCachedWorkFacts(
        ctx.workspace,
        // story 85 / task 01 — the names come from the engine's own `CONVENTION_DOCS` rather
        // than a second literal list. The disk probe and this cache read must ask about the
        // SAME documents or the overlay answers for one set and the lanes read another; a name
        // the cache holds nothing for simply keeps its disk probe, which is the per-fact
        // degradation ADR-010/R6.1 already specifies.
        { docNames: CONVENTION_DOCS },
        { globalWorkStoreOptions: ctx.globalWorkStoreOptions ?? {} },
      );
    const snapshot = await buildSnapshot(ctx.workspace.workDir, {
      // 119/ADR-004 — the rename map, read HERE and handed in as plain data. A repository that is
      // not a git checkout, or a git that fails for any reason, yields an EMPTY map: the probe then
      // resolves exactly what it resolved before, which is the honest degradation. It is never an
      // error, because a citation gate must not depend on the presence of history to report at all.
      renameMap: await readRenameMap(ctx.workspace.projectRoot ?? null),
      cache: cache ?? null,
      selfNode: meshNodeIdOf(ctx.workspace.config ?? {}) ?? null,
      projectRoot: ctx.workspace.projectRoot ?? null,
      runners: Array.isArray(ctx.workspace.config?.work?.controls?.runners)
        ? ctx.workspace.config.work.controls.runners
        : null,
      // milestone 54 / story 04 — the last runner report reaches the traceability lane
      // through this SAME impure edge, as plain data: the file read happens here, the lane
      // stays a pure function of the snapshot, and `work:doctor` still executes nothing.
      report: declaredReportFrom(ctx.workspace.config),
    });
    const findings = await doctorWork(ctx.workspace.workDir, ctx.workspace.config, scope, {
      snapshot,
      now: Date.now(), // the impure edge — the engine stays wall-clock-free
      staleWindow: staleWindowFromConfig(ctx.workspace.config),
      // milestone 66 / story 02 (ADR-004 §1) — the controls lane's leg A resolves a
      // cited control path REPO-relative, and the work dir is not the repo. The root
      // is a workspace fact known only here, so it is handed in as plain data like
      // everything else at this edge; without it no cited path can be resolved and
      // every declared control is honestly reported unresolved.
      projectRoot: ctx.workspace.projectRoot,
      cache,
      // WHOSE report counts as "this node's own" — the discriminator between a real
      // divergence and the mesh working as designed (ADR-005).
      selfNode: meshNodeIdOf(ctx.workspace.config ?? {}),
      rawCommittedMesh,
      committedConfigPath: ctx.workspace.configPath,
      legacyIdentitySidecarPresent,
      legacyIdentitySidecarPath: ctx.workspace.aofDir ? `${ctx.workspace.aofDir}/mesh/identity.json` : null,
    });

    // chore 103 — AN INSTRUMENT THAT CAN SEE NOTHING MUST REFUSE, NOT REPORT HEALTH
    // (78/RETROSPECTIVE R4). Every check-group above is a function of the snapshot, so
    // over ZERO items every one of them correctly produces nothing — and `healthy — <ref>
    // is coherent.` is what that renders as. The two are indistinguishable at the face:
    // "nothing was looked at" and "nothing is wrong" print the same words, and this is the
    // one instrument `aof:verify` names as the check to read before setting `status: done`.
    // It nearly landed an acceptance on an empty scan (F-78-K).
    //
    // The cwd-derived work dir that CAUSED that scan is fixed at the resolution site
    // (findProjectConfig in workspace.mjs), and this is the belt to that braces: whatever
    // future reason the stream comes back empty — a mistyped declaration, a work dir that
    // has not been created, a checkout that never ran init — the answer is a finding that
    // NAMES the directory it looked in, and a non-zero exit, rather than a pass.
    //
    // ADDITIVE and workspace-level, exactly like the config-fault and fabric findings
    // below: it is a fact about the SCAN, not about any item, so `scope` never filters it.
    if (snapshot.items.length === 0) {
      findings.push({
        code: "empty-stream",
        severity: "error",
        path: snapshot.workDir,
        // The prose names BOTH causes, because the finding cannot tell them apart and
        // guessing reads badly either way: a stream pointed somewhere unintended, and a
        // stream that is simply still empty. An earlier draft closed with "check that it
        // has been initialized", which is precisely the wrong thing to tell someone who
        // has just run `work init` — the commonest way to meet this finding legitimately.
        message:
          "no work items were found in this directory — every check ran over an EMPTY stream, " +
          "so a clean answer here would mean \"nothing was looked at\", not \"nothing is wrong\". " +
          "Either this is not the directory you meant (the declared work dir is resolved against " +
          "the directory the workspace config was found in, never the current one), or the stream " +
          "is genuinely empty and there is nothing to report on yet.",
      });
    }

    // chore 94 — THE CALLER THAT DRIVES loadWorkspace'S CONFIG-FAULT DISTINCTION. A config
    // that is present but does not parse degrades to `{}` at the door (deliberately — see
    // configFaultFrom in work.mjs), which means every OPTIONAL declaration silently does not
    // run: `work.worktree.prepare` never prepares, `work.test` never selects, the loop bounds
    // fall back to their defaults, each reader correctly taking its default for a key it
    // cannot see. Nothing said so anywhere. This is the health lane, so this is where the
    // recorded fault becomes a WORD: an `error` finding naming the file and the parse error.
    // ADDITIVE and workspace-level, exactly like the fabric preflight below — it is a fact
    // about the workspace, not about any item, so it is never filtered by `scope`.
    if (ctx.workspace.configFault) {
      const fault = ctx.workspace.configFault;
      // chore 113 — THE THIRD CODE, through this same finding. A config that is simply not
      // there is the legitimate unconfigured state when it was DISCOVERED, and an operator
      // error when it was NAMED with --config — loadWorkspace records the second as a fault
      // and the first as nothing at all, so reaching here already means it was named. Its
      // remediation is the one thing that differs from the two present-but-unusable codes:
      // there is no file to fix and no position to report, so the message points at the path
      // that was passed instead.
      const missing = fault.code === "missing-config";
      let code = "config-unreadable";
      if (missing) code = "config-missing";
      else if (fault.code === "malformed-json") code = "config-unparseable";
      findings.push({
        code,
        severity: "error",
        path: fault.path,
        // The message NAMES the consequences in prose and spells no configuration key: a dotted
        // key inside a string literal reads as a SECOND reader of that key to FF-7201's one-reader
        // census (comments are stripped before it looks, a message is not). The words are the
        // operator's anyway — what stopped happening, not which key spells it.
        message: missing
          ? `the workspace config named with --config is not there (${fault.message}) — the run is ` +
            "proceeding on defaults exactly as though no config had been declared, so every optional " +
            "declaration that file would have carried (the worktree prepare step, the test runner and " +
            "its selection, the rubric floor, the loop bounds) is silently not running. Check the path " +
            "that was passed, or drop it and let the config be discovered from the current directory."
          : `the workspace config could not be read (${fault.message}) — it is being treated as EMPTY, ` +
            "so every optional declaration in it (the worktree prepare step, the test runner and its selection, " +
            "the rubric floor, the loop bounds) is silently not running. Fix the file, then re-run; " +
            "`aof project validate` reports the exact position.",
      });
    }

    // milestone 33 / story 01 (ADR-001.4 / ADR-003.4, task 04) — the fabric preflight
    // check, ADDITIVE and SILENT unless config.mesh.fabric is declared (a wholly
    // unconfigured mesh is byte-identical to before this task — no dangling finding).
    // A degraded probe warns with the SAME remediation text the launcher preflight
    // prints (ONE source, src/mesh/fabric.mjs) — this NEVER runs a remediation itself
    // (ADR-001.consequence: report, never auto-fix).
    if (ctx.workspace.config?.mesh?.fabric != null) {
      const probe = ctx?.fabricProbe ?? (await probeFabric(ctx.workspace.config));
      if (!probe.healthy) {
        findings.push({
          code: "mesh-fabric-degraded",
          severity: "warn",
          path: ctx.workspace.configPath,
          message: `the mesh fabric is degraded (${probe.reason}) — ${remediationForReason(probe.reason)}`,
        });
      }
    }

    let loops = null;
    let registryFault = null;
    try {
      // Deferred by design: command-core imports every command module, including
      // this one. A static import would close the registry ring at module scope.
      const { invoke } = await import("../command-core.mjs");
      loops = await invoke("work:loops-validate", {}, ctx);
    } catch (error) {
      registryFault = error instanceof Error ? error.message : String(error);
    }
    const loopReady = computeLoopReady({
      findings,
      config: rawCommittedConfig,
      snapshot,
      scope,
      loops,
      registryFault,
    });

    // Raw absolute paths, OS-native, NO projection — the face relativises.
    return {
      findings: findings.map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        path: finding.path,
        message: finding.message,
      })),
      loopReady,
    };
  },

  cli: {
    // m42 wave (d) leg d1 (wave 2) — routed through the registry-derived table +
    // the ONE generic face; the cli.mjs face copy is deleted. The ADVISORY exit
    // gate (error always fails; warn fails only under --strict) rides cli.exit —
    // run's findings stay identical across --strict (the gate is the face).
    route: ["work", "doctor"],
    spec: {
      usage: "aof work doctor [scope] [--strict] | --explain <event> | --converge [--json]",
      flags: {
        strict: { type: "boolean", description: "treat warn findings as failures" },
        explain: { type: "string", description: "render one event's declared cascade + journal state" },
        converge: { type: "boolean", description: "reconcile the file stores and drain everything owed that this process can pay" },
      },
    },

    // `aof work doctor [scope] [--strict] | --explain <event> | --converge` — the
    // optional positional maps onto the input; the two ledger modes ride flags.
    argv: (positionals, options = {}) => ({
      ...(positionals[0] ? { scope: positionals[0] } : {}),
      ...(typeof options.explain === "string" ? { explain: options.explain } : {}),
      ...(options.converge ? { converge: true } : {}),
    }),

    // The human render: a healthy line on a clean stream (finding-oriented, silent
    // when well); otherwise one `severity: code — message` line per finding with
    // the anchor path shown CWD-RELATIVE (the CLI's path-projection face — run
    // carries the raw absolute, the face relativises to process.cwd()).
    render(result, faceCtx = {}) {
      if (result.explain) return renderExplain(result.explain);
      if (result.converge) return renderConverge(result.converge);
      const scope = faceCtx.positionals?.[0];
      const findingLines = result.findings.length === 0
        ? [`healthy — ${scope ? `${scope} is` : "work stream is"} coherent.`]
        : result.findings.map((finding) => {
          const rel = path.relative(process.cwd(), finding.path);
          return `${finding.severity}: ${finding.code} — ${finding.message} (${rel})`;
        });
      const held = result.loopReady.blocking.length === 0
        ? "nothing is holding the rung down"
        : `blocking: ${result.loopReady.blocking.join(", ")}`;
      findingLines.push(
        `Loop-Ready: ${result.loopReady.score}% (${result.loopReady.passed}/${result.loopReady.applicable}) — clears ${result.loopReady.clears}; ${held}.`,
      );
      return findingLines.join("\n");
    },

    // --json emits the canonical envelope (each finding cwd-relative-pathed) PLUS
    // the config-doctor-shaped summary { healthy, strict, errors, warnings,
    // findings } so a CI step reads health without re-deriving. `strict`/`healthy`
    // reflect the FACE gate (ADR-002): error ⇒ never healthy; warn ⇒ unhealthy
    // only under --strict. The finding SET is identical with/without --strict.
    json(result, faceCtx = {}) {
      // The ledger modes carry no paths — their envelopes pass through verbatim.
      if (result.explain || result.converge) return result;
      const strict = doctorStrict(faceCtx);
      const findings = result.findings.map((finding) => ({
        code: finding.code,
        severity: finding.severity,
        path: path.relative(process.cwd(), finding.path),
        message: finding.message,
      }));
      const errors = findings.filter((finding) => finding.severity === "error").length;
      const warnings = findings.filter((finding) => finding.severity === "warn").length;
      const failed = errors > 0 || (strict && warnings > 0);
      return { healthy: !failed, strict, errors, warnings, findings, loopReady: result.loopReady };
    },

    exit(result, faceCtx = {}) {
      if (!Array.isArray(result.findings)) return 0; // the ledger modes report; they do not gate
      const strict = doctorStrict(faceCtx);
      const errors = result.findings.filter((finding) => finding.severity === "error").length;
      const warns = result.findings.filter((finding) => finding.severity === "warn").length;
      return errors > 0 || (strict && warns > 0) ? 1 : 0;
    },
  },
};

// The face flag read once: the generic face passes { positionals, options } —
// the ONE calling convention (the pre-route { strict } shape is retired).
function doctorStrict(faceCtx = {}) {
  return Boolean(faceCtx.options?.strict);
}

function scopeOf(input) {
  const scope = typeof input?.scope === "string" ? input.scope.trim() : "";
  return scope === "" ? undefined : scope;
}

// The human faces of the two ledger modes — cascade first, then journal state.
function renderExplain(explain) {
  const lines = [`${explain.event} — declared cascade:`];
  for (const reactor of explain.reactors) {
    lines.push(`  ${reactor.key} @ ${reactor.locus}${reactor.predicated ? " (predicated — owed only where it applies)" : ""}`);
  }
  if (!explain.journal.present) {
    lines.push("journal: no journal file on this node yet (no event has ever been appended).");
    return lines.join("\n");
  }
  const owed = explain.journal.owed;
  lines.push(`journal: ${owed.length} owed step(s) for this event.`);
  for (const step of owed) {
    lines.push(`  owed: ${step.key} @ ${step.locus} — ${step.status}, ${step.attempts} attempt(s) (${step.eventId})`);
  }
  if (explain.journal.recent.length > 0) {
    lines.push("recent:");
    for (const event of explain.journal.recent) {
      const steps = event.steps.map((step) => `${step.key}=${step.status}`).join(", ");
      lines.push(`  ${event.eventId} (${event.createdAt}${event.source ? `, ${event.source}` : ""}): ${steps}`);
    }
  }
  return lines.join("\n");
}

function renderConverge(converge) {
  const lines = [];
  if (converge.reconciled.length > 0) {
    lines.push(`Reconciled ${converge.reconciled.length} fact(s) whose event a crash ate:`);
    for (const entry of converge.reconciled) {
      lines.push(`  ${entry.ref} run ${entry.runId} → ${entry.event} (${entry.eventId})`);
    }
  }
  const paid = converge.drained.filter((outcome) => outcome.status === "done").length;
  const failed = converge.drained.filter((outcome) => outcome.status === "failed").length;
  lines.push(`Drained ${paid} step(s)${failed ? ` (${failed} failed — retried by a later drain)` : ""}.`);
  if (converge.left.length > 0) {
    lines.push("Still owed elsewhere:");
    for (const entry of converge.left) {
      lines.push(`  ${entry.count}× ${entry.key} @ ${entry.locus} — ${entry.hint}`);
    }
  } else {
    lines.push("Nothing owed at unreachable loci — the ledger is converged for this node.");
  }
  return lines.join("\n");
}

// --------------------------------------------------- the ledger modes (d5) ----

// --explain <event>: the declared cascade (from the ONE effects table) + the
// journal's state for that event. Read-only — it renders, never drains.
async function explainEvent(event, ctx) {
  const declared = effectsFor(event);
  if (declared == null) {
    throw commandError(
      `Unknown event "${event}". Declared events: ${knownEvents().join(", ")}.`,
      "unknown-event",
      400,
    );
  }
  const reactors = declared.map((reactor) => ({
    key: reactor.key,
    locus: reactor.locus,
    // A predicated reactor is owed only where its predicate says so — worth
    // rendering, because "why is there no step?" is this mode's whole job.
    predicated: typeof reactor.applies === "function",
  }));

  const journalOptions = ctx.effectsJournalOptions ?? {};
  if (!existsSync(effectsJournalPath(journalOptions))) {
    return { explain: { event, reactors, journal: { present: false } } };
  }
  const journal = await openEffectsJournal(journalOptions);
  try {
    const recent = readEvents(journal, { name: event, limit: 5 }).map((row) => ({
      eventId: row.eventId,
      createdAt: row.createdAt,
      source: row.source ?? null,
      steps: readEventSteps(journal, row.eventId).map((step) => ({
        key: step.key,
        locus: step.locus,
        status: step.status,
        attempts: step.attempts,
        ...(step.lastError ? { lastError: step.lastError } : {}),
      })),
    }));
    const owed = pendingSteps(journal, { limit: 500 }).filter((step) => step.name === event);
    return {
      explain: {
        event,
        reactors,
        journal: {
          present: true,
          recent,
          owed: owed.map((step) => ({ eventId: step.eventId, key: step.key, locus: step.locus, status: step.status, attempts: step.attempts })),
        },
      },
    };
  } finally {
    journal.close();
  }
}

// --converge: reconcile the file stores (the write-vs-append crash window), then
// drain everything this process's loci can pay, then report — paid, and LEFT,
// each leftover with the hint naming whose job it is. The one deliberately
// mutating doctor mode: an explicit operator request, like sync-work's drain.
async function convergeLedger(ctx, now) {
  const journalOptions = ctx.effectsJournalOptions ?? {};
  const reconciled = await reconcileRunRecords(ctx.workspace, { journalOptions, now });

  if (!existsSync(effectsJournalPath(journalOptions))) {
    return { converge: { reconciled: reconciled.appended ?? [], drained: [], left: [] } };
  }

  const loci = reachableLoci(ctx.workspace);
  const reactorCtx = { publisherOptions: ctx, workspace: ctx.workspace };
  const drained = [];
  const journal = await openEffectsJournal(journalOptions);
  try {
    // Bounded passes: each pass fetches only runnable steps (the d4 starvation
    // guard), so an empty pass means convergence — not an infinite loop against
    // steps that keep failing (attempts cap them out of the fetch).
    for (let pass = 0; pass < 10; pass += 1) {
      const outcomes = await drainEffects({ journal, loci, limit: 100, now, ctx: reactorCtx });
      drained.push(...outcomes);
      if (outcomes.length === 0) break;
    }
    // The honest half: what is STILL owed, fetched without the loci filter.
    const leftByKey = new Map();
    for (const step of pendingSteps(journal, { limit: 500 })) {
      if (loci.includes(step.locus)) continue; // will be paid by a later pass here
      const key = `${step.locus} ${step.key}`;
      leftByKey.set(key, (leftByKey.get(key) ?? 0) + 1);
    }
    const left = [...leftByKey.entries()].map(([key, count]) => {
      const [locus, reactorKey] = key.split(" ");
      return { locus, key: reactorKey, count, hint: leftHint(locus) };
    });
    return {
      converge: {
        reconciled: reconciled.appended ?? [],
        drained: drained.map(({ event, key, locus, status, error }) => ({ event, key, locus, status, ...(error ? { error } : {}) })),
        left,
      },
    };
  } finally {
    journal.close();
  }
}
