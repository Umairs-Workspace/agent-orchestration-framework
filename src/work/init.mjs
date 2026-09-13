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
import path from "node:path";
import { existsSync } from "node:fs";
import { readLock, writeLock } from "../lock.mjs";
import { createLockManifest, executeApplyActions, planApplyActions } from "../render-plan.mjs";
import { RUNTIMES } from "../model.mjs";
import { loadBundle } from "./bundle.mjs";
import { bundleVersion, summarizeActions, synthesizeBundleConfig } from "./bundle-synthesis.mjs";
import { workspacePaths } from "../workspace.mjs";
import { ensureAofGitignore } from "../aof-gitignore.mjs";
import { setHeadroomEnabled, readConfig, writeConfig } from "./headroom.mjs";
// ADR-002 — the memory seam owns BOTH halves of the backend selection: the read
// (selectBackendName) and this default-write. The scaffold names the key nowhere.
import { applyDefaultBackendSelection } from "./memory.mjs";
// m43 / ADR-002: `.claude/settings.json` is CO-AUTHORED and is therefore NOT in the
// render plan above — `init` treats every unlocked file as fresh, which is exactly how
// a whole-file render would delete the operator's hooks/permissions/sandbox. The
// claude runtime's own hook entry reaches the file through the surgical merge, after
// the plan has run and written the files the entry's argv names.
import { applyClaudeSettingsMerge } from "../claude-settings.mjs";

// ADR-009: the install manifest lives in the `work` section of the single unified
// project lock `.aof/aof.lock.json` (resolved via workspacePaths().lockPath). There
// is no separate per-vertical work-lock file. The acd-install-manifest-contract
// fitness function greps this source to prove init names ONLY the unified lock.
export function workLockPath(targetDir) {
  return workspacePaths(targetDir).lockPath;
}

// `aof work init [dir] [--dry-run] [--runtime <r>] [--force]`.
//
// Returns a structured result (for the CLI to print and for tests to assert):
//   { targetDir, runtimes, dryRun, guarded, actions, notInstallable, manifestPath,
//     manifestWritten, summary }
// On the guarded refusal (manifest exists and not --force) returns `guarded: true`
// having written NOTHING — the CLI maps that to a non-zero exit.
export async function initWork(options = {}) {
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

  const bundle = loadBundle();

  // The IDENTICAL synthesis update uses (shared helper, ADR-003): partition the
  // bundle by the capability matrix and build the desired-output set. init and
  // update share this ONE implementation so their desired sets cannot drift.
  const { desiredOutputs, notInstallable } = await synthesizeBundleConfig(bundle, { runtimes, targetDir });

  // First-install semantics: previousLock is ALWAYS null (ADR-003). --force does
  // not pass a prior lock; it re-renders from scratch. The classification,
  // create/update/skip/drift, is inherited from planApplyActions unchanged.
  const actions = await planApplyActions(desiredOutputs, null, { force, targetDir });

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

  const claudeSettings = await applyClaudeSettingsMerge(targetDir, (await readConfig(targetDir)).config);

  // Establish the workspace `.gitignore` baseline (milestone 04 round-trip finding
  // F-02): a SELF-CONTAINED nested `.aof/.gitignore` that ignores the derived,
  // regenerable artifacts (the memory index) — never the repo-root `.gitignore`.
  // The tracked install (lock, config, rendered members) stays committed. Idempotent
  // and additive, so a re-render (--force) or a later memory reindex composes cleanly.
  await ensureAofGitignore(targetDir);

  // Install manifest (ADR-004 → ADR-009): a lock-v2 record from createLockManifest,
  // MINUS its own `version` (the unified lock carries ONE top-level version), plus
  // the `bundle: { version }`. This is the `work` SECTION of the unified lock.
  const baseManifest = createLockManifest({
    actions,
    desiredOutputs,
    previousLock: null,
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
    frameworkInstallAttempts: baseManifest.frameworkInstallAttempts
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
export const DEFAULT_MEMORY_BACKEND = "graphify";

// The three groups of the closed project vocabulary, in the order work.mjs unions
// them (`tagConfig.layers ∪ refinements ∪ domains`) and the schema declares them.
export const TAG_GROUPS = Object.freeze(["layers", "refinements", "domains"]);

function normalizeTagGroup(values) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
}

// 127/ADR-005 — the WRITE-side default, and the only place in `src/` that WRITES it
// (FF-12704 holds that; the read side is mode-less). The key is named here, once, so the
// face below can print it without spelling a second copy of it (the memory seam's idiom).
const DEFAULT_WORK_INTAKE = "backlog";
export const WORK_INTAKE_CONFIG_PATH = "work.intake";

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

// `aof work init-config [dir] [--layers …] [--refinements …] [--domains …]`.
// opts: { targetDir, tags: { layers, refinements, domains } }.
export async function initConfig(options = {}) {
  const targetDir = path.resolve(options.targetDir ?? process.cwd());
  const { configPath, config } = await readConfig(targetDir);
  const created = !existsSync(configPath);

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

  await writeConfig(configPath, config);

  return {
    targetDir,
    configPath,
    config,
    created,
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
