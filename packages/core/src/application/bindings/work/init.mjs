// Core assembly: construct once per application; collaborators are supplied explicitly.
import path from "node:path";
import { existsSync } from "node:fs";
import { readLock, writeLock } from "../../../lock.mjs";
import { createLockManifest, executeApplyActions, planApplyActions } from "../../../render-plan.mjs";
import { RUNTIMES } from "../../../model.mjs";
import { loadBundle } from "../../../work/bundle.mjs";
import { practiceRecord, practiceStates } from "../../../work/bundle-compose.mjs";
import { bundleVersion, summarizeActions, synthesizeBundleConfig } from "../../../work/bundle-synthesis.mjs";
import { ensureAofGitignore, ensureWorkDirGitFiles, workDirFor } from "../../../aof-gitignore.mjs";
import { aofDirForConfig } from "../../../workspace.mjs";
import { setHeadroomEnabled, readConfig, writeConfig } from "../../../work/headroom.mjs";
import { applyClaudeSettingsMerge } from "../../../claude-settings.mjs";
import { codexOwnershipBaseline } from "../../../codex-settings.mjs";
import { readJson } from "@aof/foundation/fs";
import { commandError } from "@aof/contracts/error";
import { correctOperatorProfile, operatorProfileDiagnostics } from "@aof/contracts/operator-profile";
import { LOCAL_CONFIG_FILE } from "@aof/contracts/local-config";

export function assembleWorkInit({ workspaceServices, workMemoryServices, configInspectServices }) {
  // `aof work init` — render the shipped ACD bundle into a consumer repo
  // (milestone 01 / story 01). A THIN orchestrator over the existing engine:
  //
  //   ADR-003: init does NOT implement its own create/update/skip/drift/delete or
  //     a `--force` comparison. It synthesizes an aof `config` from the bundle (via
  //     the SHARED synthesis in work-bundle-synthesis.mjs — the same one update uses)
  //     and delegates to planApplyActions(previousLock = null) → executeApplyActions
  //     → createLockManifest. (Guarded by acd-reuses-render-plan.)
  //   ADR-004 → ADR-009: the per-repo install manifest is a lock-v2 record written
  //     read-merge-write into the SINGLE unified project lock `.aof/aof.lock.json`
  //     (workspacePaths().lockPath) as its `work` SECTION — the separate per-vertical
  //     work-lock file is eliminated. work init owns ONLY the `work` key: it reads
  //     the current lock and writes `{ ...currentLock, work: <manifest> }`,
  //     preserving the flat asset fields and the `planning` section it does not own,
  //     and never reconstructs the lock from a fixed field set. The manifest carries
  //     a `bundle: { version }` minus its own `version` (the unified lock carries ONE
  //     top-level version). (Guarded by acd-install-manifest-contract, section form.)
  //   ADR-005: every rendered file is self-identifying — frontmatter `aof-generated:
  //     true` for resources, the comment-form `<!-- aof-generated: bundle -->` for
  //     templates. (The renderers already emit these; guarded by acd-generated-stamp.)
  //   ADR-006: cross-runtime mapping is delegated to the CAPABILITIES matrix via the
  //     shared synthesis. There is NO `runtime === "codex"`/`"claude"` branch deciding
  //     installability — a member is rendered iff CAPABILITIES[kind][runtime] is
  //     renderable, otherwise it is reported as not-installable. (Guarded by
  //     acd-capability-delegation.)
  //   ADR-007: command members carry `commandNamespace: "aof"` and the adapter's
  //     general namespace rule renders them under `commands/aof/<id>.md`.

  const { workspacePaths } = workspaceServices;
  const { globalWorkspacePaths } = workspaceServices;
  // 193/ADR-006 §1 — the discovery gate's and the switch's resolvers, asked before and after the write.
  const { examplesEnabledFromConfig, operatorAwareFromConfig } = configInspectServices;

  // ADR-002 — the memory seam owns BOTH halves of the backend selection: the read
  // (selectBackendName) and this default-write. The scaffold names the key nowhere.
  const { applyDefaultBackendSelection } = workMemoryServices;
  // m43 / ADR-002: `.claude/settings.json` is CO-AUTHORED and is therefore NOT in the
  // render plan above — `init` treats every unlocked file as fresh, which is exactly how
  // a whole-file render would delete the operator's hooks/permissions/sandbox. The
  // claude runtime's own hook entry reaches the file through the surgical merge, after
  // the plan has run and written the files the entry's argv names.

  // ADR-009: the install manifest lives in the `work` section of the single unified
  // project lock `.aof/aof.lock.json` (resolved via workspacePaths().lockPath). There
  // is no separate per-vertical work-lock file. The acd-install-manifest-contract
  // fitness function greps this source to prove init names ONLY the unified lock.
  function workLockPath(targetDir) {
    return workspacePaths(targetDir).lockPath;
  }

  // `aof work init [dir] [--dry-run] [--runtime <r>] [--force]`.
  //
  // Returns a structured result (for the CLI to print and for tests to assert):
  //   { targetDir, runtimes, dryRun, guarded, actions, notInstallable, manifestPath,
  //     manifestWritten, summary }
  // On the guarded refusal (manifest exists and not --force) returns `guarded: true`
  // having written NOTHING — the CLI maps that to a non-zero exit.
  async function initWork(options = {}) {
    const targetDir = path.resolve(options.targetDir ?? process.cwd());
    const runtimes = normalizeRuntimes(options.runtimes);
    const dryRun = Boolean(options.dryRun);
    const force = Boolean(options.force);
    const withHeadroom = Boolean(options.withHeadroom);

    const lockPath = workLockPath(targetDir);

    // Guard (ADR-003 / task 03 → ADR-009): init is a first-install. Key off the
    // PRESENCE of the `work` SECTION of the unified lock (the lock may already exist
    // for the asset/`planning` verticals). If the section is present and --force was
    // not given, refuse and write nothing.
    const existing = await readLock(lockPath);
    if (existing && existing.work && !force) {
      return {
        targetDir,
        runtimes,
        dryRun,
        guarded: true,
        manifestPath: lockPath,
        manifestWritten: false,
        actions: [],
        notInstallable: [],
        message: "An ACD install already exists in .aof/aof.lock.json. Run `aof work update` to deliver bundle changes, or `aof work init --force` to re-render from scratch."
      };
    }

    // 192/ADR-003 — the project's own config file decides which practices the render holds:
    // read once, the bundle loaded composed for it, the same read handed to the synthesis.
    const project = await readConfig(targetDir);
    const bundle = loadBundle({ config: project.config });

    // The IDENTICAL synthesis update uses (shared helper, ADR-003): partition the
    // bundle by the capability matrix and build the desired-output set. init and
    // update share this ONE implementation so their desired sets cannot drift.
    const { desiredOutputs, notInstallable } = await synthesizeBundleConfig(bundle, { runtimes, targetDir, project });
    // 192/ADR-006 §1 — the practices this render holds, from the same read of the config.
    const states = practiceStates(bundle.practices ?? [], project.config);

    // Claude retains first-install/force semantics. Codex force uses its recorded
    // ownership so re-init cannot adopt an unowned file or erase operator edits.
    const previousLock = codexOwnershipBaseline(existing?.work);
    const actions = await planApplyActions(desiredOutputs, previousLock, { force, targetDir });

    if (dryRun) {
      return {
        targetDir,
        runtimes,
        dryRun,
        guarded: false,
        actions,
        notInstallable,
        desiredOutputs,
        manifestPath: lockPath,
        manifestWritten: false,
        summary: summarizeActions(actions)
      };
    }

    await executeApplyActions(actions);

    const { config } = await readConfig(targetDir);
    const claudeSettings = await applyClaudeSettingsMerge(targetDir, config);

    // Establish the workspace `.gitignore` baseline (milestone 04 round-trip finding
    // F-02): a SELF-CONTAINED nested `.aof/.gitignore` that ignores the derived,
    // regenerable artifacts (the memory index) — never the repo-root `.gitignore`.
    // The tracked install (lock, config, rendered members) stays committed. Idempotent
    // and additive, so a re-render (--force) or a later memory reindex composes cleanly.
    await ensureAofGitignore(targetDir);
    // 147/03 (R4) — the WORK DIR's own git files, by the same idiom: `<work.dir>/.gitignore` keeps a
    // session's heartbeat queues out of every lane commit, `<work.dir>/.gitattributes` merges the
    // milestone `STATE.md` two lanes both appended to by union. Additive and idempotent, as above.
    await ensureWorkDirGitFiles(workDirFor(targetDir, config));

    // Install manifest (ADR-004 → ADR-009): a lock-v2 record from createLockManifest,
    // MINUS its own `version` (the unified lock carries ONE top-level version), plus
    // the `bundle: { version }`. This is the `work` SECTION of the unified lock.
    const baseManifest = createLockManifest({
      actions,
      desiredOutputs,
      previousLock,
      config: { packages: [] },
      runtimes
    });
    const manifest = {
      generatedAt: baseManifest.generatedAt,
      bundle: { version: bundleVersion() },
      runtimes,
      // Repo-relative paths with forward slashes (ADR-004). The renderer/lock layer
      // emits OS-separator paths; normalize here so the manifest is portable.
      files: baseManifest.files.map((entry) => ({ ...entry, path: String(entry.path).replaceAll("\\", "/") })),
      packages: baseManifest.packages,
      frameworks: baseManifest.frameworks,
      frameworkInstallAttempts: baseManifest.frameworkInstallAttempts,
      // 192/ADR-006 §1 — the practices this render was built with, for the work doctor to compare.
      practices: practiceRecord(bundle.practices ?? [], states)
    };
    // Read-merge-write (ADR-009): preserve the flat asset fields and the `planning`
    // section; replace ONLY the `work` key. --force re-renders and re-pins `work`
    // while still preserving the foreign sections. Never reconstruct from a fixed set.
    const currentLock = (await readLock(lockPath)) ?? {};
    await writeLock(lockPath, { ...currentLock, work: manifest });

    // `--with-headroom` (ADR-004): the SAME config write as use-headroom, applied to the
    // fresh config. `aof work init` does not otherwise write aof.config.json (it renders
    // the bundle + writes the lock), so this is genuinely NEW config-writing wiring. We
    // create-or-merge the config, set the enabled work.headroom block (deep-merge, never
    // clobbering work.* siblings) and record the selected runtimes so the resulting
    // config observably selects them. Without the flag the config is left untouched, so
    // work.headroom stays absent (the off default, ADR-001). The lock is never read/written here.
    if (withHeadroom) {
      await writeHeadroomConfig(targetDir, runtimes);
    }

    return {
      targetDir,
      runtimes,
      dryRun,
      guarded: false,
      actions,
      notInstallable,
      manifest,
      manifestPath: lockPath,
      manifestWritten: true,
      // The merge's outcome rides the result rather than a console.log, so a refusal
      // (`claude-settings-unparseable`) reaches --json as well as the human render.
      claudeSettings,
      summary: summarizeActions(actions)
    };
  }

  function normalizeRuntimes(runtimes) {
    const selected = Array.isArray(runtimes) && runtimes.length > 0 ? runtimes : ["claude"];
    const deduped = [...new Set(selected.map((runtime) => String(runtime).trim()).filter(Boolean))];
    for (const runtime of deduped) {
      if (!RUNTIMES[runtime]) {
        throw new Error(`Unsupported runtime "${runtime}". Expected one of: ${Object.keys(RUNTIMES).join(", ")}.`);
      }
    }
    return deduped;
  }

  // `--with-headroom`: create-or-merge aof.config.json with the enabled work.headroom
  // block, reusing work-headroom.mjs's IDENTICAL readConfig/writeConfig (so the config
  // path resolution and JSON style are the SAME as `use-headroom` — no second, divergent
  // idiom). It also records the selected runtimes so the resulting config observably
  // selects them (task 03's "the resulting config selects the runtimes" scenario).
  // NOTE: `config.runtimes` is written ONLY on this `--with-headroom` path — a plain
  // `aof work init` writes no aof.config.json at all (it renders the bundle + lock), so
  // the runtimes key is a deliberate `--with-headroom`-only side effect, not a general
  // init behaviour. The headroom `providers` default stays ["claude","codex"], independent
  // of --runtime (the resolver intersects at runtime). Never touches the lock.
  async function writeHeadroomConfig(targetDir, runtimes) {
    const { configPath, config } = await readConfig(targetDir);
    config.runtimes = runtimes;
    setHeadroomEnabled(config);
    await writeConfig(configPath, config);
  }

  // ---------------------------------------------------------- init-config ----
  //
  // chore 51 — THE CONFIG HALF OF INIT. `initWork` above renders the bundle and
  // writes the lock; until this verb the ONLY path that wrote `.aof/aof.config.json`
  // was `--with-headroom`, so a freshly initialised repo selected NO memory backend
  // and carried an EMPTY tag vocabulary for `aof work validate`'s closed-tag check to
  // check against. `initConfig` is that missing write.
  //
  // It is deliberately a SECOND CALL rather than a branch of `initWork`: the tag
  // vocabulary is INFERRED FROM THE REPO by the `/aof:init` agent step AFTER the
  // render (source layout, package manifest, existing dirs) — a deterministic CLI
  // cannot compute it, and `/aof:init` must call the CLI first and analyse the result.
  // The write itself is the SAME read-merge-write `--with-headroom` uses
  // (work-headroom.mjs's readConfig/writeConfig), never a second divergent config
  // writer.
  //
  // Merge rules — all three are "fill the hole, never clobber":
  //   · memory.backend  set to "graphify" (active by default) ONLY when no backend is
  //                     already selected; an existing choice is KEPT.
  //   · work.tags       written ONLY when the config carries no vocabulary yet; an
  //                     existing vocabulary is KEPT (this verb fills, never re-authors).
  //   · work.intake     "backlog" written ONLY into a config this call CREATES — the one
  //                     merge rule that is narrower than "fill the hole", and deliberately
  //                     so (127/ADR-005 §1): filling it into an EXISTING config's hole would
  //                     silently change where that project's next item lands, which is
  //                     exactly what "absent ⇒ stream" exists to prevent. An existing
  //                     "stream"/"backlog" is kept, an absent key stays absent.
  //   · everything else UNTOUCHED — we mutate `config.memory.backend` / `config.work.tags`
  //                     in place (the setHeadroomEnabled idiom), never reassigning
  //                     `config.work` or rewriting the document from a fixed field set,
  //                     so work.dir/work.agents/headroom/mesh and every foreign section
  //                     survive byte-intact.
  // A config that does not exist yet is CREATED carrying the schema's required root
  // keys (`name`/`resources`, plus `$schema`), so the document this verb writes is a
  // valid aof config on its own.
  // 180/02 Q1 (operator, 2026-10-30) — a NEW project selects `local`, which sends nothing to a hosted
  // model; graphify's work-stream extraction sends the stream on every ingest (180/ADR-005). The
  // default fills only a hole, so an existing selection is never changed.
  const DEFAULT_MEMORY_BACKEND = "local";

  // The three groups of the closed project vocabulary, in the order work.mjs unions
  // them (`tagConfig.layers ∪ refinements ∪ domains`) and the schema declares them.
  const TAG_GROUPS = Object.freeze(["layers", "refinements", "domains"]);

  function normalizeTagGroup(values) {
    if (!Array.isArray(values)) return [];
    return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
  }

  // 127/ADR-005 — the WRITE-side default, and the only place in `src/` that WRITES it
  // (FF-12704 holds that; the read side is mode-less). The key is named here, once, so the
  // face below can print it without spelling a second copy of it (the memory seam's idiom).
  const DEFAULT_WORK_INTAKE = "backlog";
  const WORK_INTAKE_CONFIG_PATH = "work.intake";

  // applyDefaultIntakeSelection(config, created) — `"backlog"` into a config this call
  // CREATED, and into nothing else. Returns whether it wrote, for the envelope.
  //
  // The `created` gate is the whole rule: `/aof:init` lands a FRESH repository on the
  // backlog with no prompt edit, while an existing project is unchanged without a
  // migration. `aof work init --with-headroom` creates the config before this verb runs,
  // so that path stays on stream — the same rule, not an exception.
  function applyDefaultIntakeSelection(config, created) {
    if (!created) return false;
    if (config.work == null || typeof config.work !== "object" || Array.isArray(config.work)) {
      config.work = {};
    }
    // Fill-don't-clobber stated even here, where `created` makes a value impossible: the
    // rule is the property, not the circumstance that currently implies it.
    if (config.work.intake != null) return false;
    config.work.intake = DEFAULT_WORK_INTAKE;
    return true;
  }

  // "Has a vocabulary" means at least one group is a NON-EMPTY array — an
  // `work.tags: {}` (or all-empty groups) is the hole this verb fills, exactly the
  // state a `--with-headroom`-written config is left in.
  function hasTagVocabulary(config) {
    const tags = config?.work?.tags;
    if (tags == null || typeof tags !== "object" || Array.isArray(tags)) return false;
    return TAG_GROUPS.some((group) => Array.isArray(tags[group]) && tags[group].length > 0);
  }

  // ------------------------------------------- the operator half (193/03) ----
  //
  // 193/ADR-006 §4 — `--operator-aware <on|off>` writes the project's switch, and `--operator-role` and
  // `--expertise <domain>=<level>[,…]` the operator profile; `--global` points the profile at the
  // machine-wide `~/.aof/aof.config.json` and refuses everything else, because the switch has no
  // machine-wide form (§1) and the rest of this verb is a project's. Unlike the tag vocabulary, which
  // fills a hole, a profile flag REPLACES what it names: the operator is correcting a statement about
  // themselves. Every value is validated before any file is written, by the profile's own validator,
  // so a refusal leaves both files as they were. The profile is written whether or not the switch is
  // on: it is the operator's statement, and a project may turn the switch on later.
  const BAD_PROFILE = "operator-profile-bad-value";
  const GLOBAL_PROFILE_ONLY = "init-config-global-profile-only";
  const PROJECT_AND_GLOBAL = "init-config-project-and-global";

  // "fraud=expert,tenancy-law=new" → { fraud: "expert", "tenancy-law": "new" }. A pair with no `=`, an
  // empty side or a domain named twice is refused here; the slug and the level are the validator's.
  function parseExpertise(text) {
    const expertise = {};
    const pairs = String(text).split(",").map((pair) => pair.trim()).filter(Boolean);
    if (pairs.length === 0) throw commandError("--expertise names no domain; give it as <domain>=<level>[,…], such as fraud=working.", BAD_PROFILE, 400);
    for (const pair of pairs) {
      const [domain, level, ...rest] = pair.split("=").map((side) => side.trim());
      if (level === undefined || rest.length > 0 || domain === "" || level === "") {
        throw commandError(`--expertise "${pair}" is not <domain>=<level>, such as fraud=working.`, BAD_PROFILE, 400);
      }
      if (Object.hasOwn(expertise, domain)) throw commandError(`--expertise names the domain "${domain}" twice; give each domain one level.`, BAD_PROFILE, 400);
      expertise[domain] = level;
    }
    return expertise;
  }

  // The operator's words the flags carry, validated, or null when no profile flag was given.
  function operatorWords(options) {
    const words = {};
    if (options.operatorRole !== undefined) words.role = options.operatorRole;
    if (options.expertise !== undefined) words.expertise = parseExpertise(options.expertise);
    if (Object.keys(words).length === 0) return null;
    const [problem] = operatorProfileDiagnostics({ work: { operator: words } });
    if (problem) throw commandError(problem.message, problem.code, 400);
    return words;
  }

  function switchRequest(value) {
    if (value === undefined || value === null) return null;
    if (value === "on" || value === "off") return value === "on";
    throw commandError(`--operator-aware takes "on" or "off", not "${value}".`, "init-config-bad-switch", 400);
  }

  // `--global`: the profile into the machine-wide config, read-merge-write, and nothing else.
  async function initGlobalProfile(targetDir, options, words) {
    if (options.operatorAware != null) {
      throw commandError("--global writes the operator profile only: work.examples.operatorAware is set per project, in the project's own config, because rendered commands are committed. Run `aof work init-config --operator-aware on` in the project.", GLOBAL_PROFILE_ONLY, 400);
    }
    if (TAG_GROUPS.some((group) => normalizeTagGroup(options.tags?.[group]).length > 0) || words == null) {
      throw commandError("--global writes the operator profile only: give it --operator-role and/or --expertise, and run the rest of init-config in the project.", GLOBAL_PROFILE_ONLY, 400);
    }
    const { configPath } = globalWorkspacePaths({ env: options.env });
    const created = !existsSync(configPath);
    const read = created ? {} : await readJson(configPath);
    const config = read != null && typeof read === "object" && !Array.isArray(read) ? read : {};
    const operator = correctOperatorProfile(config, words);
    await writeConfig(configPath, config);
    return { targetDir, global: true, configPath, created, profileWritten: "global", operator };
  }

  // 199 Q2 — this checkout's per-person local file, read for a profile write: the file sits in the
  // `.aof` directory `loadWorkspace` reads it from, a legacy root config's included. A local file aof
  // cannot read is refused rather than overwritten (it is someone's), and refused before any write.
  async function readLocalTarget(configPath) {
    const aofDir = aofDirForConfig(configPath);
    const localPath = path.join(aofDir, LOCAL_CONFIG_FILE);
    const created = !existsSync(localPath);
    let read = {};
    if (!created) {
      try {
        read = await readJson(localPath);
      } catch (error) {
        throw commandError(`${localPath} cannot be read, so the operator profile was not written: ${error instanceof Error ? error.message : String(error)}. Fix or remove the file, then run this again.`, "config-local-unreadable", 400);
      }
    }
    const config = read != null && typeof read === "object" && !Array.isArray(read) ? read : {};
    return { aofDir, localPath, created, config };
  }

  // The profile into the local file, read-merge-write, and the file kept out of git.
  async function writeLocalProfile(target, words) {
    const operator = correctOperatorProfile(target.config, words);
    await writeConfig(target.localPath, target.config);
    await ensureAofGitignore(path.dirname(target.aofDir));
    return { localConfigPath: target.localPath, localCreated: target.created, operator };
  }

  // `aof work init-config [dir] [--layers …] [--refinements …] [--domains …]
  //   [--operator-aware on|off] [--operator-role <text>] [--expertise <domain>=<level>,…] [--project|--global]`.
  // opts: { targetDir, tags: { layers, refinements, domains }, operatorAware, operatorRole, expertise, project, global, env }
  // (`env` names the global home for `--global`, as the config-inspect bindings take it; default process.env).
  //
  // 199 Q2 — WHERE THE PROFILE GOES. The operator profile is one person's, so by default it is written
  // to the uncommitted `.aof/aof.config.local.json`, which lies over the project's file; `--project`
  // writes it to the committed `.aof/aof.config.json` instead, and `--global` to the machine-wide file.
  // Everything else this verb writes is the project's and goes to the project's file as before. A
  // request that is the profile and nothing else writes the local file only, so the committed file is
  // left byte-for-byte as it was.
  async function initConfig(options = {}) {
    const targetDir = path.resolve(options.targetDir ?? process.cwd());
    // Every refusal comes before any write.
    if (options.project && options.global) {
      throw commandError("--project and --global name different files: --project writes the operator profile to this project's committed .aof/aof.config.json, --global to the machine-wide ~/.aof/aof.config.json. Give one of them.", PROJECT_AND_GLOBAL, 400);
    }
    const words = operatorWords(options);
    if (options.global) return initGlobalProfile(targetDir, options, words);
    const operatorAware = switchRequest(options.operatorAware);
    const { configPath, config } = await readConfig(targetDir);
    const created = !existsSync(configPath);
    const localTarget = words != null && !options.project ? await readLocalTarget(configPath) : null;
    const projectPartAsked = operatorAware != null || TAG_GROUPS.some((group) => normalizeTagGroup(options.tags?.[group]).length > 0);
    if (localTarget != null && !projectPartAsked) {
      const local = await writeLocalProfile(localTarget, words);
      return { targetDir, configPath, created: false, projectWritten: false, profileWritten: "local", ...local };
    }
    if (operatorAware === true && !examplesEnabledFromConfig(config)) {
      throw commandError("operator-aware discovery means nothing without discovery: work.examples.enabled is not true in this project. Turn discovery on first (work.examples.enabled: true), then the switch.", "examples-operator-aware-without-discovery", 400);
    }

    if (created) {
      // The schema's required root keys (`name` + `resources`) so a config born here
      // validates; `$schema` matches workspace-writer.mjs's document.
      config.$schema = config.$schema ?? "https://aof.local/schemas/aof.schema.json";
      config.name = config.name ?? path.basename(targetDir);
      config.resources = config.resources ?? [];
    }

    // The backend selection is active by default and never overrides an existing one —
    // and the scaffold no longer spells the config key to say so. Both halves of the
    // selection (the read and this default-write) live in the memory seam, so a rename
    // lands in one module rather than in six places, five of them silent (ADR-002).
    const { backend: memoryBackend, written: backendWritten } = applyDefaultBackendSelection(config, DEFAULT_MEMORY_BACKEND);

    // work.intake — the write-side default, into a config this call created and no other.
    const intakeWritten = applyDefaultIntakeSelection(config, created);

    // work.tags — the agent-inferred vocabulary, written only into the hole.
    const requested = Object.fromEntries(TAG_GROUPS.map((group) => [group, normalizeTagGroup(options.tags?.[group])]));
    const requestedAny = TAG_GROUPS.some((group) => requested[group].length > 0);
    const vocabularyPresent = hasTagVocabulary(config);
    let tagsWritten = false;
    if (requestedAny && !vocabularyPresent) {
      if (config.work == null || typeof config.work !== "object" || Array.isArray(config.work)) {
        config.work = {};
      }
      const existing = (config.work.tags != null && typeof config.work.tags === "object" && !Array.isArray(config.work.tags))
        ? config.work.tags
        : {};
      const tags = { ...existing };
      for (const group of TAG_GROUPS) {
        if (requested[group].length > 0) tags[group] = requested[group];
      }
      config.work.tags = tags;
      tagsWritten = true;
    }

    // work.examples.operatorAware — the project's switch (193/ADR-006 §1). Turning it off where there
    // is no `work.examples` block writes nothing: the switch is already off.
    let operatorAwareWritten = false;
    if (operatorAware != null) {
      const examples = config.work?.examples;
      if (examples != null && typeof examples === "object" && !Array.isArray(examples)) {
        examples.operatorAware = operatorAware;
        operatorAwareWritten = true;
      }
    }

    // work.operator — the operator's own words, replacing what they name, in the project's file only
    // when asked with `--project`; otherwise in the local file, after the project's write.
    const operator = words == null || localTarget != null ? null : correctOperatorProfile(config, words);

    await writeConfig(configPath, config);
    const local = localTarget != null ? await writeLocalProfile(localTarget, words) : null;

    return {
      targetDir,
      configPath,
      config,
      created,
      projectWritten: true,
      ...(local ?? {}),
      // The switch as its one resolver reads it, after the write.
      operatorAware: operatorAwareFromConfig(config),
      operatorAwareWritten,
      profileWritten: local != null ? "local" : operator == null ? null : "project",
      operator: local?.operator ?? operator,
      memoryBackend,
      backendWritten,
      // The write-side default, in the same `<value> + <written>` shape the backend and the
      // vocabulary report: `null` says the key is absent, which READS as "stream".
      intake: config.work?.intake ?? null,
      intakeWritten,
      tagsWritten,
      // Distinguishes "nothing was offered" from "a vocabulary was already there" so
      // the face can say which, and `/aof:init` never reports a fill it did not do.
      tagsKept: requestedAny && vocabularyPresent,
      tags: config.work?.tags ?? null
    };
  }

  return { workLockPath, initWork, DEFAULT_MEMORY_BACKEND, TAG_GROUPS, WORK_INTAKE_CONFIG_PATH, initConfig };
}
