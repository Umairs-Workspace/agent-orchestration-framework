// src/commands/loop-document.mjs — `work:loop-document`, the writer for the committed loop graph
// (story 79). ONE registered command whose BARE FACE IS A READ: it loads the registry, composes
// the document and emits it, touching no disk. `--write` is the only door to the filesystem.
//
// That is the `work:grade` idiom (`--run` as the only door to execution, 54/ADR-003 §2) and
// 78/ADR-002 chose it for the reason that applies here too: a face that writes by default cannot
// be composed by anything that only wants to look — and `acd-work-command-cli-bijection` spawns
// every registered verb as a REAL subprocess from inside this repository's own suite, so a
// writing bare face would make the suite rewrite its own tree on every run.
//
// THIS WRITER IS A TRUNCATE-AND-EMIT, and that is the one place it is SIMPLER than 78's. There is
// no human signature anywhere in this document and nothing in it is non-derivable, so nothing has
// to be read back and carried forward. Only the half of 78/ADR-002 that applies is inherited:
// byte-identity on unchanged inputs, and `--write` as the only door to disk.
//
// THE ID AND THE ROUTE DIVERGE, DELIBERATELY. The module and the id carry the execution/document
// family name 52/FF-5201 forces (see `src/loop-document.mjs`'s header); the ROUTE sits at
// `aof work loops document`, beside the four read verbs, where an operator will look for it.
// `work:loops-graph` → `aof work loops graph` already establishes that shape, and the
// registry-derived route table covers it with no `src/cli.mjs` edit — which is also what keeps
// 52/FF-5202's "the CLI never references the loop family" leg untouched.
//
// WHY IT IS REGISTERED — the comment that stood above this module's entry in `src/command-core.mjs`,
// moved here unedited (119/02, FF-11908: the registry cites, it does not explain).
//
// From the comment above this module's registry import:
//   story 79 — work:loop-document, the WRITER for the committed loop graph (`wiki/work/loops.md`).
//   Its bare face is a READ (compose + emit, touching no disk) and `--write` is the only door to
//   the filesystem, the `work:grade` idiom 78/ADR-002 chose for this shape. The module and the id
//   carry the EXECUTION family name 52/FF-5201 forces — `loops-document` in `src/commands/` would
//   be red twice over, once for changing that gate's discovered set and once for writing — while
//   the CLI route sits at `aof work loops document`, beside the four read verbs. BOARD-DEFERRED,
//   joining the carve-out chore 64 recorded for the `work:loops-*` family and for the same reason:
//   52/FF-5202 bans the loop family from `ui/`, so a served route would be a door no UI is
//   permitted to open.
//
// From the comment on `loopDocumentCommand`'s COMMANDS entry:
//   story 79 — the registry's four reads plus the ONE writer that projects them onto a committed
//   document (see the import note). It is registered here rather than beside them in the
//   `loops-` family because the gate that discovers that family forbids a writer in it.
import { readFile } from "node:fs/promises";
import path from "node:path";

import { writeText } from "../fs.mjs";
import { composeLoopDocument, loopDocumentPath, REGENERATE_COMMAND } from "../loop-document.mjs";

function displayPath(value) {
  return path.relative(process.cwd(), value) || ".";
}

// Deferred by design: command-core imports this module to register `work:loop-document`, so a
// static import back into command-core would close the registry ring. The same idiom
// `src/commands/loop.mjs` uses for its gate ladder, and for the same reason — the registry stays
// the single door for every work operation (08/ADR-001), including the ones this command composes.
async function invokeRegistered(id, input, ctx) {
  const { invoke } = await import("../command-core.mjs");
  return await invoke(id, input, ctx);
}

// The registry's path as the DOCUMENT states it: relative to the project root and forward-slashed,
// so the committed bytes do not depend on where the repository is checked out or on the working
// directory the command was run from. `displayPath` above is the FACE's projection (relative to
// cwd, OS separators) and is deliberately a different answer for a different consumer.
function projectRelative(workspace, target) {
  const base = workspace?.projectRoot ?? (workspace?.aofDir ? path.dirname(workspace.aofDir) : null);
  // A LOUD REFUSAL, never a fallback to the absolute path. The absolute path would compose
  // cleanly and put the machine's checkout location into a committed file, so the drift check
  // would red for every other contributor with a message about a registry that had not changed.
  // Determinism is not a thing to degrade toward.
  if (!base) throw new TypeError("work:loop-document requires a workspace with a project root");
  const relative = path.relative(base, target);
  return relative === "" ? "." : relative.split(path.sep).join("/");
}

export const loopDocumentCommand = {
  id: "work:loop-document",

  // NO CALLER-SUPPLIED OUTPUT PATH, and `additionalProperties: false` is what makes that a
  // refusal rather than a convention: the home is derived from `work.dir` and there is exactly
  // one of it, which is what keeps the drift check anchored to something it can find.
  input: {
    type: "object",
    properties: { write: { type: "boolean" } },
    additionalProperties: false,
  },

  async run(input, ctx) {
    // EVERY PART OF THE DOCUMENT COMES FROM A READ COMMAND THAT ALREADY COMPUTES IT — the frozen
    // renderer's bytes through `work:loops-graph`, the finding totals and per-check census
    // through `work:loops-validate`, and the per-record fields through `work:loops-show`. Nothing
    // here re-renders a glyph, re-runs a check or re-parses a record, so there is no second copy
    // of any of them to drift from the first.
    //
    // Each is reached THROUGH THE REGISTRY rather than by importing its module, so this command
    // composes the three loop reads by the same door every other caller uses. The cost is
    // measured and accepted: three loads of a seventeen-file registry per invocation, because
    // none of the three faces takes a preloaded model and `work:loops-graph`'s input contract is
    // frozen. Re-deriving the model here to save two `readdir`s would be the second copy this
    // whole story exists to avoid.
    const graph = await invokeRegistered("work:loops-graph", {}, ctx);
    const validation = await invokeRegistered("work:loops-validate", {}, ctx);
    const shown = await invokeRegistered("work:loops-show", {}, ctx);

    const text = composeLoopDocument({
      present: graph.present,
      source: projectRelative(ctx.workspace, graph.source),
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      graph: graph.text,
      summary: validation.summary,
      records: shown.nodes,
    });

    const target = loopDocumentPath(ctx.workspace);
    let existing = null;
    try {
      existing = await readFile(target, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    const write = input?.write === true;
    // `writeText` is the one door, and it is atomic by construction (temp + rename, with the temp
    // reclaimed on the failure path that created it — m42/F26). A write that cannot complete
    // therefore leaves the previous document with its previous bytes and strands nothing beside it.
    if (write) await writeText(target, text);

    return {
      path: target,
      source: graph.source,
      present: graph.present,
      written: write,
      existed: existing !== null,
      changed: existing !== text,
      nodeCount: graph.nodeCount,
      edgeCount: graph.edgeCount,
      summary: validation.summary,
      text,
    };
  },

  cli: {
    route: ["work", "loops", "document"],
    spec: {
      usage: "aof work loops document [--write] [--json]",
      flags: {
        write: {
          type: "boolean",
          description: `write the document to the work directory root (the bare verb emits it and touches no disk)`,
        },
      },
    },

    argv: (_positionals, options = {}) => (options.write ? { write: true } : {}),

    render(result) {
      if (!result.written) return result.text;
      const state = result.changed ? (result.existed ? "Updated" : "Wrote") : "Unchanged";
      return [
        `${state} ${displayPath(result.path)} — ${result.nodeCount} declared record(s), ${result.edgeCount} edge(s), ${result.summary.error} error(s), ${result.summary.warn} warning(s).`,
        ...(result.present ? [] : [`No loop registry is declared at ${displayPath(result.source)}.`]),
      ].join("\n");
    },

    json: (result) => ({
      ...result,
      path: displayPath(result.path),
      source: displayPath(result.source),
      regenerate: REGENERATE_COMMAND,
    }),
  },
};
