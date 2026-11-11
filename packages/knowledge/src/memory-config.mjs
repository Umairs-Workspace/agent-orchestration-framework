import { commandError } from "@aof/contracts/error";
import { KNOWLEDGE_CORPORA } from "./engine.mjs";

// THE MEMORY NODE, READ IN ONE PLACE (180/ADR-001). Every memory setting but the backend selection
// lives under `memory`: `corpora`, the code corpus's `graph` sharing and the per-engine `backends`.
// This module is the only one that reads those keys, in the new spelling or the old one
// (`memory.sources`, `memory.graphify` and the root `graph`), and it answers the node in the new
// shape. The three resolvers (`resolveMemorySources`, `resolveGraphifyExtraction`,
// `readShareSettings`) keep their names, codes and answers, and read through `readMemoryConfig`.
//
// `memory.backend` is NOT read here. `selectBackendName` stays its single reader (05/ADR-002).
//
// Pure configuration: it imports the error contract and the port's corpus vocabulary and nothing
// else, so `graph-share.mjs` may import it without reaching an index, a backend or a transport
// (FF-18001, amending 174/FF-17401 leg (b)).

// The four corpora the knowledge-engine port knows, in the order the node reports them.
export const ALWAYS_SERVED_CORPORA = Object.freeze(["work", "imports", "code"]);
export const OPTIONAL_CORPUS = "operator";
const CORPORA_ORDER = Object.freeze([...ALWAYS_SERVED_CORPORA, OPTIONAL_CORPUS]);
// The legacy `memory.sources` name that is the `operator` corpus (159/ADR-001, 180/ADR-002).
const OPERATOR_SOURCE = "claude-auto-memory";
const LEGACY_SOURCES = Object.freeze([OPERATOR_SOURCE]);

// The extractors graphify can be asked to run, as the setting admits them. `graphify-backends.mjs`
// classifies each one (network or not) over this list, so the names have this one home.
export const GRAPHIFY_EXTRACTORS = Object.freeze(["claude", "claude-cli", "gemini", "openai", "kimi", "deepseek", "ollama"]);
export const LOCAL_MEMORY_ALTERNATIVE = 'Select the existing "local" memory backend for a local record index without Graphify extraction; "none" disables memory.';
// The engine blocks `backends` admits. Each name is a registered backend (FF-18002).
const ENGINE_SETTINGS = Object.freeze({ graphify: Object.freeze(["extractionBackend"]) });

export const SHARE_MODES = Object.freeze(["git-refs", "off"]);
export const DEFAULT_SHARE_REMOTE = "origin";

// The selection's path, as prose for a message. Spelled as segments for the reason memory.mjs's
// MEMORY_BACKEND_CONFIG_PATH gives: this is a label, never a read.
const BACKEND_PATH = ["memory", "backend"].join(".");

// LEGACY_MEMORY_KEYS — every old spelling and its new home, as dotted paths. The reader's warnings,
// its conflict refusal and the rewrite all walk this one table; no caller restates it.
export const LEGACY_MEMORY_KEYS = Object.freeze([
  Object.freeze({ from: "memory.sources", to: "memory.corpora" }),
  Object.freeze({ from: "memory.graphify", to: "memory.backends.graphify" }),
  Object.freeze({ from: "graph", to: "memory.graph" }),
]);

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const segments = (dotted) => dotted.split(".");

// The value at a dotted path, and whether it is present at all.
function at(root, dotted) {
  let value = root;
  for (const key of segments(dotted)) {
    if (!isObject(value) || !Object.hasOwn(value, key)) return { present: false, value: undefined };
    value = value[key];
  }
  return { present: true, value };
}

function refusal(message, code, path) {
  const error = commandError(message, code, 400);
  error.path = path;
  return error;
}

const quoted = (names) => names.map((name) => `"${name}"`);
const listed = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

// ------------------------------------------------------------------ corpora ----

function readCorpora(declared) {
  const path = "memory.corpora";
  const refuse = (message, where = path) => { throw refusal(message, "invalid-memory-corpora", where); };
  const known = `aof knows ${listed(quoted(KNOWLEDGE_CORPORA))}`;
  if (!Array.isArray(declared)) refuse(`memory.corpora must be an array of corpus names — ${known}.`);
  declared.forEach((entry, index) => {
    if (typeof entry !== "string" || !KNOWLEDGE_CORPORA.includes(entry)) refuse(`Unknown memory corpus ${JSON.stringify(entry)} — ${known}.`, `${path}.${index}`);
  });
  if (new Set(declared).size !== declared.length) refuse("memory.corpora must not repeat a corpus.");
  const missing = ALWAYS_SERVED_CORPORA.filter((corpus) => !declared.includes(corpus));
  if (missing.length > 0) {
    refuse(`memory.corpora leaves out ${listed(quoted(missing))}, but ${listed(quoted(ALWAYS_SERVED_CORPORA))} are always served, and only "${OPTIONAL_CORPUS}" may be left out. To turn memory off, set ${BACKEND_PATH} to "none".`);
  }
  return CORPORA_ORDER.filter((corpus) => declared.includes(corpus));
}

// The legacy `memory.sources` list, validated with the messages and code it has always had.
function readLegacySources(declared) {
  const path = "memory.sources";
  const refuse = (message, where = path) => { throw refusal(message, "invalid-memory-sources", where); };
  if (!Array.isArray(declared)) refuse(`memory.sources must be an array of source names. Supported: ${LEGACY_SOURCES.join(", ")}.`);
  declared.forEach((entry, index) => {
    if (typeof entry !== "string" || !LEGACY_SOURCES.includes(entry)) refuse(`Unsupported memory source ${JSON.stringify(entry)}. Supported: ${LEGACY_SOURCES.join(", ")}.`, `${path}.${index}`);
  });
  if (new Set(declared).size !== declared.length) refuse("memory.sources must not repeat a source.");
  return declared.includes(OPERATOR_SOURCE) ? [...ALWAYS_SERVED_CORPORA, OPTIONAL_CORPUS] : [...ALWAYS_SERVED_CORPORA];
}

// -------------------------------------------------------------------- graph ----

// The code corpus's share settings at `path` (`memory.graph`, or the legacy root `graph`): the
// values, defaults and refusals `readShareSettings` has always had, with each message and `path`
// naming the key the author wrote.
function readShare(declared, path) {
  const refuse = (message, where) => { throw refusal(message, "graph-share-unknown", where); };
  const graph = declared ?? {};
  if (!isObject(graph)) refuse(`${path} is ${JSON.stringify(graph)} — it is an object, such as { "share": "git-refs" }.`, path);
  const share = graph.share ?? "off";
  if (!SHARE_MODES.includes(share)) refuse(`${path}.share is ${JSON.stringify(share)} — aof knows ${listed(quoted(SHARE_MODES))}.`, `${path}.share`);
  const remote = graph.remote ?? DEFAULT_SHARE_REMOTE;
  if (typeof remote !== "string" || remote === "" || remote.startsWith("-")) {
    refuse(`${path}.remote is ${JSON.stringify(remote)} — name a git remote, such as "origin".`, `${path}.remote`);
  }
  return { share, remote };
}

// ----------------------------------------------------------------- backends ----

// One engine's block at `path`. An inactive block is validated exactly as an active one (154/09).
function readGraphifyBlock(block, path) {
  const refuse = (message, where) => { throw refusal(message, "invalid-memory-extraction-backend", where); };
  if (!isObject(block)) refuse(`${path} must be an object.`, path);
  for (const key of Object.keys(block)) if (!ENGINE_SETTINGS.graphify.includes(key)) refuse(`Unknown ${path} setting "${key}".`, `${path}.${key}`);
  if (Object.hasOwn(block, "extractionBackend") && !GRAPHIFY_EXTRACTORS.includes(block.extractionBackend)) {
    refuse(`Unsupported Graphify extraction backend ${JSON.stringify(block.extractionBackend)}. Supported: ${GRAPHIFY_EXTRACTORS.join(", ")}. ${LOCAL_MEMORY_ALTERNATIVE}`, `${path}.extractionBackend`);
  }
  return Object.hasOwn(block, "extractionBackend") ? { extractionBackend: block.extractionBackend } : {};
}

function readBackends(declared) {
  const path = "memory.backends";
  if (!isObject(declared)) throw refusal(`${path} must be an object of engine settings, such as { "graphify": { "extractionBackend": "ollama" } }.`, "invalid-memory-backends", path);
  for (const name of Object.keys(declared)) {
    if (!Object.hasOwn(ENGINE_SETTINGS, name)) {
      throw refusal(`Unknown engine "${name}" under ${path} — aof has settings for ${listed(quoted(Object.keys(ENGINE_SETTINGS)))}.`, "invalid-memory-backends", `${path}.${name}`);
    }
  }
}

// ------------------------------------------------------------------- legacy ----

// Every old spelling the config carries, one entry per setting it holds: a block reports each of
// its keys at its new path, and an empty block reports itself.
function legacyEntries(root) {
  const entries = [];
  for (const { from, to } of LEGACY_MEMORY_KEYS) {
    const { present, value } = at(root, from);
    if (!present) continue;
    const keys = isObject(value) && from !== "memory.sources" ? Object.keys(value) : [];
    if (keys.length === 0) entries.push({ path: from, replacement: to });
    for (const key of keys) entries.push({ path: `${from}.${key}`, replacement: `${to}.${key}` });
  }
  return entries;
}

// The one sentence both faces print for a legacy entry: config inspection's `memory-config-legacy`
// warning and `aof memory status`'s line (180/ADR-001, ADR-005).
export function legacyMessage({ path, replacement }) {
  return `${path} → ${replacement} — \`aof work update\` rewrites it`;
}

// Each pair spelled both ways. Two homes is the defect, so agreeing values are still a conflict.
export function memoryConfigConflicts(config) {
  return LEGACY_MEMORY_KEYS
    .filter(({ from, to }) => at(config, from).present && at(config, to).present)
    .map(({ from, to }) => ({ path: from, replacement: to }));
}

// --------------------------------------------------------------- the reader ----

// readMemoryConfig(config) — the ROOT config in, the memory node out in the new shape:
//   { corpora, corporaSource, graph: { share, remote }, backends: { graphify }, paths, legacy }
// `paths` names the key each setting was read from, as the author spelled it, and `legacy` lists
// `{ path, replacement }` for every old spelling. A pair spelled twice is refused with
// `memory-config-conflict`; an invalid value is refused at the path the author wrote.
export function readMemoryConfig(config) {
  const root = isObject(config) ? config : {};
  const conflicts = memoryConfigConflicts(root);
  if (conflicts.length > 0) {
    const named = conflicts.map(({ path, replacement }) => `"${path}" and "${replacement}"`).join("; ");
    const error = refusal(`Each memory setting has one home, but this config spells it twice: ${named}. Remove one of each pair — the new spelling is the second; \`aof work update\` leaves a pair spelled twice for you to choose.`, "memory-config-conflict", conflicts[0].replacement);
    error.conflicts = conflicts;
    throw error;
  }

  const corporaNew = at(root, "memory.corpora");
  const sourcesOld = at(root, "memory.sources");
  let corpora = [...ALWAYS_SERVED_CORPORA];
  let corporaSource = "default";
  let corporaPath = "memory.corpora";
  if (corporaNew.present) {
    corpora = readCorpora(corporaNew.value);
    corporaSource = "project setting";
  } else if (sourcesOld.present) {
    corpora = readLegacySources(sourcesOld.value);
    corporaPath = "memory.sources";
    // An empty legacy list was always the default, so it reports as one (180/ADR-002).
    if (sourcesOld.value.length > 0) corporaSource = "project setting";
  }

  const graphNew = at(root, "memory.graph");
  const graphPath = graphNew.present || !at(root, "graph").present ? "memory.graph" : "graph";
  const graph = readShare(at(root, graphPath).value, graphPath);

  const backendsNew = at(root, "memory.backends");
  if (backendsNew.present) readBackends(backendsNew.value);
  const graphifyOld = at(root, "memory.graphify");
  const graphifyPath = graphifyOld.present ? "memory.graphify" : "memory.backends.graphify";
  const block = at(root, graphifyPath);
  const graphify = block.present ? readGraphifyBlock(block.value, graphifyPath) : {};

  return {
    corpora,
    corporaSource,
    graph,
    backends: { graphify },
    paths: { corpora: corporaPath, graph: graphPath, extraction: `${graphifyPath}.extractionBackend` },
    legacy: legacyEntries(root),
  };
}

// replaceMemoryNode(config, node) → a NEW config whose `memory` is `node` and which carries no root
// `graph`, the key `memory.graph` replaces. Every other root key keeps its position; a config with
// no `memory` node gets one where the root `graph` was. The config editor's Memory save calls it
// (180/03), so the root key's spelling stays in this module.
export function replaceMemoryNode(config, node) {
  const root = isObject(config) ? config : {};
  const out = {};
  for (const [key, value] of Object.entries(root)) {
    if (key === "graph") {
      if (!Object.hasOwn(root, "memory")) out.memory = node;
      continue;
    }
    out[key] = key === "memory" ? node : value;
  }
  if (!Object.hasOwn(out, "memory")) out.memory = node;
  return out;
}

// -------------------------------------------------------------- the rewrite ----

// rewriteLegacyMemoryConfig(config) → { config, moves, conflicts } — the old shape rewritten into
// the new, as a NEW object (the input is never mutated). A pair spelled both ways is left exactly
// as written and named in `conflicts`; the other pairs still move (180/ADR-006). Inside `memory`
// the keys sit in the order backend, corpora, graph, backends, with any other key after them; a
// config with no `memory` node gets one where the root `graph` was. Every other root key keeps its
// position. Stories 02 (`aof work update`) and 03 (the config editor) are its callers.
const MEMORY_KEY_ORDER = Object.freeze(["backend", "corpora", "graph", "backends"]);

function validLegacySources(value) {
  try {
    readLegacySources(value);
    return true;
  } catch {
    return false;
  }
}

export function rewriteLegacyMemoryConfig(config) {
  const root = isObject(config) ? config : {};
  const conflicts = memoryConfigConflicts(root);
  const blocked = new Set(conflicts.map(({ path }) => path));
  // An invalid legacy source list is left where it is, for the reader to refuse at its own path:
  // rewriting it would discard what the author wrote. So is anything that would move INTO a
  // `memory` or `memory.backends` that is not an object, which the move would overwrite.
  const intoObject = (dotted) => !at(root, dotted).present || isObject(at(root, dotted).value);
  const movable = ({ from }) => intoObject("memory")
    && (from !== "memory.sources" || validLegacySources(at(root, from).value))
    && (from !== "memory.graphify" || intoObject("memory.backends"));
  const moves = LEGACY_MEMORY_KEYS
    .filter((row) => at(root, row.from).present && !blocked.has(row.from) && movable(row))
    .map(({ from, to }) => ({ from, to }));
  if (moves.length === 0) return { config: structuredClone(root), moves, conflicts };

  const memory = isObject(root.memory) ? structuredClone(root.memory) : {};
  for (const { from } of moves) {
    if (from === "memory.sources") {
      const sources = memory.sources;
      delete memory.sources;
      // `["claude-auto-memory"]` is the operator corpus; `[]` was already the default, so no
      // `corpora` is written for it (180/ADR-002).
      if (Array.isArray(sources) && sources.includes(OPERATOR_SOURCE)) memory.corpora = [...ALWAYS_SERVED_CORPORA, OPTIONAL_CORPUS];
    } else if (from === "memory.graphify") {
      memory.backends = { ...(isObject(memory.backends) ? memory.backends : {}), graphify: memory.graphify };
      delete memory.graphify;
    } else if (from === "graph") {
      memory.graph = structuredClone(root.graph);
    }
  }
  const ordered = Object.fromEntries([
    ...MEMORY_KEY_ORDER.filter((key) => Object.hasOwn(memory, key)).map((key) => [key, memory[key]]),
    ...Object.entries(memory).filter(([key]) => !MEMORY_KEY_ORDER.includes(key)),
  ]);

  const movesGraph = moves.some(({ from }) => from === "graph");
  const out = {};
  for (const [key, value] of Object.entries(root)) {
    if (key === "graph" && movesGraph) {
      if (!Object.hasOwn(root, "memory")) out.memory = ordered;
      continue;
    }
    out[key] = key === "memory" ? ordered : structuredClone(value);
  }
  if (!Object.hasOwn(out, "memory")) out.memory = ordered;
  return { config: out, moves, conflicts };
}
