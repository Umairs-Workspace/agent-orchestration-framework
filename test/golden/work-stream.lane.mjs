// A family is a JSON manifest. Only the adapter knows the file-store layout.
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateVariant } from "./fixtures/work-stream/file-adapter.mjs";

const fixtureDir = new URL("./fixtures/work-stream/", import.meta.url);
const program = "test/golden/fixtures/work-stream/run-case.mjs";
const verbs = new Set("list next find doc validate doctor promote insert-milestone insert-story insert-chore insert-uat archive status renumber".split(" "));
const flags = new Set(["--all", "--strict", "--done", "--yes", "--at", "--under", "--depends", "--to", "--dry-run", "--if-applicable"]);
const fields = new Set(["id", "title", "argv", "mode", "variation", "relocated", "exit", "formats", "contains", "code", "observe"]);

export function makeLane(id, entries) {
  if (!Array.isArray(entries) || !entries.length) throw Error(`${id}: empty case manifest`);
  const scenarios = [];
  const caseIds = new Set();
  const seen = new Set();
  for (const entry of entries) {
    try {
      for (const key of Object.keys(entry)) if (!fields.has(key)) throw Error(`unknown case field ${key}`);
      if (typeof entry.id !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(entry.id) || typeof entry.title !== "string" || !entry.title.trim()) throw Error("invalid case id or title");
      if (caseIds.has(entry.id)) throw Error("duplicate id");
      caseIds.add(entry.id);
      if (entry.exit !== undefined) {
        if (entry.exit === null || typeof entry.exit !== "object" || Array.isArray(entry.exit)) throw Error("invalid exit mapping");
        for (const [face, code] of Object.entries(entry.exit)) {
          if (!["text", "json"].includes(face) || !Number.isInteger(code) || code < 0 || code > 255) throw Error("invalid expected exit");
        }
      }
      if (entry.code !== undefined && typeof entry.code !== "string") throw Error("invalid refusal code");
      if (entry.contains !== undefined && (!Array.isArray(entry.contains) || entry.contains.some(value => typeof value !== "string"))) throw Error("invalid output witness");
      if (!["seed", "read", "write", "refuse", "preview"].includes(entry.mode)) throw Error("invalid case mode");
      if (entry.observe !== undefined) {
        if (entry.mode !== "write" || !Array.isArray(entry.observe) || !entry.observe.length) throw Error("observations require a write");
        for (const query of entry.observe) {
          if (typeof query !== "string" || !/^(?:list|find [0-9]+(?:\/[0-9]+)?)$/u.test(query)) throw Error("expected a public list or find observation");
        }
      }
      if (!Array.isArray(entry.argv) || (entry.mode === "seed" ? entry.argv.length : !verbs.has(entry.argv[0]))) throw Error("expected public work argv");
      for (const arg of entry.argv) {
        if (typeof arg !== "string" || !(flags.has(arg) || /^[A-Za-z0-9][A-Za-z0-9_./,-]*$/u.test(arg)) || arg.includes("..")) throw Error(`invalid work argument ${arg}`);
      }
      validateVariant(entry.variation);
      if (entry.relocated !== undefined && typeof entry.relocated !== "boolean") throw Error("invalid relocation");
      const formats = entry.formats ?? (["read", "refuse"].includes(entry.mode) ? ["json", "text"] : ["json"]);
      if (!Array.isArray(formats) || !formats.length || formats.some(f => !["text","json"].includes(f))) throw Error("invalid formats");
      for (const format of formats) {
        const scenarioId = formats.length === 1 ? entry.id : entry.id + "-" + format;
        if (seen.has(scenarioId)) throw Error("duplicate id");
        seen.add(scenarioId);
        scenarios.push({
          id: scenarioId,
          ...(entry.mode === "seed" ? {} : { base: "work-stream-fixture/seed" }),
          entry, format,
          steps: [{ command: program, argv: [id, scenarioId] }],
        });
      }
    } catch (error) {
      throw Error(`${id}/${entry.id}: ${error.message}`, { cause: error });
    }
  }
  return { id, scenarios };
}

export const workStreamLanes = readdirSync(fileURLToPath(fixtureDir))
  .filter(name => /^work-stream-[a-z]+\.cases\.json$/u.test(name)).sort()
  .map(name => makeLane(name.split(".")[0], JSON.parse(readFileSync(new URL(name, fixtureDir), "utf8"))));
