// The in-process command registry — the single source of truth for every work
// operation, the SPINE both faces couple through (ADR-002). The CLI is a thin
// `argv → invoke → render`/`--json` face; each UI server is a thin
// `transport → invoke → project` face. Both call this SAME core in-process —
// never a per-request subprocess (ADR-001).
//
// A Command is the frozen shape:
//   {
//     id:    string,                       // the registry key, e.g. "work:doc"
//     input: <JSONSchema>,                 // plain serialisable data only
//     run:   async (input, ctx) => result, // the operation; returns basis-NEUTRAL
//                                          //   data (raw absolute paths, or list's
//                                          //   dir as listStream emits it) — NO
//                                          //   displayPath/relativise inside run.
//     cli:   { argv, render, json },       // the CLI face adapter (argv → input,
//                                          //   human render, --json projection).
//   }
//
//   ctx = { workspace } where workspace is the loadWorkspace result
//   { workDir, config, projectRoot, configPath }.
//
// Path-display projection is a FACE adapter, NOT command logic: the board face
// relativises raw paths to projectRoot + forward-slash; the CLI face relativises
// to process.cwd() (path.relative, OS separators). Basis-neutral results let each
// face project losslessly — the keystone that makes byte-for-byte on both faces
// achievable on Windows separators (ADR-002).
// Compatibility entry; construction belongs to core application assembly.
import { commandCore } from "./application/default.mjs";
export const {
  loadWorkspace,
  getCommand,
  listCommands,
  invoke,
} = commandCore;
