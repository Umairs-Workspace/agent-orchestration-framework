// test/support/golden/normalise.mjs — the ONE place captured golden output is rewritten
// (203/ADR-002). Six rules, closed, in this order. A value that differs from run to run for
// any other reason, such as an order that follows the file system, is a defect in the render
// and is fixed where it is rendered; it never earns a seventh rule here without a superseding
// ADR. FF-20301 (`acd-golden-normaliser-closed`) asserts the list, and that no other module
// under `test/support/golden/` calls `replace` on captured content.
import { realpathSync } from "node:fs";
import { packageVersion } from "../../../packages/core/src/work/bundle-manifest.mjs";
import { readBuildInfo } from "../../../packages/core/src/build-info.mjs";

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

// A path segment after a matched temp root: anything up to whitespace, a quote, a separator
// or the punctuation that ends a path in prose and JSON. The separators between segments are
// the only backslashes this module ever rewrites (ADR-002 §3).
const SEGMENT_CHAR = "[^\\s\"'`\\\\/<>|:;,()\\[\\]{}]";
const SEPARATOR = "(?:\\\\\\\\|\\\\|/)";
// The root must end at a segment boundary, so `<root>/project2` is never read as `<project>2`.
const TAIL = `(?!${SEGMENT_CHAR})((?:${SEPARATOR}${SEGMENT_CHAR}+)*${SEPARATOR}?)`;

// Every spelling of one absolute path a captured file may carry: forward slashes, backslashes,
// and backslashes JSON-escaped (`C:\\Users\\…` inside an envelope string).
function spellings(absolute) {
  const parts = absolute.split(/[\\/]/u);
  return [parts.join("/"), parts.join("\\"), parts.join("\\\\")];
}

function tempPathPatterns(ctx) {
  const roots = [];
  for (const [placeholder, given, real] of [["<project>", ctx.project, ctx.projectReal], ["<home>", ctx.home, ctx.homeReal]]) {
    for (const form of new Set([given, real].filter(Boolean))) {
      for (const spelling of new Set(spellings(form))) roots.push({ placeholder, spelling });
    }
  }
  // Longest first: macOS's `/private/var/…` realpath contains its `/var/…` given form.
  roots.sort((a, b) => b.spelling.length - a.spelling.length);
  const flags = ctx.caseInsensitivePaths ? "giu" : "gu";
  return roots.map(({ placeholder, spelling }) => ({ placeholder, pattern: new RegExp(`${escapeRegExp(spelling)}${TAIL}`, flags) }));
}

const wholeToken = (value, flags = "gu") => new RegExp(`(?<![\\w.+-])${escapeRegExp(value)}(?![\\w+-]|\\.\\w)`, flags);

const TARGETS = Object.freeze(["files", "steps"]);

export const RULES = Object.freeze([
  Object.freeze({ id: "eol", targets: TARGETS, apply: (text) => text.replace(/\r\n?/gu, "\n") }),
  Object.freeze({
    id: "temp-paths",
    targets: TARGETS,
    apply: (text, ctx) => {
      let out = text;
      for (const { placeholder, pattern } of tempPathPatterns(ctx)) {
        out = out.replace(pattern, (_match, tail) => placeholder + tail.split(/\\\\|\\|\//u).join("/"));
      }
      return out;
    },
  }),
  Object.freeze({
    id: "instants",
    targets: TARGETS,
    apply: (text) => text.replace(/\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})(?![\w:])/gu, "<timestamp>"),
  }),
  Object.freeze({ id: "hashes", targets: TARGETS, apply: (text) => text.replace(/sha256:[0-9a-fA-F]{64}(?![0-9a-fA-F])/gu, "sha256:<hash>") }),
  Object.freeze({ id: "version", targets: TARGETS, apply: (text, ctx) => (ctx.version ? text.replace(wholeToken(ctx.version), "<version>") : text) }),
  Object.freeze({ id: "build-id", targets: TARGETS, apply: (text, ctx) => (ctx.buildId ? text.replace(wholeToken(ctx.buildId), "<build-id>") : text) }),
]);

const RULE_IDS = new Set(RULES.map((rule) => rule.id));

// The context the rules read: a scenario's two temp paths in their given and realpath forms,
// and the running aof's version and build id. Built while the paths still exist.
export function normaliseContext({ project, home }, { version = packageVersion(), buildId = readBuildInfo().buildId } = {}) {
  return Object.freeze({
    project,
    home,
    projectReal: realpathSync(project),
    homeReal: realpathSync(home),
    version,
    buildId: buildId ?? null,
    caseInsensitivePaths: process.platform === "win32",
  });
}

// normaliseText(text, ctx, { target, only }) — apply the rules in order. `only` names a subset
// by id (the run-twice check applies `eol`, `temp-paths` and `instants` alone, ADR-002 §5).
export function normaliseText(text, ctx, { target = "files", only = null } = {}) {
  if (only) for (const id of only) if (!RULE_IDS.has(id)) throw new Error(`golden: no normaliser rule "${id}"`);
  let out = text;
  for (const rule of RULES) {
    if (only && !only.includes(rule.id)) continue;
    if (!rule.targets.includes(target)) continue;
    out = rule.apply(out, ctx);
  }
  return out;
}

const STRICT_UTF8 = new TextDecoder("utf-8", { fatal: true });

// A captured file that is not valid UTF-8 fails by name (ADR-002 §4), never compared mangled.
export function decodeCaptured(key, bytes) {
  try {
    return STRICT_UTF8.decode(bytes);
  } catch {
    throw new Error(`golden: captured file "${key}" is not valid UTF-8, so it cannot be compared as text`);
  }
}

// normaliseTree(tree, ctx) → Map<key, string>, in key order. Every file is decoded before any
// is normalised, so a bad file fails the scenario before anything is compared.
export function normaliseTree(tree, ctx, options = {}) {
  const decoded = [...tree].map(([key, bytes]) => [key, decodeCaptured(key, bytes)]);
  return new Map(decoded.map(([key, text]) => [key, normaliseText(text, ctx, { ...options, target: "files" })]).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

// The inverse, for a rebuild (203/ADR-006 §3): each placeholder a rule wrote, filled with the
// running value. It lives here, beside the rules, so captured content is rewritten in this module
// and nowhere else (FF-20301). `sha256:<hash>` is not filled here: a rebuild recomputes each hash
// from the file it names.
export const PLACEHOLDERS = Object.freeze({ project: "<project>", home: "<home>", timestamp: "<timestamp>", version: "<version>", buildId: "<build-id>" });

export function fillPlaceholders(text, values) {
  let out = text;
  for (const [key, token] of Object.entries(PLACEHOLDERS)) {
    if (!out.includes(token)) continue;
    if (values[key] == null) throw new Error(`golden: there is no running value to fill ${token}`);
    out = out.replaceAll(token, values[key]);
  }
  return out;
}

// The step records, as the formatted JSON `steps.golden` holds, normalised by the same rules.
export function normaliseSteps(steps, ctx, options = {}) {
  return normaliseText(`${JSON.stringify(steps, null, 2)}\n`, ctx, { ...options, target: "steps" });
}
