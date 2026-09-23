// diagram:file — `aof diagram file <ref> <ADR-NNN-slug.ext>` (milestone 133, 133/VERIFICATION F-133-02).
// One committed diagram file of an item, read from THIS node's checkout: the source `.html`, the
// `.svg` or the `.png`. The board serves it for the pasted block's `Source · PNG` links, which
// otherwise resolve against the board's own URL and 404.
//
// LOCAL ONLY, and it says so. A row another node holds has no folder here, and the doc route's
// worker stream carries the SVG alone (ADR-007 §2), so the answer is `present: false,
// onThisNode: false` — never a fabricated path and never a fetch from the worker.
//
// The file name is checked by the layout's one grammar (`diagramFile`, FF-13302) before any read,
// so a request can name nothing outside the item's `diagrams/` folder. The bytes travel base64 in
// the result because a PNG is binary; the `--json` face drops them and prints the path.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { commandError } from "../../command-error.mjs";
import { DIAGRAM_FILE_EXTS, diagramFile } from "../../diagrams/layout.mjs";
import { resolveItemExact } from "../resolve.mjs";

const CONTENT_TYPES = Object.freeze({
  ".html": "text/html; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
});

export const diagramFileCommand = {
  id: "diagram:file",
  input: {
    type: "object",
    properties: {
      ref: { type: "string" },
      file: { type: "string" },
    },
    required: ["ref", "file"],
    additionalProperties: false,
  },

  async run(input, ctx) {
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    const item = await resolveItemExact(ctx, ref);
    if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);

    const local = typeof item.dir === "string" && item.dir.length > 0;
    const file = diagramFile(local ? item.dir : "", input.file);
    if (file == null) {
      throw commandError(
        `"${input.file}" is not a diagram file — expected ADR-NNN-<slug> with ${DIAGRAM_FILE_EXTS.join(", ")}.`,
        "diagram-file-invalid",
        400,
      );
    }
    const contentType = CONTENT_TYPES[file.ext];
    if (!local) {
      return { ref: item.ref, file: file.name, contentType, present: false, onThisNode: false, reportedBy: item.reportedBy ?? null };
    }

    const absolute = path.resolve(file.path);
    try {
      const bytes = await readFile(absolute);
      return { ref: item.ref, file: file.name, contentType, present: true, onThisNode: true, path: absolute, body: bytes.toString("base64") };
    } catch (error) {
      if (error.code === "ENOENT") return { ref: item.ref, file: file.name, contentType, present: false, onThisNode: true, path: absolute };
      throw error;
    }
  },

  cli: {
    route: ["diagram", "file"],
    spec: {
      usage: "aof diagram file <ref> <ADR-NNN-slug.html|.svg|.png> [--json]",
    },

    argv: (positionals) => ({ ref: positionals[0], file: positionals[1] }),

    exit: (result) => (result.present ? 0 : 1),

    render(result) {
      if (result.present) return result.path;
      if (!result.onThisNode) return `${result.ref} ${result.file} — not on this node${result.reportedBy ? ` (held by ${result.reportedBy})` : ""}`;
      return `${result.ref} ${result.file} — absent (${result.path})`;
    },

    // The bytes are for the board; a terminal gets the envelope without them.
    json: ({ body, ...envelope }) => envelope,
  },
};
