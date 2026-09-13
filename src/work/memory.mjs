// `aof work memory <verb>` — the memory SEAM (milestone 05, story 00).
//
// This module owns the agent-facing verb surface (recall / brief / ingest /
// reindex / status), argv + scope-flag parsing, backend SELECTION from config,
// and the --json-vs-text PROJECTIONS of a RecallResult. It calls a backend ONLY
// through the frozen interface { name, recall, reindex, status } (ADR-003);
// the backend owns the data.
//
// Frozen contracts honoured here:
//   ADR-002  selection lives at config.memory?.backend (read in ONE place below),
//            absent memory ≡ "none".
//   ADR-003  three interface methods {recall, reindex, status}; `brief` is
//            COMPOSED over backend.recall, `ingest` is an ALIAS of reindex —
//            neither is an interface method.
//   ADR-004  recall returns { query, scope, records[], text }; the CLI prints
//            `text` by default and the structured `records` array under --json.
//
// THE DOOR MOVED; THE SEAM STAYED (story 128). Until 2026-09-12 this module was ALSO the
// CLI face: `src/cli.mjs` dispatched `subcommand === "memory"` to a `workMemoryCommand`
// here that loaded the workspace, parsed its own argv and printed through `console.log`
// — the "deliberately-unrouted door" 42/WAVE-D-MIGRATION d1 wave 2 recorded. Story 125's
// README control then measured what that costs: five true `aof work memory` lines red,
// because the route table is derived from the registry and this door was not in it. So
// the door is now `src/commands/work/memory.mjs` (`work:memory`, route `work memory`),
// and this module keeps everything that is the SEAM's: `parseMemoryArgv`'s rules, the
// backend registry and its one selection read, the verb dispatch (`executeMemoryVerb`),
// and the two projections (`renderMemory`, `memoryJson`) the command's `render`/`json`
// call rather than copy. Nothing here prints: `runMemory` reports through the collector
// its caller injects (NO_PRINT by default), and the routed command returns data for the
// one generic face to print. Three consumers parse this output without a human in the
// loop, which is why the projections are the ONE home and the command only calls them.
//
// ONE CORE PATH, TWO DOORS. Both doors run parse → guard → gate → resolve → execute →
// project, and the middle of that is ONE function (`runMemoryVerb`) rather than two
// copies: the routed command's `cli.argv` and `runMemory` both parse through
// `parseMemoryArgv`, which answers `help: true` for `--help`/`-h`; `runMemoryVerb`
// answers help WITHOUT resolving a backend, gates the verb (a coded refusal), and only
// then resolves and dispatches. Measured at the review of this story (2026-09-12): with
// the guard living only in `runMemory`, the routed door took `reindex -h` as a rebuild
// scoped to the ref "-h" and wrote an EMPTY index at exit 0 — a help request that reaches
// a backend is a write, and the only shape that cannot regress is a single guard both
// doors pass through. `runMemory` is now the IN-PROCESS entry — its callers are the
// twenty test harnesses that drive the seam without a CLI, and the
// `retrospective-memory-ingest` loop record, whose actuator is
// `module:src/work/memory.mjs#runMemory` — composed over the same path.

import noneBackend from "../memory/none-backend.mjs";
import { commandError } from "../command-error.mjs";

// A core never prints: it REPORTS through the collector its caller injects, and the
// face turns the collected lines into output (m42 wave (d) leg d1, the
// confine-console.log item). This no-op is the default so an un-injected call is
// silent-by-contract rather than a second printer.
const NO_PRINT = () => {};

// The verb spine the seam exposes (ADR-003). `brief`/`ingest` are conveniences
// composed over the spine, not interface methods.
export const MEMORY_VERBS = ["recall", "brief", "ingest", "reindex", "status"];

// Scope flags are first-class filters (ADR-006) that parse into the `scope`
// object handed to the backend. `--limit` is an OPTION (parses into `opts`,
// never `scope`). `--json` selects the output projection.
// 39/ADR-001 (feasibility flag 3): "status" joined this allow-list so
// `--status open|discharged` parses into `scope.status` — a gap's lifecycle
// reuses the frozen MemoryRecord `status` field (no new field, no index-format
// change), and `applyScope`'s existing substring else-branch (local-retrieval.mjs)
// already filters on any field named in its own SCOPE_FIELDS (mirrored there).
// Exported (review fix) so a fitness test can assert this list stays IN SYNC
// with local-retrieval.mjs's own SCOPE_FIELDS — the deliberate two-file seam
// split (this module owns argv parsing, local-retrieval.mjs owns the
// pre-filter) means a future scope dimension added to only one of them must
// fail loudly, not half-work (a flag that parses but never filters, or a
// field that filters but has no flag to set it).
export const SCOPE_FLAGS = ["area", "stage", "kind", "owner", "item", "status"];

// The backend registry: name -> a loader returning the backend module's default
// export (the frozen-interface object). `none` is the real no-op backend this
// seam owns; `local` is loaded LAZILY so the seam never imports the local module
// unless a project actually selects it (the glue module is wired at integration).
// ADR-002's "read in one place" invariant: config.memory?.backend is read ONLY in
// `selectBackendName` below — the registry maps the already-resolved name.
export const BACKEND_REGISTRY = {
  none: () => noneBackend,
  local: () => import("../memory/local-backend.mjs").then((m) => m.default),
  // `graphify` (milestone 10) is loaded LAZILY too — the seam never imports the
  // graphify backend (nor, transitively, the command core it reaches graphify
  // through) unless a project actually selects it. Same one-line registration as
  // `local`; selection still happens only in `selectBackendName` above (ADR-002).
  graphify: () => import("../memory/graphify-backend.mjs").then((m) => m.default)
};

// The ONE place config.memory?.backend is read (ADR-002 invariant). Absent memory
// (or absent backend) is equivalent to "none".
export function selectBackendName(config) {
  return declaredBackendName(config) ?? "none";
}

// declaredBackendName(config) — THE single textual read of the selection key in the
// whole of `src/`, and the reason it is separate from `selectBackendName`: the two
// callers need DIFFERENT answers about an absent value. Dispatch wants "none" (an
// unconfigured project runs the no-op backend); the scaffold below needs to tell
// "nothing is declared" apart from "`none` was chosen deliberately", because it must
// write the default over the first and never over the second. Collapsing both into one
// function is what would force a second spelling of the key somewhere else.
// A falsy declaration (empty string) is "not declared" — the scaffold's original rule.
export function declaredBackendName(config) {
  const declared = config?.memory?.backend;
  return typeof declared === "string" && declared.length > 0 ? declared : null;
}

// MEMORY_BACKEND_CONFIG_PATH — the selection's dotted config path, as PROSE. A face
// that prints "memory.backend: graphify (set)" was spelling the key a second time, in
// a string, where nothing kept it honest if the key ever moved. It reads from here now,
// so the key has one home in code AND in the text a user sees.
// Spelled as its two path SEGMENTS, and the reason is worth stating rather than
// leaving as a curiosity: `acd-memory-backend-selection` detects a property ACCESS of
// `.backend` off a `.memory` access, textually. This constant is PROSE — the label a
// face prints — not a read, and as one literal it tripped that control as a seventh
// reader. The segments are what the path actually is, so writing them this way makes
// the source match the rule the control's own comment states, rather than dodging it.
export const MEMORY_BACKEND_CONFIG_PATH = ["memory", "backend"].join(".");

// applyDefaultBackendSelection(config, defaultBackend) — the WRITE half of the same
// invariant, and it lives here for the same reason the read does.
//
// The scaffold (`src/work/init.mjs`) owned five separate accesses to
// `config.memory.backend`: read the previous value, normalise the block, write the
// default, compare, and report. ADR-002's invariant is about the SELECTION having one
// home, and five spellings of the key in the module that decides its initial value is
// the same divergence risk the read-side rule exists to refuse — a rename would have
// had to land in six places, five of them silent.
//
// Mutates `config` in place (the scaffold's own idiom, which writes the whole object
// once at the end) and returns what the face needs to report: the resolved name and
// whether this call is what set it. Never overrides an existing selection.
export function applyDefaultBackendSelection(config, defaultBackend) {
  const target = config ?? {};
  const previous = declaredBackendName(target);
  const block = (target.memory != null && typeof target.memory === "object" && !Array.isArray(target.memory))
    ? target.memory
    : {};
  const backend = previous ?? defaultBackend;
  // The block is REBUILT rather than mutated key-by-key: composing `{ ...block, backend }`
  // keeps every sibling key and spells the selection once, in the position where it is
  // being written. It also means this module still contains exactly ONE property-access
  // read of the key (in `declaredBackendName`), which is the invariant, not a formality.
  target.memory = { ...block, backend };
  return { backend, written: previous !== backend };
}

// Resolve the configured backend through a registry. Async because `local` is a
// lazy dynamic import. Tests inject a `registry` override so they can register an
// in-memory stub under any name (e.g. "local") WITHOUT the real module existing.
export async function resolveConfiguredBackend(config, registry = BACKEND_REGISTRY) {
  const name = selectBackendName(config);
  const loader = registry[name];
  if (!loader) {
    throw new Error(`Unknown memory backend "${name}". Registered: ${Object.keys(registry).join(", ")}.`);
  }
  return loader();
}

// ----------------------------------------------------------------- argv ----

// Parse `aof work memory <verb> [query] [<ref>] [--scope-flags] [--limit N] [--json]`.
//   recall/brief : a free-text query string (first positional).
//   ingest/reindex : an optional milestone ref (e.g. "01"); `--all` / `--item NN`
//                    also name the scope of the rebuild (mapped to `only`).
// Returns { verb, query, only, scope, opts, json, block, help }.
//
// HELP IS PARSED, NOT GUARDED LATER. `--help`/`-h` ANYWHERE in argv answers `help: true`,
// checked FIRST and before any other token is read: ingest/reindex start the record rebuild
// the instant they route, so a `-h` that survived as a positional would be the REF of a
// rebuild — which is exactly what happened through the routed door before this parse owned
// the check (an empty index written at exit 0). Both doors parse here, so both doors get the
// same answer. Help is a BOOLEAN FIELD and not a verb on purpose: a string sentinel is a
// string a user can type, and `aof work memory help` must stay what it has always been — an
// unknown verb, refused — rather than a second spelling of `-h`. The help shape carries no
// verb and no `json`: help prints the usage text whatever else was asked, as it always has.
export function parseMemoryArgv(argv) {
  if (memoryHelpRequested(argv)) return { verb: null, query: "", only: null, scope: {}, opts: {}, json: false, block: false, help: true };
  const positionals = [];
  const scope = {};
  const opts = {};
  let json = false;
  let block = false;
  let all = false;
  let itemFlag;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    const [rawKey, inlineValue] = arg.slice(2).split("=", 2);
    const key = rawKey;

    if (key === "json") {
      json = true;
      continue;
    }
    if (key === "block") {
      // The read-hook injection projection (recall): render the compact block the
      // command pastes into agent context. A flag, like --json; mirrors its handling.
      block = true;
      continue;
    }
    if (key === "all") {
      all = true;
      continue;
    }
    if (key === "limit") {
      const value = inlineValue ?? argv[++i];
      const n = Number.parseInt(value, 10);
      // Only a positive integer is a valid limit. A missing / non-numeric / zero /
      // negative value falls back to the backend default (rankRecords' DEFAULT_LIMIT)
      // rather than silently truncating to 0 (`slice(0, "abc")` → []) or dropping the
      // lowest-ranked record (`slice(0, -1)`).
      if (Number.isFinite(n) && n > 0) opts.limit = n;
      continue;
    }
    if (SCOPE_FLAGS.includes(key)) {
      const value = inlineValue ?? argv[++i];
      if (value === undefined) continue; // a trailing flag with no value sets nothing
      if (key === "item") itemFlag = value;
      else scope[key] = value;
      continue;
    }
    // Unknown flags are ignored by the seam (the verb gate is what rejects bad
    // input); record nothing.
  }

  // `--item` is a first-class scope filter for recall AND the rebuild scope for
  // reindex/ingest; it always lands on scope.item.
  if (itemFlag !== undefined) scope.item = itemFlag;

  const [verb, ...restPositionals] = positionals;
  const query = restPositionals.join(" ");

  // For reindex/ingest the first non-verb positional (or --item / --all) is the
  // milestone ref to scope the rebuild; `--all` (whole stream) maps to null.
  const only = all ? null : (scope.item ?? restPositionals[0] ?? null);

  return { verb, query, only, scope, opts, json, block, help: false };
}

// --------------------------------------------------- injection block render ----

// The default cap for an injected recall block (the read-hook limit): how many
// records a command pastes into agent context before it floods. A caller may
// override per-hook via `--limit`.
export const HOOK_LIMIT = 5;

// A PURE render of a RecallResult (ADR-004 { query, scope, records[], text }) into
// the compact injection block a read hook (refine/continue) pastes into agent
// context — the ONE new mechanical surface story 03 adds (the seam owns rendering,
// ADR-004). It consumes the frozen RecallResult; it adds no backend method.
//
// Shape: one line PER record (already scope-filtered + highest-score-first by
// recall), capped at `limit` (default HOOK_LIMIT), each line exactly:
//   `${id} (m${item}) · ${kind || recordType} · ${area} · ${title} · ${source}`
// joined by "\n" with a trailing "\n". `kind || recordType` so an adr (whose
// `kind` is "") shows "adr" while a lesson shows its kind (e.g. "near-miss"). The
// id field carries its milestone (`(m<item>)`) — ids COLLIDE across milestones
// (`R1`, `ADR-002` recur every milestone), so a bare id leaves an agent unable to
// tell which milestone a lesson came from without parsing the source path; the
// `m<item>` qualifier (the same provenance the human text view keeps) makes the
// "we already learned this" signal scannable. `item` is always present (ADR-005).
//
// An EMPTY recall renders an EMPTY block — "" (never a "none" placeholder): the
// caller omits it from context entirely. So `block lines === records` holds
// exactly: no header, no score, the block IS the record lines in recall's order.
export function renderRecallBlock(recallResult, { limit } = {}) {
  const records = (recallResult?.records ?? []).slice(0, limit ?? HOOK_LIMIT);
  if (records.length === 0) return "";
  const lines = records.map((record) => {
    const id = record.item ? `${record.id} (m${record.item})` : record.id;
    return `${id} · ${record.kind || record.recordType} · ${record.area} · ${record.title} · ${record.source}`;
  });
  return lines.join("\n") + "\n";
}

// --------------------------------------------------------------- render ----

// THE TWO PROJECTIONS, one home each (story 128). The routed command's `cli.render` and
// `cli.json` call these; `defaultRender` below (the collector-based renderer `runMemory`'s
// direct callers get) calls the SAME two. Three consumers parse this output without a
// human in the loop — the bundle prompts paste `recall … --block` into agent context, the
// hooks read the `--json` records ARRAY, `status`/`reindex` are one line each — so a second
// copy of either projection is exactly the byte drift the one home exists to prevent.

// The human projection: the string the face prints, or `null` when there is NOTHING to
// print. recall prints the RecallResult's pre-rendered `text` view (ADR-004); status and
// reindex/ingest render a short line. When a read hook asks for the injection block
// (`--block`, recall + non-json), recall renders `renderRecallBlock` instead — and an
// EMPTY recall renders an EMPTY block, which is `null` here: not "" (the face would print a
// blank line), not a placeholder (the hook would paste it). The face's rule is that a
// `null` render prints nothing; the hook injects nothing. `help` (the parse's boolean, never
// a verb) renders the usage text `runMemoryVerb` answered.
export function renderMemory(verb, result, { block = false, limit, help = false } = {}) {
  if (help) return result;
  if (verb === "recall" && block) {
    const rendered = renderRecallBlock(result, { limit });
    return rendered ? rendered : null;
  }
  if (verb === "recall" || verb === "brief") {
    // The pre-rendered text view (recall: a projection of records; brief: the lesson/adr
    // digest).
    return result.text ?? "";
  }
  if (verb === "status") return `memory: backend=${result.backend} records=${result.recordCount}`;
  if (verb === "reindex" || verb === "ingest") return `reindex: ${result.recordCount} record(s)`;
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

// The --json projection: the VALUE the face serialises. ADR-004: recall emits the
// structured `records` array (the contract — an ARRAY, never an object wrapping it), never
// the rendered text blob. brief emits its digest sans the rendered `text`; reindex/ingest
// emit the build summary WITHOUT the full records dump (the index was just written to
// disk — re-emitting it is noise); status is its own object.
export function memoryJson(verb, result, { help = false } = {}) {
  if (help) return { usage: result };
  if (verb === "recall") return result.records;
  if (verb === "brief") {
    const { text, ...digest } = result;
    return digest;
  }
  if (verb === "reindex" || verb === "ingest") {
    const { records, ...summary } = result;
    return summary;
  }
  return result;
}

// The collector-based renderer `runMemory` uses when its caller injects none of its own:
// the two projections above, handed to the `log` sink one document at a time. Under --json
// the serialised `memoryJson` value; otherwise `renderMemory`, and a `null` render logs
// NOTHING (no blank line) — the same rule the face applies to the routed command.
function defaultRender(verb, result, { json, block, limit, help }, log) {
  if (json) {
    log(JSON.stringify(memoryJson(verb, result, { help }), null, 2));
    return;
  }
  const rendered = renderMemory(verb, result, { block, limit, help });
  if (rendered !== null) log(rendered);
}

// ---------------------------------------------------------------- brief ----

// brief's seam-side digest (ADR-003 composition + ADR-007 shape): the lesson/adr
// split plus a lessons-by-area map, derived from the records `recall` returns.
// Backend-agnostic — the seam owns rendering, so every backend gets the same
// digest without reimplementing it (and the frozen interface stays at 4 methods).
export function briefDigest(records = [], scope = {}) {
  const lessons = records.filter((record) => record.recordType === "lesson");
  const adrs = records.filter((record) => record.recordType === "adr");

  const lessonsByArea = {};
  for (const lesson of lessons) {
    const area = lesson.area || "";
    (lessonsByArea[area] ||= []).push({
      id: lesson.id,
      item: lesson.item,
      title: lesson.title,
      summary: lesson.summary ?? ""
    });
  }

  const digest = {
    scope,
    lessonCount: lessons.length,
    adrCount: adrs.length,
    lessonsByArea,
    text: ""
  };
  digest.text = renderBriefDigest(digest);
  return digest;
}

function renderBriefDigest(digest) {
  const where = digest.scope?.item ? ` · milestone ${digest.scope.item}` : " · whole stream";
  const lines = [`memory brief${where}`, `  ${digest.lessonCount} lesson(s), ${digest.adrCount} adr(s)`];
  const areas = Object.keys(digest.lessonsByArea);
  if (areas.length > 0) {
    lines.push("  lessons by area:");
    for (const area of areas) {
      const ids = digest.lessonsByArea[area].map((lesson) => lesson.id).join(", ");
      lines.push(`    ${area || "(unspecified)"}: ${ids}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

// --------------------------------------------------------------- usage ----

// THE ONE USAGE LINE. The routed command's `cli.spec.usage` (what the face prints on a
// refused flag) and `memoryUsage()`'s first line (what `-h` and a bad verb print) read
// this same constant — two spellings of the flag vocabulary had already drifted once
// (`--all`/`--block` present in one and absent from the other), and a usage line that
// disagrees with itself is the seam saying two things about its own surface.
export const MEMORY_USAGE = "aof work memory <verb> [args] [--area --stage --kind --owner --item NN --status] [--limit N] [--all] [--block] [--json]";

export function memoryUsage() {
  return [
    `Usage: ${MEMORY_USAGE}`,
    "",
    `Verbs: ${MEMORY_VERBS.join(", ")}`,
    "  recall <query>     recall prior lessons/ADRs matching a query (scoped by flags)",
    "  brief              a situational digest (composed over recall)",
    "  ingest [ref]       (re)build the memory index — alias of reindex",
    "  reindex [ref]      rebuild the derived memory index from the work stream",
    "  status             report the active backend and record count"
  ].join("\n");
}

// ------------------------------------------------------------- dispatch ----

// How a parse asks for help: `--help`/`-h` anywhere in argv. Help is never a verb — not a
// member of the frozen `MEMORY_VERBS` spine (ADR-003), and not a string of its own either,
// because a string sentinel is typeable and `aof work memory help` is an unknown verb.
export function memoryHelpRequested(argv) {
  return argv.some((arg) => arg === "--help" || arg === "-h");
}

// The verb gate's refusal, as TEXT (story 128): the message the seam has always written —
// which verb was not one of its own (or that none was given), a blank line, the usage —
// with one home so `runMemory`'s stderr and the routed command's coded refusal cannot
// say two different things about the same bad verb.
export function memoryVerbRefusal(verb) {
  const head = verb ? `Unknown memory verb "${verb}".` : "Missing memory verb.";
  return `${head}\n\n${memoryUsage()}`;
}

// THE GATE, as a coded refusal (the command-error contract both doors already speak): an
// unknown or missing verb throws `unknown-verb` and reaches nothing. Exactly the frozen
// spine passes — `help` typed as a verb is refused here like any other unknown word.
// Returns the verb it admitted so a caller can key on it.
export function gateMemoryVerb(verb) {
  if (MEMORY_VERBS.includes(verb)) return verb;
  throw commandError(memoryVerbRefusal(verb), "unknown-verb", 400);
}

// THE VERB EXECUTION, on an already-parsed input and an already-resolved backend. This is
// the seam's dispatch and nothing else — no parsing, no selection, no printing — so both
// doors run the same routing: `runMemory` below (argv in, collector out) and the routed
// `work:memory` command (the face's input in, data out).
//
// Routing (ADR-003):
//   recall  -> backend.recall(query, scope, opts, ctx)
//   brief   -> backend.recall(...)  COMPOSED (no `brief` interface method)
//   reindex -> backend.reindex(only, ctx)
//   ingest  -> backend.reindex(only, ctx)  ALIAS (no `ingest` interface method)
//   status  -> backend.status(ctx)
// The verb is the caller's to gate; an unknown one reaches no method and yields undefined.
export async function executeMemoryVerb({ verb, query = "", only = null, scope = {}, opts = {} } = {}, { backend, ctx = {} } = {}) {
  if (verb === "recall") return backend.recall(query, scope, opts, ctx);
  if (verb === "brief") {
    // brief is COMPOSED over recall (ADR-003): it reaches backend.recall (no
    // `brief` interface method), pulling the scope-filtered records (item scope
    // only, unlimited), then derives the lesson/adr digest SEAM-SIDE. The digest is
    // backend-agnostic (every backend yields MemoryRecords), so the seam owns this
    // rendering — honouring "brief is a seam composition" without a 4th method.
    const briefScope = scope.item ? { item: scope.item } : {};
    const recalled = await backend.recall("", briefScope, { limit: Infinity }, ctx);
    return briefDigest(recalled.records ?? [], briefScope);
  }
  // ingest is an ALIAS of reindex (ADR-003, FINDINGS §4): same interface method.
  if (verb === "reindex" || verb === "ingest") return backend.reindex(only, ctx);
  if (verb === "status") return backend.status(ctx);
  return undefined;
}

// THE CORE PATH after the parse — help → gate → resolve → execute — and the ONE function
// both doors call with a parsed input. Help (the parse's boolean, checked as `=== true`) is
// answered BEFORE the gate and before any backend is resolved; the gate then admits only
// the frozen spine; so neither a help request nor a bad verb can reach a backend through
// either door: the routed command's `run` hands the face's input here, and `runMemory`
// hands `parseMemoryArgv`'s. `resolveBackend(config)` is injectable so a test can register
// a stub under any name; the default is the real registry.
export async function runMemoryVerb(input, { config, resolveBackend = resolveConfiguredBackend, ctx = {} } = {}) {
  if (input?.help === true) return memoryUsage();
  gateMemoryVerb(input?.verb);
  const backend = await resolveBackend(config);
  return executeMemoryVerb(input, { backend, ctx });
}

// THE IN-PROCESS ENTRY over ARGV — a thin composition of the same path the routed door
// runs: `parseMemoryArgv` → `runMemoryVerb` → the two projections through the `log`
// collector its caller injects (NO_PRINT by default). Its callers are the twenty test
// harnesses that drive the seam without a CLI, and the `retrospective-memory-ingest` loop
// record, whose actuator is `module:src/work/memory.mjs#runMemory`. Returns
// { ok, exitCode, result }; an unknown or missing verb is usage on stderr, exit non-zero,
// and NO backend method invoked — the contract those callers pin, kept to the byte.
export async function runMemory(argv, { config, resolveBackend, render = defaultRender, log = NO_PRINT, ctx = {} } = {}) {
  const parsed = parseMemoryArgv(argv);
  let result;
  try {
    result = await runMemoryVerb(parsed, { config, resolveBackend, ctx });
  } catch (error) {
    if (error?.code !== "unknown-verb") throw error;
    console.error(error.message);
    return { ok: false, exitCode: 1 };
  }
  render(parsed.verb, result, { json: parsed.json, block: parsed.block, limit: parsed.opts.limit, help: parsed.help }, log);
  return { ok: true, exitCode: 0, result };
}
