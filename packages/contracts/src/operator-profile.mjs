// packages/contracts/src/operator-profile.mjs — the ONE home of the operator profile (193/ADR-003).
//
// `work.operator = { role, expertise }` says who the operator is in a project and how well they know
// each of its domains, so discovery can pitch a question at what they actually know. The same block
// may sit in the machine-wide `~/.aof/aof.config.json`, and a project overrides it key by key: its
// `role` wins when it has one, and `expertise` merges per domain, the project's entry winning.
//
// Everything that reads the block lives here: the three levels, the validator's diagnostics, the
// merge, the resolver, the level lookup, and the correction `init-config` writes. A pure leaf, like `agent-mode.mjs`: it imports nothing,
// reads no file and never throws. The safe reading of anything it does not understand is the one
// that explains more: a level it does not know resolves `new`, a role that is not a string resolves
// absent, and a domain nobody listed is `new` (§2, §3). FF-19203
// (`test/arch/examples/acd-operator-profile-one-resolver.test.mjs`) holds every other runtime module
// to asking this one.

export const OPERATOR_LEVELS = Object.freeze(["expert", "working", "new"]);
// What a domain the profile does not list reads as, and what a level it does not know resolves to.
export const UNLISTED_LEVEL = "new";
export const ROLE_MAX_LENGTH = 500;

const KEYS = Object.freeze(["role", "expertise"]);
const DOMAIN_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PATH = "work.operator";

const isPlainObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);

// The raw block a config holds, or undefined. The one read of `work.operator` in runtime source.
function blockOf(config) {
  return isPlainObject(config) && isPlainObject(config.work) ? config.work.operator : undefined;
}

const usableRole = (role) => typeof role === "string" && role.trim() !== "";

/**
 * What the validator reports for a config's block, as `{ path, message, code }` entries: the
 * project file's and the global file's alike (§2). `operator-profile-bad-value` for a wrong type,
 * an empty or over-long role, a domain that is not a lowercase kebab slug or a level outside the
 * three; `operator-profile-unknown-key` for a key the block does not take. No block is no entry.
 */
export function operatorProfileDiagnostics(config) {
  const block = blockOf(config);
  if (block === undefined) return [];
  const bad = (at, message) => ({ path: at, message, code: "operator-profile-bad-value" });
  if (!isPlainObject(block)) return [bad(PATH, `${PATH} must be an object holding "role" and "expertise".`)];
  const entries = [];
  for (const key of Object.keys(block)) {
    if (!KEYS.includes(key)) {
      entries.push({ path: `${PATH}.${key}`, message: `${PATH}.${key} is not a known key; ${PATH} takes only "role" and "expertise".`, code: "operator-profile-unknown-key" });
    }
  }
  if (block.role !== undefined && !(usableRole(block.role) && block.role.length <= ROLE_MAX_LENGTH)) {
    entries.push(bad(`${PATH}.role`, `${PATH}.role must be a non-empty string of at most ${ROLE_MAX_LENGTH} characters: a sentence or two on who the operator is in this project.`));
  }
  if (block.expertise !== undefined) {
    if (!isPlainObject(block.expertise)) {
      entries.push(bad(`${PATH}.expertise`, `${PATH}.expertise must be an object mapping a domain to a level.`));
    } else {
      for (const [domain, level] of Object.entries(block.expertise)) {
        if (!DOMAIN_SLUG.test(domain)) {
          entries.push(bad(`${PATH}.expertise`, `${PATH}.expertise names the domain "${domain}"; a domain is a lowercase kebab slug, such as "tenancy-law".`));
        } else if (!OPERATOR_LEVELS.includes(level)) {
          entries.push(bad(`${PATH}.expertise.${domain}`, `${PATH}.expertise.${domain} must be one of ${OPERATOR_LEVELS.map((name) => `"${name}"`).join(", ")}.`));
        }
      }
    }
  }
  return entries;
}

/**
 * Resolve one raw block: `{ declared, role, expertise }`, frozen. `role` is the string as written
 * or null; `expertise` maps each listed domain to its level, an unknown level read as `new`.
 * `declared` means the profile says something: a role, or at least one domain (§7).
 */
export function resolveOperatorProfile(block) {
  const role = isPlainObject(block) && usableRole(block.role) ? block.role : null;
  const expertise = {};
  if (isPlainObject(block) && isPlainObject(block.expertise)) {
    for (const [domain, level] of Object.entries(block.expertise)) {
      expertise[domain] = OPERATOR_LEVELS.includes(level) ? level : UNLISTED_LEVEL;
    }
  }
  return Object.freeze({ declared: role != null || Object.keys(expertise).length > 0, role, expertise: Object.freeze(expertise) });
}

// The profile a config holds, resolved: the reader every code path asks of a loaded workspace's
// config, which already carries the global block laid under the project's.
export function operatorProfileFromConfig(config) {
  return resolveOperatorProfile(blockOf(config));
}

// A domain's level in a resolved profile, by its exact slug; anything it does not list is `new`.
export function operatorLevel(profile, domain) {
  const expertise = profile?.expertise;
  return isPlainObject(expertise) && typeof domain === "string" && Object.hasOwn(expertise, domain)
    ? expertise[domain]
    : UNLISTED_LEVEL;
}

// THE MERGE (§4): the global block laid under the project's. The project's role wins when it has
// a usable one; expertise merges per domain, the project's entry winning. Answers a raw block, or
// undefined when neither config holds one.
export function mergeOperatorBlocks(globalBlock, projectBlock) {
  if (!isPlainObject(globalBlock)) return projectBlock;
  const project = isPlainObject(projectBlock) ? projectBlock : {};
  const role = usableRole(project.role) ? project.role : globalBlock.role;
  const expertise = {
    ...(isPlainObject(globalBlock.expertise) ? globalBlock.expertise : {}),
    ...(isPlainObject(project.expertise) ? project.expertise : {}),
  };
  return { ...(role === undefined ? {} : { role }), expertise };
}

// THE CORRECTION (193/ADR-006 §4), the write half of the merge, for `aof work init-config`: the
// operator's own words laid over a config's block, in place (the `setHeadroomEnabled` idiom). A
// flag replaces what it names — a given role replaces the role, and each named domain replaces that
// domain's level — because the operator is correcting a statement about themselves; everything else
// in the block and the config stays. A block or `work` that is not an object is replaced by one.
// The caller validates the words first, through `operatorProfileDiagnostics`. Answers the block.
export function correctOperatorProfile(config, { role, expertise } = {}) {
  if (!isPlainObject(config.work)) config.work = {};
  const current = isPlainObject(blockOf(config)) ? blockOf(config) : {};
  const block = { ...current };
  if (role !== undefined) block.role = role;
  if (isPlainObject(expertise) && Object.keys(expertise).length > 0) {
    block.expertise = { ...(isPlainObject(current.expertise) ? current.expertise : {}), ...expertise };
  }
  config.work.operator = block;
  return block;
}

// The project config with the global block laid under its own (§5), for `loadWorkspace`. In memory
// only: the caller writes nothing back. A config with no global block, or whose `work` is not an
// object, is answered unchanged.
export function layerOperatorProfile(globalConfig, projectConfig) {
  const globalBlock = blockOf(globalConfig);
  if (!isPlainObject(globalBlock)) return projectConfig;
  const work = projectConfig?.work;
  if (work !== undefined && !isPlainObject(work)) return projectConfig;
  return { ...projectConfig, work: { ...(work ?? {}), operator: mergeOperatorBlocks(globalBlock, blockOf(projectConfig)) } };
}

// 199 — the same merge the other way up: a config with a nearer file's block laid OVER its own, for
// the per-person local file, which lies over the project's (`local-config.mjs`). In memory only. An
// over-config with no block, or a config whose `work` is not an object, answers the config unchanged.
export function overlayOperatorProfile(config, overConfig) {
  const overBlock = blockOf(overConfig);
  if (!isPlainObject(overBlock)) return config;
  const work = config?.work;
  if (work !== undefined && !isPlainObject(work)) return config;
  return { ...config, work: { ...(work ?? {}), operator: mergeOperatorBlocks(blockOf(config), overBlock) } };
}

/**
 * The resolved profile and where each value came from, for `aof project show` (§6):
 * `{ declared, role, roleSource, expertise: [{ domain, level, source }] }`, each source `local`
 * (199's per-person file, nearest), `project` or `global`, the domains in name order. Its values are
 * exactly what the merge resolves to.
 */
export function describeOperatorProfile(globalConfig, projectConfig, localConfig = {}) {
  const layers = [
    ["local", operatorProfileFromConfig(localConfig)],
    ["project", operatorProfileFromConfig(projectConfig)],
    ["global", operatorProfileFromConfig(globalConfig)],
  ];
  const roleLayer = layers.find(([, profile]) => profile.role != null);
  const domains = [...new Set(layers.flatMap(([, profile]) => Object.keys(profile.expertise)))].sort();
  const expertise = domains.map((domain) => {
    const [source, profile] = layers.find(([, candidate]) => Object.hasOwn(candidate.expertise, domain));
    return { domain, level: profile.expertise[domain], source };
  });
  return {
    declared: roleLayer != null || expertise.length > 0,
    role: roleLayer?.[1].role ?? null,
    roleSource: roleLayer?.[0] ?? null,
    expertise,
  };
}
