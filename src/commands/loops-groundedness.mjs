import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { loadLoops } from "../work/loops.mjs";
import { buildGroundednessReport } from "../work/loops-checks.mjs";

const PACKAGE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function displayPath(value) {
  return path.relative(process.cwd(), value) || ".";
}

function declaredHere(source, symbol) {
  if (typeof symbol !== "string" || symbol.length === 0) return false;
  const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\\bexport\\s+(?:default\\s+)?(?:async\\s+)?(?:function|class|const|let|var)\\s+${escaped}\\b`).test(source)) return true;
  return [...source.matchAll(/export\s*\{([^}]*)\}\s*;?/g)].some((match) =>
    match[1].split(",").some((part) => part.trim().split(/\s+as\s+/).at(-1) === symbol));
}

function configDeclares(config, dottedPath) {
  if (typeof dottedPath !== "string" || dottedPath.length === 0) return false;
  let current = config;
  for (const segment of dottedPath.split(".")) {
    if (current == null || typeof current !== "object" || !Object.hasOwn(current, segment)) return false;
    current = current[segment];
  }
  return true;
}

function within(root, relative) {
  const target = path.resolve(root, relative);
  const rel = path.relative(root, target);
  return rel !== "" && !rel.startsWith("..") && !path.isAbsolute(rel) ? target : null;
}

async function moduleResolves(pointer, root, readText) {
  const target = within(root, pointer.operand);
  if (target == null) return false;
  const source = await readText(target, "utf8").catch(() => null);
  return typeof source === "string" && declaredHere(source, pointer.symbol);
}

export async function resolveAnchorAuthorities(model, workspace, {
  hasCommand = () => false,
  readText = readFile,
} = {}) {
  const resolutions = {};
  const anchors = model.nodes.filter((node) => node.kind === "anchor").sort((left, right) => compareCodeUnits(left.id, right.id));
  for (const node of anchors) {
    const entry = node.fields?.observes;
    const pointer = entry?.pointer;
    let resolved = false;
    if (entry?.kind === "pointer" && pointer != null) {
      if (pointer.scheme === "command") resolved = Boolean(hasCommand(pointer.operand));
      if (pointer.scheme === "config") resolved = configDeclares(workspace?.config, pointer.operand);
      if (pointer.scheme === "module") {
        const record = await readText(node.path, "utf8").catch(() => "");
        const root = /^# aof-generated: true\b/mu.test(record) ? PACKAGE_ROOT : workspace?.projectRoot;
        resolved = typeof root === "string" && await moduleResolves(pointer, root, readText);
      }
    }
    resolutions[node.id] = Object.freeze({ pointer: entry?.raw ?? null, resolved });
  }
  return Object.freeze(resolutions);
}

function summary(components, unanchoredLoops) {
  const result = {
    components: components.length,
    anchored: 0,
    exogenousOnly: 0,
    selfReferential: 0,
    stale: 0,
    unanchoredLoops: unanchoredLoops.length,
  };
  for (const component of components) {
    if (component.verdict === "anchored") result.anchored += 1;
    if (component.verdict === "exogenous-only") result.exogenousOnly += 1;
    if (component.verdict === "self-referential") result.selfReferential += 1;
    if (component.verdict === "stale") result.stale += 1;
  }
  return result;
}

function emptyResult(source, state, error = null) {
  return {
    source,
    present: state === "absent" ? false : null,
    state,
    components: [],
    unanchoredLoops: [],
    authorities: [],
    findings: [],
    summary: summary([], []),
    error,
  };
}

export function createLoopsGroundednessCommand({
  hasCommand = () => false,
  loadModel = loadLoops,
  readText = readFile,
} = {}) {
  return {
    id: "work:loops-groundedness",
    input: { type: "object", properties: {}, additionalProperties: false },

    async run(_input, ctx) {
      let model;
      try {
        model = await loadModel(ctx.workspace);
      } catch (error) {
        const source = path.resolve(ctx.workspace?.aofDir ?? ctx.workspace?.projectRoot ?? ".", "loops");
        return emptyResult(source, "unreadable", {
          code: "registry-unreadable",
          message: error?.message ?? String(error),
        });
      }
      if (!model.present) return emptyResult(model.source, "absent");

      const resolutions = await resolveAnchorAuthorities(model, ctx.workspace, { hasCommand, readText });
      const report = buildGroundednessReport(model, resolutions);
      const authorities = Object.entries(resolutions)
        .map(([anchor, value]) => ({ anchor, ...value }))
        .sort((left, right) => compareCodeUnits(left.anchor, right.anchor));
      return {
        source: model.source,
        present: true,
        state: "reported",
        components: report.components,
        unanchoredLoops: report.unanchoredLoops,
        authorities,
        findings: [...model.findings, ...report.findings],
        summary: summary(report.components, report.unanchoredLoops),
        error: null,
      };
    },

    cli: {
      route: ["work", "loops", "groundedness"],
      spec: { usage: "aof work loops groundedness [--json]", flags: {} },
      argv: () => ({}),
      render(result) {
        const source = displayPath(result.source);
        if (result.state === "absent") return `No loop registry is declared at ${source}.`;
        if (result.state === "unreadable") return `Loop registry unreadable at ${source}: ${result.error.message}`;
        const lines = [
          `Groundedness: ${result.summary.components} component(s), ${result.summary.unanchoredLoops} unanchored loop(s).`,
        ];
        for (const component of result.components) {
          const ground = component.groundClasses.length > 0 ? ` · ground ${component.groundClasses.join(", ")}` : "";
          const stale = component.staleAuthorities.length > 0 ? ` · stale ${component.staleAuthorities.join(", ")}` : "";
          lines.push(`${component.verdict} · [${component.members.join(", ")}]${ground}${stale}`);
        }
        for (const id of result.unanchoredLoops) lines.push(`unanchored · ${id}`);
        return lines.join("\n");
      },
      json: (result) => ({
        ...result,
        source: displayPath(result.source),
        findings: result.findings.map((item) => ({ ...item, path: displayPath(item.path) })),
      }),
    },
  };
}
