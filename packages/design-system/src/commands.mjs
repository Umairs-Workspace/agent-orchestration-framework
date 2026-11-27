// The design-system verbs — `aof design-system tokens|check|use`, the deterministic half of
// `/aof:design-system extract` (198/ADR-003) and, with `tokens --merge`, of verify's re-sync of an
// owned system (198/ADR-007, story 03), and `aof design-system mocks import|capture`, the
// deterministic half of refine's canvas step (198/ADR-006, story 02). The prose calls the Artifact
// tool and then a verb, and reads the verb's `--json` answer; every parse, comparison, config write
// and file assembly is here.
//
// Collaborators are injected by core (`commandError`; the work stream's `listItemsCacheFirst` and
// `requireLocalCheckout`; the rasterizer's `rasterizePage` and `findBrowser`), so the package owns
// the schema, argv, behaviour and rendering and spawns nothing (FF-19804): capture reaches a browser
// only through the page entry core hands it. Ids take the `design-system:` prefix, under the route
// `["design-system", <verb>]` or `["design-system", "mocks", <verb>]`.
//
// Only the descriptors load with the registry: each verb imports its implementation when it RUNS, so
// a CLI path that never touches a design system pays nothing for it (FF-16004). No module of this
// package reaches the network (FF-19804): `tokens`, `check` and `use` work on local files alone, and
// none of them resolves a system's name, which is the session's one list call (ADR-005 §4).
import path from "node:path";

const lazy = {
  fs: () => import("node:fs/promises"),
  tokens: () => import("./tokens.mjs"),
  check: () => import("./check.mjs"),
  config: () => import("./config.mjs"),
  json: () => import("@aof/foundation/fs"),
  mocks: () => import("./mocks.mjs"),
  os: () => import("node:os"),
};

const ROUTE = ["design-system"];
const PREFIX = "aof design-system";
// The modes, inline rather than imported from ./config.mjs, so the input schema costs no module load.
// The package suite asserts the two agree.
export const USE_MODES = Object.freeze(["owned", "reference"]);

const toPosix = (value) => String(value).replaceAll("\\", "/");

// A file the operator named, as the project root resolves it, and how the answer names it.
function located(projectRoot, file) {
  const absolute = path.resolve(projectRoot, toPosix(file));
  const relative = toPosix(path.relative(projectRoot, absolute));
  return { absolute, shown: relative === "" || relative.startsWith("../") || path.isAbsolute(relative) ? toPosix(file) : relative };
}

const listOf = (value) => (value == null ? [] : Array.isArray(value) ? value.map(String) : [String(value)]);

export function createDesignSystemCommands({ commandError, listItemsCacheFirst, requireLocalCheckout, rasterizePage, findBrowser }) {
  const refuse = (message, code) => commandError(message, code, 400);

  // The milestone `--item` names, and its mocks/ directory. Mocks belong to a milestone (Q6): its
  // folder is the one DESIGN.md and the judge read. A row only the mesh cache knows has no folder
  // here, and `requireLocalCheckout` refuses it.
  async function milestoneMocks(ctx, ref) {
    const { MOCKS_DIR } = await lazy.mocks();
    const rows = await listItemsCacheFirst(ctx.workspace, { globalWorkStoreOptions: ctx.globalWorkStoreOptions ?? {} });
    const item = rows.find((row) => row.ref === ref);
    if (!item) throw commandError(`No item "${ref}" exists in the work stream.`, "ref-not-found", 404);
    if (item.type !== "milestone" || item.parent != null) {
      throw refuse(`"${ref}" is a ${item.type}: mocks belong to a milestone, whose folder holds mocks/. Pass the milestone's ref.`, "design-system-mocks-not-a-milestone");
    }
    requireLocalCheckout(item, ref);
    const dir = path.resolve(ctx.workspace.projectRoot, item.dir, MOCKS_DIR);
    return { ref, dir, shown: toPosix(path.relative(ctx.workspace.projectRoot, dir)) };
  }

  // Every file under `root`, as sorted relative POSIX paths, or null when `root` is not a directory.
  async function filesUnder(root) {
    const { readdir, stat } = await lazy.fs();
    if (!(await stat(root).catch(() => null))?.isDirectory()) return null;
    const out = [];
    const walk = async (dir) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const child = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(child);
        else if (entry.isFile()) out.push(toPosix(path.relative(root, child)));
      }
    };
    await walk(root);
    return out.sort();
  }

  async function readOrNull(file) {
    const { readFile } = await lazy.fs();
    return readFile(file, "utf8").catch(() => null);
  }

  async function readCss(projectRoot, files) {
    const { readFile } = await lazy.fs();
    return Promise.all(files.map(async (file) => {
      const { absolute, shown } = located(projectRoot, file);
      try {
        return { file: shown, text: await readFile(absolute, "utf8") };
      } catch {
        throw refuse(`Cannot read "${toPosix(file)}": no such file, or it is not readable.`, "design-system-unreadable");
      }
    }));
  }

  // Every exported mock (`.dc.html` and `.html`) under each directory, depth first, in name order.
  async function readMocks(projectRoot, dirs) {
    const { readdir, readFile, stat } = await lazy.fs();
    const mocks = [];
    const walk = async (absolute) => {
      const entries = (await readdir(absolute, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        const child = path.join(absolute, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== "node_modules" && entry.name !== ".git") await walk(child);
        } else if (entry.isFile() && /\.html$/i.test(entry.name)) {
          mocks.push({ file: toPosix(path.relative(projectRoot, child)), text: await readFile(child, "utf8") });
        }
      }
    };
    for (const dir of dirs) {
      const { absolute } = located(projectRoot, dir);
      const info = await stat(absolute).catch(() => null);
      if (!info?.isDirectory()) throw refuse(`Cannot read the mocks directory "${toPosix(dir)}": it is not a directory.`, "design-system-unreadable");
      await walk(absolute);
    }
    return mocks;
  }

  // `tokens --merge` (198/03): re-sync a system's tokens.json from the code into `--out`. The code
  // is the CSS files given, else the configured `source`, as `check` reads it (Q3). Nothing is
  // written over a source file (Q12): `--out` is checked against every source before anything else
  // is read, because the direction is code to system only (ADR-007).
  async function mergeRun(input, ctx) {
    const { projectRoot, config } = ctx.workspace;
    const [{ readTokens, mergeTokens }, { tokenFaults }, { designSystemBlockOf }, { readFile, writeFile, mkdir }, { formatJson }] = await Promise.all([lazy.tokens(), lazy.check(), lazy.config(), lazy.fs(), lazy.json()]);
    if (input.out === undefined) throw refuse(`"--merge" writes the merged system to a file: pass "--out <file>". Nothing was written.`, "design-system-merge-no-out");
    const configured = designSystemBlockOf(config)?.source;
    const source = input.files.length > 0 ? input.files : (Array.isArray(configured) ? configured.map(String) : []);
    if (source.length === 0) {
      throw refuse("There is no code to merge from: pass the CSS files (as check's --source), or configure work.ui.designSystem.source. Nothing was written.", "design-system-no-source");
    }
    const out = located(projectRoot, input.out);
    const hit = source.find((file) => located(projectRoot, file).absolute === out.absolute);
    if (hit !== undefined) throw refuse(`"--out ${toPosix(input.out)}" is refused: "${toPosix(hit)}" is a source file, and nothing writes from a system back to the code. Nothing was written.`, "design-system-merge-out-is-source");
    const systemFile = toPosix(input.merge);
    let text;
    try {
      text = await readFile(located(projectRoot, input.merge).absolute, "utf8");
    } catch {
      throw refuse(`Cannot read the system's tokens file "${systemFile}": it cannot be read. Nothing was written.`, "design-system-tokens-unreadable");
    }
    let system;
    try {
      system = JSON.parse(text);
    } catch {
      throw refuse(`The system's tokens file "${systemFile}" is not JSON. Nothing was written.`, "design-system-tokens-not-json");
    }
    const faults = tokenFaults(system);
    if (faults.length > 0) throw refuse(`The system's tokens file "${systemFile}" is not in the Design System's shape: ${faults.join("; ")}. Nothing was written.`, "design-system-tokens-shape");
    const code = readTokens(await readCss(projectRoot, source));
    const paths = source.map((file) => located(projectRoot, file).shown);
    const merged = mergeTokens(system, code, { ...(input.ref !== undefined ? { ref: input.ref } : {}), paths });
    await mkdir(path.dirname(out.absolute), { recursive: true });
    await writeFile(out.absolute, formatJson(merged.document, text), "utf8");
    return { merged: out.shown, system: systemFile, source: paths, changed: merged.changed, added: merged.added, removed: merged.removed, unplaced: merged.unplaced };
  }

  const tokensCommand = {
    id: "design-system:tokens",
    input: {
      type: "object",
      properties: {
        files: { type: "array", items: { type: "string" } },
        mocks: { type: "array", items: { type: "string" } },
        merge: { type: "string" },
        out: { type: "string" },
        ref: { type: "string" },
      },
      required: ["files"],
      additionalProperties: false,
    },
    async run(input, ctx) {
      const projectRoot = ctx.workspace.projectRoot;
      if (input.merge !== undefined) {
        // A merge reads the code alone (ADR-004 §2 is extraction's): a mock-only colour is the
        // operator's to accept at extraction, never one a re-sync adds behind their back.
        if (input.mocks !== undefined) throw refuse(`"--mocks" does not combine with "--merge": a re-sync reads the code alone. Nothing was written.`, "usage");
        return mergeRun(input, ctx);
      }
      if (input.out !== undefined || input.ref !== undefined) throw refuse(`"--out" and "--ref" belong to "--merge": ${PREFIX} tokens [<css-file>…] --merge <tokens.json> --out <file> [--ref <commit>].`, "usage");
      if (input.files.length === 0) throw refuse(`Usage: ${PREFIX} tokens <css-file>… [--mocks <dir>]…`, "usage");
      const [{ readTokens, mockOnly }, css] = await Promise.all([lazy.tokens(), readCss(projectRoot, input.files)]);
      const tokens = readTokens(css);
      if (input.mocks === undefined) return tokens;
      return { ...tokens, mockOnly: mockOnly(tokens, await readMocks(projectRoot, input.mocks)) };
    },
    cli: {
      route: [...ROUTE, "tokens"],
      spec: {
        usage: `${PREFIX} tokens <css-file>… [--mocks <dir>]… [--json] | ${PREFIX} tokens [<css-file>…] --merge <tokens.json> --out <file> [--ref <commit>] [--json]`,
        flags: {
          mocks: { type: "string", repeatable: true, description: "a directory of exported .dc.html/.html mocks; lists the colours only a mock paints" },
          merge: { type: "string", description: "a system's tokens.json to re-sync from the code (default code: work.ui.designSystem.source)" },
          out: { type: "string", description: "where --merge writes the merged tokens.json; never a source file" },
          ref: { type: "string", description: "the commit --merge records as meta.source.ref" },
        },
      },
      argv: (positionals, options = {}) => {
        if (positionals.length === 0 && options.merge == null) throw refuse(`Usage: ${PREFIX} tokens <css-file>… [--mocks <dir>]…`, "usage");
        return {
          files: positionals.map(String),
          ...(options.mocks != null ? { mocks: listOf(options.mocks) } : {}),
          ...(options.merge != null ? { merge: String(options.merge) } : {}),
          ...(options.out != null ? { out: String(options.out) } : {}),
          ...(options.ref != null ? { ref: String(options.ref) } : {}),
        };
      },
      render: (result) => (result.merged !== undefined ? renderMerge(result) : renderTokens(result)),
      json: (result) => result,
    },
  };

  const checkCommand = {
    id: "design-system:check",
    input: {
      type: "object",
      properties: {
        tokens: { type: "string" },
        source: { type: "array", items: { type: "string" } },
      },
      required: ["tokens"],
      additionalProperties: false,
    },
    async run(input, ctx) {
      const { projectRoot, config } = ctx.workspace;
      const [{ readTokens }, { compareTokens, tokenFaults }, { designSystemBlockOf }, { readFile }] = await Promise.all([lazy.tokens(), lazy.check(), lazy.config(), lazy.fs()]);
      const configured = designSystemBlockOf(config)?.source;
      const source = input.source ?? (Array.isArray(configured) ? configured.map(String) : []);
      if (source.length === 0) {
        throw refuse("There is no code to compare the system with: pass --source <file>, or configure work.ui.designSystem.source.", "design-system-no-source");
      }
      const tokensFile = toPosix(input.tokens);
      let text;
      try {
        text = await readFile(located(projectRoot, input.tokens).absolute, "utf8");
      } catch {
        throw refuse(`Cannot read the tokens file "${tokensFile}": it cannot be read.`, "design-system-tokens-unreadable");
      }
      let system;
      try {
        system = JSON.parse(text);
      } catch {
        throw refuse(`The tokens file "${tokensFile}" is not JSON.`, "design-system-tokens-not-json");
      }
      const faults = tokenFaults(system);
      if (faults.length > 0) {
        throw refuse(`The tokens file "${tokensFile}" is not in the Design System's shape: ${faults.join("; ")}.`, "design-system-tokens-shape");
      }
      const code = readTokens(await readCss(projectRoot, source));
      return { tokens: tokensFile, source: source.map(toPosix), ...compareTokens(system, code) };
    },
    cli: {
      route: [...ROUTE, "check"],
      spec: {
        usage: `${PREFIX} check --tokens <tokens.json> [--source <css-file>]… [--json]`,
        flags: {
          tokens: { type: "string", description: "the system's tokens.json, in the Design System's shape" },
          source: { type: "string", repeatable: true, description: "a CSS file to compare with (default: work.ui.designSystem.source)" },
        },
      },
      argv: (_positionals, options = {}) => {
        if (options.tokens == null) throw refuse(`Usage: ${PREFIX} check --tokens <tokens.json> [--source <css-file>]…`, "usage");
        return { tokens: String(options.tokens), ...(options.source != null ? { source: listOf(options.source) } : {}) };
      },
      render: renderCheck,
      json: (result) => result,
      exit: (result) => (result.drift ? 1 : 0),
    },
  };

  const useCommand = {
    id: "design-system:use",
    input: {
      type: "object",
      properties: {
        name: { type: "string" },
        artifact: { type: "string" },
        mode: { type: "string" },
        source: { type: "array", items: { type: "string" } },
      },
      additionalProperties: false,
    },
    async run(input, ctx) {
      const { projectRoot, configPath } = ctx.workspace;
      const [{ designSystemBlock, designSystemBlockOf, designSystemDiagnostics, isArtifactLink, normaliseSourcePath }, { readFile, stat, writeFile }, { formatJson }] = await Promise.all([lazy.config(), lazy.fs(), lazy.json()]);
      const { name, artifact, mode } = input;
      if (name !== undefined && artifact !== undefined) throw refuse('A system is named by "--name" or "--artifact", not both.', "design-system-name-and-artifact");
      if (name === undefined && artifact === undefined) throw refuse('"--name" or "--artifact" is required: give the system\'s title, or its claude.ai link.', "design-system-unnamed");
      if (name !== undefined && name.trim() === "") throw refuse("The name is empty: give the system's title.", "design-system-empty-name");
      if (artifact !== undefined && !isArtifactLink(artifact)) throw refuse(`"${artifact}" is not a claude.ai artifact link: https://claude.ai/artifact/<id> or https://claude.ai/code/artifact/<uuid>.`, "design-system-bad-artifact");
      if (!USE_MODES.includes(mode)) throw refuse(`The mode is "owned" or "reference"${mode === undefined ? ": pass --mode" : `, not "${mode}"`}.`, "design-system-bad-mode");
      if (mode === "owned" && (input.source ?? []).length === 0) throw refuse('"owned" needs "--source": the CSS files the system is synced from.', "design-system-source-missing");
      if (mode === "reference" && input.source !== undefined) throw refuse('"reference" takes no "--source": a referenced system is synced by its owner.', "design-system-source-stray");
      let source;
      if (input.source !== undefined) {
        source = [];
        for (const raw of input.source) {
          const given = normaliseSourcePath(raw);
          const absolute = path.resolve(projectRoot, given);
          const relative = toPosix(path.relative(projectRoot, absolute));
          if (relative === "" || relative === ".." || relative.startsWith("../") || path.isAbsolute(relative)) {
            throw refuse(`"${given}" leaves the project root: a source is a path inside the project.`, "design-system-source-outside");
          }
          if (!(await stat(absolute).catch(() => null))?.isFile()) throw refuse(`"${given}" does not exist.`, "design-system-source-absent");
          source.push(relative);
        }
      }
      const block = designSystemBlock({ name, artifact, mode, source });
      const [problem] = designSystemDiagnostics(block);
      if (problem) throw refuse(problem.message, problem.code);

      let previousText;
      try {
        previousText = await readFile(configPath, "utf8");
      } catch {
        throw refuse(`There is no project config at "${toPosix(configPath)}" to write: run "aof init" first.`, "design-system-no-config");
      }
      let config;
      try {
        config = JSON.parse(previousText);
      } catch {
        throw refuse(`The project config "${toPosix(configPath)}" is not JSON, so it was not written.`, "design-system-config-unreadable");
      }
      const previous = designSystemBlockOf(config) ?? null;
      const shown = toPosix(path.relative(projectRoot, configPath));
      if (JSON.stringify(previous) === JSON.stringify(block)) return { config: shown, block, previous, changed: false };
      const isObject = (value) => value != null && typeof value === "object" && !Array.isArray(value);
      const work = isObject(config.work) ? config.work : {};
      const ui = isObject(work.ui) ? work.ui : {};
      const next = { ...config, work: { ...work, ui: { ...ui, designSystem: block } } };
      await writeFile(configPath, formatJson(next, previousText), "utf8");
      return { config: shown, block, previous, changed: true };
    },
    cli: {
      route: [...ROUTE, "use"],
      spec: {
        usage: `${PREFIX} use --name <title> | --artifact <link> --mode owned|reference [--source <css-file>]… [--json]`,
        flags: {
          name: { type: "string", description: "the system's title, as the operator sees it" },
          artifact: { type: "string", description: "the system's claude.ai artifact link" },
          mode: { type: "string", description: `${USE_MODES.join(" or ")}` },
          source: { type: "string", repeatable: true, description: "a CSS file an owned system is synced from" },
        },
      },
      argv: (_positionals, options = {}) => ({
        ...(options.name != null ? { name: String(options.name) } : {}),
        ...(options.artifact != null ? { artifact: String(options.artifact) } : {}),
        ...(options.mode != null ? { mode: String(options.mode) } : {}),
        ...(options.source != null ? { source: listOf(options.source) } : {}),
      }),
      render: (result) => {
        const named = result.block.name !== undefined ? `"${result.block.name}"` : result.block.artifact;
        const from = result.block.source ? `, from ${result.block.source.join(", ")}` : "";
        return result.changed
          ? `work.ui.designSystem now names ${named} (${result.block.mode}${from}) in ${result.config}.`
          : `work.ui.designSystem already names ${named} (${result.block.mode}${from}): ${result.config} is unchanged.`;
      },
      json: (result) => result,
    },
  };

  const mocksImportCommand = {
    id: "design-system:mocks-import",
    input: {
      type: "object",
      properties: {
        pulled: { type: "string" },
        item: { type: "string" },
        canvas: { type: "string" },
        canvasVersion: { type: "string" },
        system: { type: "string" },
        systemVersion: { type: "string" },
        approval: { type: "string" },
      },
      required: ["pulled", "item"],
      additionalProperties: false,
    },
    async run(input, ctx) {
      const [{ isArtifactLink }, mocks, { readFile, mkdir, copyFile, rm, writeFile }] = await Promise.all([lazy.config(), lazy.mocks(), lazy.fs()]);
      // The approval first: without one there is nothing to import, whatever else is wrong (ADR-002 §3).
      if (input.approval === undefined || input.approval.trim() === "") {
        throw refuse('A mock becomes a baseline only once the operator has approved it: pass "--approval" with the approving answer\'s reference ("run <runId> ask <n>", or "session <sessionId> <instant>"). Nothing was written.', "design-system-mocks-unapproved");
      }
      for (const [flag, value] of [["--canvas", input.canvas], ["--system", input.system]]) {
        if (!isArtifactLink(value)) {
          throw refuse(`${flag} ${value === undefined ? "is required" : `"${value}" is refused`}: the link is not a claude.ai artifact link (https://claude.ai/artifact/<id> or https://claude.ai/code/artifact/<uuid>). Nothing was written.`, "design-system-mocks-bad-link");
        }
      }
      for (const [flag, value, whose] of [["--canvas-version", input.canvasVersion, "canvas's"], ["--system-version", input.systemVersion, "system's"]]) {
        if (value === undefined || value.trim() === "") throw refuse(`${flag} is refused: the ${whose} version is empty. Pass the version the read-back answered. Nothing was written.`, "design-system-mocks-empty-version");
      }
      const target = await milestoneMocks(ctx, input.item);
      const pulledRoot = path.resolve(ctx.workspace.projectRoot, toPosix(input.pulled));
      const pulled = await filesUnder(pulledRoot);
      if (pulled == null) throw refuse(`Cannot read the pulled canvas "${toPosix(input.pulled)}": it is not a directory. Nothing was written.`, "design-system-unreadable");
      const provenance = {
        canvas: input.canvas, canvasVersion: input.canvasVersion.trim(),
        system: input.system, systemVersion: input.systemVersion.trim(),
        approval: input.approval.trim(),
      };
      const date = new Date().toISOString().slice(0, 10);
      const readmePath = path.join(target.dir, mocks.README);
      const { refusal, plan } = mocks.planImport({
        pulled,
        canvasText: pulled.includes(mocks.CANVAS) ? await readFile(path.join(pulledRoot, mocks.CANVAS), "utf8") : null,
        existing: (await filesUnder(target.dir)) ?? [],
        readme: await readOrNull(readmePath),
        provenance,
        date,
      });
      if (refusal) throw refuse(refusal.message, refusal.code);

      const shown = (rel) => `${target.shown}/${rel}`;
      const answer = { item: target.ref, mocks: target.shown, canvas: { link: provenance.canvas, version: provenance.canvasVersion }, system: { link: provenance.system, version: provenance.systemVersion }, approval: provenance.approval };
      if (mocks.sameImport(plan.previous, provenance)) {
        const same = await Promise.all(plan.copies.map(async ({ from, to }) => {
          const [incoming, present] = await Promise.all([readFile(path.join(pulledRoot, from)), readFile(path.join(target.dir, to)).catch(() => null)]);
          return present != null && incoming.equals(present);
        }));
        if (same.every(Boolean) && plan.remove.length === 0) return { ...answer, changed: false, written: [], removed: [] };
      }
      await mkdir(target.dir, { recursive: true });
      for (const rel of plan.remove) await rm(path.join(target.dir, rel), { force: true });
      for (const { from, to } of plan.copies) {
        await mkdir(path.dirname(path.join(target.dir, to)), { recursive: true });
        await copyFile(path.join(pulledRoot, from), path.join(target.dir, to));
      }
      await writeFile(readmePath, plan.readme, "utf8");
      return { ...answer, changed: true, date, written: [...plan.files, mocks.README].map(shown), removed: plan.remove.map(shown) };
    },
    cli: {
      route: [...ROUTE, "mocks", "import"],
      spec: {
        usage: `${PREFIX} mocks import <pulled-dir> --item <milestone> --canvas <link> --canvas-version <v> --system <link> --system-version <v> --approval <reference> [--json]`,
        flags: {
          item: { type: "string", description: "the milestone whose mocks/ receives the canvas" },
          canvas: { type: "string", description: "the approved canvas's claude.ai artifact link" },
          canvasVersion: { type: "string", description: "the canvas version the operator approved" },
          system: { type: "string", description: "the resolved design system's claude.ai artifact link" },
          systemVersion: { type: "string", description: "the design system's version installed in the canvas" },
          approval: { type: "string", description: "the approving answer's reference: run <runId> ask <n>, or session <sessionId> <instant>" },
        },
      },
      argv: (positionals, options = {}) => {
        if (positionals.length !== 1 || options.item == null) throw refuse(`Usage: ${PREFIX} mocks import <pulled-dir> --item <milestone> --canvas <link> --canvas-version <v> --system <link> --system-version <v> --approval <reference>`, "usage");
        const text = (value) => (value == null ? undefined : String(value));
        return Object.fromEntries(Object.entries({
          pulled: String(positionals[0]), item: String(options.item),
          canvas: text(options.canvas), canvasVersion: text(options.canvasVersion),
          system: text(options.system), systemVersion: text(options.systemVersion),
          approval: text(options.approval),
        }).filter(([, value]) => value !== undefined));
      },
      render: (result) => (result.changed
        ? [`Imported version ${result.canvas.version} of ${result.canvas.link} into ${result.mocks}/, approved by ${result.approval}:`, ...result.written.map((file) => `  ${file}`), ...(result.removed.length > 0 ? ["Removed from the previous import:", ...result.removed.map((file) => `  ${file}`)] : []), `Next: ${PREFIX} mocks capture --item ${result.item}`].join("\n")
        : `${result.mocks}/ already holds version ${result.canvas.version} of ${result.canvas.link}, as approved by ${result.approval}: the import is unchanged.`),
      json: (result) => result,
    },
  };

  const mocksCaptureCommand = {
    id: "design-system:mocks-capture",
    input: {
      type: "object",
      properties: { item: { type: "string" } },
      required: ["item"],
      additionalProperties: false,
    },
    async run(input, ctx) {
      const [mocks, { readFile, mkdtemp, copyFile, rm, writeFile }, os] = await Promise.all([lazy.mocks(), lazy.fs(), lazy.os()]);
      const target = await milestoneMocks(ctx, input.item);
      const readmePath = path.join(target.dir, mocks.README);
      const readme = await readOrNull(readmePath);
      const { refusal, frames } = mocks.planCapture({ readme, canvasText: await readOrNull(path.join(target.dir, "canvas.json")), existing: (await filesUnder(target.dir)) ?? [] });
      if (refusal) throw refuse(refusal.message, refusal.code);
      const browser = findBrowser({ configured: ctx.workspace.config?.work?.diagrams?.browser ?? null, env: ctx.env ?? process.env });
      if (!browser.ok) throw refuse(`${browser.message} ${browser.fix} Nothing was captured.`, browser.code);

      // Every board is framed into a scratch directory first, so a board the browser fails on
      // leaves mocks/ and its README exactly as they were: no partial table (E17's sibling).
      const scratch = await mkdtemp(path.join(os.tmpdir(), "aof-mocks-capture-"));
      try {
        for (const frame of frames) {
          const rendered = await rasterizePage({
            ...(ctx.designSystemRasterizer ?? {}),
            pagePath: path.join(target.dir, frame.board),
            pngPath: path.join(scratch, frame.frame),
            width: frame.width,
            height: frame.height,
            scale: mocks.CAPTURE_SCALE,
            browser,
          });
          if (!rendered.ok) {
            const exit = rendered.exitCode != null ? `exited ${rendered.exitCode}` : rendered.code === "diagram-png-render-timeout" ? "wrote no complete frame in time" : "could not be run";
            const said = rendered.stderr ? ` (${rendered.stderr})` : "";
            throw refuse(`"${frame.board}" was not framed: the browser at ${browser.path} ${exit}${said}. ${rendered.fix} Nothing was captured, and ${target.shown}/${mocks.README} is unchanged.`, "design-system-mocks-capture-failed");
          }
        }
        for (const frame of frames) await copyFile(path.join(scratch, frame.frame), path.join(target.dir, frame.frame));
        await writeFile(readmePath, mocks.withFrames(readme, frames), "utf8");
      } finally {
        await rm(scratch, { recursive: true, force: true });
      }
      return { item: target.ref, mocks: target.shown, scale: mocks.CAPTURE_SCALE, browser: browser.path, frames: frames.map((frame) => ({ ...frame, frame: `${target.shown}/${frame.frame}` })) };
    },
    cli: {
      route: [...ROUTE, "mocks", "capture"],
      spec: {
        usage: `${PREFIX} mocks capture --item <milestone> [--json]`,
        flags: {
          item: { type: "string", description: "the milestone whose imported canvas is framed" },
        },
      },
      argv: (_positionals, options = {}) => {
        if (options.item == null) throw refuse(`Usage: ${PREFIX} mocks capture --item <milestone>`, "usage");
        return { item: String(options.item) };
      },
      render: (result) => [`Framed ${result.frames.length} board${result.frames.length === 1 ? "" : "s"} at scale ${result.scale}, recorded in ${result.mocks}/README.md:`, ...result.frames.map((frame) => `  ${frame.frame}  ${frame.width}x${frame.height}  (${frame.board})`)].join("\n"),
      json: (result) => result,
    },
  };

  return { tokensCommand, checkCommand, useCommand, mocksImportCommand, mocksCaptureCommand };
}

// ── rendering ──────────────────────────────────────────────────────────────────────────────────

function renderTokens(result) {
  const section = (title, lines) => [`${title}:`, ...(lines.length > 0 ? lines : ["  (none)"])].join("\n");
  const themes = result.color.themes.map((theme) => theme.id);
  const colour = (value) => themes.filter((theme) => value[theme] !== undefined).map((theme) => (themes.length > 1 ? `${theme} ${value[theme]}` : value[theme])).join(" · ");
  const sections = [
    section(`Colour (${result.color.tokens.length}; themes ${themes.join(", ") || "none"})`, result.color.tokens.map((token) => `  ${token.name}  ${colour(token.value)}`)),
    section(`Type families (${Object.keys(result.type.families).length})`, Object.entries(result.type.families).map(([key, stack]) => `  ${key}  ${stack}`)),
    section(`Type styles (${result.type.groups.reduce((sum, group) => sum + group.styles.length, 0)})`, result.type.groups.flatMap((group) => group.styles.map((style) => `  ${group.name} / ${style.name}  ${["fontSize", "lineHeight", "letterSpacing", "fontWeight"].filter((field) => style[field] !== undefined).map((field) => `${field} ${style[field]}`).join(", ")}`))),
    section(`Spacing (${result.spacing.tokens.length})`, result.spacing.tokens.map((token) => `  ${token.name}  ${token.value}`)),
    section(`Radius (${result.radius.tokens.length})`, result.radius.tokens.map((token) => `  ${token.name}  ${token.value}`)),
    section(`Shadow (${result.shadow.tokens.length})`, result.shadow.tokens.map((token) => `  ${token.name}  ${token.value}`)),
  ];
  if (result.mockOnly !== undefined) {
    sections.push(section(`Only in a mock (${result.mockOnly.length})`, result.mockOnly.map((entry) => `  ${entry.value}  in ${entry.files.join(", ")}`)));
  }
  sections.push(section(`Not placed (${result.unplaced.length})`, result.unplaced.map((entry) => `  ${entry.property}  ${entry.file}:${entry.line}  ${entry.reason}`)));
  return sections.join("\n\n");
}

function renderMerge(result) {
  const where = (entry) => (entry.theme !== undefined ? ` [${entry.theme}]` : entry.field !== undefined ? ` [${entry.field}]` : "");
  const shown = (value) => (value == null ? "(none)" : typeof value === "string" ? value : JSON.stringify(value));
  const section = (title, lines) => [`${title} (${lines.length}):`, ...(lines.length > 0 ? lines : ["  (none)"])].join("\n");
  return [
    `Merged ${result.system} with ${result.source.join(", ")} into ${result.merged}.`,
    section("Changed", result.changed.map((entry) => `  ${entry.family} ${entry.name}${where(entry)}  system ${shown(entry.system)} → code ${shown(entry.code)}`)),
    section("Added", result.added.map((entry) => `  ${entry.family} ${entry.name}${where(entry)}`)),
    section("Removed", result.removed.map((entry) => `  ${entry.family} ${entry.name}${where(entry)}  was ${shown(entry.value)}`)),
    section("Not placed", result.unplaced.map((entry) => `  ${entry.property}  ${entry.file}:${entry.line}  ${entry.reason}`)),
  ].join("\n\n");
}

function renderCheck(result) {
  const where = (entry) => (entry.theme !== undefined ? ` [${entry.theme}]` : entry.field !== undefined ? ` [${entry.field}]` : "");
  const shown = (value) => (value == null ? "(none)" : value);
  const head = result.drift
    ? `Drift: ${result.tokens} differs from ${result.source.join(", ")}.`
    : `No drift: ${result.tokens} holds exactly the tokens of ${result.source.join(", ")}.`;
  if (!result.drift) return head;
  const section = (title, lines) => [`${title} (${lines.length}):`, ...(lines.length > 0 ? lines : ["  (none)"])].join("\n");
  return [
    head,
    section("Changed", result.changed.map((entry) => `  ${entry.family} ${entry.name}${where(entry)}  system ${shown(entry.system)} · code ${shown(entry.code)}`)),
    section("Added", result.added.map((entry) => `  ${entry.family} ${entry.name}  (in the code, not the system)`)),
    section("Missing", result.missing.map((entry) => `  ${entry.family} ${entry.name}  (in the system, no longer in the code)`)),
  ].join("\n\n");
}
