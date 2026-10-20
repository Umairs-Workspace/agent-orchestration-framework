// Traceability wiring for milestone 165 / story 01 `planning-skills-render-as-a-cowork-plugin`.
//
// Every @executable scenario and Examples row of the story's three task features runs
// here against the real renderer (`renderPlanningPlugin`) and the real stored-zip writer
// (`zipStored`). The archive is read back by an independent central-directory walk, and
// each CRC-32 is checked by an independent bitwise implementation, so neither proof leans
// on the code under test.
//
//   00_the-plugin-holds-shatter-and-explain.feature     — E1, E2, E3, the naming outline,
//        E9, E4, E5 (codex skills unchanged by the shared mapping)
//   01_without-the-cli-a-skill-writes-markdown-only.feature — E6, E7, E8, one preamble text
//   02_the-package-is-reproducible.feature               — E10, E11, order independence,
//        the stored round-trip outline
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadBundle } from "../src/work/bundle.mjs";
import { partitionByCapability, normalizeArgumentHint } from "../src/work/bundle-runtime.mjs";
import { renderPlanningPlugin, packagePlanningPlugin, COWORK_STAMP } from "../src/planning/cowork-plugin.mjs";
import { zipStored } from "../src/planning/stored-zip.mjs";

const PACKAGE_JSON = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
const SKILLS = ["shatter", "explain"];

function commandSource(id) {
  return loadBundle().resources.find((resource) => resource.kind === "command" && resource.id === id);
}

// A rendered SKILL.md split into its frontmatter keys/values, its preamble and the
// command body that follows the preamble.
function readSkill(files, id) {
  const text = files[`skills/${id}/SKILL.md`];
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  assert.ok(match, `skills/${id}/SKILL.md opens with a frontmatter block`);
  const frontmatter = {};
  for (const line of match[1].split("\n")) {
    const at = line.indexOf(":");
    const key = line.slice(0, at);
    const raw = line.slice(at + 1).trim();
    frontmatter[key] = raw.startsWith("\"") ? JSON.parse(raw) : raw;
  }
  const afterFrontmatter = text.slice(match[0].length);
  assert.ok(afterFrontmatter.startsWith(`\n${COWORK_STAMP}\n\n`), "the generated stamp sits after the frontmatter");
  const body = afterFrontmatter.slice(`\n${COWORK_STAMP}\n\n`.length);
  const command = commandSource(id).body.trim();
  assert.ok(body.endsWith(`${command}\n`), `skills/${id}/SKILL.md ends with the ${id} command body`);
  return { frontmatter, body, preamble: body.slice(0, body.length - command.length - 1), command };
}

// The codex wording as it rendered before 165 shared the mapping — the frozen oracle E5
// compares against.
function codexPre165Body(resource) {
  const invocation = `$aof-${resource.id}`;
  const hint = normalizeArgumentHint(resource.argumentHint);
  const sourceInvocation = resource.commandNamespace ? `${resource.commandNamespace}:${resource.id}` : resource.id;
  return [
    `Use this skill when the user asks for \`${invocation}${hint ? ` ${hint}` : ""}\`, or asks to run the AOF \`${sourceInvocation}\` procedure in Codex.`,
    "",
    "Where this procedure mentions `$ARGUMENTS`, use the text the user supplied after the skill name.",
    `Where it mentions Claude slash command \`/${sourceInvocation}\`, treat that as this Codex skill invocation.`,
    "",
    resource.body?.trim() ?? "",
    ""
  ].join("\n");
}

// An independent reader: walk the end-of-central-directory record, then each central
// entry to its local header and stored data.
function readZip(bytes) {
  const eocd = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocd >= 0, "the archive has an end-of-central-directory record");
  const count = bytes.readUInt16LE(eocd + 10);
  let at = bytes.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i += 1) {
    assert.equal(bytes.readUInt32LE(at), 0x02014b50, "a central directory header");
    const method = bytes.readUInt16LE(at + 10);
    const crc = bytes.readUInt32LE(at + 16);
    const size = bytes.readUInt32LE(at + 24);
    const nameLength = bytes.readUInt16LE(at + 28);
    const extra = bytes.readUInt16LE(at + 30);
    const comment = bytes.readUInt16LE(at + 32);
    const offset = bytes.readUInt32LE(at + 42);
    const name = bytes.subarray(at + 46, at + 46 + nameLength).toString("utf8");
    assert.equal(bytes.readUInt32LE(offset), 0x04034b50, `a local header for ${name}`);
    const dataAt = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
    entries.push({ name, method, crc, data: bytes.subarray(dataAt, dataAt + size) });
    at += 46 + nameLength + extra + comment;
  }
  return entries;
}

function bitwiseCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export const planningCoworkPluginTests = [
  // ====================================================================
  // 00_the-plugin-holds-shatter-and-explain.feature
  // ====================================================================
  {
    name: "planning-skills-render-as-a-cowork-plugin/00 E1 · the plugin's files are its manifest and two skills",
    run: () => {
      const files = renderPlanningPlugin();
      assert.deepEqual(Object.keys(files).sort(), [".claude-plugin/plugin.json", "skills/explain/SKILL.md", "skills/shatter/SKILL.md"]);
      assert.equal(JSON.parse(files[".claude-plugin/plugin.json"]).name, "aof");
    }
  },
  {
    name: "planning-skills-render-as-a-cowork-plugin/00 E2 · refine is not part of the plugin",
    run: () => {
      const paths = Object.keys(renderPlanningPlugin());
      assert.ok(!paths.some((entry) => entry.startsWith("skills/refine/")), "no skills/refine/");
      assert.ok(!paths.some((entry) => entry.startsWith("commands/")), "no commands/");
    }
  },
  {
    name: "planning-skills-render-as-a-cowork-plugin/00 E3 · the manifest carries aof's own version",
    run: () => {
      // Given aof's package version is "0.1.0": the version is passed in, and by default it is
      // read from aof's own package.json, so a release bump does not turn this row red.
      assert.equal(JSON.parse(renderPlanningPlugin({ version: "0.1.0" })[".claude-plugin/plugin.json"]).version, "0.1.0");
      const version = JSON.parse(readFileSync(PACKAGE_JSON, "utf8")).version;
      assert.equal(JSON.parse(renderPlanningPlugin()[".claude-plugin/plugin.json"]).version, version, "defaults to aof's package version");
    }
  },
  ...SKILLS.map((skill) => ({
    name: `planning-skills-render-as-a-cowork-plugin/00 outline · ${skill} names itself and how it is invoked`,
    run: () => {
      const { frontmatter, body } = readSkill(renderPlanningPlugin(), skill);
      assert.deepEqual(Object.keys(frontmatter), ["name", "description"], "exactly the keys name and description");
      assert.equal(frontmatter.name, skill);
      assert.ok(body.includes(`/aof:${skill}`), `the body names /aof:${skill}`);
    }
  })),
  ...SKILLS.map((skill) => ({
    name: `planning-skills-render-as-a-cowork-plugin/00 E9 · the ${skill} description opens with its explicit invocation`,
    run: () => {
      const { frontmatter } = readSkill(renderPlanningPlugin(), skill);
      assert.ok(
        frontmatter.description.startsWith(`Use only when the user invokes \`/aof:${skill}\``),
        frontmatter.description
      );
    }
  })),
  ...SKILLS.map((skill) => ({
    name: `planning-skills-render-as-a-cowork-plugin/00 E4 · the ${skill} skill's body ends with its command's body, character for character`,
    run: () => {
      const { body, preamble, command } = readSkill(renderPlanningPlugin(), skill);
      assert.equal(body, `${preamble}${command}\n`, "after its preamble, the body is the command body");
      assert.ok(preamble.endsWith("Write Markdown only, and never commit.\n\n"), "the preamble ends where the command begins");
    }
  })),
  {
    name: "planning-skills-render-as-a-cowork-plugin/00 E5 · codex's mapped skills are unchanged by the shared mapping",
    run: () => {
      // Every bundle command, rendered through the codex mapping's preamble path (variants
      // stripped so the preamble — not a native variant — is what renders).
      const commands = loadBundle().resources
        .filter((resource) => resource.kind === "command")
        .map(({ runtimeVariants, ...resource }) => resource);
      assert.ok(commands.length > 0);
      const { installable } = partitionByCapability(commands, ["codex"]);
      for (const resource of commands) {
        const mapped = installable.find((entry) => entry._aofMappedFrom?.id === resource.id);
        assert.ok(mapped, `codex renders ${resource.id}`);
        assert.equal(mapped.body, codexPre165Body(resource), `codex $aof-${resource.id} is byte-for-byte what it was`);
      }
    }
  },
  // ====================================================================
  // 01_without-the-cli-a-skill-writes-markdown-only.feature
  // ====================================================================
  ...SKILLS.map((skill) => ({
    name: `planning-skills-render-as-a-cowork-plugin/01 E6 · the ${skill} skill probes for the CLI and reports what it skipped`,
    run: () => {
      const { preamble } = readSkill(renderPlanningPlugin(), skill);
      assert.match(preamble, /Before the first `aof` step, run `command -v aof`/);
      assert.match(preamble, /If aof is absent, skip each `aof` step and list the skipped steps in your report/);
    }
  })),
  {
    name: "planning-skills-render-as-a-cowork-plugin/01 E7 · shatter without the CLI leaves its drivers in the backlog",
    run: () => {
      const { preamble } = readSkill(renderPlanningPlugin(), "shatter");
      assert.match(preamble, /Any driver written without aof stays in the backlog, to be promoted from Claude Code or Codex/);
      assert.match(preamble, /never write a `number:` line/);
      assert.match(preamble, /never change a `status:` line by hand/);
    }
  },
  ...SKILLS.map((skill) => ({
    name: `planning-skills-render-as-a-cowork-plugin/01 E8 · the ${skill} skill never commits`,
    run: () => {
      assert.match(readSkill(renderPlanningPlugin(), skill).preamble, /never commit\./);
    }
  })),
  {
    name: "planning-skills-render-as-a-cowork-plugin/01 the preamble is the same text in every skill",
    run: () => {
      const files = renderPlanningPlugin();
      const generic = (skill) => {
        const hint = normalizeArgumentHint(commandSource(skill).argumentHint);
        return readSkill(files, skill).preamble.split(` ${hint}`).join(" <hint>").split(skill).join("<skill>");
      };
      assert.equal(generic("shatter"), generic("explain"));
    }
  },
  // ====================================================================
  // 02_the-package-is-reproducible.feature
  // ====================================================================
  {
    name: "planning-skills-render-as-a-cowork-plugin/02 E10 · packaging twice from unchanged sources gives identical bytes",
    run: () => {
      assert.ok(packagePlanningPlugin().equals(packagePlanningPlugin()));
    }
  },
  {
    name: "planning-skills-render-as-a-cowork-plugin/02 E11 · the archive holds one plugin manifest at its root",
    run: () => {
      const files = renderPlanningPlugin();
      const entries = readZip(zipStored(files));
      assert.deepEqual(entries.map((entry) => entry.name).sort(), Object.keys(files).sort(), "exactly the plugin's three files");
      assert.equal(entries.filter((entry) => entry.name === ".claude-plugin/plugin.json").length, 1);
      for (const entry of entries) assert.equal(entry.data.toString("utf8"), files[entry.name], `${entry.name} reads back as rendered`);
    }
  },
  {
    name: "planning-skills-render-as-a-cowork-plugin/02 the order a file map is given in does not change the bytes",
    run: () => {
      const forward = zipStored({ "b.md": "b", "a/x.md": "x", "a.md": "a" });
      const reverse = zipStored({ "a.md": "a", "a/x.md": "x", "b.md": "b" });
      assert.ok(forward.equals(reverse));
      assert.deepEqual(readZip(forward).map((entry) => entry.name), ["a.md", "a/x.md", "b.md"]);
    }
  },
  ...[
    { path: "empty.md", content: "" },
    { path: "skills/a/S.md", content: "hello" },
    { path: "ünïcode/név.md", content: "café ✓" }
  ].map((row) => ({
    name: `planning-skills-render-as-a-cowork-plugin/02 outline · a stored entry round-trips "${row.path}"`,
    run: () => {
      const [entry] = readZip(zipStored({ [row.path]: row.content }));
      assert.equal(entry.name, row.path);
      assert.equal(entry.method, 0, "stored");
      assert.equal(entry.data.toString("utf8"), row.content);
      assert.equal(entry.crc, bitwiseCrc32(Buffer.from(row.content, "utf8")), "the recorded CRC-32 matches the content");
    }
  }))
];
