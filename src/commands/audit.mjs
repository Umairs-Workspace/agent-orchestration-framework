// work:audit — THE INSTRUMENT AUDIT. Milestone 59 / story 04. ADR-002 §1/§2, ADR-006, ADR-007 §1.
//
// A SIBLING of `work:doctor` on the SAME command core, and deliberately not a sixth doctor lane.
// The boundary between the two is one sentence:
//
//   · `aof work doctor` asks whether the DOCUMENTS are coherent.
//   · `aof work audit`  asks whether the INSTRUMENTS that produce them still work.
//
// They are two commands rather than one with a flag because doctor may EXECUTE NOTHING — 66/ADR-004
// §2 froze `src/work/doctor-controls.mjs` as a leaf that reads a cited control's PATH and never its
// BEHAVIOUR, and FF-6605 asserts it can reach no child process — while this command exists in order
// to execute. Both rules are right and they cannot live in one command (ADR-002 §1). Doctor's own
// recorded fold-the-family ratchet is SUPERSEDED, priced (`wiki/work/TECH_DEBT.md` item 10,
// chore 106) — but the clause that mattered HERE is unchanged, and is what FF-5905 asserts:
// no doctor lane is added here.
//
// WHAT IS REUSED WHOLESALE, and it is most of the command: doctor's `{ code, severity, path,
// message }` finding, the basis-neutral RAW ABSOLUTE `path` with no projection inside `run`,
// scope-as-filter with the same "an unresolved scope matches nothing" semantics, `--json`, and
// `--strict` as a FACE concern where `run()` always returns the full advisory set (08/ADR-002,
// 15/ADR-001/ADR-002). The only additions to the envelope are ADR-006's two addressing keys,
// `about` and `to`.
//
// ── THE EXIT RULE, AND WHERE IT DIVERGES FROM DOCTOR'S ───────────────────────────────────────
//
// Doctor gates on an error with or without `--strict`. This command does NOT: an error finding is
// reported and exits 0, and `--strict` is what turns the report into a gate. That is the task
// contract's own decision (`00_one-command-over-the-instruments.feature`, three scenarios) and it
// follows from ADR-007 §1 — the audit is deliberately NOT on 54/FF-5409's frozen five-row cost
// ladder, so a command that reddened every build that merely ran it would be a sixth ladder rung
// arriving by the back door. `--strict` is how a caller opts into the gate. As in doctor, `--strict`
// never changes the finding SET; it changes only the exit code.
//
// ── THE IMPURE EDGE IS HERE ──────────────────────────────────────────────────────────────────
//
// `Date.now()`, the staleness window, the repo root, and the per-item document reads all happen at
// this boundary and are handed to `src/work-audit/report.mjs` as plain data — doctor's own
// arrangement (15/ADR-003 step 4), and the reason the checks leaf can stay clock-free (FF-5907).
// Execution itself never happens in this process: every child goes through 59/01's one bounded
// spawn seam (ADR-002 §3, FF-5904).
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
// From the comment above this module's registry import:
//   milestone 59 / story 04 (ADR-002 §1/§2) — work:audit, the INSTRUMENT lane and doctor's SIBLING
//   on this same core. Doctor asks whether the documents are coherent; audit asks whether the
//   instruments that produce them still work — and the second must EXECUTE, which is exactly what
//   66/ADR-004 §2 forbids the first. Two commands, one core, and doctor's five-lane ratchet
//   untripped. It reuses doctor's finding envelope, its raw-absolute path rule, its scope-as-filter
//   and `--strict`-as-a-face-concern wholesale; the only additions are ADR-006's `about`/`to`.
//   BOARD-DEFERRED for the reason `grade` is (54/ADR-003 §4): a served route would let a page load
//   spawn a bounded child per cited control. Milestone 77 adds harness LANES to this same command
//   rather than shipping a sibling (ADR-002 §4).
//
// From the comment on `auditCommand`'s COMMANDS entry:
//   milestone 59 / story 04 — the instrument audit (see the import note). ONE story owns this
//   array for the whole milestone: three stories appending to one god-node's registry is merge
//   friction wearing an independence claim (59/ADR-008 §1, on 58's own reasoning).
import path from "node:path";
import { readFile } from "node:fs/promises";

import { listItems, parseFrontmatter, recordDoc } from "../work.mjs";
import { loadLoops } from "../work/loops.mjs";
import { AUDIT_ENVELOPE_KEYS, escalates, runAudit } from "../work-audit/report.mjs";
import { limitRecord } from "../work-audit/reads.mjs";
import { AOF_HOOK_MARKER, claudeSettingsPath } from "../claude-settings.mjs";
import { ROLE_WORDS } from "../work-audit/prompt-layer.mjs";
import { declaredBoundValues } from "../work-audit/declared-bounds.mjs";

// ── THE STALENESS WINDOW, AT THE IMPURE EDGE ─────────────────────────────────────────────────
//
// The checks leaf holds no duration literal at all (52/ADR-007, FF-5907), so the window is a fact
// this boundary supplies. Ninety days is the default and `work.audit.anchorStaleDays` overrides it:
// how long a reading about reality stays a reading about TODAY is a project's judgment, not the
// framework's.
export const DEFAULT_ANCHOR_STALE_DAYS = 90;
const MS_PER_DAY = 86_400_000;

// ── WHAT THE FACE INJECTS, BECAUSE THE FAMILY MAY NOT REACH IT (77/ADR-008 §5) ───────────────
//
// `59/FF-5904` forbids `src/work-audit/**` reaching outside `src/` or holding a clock, so three
// facts the rules need are resolved HERE and handed in as arguments: which marker says a hook entry
// was written by the framework, whether the audited project would SPAWN a given role or run it
// inline, and what that project declares for each bound the reference corpus carries. Injection is
// the seam, never a second implementation — a fact read in two places has two expiry dates, and it
// is the second reader that goes stale, silently, because the first one is still right.

/**
 * The audited project's `.claude/settings.json`, as an object, or `null` when there is none. A
 * project with no settings file is an ABSENCE the lane reports as having read nothing, never an
 * error at this boundary.
 */
export async function readAuditedSettings(projectRoot) {
  const settingsPath = claudeSettingsPath(projectRoot);
  try {
    return { settings: JSON.parse(await readFile(settingsPath, "utf8")), settingsPath };
  } catch {
    return { settings: null, settingsPath };
  }
}

/**
 * The audited project's resolved role routing, as `{ [agentId]: "agent" | "inline" }`.
 *
 * A role is `"agent"` only where the audited configuration SAYS SO. `work.agents.mode: "solo"`
 * routes every role inline by definition, and a role the configuration does not mention has not
 * been declared as spawned — so the conservative rung is the inline one. That is not leniency for
 * its own sake: the severity of a capability gap is "is a subagent really being started without the
 * verb it was told to use", and a project that never said it starts one has not made that true.
 */
export function resolveRoleRouting(config) {
  const agents = config?.work?.agents;
  const routing = {};
  if (agents == null || typeof agents !== "object" || agents.mode === "solo") return Object.freeze(routing);
  // The one camelCase alias the ACD commands read, mapped to the agent id a grant is read against.
  if (agents.productOwner === "agent") routing["aof-product-owner"] = "agent";
  for (const id of Object.keys(ROLE_WORDS)) {
    if (agents[id] === "agent") routing[id] = "agent";
  }
  return Object.freeze(routing);
}

export function anchorWindowFromConfig(config) {
  const declared = config?.work?.audit?.anchorStaleDays;
  const days = typeof declared === "number" && Number.isFinite(declared) && declared > 0
    ? declared
    : DEFAULT_ANCHOR_STALE_DAYS;
  return days * MS_PER_DAY;
}

// The two documents the evidence lane reads a register out of, through
// `src/work/doctor-controls.mjs`'s pure extractors (ADR-002 §2 — one home for how a register is
// parsed, two homes for what is done with the result).
const REGISTER_DOCS = Object.freeze(["ARCHITECTURE.md", "VERIFICATION.md"]);

/**
 * The WHOLE item population the scope resolves against, and the subset the evidence lane can
 * actually sweep — two answers, because they are two questions and collapsing them was a defect.
 *
 * An item carrying no `ARCHITECTURE.md` is not a register that has gone missing; it is an item
 * with no register obligation — a story's controls are declared by its milestone. That is doctor's
 * own population rule for the same documents (`verificationGroup` skips an item whose architecture
 * text is absent, `src/work/doctor-controls.mjs`), reused rather than re-decided. What the lane
 * DOES report is an item that has an ARCHITECTURE and declares no rows in it, which is a different
 * fact and a real one.
 *
 * MEASURED AT REVIEW, AND THE REASON `all` EXISTS. Narrowing before the scope was resolved made
 * `aof work audit 59/04` — a real story — render byte-identically to `aof work audit zzz-not-a-
 * thing`, down to "that is not a failure", in the command whose whole subject is not conflating
 * two facts. The scope now resolves against every item on disk (320 of them here) and the lane is
 * offered the 56 that carry a register, so "you named nothing" and "what you named declares no
 * register" are different sentences.
 */
export async function registerItems(workDir) {
  const all = [];
  const offered = [];
  for (const item of await listItems(workDir)) {
    all.push(item);
    const docTexts = {};
    for (const name of REGISTER_DOCS) {
      // ABSENT IS A FACT, NOT AN ERROR, and it is a fact the caller branches on — the missing
      // document decides the population below. A `catch {}` here would say nothing at all, which
      // is what acd-no-new-silent-catch exists to refuse; returning `null` is the handled degrade.
      const text = await readFile(path.join(item.dir, name), "utf8").catch(() => null);
      if (typeof text === "string") docTexts[name] = text;
    }
    if (typeof docTexts["ARCHITECTURE.md"] !== "string") continue;
    let meta = {};
    const doc = recordDoc(item);
    if (doc != null) {
      try {
        meta = parseFrontmatter(await readFile(path.join(item.dir, doc), "utf8"));
      } catch {
        meta = {};
      }
    }
    offered.push({ ...item, meta, docTexts });
  }
  return { all, items: offered, considered: all.length };
}

export const auditCommand = {
  id: "work:audit",
  input: {
    type: "object",
    properties: {
      scope: { type: "string" },
      // The injected clock, for timestamp-deterministic assertions (the 22/R2 white-box idiom —
      // a test input, never a CLI flag).
      now: { type: "number" },
      // The per-child deadline handed to the one spawn seam. A test input and an operator escape
      // hatch for a slow machine; the seam's own default applies when it is absent.
      deadlineMs: { type: "number" },
    },
    additionalProperties: false,
  },

  async run(input, ctx) {
    const scope = typeof input?.scope === "string" && input.scope.trim() !== "" ? input.scope.trim() : null;
    const repoRoot = ctx.workspace.projectRoot;
    const model = await loadLoops(ctx.workspace);
    const { all, items, considered } = await registerItems(ctx.workspace.workDir);
    const { settings, settingsPath } = await readAuditedSettings(repoRoot);

    const report = await runAudit({
      repoRoot,
      model,
      items,
      // 77/ADR-008 §5 — the facts the family may not read for itself, resolved at this boundary.
      markerKey: AOF_HOOK_MARKER,
      settings,
      settingsPath,
      roleRouting: resolveRoleRouting(ctx.workspace.config),
      declaredBoundValues: declaredBoundValues(ctx.workspace),
      // The scope resolves against EVERY item on disk, not against the register-bearing subset:
      // a real item that declares no register is not a scope that matched nothing.
      population: all,
      scope,
      now: typeof input?.now === "number" ? input.now : Date.now(),
      anchorWindowMs: anchorWindowFromConfig(ctx.workspace.config),
      // NOBODY OBSERVED A LOOP RUN, and that is handed in as an empty list rather than omitted:
      // "nobody asked whether it ran" and "it has never run" are the two facts ADR-004 §1 refuses
      // to let a report conflate, and the lane refuses to guess on the caller's behalf.
      executions: [],
      ...(typeof input?.deadlineMs === "number" ? { deadlineMs: input.deadlineMs } : {}),
    });

    return {
      ...report,
      // WHAT THIS RUN COULD NOT SEE, stated on every run, clean or not (59/01's own review finding:
      // a limit quoted only into findings says nothing in exactly the case a reader most needs it).
      limits: [
        ...report.limits,
        {
          lane: "evidence-re-run",
          ...limitRecord({
            question: "does every work item declare a fitness register?",
            answeredBy: `${items.length} of ${considered} item(s) on disk carry an ARCHITECTURE.md and were offered to the evidence lane; the scope resolves against all ${considered}`,
            consequence: "an item with no ARCHITECTURE.md declares no controls to re-run, so it is outside this sweep's population rather than reported clean",
          }),
        },
      ],
    };
  },

  cli: {
    // Routed through the registry-derived route table + the ONE generic face (m42 wave (d)); no
    // cli.mjs ladder branch is added. `--strict` rides `cli.exit` — `run`'s findings are identical
    // with and without it, which is 15/ADR-002's rule and the reason the gate is a face concern.
    route: ["work", "audit"],
    spec: {
      usage: "aof work audit [scope] [--json] [--strict]",
      flags: {
        strict: { type: "boolean", description: "exit non-zero when the audit found an error-severity finding" },
      },
    },

    argv: (positionals) => ({ ...(positionals[0] ? { scope: positionals[0] } : {}) }),

    render(result) {
      const lines = [];
      const shown = (value) => (typeof value === "string" && value.length > 0 ? relative(value) : String(value));

      // THREE FACTS, THREE SENTENCES. "Nothing carries that reference", "what you named declares
      // no register" and "here is what was audited" were two sentences before review, and the
      // first two rendered identically — in the command whose subject is not conflating facts.
      if (result.scope.nothingMatched) {
        lines.push(`Nothing matched "${result.scope.requested}" — no item of the work stream carries that reference, so no instrument was audited. That is not a failure; check the reference.`);
      } else if (result.scope.applied) {
        const named = result.scope.matched.length;
        const swept = result.scope.audited.length;
        lines.push(swept === 0
          ? `Audit scoped to "${result.scope.requested}": ${named} item(s) matched and none of them declares a fitness register, so the item lanes had nothing to re-run: ${result.summary.error} error(s), ${result.summary.warn} warning(s).`
          : `Audit scoped to "${result.scope.requested}" (${named} item(s) matched, ${swept} carrying a register): ${result.summary.error} error(s), ${result.summary.warn} warning(s).`);
      } else {
        lines.push(`Audit over every instrument: ${result.summary.error} error(s), ${result.summary.warn} warning(s).`);
      }

      // WHICH LANES RAN, and why any did not — a lane that was skipped is a fact about the report,
      // never an omission a reader has to notice.
      for (const lane of result.lanes) {
        lines.push(lane.ran
          ? `  lane ${lane.id} — ran, ${lane.findings} finding(s); read ${lane.reads.map((read) => `${read.sweep}=${read.count}/${read.floor}`).join(", ")}`
          : `  lane ${lane.id} — did not run: ${lane.why}`);
      }

      for (const finding of result.findings) {
        const to = finding.to.length === 0 ? "nobody — the registry declares no escalation actor" : finding.to.join(", ");
        lines.push(`${finding.severity}: ${finding.code} — ${finding.message} (${shown(finding.path)}) · about ${finding.about} → to ${to}${escalates(finding.code) ? " [escalated]" : ""}`);
      }
      // "HEALTHY" IS A CLAIM ABOUT WHAT WAS READ, so a run where no lane ran may not make it —
      // that is this milestone's own thesis applied to its own face (a lane that found nothing
      // and a lane that looked at nothing are indistinguishable in a finding list).
      if (result.findings.length === 0 && !result.scope.nothingMatched) {
        lines.push(result.summary.lanes === 0
          ? "no lane ran, so nothing here is a statement about the instruments — see each lane's reason above."
          : "healthy — every instrument this run read is still reporting.");
      }

      // THE BYPASS, STATED WITH ITS REAL REASON. This said "the registry ships no auditor" for
      // every unresolved endpoint, which is a falsehood on a registry that ships two — measured
      // at review on a fixture that loads with zero error findings.
      const declared = result.auditors.length;
      lines.push(`Escalation: ${result.escalation ?? (declared === 0
        ? "undeclared — no record declares the auditor kind, so a finding no reference-owner can receive has nowhere direct to go"
        : `unresolved — ${declared} records declare the auditor kind (${result.auditors.join(", ")}) and they name different escalation actors`)}.`);
      // EVERY DECLARED LIMIT, IN ONE SHAPE (D-59-3). This read `${limit.question} — ${limit.consequence}`
      // over a list carrying TWO vocabularies, so the census lane's two limits printed
      // `undefined — undefined` on every run — the audit silencing its own statement of its blind
      // spot, in exactly the clean-lane case the limit was promoted for. The shape is now one
      // (`src/work-audit/reads.mjs`), refused at construction and again at lane assembly, so this
      // renderer cannot be handed a limit it would print blank. The qualifiers are appended only
      // when present, because `null` is a real answer here and "unqualified" must not read as
      // "missing".
      for (const limit of result.limits) {
        const where = limit.sweep == null ? limit.lane : `${limit.lane}/${limit.sweep}`;
        lines.push(`  limit (${where}): ${limit.question} — ${limit.consequence}`);
        if (limit.answeredBy != null) lines.push(`    answered by: ${limit.answeredBy}`);
        if (limit.authority != null) lines.push(`    authority: ${limit.authority}`);
      }
      return lines.join("\n");
    },

    // --json emits the canonical envelope (each finding cwd-relative-pathed) PLUS the
    // config-doctor-shaped summary so a CI step reads health without re-deriving. `strict` and
    // `healthy` reflect the FACE gate; the finding SET is identical with and without `--strict`.
    json(result, faceCtx = {}) {
      const strict = Boolean(faceCtx.options?.strict);
      const findings = result.findings.map((finding) => ({
        ...finding,
        path: relative(finding.path),
      }));
      const errors = findings.filter((finding) => finding.severity === "error").length;
      const warnings = findings.filter((finding) => finding.severity === "warn").length;
      return {
        healthy: !(strict && errors > 0),
        strict,
        errors,
        warnings,
        escalated: findings.filter((finding) => escalates(finding.code)).length,
        envelope: AUDIT_ENVELOPE_KEYS,
        scope: result.scope,
        lanes: result.lanes,
        findings,
        reads: result.reads,
        limits: result.limits,
        escalation: result.escalation,
        auditors: result.auditors,
        registry: { ...result.registry, source: result.registry.source == null ? null : relative(result.registry.source) },
      };
    },

    exit(result, faceCtx = {}) {
      // ADVISORY BY DEFAULT, EVEN ON AN ERROR. See the exit-rule note in this file's header: the
      // audit is not on the frozen cost ladder, so `--strict` is the door into the gate.
      const strict = Boolean(faceCtx.options?.strict);
      const errors = result.findings.filter((finding) => finding.severity === "error").length;
      return strict && errors > 0 ? 1 : 0;
    },
  },
};

// The CLI's path-projection face: `run` carries the raw absolute, and the face relativises to the
// process's own cwd (08/ADR-002's keystone, inherited from validate.mjs and doctor.mjs).
function relative(value) {
  return path.relative(process.cwd(), value) || ".";
}
