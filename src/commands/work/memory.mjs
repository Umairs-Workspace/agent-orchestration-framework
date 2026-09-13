// src/commands/work/memory.mjs — `work:memory`, the registered door onto the memory seam
// (story 128). WAVE-D class A by 42's own definition — an unregistered ladder verb becomes a
// new registry Command and its branch is deleted: a Command that declares its route, its flag
// vocabulary and its `argv`/`render`/`json` adapters on itself and calls the seam's core
// with the parsed input. The SEAM (`src/work/memory.mjs`) keeps what is the seam's —
// `parseMemoryArgv`'s rules, the backend registry and its one selection read, the verb gate
// and `runMemoryVerb`'s one core path, and the two projections — and this module owns only
// the door: the registry entry, the spec the face parses against, and the adapters.
//
// WHY IT IS REGISTERED. Until 2026-09-12 `aof work memory` was dispatched by a
// `subcommand === "memory"` branch in `src/cli.mjs`'s ladder to a `workMemoryCommand` in the
// seam that parsed its own argv and printed — the "deliberately-unrouted door" 42's
// WAVE-D-MIGRATION (d1 wave 2) recorded on the grounds that "they delegate wholesale". That
// reason was about who owns the parser, and it still holds: the parser is the seam's. What
// the record did not anticipate is a control whose premise is that the route table IS the
// CLI: story 125's `acd-readme-names-what-ships` resolves every `aof …` the README spells
// against `deriveRouteTable()`, and it went red on exactly five lines, every one of them
// this verb. Two doors made its premise false; this module closes the one the README spells
// (`aof session` is not spelled there, is fired from editor hooks rather than typed, and
// stays laddered — a different story's subtraction).
//
// WHY IT LIVES IN `src/commands/work/` AND NOT BESIDE `find.mjs`. Placement is decided by a
// delivered control, not by preference: `acd-source-directory-budget` holds `src/commands/`
// at 67 direct children with allowance 0 — "never a 68th flat sibling" — and every control
// that judges a command module walks `src/commands/**`. So this module FOUNDS the family its
// own id declares, with a budget row of its own. Founding a family with one member is stated,
// not smuggled (119/02's rows are the precedent). The fold of the other `work:*` commands
// into this directory is a separate item, named and not taken here: it re-points every
// dependent of some forty modules and belongs in no other story's blast radius.
//
// BYTE-FOR-BYTE IS THE BAR, because three consumers parse this output without a human in the
// loop: the bundle prompts run `recall … --kind near-miss --block` and paste the block into
// agent context; hooks read the `--json` recall as a records ARRAY (05/ADR-004), never an
// object wrapping it; `status` and `reindex` print one line each. So `render` and `json` are
// the seam's `renderMemory`/`memoryJson` and nothing of their own, and `argv` re-serialises
// the face's parse into the argv `parseMemoryArgv` has always read, so the seam's rules —
// six scope flags, `--item` as both recall filter and rebuild scope, `--all` mapping the
// rebuild scope to the whole stream, a non-positive or non-numeric `--limit` falling back to
// the backend default — are applied by their one home rather than copied. The one behaviour
// the spine changes on purpose is the one it changes for every migrated verb: an undeclared
// flag is refused loudly instead of ignored.
//
// AN EMPTY BLOCK PRINTS NOTHING. `recall <miss> --block` emitted zero bytes through the
// ladder, and the generic face prints whatever `render` returns through `console.log`, which
// always appends a newline. So `renderMemory` answers `null` for an empty block and the face
// learned one rule — a `null` render has nothing to print — rather than this command learning
// to print. Commands return data, faces print.
//
// HELP NEVER REACHES A BACKEND, THROUGH EITHER DOOR. `-h` is not a `--` token, so the face
// hands it to `argv` as a positional — and a positional after `reindex` is the REF of a
// rebuild. Measured at this story's review: `reindex -h` rebuilt the index scoped to "-h" and
// wrote it EMPTY at exit 0, because the seam's help guard lived only in `runMemory`, which
// this door never called. So the guard is now the seam's PARSE (`parseMemoryArgv` answers
// `help: true` — a boolean, never a typeable verb, so `aof work memory help` stays the
// unknown verb it always was) and the seam's core path (`runMemoryVerb` answers help before
// resolving a backend) — both of which this door calls — and the routed answer is HEAD's: the
// usage text on stdout at exit 0. (`--help` is a `--` token, and the spine refuses it as an undeclared flag,
// uniformly with every routed verb; that is the spine's policy, not this command's.)
import {
  MEMORY_USAGE,
  SCOPE_FLAGS,
  memoryJson,
  parseMemoryArgv,
  renderMemory,
  resolveConfiguredBackend,
  runMemoryVerb,
} from "../../work/memory.mjs";

// The six scope flags, declared from the seam's own list so a seventh dimension added there
// is a flag here without a second spelling (the SCOPE_FLAGS ↔ local-retrieval sync the seam
// already guards, extended to the face). The promise holds for HYPHEN-FREE names only: the
// face's `parseSpecArgv` camelCases a hyphenated flag (`--foo-bar` binds `fooBar`), so a
// scope dimension spelled with a hyphen would need its spec key camelCased here by hand.
const SCOPE_FLAG_SPECS = Object.fromEntries(
  SCOPE_FLAGS.map((flag) => [flag, { type: "string", description: `filter recall by ${flag}${flag === "item" ? " (also the reindex/ingest rebuild scope)" : ""}` }]),
);

export const memoryCommand = {
  id: "work:memory",

  // THE SEAM'S PARSED SHAPE, and nothing the face invents: what `parseMemoryArgv` returns
  // minus `json` (the face's own flag). `only` is the rebuild scope — a ref, or null for the
  // whole stream — and lives beside `scope.item` rather than being derived from it here,
  // because the seam's rule ("`--all` wins; else `--item`; else the first positional") is the
  // seam's to apply. `help` is the parse's boolean for `-h`; the help shape carries no verb.
  input: {
    type: "object",
    properties: {
      verb: { type: ["string", "null"] },
      query: { type: "string" },
      only: { type: ["string", "null"] },
      scope: {
        type: "object",
        properties: Object.fromEntries(SCOPE_FLAGS.map((flag) => [flag, { type: "string" }])),
        additionalProperties: false,
      },
      opts: {
        type: "object",
        properties: { limit: { type: "integer", minimum: 1 } },
        additionalProperties: false,
      },
      block: { type: "boolean" },
      help: { type: "boolean" },
    },
    required: ["verb"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const workspace = ctx?.workspace ?? {};
    const { config, workDir, projectRoot } = workspace;
    // The ctx the ladder shim built, unchanged: m43 / story 06 — `workspace` rides along so
    // the local indexer's cache-first traversal can resolve this workspace's mesh identity;
    // every backend reads `workDir`/`projectRoot`/`configMemory`.
    const memoryCtx = { workDir, projectRoot, workspace, configMemory: config?.memory ?? {} };
    // THE SEAM'S ONE CORE PATH: the verb gate (a coded `unknown-verb` refusal the face turns
    // into its one envelope — 05/ADR-003's gate, kept, and it precedes any backend
    // resolution), help answered before a backend is resolved, then resolve and dispatch.
    const result = await runMemoryVerb(input, { config, resolveBackend: resolveConfiguredBackend, ctx: memoryCtx });
    return { verb: input.verb, help: input.help === true, block: input.block === true, limit: input.opts?.limit, result };
  },

  cli: {
    route: ["work", "memory"],
    spec: {
      // The seam's ONE usage line — the same string `memoryUsage()` opens with.
      usage: MEMORY_USAGE,
      flags: {
        block: { type: "boolean", description: "recall only: render the compact injection block a read hook pastes into agent context" },
        all: { type: "boolean", description: "reindex/ingest: rebuild over the whole stream" },
        limit: { type: "string", description: "recall: cap the records returned (a non-positive or non-numeric value means the backend default)" },
        ...SCOPE_FLAG_SPECS,
      },
    },

    // Re-serialise the face's parse into the argv the seam has always read, and let
    // `parseMemoryArgv` apply its rules — including the help rule: a `-h` positional parses to
    // `help: true` here, so it can never become a rebuild's ref. The positionals are
    // already `<verb> [query…]`; every declared flag goes back as its `--flag [value]` pair;
    // `--json` and `--config` are the face's and never reach the seam. The seam's `json`
    // answer is dropped for the same reason.
    argv: (positionals, options = {}) => {
      const argv = [...positionals];
      if (options.block === true) argv.push("--block");
      if (options.all === true) argv.push("--all");
      if (typeof options.limit === "string") argv.push("--limit", options.limit);
      for (const flag of SCOPE_FLAGS) {
        if (typeof options[flag] === "string") argv.push(`--${flag}`, options[flag]);
      }
      const { verb, query, only, scope, opts, block, help } = parseMemoryArgv(argv);
      return { verb, query, only, scope, opts, block, help };
    },

    // The seam's human projection, per verb — `null` for an empty block, which the face
    // prints as nothing; the usage text for `help`.
    render: (outcome) => renderMemory(outcome.verb, outcome.result, { block: outcome.block, limit: outcome.limit, help: outcome.help }),

    // The seam's --json projection, per verb: recall → the records ARRAY; brief → the digest
    // sans `text`; reindex/ingest → the summary sans `records`; status → the object;
    // help → `{ usage }`.
    json: (outcome) => memoryJson(outcome.verb, outcome.result, { help: outcome.help }),
  },
};
