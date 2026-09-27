// diagram:export — `aof diagram export <ref> <ADR-NNN>` (milestone 133, ADR-004 §3, ADR-005). The
// architect has drawn one source file; export writes its SVG through the generator's adapter, then
// its PNG through a browser aof finds, and returns the exact block the architect pastes under the
// ADR. aof never edits `ARCHITECTURE.md` — the architect is its single writer (ADR-003 §3).
//
// A PNG FAILURE NEVER COSTS THE SVG (ADR-005 §4): the SVG is written first and never rolled back,
// and a PNG miss answers the partial envelope `{ written, block, png: { ok: false, code, fix } }`
// AND exits non-zero, so a script sees what landed and a shell sees the failure. The doctor lane
// keeps the item red until a node with a browser exports it.
//
// Every refusal is decided BEFORE the first write (ref → off → ADR id → heading → delivered →
// source → SVG shape), so a refused export leaves the tree exactly as it found it.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { commandError } from "../../command-error.mjs";
import { resolveWorkDiagrams } from "../../config-inspect.mjs";
import { generatorFor } from "../../diagrams/generators.mjs";
import { assertAdrId, diagramPaths, diagramsDir, findDiagramSources, readAdrTitle, renderDiagramBlock } from "../../diagrams/layout.mjs";
import { findBrowser, rasterizeSvg } from "../../diagrams/rasterize.mjs";
import { requireLocalCheckout, resolveItemExact } from "../resolve.mjs";

async function readText(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") return "";
    throw error;
  }
}

async function listNames(dir) {
  try {
    return await readdir(dir);
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

const toPosix = (value) => value.replace(/\\/g, "/");

export const diagramExportCommand = {
  id: "diagram:export",
  input: {
    type: "object",
    properties: { ref: { type: "string" }, adr: { type: "string" } },
    required: ["ref", "adr"],
    additionalProperties: false,
  },

  // `ctx.diagramRasterizer` carries the rasterizer's injectables (`spawn`, `now`, `sleep`, `stat`,
  // `tmp`) and `ctx.env` the ladder's environment; a face passes neither, so the CLI uses the real
  // ones. That is what lets a suite drive the PNG step in-process with a fake browser.
  async run(input, ctx) {
    const { projectRoot, config } = ctx.workspace;
    const ref = typeof input.ref === "string" ? input.ref.trim() : "";
    const item = await resolveItemExact(ctx, ref);
    if (!item) throw commandError(`No item resolves to ref "${ref}".`, "ref-not-found", 404);

    const diagrams = resolveWorkDiagrams(config);
    if (!diagrams.enabled) {
      throw commandError("Diagrams are off for this project (work.diagrams is unset, off, or invalid), so there is nothing to export.", "diagram-disabled", 409);
    }
    requireLocalCheckout(item, ref);
    assertAdrId(input.adr);
    const title = readAdrTitle(await readText(path.join(item.dir, "ARCHITECTURE.md")), input.adr);
    if (title == null) {
      throw commandError(`${item.ref} has no "## ${input.adr}" heading in its ARCHITECTURE.md.`, "diagram-adr-unknown", 404);
    }
    if (item.status === "done") {
      throw commandError(`${item.ref} is done, and a delivered ADR's diagram is immutable — a changed design is a new ADR.`, "diagram-item-delivered", 409);
    }

    const generator = generatorFor(diagrams.generator);
    const itemRel = toPosix(path.relative(projectRoot, item.dir));
    const relDir = diagramsDir(itemRel);
    const sources = findDiagramSources(await listNames(path.resolve(projectRoot, relDir)), input.adr, generator.sourceExt);
    if (sources.length === 0) {
      throw commandError(`${relDir} holds no ${input.adr}-*${generator.sourceExt} source to export. Draw it first (aof diagram plan).`, "diagram-source-missing", 404);
    }
    if (sources.length > 1) {
      throw commandError(
        `${relDir} holds ${sources.length} ${input.adr} sources — ${sources.map((source) => source.name).join(", ")}. An ADR has one diagram; remove the others.`,
        "diagram-source-ambiguous",
        409,
      );
    }
    const { stem } = sources[0];
    const paths = diagramPaths(itemRel, stem, generator.sourceExt, diagrams.formats);
    const abs = (rel) => path.resolve(projectRoot, rel);
    const svg = generator.toSvg(await readFile(abs(paths.source), "utf8"));

    await mkdir(abs(paths.dir), { recursive: true });
    await writeFile(abs(paths.svg), svg, "utf8");
    const written = [paths.svg];
    const block = renderDiagramBlock({ adrId: input.adr, title, stem, sourceExt: generator.sourceExt, formats: diagrams.formats });
    if (!diagrams.formats.includes("png")) return { written, block };

    const browser = findBrowser({ configured: diagrams.browser, env: ctx.env ?? process.env });
    if (!browser.ok) return { written, block, png: { ok: false, code: browser.code, message: browser.message, fix: browser.fix } };
    const rendered = await rasterizeSvg({ ...(ctx.diagramRasterizer ?? {}), svgPath: abs(paths.svg), pngPath: abs(paths.png), browser });
    if (!rendered.ok) {
      const { ok, code, fix, exitCode, stderr } = rendered;
      return { written, block, png: { ok, code, fix, ...(exitCode === undefined ? {} : { exitCode, stderr }) } };
    }
    written.push(paths.png);
    return { written, block, png: { ok: true, rung: browser.rung, browser: toPosix(browser.path) } };
  },

  cli: {
    route: ["diagram", "export"],
    spec: {
      usage: "aof diagram export <ref> <ADR-NNN> [--json]",
    },

    argv: (positionals) => ({ ref: positionals[0], adr: positionals[1] }),

    // A PNG miss is a partial result AND a failure: the envelope still prints, the exit is non-zero.
    exit: (result) => (result.png != null && result.png.ok === false ? 1 : 0),

    render(result) {
      const lines = result.written.map((file) => `wrote ${file}`);
      if (result.png?.ok === false) {
        lines.push(`PNG not written (${result.png.code}) — ${result.png.message ?? result.png.fix}`);
        if (result.png.message) lines.push(`  ${result.png.fix}`);
      }
      lines.push("", "Paste this under the ADR:", "", result.block);
      return lines.join("\n");
    },

    json: (result) => result,
  },
};
