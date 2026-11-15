// Core assembly: construct once per application; collaborators are supplied explicitly.
import path from "node:path";
import { formatClaudeSettingsOutcome } from "../../../claude-settings.mjs";
import { updateWork } from "../../../work/update.mjs";
import { formatFriendlyApplyAction, relativeDisplayPath } from "../../../render-plan.mjs";
import { RUNTIME_FLAGS, hasRuntimeOptions, parseRuntimes } from "../../../spine/flags.mjs";

export function assembleCommandsInitUpdate({ workInitServices, workMemoryServices, configInspectServices = null, workDoctorExamplesServices = null, workServices = null }) {
  // work:init / work:update — render the ACD bundle into a repo, and re-render it
  // drift-checked against the install manifest (m42 wave (d) leg d1, wave-3 tail;
  // formerly cli.mjs's CLI-only workInitCommand / workUpdateCommand). Both ride
  // the pure-outcome write-verb idiom: run() executes and returns the core's
  // outcome (guarded / notInitialized / applied / dry-run), the render reproduces
  // the retired transcript in order, cli.exit gates the refusals.
  //
  // Documented normalisation with the migration (the packages:install precedent):
  // the guarded / not-initialised refusal message now ENDS THE STDOUT DOCUMENT
  // (render) instead of printing to stderr — the exit still gates 1 both faces,
  // and the --json refusal document keeps its exact retired shape
  // ({ guarded|notInitialized, manifest, message }).
  //
  // WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
  // moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
  //
  //   chore 51 — work:init-config joins the init family in the SAME module: the
  //   config half `/aof:init` calls after the render, once it has analysed the repo.

  const { initWork } = workInitServices;
  const { initConfig } = workInitServices;
  const { TAG_GROUPS } = workInitServices;
  const { WORK_INTAKE_CONFIG_PATH } = workInitServices;
  const { MEMORY_BACKEND_CONFIG_PATH } = workMemoryServices;
  // 190/ADR-008 §5 — the project doctor's test-layout family, called here so a project taking a new
  // bundle hears what its test declaration leaves out without remembering to ask.
  const testLayoutChecks = configInspectServices?.testLayoutChecks ?? (async () => []);
  // 193/ADR-006 §5 — the doctor's operator lane, asked over the target's loaded workspace, so a project
  // that turned operator-aware discovery on hears that no profile is declared from the update and from
  // the turn-on itself, in the doctor's own words. Silent when either collaborator is absent.
  const operatorProfileWarnings = workDoctorExamplesServices?.operatorProfileWarnings ?? null;
  const loadWorkspace = workServices?.loadWorkspace ?? null;
  async function operatorProfileFor(targetDir) {
    if (operatorProfileWarnings == null || loadWorkspace == null) return [];
    try {
      return operatorProfileWarnings((await loadWorkspace(targetDir)).config);
    } catch {
      return [];
    }
  }
  // m43 / ADR-002 — the co-authored settings merge reports on the SAME envelope the
  // plan does, so a refusal (`claude-settings-unparseable`) or a restored drift is
  // visible on both faces rather than only in a log line.

  // The retired reportNotInstallable, as render LINES (the collector form of the
  // confine-console.log discipline): group by runtime, one line per group.
  function notInstallableLines(notInstallable = []) {
    if (notInstallable.length === 0) return [];
    const byRuntime = new Map();
    for (const item of notInstallable) {
      const list = byRuntime.get(item.runtime) ?? [];
      list.push(item);
      byRuntime.set(item.runtime, list);
    }
    const lines = [];
    for (const [runtime, items] of byRuntime) {
      const kinds = [...new Set(items.map((item) => item.kind))].join(", ");
      lines.push(`Not installable on ${runtime} (${kinds}): ${items.map((item) => item.id).join(", ")} — unsupported by the capability matrix; not written.`);
    }
    return lines;
  }

  function actionLines(result) {
    return result.actions.map((item) => `  ${formatFriendlyApplyAction(item, { dryRun: result.dryRun, targetDir: result.targetDir })}`);
  }

  function jsonActions(result) {
    return result.actions.map((item) => ({ action: item.action, path: relativeDisplayPath(item.path, result.targetDir) }));
  }

  const workInitCommand = {
    id: "work:init",
    input: {
      type: "object",
      properties: {
        targetDir: { type: "string" },
        runtimes: { type: "array", items: { type: "string" } },
        dryRun: { type: "boolean" },
        force: { type: "boolean" },
        withHeadroom: { type: "boolean" },
      },
      required: ["targetDir", "runtimes"],
      additionalProperties: false,
    },

    async run(input) {
      const result = await initWork({
        targetDir: input.targetDir,
        runtimes: input.runtimes,
        dryRun: Boolean(input.dryRun),
        force: Boolean(input.force),
        withHeadroom: Boolean(input.withHeadroom),
      });
      return { ...result, targetDir: input.targetDir };
    },

    cli: {
      route: ["work", "init"],
      spec: {
        usage: "aof work init [dir] [--dry-run] [--runtime claude,codex] [--force] [--with-headroom] [--json]",
        workspace: false,
        flags: {
          ...RUNTIME_FLAGS,
          dryRun: { type: "boolean", description: "report what would be written without writing" },
          force: { type: "boolean", description: "overwrite a guarded prior install" },
          withHeadroom: { type: "boolean", description: "also enable the headroom plugin block" },
        },
      },

      argv: (positionals, options) => ({
        targetDir: path.resolve(positionals[0] ?? process.cwd()),
        // The retired face's default: claude unless runtime flags narrow the run
        // (work init never prompts — the top-level `aof init` is the interactive
        // spelling).
        runtimes: hasRuntimeOptions(options) ? parseRuntimes(options) : ["claude"],
        ...(options.dryRun ? { dryRun: true } : {}),
        ...(options.force ? { force: true } : {}),
        ...(options.withHeadroom ? { withHeadroom: true } : {}),
      }),

      render(result) {
        if (result.guarded) return result.message;
        const lines = [];
        if (result.dryRun) lines.push("dry-run: the following files would be written (nothing written):");
        lines.push(...actionLines(result));
        lines.push(...notInstallableLines(result.notInstallable));
        if (!result.dryRun) {
          const { created, updated, skipped } = result.summary;
          const drift = result.summary["drift-warning"];
          const settingsLine = formatClaudeSettingsOutcome(result.claudeSettings, { targetDir: result.targetDir });
          if (settingsLine != null) lines.push(settingsLine);
          lines.push(`Initialised ACD: ${created} created, ${updated} updated, ${skipped} kept, ${drift} drift-warning.`);
          lines.push(`Manifest: ${relativeDisplayPath(result.manifestPath, result.targetDir)}`);
        }
        return lines.join("\n");
      },

      json(result) {
        if (result.guarded) {
          return { guarded: true, manifest: relativeDisplayPath(result.manifestPath, result.targetDir), message: result.message };
        }
        return {
          targetDir: path.relative(process.cwd(), result.targetDir) || ".",
          runtimes: result.runtimes,
          dryRun: result.dryRun,
          summary: result.summary,
          manifest: result.manifestWritten ? relativeDisplayPath(result.manifestPath, result.targetDir) : null,
          actions: jsonActions(result),
          notInstallable: result.notInstallable,
          claudeSettings: result.claudeSettings ?? null,
        };
      },

      exit: (result) => (result.guarded ? 1 : 0),
    },
  };

  // work:init-config (chore 51) — the CONFIG half of init, the second call
  // `/aof:init` makes: `aof work init` renders the bundle, the agent step analyses the
  // repo, and this verb writes what it inferred. Config-only read-merge-write (the
  // use-headroom idiom); it never touches the lock and never re-renders.
  //
  // `--layers/--refinements/--domains` are comma-separated tag lists — the face's only
  // job is to split them; the fill-don't-clobber decision lives in `initConfig`.
  function splitTagList(value) {
    if (value == null) return [];
    return String(value).split(",").map((tag) => tag.trim()).filter(Boolean);
  }

  const workInitConfigCommand = {
    id: "work:init-config",
    input: {
      type: "object",
      properties: {
        targetDir: { type: "string" },
        tags: {
          type: "object",
          properties: {
            layers: { type: "array", items: { type: "string" } },
            refinements: { type: "array", items: { type: "string" } },
            domains: { type: "array", items: { type: "string" } },
          },
          additionalProperties: false,
        },
        operatorAware: { type: "string", enum: ["on", "off"] },
        operatorRole: { type: "string" },
        expertise: { type: "string" },
        global: { type: "boolean" },
      },
      required: ["targetDir"],
      additionalProperties: false,
    },

    async run(input) {
      const result = await initConfig({
        targetDir: input.targetDir,
        tags: input.tags,
        operatorAware: input.operatorAware,
        operatorRole: input.operatorRole,
        expertise: input.expertise,
        global: Boolean(input.global),
      });
      // The turn-on says at once what is still missing: the doctor's sentence, from the same function.
      const turnedOn = result.operatorAwareWritten && result.operatorAware === true;
      return { ...result, operatorProfile: turnedOn ? await operatorProfileFor(result.targetDir) : [] };
    },

    cli: {
      route: ["work", "init-config"],
      spec: {
        usage: "aof work init-config [dir] [--layers @cli,@ui] [--refinements @work] [--domains @board] [--operator-aware on|off] [--operator-role <text>] [--expertise <domain>=<level>,…] [--global] [--json]",
        workspace: false,
        flags: {
          target: { type: "string", description: "project directory (default: cwd; a bare positional dir also works)" },
          layers: { type: "string", description: "comma-separated layer tags (the delivery surfaces, e.g. @cli,@ui)" },
          refinements: { type: "string", description: "comma-separated refinement tags (the cross-cutting qualifiers)" },
          domains: { type: "string", description: "comma-separated domain tags (the repo's feature areas)" },
          operatorAware: { type: "string", description: "on|off — operator-aware discovery for this project (work.examples.operatorAware; needs discovery on)" },
          operatorRole: { type: "string", description: "who you are in this project, a sentence or two (work.operator.role; replaces the role)" },
          expertise: { type: "string", description: "comma-separated <domain>=expert|working|new (work.operator.expertise; replaces each domain named)" },
          global: { type: "boolean", description: "write the operator profile to the machine-wide ~/.aof/aof.config.json, and nothing else" },
        },
      },

      argv: (positionals, options) => ({
        targetDir: path.resolve(options.target ?? positionals[0] ?? process.cwd()),
        tags: Object.fromEntries(TAG_GROUPS.map((group) => [group, splitTagList(options[group])])),
        ...(options.operatorAware !== undefined ? { operatorAware: String(options.operatorAware) } : {}),
        ...(options.operatorRole !== undefined ? { operatorRole: String(options.operatorRole) } : {}),
        ...(options.expertise !== undefined ? { expertise: String(options.expertise) } : {}),
        ...(options.global ? { global: true } : {}),
      }),

      render(result) {
        if (result.global) {
          return [
            `${result.created ? "Created" : "Updated"} ${result.configPath}`,
            `work.operator written (global) — ${operatorSummary(result.operator)}; every project on this machine reads it under its own.`,
          ].join("\n");
        }
        const lines = [
          `${result.created ? "Created" : "Updated"} ${relativeDisplayPath(result.configPath, result.targetDir)}`,
          // The key is named from the seam, not spelled again here: a face that prints the
          // config path was a second, silent home for it — prose nothing keeps honest if the
          // key ever moves (ADR-002).
          `${MEMORY_BACKEND_CONFIG_PATH}: ${result.memoryBackend} (${result.backendWritten ? "set" : "kept"})`,
          // 127/ADR-005 §1 — the same statement for the write-side intake, from the same
          // seam-named key. An ABSENT key is reported as absent and as what it READS as: a
          // line that printed "stream" would look like a choice this verb had made.
          result.intake == null
            ? `${WORK_INTAKE_CONFIG_PATH}: absent — reads as "stream" (it is written only into a config this verb creates)`
            : `${WORK_INTAKE_CONFIG_PATH}: ${result.intake} (${result.intakeWritten ? "set" : "kept"})`,
        ];
        if (result.tagsWritten) {
          const groups = TAG_GROUPS
            .filter((group) => Array.isArray(result.tags?.[group]) && result.tags[group].length > 0)
            .map((group) => `${group}: ${result.tags[group].join(", ")}`);
          lines.push(`work.tags written — ${groups.join(" | ")}`);
        } else if (result.tagsKept) {
          lines.push("work.tags: kept — this project already has a tag vocabulary (nothing overwritten).");
        } else {
          lines.push("work.tags: no vocabulary given — pass --layers/--refinements/--domains to fill it in.");
        }
        if (result.operatorAwareWritten) {
          lines.push(`work.examples.operatorAware: ${result.operatorAware ? "on" : "off"} (set) — run "aof work update" to render it.`);
        }
        if (result.profileWritten) lines.push(`work.operator written (project) — ${operatorSummary(result.operator)}`);
        lines.push(...warningLines(result.operatorProfile));
        return lines.join("\n");
      },

      json: (result) => (result.global ? {
        targetDir: path.relative(process.cwd(), result.targetDir) || ".",
        global: true,
        configPath: result.configPath,
        created: result.created,
        profileWritten: result.profileWritten,
        operator: result.operator,
      } : {
        targetDir: path.relative(process.cwd(), result.targetDir) || ".",
        configPath: relativeDisplayPath(result.configPath, result.targetDir),
        created: result.created,
        memoryBackend: result.memoryBackend,
        backendWritten: result.backendWritten,
        intake: result.intake,
        intakeWritten: result.intakeWritten,
        tagsWritten: result.tagsWritten,
        tagsKept: result.tagsKept,
        tags: result.tags,
        operatorAware: result.operatorAware,
        operatorAwareWritten: result.operatorAwareWritten,
        profileWritten: result.profileWritten,
        operator: result.operator,
        operatorProfile: result.operatorProfile ?? [],
      }),
    },
  };

  const workUpdateCommand = {
    id: "work:update",
    input: {
      type: "object",
      properties: {
        targetDir: { type: "string" },
        dryRun: { type: "boolean" },
        force: { type: "boolean" },
      },
      required: ["targetDir"],
      additionalProperties: false,
    },

    async run(input) {
      const result = await updateWork({
        targetDir: input.targetDir,
        dryRun: Boolean(input.dryRun),
        force: Boolean(input.force),
      });
      if (result.notInitialized) return { ...result, targetDir: input.targetDir };
      // The check only reads, so a dry run prints it too.
      const testLayout = (await testLayoutChecks(input.targetDir))
        .filter((check) => check.severity === "warning")
        .map(({ id, severity, message }) => ({ id, severity, message }));
      const operatorProfile = await operatorProfileFor(input.targetDir);
      return { ...result, targetDir: input.targetDir, testLayout, operatorProfile };
    },

    cli: {
      route: ["work", "update"],
      spec: {
        usage: "aof work update [dir] [--dry-run] [--force] [--json]",
        workspace: false,
        flags: {
          dryRun: { type: "boolean", description: "report what would change without writing" },
          force: { type: "boolean", description: "re-render even without drift" },
        },
      },

      argv: (positionals, options) => ({
        targetDir: path.resolve(positionals[0] ?? process.cwd()),
        ...(options.dryRun ? { dryRun: true } : {}),
        ...(options.force ? { force: true } : {}),
      }),

      render(result) {
        if (result.notInitialized) return result.message;
        const lines = [];
        if (result.dryRun) lines.push("dry-run: the following changes would be applied (nothing written):");
        lines.push(...actionLines(result));
        lines.push(...notInstallableLines(result.notInstallable));
        lines.push(...memoryConfigLines(result.memoryConfig));
        if (!result.dryRun) {
          const { created, updated, skipped, deleted } = result.summary;
          const drift = result.summary["drift-warning"];
          const settingsLine = formatClaudeSettingsOutcome(result.claudeSettings, { targetDir: result.targetDir });
          if (settingsLine != null) lines.push(settingsLine);
          lines.push(`Updated ACD: ${created} created, ${updated} updated, ${skipped} up-to-date, ${deleted} deleted, ${drift} drift-warning.`);
          lines.push(`Manifest: ${relativeDisplayPath(result.manifestPath, result.targetDir)}`);
        }
        lines.push(...practiceLines(result.practices));
        lines.push(...testLayoutLines(result.testLayout));
        lines.push(...warningLines(result.operatorProfile));
        return lines.join("\n");
      },

      json(result) {
        if (result.notInitialized) {
          return { notInitialized: true, manifest: relativeDisplayPath(result.manifestPath, result.targetDir), message: result.message };
        }
        return {
          targetDir: path.relative(process.cwd(), result.targetDir) || ".",
          runtimes: result.runtimes,
          dryRun: result.dryRun,
          summary: result.summary,
          manifest: result.manifestWritten ? relativeDisplayPath(result.manifestPath, result.targetDir) : null,
          actions: jsonActions(result),
          notInstallable: result.notInstallable,
          ...(result.memoryConfig ? { memoryConfig: result.memoryConfig } : {}),
          claudeSettings: result.claudeSettings ?? null,
          testLayout: result.testLayout ?? [],
          operatorProfile: result.operatorProfile ?? [],
          practices: result.practices ?? [],
        };
      },

      exit: (result) => (result.notInitialized ? 1 : 0),
    },
  };

  return { workInitCommand, workInitConfigCommand, workUpdateCommand };
}

// 180/ADR-006 — one line per memory key moved and per pair left as written; none when both are
// empty, so a current project's update output is unchanged.
function memoryConfigLines(memoryConfig) {
  if (!memoryConfig) return [];
  return [
    ...memoryConfig.moves.map(({ from, to }) => `memory: ${from} → ${to}`),
    ...memoryConfig.conflicts.map(({ path: from, replacement }) => `memory: ${from} and ${replacement} both set — left as written; choose one`),
  ];
}

// 192/ADR-007 §2 — the optional practices, one aligned row each: whether it is on, its id, its
// summary and the keys that turn it on (several joined by ` + `). After the summary and before any
// warning; a bundle that declares no practice prints nothing.
export function practiceLines(practices = []) {
  if (!Array.isArray(practices) || practices.length === 0) return [];
  const rows = practices.map((practice) => [practice.on ? "on" : "off", practice.id, practice.summary ?? "", (practice.keys ?? []).join(" + ")]);
  const widths = [0, 1, 2].map((column) => Math.max(...rows.map((row) => row[column].length)));
  return [
    "Optional practices (set every key to true in .aof/aof.config.json, then run `aof work update`):",
    ...rows.map((row) => `  ${row.slice(0, 3).map((cell, column) => cell.padEnd(widths[column])).join("  ")}  ${row[3]}`),
  ];
}

// 190/ADR-008 §5 — one line per test-layout warning, each already naming its repair; none when the
// family is all ok, so a project whose declaration covers its tree sees no change.
function testLayoutLines(testLayout = []) {
  return testLayout.map(({ id, message }) => `warning: ${id} - ${message}`);
}

// 193/ADR-006 §5 — the operator lane's warning, in the test layout's line form.
function warningLines(warnings = []) {
  return warnings.map(({ code, message }) => `warning: ${code} - ${message}`);
}

// What a profile write said, for the face: the role (quoted) and each domain's level it holds.
function operatorSummary(operator) {
  const parts = [];
  if (typeof operator?.role === "string") parts.push(`role "${operator.role}"`);
  const expertise = operator?.expertise != null && typeof operator.expertise === "object" ? Object.entries(operator.expertise) : [];
  if (expertise.length > 0) parts.push(`expertise ${expertise.map(([domain, level]) => `${domain}: ${level}`).join(", ")}`);
  return parts.join("; ") || "nothing";
}
