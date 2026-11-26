// The design-system verbs — `aof design-system tokens|check|use`, the deterministic half of
// `/aof:design-system extract` (198/ADR-003). The command's prose calls the Artifact tool and then a
// verb, and reads the verb's `--json` answer; every parse, comparison and config write is here.
//
// Collaborators are injected by core (`commandError`), so the package owns the schema, argv,
// behaviour and rendering and spawns nothing. Ids take the `design-system:` prefix, under the route
// `["design-system", <verb>]`.
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

export function createDesignSystemCommands({ commandError }) {
  const refuse = (message, code) => commandError(message, code, 400);

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

  const tokensCommand = {
    id: "design-system:tokens",
    input: {
      type: "object",
      properties: {
        files: { type: "array", items: { type: "string" } },
        mocks: { type: "array", items: { type: "string" } },
      },
      required: ["files"],
      additionalProperties: false,
    },
    async run(input, ctx) {
      const projectRoot = ctx.workspace.projectRoot;
      if (input.files.length === 0) throw refuse(`Usage: ${PREFIX} tokens <css-file>… [--mocks <dir>]…`, "usage");
      const [{ readTokens, mockOnly }, css] = await Promise.all([lazy.tokens(), readCss(projectRoot, input.files)]);
      const tokens = readTokens(css);
      if (input.mocks === undefined) return tokens;
      return { ...tokens, mockOnly: mockOnly(tokens, await readMocks(projectRoot, input.mocks)) };
    },
    cli: {
      route: [...ROUTE, "tokens"],
      spec: {
        usage: `${PREFIX} tokens <css-file>… [--mocks <dir>]… [--json]`,
        flags: {
          mocks: { type: "string", repeatable: true, description: "a directory of exported .dc.html/.html mocks; lists the colours only a mock paints" },
        },
      },
      argv: (positionals, options = {}) => {
        if (positionals.length === 0) throw refuse(`Usage: ${PREFIX} tokens <css-file>… [--mocks <dir>]…`, "usage");
        return { files: positionals.map(String), ...(options.mocks != null ? { mocks: listOf(options.mocks) } : {}) };
      },
      render: renderTokens,
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

  return { tokensCommand, checkCommand, useCommand };
}

// ── rendering ──────────────────────────────────────────────────────────────────────────────────

function renderTokens(result) {
  const section = (title, lines) => [`${title}:`, ...(lines.length > 0 ? lines : ["  (none)"])].join("\n");
  const themes = result.color.themes.map((theme) => theme.id);
  const colour = (value) => themes.filter((theme) => value[theme] !== undefined).map((theme) => (themes.length > 1 ? `${theme} ${value[theme]}` : value[theme])).join(" · ");
  const sections = [
    section(`Colour (${result.color.tokens.length}; themes ${themes.join(", ") || "none"})`, result.color.tokens.map((token) => `  ${token.name}  ${colour(token.value)}`)),
    section(`Type families (${result.type.families.length})`, result.type.families.map((token) => `  ${token.name}  ${token.value}`)),
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
